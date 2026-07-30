import { useEffect, useState } from "react";
import { adminApi } from "../services/api";
import Pagination from "./Pagination";
import ListSearch, { ListFilter, useListFilter, useListSearch } from "./ListSearch";
import { prepareUploadImage } from "../utils/prepareUploadImage";
const toItems = (data) => (Array.isArray(data) ? data : data?.items || []);
const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const MAX_COMMENT_IMAGES = 4;

export function ProductReviewsAdmin() {
  const [items, setItems] = useState([]);
  const load = () => adminApi.getReviews().then((data) => setItems(toItems(data)));
  useEffect(() => {
    load();
  }, []);
  return (
    <AdminTable
      title="Đánh giá sản phẩm"
      subtitle={`${items.length} đánh giá`}
      headers={[
        "NGƯỜI ĐÁNH GIÁ",
        "SỐ SAO",
        "NỘI DUNG",
        "TRẠNG THÁI",
        "THAO TÁC",
      ]}
      rows={items.map((x) => [
        x.authorName,
        `${x.rating}/5`,
        x.comment,
        <span className={`status ${x.isVerified ? "completed" : ""}`}>
          {x.isVerified ? "Đã duyệt" : "Chờ duyệt"}
        </span>,
        <>
          <button
            className="action-button"
            onClick={() =>
              adminApi
                .updateReview(x._id, { isVerified: !x.isVerified })
                .then(load)
            }
          >
            {x.isVerified ? "Bỏ duyệt" : "Duyệt"}
          </button>
          <Delete onClick={() => adminApi.deleteReview(x._id).then(load)} />
        </>,
      ])}
      filterIndex={3}
      filterOptions={[{value:"Đã duyệt",label:"Đã duyệt"},{value:"Chờ duyệt",label:"Chờ duyệt"}]}
    />
  );
}
export function BlogCommentsAdmin() {
  const [items, setItems] = useState([]);
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const load = () => Promise.all([adminApi.getBlogComments(), adminApi.getBlogPosts({ page: 1, limit: 500 })]).then(([commentData, postData]) => {
    setItems(toItems(commentData));
    setPosts(toItems(postData));
  }).catch((loadError) => setError(loadError.message || "Không thể tải bình luận."));
  useEffect(() => {
    load();
  }, []);
  const postName = (postId) => posts.find((post) => (post._id || post.id) === postId)?.title || postId;
  const openCreate = () => setForm({ postId: posts[0]?._id || posts[0]?.id || "", authorName: "", email: "", content: "", status: "approved", images: [] });
  const save = async () => {
    setSaving(true);
    setError("");
    const payload = { postId: form.postId, authorName: form.authorName.trim(), email: form.email?.trim() || undefined, content: form.content.trim(), status: form.status, images: form.images || [] };
    try {
      if (form._id) await adminApi.updateBlogComment(form._id, payload);
      else await adminApi.createBlogComment(payload);
      setForm(null);
      await load();
    } catch (saveError) { setError(saveError.message || "Không thể lưu bình luận."); }
    finally { setSaving(false); }
  };
  const uploadImages = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, MAX_COMMENT_IMAGES - (form.images?.length || 0));
    event.target.value = "";
    setUploading(true);
    setError("");
    try {
      const urls = await Promise.all(files.map(async (file) => adminApi.uploadBlogCommentImage(await prepareUploadImage(file))));
      setForm((current) => ({ ...current, images: [...(current.images || []), ...urls].slice(0, MAX_COMMENT_IMAGES) }));
    } catch (uploadError) { setError(uploadError.message || "Không thể tải ảnh lên."); }
    finally { setUploading(false); }
  };
  return <>
    <AdminTable
      title="Bình luận blog"
      subtitle={`${items.length} bình luận`}
      headers={["NGƯỜI GỬI", "BÀI VIẾT", "NỘI DUNG", "TRẠNG THÁI", "THAO TÁC"]}
      rows={items.map((x) => [
        x.authorName,
        postName(x.postId),
        x.content,
        <span
          className={`status ${x.status === "approved" ? "completed" : ""}`}
        >
          {x.status === "approved" ? "Đã duyệt" : x.status === "spam" ? "Spam" : "Chờ duyệt"}
        </span>,
        <>
          <button className="action-button" onClick={() => { setError(""); setForm({ ...x, images: x.images || [] }); }}>Chỉnh sửa</button>
          <Delete
            onClick={() => confirm("Xóa bình luận này?") && adminApi.deleteBlogComment(x._id).then(load)}
          />
        </>,
      ])}
      filterIndex={3}
      filterOptions={[{value:"Đã duyệt",label:"Đã duyệt"},{value:"Chờ duyệt",label:"Chờ duyệt"},{value:"Spam",label:"Spam"}]}
      headerAction={<button className="primary-button" onClick={openCreate} disabled={!posts.length}><span className="material-symbols-outlined">add</span>Thêm bình luận</button>}
    />
    {form && <div className="modal-backdrop"><div className="category-modal"><div className="modal-header"><h2>{form._id ? "Chỉnh sửa" : "Thêm"} bình luận blog</h2><button className="icon-button" onClick={() => { setForm(null); setError(""); }}>×</button></div><div className="review-detail">
      <label className="modal-field"><span>Bài viết</span><select value={form.postId} onChange={(event) => setForm({ ...form, postId: event.target.value })}>{posts.map((post) => <option value={post._id || post.id} key={post._id || post.id}>{post.title}</option>)}</select></label>
      <label className="modal-field"><span>Tên người gửi</span><input value={form.authorName} onChange={(event) => setForm({ ...form, authorName: event.target.value })} /></label>
      <label className="modal-field"><span>Email (không bắt buộc)</span><input type="email" value={form.email || ""} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label className="modal-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="approved">Đã duyệt — hiển thị ngoài website</option><option value="pending">Chờ duyệt — tạm ẩn</option><option value="spam">Spam</option></select></label>
      <label className="modal-field"><span>Nội dung</span><textarea rows="5" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></label>
      <div className="modal-field"><span>Ảnh bình luận ({form.images?.length || 0}/{MAX_COMMENT_IMAGES}) — không bắt buộc</span><label className={`review-image-upload ${uploading || form.images?.length >= MAX_COMMENT_IMAGES ? "disabled" : ""}`}><span className="material-symbols-outlined">add_photo_alternate</span>{uploading ? "Đang tải…" : "Chọn ảnh"}<input hidden type="file" accept="image/*,.heic,.heif" multiple disabled={uploading || form.images?.length >= MAX_COMMENT_IMAGES} onChange={uploadImages} /></label></div>
      {!!form.images?.length && <div className="review-detail-images">{form.images.map((image, index) => <div className="review-detail-image" key={`${image}-${index}`}><a href={image} target="_blank" rel="noreferrer"><img src={image} alt={`Ảnh bình luận ${index + 1}`} /></a><button type="button" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))}>×</button></div>)}</div>}
      {error && <p className="form-error">{error}</p>}
    </div><div className="modal-actions"><button className="primary-button" disabled={saving || uploading || !form.postId || !form.authorName.trim() || !form.content.trim()} onClick={save}>{saving ? "Đang lưu…" : form._id ? "Lưu chỉnh sửa" : "Tạo bình luận"}</button></div></div></div>}
  </>;
}
export function BlogCategoriesAdmin() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const load = () => adminApi.getBlogCategories().then(setItems);
  useEffect(() => {
    load();
  }, []);
  const add = () => {
    if (name.trim())
      adminApi
        .createBlogCategory({
          name: name.trim(),
          slug: slugify(name),
          isActive: true,
        })
        .then(() => {
          setName("");
          load();
        });
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Danh mục blog</h2>
          <p>Collection riêng dành cho bài viết</p>
        </div>
        <div className="quick-add">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên danh mục"
          />
          <button className="primary-button" onClick={add}>
            Thêm
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>TÊN DANH MỤC</th>
              <th>LOẠI</th>
              <th>SLUG</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x._id}>
                <td className="cell-primary">{x.name}</td>
                <td>
                  <span className="category-type">Danh mục blog</span>
                </td>
                <td>/{x.slug}</td>
                <td>
                  <Delete
                    onClick={() =>
                      adminApi.deleteBlogCategory(x._id).then(load)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function BlogPostsAdmin() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const load = () =>
    adminApi.getBlogPosts().then((data) => setItems(toItems(data)));
  useEffect(() => {
    load();
    adminApi.getBlogCategories().then(setCategories);
  }, []);
  const save = (e) => {
    e.preventDefault();
    const data = { ...form, slug: form.slug || slugify(form.title) };
    (form._id
      ? adminApi.updateBlogPost(form._id, data)
      : adminApi.createBlogPost(data)
    ).then(() => {
      setForm(null);
      load();
    });
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Quản lý bài viết</h2>
          <p>{items.length} bài viết</p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            setForm({
              title: "",
              slug: "",
              excerpt: "",
              content: "",
              categoryId: "",
              status: "draft",
            })
          }
        >
          Thêm bài viết
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>TIÊU ĐỀ</th>
              <th>DANH MỤC</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x._id}>
                <td className="cell-primary">{x.title}</td>
                <td>
                  {categories.find((c) => c._id === x.categoryId)?.name || "—"}
                </td>
                <td>
                  <span
                    className={`status ${x.status === "published" ? "completed" : ""}`}
                  >
                    {x.status === "published" ? "Đã đăng" : "Bản nháp"}
                  </span>
                </td>
                <td>
                  <button
                    className="action-button"
                    onClick={() => setForm({ ...x })}
                  >
                    Chỉnh sửa
                  </button>
                  <Delete
                    onClick={() => adminApi.deleteBlogPost(x._id).then(load)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <div className="modal-backdrop">
          <form className="category-modal" onSubmit={save}>
            <div className="modal-header">
              <h2>{form._id ? "Chỉnh sửa" : "Thêm"} bài viết</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setForm(null)}
              >
                ×
              </button>
            </div>
            <div className="category-form">
              <label className="modal-field">
                <span>Tiêu đề</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </label>
              <label className="modal-field">
                <span>Danh mục blog</span>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-field">
                <span>Mô tả ngắn</span>
                <textarea
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm({ ...form, excerpt: e.target.value })
                  }
                  required
                />
              </label>
              <label className="modal-field">
                <span>Nội dung</span>
                <textarea
                  rows="8"
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  required
                />
              </label>
              <label className="modal-field">
                <span>Trạng thái</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đăng bài</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="primary-button">Lưu bài viết</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
function Delete({ onClick }) {
  return (
    <button
      className="action-button danger"
      onClick={() => confirm("Bạn chắc chắn muốn xóa?") && onClick()}
    >
      Xóa
    </button>
  );
}
const cellText = (value) => {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(cellText).join(" ");
  return cellText(value.props?.children);
};
function AdminTable({ title, subtitle, headers, rows, filterIndex = 0, filterOptions = [], headerAction = null }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { query, setQuery, filteredItems: searchedItems } = useListSearch(rows);
  const { filter, setFilter, filteredItems } = useListFilter(searchedItems, (row) => cellText(row[filterIndex]));
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="list-controls"><ListSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} />{filterOptions.length > 0 && <ListFilter value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={filterOptions} />}</div>
        {headerAction}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.slice((page - 1) * pageSize, page * pageSize).map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(filteredItems.length / pageSize))} onPageChange={setPage} />
    </div>
  );
}

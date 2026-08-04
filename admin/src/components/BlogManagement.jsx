import { useEffect, useState } from "react";
import { adminApi } from "../services/api";
import BlogPostPreview from "./BlogPostPreview";
import BlogPostEditor from "./BlogPostEditor";
import Pagination from "./Pagination";
import ListSearch, { ListFilter, useListFilter, useListSearch } from "./ListSearch";
const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const PAGE_SIZE_POSTS = 10;
const PAGE_SIZE_CATS = 15;

const normalizeBlogDocumentStructure = (documentNode) => {
  documentNode.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const separator = heading.querySelector("br");
    if (separator) {
      const bodyRange = documentNode.createRange();
      bodyRange.setStartAfter(separator);
      bodyRange.setEnd(heading, heading.childNodes.length);
      const bodyContent = bodyRange.extractContents();
      separator.remove();
      if (bodyContent.textContent?.trim() || bodyContent.querySelector?.("img, table, ul, ol")) {
        const normalizedHeading = documentNode.createElement("h3");
        [...heading.attributes].forEach((attribute) => normalizedHeading.setAttribute(attribute.name, attribute.value));
        while (heading.firstChild) normalizedHeading.appendChild(heading.firstChild);
        normalizedHeading.querySelectorAll("span, b, strong, em, i").forEach((node) => {
          if (!node.textContent?.trim() && !node.children.length) node.remove();
        });
        const paragraph = documentNode.createElement("p");
        if (heading.style.textAlign) paragraph.style.textAlign = heading.style.textAlign;
        if (heading.style.lineHeight) paragraph.style.lineHeight = heading.style.lineHeight;
        paragraph.appendChild(bodyContent);
        heading.replaceWith(normalizedHeading, paragraph);
        heading = normalizedHeading;
      }
    }
    const onlyInlineChild = heading.children.length === 1 ? heading.firstElementChild : null;
    const inlineFontSize = Number.parseFloat(onlyInlineChild?.style.fontSize || "");
    const inlineFontWeight = onlyInlineChild?.style.fontWeight;
    const isParagraphStoredAsHeading =
      heading.tagName === "H1" &&
      onlyInlineChild?.tagName === "SPAN" &&
      Number.isFinite(inlineFontSize) &&
      inlineFontSize <= 16 &&
      (inlineFontWeight === "400" || inlineFontWeight === "normal");
    if (isParagraphStoredAsHeading) {
      const paragraph = documentNode.createElement("p");
      [...heading.attributes].forEach((attribute) => paragraph.setAttribute(attribute.name, attribute.value));
      while (heading.firstChild) paragraph.appendChild(heading.firstChild);
      heading.replaceWith(paragraph);
      return;
    }
    const nestedLists = [...heading.querySelectorAll("ul, ol")];
    if (!nestedLists.length || !heading.parentNode) return;
    let insertionPoint = heading;
    nestedLists.forEach((list) => {
      insertionPoint.parentNode.insertBefore(list, insertionPoint.nextSibling);
      insertionPoint = list;
    });
    if (!heading.textContent?.trim() && !heading.querySelector("img, table, hr")) heading.remove();
  });
  documentNode.querySelectorAll("li > p").forEach((paragraph) => {
    paragraph.style.removeProperty("margin-top");
    paragraph.style.removeProperty("margin-bottom");
  });
};

export function BlogPostsManager() {
  const [posts, setPosts] = useState([]),
    [total, setTotal] = useState(0),
    [totalPages, setTotalPages] = useState(1),
    [categories, setCategories] = useState([]),
    [form, setForm] = useState(null),
    [preview, setPreview] = useState(false),
    [uploading, setUploading] = useState(false),
    [saving, setSaving] = useState(false),
    [page, setPage] = useState(1);
  const { query, setQuery, filteredItems: searchedPosts } = useListSearch(posts);
  const { filter, setFilter, filteredItems: filteredPosts } = useListFilter(searchedPosts, (item) => item.status);

  useEffect(() => {
    load(page);
  }, [page]);

  useEffect(() => {
    adminApi.getBlogCategories().then(setCategories);
  }, []);

  const load = (p = page) =>
    adminApi.getBlogPosts({ page: p, limit: PAGE_SIZE_POSTS }).then((data) => {
      setPosts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    });

  const normalizeBlogContent = async (html) => {
    const documentNode = new DOMParser().parseFromString(html || "", "text/html");
    normalizeBlogDocumentStructure(documentNode);
    const images = [...documentNode.querySelectorAll("img")];
    for (const image of images) {
      const source = image.getAttribute("src") || "";
      if (source.startsWith("data:image/")) {
        const uploadedUrl = await adminApi.uploadProductImage(source);
        if (!uploadedUrl?.startsWith("https://")) throw new Error("Ảnh trong bài chưa được upload thành công.");
        image.setAttribute("src", uploadedUrl);
      } else if (source.startsWith("http://res.cloudinary.com/")) {
        image.setAttribute("src", source.replace("http://", "https://"));
      } else if (!source.startsWith("https://")) {
        throw new Error("Bài viết chứa ảnh không hợp lệ. Hãy upload lại ảnh.");
      }
    }
    const normalized = documentNode.body.innerHTML;
    if (!documentNode.body.textContent?.trim() && images.length === 0) throw new Error("Nội dung bài viết đang trống.");
    return normalized;
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    try {
      const content = await normalizeBlogContent(form.content);
      const data = { ...form, content, slug: form.slug || slugify(form.title) };
      const saved = form._id ? await adminApi.updateBlogPost(form._id, data) : await adminApi.createBlogPost(data);
      if (!saved?.content || saved.content.length < Math.min(20, content.length)) throw new Error("Backend không lưu đầy đủ nội dung bài viết.");
      setForm(null);
      load(page);
    } catch (error) {
      alert(error.message || "Không thể lưu bài viết.");
    } finally {
      setSaving(false);
    }
  };
  const uploadCover = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return alert("Ảnh phải nhỏ hơn 8 MB.");
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => { try { const featuredImage = await adminApi.uploadProductImage(reader.result); setForm(current => ({ ...current, featuredImage })); } catch (error) { alert(error.message); } finally { setUploading(false); } };
    reader.readAsDataURL(file);
  };
  const uploadGallery = async (files) => {
    const selected = [...files].filter(file => file.type.startsWith("image/") && file.size <= 8 * 1024 * 1024);
    if (!selected.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(selected.map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = async () => { try { resolve(await adminApi.uploadProductImage(reader.result)); } catch (error) { reject(error); } }; reader.readAsDataURL(file); })));
      setForm(current => ({ ...current, galleryImages: [...(current.galleryImages || []), ...urls] }));
    } catch (error) { alert(error.message); } finally { setUploading(false); }
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Quản lý bài viết</h2>
          <p>{total} bài viết{totalPages > 1 ? ` — trang ${page}/${totalPages}` : ""}</p>
        </div>
        <div className="list-controls"><ListSearch value={query} onChange={setQuery} placeholder="Tìm bài viết…" /><ListFilter value={filter} onChange={setFilter} options={[{value:"published",label:"Đã đăng"},{value:"draft",label:"Bản nháp"}]} /></div>
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
          <span className="material-symbols-outlined">add</span>Thêm bài viết
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
            {filteredPosts.map((post) => (
              <tr key={post._id}>
                <td className="cell-primary">{post.title}</td>
                <td>
                  {categories.find((c) => c._id === post.categoryId)?.name ||
                    "—"}
                </td>
                <td>
                  <span
                    className={`status ${post.status === "published" ? "completed" : ""}`}
                  >
                    {post.status === "published" ? "Đã đăng" : "Bản nháp"}
                  </span>
                </td>
                <td>
                  <button
                    className="action-button"
                    onClick={() => setForm({ ...post })}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="action-button danger"
                    onClick={() =>
                      confirm("Xóa bài viết?") &&
                      adminApi.deleteBlogPost(post._id).then(() => load(page))
                    }
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      {form && <BlogPostEditor form={form} categories={categories} uploading={uploading} saving={saving} onChange={setForm} onClose={() => setForm(null)} onPreview={() => setPreview(true)} onSave={save} onUploadCover={uploadCover} />}
      {preview && form && <BlogPostPreview post={form} categoryName={categories.find(c => c._id === form.categoryId)?.name} onClose={() => setPreview(false)} />}
    </div>
  );
}

export function BlogCategoriesManager() {
  const [items, setItems] = useState([]),
    [form, setForm] = useState(null),
    [page, setPage] = useState(1);
  const load = () => adminApi.getBlogCategories().then((data) => { setItems(data); setPage(1); });
  useEffect(() => {
    load();
  }, []);
  const { query, setQuery, filteredItems: searchedItems } = useListSearch(items);
  const { filter, setFilter, filteredItems } = useListFilter(searchedItems, (item) => item.isActive !== false ? "active" : "inactive");

  const totalPagesCats = Math.ceil(filteredItems.length / PAGE_SIZE_CATS);
  const save = async (e) => {
    e.preventDefault();
    const data = { ...form, slug: form.slug || slugify(form.name) };
    if (form._id) await adminApi.updateBlogCategory(form._id, data);
    else await adminApi.createBlogCategory(data);
    setForm(null);
    load();
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Danh mục blog</h2>
          <p>Quản lý chủ đề bài viết</p>
        </div>
        <div className="list-controls"><ListSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Tìm danh mục blog…" /><ListFilter value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[{value:"active",label:"Đang hiển thị"},{value:"inactive",label:"Đang ẩn"}]} /></div>
        <button
          className="primary-button"
          onClick={() =>
            setForm({ name: "", slug: "", description: "", isActive: true })
          }
        >
          Thêm danh mục
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>TÊN</th>
              <th>LOẠI</th>
              <th>SLUG</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.slice((page - 1) * PAGE_SIZE_CATS, page * PAGE_SIZE_CATS).map((x) => (
              <tr key={x._id}>
                <td className="cell-primary">{x.name}</td>
                <td>
                  <span className="category-type">Danh mục blog</span>
                </td>
                <td>/{x.slug}</td>
                <td>
                  <button
                    className="action-button"
                    onClick={() => setForm({ ...x })}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="action-button danger"
                    onClick={() =>
                      confirm("Xóa danh mục?") &&
                      adminApi.deleteBlogCategory(x._id).then(load)
                    }
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPagesCats} onPageChange={setPage} />
      {form && (
        <div className="modal-backdrop">
          <form className="category-modal" onSubmit={save}>
            <div className="modal-header">
              <h2>{form._id ? "Chỉnh sửa" : "Thêm"} danh mục blog</h2>
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
                <span>Tên danh mục</span>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: form._id ? form.slug : slugify(e.target.value),
                    })
                  }
                  required
                />
              </label>
              <label className="modal-field">
                <span>Slug</span>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: slugify(e.target.value) })
                  }
                  required
                />
              </label>
              <label className="modal-field">
                <span>Mô tả</span>
                <textarea
                  rows="4"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="primary-button">Lưu danh mục</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function BlogVideosManager() {
  const [websiteContent, setWebsiteContent] = useState({}),
    [videos, setVideos] = useState([]),
    [saving, setSaving] = useState(false),
    [uploadingIndex, setUploadingIndex] = useState(null),
    [page, setPage] = useState(1);
  const { query, setQuery, filteredItems: searchedVideos } = useListSearch(videos);
  const { filter, setFilter, filteredItems: filteredVideos } = useListFilter(searchedVideos, (item) => item.isActive !== false ? "active" : "inactive");

  useEffect(() => {
    adminApi.getSettings().then((rows) => {
      const value = rows.find((row) => row.key === "website_content")?.value || {};
      setWebsiteContent(value);
      setVideos(Array.isArray(value.blogVideos) ? value.blogVideos : []);
    });
  }, []);

  const update = (index, patch) => setVideos((current) => current.map((video, itemIndex) => itemIndex === index ? { ...video, ...patch } : video));
  const uploadThumbnail = async (index, file) => {
    if (!file) return;
    setUploadingIndex(index);
    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      update(index, { thumbnail: await adminApi.uploadProductImage(image) });
    } finally {
      setUploadingIndex(null);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      const value = { ...websiteContent, blogVideos: videos };
      await adminApi.saveSetting("website_content", { value, description: "Nội dung website Silkmoon" });
      setWebsiteContent(value);
    } finally {
      setSaving(false);
    }
  };

  return <div className="panel blog-video-manager">
    <div className="panel-header"><div><h2>Video blog</h2><p>Quản lý khối video hiển thị cuối trang Cẩm nang.</p></div><div className="list-controls"><ListSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Tìm video…" /><ListFilter value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[{value:"active",label:"Đang hiển thị"},{value:"inactive",label:"Đang ẩn"}]} /></div><button className="primary-button" onClick={() => setVideos((current) => [...current, { id: `video-${Date.now()}`, title: "", thumbnail: "", videoUrl: "", isActive: true }])}><span className="material-symbols-outlined">add</span>Thêm video</button></div>
    <div className="blog-video-grid">{filteredVideos.slice((page - 1) * 6, page * 6).map((video, visibleIndex) => { const index = videos.indexOf(video); return <article className="blog-video-card" key={video.id || index}>
      <div className="blog-video-cover">{video.thumbnail ? <img src={video.thumbnail} alt={video.title || "Video"} /> : <span className="material-symbols-outlined">video_library</span>}<span className="material-symbols-outlined play">play_circle</span></div>
      <label className="modal-field"><span>Tiêu đề</span><input value={video.title || ""} onChange={(event) => update(index, { title: event.target.value })} /></label>
      <label className="modal-field"><span>URL video (YouTube, TikTok hoặc MP4)</span><input value={video.videoUrl || ""} onChange={(event) => update(index, { videoUrl: event.target.value })} /></label>
      <label className="modal-field"><span>URL ảnh bìa</span><input value={video.thumbnail || ""} onChange={(event) => update(index, { thumbnail: event.target.value })} /></label>
      <div className="blog-video-actions"><label className={`image-upload-button ${uploadingIndex === index ? "disabled" : ""}`}><span className="material-symbols-outlined">upload</span>{uploadingIndex === index ? "Đang tải…" : "Upload ảnh bìa"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingIndex !== null} onChange={(event) => { uploadThumbnail(index, event.target.files[0]); event.target.value = ""; }} /></label><label className="category-active"><input type="checkbox" checked={video.isActive !== false} onChange={(event) => update(index, { isActive: event.target.checked })} /><span className="toggle-ui" />Hiển thị</label><button className="action-button danger" type="button" onClick={() => setVideos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Xóa</button></div>
    </article>; })}</div>
    <Pagination page={page} totalPages={Math.max(1, Math.ceil(filteredVideos.length / 6))} onPageChange={setPage} />
    {!videos.length && <div className="empty-state"><span className="material-symbols-outlined">video_library</span>Chưa có video.</div>}
    <div className="section-save"><button className="primary-button" onClick={save} disabled={saving}>{saving ? "Đang lưu…" : "Lưu danh sách video"}</button></div>
  </div>;
}

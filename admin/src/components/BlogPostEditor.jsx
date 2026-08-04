import { RichTextEditor } from "./ProductsList";

export default function BlogPostEditor({
  form,
  categories,
  uploading,
  saving,
  onChange,
  onClose,
  onPreview,
  onSave,
  onUploadCover,
}) {
  const update = (patch) => onChange((current) => ({ ...current, ...patch }));

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form className="product-modal" onSubmit={onSave}>
        <div className="modal-header">
          <div>
            <span className="login-eyebrow">BLOG</span>
            <h2>{form._id ? "Chỉnh sửa bài viết" : "Thêm bài viết"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-form-grid">
          <label className="modal-field full">
            <span>Tiêu đề</span>
            <input
              value={form.title}
              onChange={(event) => update({ title: event.target.value })}
              required
            />
          </label>

          <label className="modal-field">
            <span>Danh mục blog</span>
            <select
              value={form.categoryId}
              onChange={(event) => update({ categoryId: event.target.value })}
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="blog-cover-field full">
            <div>
              <strong>Ảnh bìa bài viết</strong>
              <span>JPG, PNG hoặc WebP, tối đa 8 MB.</span>
            </div>
            {form.featuredImage && <img src={form.featuredImage} alt="Ảnh bìa" />}
            <label className="image-upload-button">
              {uploading ? "Đang tải…" : form.featuredImage ? "Thay ảnh bìa" : "Tải ảnh bìa"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(event) => {
                  onUploadCover(event.target.files[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <label className="modal-field">
            <span>Trạng thái</span>
            <select
              value={form.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="draft">Bản nháp</option>
              <option value="published">Đăng bài</option>
            </select>
          </label>

          <label className="modal-field full">
            <span>Mô tả ngắn</span>
            <textarea
              rows="3"
              value={form.excerpt}
              onChange={(event) => update({ excerpt: event.target.value })}
              required
            />
          </label>

          <div className="modal-field full blog-content-editor-field">
            <span>Nội dung bài viết</span>
            <RichTextEditor
              value={form.content}
              wordMode
              placeholder="Nhập thế nào, bài viết sẽ giữ nguyên xuống dòng và định dạng như vậy…"
              onChange={(content) => update({ content })}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onPreview}>
            <span className="material-symbols-outlined">visibility</span>Xem trước
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary-button" disabled={uploading || saving}>
            {saving ? "Đang lưu…" : "Lưu bài viết"}
          </button>
        </div>
      </form>
    </div>
  );
}

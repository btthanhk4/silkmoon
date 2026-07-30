import { useEffect, useState } from 'react';
import { arApi, blogApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { prepareUploadImage } from '../../utils/prepareUploadImage';

const MAX_IMAGES = 4;

export default function BlogComments({ postId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!postId) return;
    blogApi.getComments(postId).then((data) => setComments(Array.isArray(data) ? data : [])).catch(() => setComments([]));
  }, [postId]);

  useEffect(() => {
    if (user && !authorName) setAuthorName(user.fullName || user.email || '');
  }, [user, authorName]);

  const selectImages = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, MAX_IMAGES - images.length);
    event.target.value = '';
    setError('');
    try {
      const prepared = await Promise.all(files.map(prepareUploadImage));
      setImages((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
      setPreviews((current) => [...current, ...prepared].slice(0, MAX_IMAGES));
    } catch (imageError) {
      setError(imageError.message || 'Không thể xử lý ảnh.');
    }
  };

  const removeImage = (index) => {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      const uploadedImages = await Promise.all(images.map(async (image) => {
        const result = await arApi.uploadImage({ image, usage: 'comment' });
        if (!result?.url) throw new Error('Không thể tải ảnh bình luận lên.');
        return result.url;
      }));
      await blogApi.createComment({ postId, authorName: authorName.trim(), email: user?.email, content: content.trim(), images: uploadedImages });
      setContent('');
      setImages([]);
      setPreviews([]);
      setMessage('Bình luận đã được gửi và sẽ hiển thị sau khi được duyệt.');
    } catch (submitError) {
      setError(submitError.message || 'Không thể gửi bình luận. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <section className="mx-auto mt-14 max-w-4xl border-t border-slate-deep/10 px-margin-mobile pt-10 md:px-margin-desktop">
    <div className="flex items-end justify-between gap-4"><div><span className="text-xs font-bold uppercase tracking-[.18em] text-sage-haze">Thảo luận</span><h2 className="mt-2 text-3xl font-semibold text-slate-deep">Bình luận bài viết</h2></div><span className="text-sm text-on-surface-variant">{comments.length} bình luận</span></div>
    <form className="mt-8 rounded-xl bg-bone/70 p-5 md:p-7" onSubmit={submit}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-deep">Tên của bạn<input className="mt-2 w-full rounded-md border border-slate-deep/15 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-secondary" value={authorName} onChange={(event) => setAuthorName(event.target.value)} required /></label>
      <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-deep">Nội dung<textarea className="mt-2 min-h-28 w-full resize-y rounded-md border border-slate-deep/15 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-secondary" value={content} onChange={(event) => setContent(event.target.value)} required /></label>
      {!!previews.length && <div className="mt-4 flex flex-wrap gap-3">{previews.map((image, index) => <div className="relative" key={`${image.slice(0, 32)}-${index}`}><img src={image} alt={`Ảnh đã chọn ${index + 1}`} className="h-20 w-20 rounded-md object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-deep text-sm text-white" aria-label={`Xóa ảnh ${index + 1}`}>×</button></div>)}</div>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><label className={`inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-deep ${images.length >= MAX_IMAGES ? 'pointer-events-none opacity-50' : ''}`}><span className="material-symbols-outlined">add_photo_alternate</span>Thêm ảnh (không bắt buộc) · {images.length}/{MAX_IMAGES}<input type="file" accept="image/*,.heic,.heif" multiple hidden disabled={images.length >= MAX_IMAGES || isSubmitting} onChange={selectImages} /></label><button className="rounded-md bg-slate-deep px-6 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={isSubmitting || !authorName.trim() || !content.trim()}>{isSubmitting ? 'Đang gửi…' : 'Gửi bình luận'}</button></div>
      {message && <p className="mt-4 text-sm font-medium text-sage-haze">{message}</p>}{error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
    </form>
    <div className="mt-9 space-y-7">{comments.map((comment) => <article className="border-b border-slate-deep/10 pb-7" key={comment._id}><div className="flex items-center justify-between gap-4"><strong className="text-slate-deep">{comment.authorName}</strong><time className="text-xs text-on-surface-variant">{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</time></div><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-deep/80">{comment.content}</p>{!!comment.images?.length && <div className="mt-4 flex flex-wrap gap-3">{comment.images.map((image, index) => <a href={image} target="_blank" rel="noreferrer" key={`${image}-${index}`}><img src={image} alt={`Ảnh bình luận ${index + 1}`} className="h-24 w-24 rounded-md object-cover transition-opacity hover:opacity-85" /></a>)}</div>}</article>)}{!comments.length && <p className="py-5 text-center text-sm text-on-surface-variant">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ.</p>}</div>
  </section>;
}

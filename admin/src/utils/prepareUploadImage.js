const MAX_SOURCE_SIZE = 20 * 1024 * 1024;
const MAX_UNCOMPRESSED_UPLOAD_SIZE = 9 * 1024 * 1024;
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|heic|heif)$/i;

const inferredMimeType = (file) => {
  if (file.type?.startsWith('image/')) return file.type;
  const extension = file.name?.split('.').pop()?.toLowerCase();
  return extension === 'heic' || extension === 'heif' ? `image/${extension}` : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension ? `image/${extension}` : 'image/jpeg';
};

const readOriginal = (file) => new Promise((resolve, reject) => {
  if (file.size > MAX_UNCOMPRESSED_UPLOAD_SIZE) return reject(new Error('Ảnh HEIC/HEIF này quá lớn để tải trực tiếp. Vui lòng chọn ảnh nhỏ hơn 9 MB.'));
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Không thể đọc ảnh từ iPhone.'));
  reader.onload = () => resolve(String(reader.result || '').replace(/^data:[^;]*;/, `data:${inferredMimeType(file)};`));
  reader.readAsDataURL(file);
});

const resizeWithCanvas = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    try {
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    } catch (error) { reject(error); }
    finally { URL.revokeObjectURL(objectUrl); }
  };
  image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Browser cannot decode image')); };
  image.src = objectUrl;
});

export async function prepareUploadImage(file) {
  const isImage = file && (file.type?.startsWith('image/') || IMAGE_EXTENSION.test(file.name || ''));
  if (!isImage) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG, WebP, HEIC hoặc HEIF.');
  if (file.size > MAX_SOURCE_SIZE) throw new Error('Mỗi ảnh cần nhỏ hơn 20 MB.');
  try { return await resizeWithCanvas(file); }
  catch { return readOriginal(file); }
}

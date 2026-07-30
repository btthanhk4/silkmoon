import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { arApi } from '../../services/api';
import { FABRICS } from './arUtils';
import ARSidebar from './ARSidebar';
import arLoadingUrl from '../../assets/ar-loading.svg';

// ── Mode: 'ai' = AI-generated image (AR Try on), 'ar' = Realtime WebXR
const MODES = { AI: 'ai', AR: 'ar' };
const MAX_UPLOAD_SIZE = 30 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2048;
const IMAGE_FILE_EXTENSION = /\.(jpe?g|png|webp|heic|heif)$/i;

const colorDistance = (firstHex, secondHex) => {
  const parse = (hex) => {
    const value = String(hex || '').replace('#', '');
    const normalized = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
    return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
  };
  const first = parse(firstHex);
  const second = parse(secondHex);
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return Math.sqrt(first.reduce((total, channel, index) => total + ((channel - second[index]) ** 2), 0));
};

const safeArErrorMessage = (error) => {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('too many') || message.includes('quota') || message.includes('429') || message.includes('đang bận')) {
    return 'Hệ thống tạo ảnh đang bận. Anh/chị vui lòng thử lại sau ít phút.';
  }
  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Kết nối mạng chưa ổn định. Anh/chị vui lòng kiểm tra kết nối và thử lại.';
  }
  if (message.includes('image') || message.includes('ảnh')) {
    return 'Không thể xử lý ảnh này. Anh/chị vui lòng chọn ảnh JPG, PNG hoặc WebP khác.';
  }
  return 'Không thể tạo ảnh lúc này. Anh/chị vui lòng thử lại sau.';
};

export default function ARRoomPreview({ isOpen, onClose, productColor, productColors, guideTitle, usageTips }) {
  const availableFabrics = useMemo(() => {
    const configuredColors = (productColors || [])
      .filter((color) => color?.id && color?.hex)
      .map((color) => ({ id: color.id, hex: color.hex, label: color.label || color.id, shimmer: color.shimmer ?? 0.2 }));
    return configuredColors.length ? configuredColors : FABRICS;
  }, [productColors]);
  const selectedProductColorId = typeof productColor === 'string' ? productColor : productColor?.id;
  const [roomImg, setRoomImg]               = useState(null);
  const [roomImgSrc, setRoomImgSrc]         = useState(null); // original base64 for AI
  const [roomImageUrl, setRoomImageUrl]     = useState('');
  const [activeFabricId, setActiveFabricId] = useState(selectedProductColorId || availableFabrics[0]?.id || 'champagne');
  const [opacity, setOpacity]               = useState(1.0); // Changed to 1.0 to fully hide the bed
  const [mode, setMode]                     = useState(MODES.AI);
  const [isComparing, setIsComparing]       = useState(false);
  const [comparisonImage, setComparisonImage] = useState(null);
  const [comparisonFabricId, setComparisonFabricId] = useState('');
  const [isGeneratingComparison, setIsGeneratingComparison] = useState(false);
  const [aiImage, setAiImage]               = useState(null);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [aiError, setAiError]               = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(null);
  const [shareUrl, setShareUrl]             = useState('');
  const [shareCopied, setShareCopied]       = useState(false);
  const nearestFabric = useMemo(() => {
    const active = availableFabrics.find((fabric) => fabric.id === activeFabricId);
    if (!active) return null;
    return availableFabrics
      .filter((fabric) => fabric.id !== active.id)
      .sort((first, second) => colorDistance(active.hex, first.hex) - colorDistance(active.hex, second.hex))[0] || null;
  }, [activeFabricId, availableFabrics]);

  // ── Load image file ──────────────────────────────────────
  const loadImage = (file) => {
    const isImage = file && (file.type.startsWith('image/') || IMAGE_FILE_EXTENSION.test(file.name));
    if (!isImage) {
      setAiError('Định dạng ảnh chưa được hỗ trợ. Vui lòng chọn ảnh JPG, PNG, WebP, HEIC hoặc HEIF.');
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setAiError('Ảnh có dung lượng quá lớn. Vui lòng chọn ảnh nhỏ hơn 30 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const sourceWidth = img.naturalWidth || img.width;
        const sourceHeight = img.naturalHeight || img.height;
        if (!sourceWidth || !sourceHeight) throw new Error('Invalid image dimensions');

        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable');

        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const normalizedSrc = canvas.toDataURL('image/jpeg', 0.86);
        setRoomImg(img);
        setRoomImgSrc(normalizedSrc);
        setRoomImageUrl('');
        setComparisonImage(null);
        setComparisonFabricId('');
        setIsComparing(false);
        runGenerate(normalizedSrc);
      } catch {
        setAiError('Không thể đọc ảnh này trên trình duyệt. Vui lòng thử ảnh khác hoặc chọn định dạng JPG.');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setAiError('Không thể đọc ảnh này trên iPhone. Vui lòng thử ảnh JPG hoặc đổi Camera sang chế độ “Tương thích nhất”.');
    };
    img.src = objectUrl;
  };


  // ── AI mode: generate image ──────────────────────────────
  const runGenerate = async (overrideSrc, targetFabricId = activeFabricId) => {
    const srcToUse = typeof overrideSrc === 'string' ? overrideSrc : roomImgSrc;
    if (!srcToUse) return;
    setIsGenerating(true);
    setAiError(null);
    setAiImage(null);
    setIsComparing(false);
    setComparisonImage(null);
    setComparisonFabricId('');
    try {
      const fabric = availableFabrics.find(f => f.id === targetFabricId) || availableFabrics[0] || FABRICS[0];

      // 1. Upload base image to Cloudinary via backend
      let uploadedRoomUrl = typeof overrideSrc === 'string' ? '' : roomImageUrl;
      if (!uploadedRoomUrl) {
        const uploadRes = await arApi.uploadImage({ image: srcToUse });
        if (!uploadRes.success || !uploadRes.url) throw new Error('Upload failed');
        uploadedRoomUrl = uploadRes.url;
        setRoomImageUrl(uploadedRoomUrl);
      }

      // 2. Call Gemini Image Generation with Cloudinary URL
      const response = await arApi.generatePreview({
        imageUrl: uploadedRoomUrl,
        color: fabric.hex,
        fabricName: fabric.label,
      });

      if (response.success && response.image) {
        setAiImage(response.image);
      } else {
        throw new Error('No image in response');
      }
    } catch (e) {
      // Check if it's a quota error (HTTP 429)
      const isQuota = e.message?.includes('quota') || e.message?.includes('429') ||
                      e.message?.includes('Too Many Requests');
      if (isQuota) {
        // Start countdown auto-retry
        setAiError('quota_exceeded');
        let remaining = 60;
        setRetryCountdown(remaining);
        const timer = setInterval(() => {
          remaining -= 1;
          setRetryCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(timer);
            setRetryCountdown(null);
            setAiError(null);
            runGenerate(); // auto-retry
          }
        }, 1000);
      } else {
        console.error('[AR] Generate failed');
        setAiError(safeArErrorMessage(e));
      }
    } finally {
      setIsGenerating(false);
    }
  };


  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAiImage(null);
      setAiError(null);
      loadImage(file);
    }
    e.target.value = '';
  };

  const handleCompare = async () => {
    if (isComparing) {
      setIsComparing(false);
      return;
    }
    if (!nearestFabric || !roomImgSrc || isGeneratingComparison) return;
    if (comparisonImage && comparisonFabricId === nearestFabric.id) {
      setIsComparing(true);
      return;
    }

    setIsGeneratingComparison(true);
    setAiError(null);
    try {
      let uploadedRoomUrl = roomImageUrl;
      if (!uploadedRoomUrl) {
        const uploadRes = await arApi.uploadImage({ image: roomImgSrc });
        if (!uploadRes.success || !uploadRes.url) throw new Error('Upload failed');
        uploadedRoomUrl = uploadRes.url;
        setRoomImageUrl(uploadedRoomUrl);
      }
      const response = await arApi.generatePreview({
        imageUrl: uploadedRoomUrl,
        color: nearestFabric.hex,
        fabricName: nearestFabric.label,
      });
      if (!response.success || !response.image) throw new Error('No image in response');
      setComparisonImage(response.image);
      setComparisonFabricId(nearestFabric.id);
      setIsComparing(true);
    } catch (error) {
      setAiError(safeArErrorMessage(error));
    } finally {
      setIsGeneratingComparison(false);
    }
  };

  const downloadAiImage = async () => {
    if (!aiImage) return;
    try {
      const response = await fetch(aiImage);
      if (!response.ok) throw new Error('Không thể tải ảnh');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Silkmoon_AR_${fabric.label.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert('Không thể tải ảnh xuống. Vui lòng thử lại.');
    }
  };

  if (!isOpen) return null;

  const fabric = availableFabrics.find(f => f.id === activeFabricId) || availableFabrics[0] || FABRICS[0];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col animate-fade-in bg-linen-white">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-6 md:px-margin-desktop py-4 border-b border-slate-deep/10 bg-linen-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-deep text-xl">view_in_ar</span>
          <div>
            <p className="font-label-caps text-label-caps text-slate-deep uppercase tracking-widest leading-tight">
              AR Room Visualization
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Thử chăn ga gối lụa trong không gian phòng ngủ của bạn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="hidden sm:flex items-center border border-slate-deep/15 overflow-hidden">
              <button
                className={`px-3 py-1.5 text-[11px] font-label-caps uppercase tracking-wider transition-colors bg-slate-deep text-linen-white`}
              >
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Hướng dẫn
                </span>
              </button>
              <button
                onClick={() => { setRoomImg(null); setAiImage(null); setRoomImgSrc(null); setRoomImageUrl(''); setComparisonImage(null); setComparisonFabricId(''); setIsComparing(false); setMode(MODES.AI); }}
                className={`px-3 py-1.5 text-[11px] font-label-caps uppercase tracking-wider transition-colors text-on-surface-variant hover:bg-bone`}
              >
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">refresh</span>
                  Bắt đầu lại
                </span>
              </button>
            </div>
          {aiImage && mode === MODES.AI && !isGenerating && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-label-caps text-on-surface-variant uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Trải nghiệm hoàn tất
            </div>
          )}

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-slate-deep/20 flex items-center justify-center hover:bg-slate-deep hover:text-linen-white transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── AI mode: show generated image or upload prompt ── */}
        {mode === MODES.AI ? (
          roomImg ? (
            <div className="relative flex min-h-[40vh] flex-1 overflow-hidden bg-bone/50 md:min-h-0">
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 md:p-8">
                <div className="flex h-full min-h-0 w-full items-center justify-center">
                {/* Always show room image as base */}
                <img
                  src={roomImgSrc}
                  alt="Room"
                  className="block max-h-full max-w-full select-none rounded object-contain shadow-xl pointer-events-none"
                  style={{ display: aiImage ? 'none' : 'block' }}
                />

                {/* AI-generated overlay */}
                {aiImage && !isComparing && (
                  <img
                    src={aiImage}
                    alt="AI Preview"
                    className="block max-h-full max-w-full select-none rounded object-contain shadow-xl pointer-events-none"
                  />
                )}

                {isComparing && comparisonImage && (
                  <img
                    src={comparisonImage}
                    alt={`AR Preview màu ${nearestFabric?.label || ''}`}
                    className="block max-h-full max-w-full select-none rounded object-contain shadow-xl pointer-events-none"
                  />
                )}

                </div>

              {isComparing && nearestFabric && (
                <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-deep shadow backdrop-blur-sm">
                  <span className="h-3 w-3 rounded-full border border-slate-deep/15" style={{ backgroundColor: nearestFabric.hex }} />
                  Màu gần nhất: {nearestFabric.label}
                </div>
              )}

              {/* Action buttons overlay at bottom center */}
              {aiImage && !isGenerating && !aiError && (
                <div className="absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-slate-deep/10 bg-white/90 px-1 py-1 shadow-lg backdrop-blur-md md:gap-1 md:px-1.5 md:py-1.5">
                  <button
                    onClick={downloadAiImage}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-medium text-slate-deep transition-colors hover:bg-slate-deep/5 sm:px-4 sm:text-[13px]"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Tải ảnh
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-slate-deep/20 sm:mx-1" />
                  <button
                    onClick={() => {
                      setShareCopied(false);
                      setShareUrl(`${window.location.origin}/ar-share?image=${encodeURIComponent(aiImage)}&fabric=${encodeURIComponent(fabric.label)}`);
                    }}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-medium text-slate-deep transition-colors hover:bg-slate-deep/5 sm:px-4 sm:text-[13px]"
                  >
                    Chia sẻ
                  </button>
                  <div className="mx-0.5 h-4 w-px bg-slate-deep/20 sm:mx-1" />
                  <button
                    onClick={handleCompare}
                    disabled={!nearestFabric || isGeneratingComparison}
                    className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-medium text-slate-deep transition-colors hover:bg-slate-deep/5 active:bg-slate-deep/10 disabled:cursor-wait disabled:opacity-50 sm:px-4 sm:text-[13px]"
                  >
                    {isGeneratingComparison ? 'Đang tạo…' : isComparing ? 'Màu hiện tại' : 'So sánh'}
                  </button>
                </div>
              )}
              
              {/* Generating spinner */}
              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-linen-white/85 backdrop-blur-sm px-6">
                  <img src={arLoadingUrl} alt="" aria-hidden="true" className="mb-6 w-48 max-w-[55%] opacity-80 motion-safe:animate-pulse" />
                  <p className="font-label-caps text-label-caps text-slate-deep uppercase tracking-widest text-center px-4 leading-relaxed">
                    Đang trải chăn ga lụa màu {fabric.label} lên giường của bạn
                  </p>
                  <p className="text-sm text-on-surface-variant mt-3 text-center px-4 leading-relaxed">
                    Thử trước không gian mơ ước
                  </p>
                </div>
              )}

              {/* Error / quota countdown */}
              {aiError && !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-linen-white/92 backdrop-blur-sm">
                  {aiError === 'quota_exceeded' ? (
                    <>
                      <span className="material-symbols-outlined text-3xl text-amber-500 mb-3">hourglass_top</span>
                      <p className="font-label-caps text-label-caps text-slate-deep uppercase tracking-widest text-center">Máy chủ AR đang bận</p>
                      <p className="text-sm text-on-surface-variant mt-1 mb-4 text-center">Quota tạm thời đạt giới hạn</p>
                      {retryCountdown !== null && (
                        <>
                          <div className="w-32 h-1 bg-slate-deep/10 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full bg-slate-deep transition-all duration-1000"
                              style={{ width: `${((60 - retryCountdown) / 60) * 100}%` }}
                            />
                          </div>
                          <p className="font-mono text-2xl font-bold text-slate-deep text-center">{retryCountdown}s</p>
                          <p className="text-[11px] text-on-surface-variant mt-1 text-center">Tự động thử lại sau {retryCountdown} giây</p>
                        </>
                      )}
                      <button
                        onClick={() => { setRetryCountdown(null); setAiError(null); runGenerate(); }}
                        className="mt-4 px-4 py-2 bg-slate-deep text-linen-white text-[11px] font-label-caps uppercase tracking-wider hover:bg-slate-deep/80 transition-colors"
                      >
                        Thử ngay
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-red-400 mb-3">error_outline</span>
                      <p className="text-sm text-on-surface-variant text-center px-4">{aiError}</p>
                      <button
                        onClick={() => runGenerate()}
                        className="mt-4 px-4 py-2 bg-slate-deep text-linen-white text-[11px] font-label-caps uppercase tracking-wider hover:bg-slate-deep/80 transition-colors"
                      >
                        Thử lại
                      </button>
                    </>
                  )}
                </div>
              )}
              </div>
              <p className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 px-4 py-2 text-center text-[10px] font-medium italic leading-4 text-slate-deep/75 backdrop-blur-sm md:text-[12px]">
                *Hình ảnh minh họa chính xác 90% màu sắc thực tế
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-bone/50">
              <label htmlFor="roomUploadInput" className="group block w-full max-w-2xl cursor-pointer">
                <div className="aspect-[16/10] border-2 border-dashed border-slate-deep/20 flex flex-col items-center justify-center gap-4 hover:border-slate-deep/50 hover:bg-linen-white/60 transition-all duration-300 rounded">
                  <div className="w-14 h-14 border border-slate-deep/15 flex items-center justify-center group-hover:border-slate-deep/30 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-slate-deep/40 group-hover:text-slate-deep/70 transition-colors">add_photo_alternate</span>
                  </div>
                  <div className="text-center">
                    <p className="font-label-caps text-label-caps text-slate-deep uppercase tracking-widest">Tải ảnh phòng ngủ của bạn</p>
                    <p className="text-sm text-on-surface-variant mt-1">Bắt đầu trải nghiệm chăn ga lụa Slikmoon</p>
                  </div>
                  <span className="text-[11px] font-label-caps uppercase tracking-wider text-on-surface-variant/60 border border-slate-deep/10 px-3 py-1">JPG · PNG · WEBP · HEIC</span>
                  {aiError && (
                    <p className="max-w-md px-4 text-center text-xs leading-5 text-red-600">
                      {aiError}
                    </p>
                  )}
                </div>
              </label>
            </div>
          )
        ) : null}

        <ARSidebar
          fabrics={availableFabrics}
          activeFabricId={activeFabricId}
          setActiveFabricId={(id) => {
            setActiveFabricId(id);
            if (mode === MODES.AI && roomImg) {
              setAiImage(null);
              setTimeout(() => runGenerate(null, id), 50);
            }
          }}
          opacity={opacity}
          setOpacity={setOpacity}
          hasImage={!!roomImg}
          onNewImage={() => { 
            document.getElementById('roomUploadInput')?.click();
          }}
          mode={mode}
          guideTitle={guideTitle}
          usageTips={usageTips}
        />
      </div>

      {/* Hidden global file input for uploads from anywhere (Sidebar or Dropzone) */}
      <input
        id="roomUploadInput"
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        onChange={handleFileChange}
      />

      {shareUrl && (
        <div className="fixed inset-0 z-[260] bg-slate-deep/55 backdrop-blur-sm flex items-center justify-center p-5" onMouseDown={(event) => event.target === event.currentTarget && setShareUrl('')}>
          <div className="w-full max-w-lg rounded-2xl bg-linen-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="font-headline-sm text-xl text-slate-deep">Chia sẻ ảnh AR</p><p className="mt-1 text-sm text-on-surface-variant">Sao chép link Silkmoon bên dưới để gửi cho bạn bè.</p></div><button onClick={() => setShareUrl('')} className="material-symbols-outlined text-slate-deep/60 hover:text-slate-deep">close</button></div>
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-deep/15 bg-white p-2"><input readOnly value={shareUrl} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-deep outline-none" /><button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setShareCopied(true); } catch { setShareCopied(false); } }} className="shrink-0 rounded-md bg-slate-deep px-4 py-2 text-xs font-semibold text-white">{shareCopied ? 'Đã sao chép' : 'Sao chép'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

ARRoomPreview.propTypes = {
  isOpen:       PropTypes.bool.isRequired,
  onClose:      PropTypes.func.isRequired,
  productColor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({ id: PropTypes.string, label: PropTypes.string, hex: PropTypes.string }),
  ]),
  productColors: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
    hex: PropTypes.string.isRequired,
  })),
  guideTitle: PropTypes.string,
  usageTips: PropTypes.arrayOf(PropTypes.string),
};

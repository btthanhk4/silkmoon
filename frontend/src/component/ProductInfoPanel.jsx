import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getLowestPriceSize, getProductOriginalPrice, getProductSizePrice } from '../utils/productPrice';
import { getSizeMeasurements } from '../utils/productSizes';
import { reviewsApi } from '../services/api';

const fallbackColors = [
  { id: 'champagne', hex: '#E5D5C5', label: 'Champagne Silk' },
  { id: 'white', hex: '#E8E8E5', label: 'White Silk' },
  { id: 'sage', hex: '#567E73', label: 'Sage Silk' },
  { id: 'slate', hex: '#334641', label: 'Slate Silk' },
];

const sizeDisplayName = (size) => (size?.label || '').replace(/\s*\([^)]*\d[^)]*\)\s*$/, '').trim() || size?.label || 'Size';

export default function ProductInfoPanel({ product, onOpenAR, onColorChange, arEnabled = true }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const productColors = product.colors?.length > 0 ? product.colors : fallbackColors;
  const [selectedSize, setSelectedSize] = useState(getLowestPriceSize(product)?.id || '');
  const [selectedColor, setSelectedColor] = useState(productColors[0]?.id || 'champagne');
  const [quantity, setQuantity] = useState(1);
  const [embroideryText, setEmbroideryText] = useState('');
  const [customSize, setCustomSize] = useState({ length: '', width: '', height: '' });
  const [reviewSummary, setReviewSummary] = useState({
    average: Number(product.ratings?.average) || 0,
    count: Number(product.ratings?.count) || 0,
  });

  useEffect(() => {
    const productId = product._id || product.id;
    if (!productId) return;
    reviewsApi.getProductSummary(productId)
      .then((summary) => setReviewSummary({ average: Number(summary?.average) || 0, count: Number(summary?.count) || 0 }))
      .catch(() => null);
  }, [product._id, product.id]);

  const allowCustomSize = Boolean(product.allowCustomSize);
  const allowEmbroidery = Boolean(product.allowEmbroidery);
  const embroideryMaxLength = product.embroideryMaxLength || 12;
  const productSizeOptions = product.sizes || [];
  const selectedSizeInfo = selectedSize === 'custom' ? null : productSizeOptions.find((size) => size.id === selectedSize);
  const selectedPrice = getProductSizePrice(product, selectedSize);
  const selectedOriginalPrice = getProductOriginalPrice(product, selectedPrice, selectedSize);
  const selectedSizeMeasurements = getSizeMeasurements(selectedSizeInfo);
  const activeColorInfo = productColors.find((color) => color.id === selectedColor) || productColors[0];
  const referenceSize = productSizeOptions.find((size) => getSizeMeasurements(size).length > 0);
  const customSizeFields = (referenceSize ? getSizeMeasurements(referenceSize) : [
    { id: 'width', label: 'Rộng', unit: 'cm' },
    { id: 'length', label: 'Dài', unit: 'cm' },
    { id: 'height', label: 'Dày/Cao', unit: 'cm' },
  ]).map((field, index) => ({ id: field.id || `custom-field-${index}`, label: field.label, unit: field.unit || 'cm' }));
  const plainDescription = (product.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const productSummary = plainDescription || [product.material, product.category].filter(Boolean).join(' · ');
  const discountPercent = selectedOriginalPrice > selectedPrice
    ? Math.round(((selectedOriginalPrice - selectedPrice) / selectedOriginalPrice) * 100)
    : 0;

  const handleColorClick = (colorId) => {
    setSelectedColor(colorId);
    const colorInfo = productColors.find((color) => color.id === colorId);
    if (onColorChange && colorInfo) onColorChange(colorInfo);
  };

  const getCartOptions = () => {
    const missingCustomFields = selectedSize === 'custom'
      ? customSizeFields.filter((field) => !customSize[field.id]?.trim())
      : [];
    if (missingCustomFields.length) {
      alert(`Vui lòng nhập đủ thông số size riêng: ${missingCustomFields.map((field) => field.label).join(', ')}.`);
      return null;
    }

    return {
      sizeId: selectedSize,
      sizeLabel: selectedSize === 'custom' ? 'May size riêng' : sizeDisplayName(selectedSizeInfo),
      sizeMeasurements: selectedSize === 'custom' ? [] : getSizeMeasurements(selectedSizeInfo),
      customSize: selectedSize === 'custom' ? Object.fromEntries(customSizeFields.map((field) => [field.id, customSize[field.id]])) : null,
      customMeasurements: selectedSize === 'custom' ? customSizeFields.map((field) => ({ ...field, value: customSize[field.id] })) : [],
      embroidery: embroideryText.trim() || null,
      colorId: activeColorInfo?.id,
      colorLabel: activeColorInfo?.label,
    };
  };

  const addConfiguredProduct = (buyNow = false) => {
    try {
      const options = getCartOptions();
      if (!options) return;
      addToCart(product._id || product.id, quantity, options);
      if (buyNow) navigate('/cart');
    } catch (error) {
      console.error('Error adding item to cart:', error);
      alert('Có lỗi xảy ra khi thêm vào giỏ hàng.');
    }
  };

  return (
    <div className="flex h-fit select-none flex-col gap-5 lg:sticky lg:top-[104px]">
      <header>
        <span className="type-eyebrow text-label-caps font-label-caps uppercase tracking-widest text-on-surface-variant">
          {product.category || 'Premium Collection'}
        </span>
        <h1 className="product-detail-title mt-2 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] text-slate-deep md:text-[36px]">
          {product.name}
        </h1>
        {productSummary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant md:text-[15px]">{productSummary}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-deep">
          <div className="flex text-[#F3BE3E]" aria-label={`${reviewSummary.average.toFixed(1)} trên 5 sao`}>
            {[1, 2, 3, 4, 5].map((star) => <span key={star} className={`material-symbols-outlined text-[18px] ${star <= Math.round(reviewSummary.average) ? '' : 'text-slate-200'}`} style={{ fontVariationSettings: star <= Math.round(reviewSummary.average) ? "'FILL' 1" : "'FILL' 0" }}>star</span>)}
          </div>
          <strong className="text-xs">{reviewSummary.average.toFixed(1)}</strong>
          <a href="#reviews" className="text-xs text-on-surface-variant underline underline-offset-2">({reviewSummary.count} đánh giá)</a>
        </div>
      </header>

      {arEnabled && (
        <button
          type="button"
          onClick={onOpenAR}
          className="flex w-full items-center gap-3 rounded-md bg-slate-deep px-4 py-3.5 text-left text-white transition-colors hover:bg-primary-container active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[21px]">view_in_ar</span>
          <span className="text-xs font-semibold leading-5 md:text-[13px]">Thử sản phẩm trong không gian của bạn bằng công nghệ AR</span>
          <span className="material-symbols-outlined ml-auto text-[18px]">arrow_forward</span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-deep/10 pb-5">
        <strong className="product-detail-price text-[25px] font-bold tracking-[-0.02em] text-slate-deep md:text-[28px]">
          {selectedPrice.toLocaleString('vi-VN')} VNĐ
        </strong>
        {selectedOriginalPrice !== null && (
          <span className="text-sm text-on-surface-variant/55 line-through md:text-base">
            {selectedOriginalPrice.toLocaleString('vi-VN')} VNĐ
          </span>
        )}
        {discountPercent > 0 && <span className="rounded bg-[#F9E7A5] px-2 py-1 text-xs font-bold text-slate-deep">-{discountPercent}%</span>}
      </div>

      <div className="flex flex-col gap-5">
        {(productSizeOptions.length > 0 || allowCustomSize) && (
          <section className="order-2 md:order-1">
            <div className="mb-2.5 flex items-baseline gap-2">
              <strong className="text-sm text-slate-deep">Kích thước:</strong>
              <span className="text-xs text-on-surface-variant">{selectedSize === 'custom' ? 'May size riêng' : sizeDisplayName(selectedSizeInfo)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[...productSizeOptions, ...(allowCustomSize ? [{ id: 'custom', label: 'May size riêng' }] : [])].map((size) => {
                const isSelected = selectedSize === size.id;
                return (
                  <button
                    type="button"
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={`min-h-[58px] rounded-md border px-3 py-2 text-center transition-all ${isSelected ? 'border-secondary bg-secondary-container/45 text-slate-deep shadow-[inset_0_0_0_1px_rgba(74,144,226,0.2)]' : 'border-slate-deep/10 bg-white text-slate-deep hover:border-slate-deep/35'}`}
                  >
                    <strong className="type-option-value block text-sm">{size.id === 'custom' ? size.label : sizeDisplayName(size)}</strong>
                    {size.id === 'custom' && <small className="mt-0.5 block text-[10px] text-on-surface-variant">Theo yêu cầu</small>}
                  </button>
                );
              })}
            </div>

            {selectedSize !== 'custom' && selectedSizeInfo && selectedSizeMeasurements.length > 0 && (
              <div className="mt-3 rounded-md border border-slate-deep/10 bg-bone/45 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[19px] text-slate-deep/70">straighten</span>
                  <div>
                    <strong className="block text-sm text-slate-deep">Thông số size {sizeDisplayName(selectedSizeInfo)}</strong>
                    <span className="text-[11px] text-on-surface-variant">Kích thước chi tiết của sản phẩm</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                  {selectedSizeMeasurements.map((measurement, index) => (
                    <div className="rounded-md border border-slate-deep/10 bg-white px-2 py-2 sm:px-3 sm:py-2.5" key={measurement.id || `${measurement.label}-${index}`}>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-deep/50">{measurement.label}</span>
                      <strong className="mt-1 block text-sm font-medium text-slate-deep">
                        {measurement.value} <small className="font-normal text-on-surface-variant">{measurement.unit || ''}</small>
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSize === 'custom' && (
              <div className="mt-3 rounded-md border border-slate-deep/10 bg-bone/45 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-on-surface-variant">Nhập đầy đủ số đo theo yêu cầu.</p>
                  {product.customSizePrice > 0 && <span className="text-xs font-semibold text-slate-deep">+{product.customSizePrice.toLocaleString('vi-VN')} VNĐ</span>}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {customSizeFields.map((field) => (
                    <label key={field.id} className="text-[11px] font-semibold text-slate-deep">
                      {field.label} ({field.unit})
                      <input className="mt-1.5 w-full rounded-md border border-slate-deep/15 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-secondary" value={customSize[field.id] ?? ''} onChange={(event) => setCustomSize((current) => ({ ...current, [field.id]: event.target.value }))} />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="order-1 md:order-2">
          <div className="mb-3 flex items-baseline gap-2">
            <strong className="text-sm text-slate-deep">Màu:</strong>
            <span className="text-xs text-on-surface-variant">{activeColorInfo?.label}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {productColors.map((color) => {
              const isSelected = selectedColor === color.id;
              return (
                <button
                  type="button"
                  key={color.id}
                  onClick={() => handleColorClick(color.id)}
                  className={`h-9 w-9 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgba(28,44,88,0.16)] transition-all ${isSelected ? 'ring-2 ring-slate-deep ring-offset-2' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color.hex }}
                  title={color.label}
                  aria-label={`Chọn màu ${color.label}`}
                />
              );
            })}
          </div>
        </section>

        {allowEmbroidery && (
          <section className="order-3 rounded-md border-l-2 border-sand-silk bg-bone/50 p-4">
            <div className="flex items-center gap-2 text-slate-deep">
              <span className="material-symbols-outlined text-[19px]">edit</span>
              <strong className="text-xs uppercase tracking-wider">Tùy chọn may tên cá nhân</strong>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-on-surface-variant">May tên hoặc chữ ký lên sản phẩm{product.embroideryPrice > 0 ? ` (+${product.embroideryPrice.toLocaleString('vi-VN')} VNĐ)` : ''}</p>
            <div className="relative mt-2">
              <input className="w-full border-0 border-b border-slate-deep/20 bg-transparent py-2 pr-12 text-sm text-slate-deep outline-none focus:border-slate-deep" placeholder={`Nhập nội dung (tối đa ${embroideryMaxLength} ký tự)`} value={embroideryText} onChange={(event) => setEmbroideryText(event.target.value.slice(0, embroideryMaxLength))} />
              <span className="absolute bottom-2 right-0 text-[10px] text-on-surface-variant/50">{embroideryText.length}/{embroideryMaxLength}</span>
            </div>
          </section>
        )}

        <section className="order-4 space-y-2.5 pt-1">
          <div className="grid grid-cols-[112px_1fr] gap-2.5">
            <div className="grid grid-cols-[34px_1fr_34px] overflow-hidden rounded-md border border-slate-deep/20 bg-white">
              <button type="button" className="text-lg text-slate-deep hover:bg-bone" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Giảm số lượng">−</button>
              <input type="number" min="1" max="99" className="w-full border-x border-slate-deep/10 text-center text-sm font-semibold text-slate-deep outline-none" value={quantity} onChange={(event) => setQuantity(Math.min(99, Math.max(1, Number(event.target.value) || 1)))} />
              <button type="button" className="text-lg text-slate-deep hover:bg-bone" onClick={() => setQuantity((current) => Math.min(99, current + 1))} aria-label="Tăng số lượng">+</button>
            </div>
            <button type="button" onClick={() => addConfiguredProduct(false)} className="flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-slate-deep bg-white px-4 text-sm font-semibold text-slate-deep transition-colors hover:bg-bone active:scale-[0.99]">
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              Thêm vào giỏ hàng
            </button>
          </div>
          <button type="button" onClick={() => addConfiguredProduct(true)} className="min-h-[50px] w-full rounded-md bg-slate-deep px-5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-container active:scale-[0.99]">Mua ngay</button>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-deep/10 pt-4">
        <div className="flex items-center gap-2 text-on-surface-variant"><span className="material-symbols-outlined text-[19px] text-slate-deep">local_shipping</span><span className="text-[10px] font-semibold uppercase tracking-wider">Giao hàng miễn phí</span></div>
        <div className="flex items-center gap-2 text-on-surface-variant"><span className="material-symbols-outlined text-[19px] text-slate-deep">eco</span><span className="text-[10px] font-semibold uppercase tracking-wider">Chất liệu cao cấp</span></div>
      </div>
    </div>
  );
}

ProductInfoPanel.propTypes = {
  product: PropTypes.object.isRequired,
  onOpenAR: PropTypes.func.isRequired,
  onColorChange: PropTypes.func,
  arEnabled: PropTypes.bool,
};

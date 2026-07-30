import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { promotionsApi, productsApi, settingsApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { getProductCustomizationPrice, getProductSizePrice } from '../utils/productPrice';
import { applyLatestSizeCatalog, getSizeMeasurements } from '../utils/productSizes';

const formatSizeMeasurements = (item) => (item.sizeMeasurements || [])
  .filter((measurement) => measurement.label && measurement.value !== undefined && measurement.value !== null && measurement.value !== '')
  .map((measurement) => `${measurement.label}: ${measurement.value}${measurement.unit || ''}`)
  .join(' · ');
const formatCustomMeasurements = (item) => (item.customMeasurements || [])
  .filter((measurement) => measurement.label && measurement.value)
  .map((measurement) => `${measurement.label}: ${measurement.value}${measurement.unit || ''}`)
  .join(' · ');
const formatCustomSize = (item) => formatCustomMeasurements(item) || (item.customSize ? `${[item.customSize.width, item.customSize.length, item.customSize.height].filter(Boolean).join(' × ')} cm` : '');

export default function Cart() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, loading: cartLoading } = useCart();
  const [cartDetails, setCartDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const savedDiscount = localStorage.getItem('silkmoon_discount');
  const initialDiscount = Number(savedDiscount);
  const [discountPercent, setDiscountPercent] = useState(Number.isFinite(initialDiscount) && initialDiscount >= 0 ? initialDiscount : 0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(Number.isFinite(initialDiscount) && initialDiscount > 0 ? `Đã áp dụng mã giảm giá ${initialDiscount}%` : '');

  // Fetch product details whenever cart changes
  useEffect(() => {
    const fetchDetails = async () => {
      if (!cart || cart.length === 0) {
        setCartDetails([]);
        return;
      }
      setLoadingDetails(true);
      try {
        const sizeSetting = await settingsApi.get('product_sizes').catch(() => null);
        const detailsPromises = cart.map(async (item) => {
          try {
            const product = applyLatestSizeCatalog(await productsApi.getById(item.productId), sizeSetting);
            const isCustomSize = item.sizeId === 'custom' || Boolean(item.customSize);
            const selectedSize = item.sizeId && !isCustomSize ? product.sizes?.find((size) => size.id === item.sizeId) : null;
            const selectedColor = product.colors?.find((color) => color.id === item.colorId)
              || product.colors?.find((color) => color.label === item.colorLabel)
              || product.colors?.[0];
            const configurationError = !isCustomSize && ((product.sizes?.length && !item.sizeId) || (item.sizeId && !selectedSize))
              ? 'Size đã chọn không còn khả dụng. Vui lòng chọn lại sản phẩm.'
              : isCustomSize && !product.allowCustomSize
                ? 'Sản phẩm không còn hỗ trợ may size riêng.'
                : item.embroidery && !product.allowEmbroidery
                  ? 'Sản phẩm không còn hỗ trợ may tên riêng.'
                  : '';
            const customizationPrice = getProductCustomizationPrice(product, item);
            return {
              ...item,
              id: item.productId,
              name: product.name,
              price: getProductSizePrice(product, item.sizeId) + customizationPrice,
              sizeLabel: selectedSize?.label || item.sizeLabel,
              sizeMeasurements: selectedSize ? getSizeMeasurements(selectedSize) : item.sizeMeasurements,
              image: selectedColor?.images?.[0] || product.images?.[0] || '',
              spec: selectedColor?.label || item.colorLabel || 'Chưa chọn màu',
              configurationError,
            };
          } catch {
            return { ...item, id: item.productId, name: 'Sản phẩm không còn tồn tại', price: 0, image: '', spec: '', configurationError: 'Sản phẩm đã bị xóa hoặc không còn khả dụng.' };
          }
        });
        const details = await Promise.all(detailsPromises);
        setCartDetails(details);
      } catch (err) {
        console.error('Failed to fetch cart details', err);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    if (!cartLoading) {
      fetchDetails();
    }
  }, [cart, cartLoading]);

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    setPromoError('');
    setPromoSuccess('');

    if (!promoCode.trim()) {
      setPromoError('Vui lòng nhập mã giảm giá.');
      return;
    }

    try {
      const result = await promotionsApi.validate(promoCode.trim());
      setDiscountPercent(result.discountPercent);
      setPromoSuccess(`Áp dụng mã ${result.code} thành công! Giảm ${result.discountPercent}%.`);
      localStorage.setItem('silkmoon_discount', String(result.discountPercent));
      localStorage.setItem('silkmoon_promo_code', result.code);
    } catch (err) {
      setPromoError(err.message || 'Mã giảm giá không hợp lệ.');
    }
  };

  const handleRemovePromo = () => {
    setDiscountPercent(0);
    setPromoCode('');
    setPromoSuccess('');
    localStorage.removeItem('silkmoon_discount');
  };

  const subtotal = cartDetails.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const shippingFee = 0; // free shipping
  const total = subtotal - discountAmount + shippingFee;
  const invalidCartItems = cartDetails.filter((item) => item.configurationError);

  const handleProceedToCheckout = () => {
    if (invalidCartItems.length) {
      alert(invalidCartItems[0].configurationError);
      return;
    }
    // Save current totals to localStorage for checkout display consistency
    localStorage.setItem('silkmoon_checkout_totals', JSON.stringify({
      subtotal,
      discountAmount,
      discountPercent,
      total
    }));
    navigate('/checkout');
  };

  return (
    <main className="pt-24 md:pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto select-none">
      {/* Title */}
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-slate-deep mb-stack-lg leading-tight">
        Giỏ hàng
      </h1>

      {cartLoading || loadingDetails ? (
        <div className="animate-pulse py-10 text-center">Đang tải giỏ hàng...</div>
      ) : cartDetails.length === 0 ? (
        /* Empty State */
        <section className="mx-auto max-w-2xl space-y-stack-md rounded-2xl border border-slate-deep/5 bg-bone/35 py-10 text-center">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant/40 animate-pulse">
            shopping_bag
          </span>
          <h3 className="font-headline-sm text-headline-sm text-slate-deep">
            Giỏ hàng của bạn đang trống
          </h3>
          <p className="font-body-md text-on-surface-variant/80 max-w-md mx-auto">
            Hãy khám phá các sản phẩm chăn ga gối lụa cao cấp từ SILKMOON và chọn cho mình sản phẩm phù hợp.
          </p>
          <div className="pt-4">
            <Link
              to="/shop"
              className="inline-block bg-slate-deep text-linen-white px-8 py-4 font-button text-button rounded-full hover:opacity-90 active:scale-95 transition-all uppercase tracking-wide"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </section>
      ) : (
        /* Cart Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Items list */}
          <section className="lg:col-span-8 space-y-stack-md">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className="border-b border-slate-deep/10 text-label-caps text-on-surface-variant text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold text-left">Sản phẩm</th>
                    <th className="pb-3 font-semibold text-center w-24">Số lượng</th>
                    <th className="pb-3 font-semibold text-right w-36">Giá</th>
                    <th className="pb-3 font-semibold text-right w-44">Tổng cộng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-deep/5">
                  {cartDetails.map((item) => (
                    <tr key={item.cartItemId || item.id} className="align-middle">
                      {/* Product details */}
                      <td className="py-6 pr-4">
                        <div className="flex gap-4">
                          <div className="w-20 h-24 bg-bone overflow-hidden rounded flex-shrink-0 border border-slate-deep/5">
                            <img className="w-full h-full object-cover" src={item.image} alt={item.name} />
                          </div>
                          <div className="flex-grow min-w-0 flex flex-col justify-between py-1">
                            <div>
                              <h4 className="font-body-md font-medium text-slate-deep truncate">{item.name}</h4>
                              <p className="text-xs text-on-surface-variant opacity-75 mt-1 font-mono uppercase tracking-wide">{item.spec}</p>
                              {item.sizeLabel && <p className="mt-1 text-xs text-slate-deep">Size: {item.sizeLabel}{formatSizeMeasurements(item) ? ` · ${formatSizeMeasurements(item)}` : ''}{formatCustomSize(item) ? ` · ${formatCustomSize(item)}` : ''}</p>}
                              {item.configurationError && <p className="mt-2 text-xs font-semibold text-error">{item.configurationError}</p>}
                              {item.embroidery && (
                                <div className="inline-flex items-center gap-1 bg-sand-silk/15 border border-sand-silk/30 px-2 py-0.5 rounded text-[11px] text-slate-deep font-medium mt-2">
                                  <span className="material-symbols-outlined text-[13px]">edit</span>
                                  Thêu chữ: "{item.embroidery}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quantity Controls */}
                      <td className="py-6 text-center">
                        <div className="inline-flex items-center border border-slate-deep/15 rounded-full overflow-hidden bg-linen-white">
                          <button onClick={() => updateQuantity(item.cartItemId || item.productId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-slate-deep hover:bg-slate-deep/5 transition-colors font-semibold">-</button>
                          <span className="w-8 text-center font-body-md font-medium text-slate-deep">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartItemId || item.productId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-slate-deep hover:bg-slate-deep/5 transition-colors font-semibold">+</button>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-6 text-right font-body-md text-slate-deep">
                        {item.price.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Total and Actions */}
                      <td className="py-6 text-right font-body-md text-slate-deep">
                        <div className="flex items-center justify-end gap-4">
                          <span className="font-semibold">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                          <button onClick={() => removeFromCart(item.cartItemId || item.productId)} className="flex items-center justify-center p-1.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-full transition-all" title="Xóa sản phẩm">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-slate-deep/5">
              {cartDetails.map((item) => (
                <div key={item.cartItemId || item.id} className="py-stack-md flex flex-col gap-4">
                  {/* Product Details (Image + Spec) */}
                  <div className="flex gap-4 w-full">
                    <div className="w-20 h-24 bg-bone overflow-hidden rounded flex-shrink-0 border border-slate-deep/5">
                      <img
                        className="w-full h-full object-cover"
                        src={item.image}
                        alt={item.name}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="font-body-md font-medium text-slate-deep truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-on-surface-variant opacity-75 mt-1 font-mono uppercase tracking-wide">
                          {item.spec}
                        </p>
                        {item.sizeLabel && <p className="mt-1 text-xs text-slate-deep">Size: {item.sizeLabel}{formatSizeMeasurements(item) ? ` · ${formatSizeMeasurements(item)}` : ''}{formatCustomSize(item) ? ` · ${formatCustomSize(item)}` : ''}</p>}
                        {item.configurationError && <p className="mt-2 text-xs font-semibold text-error">{item.configurationError}</p>}
                        {item.embroidery && (
                          <div className="inline-flex items-center gap-1 bg-sand-silk/15 border border-sand-silk/30 px-2 py-0.5 rounded text-[11px] text-slate-deep font-medium mt-2">
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                            Thêu chữ: "{item.embroidery}"
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.cartItemId || item.productId)}
                        className="flex items-center gap-1 text-xs text-error/80 hover:text-error transition-colors mt-2"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        Xóa sản phẩm
                      </button>
                    </div>
                  </div>

                  {/* Quantity and Subtotal controls on Mobile */}
                  <div className="flex justify-between items-center w-full pt-2 border-t border-dashed border-slate-deep/5">
                    <div className="flex items-center border border-slate-deep/15 rounded-full overflow-hidden bg-linen-white">
                      <button
                        onClick={() => updateQuantity(item.cartItemId || item.productId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-deep hover:bg-slate-deep/5 transition-colors font-semibold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-body-md font-medium text-slate-deep">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId || item.productId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-deep hover:bg-slate-deep/5 transition-colors font-semibold"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-on-surface-variant block opacity-60">Tạm tính</span>
                      <span className="font-body-md text-slate-deep font-semibold">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right Column: Order Summary */}
          <aside className="lg:col-span-4">
            <div className="glass-panel p-stack-lg rounded-xl space-y-stack-md sticky top-32">
              <h3 className="font-headline-sm text-headline-sm text-slate-deep border-b border-slate-deep/5 pb-3">
                Thông tin đơn hàng
              </h3>

              {/* Cost Rows */}
              <div className="space-y-stack-sm text-sm">
                <div className="flex justify-between text-on-surface-variant font-body-md">
                  <span>Tạm tính</span>
                  <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                
                {discountPercent > 0 && (
                  <div className="flex justify-between text-error font-body-md items-center">
                    <div className="flex items-center gap-1">
                      <span>Giảm giá ({discountPercent}%)</span>
                      <button
                        onClick={handleRemovePromo}
                        className="text-[10px] underline hover:opacity-75"
                        title="Hủy giảm giá"
                      >
                        (Xóa)
                      </button>
                    </div>
                    <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}

                <div className="flex justify-between text-on-surface-variant font-body-md">
                  <span>Phí vận chuyển</span>
                  <span>Miễn phí</span>
                </div>

                <div className="flex justify-between font-headline-sm text-headline-sm pt-stack-sm border-t border-slate-deep/10 mt-stack-sm">
                  <span>Tổng cộng</span>
                  <span className="text-slate-deep font-bold">
                    {total.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Promo Code Form */}
              <form onSubmit={handleApplyPromo} className="pt-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-1.5 block">
                  Mã giảm giá
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-underline font-body-md text-body-md text-slate-deep flex-1 py-1"
                    placeholder="Nhập SILKMOON10"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={discountPercent > 0}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 border border-slate-deep text-slate-deep font-button text-xs rounded-full hover:bg-slate-deep hover:text-linen-white transition-all uppercase tracking-wider"
                    disabled={discountPercent > 0}
                  >
                    Áp dụng
                  </button>
                </div>
                {promoError && (
                  <p className="text-xs text-error mt-2 font-medium">{promoError}</p>
                )}
                {promoSuccess && (
                  <p className="text-xs text-sage-haze mt-2 font-medium">{promoSuccess}</p>
                )}
              </form>

              {/* Proceed CTA */}
              <button
                onClick={handleProceedToCheckout}
                disabled={invalidCartItems.length > 0}
                className="w-full bg-slate-deep text-linen-white py-4 font-button text-button rounded-full flex items-center justify-center gap-2 group hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-wide pt-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                TIẾN HÀNH THANH TOÁN
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-[20px]">
                  arrow_forward
                </span>
              </button>

              <div className="text-[11px] text-center opacity-40 px-4 text-slate-deep leading-relaxed pt-1">
                Giao hàng miễn phí toàn quốc. Đổi trả hàng trong 7 ngày nếu không vừa ý.
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

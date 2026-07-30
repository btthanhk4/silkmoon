import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CheckoutForm from '../component/CheckoutForm';
import OrderSummary from '../component/OrderSummary';
import { ordersApi } from '../services/api';
import { useCart } from '../context/CartContext';

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const [isCompleted, setIsCompleted] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [isReturning, setIsReturning] = useState(() => new URLSearchParams(window.location.search).has('order'));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderNumber = params.get('order');
    if (!orderNumber) return;
    const pending = JSON.parse(localStorage.getItem('silkmoon_pending_order') || 'null');
    if (pending?.checkoutData) setCheckoutData(pending.checkoutData);

    ordersApi.getPaymentStatus(orderNumber)
      .then((result) => {
        setOrderResult(result);
        setPaymentFailed(result.paymentStatus !== 'paid');
        setIsCompleted(true);
        if (result.paymentStatus === 'paid') localStorage.removeItem('silkmoon_pending_order');
      })
      .catch((err) => alert(err.message || 'Không thể kiểm tra trạng thái thanh toán.'))
      .finally(() => setIsReturning(false));
  }, []);

  const handleCheckoutSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const promoCode = localStorage.getItem('silkmoon_promo_code') || null;

      const order = await ordersApi.create({
        ...data,
        promoCode,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          colorId: item.colorId || undefined,
          colorLabel: item.colorLabel || undefined,
          sizeId: item.sizeId || undefined,
          sizeLabel: item.sizeLabel || undefined,
          sizeMeasurements: item.sizeMeasurements || undefined,
          customSize: item.customSize || undefined,
          customMeasurements: item.customMeasurements || undefined,
          embroidery: item.embroidery || undefined,
        })),
      });

      if (data.paymentMethod === 'payos' && order.checkoutUrl) {
        localStorage.setItem('silkmoon_pending_order', JSON.stringify({ checkoutData: data, orderNumber: order.orderNumber }));
        clearCart();
        localStorage.removeItem('silkmoon_discount');
        localStorage.removeItem('silkmoon_promo_code');
        localStorage.removeItem('silkmoon_checkout_totals');
        window.location.assign(order.checkoutUrl);
        return;
      }

      setOrderResult(order);
      setCheckoutData(data);
      setIsCompleted(true);

      // Clear the cart via context instead of localStorage directly
      clearCart();
      localStorage.removeItem('silkmoon_discount');
      localStorage.removeItem('silkmoon_promo_code');
      localStorage.removeItem('silkmoon_checkout_totals');
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pt-24 md:pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      {/* Progress Indicator */}
      <div className="type-step-label flex items-center gap-2 md:gap-4 mb-stack-lg text-label-caps font-label-caps opacity-50 uppercase tracking-widest text-[10px] md:text-[12px] select-none">
        <Link to="/shop" className="hover:opacity-80 transition-opacity">
          Giỏ hàng
        </Link>
        <span className="material-symbols-outlined text-[12px]">chevron_right</span>

        <span
          className={`transition-all duration-300 pb-1 ${!isCompleted ? 'opacity-100 font-bold border-b border-slate-deep' : ''
            }`}
        >
          Thanh toán
        </span>
        <span className="material-symbols-outlined text-[12px]">chevron_right</span>

        <span
          className={`transition-all duration-300 pb-1 ${isCompleted ? 'opacity-100 font-bold border-b border-slate-deep' : ''
            }`}
        >
          Hoàn tất
        </span>
      </div>

      {isReturning ? (
        <section className="max-w-xl mx-auto text-center py-stack-lg space-y-stack-md"><span className="material-symbols-outlined text-[42px] animate-spin">progress_activity</span><h1 className="font-display-lg text-display-lg-mobile">Đang kiểm tra thanh toán…</h1></section>
      ) : isCompleted ? (
        /* Checkout Success Screen */
        <section className="max-w-xl mx-auto text-center py-stack-lg space-y-stack-lg animate-fade-in select-none">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${paymentFailed ? 'bg-red-50 text-red-600' : 'bg-sage-haze/10 text-sage-haze'}`}>
            <span className="material-symbols-outlined text-[36px]">{paymentFailed ? 'cancel' : 'check_circle'}</span>
          </div>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-slate-deep leading-tight">
            {paymentFailed ? 'Thanh toán chưa hoàn tất' : 'Đặt hàng thành công!'}
          </h1>
          <p className="font-body-lg text-body-md md:text-body-lg text-on-surface-variant max-w-md mx-auto leading-relaxed">
            {paymentFailed ? 'Giao dịch đã bị hủy, hết hạn hoặc chưa được PayOS xác nhận. Đơn hàng sẽ chưa được xử lý.' : <>Cảm ơn <strong>{checkoutData?.fullName || orderResult?.fullName}</strong> đã lựa chọn SILKMOON. Đơn hàng của bạn đang được xử lý.</>}
          </p>

          <div className="bg-bone/40 p-stack-lg rounded-xl text-left border border-slate-deep/5 space-y-3 max-w-md mx-auto text-sm">
            <h4 className="font-label-caps text-label-caps text-slate-deep mb-2 pb-1 border-b border-slate-deep/5">
              Thông tin đơn hàng
            </h4>
            {orderResult?.orderNumber && (
              <p className="text-slate-deep font-semibold">
                <span className="opacity-60 font-normal">Mã đơn hàng:</span> {orderResult.orderNumber}
              </p>
            )}
            <p className="text-slate-deep">
              <span className="opacity-60">Số điện thoại:</span> {checkoutData?.phone}
            </p>
            <p className="text-slate-deep">
              <span className="opacity-60">Địa chỉ:</span> {checkoutData?.address}, {checkoutData?.city}
            </p>
            <p className="text-slate-deep">
              <span className="opacity-60">Thanh toán:</span>{' '}
              {checkoutData?.paymentMethod === 'payos'
                ? 'Thanh toán qua PayOS (QR Code)'
                : 'Thanh toán khi nhận hàng (COD)'}
            </p>
          </div>

          <div className="pt-stack-md">
            <Link
              to="/"
              className="inline-block bg-slate-deep text-linen-white px-8 py-4 font-button text-button rounded-full hover:opacity-90 active:scale-95 transition-all uppercase tracking-wide"
            >
              Quay lại Trang Chủ
            </Link>
          </div>
        </section>
      ) : (
        /* Checkout Grid columns */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Form Info */}
          <section className="lg:col-span-7">
            <CheckoutForm onSubmitForm={handleCheckoutSubmit} isSubmitting={isSubmitting} />
          </section>

          {/* Right Column: Order Details */}
          <div className="lg:col-span-5">
            <OrderSummary />
          </div>
        </div>
      )}
    </main>
  );
}

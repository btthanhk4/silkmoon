import { useState } from 'react';
import { Link } from 'react-router-dom';
import AddToCartModal from './AddToCartModal';
import { useCart } from '../context/CartContext';
import { getLowestPriceSize, getProductListPrice, getProductOriginalPrice } from '../utils/productPrice';
import { getSizeMeasurements } from '../utils/productSizes';
import { getOptimizedProductImage } from '../utils/productImage';

export default function ProductListGrid({ products }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const { addToCart } = useCart();

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    const lowestPriceSize = getLowestPriceSize(product);
    const listPrice = getProductListPrice(product);
    const defaultColor = product.colors?.[0];
    const specLabel = lowestPriceSize?.label || product.category || 'STANDARD';

    try {
      addToCart(product.id, 1, {
        ...(lowestPriceSize ? {
          sizeId: lowestPriceSize.id,
          sizeLabel: lowestPriceSize.label,
          sizeMeasurements: getSizeMeasurements(lowestPriceSize),
        } : {}),
        colorId: defaultColor?.id,
        colorLabel: defaultColor?.label,
      });

      setModalProduct({
        name: product.name,
        price: listPrice,
        image: product.image,
        spec: specLabel
      });
      setModalOpen(true);
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Có lỗi xảy ra khi thêm vào giỏ hàng.');
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-stack-lg border border-slate-deep/5 bg-bone/20 rounded-lg">
        <span className="material-symbols-outlined text-[48px] opacity-40 mb-2">
          search_off
        </span>
        <p className="font-body-lg text-on-surface-variant">
          Không tìm thấy sản phẩm nào khớp với bộ lọc của bạn.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-gutter md:gap-y-10 lg:grid-cols-3">
      {products.map((product, index) => (
        <Link
          key={product.id}
          to={`/product/${product.id}`}
          className="product-card group cursor-pointer flex flex-col"
        >
          {/* Image Container */}
          <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-bone md:mb-stack-md">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src={getOptimizedProductImage(product.image, { width: 480, height: 600 })}
              alt={product.name}
              loading={index < 4 ? 'eager' : 'lazy'}
              fetchPriority={index < 2 ? 'high' : 'auto'}
              decoding="async"
            />

            {/* Quick Add Overlay */}
            <div className="absolute bottom-0 left-0 w-full p-4 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              <button
                onClick={(e) => handleQuickAdd(e, product)}
                className="type-button w-full bg-slate-deep text-white py-3 font-button hover:bg-slate-deep/90 rounded shadow-sm active:scale-95 transition-transform"
              >
                THÊM VÀO GIỎ
              </button>
            </div>

            {/* Tags */}
            {product.tag && (
              <div
                className={`absolute top-4 ${product.tag === 'NEW' ? 'left-4 bg-white/90 text-slate-deep' : 'right-4 bg-error text-white'
                } px-2 py-1 text-[9px] font-semibold rounded-sm md:px-3 md:text-label-caps`}
              >
                {product.tag}
              </div>
            )}
          </div>

          {/* Product Details */}
          <h4 className="product-list-card-title mb-1 line-clamp-2 font-semibold transition-colors group-hover:text-secondary">
            {product.name}
          </h4>
          <div className="mt-auto flex flex-nowrap items-baseline gap-2">
            <span className="product-list-card-price shrink-0 font-semibold text-slate-deep">
              {getProductListPrice(product).toLocaleString('vi-VN')}₫
            </span>
            {getProductOriginalPrice(product) !== null && (
              <span className="product-list-card-price shrink-0 font-normal text-on-surface-variant/70 line-through">
                {getProductOriginalPrice(product).toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>
        </Link>
      ))}

      {modalOpen && modalProduct && (
        <AddToCartModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          product={modalProduct} 
        />
      )}
    </div>
  );
}

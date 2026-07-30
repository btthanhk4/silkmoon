import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AddToCartModal from './AddToCartModal';
import { productsApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { getLowestPriceSize, getProductListPrice, getProductOriginalPrice } from '../utils/productPrice';
import { getSizeMeasurements } from '../utils/productSizes';
import { getOptimizedProductImage } from '../utils/productImage';

export default function BestSellers() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColors, setSelectedColors] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    productsApi.getBestSellers()
      .then((data) => {
        setProducts(data);
        // Init selected colors: first color of each product
        const initColors = {};
        data.forEach((p) => {
          if (p.colors?.length > 0) initColors[p._id] = p.colors[0].id;
        });
        setSelectedColors(initColors);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleColorChange = (productId, colorId) => {
    setSelectedColors((prev) => ({ ...prev, [productId]: colorId }));
  };

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    const activeColorId = selectedColors[product._id];
    const activeColorObj = product.colors?.find((c) => c.id === activeColorId) || product.colors?.[0];
    const lowestPriceSize = getLowestPriceSize(product);
    const listPrice = getProductListPrice(product);
    const specLabel = [activeColorObj?.label?.toUpperCase(), lowestPriceSize?.label].filter(Boolean).join(' / ') || 'STANDARD';

    try {
      addToCart(product._id, 1, {
        ...(lowestPriceSize ? {
          sizeId: lowestPriceSize.id,
          sizeLabel: lowestPriceSize.label,
          sizeMeasurements: getSizeMeasurements(lowestPriceSize),
        } : {}),
        colorId: activeColorObj?.id,
        colorLabel: activeColorObj?.label,
      });
      
      setModalProduct({ name: product.name, price: listPrice, image: product.images?.[0], spec: specLabel });
      setModalOpen(true);
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  // Skeleton loader
  if (loading) {
    return (
      <section className="bg-bone/50 pb-section-gap pt-6 md:pt-10">
        <div className="px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto">
          <div className="mb-6 text-center">
            <div className="h-8 w-48 bg-slate-deep/10 rounded mx-auto mb-4 animate-pulse" />
            <div className="h-4 w-96 bg-slate-deep/5 rounded mx-auto animate-pulse" />
          </div>
          <div className="mb-8">
             <div className="h-6 w-64 bg-slate-deep/10 rounded mb-6 animate-pulse" />
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="aspect-[3/4] bg-slate-deep/10 rounded-lg animate-pulse" />
                  <div className="h-4 bg-slate-deep/10 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-deep/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const renderProductCard = (product) => {
    const listPrice = getProductListPrice(product);
    const originalPrice = getProductOriginalPrice(product, listPrice);

    return (
    <div key={product._id} className="flex flex-col group">
      <Link to={`/product/${product._id}`} className="flex flex-col group cursor-pointer">
        <div className="aspect-[3/4] overflow-hidden bg-bone mb-stack-md relative rounded-lg">
          <img
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={getOptimizedProductImage(product.images?.[0], { width: 640, height: 852 })}
            loading="lazy"
            decoding="async"
          />
          <button
            onClick={(e) => handleQuickAdd(e, product)}
            className="absolute bottom-4 left-4 right-4 bg-linen-white text-slate-deep py-3 font-button text-button opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300 rounded shadow-sm hover:bg-bone text-center active:scale-95 z-25"
          >
            THÊM VÀO GIỎ
          </button>
        </div>
        <h4 className="type-card-title font-body-md text-slate-deep font-medium transition-colors group-hover:text-secondary">
          {product.name}
        </h4>
        <div className="flex flex-wrap items-baseline gap-2 mt-1">
          <p className="type-price text-slate-deep font-semibold">
            {listPrice.toLocaleString('vi-VN')}đ
          </p>
          {originalPrice !== null && (
            <p className="text-on-surface-variant/50 line-through text-sm">
              {originalPrice.toLocaleString('vi-VN')}đ
            </p>
          )}
        </div>
      </Link>

      {/* Color indicators */}
      <div className="flex gap-2 mt-2">
        {product.colors?.map((color) => (
          <button
            key={color.id}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              selectedColors[product._id] === color.id
                ? 'ring-1 ring-offset-2 ring-slate-deep scale-110'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: color.hex,
              border: color.hex === '#FCFCF9' ? '1px solid rgba(51, 70, 65, 0.1)' : 'none',
            }}
            onClick={() => handleColorChange(product._id, color.id)}
            title={color.label}
          />
        ))}
      </div>
    </div>
    );
  };

  return (
    <>
      <section className="bg-bone/50 pb-section-gap pt-6 md:pt-10">
        <div className="px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto">
          <div className="mb-6 text-center">
            <h2 className="font-headline-md text-headline-sm md:text-headline-md text-slate-deep mb-4">
              Sản Phẩm Bán Chạy
            </h2>
            <p className="font-body-lg text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Những thiết kế được yêu thích nhất bởi cộng đồng yêu giấc ngủ của chúng tôi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3">
            {products.map(renderProductCard)}
          </div>
        </div>
      </section>
      <AddToCartModal isOpen={modalOpen} onClose={() => setModalOpen(false)} product={modalProduct} />
    </>
  );
}

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './component/Header';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Cart from './pages/Cart';
import Footer from './component/Footer';
import Chatbot from './component/Chatbot';
import Policy from './pages/Policy';
import About from './pages/About';
import Blog from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import BlogPreview from './pages/BlogPreview';
import Showroom from './pages/Showroom';
import ARShare from './pages/ARShare';
import Account from './pages/Account';
import Profile from './pages/Profile';
import './App.css';
import { analyticsApi, settingsApi } from './services/api';

const typographyDeviceSizes = {
  desktop: { pageTitle: 48, intro: 18, eyebrow: 12, sectionTitle: 32, body: 16, cardTitle: 20, cardBody: 14, meta: 12, button: 13, price: 24, optionLabel: 12, optionValue: 16, formLabel: 12, input: 16, stepLabel: 12 },
  tablet: { pageTitle: 42, intro: 17, eyebrow: 11, sectionTitle: 28, body: 16, cardTitle: 19, cardBody: 14, meta: 12, button: 13, price: 23, optionLabel: 12, optionValue: 15, formLabel: 12, input: 16, stepLabel: 11 },
  mobile: { pageTitle: 34, intro: 15, eyebrow: 10, sectionTitle: 25, body: 15, cardTitle: 18, cardBody: 13, meta: 11, button: 12, price: 21, optionLabel: 11, optionValue: 14, formLabel: 11, input: 15, stepLabel: 10 },
};
const typographyRoles = Object.keys(typographyDeviceSizes.desktop);
const emptyFontSource = { url: '', family: '' };
const typographyDefaults = Object.fromEntries(['desktop', 'tablet', 'mobile'].map((device) => {
  const sizes = typographyDeviceSizes[device];
  return [device, {
    headingFontFamily: 'Manrope', bodyFontFamily: 'Manrope', pageTitleSize: sizes.pageTitle, sectionTitleSize: sizes.sectionTitle, bodySize: sizes.body, priceSize: sizes.price, optionLabelSize: sizes.optionLabel,
    ...Object.fromEntries(typographyRoles.flatMap((role) => [[`${role}Size`, sizes[role]], [`${role}FontFamily`, 'Manrope']])),
  }];
}));

const typographyVariables = (typography = {}) => Object.fromEntries(
  ['desktop', 'tablet', 'mobile'].flatMap((device) => {
    const values = { ...typographyDefaults[device], ...(typography[device] || {}) };
    return [
      [`--site-heading-font-${device}`, `'${values.headingFontFamily}', sans-serif`],
      [`--site-body-font-${device}`, `'${values.bodyFontFamily}', sans-serif`],
      [`--site-page-title-${device}`, `${values.pageTitleSize}px`],
      [`--site-section-title-${device}`, `${values.sectionTitleSize}px`],
      [`--site-body-size-${device}`, `${values.bodySize}px`],
      [`--product-price-size-${device}`, `${values.priceSize}px`],
      [`--product-option-size-${device}`, `${values.optionLabelSize}px`],
      ...typographyRoles.flatMap((role) => [
        [`--type-${role}-font-${device}`, `'${values[`${role}FontFamily`] || values.bodyFontFamily}', sans-serif`],
        [`--type-${role}-size-${device}`, `${values[`${role}Size`] || values.bodySize}px`],
      ]),
    ];
  }),
);

const isDirectFontUrl = (value) => {
  try {
    return /\.(woff2?|ttf|otf)$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
};

function ExternalFontLoader({ source }) {
  useEffect(() => {
    const url = source?.url?.trim();
    const family = source?.family?.trim();
    if (!url || !family || !/^https?:\/\//i.test(url)) return undefined;

    const element = document.createElement(isDirectFontUrl(url) ? 'style' : 'link');
    element.dataset.silkmoonCustomFont = 'website';
    if (element.tagName === 'STYLE') {
      const safeFamily = family.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const safeUrl = new URL(url).toString().replace(/"/g, '%22');
      element.textContent = `@font-face { font-family: "${safeFamily}"; src: url("${safeUrl}"); font-display: swap; }`;
    } else {
      element.rel = 'stylesheet';
      element.href = url;
    }
    document.head.appendChild(element);
    return () => element.remove();
  }, [source?.url, source?.family]);

  return null;
}

// Scroll to top on route change for seamless page switching
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    analyticsApi.track({ type: 'page_view', path: pathname });
  }, [pathname]);

  return null;
}

function AppContent() {
  const { pathname } = useLocation();
  const [typography, setTypography] = useState(typographyDefaults);
  const [pageTypography, setPageTypography] = useState({});
  const [fontSource, setFontSource] = useState(emptyFontSource);
  useEffect(() => {
    const loadTypography = () => settingsApi.get('website_content').then((setting) => { setTypography(setting?.value?.typography || typographyDefaults); setPageTypography(setting?.value?.pageTypography || {}); setFontSource({ ...emptyFontSource, ...(setting?.value?.fontSource || {}) }); }).catch(() => {});
    loadTypography();
    window.addEventListener('focus', loadTypography);
    const timer = window.setInterval(loadTypography, 5000);
    return () => { window.removeEventListener('focus', loadTypography); window.clearInterval(timer); };
  }, []);
  const pageKey = pathname === '/' ? 'home' : pathname.startsWith('/product/') ? 'productDetail' : pathname.startsWith('/shop') ? 'shop' : pathname.startsWith('/blog') ? 'blog' : pathname.startsWith('/about') ? 'about' : pathname.startsWith('/checkout') ? 'checkout' : pathname.startsWith('/account') || pathname.startsWith('/profile') ? 'account' : 'global';
  const effectiveTypography = Object.fromEntries(['desktop', 'tablet', 'mobile'].map((device) => [device, { ...typographyDefaults[device], ...(typography[device] || {}), ...(pageTypography[pageKey]?.[device] || {}) }]));
  return (
    <div className={`website-typography page-typography-${pageKey} min-h-screen bg-linen-white text-slate-deep relative flex flex-col antialiased`} style={typographyVariables(effectiveTypography)}>
      <ExternalFontLoader source={fontSource} />
      <ScrollToTop />
      
      {/* Global Header */}
      <Header />

      {/* Main Pages Switcher */}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
          <Route path="/blog-preview" element={<BlogPreview />} />
          <Route path="/showroom" element={<Showroom />} />
          <Route path="/ar-share" element={<ARShare />} />
          <Route path="/account" element={<Account />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>

      {/* Global Footer */}
      <Footer />

      {/* Global AI Chatbot */}
      <Chatbot />
    </div>
  );
}

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

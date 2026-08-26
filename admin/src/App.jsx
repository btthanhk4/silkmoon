import { useEffect, useState } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import OrdersList from './components/OrdersList';
import ProductsList from './components/ProductsList';
import CustomersList from './components/CustomersList';
import CategoriesList from './components/CategoriesList';
import { BlogCommentsAdmin } from './components/BlogAdmin';
import { BlogCategoriesManager, BlogPostsManager, BlogVideosManager } from './components/BlogManagement';
import { AnalyticsManager, ARStudioManager, BannerManager, ChatbotManager, FinanceManager, FooterManager, HeaderManager, MarketingManager, PromotionsManager, ReviewsManager, ServicesManager, StoryManager, TypographyManager } from './components/SiteOperations';
import NewsletterManager from './components/NewsletterManager';
import ProductSizeCategoriesManager from './components/ProductSizeCategoriesManager';
import AdminNotifications from './components/AdminNotifications';
import ToastViewport from './components/ToastViewport';
import silkmoonLogo from '../../frontend/src/assets/xanh_ngang.png';

const navGroups = [
  { label: 'TỔNG QUAN', items: [{ id: 'dashboard', label: 'Tổng quan', icon: 'space_dashboard' }] },
  { label: 'SẢN PHẨM', items: [{ id: 'products', label: 'Quản lý sản phẩm', icon: 'bed' }, { id: 'categories', label: 'Danh mục sản phẩm', icon: 'category' }, { id: 'productSizes', label: 'Phân loại size', icon: 'straighten' }, { id: 'productReviews', label: 'Đánh giá sản phẩm', icon: 'reviews' }, { id: 'promotions', label: 'Mã giảm giá', icon: 'sell' }] },
  { label: 'BLOG', items: [{ id: 'blogPosts', label: 'Quản lý blog', icon: 'article' }, { id: 'blogVideos', label: 'Video blog', icon: 'video_library' }, { id: 'blogCategories', label: 'Danh mục blog', icon: 'topic' }, { id: 'blogComments', label: 'Bình luận blog', icon: 'comment' }] },
  { label: 'NỘI DUNG WEBSITE', items: [{ id: 'headerContent', label: 'Quản lý header', icon: 'vertical_align_top' }, { id: 'bannerContent', label: 'Quản lý banner', icon: 'panorama' }, { id: 'typographyContent', label: 'Font toàn website', icon: 'font_download' }, { id: 'marketingContent', label: 'Tiêu đề marketing', icon: 'campaign' }, { id: 'servicesContent', label: 'Khối dịch vụ', icon: 'verified_user' }, { id: 'storyContent', label: 'Câu chuyện của chúng tôi', icon: 'auto_stories' }, { id: 'footerContent', label: 'Quản lý chân trang', icon: 'vertical_align_bottom' }, { id: 'chatbotContent', label: 'Quản lý chatbot', icon: 'smart_toy' }, { id: 'arStudio', label: 'AR Studio', icon: 'view_in_ar' }] },
  { label: 'BÁO CÁO', items: [{ id: 'analytics', label: 'Google Analytics', icon: 'monitoring' }, { id: 'finance', label: 'Doanh thu & lợi nhuận', icon: 'payments' }] },
  { label: 'VẬN HÀNH', items: [{ id: 'orders', label: 'Đơn hàng', icon: 'receipt_long' }, { id: 'customers', label: 'Khách hàng', icon: 'group' }, { id: 'newsletter', label: 'Đăng ký nhận ưu đãi', icon: 'mark_email_unread' }] },
];

const pageMeta = {
  dashboard: ['Tổng quan cửa hàng', 'Theo dõi hoạt động kinh doanh của Silkmoon.'],
  products: ['Quản lý sản phẩm', 'Cập nhật danh mục và sản phẩm đang kinh doanh.'],
  categories: ['Quản lý danh mục', 'Tổ chức sản phẩm theo từng danh mục của cửa hàng.'],
  productSizes: ['Phân loại size', 'Quản lý các kích thước dùng chung cho sản phẩm.'],
  productReviews: ['Đánh giá sản phẩm', 'Kiểm duyệt đánh giá từ khách hàng.'],
  promotions: ['Mã giảm giá', 'Quản lý chương trình ưu đãi.'],
  headerContent: ['Quản lý header', 'Chỉnh sửa logo và menu điều hướng trên website.'],
  bannerContent: ['Quản lý banner', 'Chỉnh sửa hero và lời kêu gọi hành động trên trang chủ.'],
  typographyContent: ['Font toàn website', 'Cấu hình font và cỡ chữ responsive cho các trang ngoài banner.'],
  marketingContent: ['Tiêu đề marketing', 'Chỉnh sửa thông điệp và thanh thông báo.'],
  footerContent: ['Quản lý chân trang', 'Chỉnh sửa thông tin thương hiệu và liên hệ.'],
  storyContent: ['Câu chuyện của chúng tôi', 'Chỉnh sửa nội dung và hình ảnh trang Về chúng tôi.'],
  servicesContent: ['Khối dịch vụ', 'Chỉnh sửa 3 thẻ dịch vụ nổi bật hiển thị trên trang chủ.'],
  chatbotContent: ['Quản lý chatbot', 'Nội dung tư vấn và theo dõi token AI.'],
  arStudio: ['AR Studio', 'Cấu hình trải nghiệm AR và theo dõi chi phí AI.'],
  analytics: ['Google Analytics', 'Theo dõi lưu lượng và hành vi người dùng.'],
  finance: ['Doanh thu & lợi nhuận', 'Theo dõi hiệu quả tài chính cửa hàng.'],
  blogPosts: ['Quản lý blog', 'Tạo và xuất bản nội dung Silkmoon.'],
  blogVideos: ['Video blog', 'Quản lý video hiển thị trên trang Cẩm nang.'],
  blogCategories: ['Danh mục blog', 'Tổ chức các chủ đề bài viết.'],
  blogComments: ['Bình luận blog', 'Kiểm duyệt thảo luận trên bài viết.'],
  orders: ['Quản lý đơn hàng', 'Theo dõi và cập nhật trạng thái giao hàng.'],
  customers: ['Khách hàng', 'Thông tin khách hàng đã đăng ký tại Silkmoon.'],
  newsletter: ['Đăng ký nhận ưu đãi', 'Quản lý liên hệ Footer và gửi email qua Resend.'],
};

function Brand() {
  return (
    <div className="brand-mark" aria-label="Silkmoon">
      <img className="brand-logo" src={silkmoonLogo} alt="Silkmoon - Premium Bedding & Sleepwear" />
      <span className="admin-badge">ADMIN PORTAL</span>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('admin_token')));
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);
  const [openGroups, setOpenGroups] = useState({ 'TỔNG QUAN': true, 'SẢN PHẨM': true, BLOG: false, 'VẬN HÀNH': false });

  useEffect(() => {
    setMobileOpen(false);
  }, [activeMenu]);

  useEffect(() => {
    const handleUnauthorized = () => setIsAuthenticated(false);
    window.addEventListener('admin:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('admin:unauthorized', handleUnauthorized);
  }, []);

  if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;

  const logout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };
  const openNotificationTarget = (target) => {
    setActiveMenu(target);
    setContentVersion((version) => version + 1);
  };

  const content = {
    dashboard: <Dashboard />,
    products: <ProductsList />,
    categories: <CategoriesList />,
    productSizes: <ProductSizeCategoriesManager />,
    productReviews: <ReviewsManager />,
    promotions: <PromotionsManager />,
    headerContent: <HeaderManager />,
    bannerContent: <BannerManager />,
    typographyContent: <TypographyManager />,
    marketingContent: <MarketingManager />,
    footerContent: <FooterManager />,
    storyContent: <StoryManager />,
    servicesContent: <ServicesManager />,
    chatbotContent: <ChatbotManager />,
    arStudio: <ARStudioManager />,
    analytics: <AnalyticsManager />,
    finance: <FinanceManager />,
    blogPosts: <BlogPostsManager />,
    blogVideos: <BlogVideosManager />,
    blogCategories: <BlogCategoriesManager />,
    blogComments: <BlogCommentsAdmin />,
    orders: <OrdersList />,
    customers: <CustomersList />,
    newsletter: <NewsletterManager />,
  }[activeMenu];

  return (
    <div className="admin-layout">
      <ToastViewport />
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top"><Brand /><button className="icon-button close-menu" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><span className="material-symbols-outlined">close</span></button></div>
        <nav className="nav-links">
          {navGroups.map(group => <div className={`nav-group ${openGroups[group.label] ? 'open' : ''}`} key={group.label}><button className="nav-group-toggle" onClick={() => setOpenGroups(current => ({ ...current, [group.label]: !current[group.label] }))}><span>{group.label}</span><span className="material-symbols-outlined">expand_more</span></button><div className="nav-group-items">{group.items.map(item => (
            <button key={item.id} className={`nav-item ${activeMenu === item.id ? 'active' : ''}`} onClick={() => setActiveMenu(item.id)}>
              <span className="material-symbols-outlined">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}</div></div>)}
        </nav>
        <div className="sidebar-footer">
          <a href="/" className="store-link"><span className="material-symbols-outlined">storefront</span>Xem trang bán hàng<span className="material-symbols-outlined arrow">arrow_outward</span></a>
          <button className="logout-button" onClick={logout}><span className="material-symbols-outlined">logout</span>Đăng xuất</button>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Mở menu"><span className="material-symbols-outlined">menu</span></button>
          <div className="page-heading"><p className="eyebrow">SILKMOON ADMIN</p><h1>{pageMeta[activeMenu][0]}</h1><p>{pageMeta[activeMenu][1]}</p></div>
          <div className="header-actions">
            <AdminNotifications onNavigate={openNotificationTarget} />
            <div className="user-profile"><div className="avatar">SM</div><div><strong>Quản trị viên</strong><span>Administrator</span></div></div>
          </div>
        </header>
        <section className="content-area" key={`${activeMenu}-${contentVersion}`}>{content}</section>
      </main>
    </div>
  );
}

export default App;

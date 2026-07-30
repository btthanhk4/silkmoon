import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "../services/api";
import slide3Img from "../../../frontend/src/assets/carousel-slide3.png";
import footerLogo from "../../../frontend/src/assets/logoweb.silkmoon.png";
import headerLogo from "../../../frontend/src/assets/xanh_ngang.png";
import Pagination from "./Pagination";
import ListSearch, { ListFilter, useListFilter, useListSearch } from "./ListSearch";
const LIST_PAGE_SIZE = 10;
const money = (v) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(v || 0);
export function ReviewsManager() {
  const [items, setItems] = useState([]),
    [selected, setSelected] = useState(null),
    [page, setPage] = useState(1);
  const load = () =>
    adminApi
      .getReviews()
      .then((data) => setItems(Array.isArray(data) ? data : data?.items || []));
  useEffect(() => {
    load();
  }, []);
  const { query, setQuery, filteredItems: searchedItems } = useListSearch(items);
  const { filter, setFilter, filteredItems } = useListFilter(searchedItems, (item) => item.isVerified !== false ? "verified" : "pending");
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Đánh giá sản phẩm</h2>
          <p>{items.length} đánh giá</p>
        </div>
        <div className="list-controls"><ListSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Tìm đánh giá…" /><ListFilter value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[{value:"verified",label:"Đã duyệt"},{value:"pending",label:"Chờ duyệt"}]} /></div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>KHÁCH HÀNG</th>
              <th>SAO</th>
              <th>NỘI DUNG</th>
              <th>TRẠNG THÁI</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE).map((x) => (
              <tr key={x._id}>
                <td className="cell-primary">{x.authorName}</td>
                <td>{"★".repeat(x.rating)}</td>
                <td>{x.comment.slice(0, 80)}</td>
                <td>
                  <span className={`status ${x.isVerified ? "completed" : ""}`}>
                    {x.isVerified ? "Đã duyệt" : "Chờ duyệt"}
                  </span>
                </td>
                <td>
                  <button
                    className="action-button"
                    onClick={() => setSelected(x)}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(filteredItems.length / LIST_PAGE_SIZE))} onPageChange={setPage} />
      {selected && (
        <div className="modal-backdrop">
          <div className="category-modal">
            <div className="modal-header">
              <h2>Chi tiết đánh giá</h2>
              <button className="icon-button" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <div className="review-detail">
              <label className="modal-field"><span>Tên khách hàng</span><input value={selected.authorName} onChange={(event) => setSelected({ ...selected, authorName: event.target.value })} /></label>
              <label className="modal-field"><span>Số sao</span><select value={selected.rating} onChange={(event) => setSelected({ ...selected, rating: Number(event.target.value) })}>{[5,4,3,2,1].map((rating) => <option value={rating} key={rating}>{rating} sao</option>)}</select></label>
              <label className="modal-field"><span>Nội dung đánh giá</span><textarea rows="5" value={selected.comment} onChange={(event) => setSelected({ ...selected, comment: event.target.value })} /></label>
              {!!selected.images?.length && (
                <div className="review-detail-images">
                  {selected.images.map((image, index) => (
                    <a href={image} target="_blank" rel="noreferrer" key={image}>
                      <img src={image} alt={`Ảnh đánh giá ${index + 1}`} />
                    </a>
                  ))}
                </div>
              )}
              <small>Mã sản phẩm: {selected.productId}</small>
            </div>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  adminApi.deleteReview(selected._id).then(() => {
                    setSelected(null);
                    load();
                  })
                }
              >
                Xóa
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  adminApi
                    .updateReview(selected._id, {
                      isVerified: !selected.isVerified,
                    })
                    .then(() => {
                      setSelected(null);
                      load();
                    })
                }
              >
                {selected.isVerified ? "Bỏ duyệt" : "Duyệt"}
              </button>
              <button
                className="primary-button"
                disabled={!selected.authorName.trim() || !selected.comment.trim()}
                onClick={() => adminApi.updateReview(selected._id, { authorName: selected.authorName.trim(), rating: Number(selected.rating), comment: selected.comment.trim() }).then(() => { setSelected(null); load(); })}
              >
                Lưu chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function PromotionsManager() {
  const [items, setItems] = useState([]),
    [form, setForm] = useState(null),
    [page, setPage] = useState(1);
  const load = () =>
    adminApi
      .getPromotions()
      .then((data) => setItems(Array.isArray(data) ? data : data?.items || []));
  useEffect(() => {
    load();
  }, []);
  const { query, setQuery, filteredItems: searchedItems } = useListSearch(items);
  const { filter, setFilter, filteredItems } = useListFilter(searchedItems, (item) => item.isActive !== false ? "active" : "inactive");
  const save = async (e) => {
    e.preventDefault();
    const d = {
      ...form,
      discountPercent: Number(form.discountPercent),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    };
    form._id
      ? await adminApi.updatePromotion(form._id, d)
      : await adminApi.createPromotion(d);
    setForm(null);
    load();
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Mã giảm giá</h2>
          <p>{items.length} chương trình</p>
        </div>
        <div className="list-controls"><ListSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Tìm mã giảm giá…" /><ListFilter value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[{value:"active",label:"Đang hoạt động"},{value:"inactive",label:"Đã tắt"}]} /></div>
        <button
          className="primary-button"
          onClick={() =>
            setForm({
              code: "",
              discountPercent: 10,
              maxUses: "",
              expiresAt: "",
              isActive: true,
            })
          }
        >
          Thêm mã
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>MÃ</th>
              <th>GIẢM</th>
              <th>LƯỢT DÙNG</th>
              <th>HẾT HẠN</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE).map((x) => (
              <tr key={x._id}>
                <td className="cell-primary">{x.code}</td>
                <td>{x.discountPercent}%</td>
                <td>
                  {x.usedCount}/{x.maxUses || "∞"}
                </td>
                <td>
                  {x.expiresAt
                    ? new Date(x.expiresAt).toLocaleDateString("vi-VN")
                    : "Không giới hạn"}
                </td>
                <td>
                  <button
                    className="action-button"
                    onClick={() =>
                      setForm({
                        ...x,
                        expiresAt: x.expiresAt?.slice(0, 10) || "",
                      })
                    }
                  >
                    Sửa
                  </button>
                  <button
                    className="action-button danger"
                    onClick={() => adminApi.deletePromotion(x._id).then(load)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(filteredItems.length / LIST_PAGE_SIZE))} onPageChange={setPage} />
      {form && (
        <Modal title="Mã giảm giá" close={() => setForm(null)} submit={save}>
          <Field label="Mã">
            <input
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              required
            />
          </Field>
          <Field label="Phần trăm giảm">
            <input
              type="number"
              min="1"
              max="100"
              value={form.discountPercent}
              onChange={(e) =>
                setForm({ ...form, discountPercent: e.target.value })
              }
            />
          </Field>
          <Field label="Lượt dùng tối đa">
            <input
              type="number"
              value={form.maxUses || ""}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
          </Field>
          <Field label="Ngày hết hạn">
            <input
              type="date"
              value={form.expiresAt || ""}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}
export function ContentManager() {
  const [content, setContent] = useState({
    hero: { title: "", subtitle: "", image: "" },
    marketing: { headline: "", announcement: "" },
    footer: { description: "", address: "", phone: "", email: "" },
  });
  useEffect(() => {
    adminApi.getSettings().then((rows) => {
      const r = rows.find((x) => x.key === "website_content");
      if (r) setContent(r.value);
    });
  }, []);
  const update = (s, k, v) =>
    setContent((c) => ({ ...c, [s]: { ...c[s], [k]: v } }));
  return (
    <div className="content-settings">
      {Object.entries(content).map(([section, values]) => (
        <section className="panel content-section" key={section}>
          <div className="panel-header">
            <h2>
              {
                {
                  hero: "Banner trang chủ",
                  marketing: "Tiêu đề marketing",
                  footer: "Chân trang",
                }[section]
              }
            </h2>
          </div>
          <div className="content-fields">
            {Object.entries(values).map(([k, v]) => (
              <Field key={k} label={k}>
                <input
                  value={v}
                  onChange={(e) => update(section, k, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </section>
      ))}
      <button
        className="primary-button"
        onClick={() =>
          adminApi.saveSetting("website_content", {
            value: content,
            description: "Nội dung website",
          })
        }
      >
        Lưu nội dung website
      </button>
    </div>
  );
}
const contentDefaults = {
  hero: { title: "", subtitle: "", image: "", buttonText: "", buttonLink: "" },
  header: { logoUrl: "", topLinks: "Về chúng tôi|/about\nBlog|/blog", mainLinks: "Chăn|/shop?category=Chăn\nGa|/shop?category=Ga\nGối|/shop?category=Gối\nBộ đồ ngủ|/shop?category=Đồ ngủ\nPhụ kiện|/shop?category=Phụ kiện\nHướng dẫn chăm sóc|/blog?type=care\nSale|/shop?sale=true", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg" },
  marketing: { headline: "Nghệ Thuật Của Sự Nghỉ Ngơi", subheadline: "Chăm chút giấc ngủ, nâng niu từng khoảnh khắc.", announcement: "Giảm giá 20% cho đơn hàng từ 500.000 vnđ" },
  about: { heroTitle: "Nghệ Thuật Của Sự Nghỉ Ngơi", heroSubtitle: "Khám phá hành trình SILKMOON mang đến trải nghiệm giấc ngủ hoàn mỹ từ những chất liệu tự nhiên thuần khiết nhất.", heroImageUrl: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1920&q=80", missionEyebrow: "Về chúng tôi", missionTitle: "Hơn Cả Một Giấc Ngủ Ngon", missionBody1: "Tại SILKMOON, chúng tôi tin rằng ngôi nhà là thánh đường của sự bình yên. Mỗi sản phẩm được ra đời từ niềm đam mê với chất liệu bền vững và thiết kế tối giản.", missionBody2: "Chúng tôi chọn lọc những sợi cotton tốt nhất và quy trình sản xuất thân thiện với môi trường để mỗi đêm của bạn là một hành trình nghỉ ngơi đích thực.", missionImageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80", valuesTitle: "Giá Trị Cốt Lõi", valuesSubtitle: "Những tiêu chí không bao giờ thay đổi trong suốt quá trình phát triển sản phẩm của SILKMOON.", responsibilityText: "Silkmoon coi trọng trách nhiệm, sự chú trọng đến từng chi tiết và tính chuyên nghiệp.", innovationText: "Silkmoon ứng dụng công nghệ hiện đại để nâng cao trải nghiệm mua sắm.", collaborationText: "Silkmoon xây dựng môi trường cởi mở, tôn trọng và hỗ trợ.", transparencyText: "Silkmoon thúc đẩy sự trung thực, cởi mở và giao tiếp rõ ràng." },
  footer: { companyName: "CÔNG TY TNHH SILKMOON", taxCode: "0314604108", description: "Premium Bedding & Sleepwear", address: "Phố Duy Tân, phường Cầu Giấy, thành phố Hà Nội", workingHours: "8h30 - 21h (Hàng ngày)", phone: "086.777.0989 · 035.365.6383", email: "", newsletterTitle: "Nhận thông tin ưu đãi từ SILKMOON", copyright: "© SILKMOON" },
};
Object.assign(contentDefaults.footer, {
  logoUrl: "",
  facebookUrl: "https://www.facebook.com/",
  instagramUrl: "https://www.instagram.com/",
  tiktokUrl: "https://www.tiktok.com/",
  shopeeUrl: "https://shopee.vn/",
  productLinks: "Bộ chăn ga|/shop\nVỏ chăn|/shop\nVỏ gối|/shop\nBộ đồ ngủ|/shop\nPhụ kiện|/shop",
  policyLinks: "3 đêm ngủ thử|/policy\nĐổi trả sản phẩm|/policy\nVận chuyển|/policy\nBảo hành|/policy\nThanh toán|/policy\nTrả góp 0%|/policy\nBảo mật thông tin|/policy\nChính sách đặt cọc|/policy",
  aboutLinks: "Chuyện của SILKMOON|/about\nFAQs|/policy\nBlog|/blog",
});
const socialFieldLabels = {
  logoUrl: "Logo chân trang",
  facebookUrl: "Facebook URL",
  instagramUrl: "Instagram URL",
  tiktokUrl: "TikTok URL",
  shopeeUrl: "Shopee URL",
  productLinks: "Cột sản phẩm (Tên|Đường dẫn, mỗi dòng một mục)",
  policyLinks: "Cột chính sách (Tên|Đường dẫn, mỗi dòng một mục)",
  aboutLinks: "Cột về chúng tôi (Tên|Đường dẫn, mỗi dòng một mục)",
};
const previewLinks = (value) =>
  (value || "")
    .split("\n")
    .map((line) => line.split("|")[0]?.trim())
    .filter(Boolean);

const parsePreviewLinks = (value) =>
  (value || "")
    .split("\n")
    .map((line) => {
      const separator = line.indexOf("|");
      if (separator < 0) return null;
      const label = line.slice(0, separator).trim();
      const path = line.slice(separator + 1).trim();
      return label && path
        ? { label, path, hasDropdown: path.includes("category=") }
        : null;
    })
    .filter(Boolean);

function HeaderPreview({ values, announcement }) {
  const topLinks = parsePreviewLinks(values.topLinks);
  const mainLinks = parsePreviewLinks(values.mainLinks);
  return (
    <div className="header-site-preview">
      <div className="header-preview-topbar">
        <div className="header-preview-toplinks">
          {topLinks.map((item) => <span key={`${item.label}-${item.path}`}>{item.label}</span>)}
        </div>
        <strong>{announcement}</strong>
        <div className="header-preview-language">
          {values.flagUrl && <img src={values.flagUrl} alt="Việt Nam" />}
        </div>
      </div>
      <div className="header-preview-main">
        <div className="header-preview-brand">
          <img src={values.logoUrl || headerLogo} alt="SILKMOON Logo" />
        </div>
        <nav className="header-preview-navigation" aria-label="Bản xem trước menu chính">
          {mainLinks.map((item) => (
            <span key={`${item.label}-${item.path}`}>
              {item.label}
              {item.hasDropdown && <span className="material-symbols-outlined">expand_more</span>}
            </span>
          ))}
        </nav>
        <div className="header-preview-actions">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="material-symbols-outlined">shopping_cart</span>
          <span className="material-symbols-outlined header-preview-menu-icon">menu</span>
        </div>
      </div>
    </div>
  );
}

function FooterSocialPreview({ label, children }) {
  return <span className="footer-social-preview" title={label}>{children}</span>;
}

function SocialEditIcon({ type }) {
  const symbols = { facebookUrl: "f", instagramUrl: "◎", tiktokUrl: "♪", shopeeUrl: "S" };
  return <span className="footer-social-edit-icon" aria-hidden="true">{symbols[type]}</span>;
}

const socialIconKeys = {
  facebookUrl: "facebookIconUrl",
  instagramUrl: "instagramIconUrl",
  tiktokUrl: "tiktokIconUrl",
  shopeeUrl: "shopeeIconUrl",
};

function LinkListEditor({ value, onChange }) {
  const rows = (value || "").split("\n").map((line) => {
    const separator = line.indexOf("|");
    return separator < 0
      ? { label: line, path: "" }
      : { label: line.slice(0, separator), path: line.slice(separator + 1) };
  });
  const commit = (next) => onChange(next.map((row) => `${row.label}|${row.path}`).join("\n"));
  return (
    <div className="footer-link-editor">
      {rows.map((row, index) => (
        <div className="footer-link-row" key={index}>
          <input value={row.label} placeholder="Tên hiển thị" onChange={(event) => commit(rows.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
          <input value={row.path} placeholder="Đường dẫn, ví dụ /shop" onChange={(event) => commit(rows.map((item, itemIndex) => itemIndex === index ? { ...item, path: event.target.value } : item))} />
          <button type="button" title="Xóa mục" onClick={() => commit(rows.filter((_, itemIndex) => itemIndex !== index))}><span className="material-symbols-outlined">delete</span></button>
        </div>
      ))}
      <button type="button" className="secondary-button footer-add-link" onClick={() => commit([...rows, { label: "", path: "" }])}><span className="material-symbols-outlined">add</span>Thêm mục</button>
    </div>
  );
}

const aboutValues = [
  { key: "responsibilityText", title: "Trách nhiệm", icon: "shield" },
  { key: "innovationText", title: "Đổi mới", icon: "lightbulb" },
  { key: "collaborationText", title: "Hợp tác", icon: "handshake" },
  { key: "transparencyText", title: "Minh bạch", icon: "visibility" },
];

function AboutPagePreview({ values }) {
  return (
    <div className="about-page-preview">
      <div className="about-preview-label"><span className="material-symbols-outlined">visibility</span>BẢN XEM TRƯỚC TRANG VỀ CHÚNG TÔI</div>
      <section className="about-preview-hero">
        <img src={values.heroImageUrl} alt={values.heroTitle || "Ảnh bìa"} />
        <div className="about-preview-overlay" />
        <div className="about-preview-hero-copy"><h1>{values.heroTitle}</h1><p>{values.heroSubtitle}</p></div>
      </section>
      <section className="about-preview-mission">
        <div className="about-preview-mission-image"><img src={values.missionImageUrl} alt={values.missionTitle || "Ảnh câu chuyện"} /></div>
        <div className="about-preview-mission-copy">
          <small>{values.missionEyebrow}</small>
          <h2>{values.missionTitle}</h2>
          <p>{values.missionBody1}</p>
          <p>{values.missionBody2}</p>
        </div>
      </section>
      <section className="about-preview-values">
        <header><h2>{values.valuesTitle}</h2><p>{values.valuesSubtitle}</p></header>
        <div className="about-preview-value-grid">{aboutValues.map((item) => <article key={item.key}><span className="material-symbols-outlined">{item.icon}</span><h3>{item.title}</h3><p>{values[item.key]}</p></article>)}</div>
      </section>
    </div>
  );
}

function WebsiteSectionManager({ section, title, description, labels }) {
  const [all, setAll] = useState(contentDefaults),
    [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState(false);
  useEffect(() => {
    adminApi.getSettings().then((rows) => {
      const row = rows.find((x) => x.key === "website_content");
      if (row)
        setAll({
          ...contentDefaults,
          ...row.value,
          [section]: {
            ...contentDefaults[section],
            ...(row.value?.[section] || {}),
          },
        });
    });
  }, [section]);
  const values = all[section] || {};
  const save = async () => {
    setSaving(true);
    await adminApi.saveSetting("website_content", {
      value: all,
      description: "Nội dung website Silkmoon",
    });
    setSaving(false);
  };
  const uploadImage = async (file, key) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const url = await adminApi.uploadProductImage(dataUrl);
      setAll((current) => ({ ...current, [section]: { ...current[section], [key]: url } }));
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="panel section-manager">
      <div className="section-location">
        <span className="material-symbols-outlined">edit_note</span>
        <div>
          <small>ĐANG CHỈNH SỬA</small>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {section === "marketing" && <div className="marketing-preview"><div className="marketing-announcement">{values.announcement}</div><div><small>TIÊU ĐỀ MARKETING ĐANG HIỂN THỊ</small><h2>{values.headline}</h2><p>{values.subheadline}</p></div></div>}
      {section === "header" && <HeaderPreview values={values} announcement={all.marketing?.announcement || contentDefaults.marketing.announcement} />}
      {section === "about" && <AboutPagePreview values={values} />}
      {section === "footer" && (
        <div className="footer-preview">
          <div className="footer-preview-top">
            <div>{values.logoUrl && <div className="footer-preview-logo"><img src={values.logoUrl} alt="SILKMOON" /></div>}<span>{values.description}</span></div>
            <div><h3>{values.newsletterTitle}</h3><p>Nhận câu chuyện giấc ngủ và ưu đãi mới nhất từ Silkmoon.</p><div className="footer-fake-input">Nhập email hoặc số điện thoại <b>Gửi thông tin</b></div></div>
          </div>
          <div className="footer-preview-columns">
          <div>
            <div className="footer-preview-brand"><strong>{values.companyName}</strong><span>{values.description}</span></div>
            <p>Mã số thuế: {values.taxCode}</p>
            <p>{values.address}</p>
            {values.email && <p>{values.email}</p>}
            <h3>THỜI GIAN LÀM VIỆC</h3>
            <p>{values.workingHours}</p>
            <h3>HOTLINE</h3>
            <p className="footer-preview-phone">{values.phone}</p>
          </div>
          <div>
            <h3>Sản phẩm</h3>
            <ul>{previewLinks(values.productLinks).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>Chính sách</h3>
            <ul>{previewLinks(values.policyLinks).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>Về chúng tôi</h3>
            <ul>{previewLinks(values.aboutLinks).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
          </div>
          </div>
          <div className="footer-preview-bottom">
            <small>{values.copyright}</small>
            <div className="footer-preview-socials">
              {values.facebookUrl && <FooterSocialPreview label="Facebook">{values.facebookIconUrl ? <img src={values.facebookIconUrl} alt="" /> : <SocialEditIcon type="facebookUrl" />}</FooterSocialPreview>}
              {values.instagramUrl && <FooterSocialPreview label="Instagram">{values.instagramIconUrl ? <img src={values.instagramIconUrl} alt="" /> : <SocialEditIcon type="instagramUrl" />}</FooterSocialPreview>}
              {values.tiktokUrl && <FooterSocialPreview label="TikTok">{values.tiktokIconUrl ? <img src={values.tiktokIconUrl} alt="" /> : <SocialEditIcon type="tiktokUrl" />}</FooterSocialPreview>}
              {values.shopeeUrl && <FooterSocialPreview label="Shopee">{values.shopeeIconUrl ? <img src={values.shopeeIconUrl} alt="" /> : <SocialEditIcon type="shopeeUrl" />}</FooterSocialPreview>}
            </div>
          </div>
        </div>
      )}
      <div className="content-fields">
        {Object.entries(values).filter(([key]) => !["productLinks", "policyLinks", "aboutLinks", "topLinks", "mainLinks"].includes(key)).map(([key, value]) => (
          <Field key={key} label={labels[key] || socialFieldLabels[key] || key}>
            {key === "logoUrl" || key.endsWith("ImageUrl") ? (
              <div className="footer-logo-editor">
                <img src={value || footerLogo} alt="Ảnh nội dung" />
                <label className={`image-upload-button ${uploading ? "disabled" : ""}`}><span className="material-symbols-outlined">upload</span>{uploading ? "Đang tải…" : "Thay ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { uploadImage(event.target.files[0], key); event.target.value = ""; }} /></label>
                <input value={value} placeholder="URL hình ảnh" onChange={(event) => setAll((current) => ({ ...current, [section]: { ...current[section], [key]: event.target.value } }))} />
              </div>
            ) : ["facebookUrl", "instagramUrl", "tiktokUrl", "shopeeUrl"].includes(key) ? (
              <div className="footer-social-editor">
                <div className="footer-social-icon-preview">{values[socialIconKeys[key]] ? <img src={values[socialIconKeys[key]]} alt="Icon" /> : <SocialEditIcon type={key} />}</div>
                <div className="footer-social-inputs"><input value={value} placeholder="URL khi bấm icon" onChange={(event) => setAll((current) => ({ ...current, [section]: { ...current[section], [key]: event.target.value } }))} /><input value={values[socialIconKeys[key]] || ""} placeholder="URL hình icon (không bắt buộc)" onChange={(event) => setAll((current) => ({ ...current, [section]: { ...current[section], [socialIconKeys[key]]: event.target.value } }))} /></div>
                <label className={`image-upload-button ${uploading ? "disabled" : ""}`}><span className="material-symbols-outlined">upload</span>Thay icon<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" disabled={uploading} onChange={(event) => { uploadImage(event.target.files[0], socialIconKeys[key]); event.target.value = ""; }} /></label>
              </div>
            ) : key.toLowerCase().includes("description") || key === "subheadline" || key.includes("Body") || key.endsWith("Text") ? (
              <textarea
                rows="4"
                value={value}
                onChange={(e) =>
                  setAll((current) => ({
                    ...current,
                    [section]: { ...current[section], [key]: e.target.value },
                  }))
                }
              />
            ) : (
              <input
                value={value}
                onChange={(e) =>
                  setAll((current) => ({
                    ...current,
                    [section]: { ...current[section], [key]: e.target.value },
                  }))
                }
              />
            )}
          </Field>
        ))}
        {section === "footer" && <div className="footer-link-columns">
          <Field label={socialFieldLabels.productLinks}><LinkListEditor value={values.productLinks} onChange={(productLinks) => setAll((current) => ({ ...current, footer: { ...current.footer, productLinks } }))} /></Field>
          <Field label={socialFieldLabels.policyLinks}><LinkListEditor value={values.policyLinks} onChange={(policyLinks) => setAll((current) => ({ ...current, footer: { ...current.footer, policyLinks } }))} /></Field>
          <Field label={socialFieldLabels.aboutLinks}><LinkListEditor value={values.aboutLinks} onChange={(aboutLinks) => setAll((current) => ({ ...current, footer: { ...current.footer, aboutLinks } }))} /></Field>
        </div>}
        {section === "header" && <div className="footer-link-columns">
          <Field label="Liên kết thanh trên"><LinkListEditor value={values.topLinks} onChange={(topLinks) => setAll((current) => ({ ...current, header: { ...current.header, topLinks } }))} /></Field>
          <Field label="Menu điều hướng chính"><LinkListEditor value={values.mainLinks} onChange={(mainLinks) => setAll((current) => ({ ...current, header: { ...current.header, mainLinks } }))} /></Field>
        </div>}
      </div>
      <div className="section-save">
        <button className="primary-button" onClick={save}>
          {saving ? "Đang lưu…" : `Lưu ${title.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}
const currentSlides = [
  {
    id: 1,
    label: "Bộ sưu tập mới ra mắt 2026",
    title: "Nghệ Thuật Của Sự Nghỉ Ngơi",
    desc: "Khám phá dòng sản phẩm từ lụa Tencel cao cấp, mang lại cảm giác mềm mại cho giấc ngủ trọn vẹn.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAxtxRn3QC_FTuXtFRrdbvmLmb6XXYWuXTubbItMBXeR4aGvNWtyQ8hQTieqOi8Q6dVJ5nAy6AoLjy09HGz5OGCS9tcq3hZPzGbIbKlaoFQM9kli2pt5OSQTNaN52qc0n1whis0vS65IjizWLWHUX385McQq2lX9pX95pVki_kI-cVFf6KsX8n70eCfyVAm07Wl29nRoxf_5havoHlsT45pvGtwlfRvllqM-5f0GdoX0wRoEaAObFElOZvqdzcmCnm9X1EYEERV8W4",
    btnPrimary: "MUA NGAY",
    btnPrimaryLink: "/shop",
    btnSecondary: "TÌM HIỂU THÊM",
    btnSecondaryLink: "/blog",
  },
  {
    id: 2,
    label: "Trải nghiệm công nghệ",
    title: "Trực quan hoá không gian phòng ngủ",
    desc: "Công nghệ AR giúp hình dung sản phẩm Silkmoon trong không gian phòng ngủ một cách dễ dàng hơn.",
    img: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=2000",
    btnPrimary: "TRẢI NGHIỆM NGAY",
    btnPrimaryLink: "/showroom",
    btnSecondary: "XEM CHI TIẾT",
    btnSecondaryLink: "/blog",
  },
  {
    id: 3,
    label: "CHẤT LIỆU CAO CẤP TỪ THIÊN NHIÊN",
    title: "Mềm Mại & Thoáng Mát",
    desc: "Chất liệu Tencel cao cấp siêu mát mẻ, kháng khuẩn tự nhiên, bảo vệ làn da của bạn mỗi đêm.",
    img: slide3Img,
    btnPrimary: "MUA NGAY",
    btnPrimaryLink: "/shop",
    btnSecondary: "TÌM HIỂU THÊM",
    btnSecondaryLink: "/blog",
  },
];
const bannerTypographyDefaults = {
  desktop: { fontFamily: "Manrope", labelSize: 12, titleSize: 64, descSize: 18 },
  tablet: { fontFamily: "Manrope", labelSize: 11, titleSize: 52, descSize: 17 },
  mobile: { fontFamily: "Manrope", labelSize: 10, titleSize: 38, descSize: 15 },
};
const bannerFonts = ["Manrope", "Be Vietnam Pro", "Montserrat", "Playfair Display", "Lora", "Roboto"];
const typographyDeviceSizes = {
  desktop: { pageTitle: 48, intro: 18, eyebrow: 12, sectionTitle: 32, body: 16, cardTitle: 20, cardBody: 14, meta: 12, button: 13, price: 24, optionLabel: 12, optionValue: 16, formLabel: 12, input: 16, stepLabel: 12 },
  tablet: { pageTitle: 42, intro: 17, eyebrow: 11, sectionTitle: 28, body: 16, cardTitle: 19, cardBody: 14, meta: 12, button: 13, price: 23, optionLabel: 12, optionValue: 15, formLabel: 12, input: 16, stepLabel: 11 },
  mobile: { pageTitle: 34, intro: 15, eyebrow: 10, sectionTitle: 25, body: 15, cardTitle: 18, cardBody: 13, meta: 11, button: 12, price: 21, optionLabel: 11, optionValue: 14, formLabel: 11, input: 15, stepLabel: 10 },
};
const makeWebsiteTypography = (device) => {
  const sizes = typographyDeviceSizes[device];
  return {
    headingFontFamily: "Manrope",
    bodyFontFamily: "Manrope",
    pageTitleSize: sizes.pageTitle,
    sectionTitleSize: sizes.sectionTitle,
    bodySize: sizes.body,
    priceSize: sizes.price,
    optionLabelSize: sizes.optionLabel,
    ...Object.fromEntries(Object.entries(sizes).flatMap(([role, size]) => [
      [`${role}Size`, size],
      [`${role}FontFamily`, ["pageTitle", "sectionTitle", "cardTitle", "price"].includes(role) ? "Manrope" : "Manrope"],
    ])),
  };
};
const websiteTypographyDefaults = Object.fromEntries(["desktop", "tablet", "mobile"].map((device) => [device, makeWebsiteTypography(device)]));
const typographyPages = [
  ["global", "Toàn website"], ["home", "Trang chủ"], ["shop", "Cửa hàng"],
  ["productDetail", "Chi tiết sản phẩm"], ["blog", "Blog"], ["about", "Về chúng tôi"],
  ["checkout", "Thanh toán"], ["account", "Tài khoản"],
];
const typographyElementGroups = {
  global: [["pageTitle", "Tiêu đề trang"], ["intro", "Mô tả đầu trang"], ["eyebrow", "Nhãn nhỏ"], ["sectionTitle", "Tiêu đề nội dung"], ["body", "Nội dung thường"], ["cardTitle", "Tiêu đề thẻ"], ["cardBody", "Nội dung thẻ"], ["meta", "Thông tin phụ"], ["button", "Nút bấm"]],
  home: [["sectionTitle", "Tiêu đề khu vực"], ["body", "Mô tả khu vực"], ["cardTitle", "Tên danh mục / sản phẩm"], ["cardBody", "Mô tả thẻ"], ["price", "Giá sản phẩm"], ["button", "Nút và liên kết"]],
  shop: [["pageTitle", "Tiêu đề cửa hàng"], ["intro", "Mô tả cửa hàng"], ["meta", "Bộ lọc và sắp xếp"], ["cardTitle", "Tên sản phẩm"], ["cardBody", "Mô tả sản phẩm"], ["price", "Giá sản phẩm"], ["button", "Nút thêm giỏ"]],
  productDetail: [["eyebrow", "Danh mục sản phẩm"], ["pageTitle", "Tên sản phẩm"], ["meta", "Đánh giá / thông tin phụ"], ["price", "Giá sản phẩm"], ["optionLabel", "Nhãn tùy chọn"], ["optionValue", "Tên size / giá trị"], ["body", "Mô tả sản phẩm"], ["button", "Nút thao tác"]],
  blog: [["pageTitle", "Tiêu đề Blog"], ["intro", "Mô tả Blog"], ["sectionTitle", "Tiêu đề khu vực"], ["cardTitle", "Tiêu đề bài viết"], ["cardBody", "Mô tả bài viết"], ["meta", "Ngày đăng / danh mục"], ["button", "Nút xem thêm"]],
  about: [["eyebrow", "Nhãn giới thiệu"], ["pageTitle", "Tiêu đề ảnh bìa"], ["intro", "Mô tả ảnh bìa"], ["sectionTitle", "Tiêu đề nội dung"], ["body", "Nội dung câu chuyện"], ["cardTitle", "Tiêu đề giá trị"], ["cardBody", "Mô tả giá trị"]],
  checkout: [["stepLabel", "Các bước thanh toán"], ["pageTitle", "Tiêu đề thanh toán"], ["sectionTitle", "Tiêu đề khu vực"], ["formLabel", "Nhãn biểu mẫu"], ["input", "Nội dung ô nhập"], ["body", "Nội dung đơn hàng"], ["price", "Tổng tiền"], ["button", "Nút thanh toán"]],
  account: [["body", "Khẩu hiệu trên ảnh"], ["eyebrow", "Nhãn tài khoản"], ["pageTitle", "Tiêu đề tài khoản"], ["intro", "Mô tả hướng dẫn"], ["meta", "Tab đăng nhập / đăng ký"], ["formLabel", "Nhãn biểu mẫu"], ["input", "Nội dung ô nhập"], ["button", "Nút và liên kết"]],
};

const typographyRoleStyle = (values, role) => ({
  fontFamily: `'${values[`${role}FontFamily`] || (["pageTitle", "sectionTitle", "cardTitle", "price"].includes(role) ? values.headingFontFamily : values.bodyFontFamily)}', sans-serif`,
  fontSize: values[`${role}Size`] || values.bodySize,
});

function TypographyPagePreview({ page, device, values }) {
  const s = (role) => typographyRoleStyle(values, role);
  const productCard = <article className="type-preview-card"><div className="type-preview-image" /><h3 style={s("cardTitle")}>Bộ Chăn Ga Signature Cotton</h3><p style={s("cardBody")}>Mềm mại, thoáng mát cho giấc ngủ trọn vẹn.</p><strong style={s("price")}>2.590.000đ</strong></article>;
  const previews = {
    global: <><span className="type-preview-eyebrow" style={s("eyebrow")}>SILKMOON / TOÀN WEBSITE</span><h1 style={s("pageTitle")}>Nghệ thuật của sự nghỉ ngơi</h1><p className="type-preview-intro" style={s("intro")}>Chăm chút giấc ngủ, nâng niu từng khoảnh khắc.</p><section><h2 style={s("sectionTitle")}>Bộ sưu tập nổi bật</h2><p style={s("body")}>Thiết lập mặc định được dùng khi trang chưa có cấu hình riêng.</p></section></>,
    home: <><section className="type-preview-heading-row"><div><h2 style={s("sectionTitle")}>Danh Mục Nổi Bật</h2><p style={s("body")}>Khám phá không gian nghỉ ngơi dành riêng cho bạn.</p></div><button style={s("button")}>XEM TẤT CẢ</button></section><div className="type-preview-grid">{productCard}{productCard}{productCard}</div></>,
    shop: <><h1 style={s("pageTitle")}>Tất cả sản phẩm</h1><p className="type-preview-intro" style={s("intro")}>Khám phá bộ sưu tập chăn ga gối đệm từ chất liệu tự nhiên bền vững.</p><div className="type-preview-toolbar" style={s("meta")}><span>BỘ LỌC</span><span>Hiển thị 24 sản phẩm</span><span>Sắp xếp: Mới nhất</span></div><div className="type-preview-grid">{productCard}{productCard}{productCard}</div></>,
    productDetail: <div className="type-preview-product"><div className="type-preview-product-photo" /><div><span className="type-preview-eyebrow" style={s("eyebrow")}>BỘ CHĂN GA</span><h1 style={s("pageTitle")}>Bộ Chăn Ga Signature Cotton</h1><p style={s("meta")}>★★★★★ (124 đánh giá)</p><strong className="type-preview-product-price" style={s("price")}>2.590.000 VNĐ</strong><label style={s("optionLabel")}>CHỌN KÍCH THƯỚC</label><div className="type-preview-options"><button style={s("optionValue")}>Queen (160×200)</button><button style={s("optionValue")}>King (180×200)</button></div><p style={s("body")}>Chất liệu cotton cao cấp, mềm mại và thoáng khí.</p><button className="type-preview-primary" style={s("button")}>THÊM VÀO GIỎ</button></div></div>,
    blog: <><h1 style={s("pageTitle")}>Blog</h1><p className="type-preview-intro" style={s("intro")}>Câu chuyện về giấc ngủ và phong cách sống.</p><section className="type-preview-feature"><div className="type-preview-image" /><div><span style={s("meta")}>CHĂM SÓC · 14/07/2026</span><h2 style={s("sectionTitle")}>Bí quyết để có một giấc ngủ sâu</h2><p style={s("cardBody")}>Những thói quen đơn giản giúp bạn tái tạo năng lượng mỗi ngày.</p><button style={s("button")}>ĐỌC THÊM</button></div></section><div className="type-preview-grid">{productCard}{productCard}</div></>,
    about: <><section className="type-preview-about-hero"><span style={s("eyebrow")}>VỀ CHÚNG TÔI</span><h1 style={s("pageTitle")}>Nghệ Thuật Của Sự Nghỉ Ngơi</h1><p style={s("intro")}>Hành trình mang đến trải nghiệm giấc ngủ hoàn mỹ.</p></section><section className="type-preview-story"><div className="type-preview-image" /><div><h2 style={s("sectionTitle")}>Hơn Cả Một Giấc Ngủ Ngon</h2><p style={s("body")}>Mỗi sản phẩm được tạo nên từ niềm đam mê với chất liệu bền vững và thiết kế tối giản.</p><h3 style={s("cardTitle")}>Trách nhiệm</h3><p style={s("cardBody")}>Chú trọng đến từng chi tiết trong trải nghiệm khách hàng.</p></div></section></>,
    checkout: <><div className="type-preview-steps" style={s("stepLabel")}><b>GIỎ HÀNG</b><span>›</span><b>THÔNG TIN</b><span>›</span><b>HOÀN TẤT</b></div><h1 style={s("pageTitle")}>Thông tin thanh toán</h1><div className="type-preview-checkout"><section><h2 style={s("sectionTitle")}>Địa chỉ nhận hàng</h2><label style={s("formLabel")}>HỌ VÀ TÊN</label><div className="type-preview-input" style={s("input")}>Nguyễn Quý Hưng</div><label style={s("formLabel")}>ĐỊA CHỈ CHI TIẾT</label><div className="type-preview-input" style={s("input")}>Số nhà, tên đường, tòa nhà...</div></section><aside><h2 style={s("sectionTitle")}>Đơn hàng</h2><p style={s("body")}>Bộ Chăn Ga Signature Cotton</p><strong style={s("price")}>2.590.000đ</strong><button style={s("button")}>THANH TOÁN</button></aside></div></>,
    account: <div className="type-preview-account">
      <section className="type-preview-account-visual" style={{ backgroundImage: `linear-gradient(to top, rgba(15,34,63,.95), rgba(15,34,63,.18)), url(${slide3Img})` }}>
        <img src={headerLogo} alt="SILKMOON" />
        <div><p style={s("body")}>Chăm chút giấc ngủ,<br />nâng niu từng khoảnh khắc.</p><span style={s("eyebrow")}>KHÔNG GIAN KHÁCH HÀNG SILKMOON</span></div>
      </section>
      <section className="type-preview-account-form">
        <div>
          <span className="type-preview-eyebrow" style={s("eyebrow")}>TÀI KHOẢN SILKMOON</span>
          <h1 style={s("pageTitle")}>Chào mừng trở lại</h1>
          <p style={s("intro")}>Đăng nhập là tùy chọn. Anh/chị vẫn có thể mua hàng và thanh toán mà không cần tài khoản.</p>
          <div className="type-preview-account-tabs" style={s("meta")}><b>Đăng nhập</b><span>Đăng ký</span></div>
          <label style={s("formLabel")}>EMAIL</label><div className="type-preview-account-input" style={s("input")}>silkmoon.vn@gmail.com</div>
          <label style={s("formLabel")}>MẬT KHẨU</label><div className="type-preview-account-input" style={s("input")}>••••••••</div>
          <button className="type-preview-account-forgot" style={s("button")}>Quên mật khẩu?</button>
          <button className="type-preview-account-submit" style={s("button")}>ĐĂNG NHẬP</button>
        </div>
      </section>
    </div>,
  };
  return <div className={`typography-site-preview typography-real-preview ${device} page-${page}`}>{previews[page]}</div>;
}
export function BannerManager() {
  const [all, setAll] = useState(contentDefaults),
    [slides, setSlides] = useState(currentSlides),
    [active, setActive] = useState(0),
    [previewDevice, setPreviewDevice] = useState("desktop"),
    [uploading, setUploading] = useState(false),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    adminApi.getSettings().then((rows) => {
      const row = rows.find((x) => x.key === "website_content");
      if (row) {
        setAll({ ...contentDefaults, ...row.value });
        if (row.value?.hero?.slides?.length) setSlides(row.value.hero.slides);
      }
    });
  }, []);
  const update = (key, value) =>
    setSlides((list) =>
      list.map((slide, index) =>
        index === active ? { ...slide, [key]: value } : slide,
      ),
    );
  const currentTypography = { ...bannerTypographyDefaults[previewDevice], ...(slides[active]?.typography?.[previewDevice] || {}) };
  const updateTypography = (key, value) => update("typography", {
    ...(slide.typography || {}),
    [previewDevice]: { ...currentTypography, [key]: key === "fontFamily" ? value : Math.max(8, Number(value) || 8) },
  });
  const upload = (file) => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        update("img", await adminApi.uploadProductImage(reader.result));
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const save = async () => {
    setSaving(true);
    const value = { ...all, hero: { slides } };
    await adminApi.saveSetting("website_content", {
      value,
      description: "Nội dung website Silkmoon",
    });
    setAll(value);
    setSaving(false);
  };
  const slide = slides[active];
  return (
    <div className="banner-manager">
      <div className="panel">
        <div className="section-location">
          <span className="material-symbols-outlined">panorama</span>
          <div>
            <small>ĐANG CHỈNH SỬA</small>
            <h2>Banner trang chủ</h2>
            <p>Toàn bộ slider hero đang hiển thị trên website.</p>
          </div>
        </div>
        <div className="banner-tabs">
          {slides.map((item, index) => (
            <button
              key={item.id}
              className={active === index ? "active" : ""}
              onClick={() => setActive(index)}
            >
              <img src={item.img} alt="" />
              <span>
                Slide {index + 1}
                <small>{item.label}</small>
              </span>
            </button>
          ))}
          <button
            className="add-slide"
            onClick={() => {
              setSlides((list) => [
                ...list,
                {
                  id: Date.now(),
                  label: "Slide mới",
                  title: "Tiêu đề banner",
                  desc: "",
                  img: "",
                  btnPrimary: "XEM THÊM",
                  btnPrimaryLink: "/shop",
                  btnSecondary: "",
                  btnSecondaryLink: "",
                },
              ]);
              setActive(slides.length);
            }}
          >
            <span className="material-symbols-outlined">add</span>Thêm slide
          </button>
        </div>
        {slide && (
          <>
            <div className="banner-device-toolbar"><strong>Xem trước theo thiết bị</strong><div>{[["desktop","desktop_windows","Desktop"],["tablet","tablet_mac","Tablet"],["mobile","smartphone","Mobile"]].map(([device, icon, label]) => <button key={device} type="button" className={previewDevice === device ? "active" : ""} onClick={() => setPreviewDevice(device)} title={label}><span className="material-symbols-outlined">{icon}</span>{label}</button>)}</div></div>
            <div className={`banner-preview-stage ${previewDevice}`}>
              <div
                className="banner-live-preview"
                style={{
                  backgroundImage: `linear-gradient(rgba(15,34,63,.32),rgba(15,34,63,.32)),url("${slide.img}")`,
                  fontFamily: `'${currentTypography.fontFamily}', sans-serif`,
                }}
              >
                <div>
                  <small style={{ fontSize: currentTypography.labelSize }}>{slide.label}</small>
                  <h2 style={{ fontSize: currentTypography.titleSize }} dangerouslySetInnerHTML={{ __html: slide.title }} />
                  <p style={{ fontSize: currentTypography.descSize }}>{slide.desc}</p>
                  <button>{slide.btnPrimary}</button>
                </div>
              </div>
            </div>
            <div className="content-fields banner-fields">
              <div className="banner-typography-title"><span className="material-symbols-outlined">text_fields</span><div><strong>Kiểu chữ — {previewDevice === "desktop" ? "Desktop" : previewDevice === "tablet" ? "Tablet" : "Mobile"}</strong><small>Cấu hình được lưu riêng cho thiết bị đang xem trước.</small></div></div>
              <Field label="Font chữ"><select value={currentTypography.fontFamily} onChange={(e) => updateTypography("fontFamily", e.target.value)}>{bannerFonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></Field>
              <Field label="Cỡ nhãn (px)"><input type="number" min="8" max="32" value={currentTypography.labelSize} onChange={(e) => updateTypography("labelSize", e.target.value)} /></Field>
              <Field label="Cỡ tiêu đề (px)"><input type="number" min="20" max="120" value={currentTypography.titleSize} onChange={(e) => updateTypography("titleSize", e.target.value)} /></Field>
              <Field label="Cỡ mô tả (px)"><input type="number" min="10" max="40" value={currentTypography.descSize} onChange={(e) => updateTypography("descSize", e.target.value)} /></Field>
              {[
                ["label", "Nhãn phía trên"],
                ["title", "Tiêu đề banner"],
                ["desc", "Mô tả"],
                ["btnPrimary", "Nút chính"],
                ["btnPrimaryLink", "Liên kết nút chính"],
                ["btnSecondary", "Nút phụ"],
                ["btnSecondaryLink", "Liên kết nút phụ"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    value={slide[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </Field>
              ))}
              <Field label="Hình ảnh banner">
                <div className="banner-image-input">
                  <input
                    value={slide.img || ""}
                    onChange={(e) => update("img", e.target.value)}
                    placeholder="URL ảnh"
                  />
                  <label className="secondary-button">
                    {uploading ? "Đang tải…" : "Upload ảnh"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => upload(e.target.files[0])}
                    />
                  </label>
                </div>
              </Field>
            </div>
            <div className="section-save">
              <button
                className="action-button danger"
                onClick={() => {
                  if (slides.length > 1) {
                    setSlides((list) => list.filter((_, i) => i !== active));
                    setActive(0);
                  }
                }}
              >
                Xóa slide
              </button>
              <button className="primary-button" onClick={save}>
                {saving ? "Đang lưu…" : "Lưu toàn bộ banner"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function TypographyManager() {
  const [all, setAll] = useState(contentDefaults);
  const [typography, setTypography] = useState(websiteTypographyDefaults);
  const [pageTypography, setPageTypography] = useState({});
  const [selectedPage, setSelectedPage] = useState("global");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then((rows) => {
      const row = rows.find((item) => item.key === "website_content");
      if (!row) return;
      setAll({ ...contentDefaults, ...row.value });
      setTypography({
        desktop: { ...websiteTypographyDefaults.desktop, ...(row.value?.typography?.desktop || {}) },
        tablet: { ...websiteTypographyDefaults.tablet, ...(row.value?.typography?.tablet || {}) },
        mobile: { ...websiteTypographyDefaults.mobile, ...(row.value?.typography?.mobile || {}) },
      });
      setPageTypography(row.value?.pageTypography || {});
    });
  }, []);

  const current = selectedPage === "global"
    ? typography[previewDevice]
    : { ...typography[previewDevice], ...(pageTypography[selectedPage]?.[previewDevice] || {}) };
  const update = (key, value) => {
    const nextValue = key.includes("FontFamily") ? value : Math.max(10, Number(value) || 10);
    if (selectedPage === "global") setTypography((values) => ({ ...values, [previewDevice]: { ...values[previewDevice], [key]: nextValue } }));
    else setPageTypography((pages) => ({ ...pages, [selectedPage]: { ...(pages[selectedPage] || {}), [previewDevice]: { ...(pages[selectedPage]?.[previewDevice] || {}), [key]: nextValue } } }));
  };
  const save = async () => {
    setSaving(true);
    const value = { ...all, typography, pageTypography };
    await adminApi.saveSetting("website_content", { value, description: "Nội dung website Silkmoon" });
    setAll(value);
    setSaving(false);
  };

  return (
    <div className="panel section-manager typography-manager">
      <div className="section-location"><span className="material-symbols-outlined">font_download</span><div><small>ĐANG CHỈNH SỬA</small><h2>Font chữ toàn website</h2><p>Áp dụng cho tiêu đề trang, tiêu đề nội dung và văn bản trên các trang ngoài banner.</p></div></div>
      <div className="typography-page-tabs">{typographyPages.map(([key, label]) => <button type="button" key={key} className={selectedPage === key ? "active" : ""} onClick={() => setSelectedPage(key)}>{label}</button>)}</div>
      <div className="banner-device-toolbar"><strong>Xem trước theo thiết bị</strong><div>{[["desktop","desktop_windows","Desktop"],["tablet","tablet_mac","Tablet"],["mobile","smartphone","Mobile"]].map(([device, icon, label]) => <button key={device} type="button" className={previewDevice === device ? "active" : ""} onClick={() => setPreviewDevice(device)}><span className="material-symbols-outlined">{icon}</span>{label}</button>)}</div></div>
      <TypographyPagePreview page={selectedPage} device={previewDevice} values={current} />
      <div className="content-fields banner-fields">
        <div className="banner-typography-title"><span className="material-symbols-outlined">text_fields</span><div><strong>Kiểu chữ — {previewDevice === "desktop" ? "Desktop" : previewDevice === "tablet" ? "Tablet" : "Mobile"}</strong><small>Mỗi thiết bị có cấu hình riêng và được website tự áp dụng.</small></div></div>
        <div className="typography-element-list">
          {(typographyElementGroups[selectedPage] || typographyElementGroups.global).map(([role, label]) => (
            <div className="typography-element-editor" key={role}>
              <div><strong>{label}</strong><small>{role}</small></div>
              <label><span>Font chữ</span><select value={current[`${role}FontFamily`] || current.bodyFontFamily} onChange={(event) => update(`${role}FontFamily`, event.target.value)}>{bannerFonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></label>
              <label><span>Cỡ chữ (px)</span><input type="number" min="8" max="120" value={current[`${role}Size`] || current.bodySize} onChange={(event) => update(`${role}Size`, event.target.value)} /></label>
            </div>
          ))}
        </div>
      </div>
      <div className="section-save"><button className="primary-button" disabled={saving} onClick={save}>{saving ? "Đang lưu…" : "Lưu font toàn website"}</button></div>
    </div>
  );
}
export function MarketingManager() {
  return (
    <WebsiteSectionManager
      section="marketing"
      title="Tiêu đề marketing"
      description="Thông điệp thương hiệu và thanh thông báo khuyến mại."
      labels={{
        headline: "Tiêu đề chính",
        subheadline: "Nội dung hỗ trợ",
        announcement: "Thanh thông báo đầu trang",
      }}
    />
  );
}
export function HeaderManager() {
  return <WebsiteSectionManager section="header" title="Header" description="Quản lý logo, cờ ngôn ngữ và các liên kết điều hướng ở đầu website." labels={{ logoUrl: "Logo header", flagUrl: "URL cờ ngôn ngữ" }} />;
}
export function FooterManager() {
  return (
    <WebsiteSectionManager
      section="footer"
      title="Chân trang"
      description="Thông tin thương hiệu và liên hệ hiển thị cuối mọi trang."
      labels={{ companyName:"Tên công ty", taxCode:"Mã số thuế", description:"Mô tả thương hiệu", address:"Địa chỉ", workingHours:"Thời gian làm việc", phone:"Hotline", email:"Email", newsletterTitle:"Tiêu đề đăng ký ưu đãi", copyright:"Dòng bản quyền" }}
    />
  );
}
export function StoryManager() {
  return <WebsiteSectionManager section="about" title="Câu chuyện của chúng tôi" description="Nội dung và hình ảnh hiển thị tại trang Về chúng tôi." labels={{ heroTitle:"Tiêu đề ảnh bìa", heroSubtitle:"Mô tả ảnh bìa", heroImageUrl:"Ảnh bìa", missionEyebrow:"Nhãn giới thiệu", missionTitle:"Tiêu đề câu chuyện", missionBody1:"Đoạn nội dung thứ nhất", missionBody2:"Đoạn nội dung thứ hai", missionImageUrl:"Ảnh câu chuyện", valuesTitle:"Tiêu đề giá trị cốt lõi", valuesSubtitle:"Mô tả giá trị cốt lõi", responsibilityText:"Trách nhiệm", innovationText:"Đổi mới", collaborationText:"Hợp tác", transparencyText:"Minh bạch" }} />;
}
export function AnalyticsManager() {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  useEffect(() => {
    adminApi.getAnalytics().then(setData);
    adminApi.getAnalyticsReport().then(setReport);
  }, []);
  return (
    <div className="analytics-report">
      <div className="dashboard-grid">
        <div className="panel stat-card"><div className="stat-header">Lượt xem trang / 30 ngày</div><div className="stat-value">{report?.totals?.page_view || 0}</div></div>
        <div className="panel stat-card"><div className="stat-header">Lượt xem sản phẩm</div><div className="stat-value">{report?.totals?.product_view || 0}</div></div>
        <div className="panel stat-card"><div className="stat-header">Lượt mở AR</div><div className="stat-value">{report?.totals?.ar_open || 0}</div></div>
        <div className="panel stat-card"><div className="stat-header">Lượt mở chatbot</div><div className="stat-value">{report?.totals?.chatbot_open || 0}</div></div>
      </div>
      <div className="analytics-tables">
        <section className="panel"><div className="panel-header"><div><h2>Trang được xem nhiều nhất</h2><p>Dữ liệu first-party 30 ngày gần nhất</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>TRANG</th><th>LƯỢT XEM</th></tr></thead><tbody>{(report?.topPages || []).map((row) => <tr key={row._id}><td className="cell-primary">{row._id}</td><td>{row.views}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><div className="panel-header"><div><h2>Sản phẩm được xem nhiều nhất</h2><p>Đo theo lượt mở trang chi tiết</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>SẢN PHẨM</th><th>LƯỢT XEM</th></tr></thead><tbody>{(report?.topProducts || []).map((row) => <tr key={row._id}><td className="cell-primary">{row.label || row._id}</td><td>{row.views}</td></tr>)}</tbody></table></div></section>
      </div>
      <div className="panel integration-state compact-integration"><span className="material-symbols-outlined">monitoring</span><div><h2>Google Analytics 4</h2><p>{data?.message || "Đang kiểm tra…"}</p></div><span className={`status ${data?.connected ? "completed" : "cancelled"}`}>{data?.connected ? "Đã kết nối" : "Chưa kết nối"}</span></div>
    </div>
  );
}
const defaultFinanceConfig = {
  revenueBasis: "total",
  includePaidOrders: true,
  codStatuses: ["delivered", "completed"],
  paymentFeePercent: 0,
  shippingCostPerOrder: 0,
  otherCostPercent: 0,
  fixedOperatingCost: 0,
};

export function FinanceManager() {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState(defaultFinanceConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ from: monthAgo, to: today, groupBy: "day" });
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    adminApi.getFinance(filters).then((report) => {
      setData(report);
      if (report?.config) setConfig({ ...defaultFinanceConfig, ...report.config });
    }).finally(() => setLoading(false));
  }, [filters]);
  useEffect(() => {
    load();
  }, [load]);
  const updateConfig = (key, value) => {
    setSaved(false);
    setConfig((current) => ({ ...current, [key]: value }));
  };
  const toggleCodStatus = (status) => updateConfig("codStatuses", config.codStatuses.includes(status)
    ? config.codStatuses.filter((item) => item !== status)
    : [...config.codStatuses, status]);
  const saveConfig = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await adminApi.saveSetting("finance_config", { value: config, description: "Quy tắc tính doanh thu và lợi nhuận" });
      setSaved(true);
      load();
    } finally {
      setSaving(false);
    }
  };
  const exportExcel = () => {
    if (!data) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
      { "Chỉ số": "Doanh thu", "Giá trị": data.revenue },
      { "Chỉ số": "Giá vốn", "Giá trị": data.cost },
      { "Chỉ số": "Lợi nhuận gộp", "Giá trị": data.grossProfit },
      { "Chỉ số": "Phí thanh toán", "Giá trị": data.paymentFees },
      { "Chỉ số": "Phí vận chuyển", "Giá trị": data.shippingCosts },
      { "Chỉ số": "Chi phí khác", "Giá trị": data.otherCosts },
      { "Chỉ số": "Lợi nhuận ròng", "Giá trị": data.netProfit },
      { "Chỉ số": "Giảm giá", "Giá trị": data.discount },
      { "Chỉ số": "Biên lợi nhuận (%)", "Giá trị": data.margin },
      { "Chỉ số": "Số đơn ghi nhận", "Giá trị": data.orderCount },
    ]), "Tổng quan");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((data.series || []).map((row) => ({ "Kỳ": row.label, "Doanh thu": row.revenue, "Giá vốn": row.cost, "Lợi nhuận": row.profit, "Số đơn": row.orderCount }))), "Theo thời gian");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((data.topProducts || []).map((row) => ({ "Sản phẩm": row.name, "Số lượng": row.quantity, "Doanh thu": row.revenue, "Giá vốn": row.cost, "Lợi nhuận": row.profit }))), "Sản phẩm");
    XLSX.writeFile(workbook, `bao-cao-tai-chinh-${filters.from}-${filters.to}.xlsx`);
  };
  const compactMoney = (value) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
  return (
    <div className="finance-report">
      <div className="panel report-toolbar">
        <label>Từ ngày<input type="date" value={filters.from} max={filters.to} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label>Đến ngày<input type="date" value={filters.to} min={filters.from} max={today} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <label>Nhóm dữ liệu<select value={filters.groupBy} onChange={(event) => setFilters({ ...filters, groupBy: event.target.value })}><option value="day">Theo ngày</option><option value="week">Theo tuần</option><option value="month">Theo tháng</option><option value="quarter">Theo quý</option><option value="year">Theo năm</option></select></label>
        <button className="primary-button" onClick={exportExcel} disabled={!data}><span className="material-symbols-outlined">download</span>Xuất Excel</button>
      </div>
      <section className="panel finance-config">
        <div className="panel-header">
          <div><h2>Thiết lập cách tính</h2><p>Thay đổi quy tắc rồi lưu để tính lại toàn bộ báo cáo trong khoảng thời gian đã chọn.</p></div>
          <div className="finance-config-actions">{saved && <span className="status completed">Đã lưu</span>}<button className="primary-button" onClick={saveConfig} disabled={saving}>{saving ? "Đang lưu…" : "Lưu & tính lại"}</button></div>
        </div>
        <div className="finance-config-grid">
          <label className="modal-field"><span>Giá trị ghi nhận doanh thu</span><select value={config.revenueBasis} onChange={(event) => updateConfig("revenueBasis", event.target.value)}><option value="total">Tổng thanh toán (sau giảm giá)</option><option value="subtotal">Tạm tính (trước giảm giá)</option></select></label>
          <label className="option-toggle modal-field"><input type="checkbox" checked={config.includePaidOrders} onChange={(event) => updateConfig("includePaidOrders", event.target.checked)} /><span className="toggle-ui" /><span><strong>Đơn đã thanh toán</strong><small>Ghi nhận mọi đơn có trạng thái thanh toán “Đã trả”.</small></span></label>
          <div className="modal-field full"><span>Ghi nhận đơn COD khi ở trạng thái</span><div className="finance-status-options">{[["pending","Chờ xử lý"],["processing","Đang xử lý"],["shipped","Đang giao"],["delivered","Đã giao"],["completed","Hoàn thành"]].map(([value,label]) => <label key={value}><input type="checkbox" checked={config.codStatuses.includes(value)} onChange={() => toggleCodStatus(value)} />{label}</label>)}</div></div>
          <label className="modal-field"><span>Phí thanh toán (% doanh thu)</span><input type="number" min="0" step="0.1" value={config.paymentFeePercent} onChange={(event) => updateConfig("paymentFeePercent", Number(event.target.value))} /></label>
          <label className="modal-field"><span>Phí vận chuyển / đơn</span><input type="number" min="0" step="1000" value={config.shippingCostPerOrder} onChange={(event) => updateConfig("shippingCostPerOrder", Number(event.target.value))} /></label>
          <label className="modal-field"><span>Chi phí khác (% doanh thu)</span><input type="number" min="0" step="0.1" value={config.otherCostPercent} onChange={(event) => updateConfig("otherCostPercent", Number(event.target.value))} /></label>
          <label className="modal-field"><span>Chi phí vận hành cố định / kỳ</span><input type="number" min="0" step="1000" value={config.fixedOperatingCost} onChange={(event) => updateConfig("fixedOperatingCost", Number(event.target.value))} /></label>
        </div>
      </section>
      <div className="dashboard-grid">
        {[
          ["Doanh thu", data?.revenue],
          ["Giá vốn", data?.cost],
          ["Lợi nhuận gộp", data?.grossProfit],
          ["Lợi nhuận ròng", data?.netProfit],
        ].map(([l, v]) => (
          <div className="panel stat-card" key={l}>
            <div className="stat-header">{l}</div>
            <div className="stat-value">{money(v)}</div>
          </div>
        ))}
      </div>
      <section className="panel finance-chart-panel">
        <div className="chart-heading"><div><h2>Doanh thu và lợi nhuận ròng</h2><p>{loading ? "Đang tải dữ liệu…" : `${data?.orderCount || 0} đơn được ghi nhận`}</p></div><span className="status completed">Biên LN ròng {(data?.margin || 0).toFixed(1)}%</span></div>
        <div className="finance-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.series || []} margin={{ top: 12, right: 18, left: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#e4e9ed" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tickFormatter={compactMoney} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => money(value)} /><Legend /><Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2563eb" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#287a52" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
      </section>
      <section className="panel finance-chart-panel">
        <div className="chart-heading"><div><h2>Sản phẩm đóng góp nhiều nhất</h2><p>Doanh thu và lợi nhuận theo sản phẩm</p></div></div>
        <div className="finance-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.topProducts || []} margin={{ top: 12, right: 18, left: 8, bottom: 36 }}><CartesianGrid strokeDasharray="3 3" stroke="#e4e9ed" /><XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" interval={0} /><YAxis tickFormatter={compactMoney} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => money(value)} /><Legend /><Bar dataKey="revenue" name="Doanh thu" fill="#4a90e2" radius={[3,3,0,0]} /><Bar dataKey="profit" name="Lợi nhuận" fill="#287a52" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer></div>
      </section>
      <div className="panel finance-summary">
        <h2>Cách tính số liệu</h2>
        <p><strong>Doanh thu:</strong> {data?.formula?.revenue}</p>
        <p><strong>Lợi nhuận gộp:</strong> {data?.formula?.grossProfit}</p>
        <p><strong>Lợi nhuận ròng:</strong> {data?.formula?.netProfit}</p>
        {!!data?.missingCostSnapshots && <p className="report-warning">Có {data.missingCostSnapshots} dòng sản phẩm lịch sử chưa có snapshot giá vốn; báo cáo đang dùng giá vốn hiện tại.</p>}
      </div>
    </div>
  );
}

const assistantDefaults = {
  chatbot: { enabled: true, greeting: "Xin chào! Bạn cần tư vấn sản phẩm?", fallbackResponse: "Cảm ơn bạn đã nhắn tin. Bạn có thể hỏi tôi về chất liệu, giá bán hoặc sản phẩm Silkmoon.", systemPrompt: "Tư vấn ngắn gọn, chính xác và chỉ sử dụng thông tin sản phẩm Silkmoon." },
  ar: { enabled: true, showProductButton: true, aiModeEnabled: true, webxrEnabled: true, defaultPrompt: "", guideTitle: "", usageGuideText: "", retentionDays: 7, monthlyBudget: 0 },
};

function AssistantSettingsManager({ section, title, description }) {
  const [config, setConfig] = useState(assistantDefaults);
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    adminApi.getSettings().then((rows) => {
      const row = rows.find((item) => item.key === "assistant_config");
      if (row?.value) {
        const loadedAr = { ...assistantDefaults.ar, ...row.value.ar };
        if (!loadedAr.usageGuideText && Array.isArray(loadedAr.usageTips)) loadedAr.usageGuideText = loadedAr.usageTips.join("\n");
        delete loadedAr.usageTips;
        setConfig({ chatbot: { ...assistantDefaults.chatbot, ...row.value.chatbot }, ar: loadedAr });
      }
    });
    adminApi.getAiUsage().then(setUsage);
  }, []);
  const values = config[section];
  const update = (key, value) => setConfig((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  const save = async () => {
    setSaving(true);
    await adminApi.saveSetting("assistant_config", { value: config, description: "Cấu hình Chatbot và AR Studio" });
    setSaving(false);
  };
  return <div className="assistant-settings">
    <div className="dashboard-grid ai-usage-grid">
      <div className="panel stat-card"><div className="stat-header">Token AI / 30 ngày</div><div className="stat-value">{(usage?.totalTokens || 0).toLocaleString("vi-VN")}</div></div>
      <div className="panel stat-card"><div className="stat-header">Request AI / 30 ngày</div><div className="stat-value">{usage?.totalRequests || 0}</div></div>
    </div>
    <section className="panel section-manager">
      <div className="section-location"><span className="material-symbols-outlined">{section === "ar" ? "view_in_ar" : "smart_toy"}</span><div><small>ĐANG CHỈNH SỬA</small><h2>{title}</h2><p>{description}</p></div></div>
      <div className="content-fields assistant-fields">
        {section === "chatbot" ? <>
          <label className="option-toggle modal-field full"><input type="checkbox" checked={values.enabled} onChange={(event) => update("enabled", event.target.checked)} /><span className="toggle-ui" /><span><strong>Bật chatbot</strong><small>Hiển thị trợ lý trên website bán hàng.</small></span></label>
          <Field label="Lời chào"><input value={values.greeting} onChange={(event) => update("greeting", event.target.value)} /></Field>
          <Field label="Câu trả lời mặc định"><textarea rows="4" value={values.fallbackResponse} onChange={(event) => update("fallbackResponse", event.target.value)} /></Field>
          <label className="modal-field full"><span>System prompt</span><textarea rows="5" value={values.systemPrompt} onChange={(event) => update("systemPrompt", event.target.value)} /></label>
        </> : <>
          <label className="option-toggle modal-field"><input type="checkbox" checked={values.enabled} onChange={(event) => update("enabled", event.target.checked)} /><span className="toggle-ui" /><span><strong>Bật AR</strong><small>Cho phép mở AR từ trang sản phẩm.</small></span></label>
          <label className="option-toggle modal-field"><input type="checkbox" checked={values.showProductButton !== false} onChange={(event) => update("showProductButton", event.target.checked)} /><span className="toggle-ui" /><span><strong>Hiển thị nút “Thử trong phòng”</strong><small>Ẩn hoặc hiện nút AR trên trang chi tiết sản phẩm.</small></span></label>
          <label className="option-toggle modal-field"><input type="checkbox" checked={values.aiModeEnabled} onChange={(event) => update("aiModeEnabled", event.target.checked)} /><span className="toggle-ui" /><span><strong>Ảnh AI</strong><small>Cho phép Gemini tạo ảnh xem thử.</small></span></label>
          <label className="option-toggle modal-field"><input type="checkbox" checked={values.webxrEnabled} onChange={(event) => update("webxrEnabled", event.target.checked)} /><span className="toggle-ui" /><span><strong>WebXR</strong><small>Cho phép trải nghiệm AR thời gian thực.</small></span></label>
          <Field label="Số ngày lưu ảnh"><input type="number" min="1" value={values.retentionDays} onChange={(event) => update("retentionDays", Number(event.target.value))} /></Field>
          <Field label="Ngân sách tháng (VNĐ)"><input type="number" min="0" value={values.monthlyBudget} onChange={(event) => update("monthlyBudget", Number(event.target.value))} /></Field>
          <Field label="Tiêu đề hướng dẫn"><input value={values.guideTitle || ""} onChange={(event) => update("guideTitle", event.target.value)} /></Field>
          <label className="modal-field full"><span>Nội dung hướng dẫn AR <small>Mỗi dòng sẽ hiển thị thành một ý hướng dẫn.</small></span><textarea rows="7" value={values.usageGuideText || ""} onChange={(event) => update("usageGuideText", event.target.value)} /></label>
          <label className="modal-field full"><span>Prompt tạo ảnh mặc định</span><textarea rows="5" value={values.defaultPrompt} onChange={(event) => update("defaultPrompt", event.target.value)} /></label>
        </>}
      </div>
      <div className="section-save"><button className="primary-button" onClick={save} disabled={saving}>{saving ? "Đang lưu…" : "Lưu cấu hình"}</button></div>
    </section>
    <section className="panel"><div className="panel-header"><div><h2>Usage theo model</h2><p>Token thực tế do Gemini trả về trong 30 ngày.</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>TÍNH NĂNG</th><th>MODEL</th><th>REQUEST</th><th>INPUT TOKEN</th><th>OUTPUT TOKEN</th><th>TỔNG TOKEN</th></tr></thead><tbody>{(usage?.rows || []).map((row) => <tr key={`${row._id.feature}-${row._id.model}`}><td>{row._id.feature}</td><td className="cell-primary">{row._id.model}</td><td>{row.requests}</td><td>{row.promptTokens}</td><td>{row.outputTokens}</td><td>{row.totalTokens}</td></tr>)}</tbody></table></div></section>
  </div>;
}

export function ChatbotManager() { return <AssistantSettingsManager section="chatbot" title="Nội dung chatbot" description="Quản lý lời chào, câu trả lời mặc định và nguyên tắc tư vấn." />; }
export function ARStudioManager() { return <AssistantSettingsManager section="ar" title="AR Studio" description="Quản lý chế độ AR, prompt, lưu trữ và ngân sách AI." />; }
function Modal({ title, close, submit, children }) {
  return (
    <div className="modal-backdrop">
      <form className="category-modal" onSubmit={submit}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={close}>
            ×
          </button>
        </div>
        <div className="category-form">{children}</div>
        <div className="modal-actions">
          <button className="primary-button">Lưu</button>
        </div>
      </form>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="modal-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

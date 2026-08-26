import { useEffect, useState } from 'react';
import { settingsApi } from '../services/api';

const DEFAULT_TITLE = 'An tâm hơn với dịch vụ vượt trội';
const DEFAULT_CARDS = [
  { icon: 'inventory_2', title: 'Kiểm hàng khi nhận', subtitle: '', text: 'Bạn có thể kiểm tra sản phẩm trước khi thanh toán.' },
  { icon: 'local_shipping', title: 'Miễn phí vận chuyển', subtitle: '(từ 500.000VNĐ)', text: 'Chỉ cần chọn sản phẩm bạn yêu thích, việc giao hàng tận nơi để SILKMOON lo.' },
  { icon: 'currency_exchange', title: 'Thanh toán linh hoạt', subtitle: '', text: 'Hỗ trợ đa dạng phương thức thanh toán để việc chăm sóc giấc ngủ trở nên thật đơn giản.' },
];

export default function Services() {
  const [sectionTitle, setSectionTitle] = useState(DEFAULT_TITLE);
  const [cards, setCards] = useState(DEFAULT_CARDS);

  useEffect(() => {
    settingsApi.get('website_content').then((data) => {
      const services = data?.value?.services;
      if (services?.cards?.length) setCards(services.cards);
      if (services?.title) setSectionTitle(services.title);
    }).catch(() => {});
  }, []);

  return (
    <section className="w-full bg-white px-margin-mobile py-8 md:px-margin-desktop md:py-10">
      <div className="max-w-container-max mx-auto">
        <h2 className="mb-6 text-center font-display-md text-display-md-mobile font-bold text-slate-deep md:text-left md:text-display-md">
          {sectionTitle}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <div key={index} className="bg-[#F4F9FF] p-6 rounded-xl flex flex-col items-start transition-all duration-300 hover:-translate-y-2 hover:shadow-lg cursor-pointer group">
              <span className="material-symbols-outlined text-[48px] text-slate-deep mb-6" style={{ fontVariationSettings: "'wght' 200" }}>
                {card.icon}
              </span>
              <h3 className="type-card-title font-bold text-slate-deep text-[18px] mb-1">{card.title}</h3>
              {card.subtitle ? <p className="text-sm text-slate-deep/70 mb-3">{card.subtitle}</p> : <div className="mb-3" />}
              <p className="type-card-body font-body-md text-slate-deep/80 leading-relaxed">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

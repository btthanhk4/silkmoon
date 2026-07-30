import { useEffect, useState } from 'react';
import { reviewsApi } from '../services/api';

const feedbackColors = ['bg-sage-haze', 'bg-slate-deep', 'bg-[#8C9EA1]'];

export default function CustomerFeedback() {
  // Homepage reviews must come from the database so admin edits are reflected.
  const [feedbacks, setFeedbacks] = useState(null);

  useEffect(() => {
    reviewsApi.getFeatured(6).then((items) => {
      setFeedbacks((Array.isArray(items) ? items : []).map((review, index) => ({
        text: review.comment,
        author: review.authorName,
        location: 'Khách hàng Silkmoon',
        initial: review.authorName?.trim()?.charAt(0)?.toUpperCase() || 'S',
        color: feedbackColors[index % feedbackColors.length],
        rating: review.rating,
        images: review.images || [],
      })));
    }).catch(() => setFeedbacks([]));
  }, []);

  if (!feedbacks?.length) return null;

  // Nhân bản mảng để tạo hiệu ứng cuộn vô tận mượt mà
  const allFeedbacks = [...feedbacks, ...feedbacks, ...feedbacks, ...feedbacks];

  return (
    <section className="w-full overflow-hidden bg-bone py-8 md:py-10">
      <div className="mx-auto mb-8 max-w-container-max px-margin-mobile md:px-margin-desktop">
        <h2 className="text-[32px] md:text-[44px] text-slate-deep text-center uppercase tracking-widest font-extrabold leading-tight">
          Khách Hàng Nói Gì Về <br className="md:hidden" /><span className="text-sage-haze font-black text-[36px] md:text-[52px]">SILKMOON</span>
        </h2>
      </div>
      
      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden flex">
        {/* Gradient overlays for smooth fading edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-bone to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-bone to-transparent z-10"></div>

        {/* Scrolling Track */}
        <div className="flex animate-marquee hover:[animation-play-state:paused] gap-8 py-4 px-4 w-max">
          {allFeedbacks.map((item, idx) => (
            <div 
              key={idx} 
              className="w-[320px] md:w-[400px] shrink-0 bg-linen-white p-8 rounded-xl shadow-sm border border-slate-deep/5 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer whitespace-normal"
            >
              <div className="flex text-[#F59E0B] mb-6">
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: star <= (item.rating || 5) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                ))}
              </div>
              {!!item.images?.length && <div className="mb-5 flex gap-2 overflow-hidden">{item.images.slice(0, 3).map((image, imageIndex) => <img src={image} alt={`Ảnh đánh giá ${imageIndex + 1}`} className="h-20 min-w-0 flex-1 rounded-md object-cover" key={`${image}-${imageIndex}`} />)}</div>}
              <p className="font-body-md text-slate-deep/80 mb-8 italic flex-1">
                "{item.text}"
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <div className={`w-12 h-12 text-white rounded-full flex items-center justify-center font-bold text-lg ${item.color}`}>
                  {item.initial}
                </div>
                <div>
                  <h4 className="font-bold text-slate-deep">{item.author}</h4>
                  <p className="text-sm text-slate-deep/60">{item.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

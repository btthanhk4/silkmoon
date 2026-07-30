import { useEffect, useRef, useState } from 'react';
import { settingsApi } from '../services/api';

export default function VideoExperience() {
  const [videos, setVideos] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    settingsApi
      .get('website_content')
      .then((setting) => {
        const items = Array.isArray(setting?.value?.blogVideos)
          ? setting.value.blogVideos
          : [];
        setVideos(items.filter((video) => video.isActive !== false));
      })
      .catch(() => setVideos([]));
  }, []);

  const scroll = (direction) => {
    scrollRef.current?.scrollBy({
      left: direction * Math.min(scrollRef.current.clientWidth * 0.8, 760),
      behavior: 'smooth',
    });
  };

  if (videos.length === 0) return null;

  return (
    <section className="w-full bg-white px-margin-mobile py-8 md:px-margin-desktop md:py-10">
      <div className="mx-auto max-w-container-max">
        <div className="mb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-deep/20 text-slate-deep transition-colors hover:bg-bone md:flex"
            aria-label="Xem video phía trước"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-deep/20 text-slate-deep transition-colors hover:bg-bone md:flex"
            aria-label="Xem video tiếp theo"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
          <div className="flex h-[330px] w-[78vw] max-w-[280px] flex-none snap-start items-center justify-center rounded-2xl bg-[#A7E4CD] p-8 text-center sm:w-[280px]">
            <h2 className="text-3xl font-bold leading-tight text-slate-deep">
              Cùng Trải nghiệm Silkmoon
            </h2>
          </div>

          {videos.map((video, index) => (
            <a
              href={video.videoUrl || undefined}
              target={video.videoUrl ? '_blank' : undefined}
              rel={video.videoUrl ? 'noopener noreferrer' : undefined}
              key={video.id || `${video.title}-${index}`}
              className="group relative h-[330px] w-[78vw] max-w-[300px] flex-none snap-start overflow-hidden rounded-2xl bg-bone sm:w-[300px]"
              aria-label={video.title || `Video ${index + 1}`}
            >
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt={video.title || 'Video Silkmoon'}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/55 via-black/5 to-transparent">
                <span className="material-symbols-outlined text-6xl text-white drop-shadow-md">
                  play_circle
                </span>
                {video.title && (
                  <span className="absolute bottom-5 left-5 right-5 font-bold text-white drop-shadow">
                    {video.title}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

import PropTypes from 'prop-types';
import { FABRICS } from './arUtils';

const tipIcons = ['add_photo_alternate', 'palette', 'auto_awesome', 'share'];

export default function ARSidebar({
  fabrics = FABRICS,
  activeFabricId,
  setActiveFabricId,
  opacity,
  setOpacity,
  hasImage,
  onNewImage,
  mode,
  guideTitle = '',
  usageTips = [],
}) {
  const activeFabric = fabrics.find(f => f.id === activeFabricId) || fabrics[0] || FABRICS[0];
  const isAIMode = mode === 'ai';

  return (
    <div className="w-full md:w-72 flex-shrink-0 flex flex-col bg-linen-white border-l border-slate-deep/10 overflow-y-auto max-h-[50vh] md:max-h-full">

      {/* ── Active fabric ── */}
      <div className="px-6 pt-6 pb-5 border-b border-slate-deep/10">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
          Màu lụa đang xem thử
        </span>
        <div className="flex items-center gap-3 mt-3">
          <div
            className="w-10 h-10 rounded-full ring-2 ring-offset-2 ring-slate-deep flex-shrink-0"
            style={{ backgroundColor: activeFabric.hex }}
          />
          <p className="font-semibold text-slate-deep text-sm">Màu {activeFabric.label}</p>
        </div>
      </div>

      {/* ── Color swatches ── */}
      <div className="px-6 py-5 border-b border-slate-deep/10">
        <span className="font-label-caps text-label-caps text-slate-deep uppercase tracking-widest">
          Thay đổi màu
        </span>
        <div className="grid grid-cols-6 gap-2.5 mt-4">
          {fabrics.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFabricId(f.id)}
              title={`Màu ${f.label}`}
              className={`w-full aspect-square rounded-full ring-2 ring-offset-2 transition-all duration-150 ${
                activeFabricId === f.id
                  ? 'ring-slate-deep scale-110'
                  : 'ring-transparent hover:ring-slate-deep/30'
              }`}
              style={{
                backgroundColor: f.hex,
                border: f.id === 'white' ? '1px solid rgba(28,44,88,0.15)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Opacity slider (canvas mode only) ── */}
      {!isAIMode && (
        <div className="px-6 py-5 border-b border-slate-deep/10">
          <div className="flex items-center justify-between mb-4">
            <span className="font-label-caps text-label-caps text-slate-deep uppercase tracking-widest">
              Độ trong suốt
            </span>
            <span className="font-mono text-xs text-on-surface-variant">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range" min="0.3" max="1" step="0.01" value={opacity}
            onChange={e => setOpacity(parseFloat(e.target.value))}
            className="w-full appearance-none cursor-pointer accent-slate-deep"
            style={{
              height: '1px',
              background: `linear-gradient(to right, #1C2C58 ${(opacity - 0.3) / 0.7 * 100}%, rgba(28,44,88,0.2) ${(opacity - 0.3) / 0.7 * 100}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-on-surface-variant/50 mt-1.5 font-label-caps uppercase tracking-wider">
            <span>Mờ</span><span>Rõ</span>
          </div>
        </div>
      )}

      {/* ── Tips ── */}
      {(guideTitle || usageTips.length > 0) && <div className="px-6 py-5 flex-1">
        <div className="bg-bone/60 border-l-2 border-slate-deep/30 px-4 py-3 space-y-2">
          <p className="font-label-caps text-label-caps text-slate-deep uppercase tracking-widest">{guideTitle}</p>
          <ul className="space-y-1.5">
            {usageTips.map((text, index) => (
              <li key={text} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-slate-deep/60 mt-0.5 flex-shrink-0">{tipIcons[index] || 'info'}</span>
                <span className="text-[11px] text-on-surface-variant leading-tight">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>}

      {/* ── Action buttons ── */}
      <div className="px-6 pb-6 pt-4 border-t border-slate-deep/10 space-y-2.5 flex-shrink-0">

        <button
          onClick={onNewImage}
          className="w-full py-3 px-4 bg-slate-deep text-linen-white font-button text-button uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 rounded"
        >
          <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
          {hasImage ? 'Tải ảnh phòng khác' : 'Tải ảnh phòng lên'}
        </button>
      </div>
    </div>
  );
}

ARSidebar.propTypes = {
  fabrics: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    hex: PropTypes.string.isRequired,
  })),
  activeFabricId:    PropTypes.string.isRequired,
  setActiveFabricId: PropTypes.func.isRequired,
  opacity:           PropTypes.number.isRequired,
  setOpacity:        PropTypes.func.isRequired,
  hasImage:          PropTypes.bool.isRequired,
  onNewImage:        PropTypes.func.isRequired,
  mode:              PropTypes.string,
  guideTitle:        PropTypes.string,
  usageTips:         PropTypes.arrayOf(PropTypes.string),
};

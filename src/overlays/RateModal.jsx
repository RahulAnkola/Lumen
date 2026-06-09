import { useState, useEffect } from "react";
import { Poster } from "../components/Poster";
import { RatingSlider } from "../components/RatingSlider";
import { Icon } from "../components/Icon";
import { metaLine } from "../components/MovieCard";

export function RateModal({ item, currentRating, inWatchlist, onSave, onClose, onToggleWatch }) {
  const [val, setVal] = useState(currentRating == null ? 72 : currentRating);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setVal(currentRating == null ? 72 : currentRating);
  }, [item, currentRating]);

  const close = () => { setClosing(true); setTimeout(onClose, 240); };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!item) return null;
  return (
    <div className={`lm-modal-scrim ${closing ? "is-closing" : ""}`} onMouseDown={close}>
      <div className="lm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="lm-modal-x" onClick={close} aria-label="Close"><Icon name="close" size={20} /></button>
        <div className="lm-modal-poster"><Poster item={item} /></div>
        <div className="lm-modal-body">
          <span className="lm-modal-kicker">{currentRating != null ? "Update your rating" : "Rate this title"}</span>
          <h2 className="lm-modal-title">{item.title}</h2>
          <p className="lm-modal-meta">{metaLine(item)}</p>
          <div className="lm-chips">
            {item.genres?.map((g) => <span key={g} className="lm-genre">{g}</span>)}
          </div>
          {item.overview && <p className="lm-modal-log">{item.overview}</p>}
          <div className="lm-modal-rate">
            <RatingSlider value={val} onChange={setVal} autoFocus />
          </div>
          <div className="lm-modal-actions">
            <button className="lm-btn lm-btn-primary lm-btn-lg" onClick={() => onSave(item, val)}>
              <Icon name="check" size={18} /> {currentRating != null ? "Save rating" : "Save & see similar"}
            </button>
            <button
              className={`lm-btn lm-btn-ghost lm-btn-lg ${inWatchlist ? "is-on" : ""}`}
              onClick={() => onToggleWatch(item)}
            >
              <Icon name={inWatchlist ? "check" : "bookmark"} size={18} />
              {inWatchlist ? "Saved" : "Watchlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

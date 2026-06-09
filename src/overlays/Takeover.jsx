import { useState, useEffect, useRef } from "react";
import { Poster } from "../components/Poster";
import { RatingChip } from "../components/RatingChip";
import { Icon } from "../components/Icon";
import { ratingTier } from "../components/RatingSlider";
import { metaLine } from "../components/MovieCard";
import { fetchSimilar } from "../tmdb";

function useCountUp(target, ms = 900, run = true) {
  const [n, setN] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) { setN(target); return; }
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

export function Takeover({ data, ratings, watchlist, onRateSimilar, onToggleWatch, onClose }) {
  const { item, rating } = data;
  const tier = ratingTier(rating);
  const count = useCountUp(rating, 1000, true);
  const [similar, setSimilar] = useState([]);
  const [closing, setClosing] = useState(false);
  const hue = item?.tmdbId ? (item.tmdbId * 37) % 360 : 220;

  useEffect(() => {
    fetchSimilar(item.tmdbId, item.mediaType, 5).then(setSimilar);
  }, [item.tmdbId, item.mediaType]);

  const close = () => { setClosing(true); setTimeout(onClose, 420); };
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className={`lm-take ${closing ? "is-closing" : ""}`}>
      <div className="lm-take-wash"
        style={{ background: `radial-gradient(80% 70% at 50% 0%, oklch(0.32 0.09 ${hue}) 0%, transparent 70%)` }}
      />
      <button className="lm-take-x" onClick={close} aria-label="Close"><Icon name="close" size={22} /></button>

      <div className="lm-take-top">
        <div className="lm-take-hero">
          <div className="lm-take-poster"><Poster item={item} /></div>
          <div className="lm-take-score">
            <span className="lm-take-kicker">You rated</span>
            <h2 className="lm-take-title">{item.title}</h2>
            <div className="lm-take-num"><b>{count}</b><span>/100</span></div>
            <span className={`lm-rate-tier lm-take-tier t-${tier.k}`}>{tier.label}</span>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <div className="lm-take-rec">
          <div className="lm-take-rec-head">
            <span className="lm-take-because">
              <Icon name="spark" size={16} /> Because you {rating >= 70 ? "loved" : "rated"} {item.title}
            </span>
            <h3>You might also want to watch</h3>
          </div>
          <div className="lm-take-list">
            {similar.map((m, i) => {
              const key = `${m.mediaType}_${m.tmdbId}`;
              const r = ratings[key]?.value;
              const on = !!watchlist[key];
              return (
                <article className="lm-take-card" key={key} style={{ "--d": 0.35 + i * 0.09 + "s" }}>
                  <Poster item={m}>
                    {r != null && <span className="lm-card-rating"><RatingChip value={r} /></span>}
                  </Poster>
                  <div className="lm-take-card-body">
                    <h4>{m.title}</h4>
                    <p>{metaLine(m)}</p>
                    <div className="lm-take-card-actions">
                      <button className="lm-btn lm-btn-primary lm-btn-sm" onClick={() => onRateSimilar(m)}>
                        <Icon name="star" size={14} /> {r != null ? "Re-rate" : "Rate"}
                      </button>
                      <button
                        className={`lm-iconbtn lm-iconbtn-lg ${on ? "is-on" : ""}`}
                        aria-label="Watchlist"
                        onClick={() => onToggleWatch(m)}
                      >
                        <Icon name={on ? "check" : "plus"} size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <button className="lm-take-done" onClick={close}>Done <Icon name="arrow" size={18} /></button>
        </div>
      )}
    </div>
  );
}

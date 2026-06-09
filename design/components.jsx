/* Lumen — shared UI components. Exports to window at the bottom. */
const { useState, useEffect, useRef, useCallback } = React;

/* ── Rating tiers (0–100, integers) ─────────────────────────── */
function ratingTier(r) {
  if (r == null) return null;
  if (r >= 95) return { label: "Essential", k: "essential" };
  if (r >= 85) return { label: "Loved it", k: "loved" };
  if (r >= 70) return { label: "Great", k: "great" };
  if (r >= 55) return { label: "Good", k: "good" };
  if (r >= 40) return { label: "Fine", k: "fine" };
  if (r >= 20) return { label: "Meh", k: "meh" };
  return { label: "Skip", k: "skip" };
}

/* ── Icons (simple UI glyphs) ───────────────────────────────── */
const Icon = ({ name, size = 20, stroke = 1.6 }) => {
  const p = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
    film: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 8h18M3 16h18M8 3v18M16 3v18" /></>,
    spark: <path d="M12 3l1.8 5.6L19.5 10l-5.7 1.8L12 17l-1.8-5.2L4.5 10l5.7-1.4L12 3z" />,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3z" />,
    library: <><path d="M4 5v15M9 5v15" /><rect x="13" y="4" width="7" height="17" rx="1" transform="rotate(8 16 12)" /></>,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    sliders: <><path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2.2" /><circle cx="8" cy="16" r="2.2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M5 12.5 10 17l9-10" />,
    chevR: <path d="m9 5 7 7-7 7" />,
    chevD: <path d="m5 9 7 7 7-7" />,
    play: <path d="M7 5l12 7-12 7V5z" />,
    star: <path d="M12 3l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 17.8 6.2 21.3l1.6-6.6L2.6 9.8l6.8-.5L12 3z" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
  }[name];
  const fill = name === "spark" || name === "play" ? "currentColor" : "none";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flex: "none" }}>
      {p}
    </svg>
  );
};

/* ── Logo (animated lens / aperture mark + serif wordmark) ──── */
const Logo = ({ size = 30, onClick, showWord = true }) => (
  <button className="lm-logo" onClick={onClick} aria-label="Lumen home">
    <span className="lm-logo-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="18" className="lm-ring lm-ring-1" />
        <circle cx="20" cy="20" r="12.5" className="lm-ring lm-ring-2" />
        <circle cx="20" cy="20" r="5" className="lm-pupil" />
      </svg>
    </span>
    {showWord && <span className="lm-logo-word">Lumen</span>}
  </button>
);

/* ── Poster placeholder ─────────────────────────────────────────
   Honest placeholder (no real art): a per-title tonal field + faint
   aperture mark + monospace caption. Title lives in card chrome, not here. */
function posterTone(hue) {
  return {
    bg: `radial-gradient(120% 120% at 30% 18%, oklch(0.26 0.05 ${hue}) 0%, oklch(0.155 0.03 ${hue}) 55%, oklch(0.11 0.02 ${hue}) 100%)`,
    edge: `oklch(0.45 0.08 ${hue})`,
  };
}
const Poster = ({ movie, className = "", children }) => {
  const t = posterTone(movie.tone);
  return (
    <div className={`lm-poster ${className}`} style={{ background: t.bg }}>
      <div className="lm-poster-grain" />
      <svg className="lm-poster-mark" viewBox="0 0 40 40" style={{ color: t.edge }}>
        <circle cx="20" cy="20" r="15" />
        <circle cx="20" cy="20" r="9" />
        <circle cx="20" cy="20" r="3" fill="currentColor" stroke="none" />
      </svg>
      <span className="lm-poster-tag">poster · wire art</span>
      {children}
    </div>
  );
};

/* ── Rating slider (interactive, integers, qualitative tiers) ─ */
const RatingSlider = ({ value, onChange, autoFocus }) => {
  const v = value == null ? 50 : value;
  const tier = ratingTier(v);
  const ref = useRef(null);
  return (
    <div className="lm-rate">
      <div className="lm-rate-head">
        <span className="lm-rate-num" key={v}>{v}</span>
        <span className="lm-rate-denom">/ 100</span>
        <span className={`lm-rate-tier t-${tier.k}`}>{tier.label}</span>
      </div>
      <div className="lm-rate-track-wrap">
        <input
          ref={ref}
          className="lm-rate-input"
          type="range"
          min="0" max="100" step="1"
          value={v}
          autoFocus={autoFocus}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          style={{ "--pct": v + "%" }}
        />
      </div>
      <div className="lm-rate-scale">
        <span>Skip</span><span>Fine</span><span>Great</span><span>Essential</span>
      </div>
    </div>
  );
};

/* small static rating chip */
const RatingChip = ({ value, size = "md" }) => {
  if (value == null) return null;
  const tier = ratingTier(value);
  return (
    <span className={`lm-chip lm-chip-${size} t-${tier.k}`}>
      <b>{value}</b>
    </span>
  );
};

/* meta line: year · type · runtime/seasons */
function metaLine(m) {
  const dur = m.type === "Series" ? `${m.seasons} season${m.seasons > 1 ? "s" : ""}` : `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m`;
  return `${m.year} · ${m.type} · ${dur}`;
}

/* ── Movie card (grid) ──────────────────────────────────────── */
const MovieCard = ({ movie, rating, inWatchlist, onOpen, onToggleWatch, index = 0 }) => (
  <article className="lm-card lm-reveal" style={{ "--d": index * 0.035 + "s" }} onClick={() => onOpen(movie)}>
    <Poster movie={movie}>
      {rating != null && <span className="lm-card-rating"><RatingChip value={rating} /></span>}
      <div className="lm-card-hover">
        <button className="lm-card-cta"><Icon name="star" size={16} /> {rating != null ? "Update" : "Rate"}</button>
        <button
          className={`lm-iconbtn ${inWatchlist ? "is-on" : ""}`}
          aria-label="Watchlist"
          onClick={(e) => { e.stopPropagation(); onToggleWatch(movie.id); }}
        >
          <Icon name={inWatchlist ? "check" : "bookmark"} size={16} />
        </button>
      </div>
    </Poster>
    <div className="lm-card-body">
      <h3 className="lm-card-title">{movie.title}</h3>
      <p className="lm-card-meta">{metaLine(movie)}</p>
    </div>
  </article>
);

Object.assign(window, {
  ratingTier, Icon, Logo, Poster, posterTone, RatingSlider, RatingChip, MovieCard, metaLine,
});

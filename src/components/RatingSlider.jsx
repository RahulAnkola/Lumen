import { useRef } from "react";

export function ratingTier(r) {
  if (r == null) return null;
  if (r >= 95) return { label: "Essential", k: "essential" };
  if (r >= 85) return { label: "Loved it", k: "loved" };
  if (r >= 70) return { label: "Great", k: "great" };
  if (r >= 55) return { label: "Good", k: "good" };
  if (r >= 40) return { label: "Fine", k: "fine" };
  if (r >= 20) return { label: "Meh", k: "meh" };
  return { label: "Skip", k: "skip" };
}

export function RatingSlider({ value, onChange, autoFocus }) {
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
}

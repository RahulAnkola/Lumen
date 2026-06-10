import { useRef } from "react";

export function ratingTier(r) {
  if (r == null) return null;
  if (r >= 10) return { label: "Essential", k: "essential" };
  if (r >= 9)  return { label: "Loved it",  k: "loved" };
  if (r >= 8)  return { label: "Great",     k: "great" };
  if (r >= 6)  return { label: "Good",      k: "good" };
  if (r >= 5)  return { label: "Fine",      k: "fine" };
  if (r >= 3)  return { label: "Meh",       k: "meh" };
  return { label: "Skip", k: "skip" };
}

export function RatingSlider({ value, onChange, autoFocus }) {
  const v = value == null ? 7 : value;
  const tier = ratingTier(v);
  const ref = useRef(null);
  return (
    <div className="lm-rate">
      <div className="lm-rate-head">
        <span className="lm-rate-num" key={v}>{v}</span>
        <span className="lm-rate-denom">/ 10</span>
        <span className={`lm-rate-tier t-${tier.k}`}>{tier.label}</span>
      </div>
      <div className="lm-rate-track-wrap">
        <input
          ref={ref}
          className="lm-rate-input"
          type="range"
          min="1" max="10" step="1"
          value={v}
          autoFocus={autoFocus}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          style={{ "--pct": ((v - 1) / 9 * 100) + "%" }}
        />
      </div>
      <div className="lm-rate-scale">
        <span>1</span><span>3</span><span>5</span><span>7</span><span>10</span>
      </div>
    </div>
  );
}

import { ratingTier } from "./RatingSlider";

export function RatingChip({ value, size = "md" }) {
  if (value == null) return null;
  const tier = ratingTier(value);
  return (
    <span className={`lm-chip lm-chip-${size} t-${tier.k}`}>
      <b>{value}</b>
    </span>
  );
}

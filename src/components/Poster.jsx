import { posterUrl } from "../tmdb";

function posterTone(hue = 220) {
  return {
    bg: `radial-gradient(120% 120% at 30% 18%, oklch(0.26 0.05 ${hue}) 0%, oklch(0.155 0.03 ${hue}) 55%, oklch(0.11 0.02 ${hue}) 100%)`,
    edge: `oklch(0.45 0.08 ${hue})`,
  };
}

export function Poster({ item, className = "", children }) {
  const imgSrc = item?.posterPath ? posterUrl(item.posterPath) : null;
  const hue = item?.tmdbId ? (item.tmdbId * 37) % 360 : 220;
  const t = posterTone(hue);

  return (
    <div className={`lm-poster ${className}`} style={!imgSrc ? { background: t.bg } : {}}>
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={item?.title}
          loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <>
          <div className="lm-poster-grain" />
          <svg className="lm-poster-mark" viewBox="0 0 40 40" style={{ color: t.edge }}>
            <circle cx="20" cy="20" r="15" />
            <circle cx="20" cy="20" r="9" />
            <circle cx="20" cy="20" r="3" fill="currentColor" stroke="none" />
          </svg>
        </>
      )}
      {children}
    </div>
  );
}

import { Poster } from "./Poster";
import { RatingChip } from "./RatingChip";
import { Icon } from "./Icon";

export function metaLine(item) {
  const dur = item.mediaType === "tv"
    ? `${item.seasons} season${item.seasons !== 1 ? "s" : ""}`
    : item.runtime
    ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m`
    : "";
  const type = item.mediaType === "tv" ? "Series" : "Movie";
  return [item.year, type, dur].filter(Boolean).join(" · ");
}

export function MovieCard({ item, rating, inWatchlist, onOpen, onToggleWatch, index = 0 }) {
  return (
    <article className="lm-card lm-reveal" style={{ "--d": index * 0.035 + "s" }} onClick={() => onOpen(item)}>
      <Poster item={item}>
        {rating != null && <span className="lm-card-rating"><RatingChip value={rating} /></span>}
        <div className="lm-card-hover">
          <button className="lm-card-cta"><Icon name="star" size={16} /> {rating != null ? "Update" : "Rate"}</button>
          <button
            className={`lm-iconbtn ${inWatchlist ? "is-on" : ""}`}
            aria-label="Watchlist"
            onClick={(e) => { e.stopPropagation(); onToggleWatch(item); }}
          >
            <Icon name={inWatchlist ? "check" : "bookmark"} size={16} />
          </button>
        </div>
      </Poster>
      <div className="lm-card-body">
        <h3 className="lm-card-title">{item.title}</h3>
        <p className="lm-card-meta">{metaLine(item)}</p>
      </div>
    </article>
  );
}

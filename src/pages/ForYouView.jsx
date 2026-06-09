import { useState, useEffect, useMemo } from "react";
import { Icon } from "../components/Icon";
import { Poster } from "../components/Poster";
import { MovieCard, metaLine } from "../components/MovieCard";
import { EmptyState } from "../components/EmptyState";
import { fetchRecommendationsForIds } from "../tmdb";

export function ForYouView({ ratings, watchlist, onOpen, onToggleWatch, onGo }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  const ratedItems = useMemo(() => Object.entries(ratings).map(([key, data]) => ({ key, ...data })), [ratings]);
  const excludeIds = useMemo(() => {
    const s = new Set(Object.keys(ratings));
    Object.keys(watchlist).forEach((k) => s.add(k));
    return s;
  }, [ratings, watchlist]);

  useEffect(() => {
    if (ratedItems.length === 0) { setLoading(false); setRecs([]); return; }
    setLoading(true);
    fetchRecommendationsForIds(ratedItems, excludeIds, 18)
      .then(setRecs)
      .finally(() => setLoading(false));
  }, [JSON.stringify(Object.keys(ratings).sort())]);

  if (ratedItems.length === 0) {
    return (
      <div className="lm-page">
        <header className="lm-page-head"><div><h1 className="lm-page-title">For You</h1></div></header>
        <EmptyState icon="spark" title="Rate one thing to begin"
          body="The more you rate, the sharper your suggestions become. Start on the home page."
          action={<button className="lm-btn lm-btn-primary" onClick={() => onGo("home")}>Find something to rate</button>}
        />
      </div>
    );
  }

  const topPick = recs[0];
  const rest = recs.slice(1);

  return (
    <div className="lm-page">
      <header className="lm-page-head">
        <div>
          <h1 className="lm-page-title">For You</h1>
          <p className="lm-page-sub">
            Tuned to your {ratedItems.length} rating{ratedItems.length !== 1 ? "s" : ""} · refines as you rate
          </p>
        </div>
      </header>

      {loading && (
        <div style={{ color: "var(--text-3)", fontSize: 14, padding: "40px 0" }}>Finding picks for you…</div>
      )}

      {!loading && topPick && (
        <section className="lm-spotlight lm-reveal">
          <Poster item={topPick.item} className="lm-spotlight-poster" />
          <div className="lm-spotlight-body">
            <span className="lm-spotlight-kicker"><Icon name="spark" size={15} /> Top pick for you</span>
            <h2 className="lm-spotlight-title">{topPick.item.title}</h2>
            <p className="lm-spotlight-meta">{metaLine(topPick.item)}</p>
            {topPick.item.overview && <p className="lm-spotlight-log">{topPick.item.overview}</p>}
            {topPick.because && (
              <p className="lm-because">Because you rated <b>{topPick.because.title}</b></p>
            )}
            <div className="lm-spotlight-actions">
              <button className="lm-btn lm-btn-primary" onClick={() => onOpen(topPick.item)}>
                <Icon name="star" size={17} /> Rate it
              </button>
              <button
                className={`lm-btn lm-btn-ghost ${watchlist[`${topPick.item.mediaType}_${topPick.item.tmdbId}`] ? "is-on" : ""}`}
                onClick={() => onToggleWatch(topPick.item)}
              >
                <Icon name={watchlist[`${topPick.item.mediaType}_${topPick.item.tmdbId}`] ? "check" : "plus"} size={17} />
                {watchlist[`${topPick.item.mediaType}_${topPick.item.tmdbId}`] ? "On watchlist" : "Watchlist"}
              </button>
            </div>
          </div>
        </section>
      )}

      {!loading && rest.length > 0 && (
        <>
          <div className="lm-strip-head" style={{ marginTop: 8 }}><h2>More you might love</h2></div>
          <div className="lm-grid">
            {rest.map((rec, i) => {
              const key = `${rec.item.mediaType}_${rec.item.tmdbId}`;
              return (
                <div className="lm-rec" key={key}>
                  <MovieCard
                    item={rec.item}
                    rating={ratings[key]?.value}
                    inWatchlist={!!watchlist[key]}
                    onOpen={onOpen}
                    onToggleWatch={onToggleWatch}
                    index={i}
                  />
                  {rec.because && (
                    <p className="lm-because lm-because-sm">Because you rated <b>{rec.because.title}</b></p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && recs.length === 0 && ratedItems.length > 0 && (
        <EmptyState icon="spark" title="No suggestions yet"
          body="Rate a few more titles and we'll find picks you'll love."
        />
      )}
    </div>
  );
}

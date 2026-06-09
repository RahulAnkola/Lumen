import { useMemo } from "react";
import { Icon } from "../components/Icon";
import { MovieCard } from "../components/MovieCard";
import { EmptyState } from "../components/EmptyState";

export function WatchlistView({ ratings, watchlist, onOpen, onToggleWatch, onGo }) {
  const items = useMemo(() => {
    return Object.entries(watchlist)
      .sort((a, b) => (b[1].addedAt?.seconds || 0) - (a[1].addedAt?.seconds || 0))
      .map(([key, data]) => ({ key, ...data }));
  }, [watchlist]);

  return (
    <div className="lm-page">
      <header className="lm-page-head">
        <div>
          <h1 className="lm-page-title">Watchlist</h1>
          <p className="lm-page-sub">{items.length} saved to watch</p>
        </div>
      </header>
      {items.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Your watchlist is empty"
          body="Add titles from For You or anywhere you see the bookmark."
          action={<button className="lm-btn lm-btn-primary" onClick={() => onGo("foryou")}>Browse suggestions</button>}
        />
      ) : (
        <div className="lm-grid">
          {items.map((item, i) => (
            <MovieCard
              key={item.key}
              item={item}
              rating={ratings[item.key]?.value}
              inWatchlist={true}
              onOpen={onOpen}
              onToggleWatch={onToggleWatch}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

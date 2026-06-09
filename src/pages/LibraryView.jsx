import { useState, useMemo } from "react";
import { Icon } from "../components/Icon";
import { MovieCard } from "../components/MovieCard";
import { EmptyState } from "../components/EmptyState";

export function LibraryView({ ratings, watchlist, onOpen, onToggleWatch }) {
  const [type, setType] = useState("All");
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("recent");
  const [q, setQ] = useState("");

  const ratedItems = useMemo(() => Object.entries(ratings).map(([key, data]) => ({ key, ...data })), [ratings]);

  const genresInUse = useMemo(() => {
    const set = new Set();
    ratedItems.forEach((item) => (item.genres || []).forEach((g) => set.add(g)));
    return ["All", ...Array.from(set).sort()];
  }, [ratedItems]);

  const list = useMemo(() => {
    let l = ratedItems.filter((item) => {
      if (type !== "All" && item.mediaType !== type) return false;
      if (genre !== "All" && !(item.genres || []).includes(genre)) return false;
      if (q.trim() && !item.title?.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
    const cmp = {
      recent: (a, b) => (b.ratedAt?.seconds || 0) - (a.ratedAt?.seconds || 0),
      high: (a, b) => b.value - a.value,
      low: (a, b) => a.value - b.value,
      az: (a, b) => (a.title || "").localeCompare(b.title || ""),
      year: (a, b) => (b.year || 0) - (a.year || 0),
    }[sort];
    return [...l].sort(cmp);
  }, [ratedItems, type, genre, sort, q]);

  const avg = ratedItems.length
    ? Math.round(ratedItems.reduce((s, item) => s + item.value, 0) / ratedItems.length)
    : null;

  return (
    <div className="lm-page">
      <header className="lm-page-head">
        <div>
          <h1 className="lm-page-title">Library</h1>
          <p className="lm-page-sub">
            {ratedItems.length} title{ratedItems.length !== 1 ? "s" : ""} rated
            {avg != null && <> · avg <b>{avg}</b></>}
          </p>
        </div>
        <div className="lm-search-mini">
          <Icon name="search" size={18} />
          <input placeholder="Filter library…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      <div className="lm-filters">
        <div className="lm-seg">
          {["All", "movie", "tv"].map((t) => (
            <button key={t} className={type === t ? "is-on" : ""} onClick={() => setType(t)}>
              {t === "movie" ? "Movies" : t === "tv" ? "Series" : "All"}
            </button>
          ))}
        </div>
        <div className="lm-select">
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            {genresInUse.map((g) => <option key={g} value={g}>{g === "All" ? "All genres" : g}</option>)}
          </select>
          <Icon name="chevD" size={15} />
        </div>
        <div className="lm-select">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Recently rated</option>
            <option value="high">Highest rated</option>
            <option value="low">Lowest rated</option>
            <option value="az">Title A–Z</option>
            <option value="year">Newest first</option>
          </select>
          <Icon name="chevD" size={15} />
        </div>
        <span className="lm-filters-count">{list.length} shown</span>
      </div>

      {ratedItems.length === 0 ? (
        <EmptyState icon="library" title="Nothing rated yet"
          body="Search a film on the home page and slide to rate it — it'll live here."
        />
      ) : list.length === 0 ? (
        <EmptyState icon="search" title="No matches" body="Loosen your filters to see more." />
      ) : (
        <div className="lm-grid" key={type + genre + sort + q}>
          {list.map((item, i) => (
            <MovieCard
              key={item.key}
              item={item}
              rating={item.value}
              inWatchlist={!!watchlist[item.key]}
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

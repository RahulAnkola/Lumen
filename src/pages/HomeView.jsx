import { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "../components/Icon";
import { Poster } from "../components/Poster";
import { RatingChip } from "../components/RatingChip";
import { MovieCard, metaLine } from "../components/MovieCard";
import { searchMulti } from "../tmdb";
import { HomeBackdrop } from "../components/HomeBackdrop";

export function HomeView({ ratings, watchlist, onOpen, onToggleWatch, onGo }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    setActive(0);
    const s = q.trim();
    if (!s) { setResults([]); setSearching(false); return; }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchMulti(s, abortRef.current.signal);
        setResults(res);
      } catch (e) {
        if (e.name !== "AbortError") setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [q]);

  const recentlyRated = useMemo(() => {
    return Object.entries(ratings)
      .sort((a, b) => (b[1].ratedAt?.seconds || 0) - (a[1].ratedAt?.seconds || 0))
      .slice(0, 6)
      .map(([, data]) => data);
  }, [ratings]);

  const choose = (item) => { setQ(""); setFocused(false); onOpen(item); };

  const onKey = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[active]); }
    else if (e.key === "Escape") { setQ(""); }
  };

  const showDropdown = focused && q.trim();

  return (
    <div className="lm-home">
      <div className="lm-home-aura" />
      <HomeBackdrop />
      <div className="lm-hero">
        <div className="lm-hero-badge lm-reveal">A quiet place to keep the films you've loved</div>
        <h1 className="lm-hero-title lm-reveal" style={{ "--d": ".05s" }}>
          Every film, <em>remembered.</em>
        </h1>
        <div className={`lm-search ${focused ? "is-focused" : ""} ${results.length && focused ? "has-results" : ""}`}>
          <div className="lm-search-bar">
            <Icon name="search" size={22} />
            <input
              className="lm-search-input"
              placeholder="Search a movie or series to rate…"
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 140)}
              onKeyDown={onKey}
            />
            {q && (
              <button className="lm-search-clear" onClick={() => setQ("")} aria-label="Clear">
                <Icon name="close" size={18} />
              </button>
            )}
          </div>

          {showDropdown && results.length > 0 && (
            <ul className="lm-suggest" role="listbox">
              {results.map((item, i) => {
                const key = `${item.mediaType}_${item.tmdbId}`;
                const r = ratings[key]?.value;
                return (
                  <li
                    key={key}
                    className={`lm-suggest-row ${i === active ? "is-active" : ""}`}
                    style={{ "--d": i * 0.03 + "s" }}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                  >
                    <Poster item={item} className="lm-suggest-thumb" />
                    <div className="lm-suggest-info">
                      <span className="lm-suggest-title">{item.title}</span>
                      <span className="lm-suggest-meta">{metaLine(item)}</span>
                    </div>
                    <div className="lm-suggest-genres">
                      {item.genres.slice(0, 2).map((g) => <span key={g}>{g}</span>)}
                    </div>
                    {r != null
                      ? <RatingChip value={r} />
                      : <span className="lm-suggest-cta">Rate <Icon name="arrow" size={15} /></span>
                    }
                  </li>
                );
              })}
            </ul>
          )}

          {showDropdown && !searching && results.length === 0 && (
            <div className="lm-suggest lm-suggest-empty">
              No titles match &ldquo;{q}&rdquo;. Try a different spelling or language.
            </div>
          )}
        </div>
        <div className="lm-hero-hint lm-reveal" style={{ "--d": ".12s" }}>
          <kbd>↑</kbd><kbd>↓</kbd> to browse · <kbd>↵</kbd> to rate
        </div>
      </div>

      {recentlyRated.length > 0 ? (
        <section className="lm-strip">
          <div className="lm-strip-head">
            <h2>Recently rated</h2>
            <button className="lm-textlink" onClick={() => onGo("library")}>
              Your library <Icon name="chevR" size={15} />
            </button>
          </div>
          <div className="lm-row">
            {recentlyRated.map((data, i) => {
              const key = `${data.mediaType}_${data.tmdbId}`;
              return (
                <div className="lm-row-item" key={key}>
                  <MovieCard
                    item={data}
                    rating={ratings[key]?.value}
                    inWatchlist={!!watchlist[key]}
                    onOpen={onOpen}
                    onToggleWatch={onToggleWatch}
                    index={i}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="lm-strip">
          <div className="lm-strip-head"><h2>Start with something you've seen</h2></div>
          <p style={{ color: "var(--text-3)", fontSize: 14 }}>
            Search above and rate a movie or series to get started.
          </p>
        </section>
      )}
    </div>
  );
}

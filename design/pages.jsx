/* Lumen — page views. Depends on components.jsx globals. */
const { useMemo: _useMemo } = React;

/* ─────────────────────────────────────────────────────────────
   HOME — hero + as-you-type search
   ───────────────────────────────────────────────────────────── */
function HomeView({ ratings, watchlist, onOpen, onToggleWatch, onGo }) {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [focused, setFocused] = React.useState(false);
  const catalog = window.LUMEN.catalog;

  const results = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const scored = catalog
      .map((m) => {
        const t = m.title.toLowerCase();
        let score = -1;
        if (t.startsWith(s)) score = 100;
        else if (t.includes(s)) score = 70;
        else if (m.genres.some((g) => g.toLowerCase().includes(s))) score = 40;
        else if (m.by.toLowerCase().includes(s)) score = 30;
        return { m, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.m.year - a.m.year)
      .slice(0, 7);
    return scored.map((x) => x.m);
  }, [q]);

  React.useEffect(() => { setActive(0); }, [q]);

  const ratedRecent = React.useMemo(() => {
    return Object.keys(ratings).map((id) => window.LUMEN.byId(id)).filter(Boolean).slice(-6).reverse();
  }, [ratings]);

  const choose = (m) => { setQ(""); setFocused(false); onOpen(m); };

  const onKey = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[active]); }
    else if (e.key === "Escape") { setQ(""); }
  };

  return (
    <div className="lm-home">
      <div className="lm-home-aura" />
      <div className="lm-hero">
        <div className="lm-hero-badge lm-reveal">A quiet place to keep the films you've loved</div>
        <h1 className="lm-hero-title lm-reveal" style={{ "--d": ".05s" }}>
          Every film, <em>remembered.</em>
        </h1>
        <div className={`lm-search ${focused ? "is-focused" : ""} ${results.length ? "has-results" : ""}`}>
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
            {q && <button className="lm-search-clear" onClick={() => setQ("")} aria-label="Clear"><Icon name="close" size={18} /></button>}
          </div>
          {focused && results.length > 0 && (
            <ul className="lm-suggest" role="listbox">
              {results.map((m, i) => {
                const r = ratings[m.id];
                return (
                  <li
                    key={m.id}
                    className={`lm-suggest-row ${i === active ? "is-active" : ""}`}
                    style={{ "--d": i * 0.03 + "s" }}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => { e.preventDefault(); choose(m); }}
                  >
                    <Poster movie={m} className="lm-suggest-thumb" />
                    <div className="lm-suggest-info">
                      <span className="lm-suggest-title">{m.title}</span>
                      <span className="lm-suggest-meta">{metaLine(m)}</span>
                    </div>
                    <div className="lm-suggest-genres">{m.genres.slice(0, 2).map((g) => <span key={g}>{g}</span>)}</div>
                    {r != null ? <RatingChip value={r} /> : <span className="lm-suggest-cta">Rate <Icon name="arrow" size={15} /></span>}
                  </li>
                );
              })}
            </ul>
          )}
          {focused && q.trim() && results.length === 0 && (
            <div className="lm-suggest lm-suggest-empty">No titles match “{q}”. Try a genre like <em>Sci-Fi</em>.</div>
          )}
        </div>
        <div className="lm-hero-hint lm-reveal" style={{ "--d": ".12s" }}>
          <kbd>↑</kbd><kbd>↓</kbd> to browse · <kbd>↵</kbd> to rate
        </div>
      </div>

      {ratedRecent.length > 0 ? (
        <section className="lm-strip">
          <div className="lm-strip-head">
            <h2>Recently rated</h2>
            <button className="lm-textlink" onClick={() => onGo("library")}>Your library <Icon name="chevR" size={15} /></button>
          </div>
          <div className="lm-row">
            {ratedRecent.map((m, i) => (
              <div className="lm-row-item" key={m.id}>
                <MovieCard movie={m} rating={ratings[m.id]} inWatchlist={watchlist.includes(m.id)} onOpen={onOpen} onToggleWatch={onToggleWatch} index={i} />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="lm-strip">
          <div className="lm-strip-head"><h2>Start with something you've seen</h2></div>
          <div className="lm-row">
            {window.LUMEN.catalog.slice(0, 6).map((m, i) => (
              <div className="lm-row-item" key={m.id}>
                <MovieCard movie={m} rating={ratings[m.id]} inWatchlist={watchlist.includes(m.id)} onOpen={onOpen} onToggleWatch={onToggleWatch} index={i} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LIBRARY — saved (rated) titles, filters + sort
   ───────────────────────────────────────────────────────────── */
function LibraryView({ ratings, watchlist, onOpen, onToggleWatch }) {
  const [type, setType] = React.useState("All");
  const [genre, setGenre] = React.useState("All");
  const [sort, setSort] = React.useState("recent");
  const [q, setQ] = React.useState("");

  const rated = React.useMemo(
    () => Object.keys(ratings).map((id) => window.LUMEN.byId(id)).filter(Boolean),
    [ratings]
  );

  const genresInUse = React.useMemo(() => {
    const set = new Set();
    rated.forEach((m) => m.genres.forEach((g) => set.add(g)));
    return ["All", ...Array.from(set).sort()];
  }, [rated]);

  const order = Object.keys(ratings); // insertion order ~ recency proxy
  const list = React.useMemo(() => {
    let l = rated.filter((m) => {
      if (type !== "All" && m.type !== type) return false;
      if (genre !== "All" && !m.genres.includes(genre)) return false;
      if (q.trim() && !m.title.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
    const cmp = {
      recent: (a, b) => order.indexOf(b.id) - order.indexOf(a.id),
      high: (a, b) => ratings[b.id] - ratings[a.id],
      low: (a, b) => ratings[a.id] - ratings[b.id],
      az: (a, b) => a.title.localeCompare(b.title),
      year: (a, b) => b.year - a.year,
    }[sort];
    return [...l].sort(cmp);
  }, [rated, type, genre, sort, q, ratings]);

  const avg = rated.length ? Math.round(rated.reduce((s, m) => s + ratings[m.id], 0) / rated.length) : null;

  return (
    <div className="lm-page">
      <header className="lm-page-head">
        <div>
          <h1 className="lm-page-title">Library</h1>
          <p className="lm-page-sub">
            {rated.length} title{rated.length !== 1 ? "s" : ""} rated
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
          {["All", "Movie", "Series"].map((t) => (
            <button key={t} className={type === t ? "is-on" : ""} onClick={() => setType(t)}>
              {t === "Movie" ? "Movies" : t === "Series" ? "Series" : "All"}
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

      {rated.length === 0 ? (
        <EmptyState icon="library" title="Nothing rated yet"
          body="Search a film on the home page and slide to rate it — it'll live here."
        />
      ) : list.length === 0 ? (
        <EmptyState icon="search" title="No matches" body="Loosen your filters to see more." />
      ) : (
        <div className="lm-grid" key={type + genre + sort + q}>
          {list.map((m, i) => (
            <MovieCard key={m.id} movie={m} rating={ratings[m.id]} inWatchlist={watchlist.includes(m.id)} onOpen={onOpen} onToggleWatch={onToggleWatch} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FOR YOU — recommendations from ratings
   ───────────────────────────────────────────────────────────── */
function ForYouView({ ratings, watchlist, onOpen, onToggleWatch, onGo }) {
  const recs = React.useMemo(
    () => window.LUMEN.recommend(ratings, { excludeWatchlist: watchlist, limit: 18 }),
    [ratings, watchlist]
  );
  const ratedCount = Object.keys(ratings).length;
  const topPick = recs[0];

  if (ratedCount === 0) {
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

  return (
    <div className="lm-page">
      <header className="lm-page-head">
        <div>
          <h1 className="lm-page-title">For You</h1>
          <p className="lm-page-sub">Tuned to your {ratedCount} rating{ratedCount !== 1 ? "s" : ""} · refines as you rate</p>
        </div>
      </header>

      {topPick && (
        <section className="lm-spotlight lm-reveal">
          <Poster movie={topPick.m} className="lm-spotlight-poster" />
          <div className="lm-spotlight-body">
            <span className="lm-spotlight-kicker"><Icon name="spark" size={15} /> Top pick for you</span>
            <h2 className="lm-spotlight-title">{topPick.m.title}</h2>
            <p className="lm-spotlight-meta">{metaLine(topPick.m)}</p>
            <p className="lm-spotlight-log">{topPick.m.log}</p>
            {topPick.because && <p className="lm-because">Because you rated <b>{topPick.because.title}</b></p>}
            <div className="lm-spotlight-actions">
              <button className="lm-btn lm-btn-primary" onClick={() => onOpen(topPick.m)}><Icon name="star" size={17} /> Rate it</button>
              <button className={`lm-btn lm-btn-ghost ${watchlist.includes(topPick.m.id) ? "is-on" : ""}`} onClick={() => onToggleWatch(topPick.m.id)}>
                <Icon name={watchlist.includes(topPick.m.id) ? "check" : "plus"} size={17} />
                {watchlist.includes(topPick.m.id) ? "On watchlist" : "Watchlist"}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="lm-strip-head" style={{ marginTop: 8 }}><h2>More you might love</h2></div>
      <div className="lm-grid">
        {recs.slice(1).map((rec, i) => (
          <div className="lm-rec" key={rec.m.id}>
            <MovieCard movie={rec.m} rating={ratings[rec.m.id]} inWatchlist={watchlist.includes(rec.m.id)} onOpen={onOpen} onToggleWatch={onToggleWatch} index={i} />
            {rec.because && <p className="lm-because lm-because-sm">Because you rated <b>{rec.because.title}</b></p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WATCHLIST
   ───────────────────────────────────────────────────────────── */
function WatchlistView({ ratings, watchlist, onOpen, onToggleWatch, onGo }) {
  const items = React.useMemo(
    () => watchlist.map((id) => window.LUMEN.byId(id)).filter(Boolean).reverse(),
    [watchlist]
  );
  return (
    <div className="lm-page">
      <header className="lm-page-head">
        <div>
          <h1 className="lm-page-title">Watchlist</h1>
          <p className="lm-page-sub">{items.length} saved to watch</p>
        </div>
      </header>
      {items.length === 0 ? (
        <EmptyState icon="bookmark" title="Your watchlist is empty"
          body="Add titles from For You or anywhere you see the bookmark."
          action={<button className="lm-btn lm-btn-primary" onClick={() => onGo("foryou")}>Browse suggestions</button>}
        />
      ) : (
        <div className="lm-grid">
          {items.map((m, i) => (
            <MovieCard key={m.id} movie={m} rating={ratings[m.id]} inWatchlist={true} onOpen={onOpen} onToggleWatch={onToggleWatch} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────── */
const EmptyState = ({ icon, title, body, action }) => (
  <div className="lm-empty lm-reveal">
    <div className="lm-empty-mark"><Icon name={icon} size={30} /></div>
    <h3>{title}</h3>
    <p>{body}</p>
    {action}
  </div>
);

Object.assign(window, { HomeView, LibraryView, ForYouView, WatchlistView, EmptyState });

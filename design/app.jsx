/* Lumen — app shell: routing, state, persistence, nav, tweaks. */

const LS_KEY = "lumen.state.v1";
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { ratings: { ...window.LUMEN.SEED_RATINGS }, watchlist: ["dune", "severance"], view: "home", seeded: true };
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#E5484D",
  "backdrop": "ink",
  "display": "cormorant",
  "density": "regular",
  "grain": true,
  "motion": true
}/*EDITMODE-END*/;

const BACKDROP = {
  ink:      { h: 264, c: 0.012 },
  charcoal: { h: 250, c: 0.004 },
  espresso: { h: 40,  c: 0.012 },
};
const DISPLAY_FONTS = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  spectral:  "'Spectral', Georgia, serif",
  grotesk:   "'Schibsted Grotesk', system-ui, sans-serif",
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const init = React.useRef(loadState());
  const [view, setView] = React.useState(init.current.view || "home");
  const [ratings, setRatings] = React.useState(init.current.ratings || {});
  const [watchlist, setWatchlist] = React.useState(init.current.watchlist || []);
  const [modal, setModal] = React.useState(null);       // movie being rated
  const [takeover, setTakeover] = React.useState(null); // { movie, rating }
  const scrollRef = React.useRef(null);

  /* persist */
  React.useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ ratings, watchlist, view, seeded: true }));
  }, [ratings, watchlist, view]);

  /* apply theme tweaks to :root */
  React.useEffect(() => {
    const r = document.documentElement;
    const bd = BACKDROP[t.backdrop] || BACKDROP.ink;
    r.style.setProperty("--accent", t.accent);
    r.style.setProperty("--bgh", bd.h);
    r.style.setProperty("--bgc", bd.c);
    r.style.setProperty("--font-display", DISPLAY_FONTS[t.display] || DISPLAY_FONTS.cormorant);
    r.dataset.density = t.density;
    r.dataset.grain = t.grain ? "on" : "off";
    r.dataset.motion = t.motion ? "on" : "off";
  }, [t]);

  const go = (v) => { setView(v); if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const openMovie = (m) => setModal(m);
  const toggleWatch = (id) =>
    setWatchlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));

  const saveRating = (id, val) => {
    setRatings((r) => ({ ...r, [id]: val }));
    setWatchlist((w) => w.filter((x) => x !== id)); // rating it graduates from watchlist
    const movie = window.LUMEN.byId(id);
    setModal(null);
    setTimeout(() => setTakeover({ movie, rating: val }), 180);
  };

  const rateSimilar = (m) => { setTakeover(null); setTimeout(() => setModal(m), 280); };

  const shared = { ratings, watchlist, onOpen: openMovie, onToggleWatch: toggleWatch, onGo: go };

  const NAV = [
    { id: "home", label: "Search", icon: "search" },
    { id: "library", label: "Library", icon: "library" },
    { id: "foryou", label: "For You", icon: "spark" },
    { id: "watchlist", label: "Watchlist", icon: "bookmark" },
  ];

  return (
    <div className="lm-app">
      <header className="lm-nav">
        <Logo size={28} onClick={() => go("home")} />
        <nav className="lm-nav-links">
          {NAV.map((n) => (
            <button key={n.id} className={`lm-nav-link ${view === n.id ? "is-on" : ""}`} onClick={() => go(n.id)}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="lm-nav-spacer" />
      </header>

      <main className="lm-main" ref={scrollRef}>
        <div className="lm-view" key={view}>
          {view === "home" && <HomeView {...shared} />}
          {view === "library" && <LibraryView {...shared} />}
          {view === "foryou" && <ForYouView {...shared} />}
          {view === "watchlist" && <WatchlistView {...shared} />}
        </div>
      </main>

      <nav className="lm-tabbar">
        {NAV.map((n) => (
          <button key={n.id} className={`lm-tab ${view === n.id ? "is-on" : ""}`} onClick={() => go(n.id)}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {modal && (
        <RateModal
          movie={modal}
          current={ratings[modal.id]}
          inWatchlist={watchlist.includes(modal.id)}
          onSave={saveRating}
          onToggleWatch={toggleWatch}
          onClose={() => setModal(null)}
        />
      )}
      {takeover && (
        <Takeover
          data={takeover}
          ratings={ratings}
          watchlist={watchlist}
          onRateSimilar={rateSimilar}
          onToggleWatch={toggleWatch}
          onClose={() => setTakeover(null)}
        />
      )}

      <TweaksPanel>
        <TweakSection label="Look" />
        <TweakColor label="Accent" value={t.accent}
          options={["#E5484D", "#E8A33D", "#3DC98B", "#9A7CF0", "#E0E0E0"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Backdrop" value={t.backdrop}
          options={["ink", "charcoal", "espresso"]}
          onChange={(v) => setTweak("backdrop", v)} />
        <TweakSection label="Type" />
        <TweakRadio label="Display" value={t.display}
          options={["cormorant", "spectral", "grotesk"]}
          onChange={(v) => setTweak("display", v)} />
        <TweakSection label="Feel" />
        <TweakRadio label="Density" value={t.density}
          options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)} />
        <TweakToggle label="Poster grain" value={t.grain} onChange={(v) => setTweak("grain", v)} />
        <TweakToggle label="Motion" value={t.motion} onChange={(v) => setTweak("motion", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

import { useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, isConfigured } from "./firebase";
import { useAuth } from "./hooks/useAuth";
import { useUserData } from "./hooks/useUserData";
import { AuthPage } from "./pages/AuthPage";
import { HomeView } from "./pages/HomeView";
import { LibraryView } from "./pages/LibraryView";
import { ForYouView } from "./pages/ForYouView";
import { WatchlistView } from "./pages/WatchlistView";
import { RateModal } from "./overlays/RateModal";
import { Takeover } from "./overlays/Takeover";
import { Logo } from "./components/Logo";
import { Icon } from "./components/Icon";

const NAV = [
  { id: "home", label: "Search", icon: "search" },
  { id: "library", label: "Library", icon: "library" },
  { id: "foryou", label: "For You", icon: "spark" },
  { id: "watchlist", label: "Watchlist", icon: "bookmark" },
];

export default function App() {
  const user = useAuth();
  const { ratings, watchlist, loading, saveRating, toggleWatchlist } = useUserData(user?.uid);
  const [view, setView] = useState("home");
  const [modal, setModal] = useState(null);
  const [takeover, setTakeover] = useState(null);
  const scrollRef = useRef(null);

  if (!isConfigured) return <SetupPage />;

  if (user === undefined) {
    return (
      <div style={{ height: "100dvh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--bg-3)", borderTopColor: "var(--accent)", animation: "rot .7s linear infinite" }} />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const go = (v) => { setView(v); if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const openMovie = (item) => setModal(item);

  const handleSaveRating = async (item, value) => {
    await saveRating(item, value);
    setModal(null);
    setTimeout(() => setTakeover({ item, rating: value }), 180);
  };

  const rateSimilar = (item) => { setTakeover(null); setTimeout(() => setModal(item), 280); };

  const shared = {
    ratings,
    watchlist,
    onOpen: openMovie,
    onToggleWatch: toggleWatchlist,
    onGo: go,
  };

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
        <button
          className="lm-nav-link"
          onClick={() => signOut(auth)}
          title={user.email}
          style={{ gap: 8 }}
        >
          <Icon name="logout" size={18} />
          <span>Sign out</span>
        </button>
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
          item={modal}
          currentRating={ratings[`${modal.mediaType}_${modal.tmdbId}`]?.value}
          inWatchlist={!!watchlist[`${modal.mediaType}_${modal.tmdbId}`]}
          onSave={handleSaveRating}
          onToggleWatch={toggleWatchlist}
          onClose={() => setModal(null)}
        />
      )}
      {takeover && (
        <Takeover
          data={takeover}
          ratings={ratings}
          watchlist={watchlist}
          onRateSimilar={rateSimilar}
          onToggleWatch={toggleWatchlist}
          onClose={() => setTakeover(null)}
        />
      )}
    </div>
  );
}

function SetupPage() {
  return (
    <div style={{ height: "100dvh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <svg viewBox="0 0 40 40" width="36" height="36" style={{ overflow: "visible" }}>
            <circle cx="20" cy="20" r="18" fill="none" stroke="var(--text)" strokeWidth="1.4" opacity=".55" />
            <circle cx="20" cy="20" r="12.5" fill="none" stroke="var(--accent)" strokeWidth="1.4" opacity=".9" />
            <circle cx="20" cy="20" r="5" fill="var(--accent)" />
          </svg>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>Lumen</span>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>Setup required</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 600, lineHeight: 1.05, marginBottom: 16 }}>Add your API keys to get started</h1>
        <p style={{ color: "var(--text-3)", fontSize: 14.5, lineHeight: 1.65, marginBottom: 28 }}>
          Create a <code style={{ background: "var(--bg-2)", padding: "2px 6px", borderRadius: 5, fontFamily: "var(--font-mono)", fontSize: 13 }}>.env</code> file in the project root with your Firebase and TMDB credentials.
        </p>
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 12, padding: "18px 20px", fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.7, color: "var(--text-2)" }}>
          <div style={{ color: "var(--text-3)", marginBottom: 8 }}># .env</div>
          <div>VITE_TMDB_API_KEY=<span style={{ color: "var(--accent)" }}>your_tmdb_key</span></div>
          <div style={{ marginTop: 8 }}>VITE_FIREBASE_API_KEY=<span style={{ color: "var(--accent)" }}>your_key</span></div>
          <div>VITE_FIREBASE_AUTH_DOMAIN=<span style={{ color: "var(--accent)" }}>project.firebaseapp.com</span></div>
          <div>VITE_FIREBASE_PROJECT_ID=<span style={{ color: "var(--accent)" }}>your_project_id</span></div>
          <div>VITE_FIREBASE_STORAGE_BUCKET=<span style={{ color: "var(--accent)" }}>project.appspot.com</span></div>
          <div>VITE_FIREBASE_MESSAGING_SENDER_ID=<span style={{ color: "var(--accent)" }}>000000000000</span></div>
          <div>VITE_FIREBASE_APP_ID=<span style={{ color: "var(--accent)" }}>1:000:web:abc123</span></div>
        </div>
        <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 18, lineHeight: 1.6 }}>
          Get your TMDB key at <strong style={{ color: "var(--text-2)" }}>themoviedb.org → Settings → API</strong>.<br />
          Get Firebase credentials from <strong style={{ color: "var(--text-2)" }}>console.firebase.google.com → Project settings</strong>.<br />
          After adding the file, restart the dev server.
        </p>
      </div>
    </div>
  );
}

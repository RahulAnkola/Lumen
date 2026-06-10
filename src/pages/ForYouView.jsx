import { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "../components/Icon";
import { Poster } from "../components/Poster";
import { MovieCard, metaLine } from "../components/MovieCard";
import { EmptyState } from "../components/EmptyState";
import { getRecommendations, hasGemini } from "../recommendations";
import { buildClusterModel, predictRating } from "../clustering";

// ── Cache helpers ─────────────────────────────────────────────────────────────

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

function cacheKey(uid) {
  return `lumen_recs_v1_${uid || "guest"}`;
}

function loadCache(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.cachedAt > CACHE_TTL) return null; // expired
    return data; // { recs, cachedAt }
  } catch { return null; }
}

function saveCache(uid, recs) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify({ recs, cachedAt: Date.now() }));
  } catch {}
}

function clearCache(uid) {
  try { localStorage.removeItem(cacheKey(uid)); } catch {}
}

function timeAgo(ts) {
  if (!ts) return null;
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ForYouView({ ratings, watchlist, dismissed = {}, onOpen, onToggleWatch, onDismiss, onGo, uid }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cachedAt, setCachedAt] = useState(null);

  // Refs so the fetch callback always uses fresh data without being in effect deps
  const ratingsRef = useRef(ratings);
  const excludeIdsRef = useRef(null);
  const dismissedRef = useRef(dismissed);
  ratingsRef.current = ratings;
  dismissedRef.current = dismissed;

  const ratedItems = useMemo(
    () => Object.entries(ratings).map(([key, data]) => ({ key, ...data })),
    [ratings]
  );

  const fetchExcludeIds = useMemo(() => {
    const s = new Set(Object.keys(ratings));
    Object.keys(watchlist).forEach((k) => s.add(k));
    Object.keys(dismissed).forEach((k) => s.add(k));
    return s;
  }, [ratings, watchlist, dismissed]);

  // Keep ref in sync
  excludeIdsRef.current = fetchExcludeIds;

  // ── Cluster model (pure math, rebuilds when ratings change) ─────────────────
  // Clusters are on content features only — NOT on ratings.
  // clusterModel gives us predictRating(item) for unrated recommendations.
  const clusterModel = useMemo(() => buildClusterModel(ratings), [ratings]);

  // ── Fetch logic ─────────────────────────────────────────────────────────────

  const didInitRef = useRef(false); // have we run the initial cache-or-fetch?

  // refreshTick: 0 = initial (check cache first), >0 = manual (always fetch)
  const [refreshTick, setRefreshTick] = useState(0);

  const doFetch = () => {
    setLoading(true);
    getRecommendations(ratingsRef.current, excludeIdsRef.current, dismissedRef.current || {}, 22)
      .then((result) => {
        setRecs(result);
        saveCache(uid, result);
        setCachedAt(Date.now());
      })
      .finally(() => setLoading(false));
  };

  // Trigger initial load when ratings first arrive from Firestore
  useEffect(() => {
    if (ratedItems.length === 0) { setLoading(false); setRecs([]); return; }
    if (didInitRef.current) return; // already initialised
    didInitRef.current = true;

    // Try cache on first load
    const cached = loadCache(uid);
    if (cached) {
      setRecs(cached.recs);
      setCachedAt(cached.cachedAt);
      setLoading(false);
    } else {
      doFetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratedItems.length > 0]);

  // Manual refresh trigger
  useEffect(() => {
    if (refreshTick === 0) return; // skip on mount — handled above
    doFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const handleRefresh = () => {
    clearCache(uid);
    setRefreshTick((t) => t + 1);
  };

  // ── Instant dismiss filter (no re-fetch) ────────────────────────────────────

  const displayRecs = useMemo(() => {
    const nowExcluded = new Set([
      ...Object.keys(ratings),
      ...Object.keys(watchlist),
      ...Object.keys(dismissed),
    ]);
    return recs.filter((rec) => !nowExcluded.has(`${rec.item.mediaType}_${rec.item.tmdbId}`));
  }, [recs, ratings, watchlist, dismissed]);

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (ratedItems.length === 0) {
    return (
      <div className="lm-page">
        <header className="lm-page-head"><div><h1 className="lm-page-title">For You</h1></div></header>
        <EmptyState
          icon="spark"
          title="Rate one thing to begin"
          body="The more you rate, the sharper your suggestions become. Start on the home page."
          action={
            <button className="lm-btn lm-btn-primary" onClick={() => onGo("home")}>
              Find something to rate
            </button>
          }
        />
      </div>
    );
  }

  // Sort by predicted rating descending — highest prediction first
  const sortedRecs = useMemo(() => {
    if (!clusterModel) return displayRecs;
    return [...displayRecs].sort(
      (a, b) => (predictRating(b.item, clusterModel) || 0) - (predictRating(a.item, clusterModel) || 0)
    );
  }, [displayRecs, clusterModel]);

  const topPick = sortedRecs[0];
  const rest = sortedRecs.slice(1);

  return (
    <div className="lm-page">
      <header className="lm-page-head">
        <div>
          <h1 className="lm-page-title">For You</h1>
          <p className="lm-page-sub">
            Tuned to your {ratedItems.length} rating{ratedItems.length !== 1 ? "s" : ""}
            {cachedAt && <span className="lm-cache-age"> · updated {timeAgo(cachedAt)}</span>}
            {hasGemini && recs.some((r) => r.source === "gemini") && (
              <span className="lm-ai-badge"><Icon name="spark" size={11} /> AI-enhanced</span>
            )}
          </p>
        </div>
        <button
          className="lm-btn lm-btn-ghost lm-refresh-btn"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh suggestions"
        >
          <Icon name="refresh" size={15} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {loading && (
        <div style={{ color: "var(--text-3)", fontSize: 14, padding: "40px 0" }}>
          Finding picks for you…
        </div>
      )}

      {!loading && topPick && (
        <section className="lm-spotlight lm-reveal">
          {clusterModel && (
            <span className="lm-pred-badge lm-pred-badge-spotlight" title="Predicted rating based on your taste clusters">
              ~{predictRating(topPick.item, clusterModel)}
            </span>
          )}
          <Poster item={topPick.item} className="lm-spotlight-poster" />
          <div className="lm-spotlight-body">
            <span className="lm-spotlight-kicker"><Icon name="spark" size={15} /> Top pick for you</span>
            <h2 className="lm-spotlight-title">{topPick.item.title}</h2>
            <p className="lm-spotlight-meta">{metaLine(topPick.item)}</p>
            {topPick.item.overview && (
              <p className="lm-spotlight-log">{topPick.item.overview}</p>
            )}
            {topPick.because ? (
              <p className="lm-because">Because you rated <b>{topPick.because.title}</b></p>
            ) : topPick.source === "gemini" ? (
              <p className="lm-because lm-ai-pick">
                <Icon name="spark" size={13} /> {topPick.reason || "AI pick"}
              </p>
            ) : topPick.source === "director" && topPick.directorName ? (
              <p className="lm-because">More from <b>{topPick.directorName}</b></p>
            ) : topPick.source === "actor" && topPick.actorName ? (
              <p className="lm-because">Starring <b>{topPick.actorName}</b></p>
            ) : null}
            <div className="lm-spotlight-actions">
              <button className="lm-btn lm-btn-primary" onClick={() => onOpen(topPick.item)}>
                <Icon name="star" size={17} /> Rate it
              </button>
              <button
                className={`lm-btn lm-btn-ghost ${watchlist[`${topPick.item.mediaType}_${topPick.item.tmdbId}`] ? "is-on" : ""}`}
                onClick={() => onToggleWatch(topPick.item)}
              >
                <Icon
                  name={watchlist[`${topPick.item.mediaType}_${topPick.item.tmdbId}`] ? "check" : "plus"}
                  size={17}
                />
                {watchlist[`${topPick.item.mediaType}_${topPick.item.tmdbId}`] ? "On watchlist" : "Watchlist"}
              </button>
              <button
                className="lm-btn lm-btn-ghost lm-dismiss-spotlight"
                onClick={() => onDismiss?.(topPick.item)}
                title="Hide this from suggestions forever"
              >
                <Icon name="close" size={15} /> Not for me
              </button>
            </div>
          </div>
        </section>
      )}

      {!loading && rest.length > 0 && (
        <>
          <div className="lm-strip-head" style={{ marginTop: 8 }}>
            <h2>More you might love</h2>
          </div>
          <div className="lm-grid">
            {rest.map((rec, i) => {
              const key = `${rec.item.mediaType}_${rec.item.tmdbId}`;
              return (
                <div className="lm-rec" key={key}>
                  {clusterModel && !ratings[key] && (
                    <span className="lm-pred-badge" title="Predicted rating based on your taste clusters">
                      ~{predictRating(rec.item, clusterModel)}
                    </span>
                  )}
                  <MovieCard
                    item={rec.item}
                    rating={ratings[key]?.value}
                    inWatchlist={!!watchlist[key]}
                    onOpen={onOpen}
                    onToggleWatch={onToggleWatch}
                    index={i}
                  />
                  <button
                    className="lm-dismiss-btn"
                    onClick={(e) => { e.stopPropagation(); onDismiss?.(rec.item); }}
                    title="Hide this from suggestions forever"
                  >
                    <Icon name="close" size={11} /> Not for me
                  </button>
                  {rec.because ? (
                    <p className="lm-because lm-because-sm">
                      Because you rated <b>{rec.because.title}</b>
                    </p>
                  ) : rec.source === "gemini" ? (
                    <p className="lm-because lm-because-sm lm-ai-pick">
                      <Icon name="spark" size={11} /> {rec.reason || "AI pick"}
                    </p>
                  ) : rec.source === "director" && rec.directorName ? (
                    <p className="lm-because lm-because-sm">
                      More from <b>{rec.directorName}</b>
                    </p>
                  ) : rec.source === "actor" && rec.actorName ? (
                    <p className="lm-because lm-because-sm">
                      Starring <b>{rec.actorName}</b>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && displayRecs.length === 0 && ratedItems.length > 0 && (
        <EmptyState
          icon="spark"
          title="No suggestions yet"
          body="Rate a few more titles and we'll find picks you'll love."
        />
      )}
    </div>
  );
}

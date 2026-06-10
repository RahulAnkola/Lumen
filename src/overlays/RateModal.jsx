import { useState, useEffect } from "react";
import { Poster } from "../components/Poster";
import { RatingSlider } from "../components/RatingSlider";
import { Icon } from "../components/Icon";
import { metaLine } from "../components/MovieCard";
import { fetchWatchProviders } from "../tmdb";

const LOGO = (path) => `https://image.tmdb.org/t/p/w45${path}`;

export function RateModal({ item, currentRating, inWatchlist, predictedRating, onSave, onSaveOnly, onClose, onToggleWatch }) {
  const [val, setVal] = useState(currentRating == null ? 7 : currentRating);
  const [closing, setClosing] = useState(false);
  const [providers, setProviders] = useState(null); // null = loading, false = none

  useEffect(() => {
    setVal(currentRating == null ? 7 : currentRating);
  }, [item, currentRating]);

  // Fetch watch providers whenever the item changes
  useEffect(() => {
    if (!item) return;
    setProviders(null);
    fetchWatchProviders(item.tmdbId, item.mediaType)
      .then((p) => setProviders(p || false));
  }, [item?.tmdbId, item?.mediaType]);

  const close = () => { setClosing(true); setTimeout(onClose, 240); };

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!item) return null;

  // Decide what to show: streaming first, then rent as fallback
  const streamOn = providers?.flatrate || [];
  const rentOn = providers?.rent || [];
  const hasProviders = streamOn.length > 0 || rentOn.length > 0;

  return (
    <div className={`lm-modal-scrim ${closing ? "is-closing" : ""}`} onMouseDown={close}>
      <div className="lm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="lm-modal-x" onClick={close} aria-label="Close"><Icon name="close" size={20} /></button>
        <div className="lm-modal-poster"><Poster item={item} /></div>
        <div className="lm-modal-body">
          <span className="lm-modal-kicker">{currentRating != null ? "Update your rating" : "Rate this title"}</span>
          <h2 className="lm-modal-title">{item.title}</h2>
          <p className="lm-modal-meta">
            {metaLine(item)}
            {predictedRating != null && currentRating == null && (
              <span className="lm-pred-badge lm-pred-badge-modal" title="Predicted rating based on your taste clusters">
                you'd rate ~{predictedRating}
              </span>
            )}
          </p>
          <div className="lm-chips">
            {item.genres?.map((g) => <span key={g} className="lm-genre">{g}</span>)}
          </div>

          {/* Watch providers */}
          {providers === null && (
            <div className="lm-providers lm-providers-loading">
              <span className="lm-providers-label">Where to watch</span>
              <span className="lm-providers-spinner" />
            </div>
          )}
          {providers !== null && hasProviders && (
            <div className="lm-providers">
              {streamOn.length > 0 && (
                <>
                  <span className="lm-providers-label">Stream</span>
                  <div className="lm-providers-logos">
                    {streamOn.slice(0, 6).map((p) => (
                      <a
                        key={p.provider_id}
                        href={providers.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={p.provider_name}
                        className="lm-provider-wrap"
                      >
                        <img
                          src={LOGO(p.logo_path)}
                          alt={p.provider_name}
                          className="lm-provider-logo"
                        />
                      </a>
                    ))}
                  </div>
                </>
              )}
              {streamOn.length === 0 && rentOn.length > 0 && (
                <>
                  <span className="lm-providers-label">Rent</span>
                  <div className="lm-providers-logos">
                    {rentOn.slice(0, 6).map((p) => (
                      <a
                        key={p.provider_id}
                        href={providers.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={p.provider_name}
                        className="lm-provider-wrap"
                      >
                        <img
                          src={LOGO(p.logo_path)}
                          alt={p.provider_name}
                          className="lm-provider-logo"
                        />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {providers === false && (
            <p className="lm-providers-none">Not available to stream in your region</p>
          )}

          {item.overview && <p className="lm-modal-log">{item.overview}</p>}
          <div className="lm-modal-rate">
            <RatingSlider value={val} onChange={setVal} autoFocus />
          </div>
          <div className="lm-modal-actions">
            <button className="lm-btn lm-btn-primary lm-btn-lg" onClick={() => onSave(item, val)}>
              <Icon name="check" size={18} />
              {currentRating != null ? "Update & see similar" : "Save & see similar"}
            </button>
            <button
              className="lm-btn lm-btn-ghost lm-btn-lg"
              onClick={() => onSaveOnly(item, val)}
              title="Save rating without seeing similar titles"
            >
              {currentRating != null ? "Just update" : "Just save"}
            </button>
            <button
              className={`lm-btn lm-btn-ghost lm-btn-lg ${inWatchlist ? "is-on" : ""}`}
              onClick={() => onToggleWatch(item)}
            >
              <Icon name={inWatchlist ? "check" : "bookmark"} size={18} />
              {inWatchlist ? "Saved" : "Watchlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

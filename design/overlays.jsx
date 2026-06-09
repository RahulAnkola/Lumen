/* Lumen — overlays: RateModal + full-screen Takeover. */

/* count-up hook */
function useCountUp(target, ms = 900, run = true) {
  const [n, setN] = React.useState(run ? 0 : target);
  React.useEffect(() => {
    if (!run) { setN(target); return; }
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

/* ── Rate modal ─────────────────────────────────────────────── */
function RateModal({ movie, current, inWatchlist, onSave, onClose, onToggleWatch }) {
  const [val, setVal] = React.useState(current == null ? 50 : current);
  const [closing, setClosing] = React.useState(false);
  React.useEffect(() => { setVal(current == null ? 72 : current); }, [movie, current]);

  const close = () => { setClosing(true); setTimeout(onClose, 240); };
  React.useEffect(() => {
    const h = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!movie) return null;
  return (
    <div className={`lm-modal-scrim ${closing ? "is-closing" : ""}`} onMouseDown={close}>
      <div className="lm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="lm-modal-x" onClick={close} aria-label="Close"><Icon name="close" size={20} /></button>
        <div className="lm-modal-poster"><Poster movie={movie} /></div>
        <div className="lm-modal-body">
          <span className="lm-modal-kicker">{current != null ? "Update your rating" : "Rate this title"}</span>
          <h2 className="lm-modal-title">{movie.title}</h2>
          <p className="lm-modal-meta">{metaLine(movie)} · {movie.by}</p>
          <div className="lm-chips">{movie.genres.map((g) => <span key={g} className="lm-genre">{g}</span>)}</div>
          <p className="lm-modal-log">{movie.log}</p>
          <div className="lm-modal-rate">
            <RatingSlider value={val} onChange={setVal} autoFocus />
          </div>
          <div className="lm-modal-actions">
            <button className="lm-btn lm-btn-primary lm-btn-lg" onClick={() => onSave(movie.id, val)}>
              <Icon name="check" size={18} /> {current != null ? "Save rating" : "Save & see similar"}
            </button>
            <button className={`lm-btn lm-btn-ghost lm-btn-lg ${inWatchlist ? "is-on" : ""}`} onClick={() => onToggleWatch(movie.id)}>
              <Icon name={inWatchlist ? "check" : "bookmark"} size={18} />
              {inWatchlist ? "Saved" : "Watchlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Full-screen takeover after rating ──────────────────────── */
function Takeover({ data, ratings, watchlist, onRateSimilar, onToggleWatch, onClose }) {
  const { movie, rating } = data;
  const tier = ratingTier(rating);
  const count = useCountUp(rating, 1000, true);
  const similar = React.useMemo(() => window.LUMEN.similar(movie.id, 5), [movie.id]);
  const [closing, setClosing] = React.useState(false);
  const tone = posterTone(movie.tone);

  const close = () => { setClosing(true); setTimeout(onClose, 420); };
  React.useEffect(() => {
    const h = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className={`lm-take ${closing ? "is-closing" : ""}`}>
      <div className="lm-take-wash" style={{ background: `radial-gradient(80% 70% at 50% 0%, oklch(0.32 0.09 ${movie.tone}) 0%, transparent 70%)` }} />
      <button className="lm-take-x" onClick={close} aria-label="Close"><Icon name="close" size={22} /></button>

      <div className="lm-take-top">
        <div className="lm-take-hero">
          <div className="lm-take-poster"><Poster movie={movie} /></div>
          <div className="lm-take-score">
            <span className="lm-take-kicker">You rated</span>
            <h2 className="lm-take-title">{movie.title}</h2>
            <div className="lm-take-num"><b>{count}</b><span>/100</span></div>
            <span className={`lm-rate-tier lm-take-tier t-${tier.k}`}>{tier.label}</span>
          </div>
        </div>
      </div>

      <div className="lm-take-rec">
        <div className="lm-take-rec-head">
          <span className="lm-take-because"><Icon name="spark" size={16} /> Because you {rating >= 70 ? "loved" : "rated"} {movie.title}</span>
          <h3>You might also want to watch</h3>
        </div>
        <div className="lm-take-list">
          {similar.map((m, i) => {
            const r = ratings[m.id];
            const on = watchlist.includes(m.id);
            return (
              <article className="lm-take-card" key={m.id} style={{ "--d": 0.35 + i * 0.09 + "s" }}>
                <Poster movie={m}>
                  {r != null && <span className="lm-card-rating"><RatingChip value={r} /></span>}
                </Poster>
                <div className="lm-take-card-body">
                  <h4>{m.title}</h4>
                  <p>{metaLine(m)}</p>
                  <div className="lm-take-card-actions">
                    <button className="lm-btn lm-btn-primary lm-btn-sm" onClick={() => onRateSimilar(m)}>
                      <Icon name="star" size={14} /> {r != null ? "Re-rate" : "Rate"}
                    </button>
                    <button className={`lm-iconbtn lm-iconbtn-lg ${on ? "is-on" : ""}`} aria-label="Watchlist" onClick={() => onToggleWatch(m.id)}>
                      <Icon name={on ? "check" : "plus"} size={18} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <button className="lm-take-done" onClick={close}>Done <Icon name="arrow" size={18} /></button>
      </div>
    </div>
  );
}

Object.assign(window, { RateModal, Takeover, useCountUp });

export function Logo({ size = 30, onClick, showWord = true }) {
  return (
    <button className="lm-logo" onClick={onClick} aria-label="Lumen home">
      <span className="lm-logo-mark" style={{ width: size, height: size }}>
        <svg viewBox="0 0 40 40" width={size} height={size}>
          <circle cx="20" cy="20" r="18" className="lm-ring lm-ring-1" />
          <circle cx="20" cy="20" r="12.5" className="lm-ring lm-ring-2" />
          <circle cx="20" cy="20" r="5" className="lm-pupil" />
        </svg>
      </span>
      {showWord && <span className="lm-logo-word">Lumen</span>}
    </button>
  );
}

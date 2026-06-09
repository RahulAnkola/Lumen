export function Icon({ name, size = 20, stroke = 1.6 }) {
  const p = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
    film: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 8h18M3 16h18M8 3v18M16 3v18" /></>,
    spark: <path d="M12 3l1.8 5.6L19.5 10l-5.7 1.8L12 17l-1.8-5.2L4.5 10l5.7-1.4L12 3z" />,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3z" />,
    library: <><path d="M4 5v15M9 5v15" /><rect x="13" y="4" width="7" height="17" rx="1" transform="rotate(8 16 12)" /></>,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    sliders: <><path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2.2" /><circle cx="8" cy="16" r="2.2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M5 12.5 10 17l9-10" />,
    chevR: <path d="m9 5 7 7-7 7" />,
    chevD: <path d="m5 9 7 7 7-7" />,
    play: <path d="M7 5l12 7-12 7V5z" />,
    star: <path d="M12 3l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 17.8 6.2 21.3l1.6-6.6L2.6 9.8l6.8-.5L12 3z" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>,
  }[name];
  const fill = name === "spark" || name === "play" ? "currentColor" : "none";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none" }}>
      {p}
    </svg>
  );
}

// Purely decorative — cinematic dust motes drifting through projector light.
// No app state, no logic: just a canvas animation behind the hero.
import { useEffect, useRef } from "react";

export function HomeBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "off";

    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, raf = 0;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Pre-rendered glow sprites — drawing radial gradients per-particle per-frame
    // is too slow, so each tint is rasterised once and blitted with drawImage.
    const makeSprite = (r, g, b) => {
      const s = document.createElement("canvas");
      s.width = s.height = 64;
      const c = s.getContext("2d");
      const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},0.4)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = grad;
      c.fillRect(0, 0, 64, 64);
      return s;
    };
    const warm = makeSprite(255, 238, 214); // projector-bulb white
    const ember = makeSprite(255, 122, 96); // accent red
    const ice = makeSprite(130, 222, 238); // a few cyan strays

    const pickSprite = () => {
      const r = Math.random();
      if (r < 0.72) return warm;
      if (r < 0.92) return ember;
      return ice;
    };

    resize();

    const COUNT = Math.round(Math.min(150, (w * h) / 9000));
    const parts = Array.from({ length: COUNT }, () => {
      const z = 0.15 + Math.random() * 0.85; // depth: size, speed, brightness
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        vx: (Math.random() - 0.5) * 0.12 * z,
        vy: (-0.06 - Math.random() * 0.18) * z, // dust rises through the beam
        tw: 0.4 + Math.random() * 1.4, // twinkle speed
        ph: Math.random() * Math.PI * 2, // twinkle phase
        sprite: pickSprite(),
        // beam bias: motes near the centre column glow brighter
      };
    });

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const time = t / 1000;
      const wind = Math.sin(time * 0.13) * 0.05; // slow lateral breeze

      for (const p of parts) {
        if (!reduced) {
          p.x += p.vx + wind * p.z;
          p.y += p.vy;

          // Cursor scatters nearby dust
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = ((140 - d) / 140) * 0.9 * p.z;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }

          // wrap
          if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
        }

        // Brighter inside the central light column, dimmer at the edges
        const beam = 1 - Math.min(1, Math.abs(p.x - w / 2) / (w * 0.45));
        const twinkle = 0.55 + 0.45 * Math.sin(time * p.tw + p.ph);
        ctx.globalAlpha = (0.1 + 0.5 * p.z) * twinkle * (0.35 + 0.65 * beam);

        const size = 2 + p.z * 13;
        ctx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);

    raf = requestAnimationFrame(draw); // reduced mode still paints one static frame

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <div className="lm-home-backdrop" aria-hidden="true">
      <div className="lm-rays" />
      <div className="lm-rays lm-rays-2" />
      <canvas ref={canvasRef} className="lm-dust" />
      <div className="lm-beam-core" />
    </div>
  );
}

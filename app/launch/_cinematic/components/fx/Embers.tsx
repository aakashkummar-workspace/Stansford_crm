"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Particle count — keep small (8–40) so this stays GPU-friendly */
  count?: number;
  /** Tint: warm gold by default, royal for cool scenes */
  tone?: "gold" | "royal" | "white";
};

/**
 * Warm cinematic embers drifting upward — the "dust in a spotlight" feel.
 * Canvas-based with delta-time loop so it stays smooth even on the
 * projector laptop and doesn't tax the GC.
 */
export default function Embers({ count = 22, tone = "gold" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = (canvas.width = canvas.clientWidth * dpr);
    let h = (canvas.height = canvas.clientHeight * dpr);
    const ro = new ResizeObserver(() => {
      w = canvas.width = canvas.clientWidth * dpr;
      h = canvas.height = canvas.clientHeight * dpr;
    });
    ro.observe(canvas);

    const baseColor =
      tone === "gold"
        ? [230, 191, 106]
        : tone === "royal"
        ? [180, 200, 255]
        : [255, 255, 255];

    type P = {
      x: number;
      y: number;
      vy: number;
      vx: number;
      r: number;
      life: number;
      maxLife: number;
      phase: number;
    };

    const spawn = (): P => ({
      x: Math.random() * w,
      y: h + Math.random() * 80 * dpr,
      vy: -(0.25 + Math.random() * 0.6) * dpr,
      vx: (Math.random() - 0.5) * 0.18 * dpr,
      r: (0.6 + Math.random() * 1.5) * dpr,
      life: 0,
      maxLife: 6 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2
    });

    const particles: P[] = Array.from({ length: count }, spawn);

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += dt;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.phase + p.life * 0.8) * 0.25 * dpr;

        if (p.life > p.maxLife || p.y < -10) {
          particles[i] = spawn();
          continue;
        }
        const t = p.life / p.maxLife;
        const alpha = (1 - Math.abs(t - 0.5) * 2) * 0.85;
        ctx.beginPath();
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
        grd.addColorStop(0, `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha})`);
        grd.addColorStop(1, `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},0)`);
        ctx.fillStyle = grd;
        ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(${baseColor[0]},${baseColor[1]},${baseColor[2]},${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [count, tone]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
      aria-hidden
    />
  );
}

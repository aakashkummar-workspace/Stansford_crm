"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number };

type Props = {
  density?: number;
  speed?: number;
  className?: string;
  color?: string;
  glow?: boolean;
};

export default function StarField({
  density = 0.00018,
  speed = 0.05,
  className = "",
  color = "#aec3ff",
  glow = true
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(60, Math.floor(w * h * density));
      stars = Array.from({ length: count }).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        a: Math.random(),
        tw: 0.002 + Math.random() * 0.008
      }));
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        s.a += s.tw;
        if (s.x < -5) s.x = w + 5;
        if (s.x > w + 5) s.x = -5;
        if (s.y < -5) s.y = h + 5;
        if (s.y > h + 5) s.y = -5;
        const alpha = 0.35 + Math.abs(Math.sin(s.a)) * 0.6;
        ctx.beginPath();
        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 * s.r;
        }
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
  }, [density, speed, color, glow]);

  return (
    <canvas
      ref={ref}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden
    />
  );
}

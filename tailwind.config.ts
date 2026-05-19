import type { Config } from "tailwindcss";

/**
 * Tailwind config for the cinematic launch page only.
 *
 * `preflight` is DISABLED so Tailwind's CSS reset doesn't fight the main
 * CRM's existing globals.css design system (paper theme, Manrope + Fraunces
 * fonts, etc.). Only the utility classes are emitted, and only for files
 * inside the `/launch` route — so the main CRM bundle stays clean.
 */
const config: Config = {
  content: [
    "./app/launch/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "serif"]
      },
      colors: {
        ink: {
          900: "#000308",
          800: "#04070f",
          700: "#080d1c"
        },
        royal: {
          50: "#e8eeff",
          100: "#c4d1ff",
          300: "#7a93ff",
          500: "#3a5bff",
          600: "#1f3df0",
          700: "#1530b8",
          800: "#0d1f7a",
          900: "#070f3d"
        },
        gold: {
          300: "#f4d58d",
          400: "#e6bf6a",
          500: "#c9a04a"
        }
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 60px 10px rgba(58,91,255,0.35)" },
          "50%": { boxShadow: "0 0 120px 30px rgba(58,91,255,0.7)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" }
        }
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 3.5s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        scanline: "scanline 8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;

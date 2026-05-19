import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, Manrope, Fraunces } from "next/font/google";
import "./_cinematic/cinematic.css";

/**
 * Layout for the cinematic launch page.
 *
 * Everything inside this layout is wrapped in a `.cinematic-root` div, which
 * scopes the dark theme + Inter/Cormorant fonts to this route only. The main
 * CRM's paper theme is unaffected even after a user visits /launch and
 * navigates away.
 *
 * Tailwind utilities (preflight off, content scoped to /launch) come from
 * `cinematic.css` which is imported here so they only ship on this route.
 */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap"
});

// Manrope + Fraunces are the REAL product fonts shown inside the device
// frames. They're already loaded globally by the root layout via the
// Google Fonts <link>, so we just attach the same CSS variables here for
// the cinematic to reference.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Sanvi · Digital Inauguration",
  description:
    "A cinematic digital inauguration ceremony for the future of education."
};

export const viewport: Viewport = {
  themeColor: "#000208"
};

export default function LaunchLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`cinematic-root vignette grain scanlines scene-locked ${inter.variable} ${display.variable} ${manrope.variable} ${fraunces.variable}`}
      // The cinematic locks the viewport — no scrolling, no rubber-band.
      style={{ minHeight: "100vh" }}
    >
      {children}
    </div>
  );
}

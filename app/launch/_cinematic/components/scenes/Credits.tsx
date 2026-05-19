"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, RefreshCw, Mail, Instagram, Youtube } from "lucide-react";
import Scene from "@/cinematic/components/fx/Scene";
import StarField from "@/cinematic/components/fx/StarField";

/** WhatsApp brand glyph — lucide doesn't ship one, so we draw the standard
 *  outline as a small inline SVG sized to match the other lucide icons. */
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411m-8.475 18.291h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.869 9.869 0 0 1-1.516-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m5.453-7.342c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.18 2.095 3.195 5.076 4.483.713.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345" />
    </svg>
  );
}

type Channel = {
  label: string;
  href: string;
  icon: React.ReactNode;
  sub?: string;
};

const CHANNELS: Channel[] = [
  {
    label: "Email",
    sub: "support@sirahdigital.in",
    href: "mailto:support@sirahdigital.in",
    icon: <Mail className="w-4 h-4" />
  },
  {
    label: "WhatsApp",
    sub: "+91 97899 61631",
    // wa.me opens the WhatsApp chat with this number prefilled.
    href: "https://wa.me/919789961631",
    icon: <WhatsAppIcon className="w-4 h-4" />
  },
  {
    label: "Instagram",
    sub: "@sirah_digital",
    href: "https://www.instagram.com/sirah_digital/",
    icon: <Instagram className="w-4 h-4" />
  },
  {
    label: "YouTube",
    sub: "@sirahdigital",
    href: "https://www.youtube.com/@sirahdigital",
    icon: <Youtube className="w-4 h-4" />
  }
];

/**
 * Closing credits — the last beat after the cinematic finale.
 *
 * Slow, calm, "end of film" feel: black backdrop with a starfield, a few
 * drifting embers, and a vertically-stacked credit card with the studio
 * name and link. Mirrors the cinematic typography (Cormorant Garamond
 * display + cinema-tracked caps) so it feels like the same film.
 *
 * No auto-advance. The host either presses R to restart, taps the link to
 * visit the studio, or just leaves it up while the audience files out.
 */
export default function Credits({ onRestart }: { onRestart: () => void }) {
  return (
    <Scene>
      <div className="absolute inset-0 bg-ink-900" />
      <StarField density={0.00009} speed={0.018} />

      {/* Very soft top spotlight so the credit card has presence */}
      <div
        className="absolute inset-x-0 top-0 h-2/3 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(58,91,255,0.18), transparent 60%)"
        }}
      />

      <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-6">
        {/* Top eyebrow */}
        <motion.p
          className="text-[10px] md:text-xs tracking-cinema text-gold-400/80 uppercase mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.4 }}
        >
          · A Digital Inauguration ·
        </motion.p>

        {/* "Developed by" */}
        <motion.p
          className="text-xs md:text-sm tracking-[0.42em] uppercase text-royal-100/55 mb-4"
          initial={{ opacity: 0, filter: "blur(8px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ delay: 0.8, duration: 1.4 }}
        >
          Developed by
        </motion.p>

        {/* Studio wordmark — the cinematic centerpiece of the credit card */}
        <motion.h1
          className="font-display text-cinematic"
          style={{
            fontSize: "clamp(2.8rem, 7vw, 6rem)",
            letterSpacing: "-0.005em",
            lineHeight: 1
          }}
          initial={{ opacity: 0, y: 24, filter: "blur(14px)", letterSpacing: "0.2em" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "-0.005em" }}
          transition={{ delay: 1.0, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Sirah Digital
        </motion.h1>

        {/* Gold rule beneath the wordmark */}
        <motion.div
          className="mt-6 mb-6 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(230,191,106,0.7), transparent)",
            width: "min(280px, 60vw)"
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.6, duration: 1.4, ease: "easeOut" }}
        />

        {/* The link */}
        <motion.a
          href="https://sirahdigital.in"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 text-sm md:text-base text-gold-300 hover:text-gold-400 transition tracking-[0.18em] uppercase"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 1.2 }}
        >
          sirahdigital.in
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.a>

        {/* Contact channels — a quiet row of links beneath the website */}
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 1.2 }}
        >
          {CHANNELS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
              aria-label={`${c.label} · ${c.sub ?? ""}`}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className="grid place-items-center w-10 h-10 rounded-full text-royal-100/75 group-hover:text-gold-300 transition"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(13,31,122,0.45), rgba(7,15,61,0.7))",
                  border: "1px solid rgba(230,191,106,0.35)",
                  boxShadow: "0 0 16px rgba(58,91,255,0.25)"
                }}
              >
                {c.icon}
              </span>
              <span className="text-[9.5px] tracking-cinema uppercase text-royal-100/55 group-hover:text-gold-300/85 transition whitespace-nowrap">
                {c.sub ?? c.label}
              </span>
            </a>
          ))}
        </motion.div>

        {/* Studio address */}
        <motion.p
          className="mt-7 text-[10px] md:text-[11px] leading-relaxed text-royal-100/50 max-w-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6, duration: 1.4 }}
        >
          SY No 203/10B, Innov8, Featherlite The Address,
          <br />
          200 Feet Radial Road, Raja Joseph Colony,
          <br />
          Pallavaram, Chennai, Tamil Nadu 600044
        </motion.p>

        {/* Subtle tagline */}
        <motion.p
          className="mt-6 text-[11px] md:text-xs tracking-cinema uppercase text-royal-100/45 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.9, duration: 1.4 }}
        >
          Cinematic experiences · for moments that matter
        </motion.p>

        {/* Restart link at the bottom */}
        <motion.button
          onClick={onRestart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          whileHover={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-[10px] tracking-cinema uppercase text-royal-100/55 hover:text-gold-400"
        >
          <RefreshCw className="w-3 h-3" /> Replay The Inauguration
        </motion.button>
      </div>
    </Scene>
  );
}

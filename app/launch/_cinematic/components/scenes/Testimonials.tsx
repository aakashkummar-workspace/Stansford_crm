"use client";

import { motion } from "framer-motion";
import Scene from "@/cinematic/components/fx/Scene";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import StarField from "@/cinematic/components/fx/StarField";

const cards = [
  {
    role: "Parent",
    name: "Lakshmi · Mother of Aarav, Class X",
    quote: "We feel connected. Every moment of my child's day is now visible — without anxiety.",
    portrait: "P"
  },
  {
    role: "Teacher",
    name: "Mrs. Priya · English Faculty",
    quote: "Communication became effortless. I can finally focus on teaching, not chasing updates.",
    portrait: "T"
  },
  {
    role: "Student",
    name: "Aarav · Class X-A",
    quote: "School feels lighter. Everything I need is in one place — and my parents already know.",
    portrait: "S"
  },
  {
    role: "Management",
    name: "Mr. Rajan · Trust Member",
    quote: "This is the future of our institution. Decisions are now grounded in real data, in real time.",
    portrait: "M"
  }
];

export default function Testimonials() {
  return (
    <Scene>
      <AuroraBackground intensity={0.6} />
      <StarField density={0.00008} speed={0.02} />

      <div className="absolute top-8 left-8 text-[10px] tracking-cinema text-royal-100/55 uppercase">
        Stansford · Chapter 03
      </div>
      <div className="absolute top-8 right-8 text-[10px] tracking-cinema text-gold-400/80 uppercase">
        Voices Of Transformation
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-[min(1280px,94vw)]">
          {cards.map((c, i) => (
            <motion.figure
              key={c.role}
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.4 + i * 0.4, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-strong rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl"
                   style={{ background: "radial-gradient(circle, rgba(230,191,106,0.35), transparent 70%)" }} />
              <Portrait letter={c.portrait} />
              <div className="text-[10px] tracking-cinema uppercase text-gold-400/80 mt-4">{c.role}</div>
              <blockquote className="font-display text-xl md:text-2xl text-cinematic leading-snug mt-2">
                “{c.quote}”
              </blockquote>
              <figcaption className="mt-4 text-[11px] text-royal-100/60">{c.name}</figcaption>
            </motion.figure>
          ))}
        </div>
      </div>

      <motion.div
        className="absolute bottom-10 left-0 right-0 text-center text-xs tracking-cinema uppercase text-royal-100/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 1.2 }}
      >
        — Real voices from our learning community —
      </motion.div>
    </Scene>
  );
}

function Portrait({ letter }: { letter: string }) {
  return (
    <div className="relative w-16 h-16 rounded-full overflow-hidden">
      <div className="absolute inset-0"
           style={{
             background:
               "radial-gradient(circle at 30% 25%, #c4d1ff 0%, #3a5bff 45%, #0d1f7a 100%)"
           }}
      />
      <div className="absolute inset-0 grid place-items-center font-display text-2xl text-white/90">
        {letter}
      </div>
      <div className="absolute inset-0 rounded-full ring-1 ring-gold-400/40" />
    </div>
  );
}

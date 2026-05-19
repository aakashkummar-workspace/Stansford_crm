"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Scene from "@/cinematic/components/fx/Scene";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import StarField from "@/cinematic/components/fx/StarField";
import { Send, Sparkles } from "lucide-react";

const seedMessages = [
  "A future where every child is seen.",
  "Education that travels with them, everywhere.",
  "Less worry. More trust.",
  "Teachers free to teach.",
  "Parents close, even when far.",
  "A school that listens, in real time.",
  "Confidence built every single day.",
  "Light in every classroom.",
  "Knowledge that connects generations.",
  "Where data serves humanity, not the other way round."
];

type Note = { id: number; text: string; x: number; y: number; rot: number; born: number };

export default function PromiseWall() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const idRef = useRef(1);

  // Seed messages stagger-fade in
  useEffect(() => {
    seedMessages.forEach((s, i) => {
      setTimeout(() => {
        setNotes((n) => [
          ...n,
          {
            id: idRef.current++,
            text: s,
            x: 8 + Math.random() * 84,
            y: 12 + Math.random() * 70,
            rot: (Math.random() - 0.5) * 5,
            born: Date.now()
          }
        ]);
      }, 400 + i * 600);
    });
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setNotes((n) => [
      ...n,
      {
        id: idRef.current++,
        text: input.trim(),
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 50,
        rot: (Math.random() - 0.5) * 4,
        born: Date.now()
      }
    ]);
    setInput("");
  };

  return (
    <Scene>
      <AuroraBackground intensity={0.5} />
      <StarField density={0.00009} speed={0.025} />

      <div className="absolute top-8 left-8 text-[10px] tracking-cinema text-royal-100/55 uppercase">
        Stansford · Chapter 04
      </div>
      <div className="absolute top-8 right-8 text-[10px] tracking-cinema text-gold-400/80 uppercase">
        The Promise Wall
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <motion.h2
          className="font-display text-4xl md:text-6xl text-cinematic text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          What future do you want for our students?
        </motion.h2>
        <motion.p
          className="mt-3 text-xs tracking-cinema uppercase text-royal-100/55 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          Leave a promise. Let it rise into the night.
        </motion.p>

        {/* Wall */}
        <div className="relative w-[min(1200px,94vw)] h-[58vh] mt-10 glass rounded-2xl overflow-hidden">
          {/* Floating notes */}
          <AnimatePresence>
            {notes.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, scale: 0.7, y: 30 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [30, 0, -8, 0],
                  rotate: [n.rot - 1, n.rot, n.rot + 1, n.rot]
                }}
                transition={{
                  opacity: { duration: 0.8 },
                  scale: { duration: 0.8 },
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute max-w-[280px] glass-strong rounded-xl px-4 py-3 text-sm text-white/90 border border-royal-300/25"
                style={{
                  left: `${n.x}%`,
                  top: `${n.y}%`,
                  transform: "translate(-50%, -50%)"
                }}
              >
                <Sparkles className="w-3 h-3 text-gold-400 inline mr-1" />
                {n.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="mt-6 w-[min(720px,90vw)] flex items-center gap-3 glass-strong rounded-full pl-5 pr-2 py-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your promise for the next generation…"
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-royal-100/40"
            maxLength={140}
          />
          <button
            type="submit"
            className="btn-cinema !py-2 !px-5 flex items-center gap-2"
            aria-label="Send promise"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </motion.form>
      </div>
    </Scene>
  );
}

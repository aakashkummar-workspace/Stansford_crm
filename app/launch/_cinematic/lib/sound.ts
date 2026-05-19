"use client";

/**
 * Procedural cinematic sound director.
 *
 * Everything is synthesized live with the Web Audio API — no audio assets
 * to ship, so the experience stays self-contained and offline-friendly.
 *
 * Layers:
 *   - Sub drone        ambient atmosphere (very quiet, always on once unlocked)
 *   - Heartbeat        anticipation pulse (silence stage only)
 *   - Build pad        warmer arpeggio bed (feature scenes)
 *   - Uplift pad       hopeful resolution (finale)
 * One-shots:
 *   - impact()         deep cinematic boom (activation)
 *   - whoosh()         transition swell
 *   - chime()          gentle UI shimmer
 *   - tick()           micro click
 *
 * The audio context is suspended until the first user gesture (browser
 * autoplay policy) — call `unlockAudio()` from any click/keydown handler
 * to start the engine.
 */

import { Stage } from "./stages";

type Layer = "drone" | "heartbeat" | "build" | "uplift";

class Director {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverbBus: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private muted = false;
  private currentStage: Stage | null = null;
  private layers: Partial<Record<Layer, { stop: () => void; gain: GainNode }>> = {};
  private listeners: Set<(muted: boolean) => void> = new Set();
  private unlocked = false;

  // Custom-music support. When `musicEl` is set we play that file as the
  // background score and SUPPRESS the procedural pad layers so the synth
  // doesn't fight a real composition. The one-shot impact() boom still
  // fires on activation because it's tightly synced to the orb tap.
  private musicEl: HTMLAudioElement | null = null;
  private musicGain: GainNode | null = null;
  private musicSrc: MediaElementAudioSourceNode | null = null;
  private musicLoaded = false;
  private musicTargetGain = 0.85; // 0..1, sits below master.

  /** Returns true if a custom music file has been loaded (regardless of
   *  whether it's currently playing). */
  hasMusic() {
    return !!this.musicEl && this.musicLoaded;
  }

  /** Returns true if audio is now playing — false if still suspended. */
  unlock(): boolean {
    if (typeof window === "undefined") return false;
    if (!this.ctx) {
      // Cross-browser AudioContext
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctor) return false;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      // Master gain kept conservative — this is a background bed, never
      // foreground. A real PA system will amplify; laptop speakers should
      // still feel calm at this level.
      this.master.gain.value = this.muted ? 0 : 0.45;
      this.master.connect(this.ctx.destination);

      // Algorithmic reverb — long tail for spaciousness. Wet/dry mix favors
      // the reverb so every voice has air around it (film-score feel).
      this.reverbBus = this.ctx.createGain();
      this.dryBus = this.ctx.createGain();
      this.dryBus.gain.value = 0.85;
      this.reverbBus.gain.value = 0.7;
      this.dryBus.connect(this.master);

      const convolver = this.ctx.createConvolver();
      convolver.buffer = makeReverbIR(this.ctx, 4.5, 2.4);
      this.reverbBus.connect(convolver);
      convolver.connect(this.master);
    }
    if (this.ctx.state === "suspended") {
      // resume() returns a Promise; we don't await — caller can ignore.
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    // If a custom music track was queued before unlock, start it now.
    if (this.musicEl && this.musicLoaded) {
      this.startMusic();
    }
    return true;
  }

  isUnlocked() {
    return this.unlocked && this.ctx?.state === "running";
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) {
      const target = muted ? 0 : 0.45;
      const now = this.ctx!.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(target, now + 0.4);
    }
    this.listeners.forEach((cb) => cb(muted));
  }

  isMuted() {
    return this.muted;
  }

  onMuteChange(cb: (muted: boolean) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /**
   * Load a custom music file. The element is routed through the same master
   * gain so mute/volume controls work on it. When this is called and
   * playback starts, ALL procedural pad layers are suppressed so the user's
   * own score carries the experience uncontested.
   *
   * Call from a user gesture (the same one that unlocks audio). Safe to
   * call before `unlock()` — the element will be queued and started once
   * unlock happens.
   */
  loadMusic(url: string, opts?: { volume?: number; stageVolume?: Partial<Record<Stage, number>> }) {
    if (typeof window === "undefined") return;
    if (this.musicEl && this.musicEl.src.endsWith(url)) return; // idempotent

    // Tear down any previously loaded track
    if (this.musicEl) {
      try { this.musicEl.pause(); } catch {}
      this.musicEl = null;
      this.musicSrc?.disconnect();
      this.musicSrc = null;
      this.musicGain?.disconnect();
      this.musicGain = null;
      this.musicLoaded = false;
    }

    const el = new Audio();
    el.src = url;
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    el.volume = 1; // The Web Audio gain node controls our actual level.
    this.musicEl = el;
    if (opts?.volume != null) this.musicTargetGain = opts.volume;
    this.musicStageVolumes = opts?.stageVolume ?? null;

    el.addEventListener("canplay", () => {
      this.musicLoaded = true;
      // Once the audio is fully primed, try to start playback if we're
      // already unlocked. If not, the unlock() handler will pick this up.
      if (this.unlocked) this.startMusic();
      // If we're already in a stage, re-evaluate so procedural pads
      // suppress now that real music is available.
      if (this.currentStage) {
        const s = this.currentStage;
        this.currentStage = null;
        this.setStage(s);
      }
    });

    // If the file doesn't exist (e.g. nobody dropped one in public/music/),
    // quietly fall back to the procedural pads. Keep musicLoaded=false so
    // hasMusic() reports false and setStage() uses the synth layers.
    el.addEventListener("error", () => {
      this.musicLoaded = false;
      this.musicEl = null;
      // If we're already in a stage, re-evaluate so procedural pads kick in.
      if (this.unlocked && this.currentStage) {
        const s = this.currentStage;
        this.currentStage = null;
        this.setStage(s);
      }
    });
  }

  /** Internal — connects the music element to the master bus and plays. */
  private startMusic() {
    if (!this.ctx || !this.master || !this.musicEl) return;
    // MediaElementSource can only be created once per element.
    if (!this.musicSrc) {
      try {
        this.musicSrc = this.ctx.createMediaElementSource(this.musicEl);
      } catch {
        // Element already attached — fall back to letting it play through
        // the default audio output. Volume control via .volume still works,
        // mute toggles via master gain WON'T affect this path. Best to
        // avoid by calling loadMusic only once per session.
        this.musicEl
          .play()
          .catch(() => {});
        return;
      }
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicSrc.connect(this.musicGain).connect(this.master);
      // Fade in gently
      const now = this.ctx.currentTime;
      this.musicGain.gain.linearRampToValueAtTime(
        this.stageMusicGain(),
        now + 2.5
      );
    }
    this.musicEl.play().catch(() => {
      // Autoplay still blocked — user gesture should be the unlock click.
    });
  }

  /** Computes the right music gain for the current stage. */
  private musicStageVolumes: Partial<Record<Stage, number>> | null = null;
  private stageMusicGain(): number {
    const s = this.currentStage;
    if (!s) return this.musicTargetGain;
    const stageVol = this.musicStageVolumes?.[s];
    return stageVol != null ? stageVol : this.musicTargetGain;
  }

  /** Crossfade between stage-appropriate ambient layers. */
  setStage(stage: Stage) {
    if (!this.ctx || !this.unlocked) return;
    if (this.currentStage === stage) return;
    this.currentStage = stage;

    // Update music gain for this stage (smooth crossfade)
    if (this.musicGain && this.musicLoaded) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(this.stageMusicGain(), now + 1.5);
    }

    // Decide which procedural layers should be on for this stage.
    //
    // When a custom music file is loaded, the procedural pads are FULLY
    // suppressed — the user's score is doing the heavy lifting and a synth
    // bed underneath would muddy it. The activation impact() one-shot
    // still fires because it's tap-synchronized.
    const usingCustomMusic = this.hasMusic();
    const wants: Record<Layer, boolean> = usingCustomMusic
      ? { drone: false, heartbeat: false, build: false, uplift: false }
      : {
          drone: true,
          heartbeat: false,
          build:
            stage === "attendance" ||
            stage === "parents" ||
            stage === "transport" ||
            stage === "trust" ||
            stage === "ecosystem" ||
            stage === "testimonials" ||
            stage === "promise",
          uplift: stage === "finale"
        };

    (Object.keys(wants) as Layer[]).forEach((name) => {
      const isOn = !!this.layers[name];
      const shouldBeOn = wants[name];
      if (shouldBeOn && !isOn) this.startLayer(name);
      if (!shouldBeOn && isOn) this.stopLayer(name);
    });
  }

  // ---------- Layers ----------

  private startLayer(name: Layer) {
    if (!this.ctx) return;
    let started: { stop: () => void; gain: GainNode } | null = null;
    if (name === "drone") started = startDrone(this.ctx, this.dryBus!, this.reverbBus!);
    if (name === "heartbeat") started = startHeartbeat(this.ctx, this.dryBus!);
    if (name === "build") started = startBuildPad(this.ctx, this.dryBus!, this.reverbBus!);
    if (name === "uplift") started = startUpliftPad(this.ctx, this.dryBus!, this.reverbBus!);
    if (started) this.layers[name] = started;
  }

  private stopLayer(name: Layer) {
    const l = this.layers[name];
    if (l) {
      l.stop();
      delete this.layers[name];
    }
  }

  // ---------- One-shots ----------

  /**
   * Cinematic activation boom — softer, more "Inception inhale-then-thud"
   * than action-movie crash. Just a deep sub thump with reverb tail and a
   * brief upward shimmer; the harsh noise crash that previously sat on top
   * has been dropped (the user found the old impact too harsh).
   */
  impact() {
    if (!this.ctx || !this.unlocked) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Deep sub thump — the felt-in-the-chest body of the impact
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(70, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 1.6);
    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0, now);
    subG.gain.linearRampToValueAtTime(0.55, now + 0.02);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 2.6);
    sub.connect(subG);
    subG.connect(this.dryBus!);
    subG.connect(this.reverbBus!);
    sub.start(now);
    sub.stop(now + 2.7);

    // 2. Warm body — sine (not saw) gliding 180Hz → 55Hz
    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(180, now);
    body.frequency.exponentialRampToValueAtTime(55, now + 1.1);
    const bodyG = ctx.createGain();
    bodyG.gain.setValueAtTime(0, now);
    bodyG.gain.linearRampToValueAtTime(0.22, now + 0.04);
    bodyG.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    body.connect(bodyG);
    bodyG.connect(this.dryBus!);
    bodyG.connect(this.reverbBus!);
    body.start(now);
    body.stop(now + 1.9);

    // 3. Very quiet shimmer — a brief high sine "halo" that lifts the impact
    //    out of pure low end. Heavy reverb, low gain.
    const halo = ctx.createOscillator();
    halo.type = "sine";
    halo.frequency.setValueAtTime(1320, now);
    halo.frequency.exponentialRampToValueAtTime(660, now + 1.8);
    const haloG = ctx.createGain();
    haloG.gain.setValueAtTime(0, now);
    haloG.gain.linearRampToValueAtTime(0.06, now + 0.1);
    haloG.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    halo.connect(haloG);
    haloG.connect(this.reverbBus!);
    halo.start(now);
    halo.stop(now + 1.9);
  }

  /** Transition swoosh between scenes. */
  whoosh(durationSec = 0.55) {
    if (!this.ctx || !this.unlocked) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const buf = makeNoise(ctx, durationSec + 0.1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 8;
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(3400, now + durationSec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now + durationSec * 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    src.connect(filter).connect(g);
    g.connect(this.dryBus!);
    g.connect(this.reverbBus!);
    src.start(now);
    src.stop(now + durationSec + 0.1);
  }

  /** Soft shimmer chime — gentle reveal punctuation. */
  chime(note: "low" | "mid" | "high" = "mid") {
    if (!this.ctx || !this.unlocked) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const freq = note === "low" ? 660 : note === "high" ? 1480 : 990;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(g);
    g.connect(this.dryBus!);
    g.connect(this.reverbBus!);
    osc.start(now);
    osc.stop(now + 1.4);
  }

  /** Tiny tactile click for hover/press feedback. */
  tick() {
    if (!this.ctx || !this.unlocked) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.07, now + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(g).connect(this.dryBus!);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

// ---------- Layer builders ----------

function startDrone(
  ctx: AudioContext,
  dry: GainNode,
  wet: GainNode
): { stop: () => void; gain: GainNode } {
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.10, now + 4.0);

  // Two detuned low oscillators (E1 + a fifth)
  const o1 = ctx.createOscillator();
  o1.type = "sine";
  o1.frequency.value = 41.2; // E1
  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.value = 61.7; // B1 (perfect fifth)
  const o3 = ctx.createOscillator();
  o3.type = "triangle";
  o3.frequency.value = 82.4; // E2
  const o3g = ctx.createGain();
  o3g.gain.value = 0.4;

  // Slow LFO on master gain for breathing
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.18;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.025;
  const lfoBase = ctx.createConstantSource();
  lfoBase.offset.value = 0.10;
  lfo.connect(lfoG).connect(g.gain);
  lfoBase.start(now);
  lfo.start(now);

  // Gentle lowpass
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 380;
  filt.Q.value = 0.6;

  o1.connect(filt);
  o2.connect(filt);
  o3.connect(o3g).connect(filt);
  filt.connect(g);
  g.connect(dry);
  g.connect(wet);

  o1.start(now);
  o2.start(now);
  o3.start(now);

  return {
    gain: g,
    stop: () => {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 1.4);
      o1.stop(t + 1.6);
      o2.stop(t + 1.6);
      o3.stop(t + 1.6);
      lfo.stop(t + 1.6);
    }
  };
}

function startHeartbeat(
  ctx: AudioContext,
  dry: GainNode
): { stop: () => void; gain: GainNode } {
  const masterG = ctx.createGain();
  masterG.gain.value = 0;
  masterG.connect(dry);
  const now = ctx.currentTime;
  masterG.gain.linearRampToValueAtTime(0.55, now + 2.0);

  let canceled = false;
  const tick = (t: number) => {
    if (canceled) return;
    // Two-thump dum-dum pattern
    pulse(ctx, masterG, t, 65);
    pulse(ctx, masterG, t + 0.22, 58);
    // Schedule next 1.4s out
    const next = t + 1.4;
    const ms = Math.max(20, (next - ctx.currentTime) * 1000 - 200);
    setTimeout(() => tick(next), ms);
  };
  tick(now + 1.0);

  return {
    gain: masterG,
    stop: () => {
      canceled = true;
      const t = ctx.currentTime;
      masterG.gain.cancelScheduledValues(t);
      masterG.gain.setValueAtTime(masterG.gain.value, t);
      masterG.gain.linearRampToValueAtTime(0, t + 1.0);
    }
  };
}

function pulse(ctx: AudioContext, out: AudioNode, when: number, freq: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(0.7, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.32);
  osc.connect(g).connect(out);
  osc.start(when);
  osc.stop(when + 0.34);
}

function startBuildPad(
  ctx: AudioContext,
  dry: GainNode,
  wet: GainNode
): { stop: () => void; gain: GainNode } {
  // A calm, film-score chord progression: Am → F → C → G, each chord held
  // 12 seconds with a 2-second crossfade. Three sine voices per chord (root,
  // third, fifth, with a soft octave doubling on the root) — no saws,
  // no filter sweeps, no LFOs. All movement comes from the chord changes
  // themselves, which is what film scores do.
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  // Very slow swell-in so the bed sneaks in beneath the visuals.
  g.gain.linearRampToValueAtTime(0.075, now + 5.0);

  // Mostly-wet routing — pad lives "in the room", not in your face.
  g.connect(dry);
  g.connect(wet);

  // Notes use scientific frequencies. A3=220, C4=261.6, E4=329.6,
  // F3=174.6, A3=220, C4=261.6, C4=261.6, E4=329.6, G4=392,
  // G3=196, B3=246.9, D4=293.7.
  const chords: Array<[number, number, number]> = [
    [220.0, 261.6, 329.6],    // A minor (A C E)
    [174.6, 220.0, 261.6],    // F major (F A C)
    [261.6, 329.6, 392.0],    // C major (C E G)
    [196.0, 246.9, 293.7]     // G major (G B D)
  ];

  // For each voice, we keep a single oscillator alive and SLIDE its
  // frequency between chord notes. That's how a string section sustains —
  // no re-triggering, just smooth voicing.
  type Voice = { osc: OscillatorNode; gain: GainNode };
  const makeVoice = (initialFreq: number, voiceGain: number, oct = 1): Voice => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = initialFreq * oct;
    const vg = ctx.createGain();
    vg.gain.value = voiceGain;
    osc.connect(vg).connect(g);
    osc.start(now);
    return { osc, gain: vg };
  };

  const v1 = makeVoice(chords[0][0], 0.55);      // root
  const v2 = makeVoice(chords[0][1], 0.40);      // third
  const v3 = makeVoice(chords[0][2], 0.35);      // fifth
  const v4 = makeVoice(chords[0][0], 0.22, 0.5); // sub octave on root

  // Schedule the chord progression — each chord 12s long, with a 2s glide
  // between them. The whole 48s cycle loops indefinitely.
  const CHORD_LEN = 12;
  const GLIDE = 2;
  let canceled = false;

  const scheduleCycle = (startAt: number) => {
    chords.forEach((chord, i) => {
      const at = startAt + i * CHORD_LEN;
      // Glide voices to this chord starting at (at - GLIDE)
      const glideStart = Math.max(startAt, at - GLIDE);
      [v1, v2, v3].forEach((v, j) => {
        v.osc.frequency.cancelScheduledValues(glideStart);
        v.osc.frequency.setValueAtTime(v.osc.frequency.value, glideStart);
        v.osc.frequency.linearRampToValueAtTime(chord[j], at);
      });
      // Sub octave follows the root
      v4.osc.frequency.cancelScheduledValues(glideStart);
      v4.osc.frequency.setValueAtTime(v4.osc.frequency.value, glideStart);
      v4.osc.frequency.linearRampToValueAtTime(chord[0] * 0.5, at);
    });
  };

  // Kick off cycle now, and recursively schedule the next loop ahead.
  const loop = (cycleStartAt: number) => {
    if (canceled) return;
    scheduleCycle(cycleStartAt);
    const nextStartAt = cycleStartAt + chords.length * CHORD_LEN;
    // Schedule the next cycle's wakeup ~2 seconds before the loop boundary
    // so glides line up seamlessly.
    const wakeMs = Math.max(50, (nextStartAt - ctx.currentTime - 2.5) * 1000);
    setTimeout(() => loop(nextStartAt), wakeMs);
  };
  loop(now);

  return {
    gain: g,
    stop: () => {
      canceled = true;
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 3.0);
      [v1, v2, v3, v4].forEach(({ osc }) => osc.stop(t + 3.2));
    }
  };
}

function startUpliftPad(
  ctx: AudioContext,
  dry: GainNode,
  wet: GainNode
): { stop: () => void; gain: GainNode } {
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.11, now + 3.0);

  // Major triad — hopeful
  const freqs = [261.6, 329.6, 392.0, 523.2]; // C E G C
  const oscs = freqs.map((freq, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.value = freq;
    o.detune.value = (i - 1) * 4;
    return o;
  });

  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 2800;
  f.Q.value = 0.7;

  oscs.forEach((o) => o.connect(f));
  f.connect(g);
  g.connect(dry);
  g.connect(wet);

  oscs.forEach((o) => o.start(now));

  return {
    gain: g,
    stop: () => {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 2.0);
      oscs.forEach((o) => o.stop(t + 2.2));
    }
  };
}

// ---------- Helpers ----------

function makeNoise(ctx: AudioContext, sec: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * sec));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  return buf;
}

function makeReverbIR(
  ctx: AudioContext,
  durationSec: number,
  decay: number
): AudioBuffer {
  // Exponentially-decaying stereo white noise — simple but pleasant IR
  const len = Math.floor(ctx.sampleRate * durationSec);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

// ---------- Singleton + React hook ----------

let _director: Director | null = null;
export function getDirector(): Director {
  if (!_director) _director = new Director();
  return _director;
}

import { useEffect, useState } from "react";

/** Returns the director plus mute state. Call director.unlock() on a user gesture. */
export function useSoundDirector() {
  const dir = getDirector();
  const [muted, setMuted] = useState(dir.isMuted());
  useEffect(() => dir.onMuteChange(setMuted), [dir]);
  return { director: dir, muted };
}

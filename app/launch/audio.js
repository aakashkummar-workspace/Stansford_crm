"use client";

// ---------------------------------------------------------------------------
// Sound design for the inauguration experience.
// ---------------------------------------------------------------------------
// Everything is synthesised in WebAudio — no files to ship, no autoplay
// surprises, no CORS friction. The orchestra is built from a handful of
// oscillators routed through a lowpass + reverb-ish delay tail.
//
// Two layers:
//   * Ambient   — continuous pad that crossfades when the scene changes.
//                 Each scene picks a "mode" (mood + chord) and the engine
//                 ramps the previous mode out while ramping the new one in.
//   * Cues      — short one-shots fired at specific moments: headline
//                 reveals, sequence transitions, the activation burst,
//                 promise submissions, etc.
//
// Browser autoplay policy:
//   AudioContext must be created (or resumed) inside a user gesture. The
//   manager defers creation until the first `unmute()` or `cue()` call —
//   both of which are wired to button clicks in the UI, so the policy is
//   satisfied naturally.
// ---------------------------------------------------------------------------

// Mode → chord (semitones from A2) + texture descriptor.
// Picking notes from minor pentatonic / major triads gives us emotion
// without leaving the same key, so cross-fading between modes never feels
// jarring on the ear.
const MODES = {
  preloader:    { freqs: [55, 82.5, 110],          color: 0.18, name: "low drone"     },
  intro:        { freqs: [110, 165, 220, 330],     color: 0.32, name: "anticipation"  },
  orb:          { freqs: [110, 220, 277.18, 330],  color: 0.42, name: "pulsing hum"   },
  // 'activating' has no sustained ambient — the burst takes over and the
  // bed silently swaps to 'sequence' under the noise floor.
  sequence:     { freqs: [146.83, 220, 293.66, 440], color: 0.55, name: "data flow"   },
  testimonials: { freqs: [130.81, 196, 261.63, 329.63], color: 0.45, name: "warm pad" },
  promise:      { freqs: [196, 293.66, 392, 587.33], color: 0.60, name: "starlight"   },
  finale:       { freqs: [110, 164.81, 220, 329.63, 440], color: 0.70, name: "triumph" },
  silent:       { freqs: [],                       color: 0,    name: "silence"       },
};

export function createSoundManager() {
  let ctx = null;
  let master = null;          // master gain — flipped to 0 on mute
  let convolver = null;       // soft reverb-ish via short impulse
  let ambient = null;         // currently playing ambient {voices, gain, lfo}
  let pulseOsc = null;        // optional sub-bass pulse for the orb scene
  let currentMode = null;
  let muted = true;

  function ensureContext() {
    if (ctx) return ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();

    // Master — flipped between 0 and 1 to mute/unmute without tearing
    // down the graph (so we don't have to rebuild ambient voices).
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    // Cheap "reverb" via short noise impulse. Adds depth to sustained
    // pads without shipping an impulse-response file.
    convolver = ctx.createConvolver();
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 1.6);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        // Exponential decay, lightly noisy.
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
    }
    convolver.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    convolver.connect(wet); wet.connect(master);
    // We hand both the dry input (master) and the wet input (convolver)
    // out so cues / ambient layers can pick how much to send.
    return ctx;
  }

  function buildAmbientFor(mode) {
    if (!ctx) return null;
    const cfg = MODES[mode] || MODES.silent;
    if (cfg.freqs.length === 0) return null;

    const out = ctx.createGain(); out.gain.value = 0;     // ramped up later
    const lp  = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600 + cfg.color * 1400;          // warmer or brighter per mode
    lp.Q.value = 0.5;

    // Slow LFO modulating the filter cutoff so the pad breathes.
    const lfo  = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.08 + Math.random() * 0.06;
    lfoG.gain.value = 240;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    lfo.start();

    // Each note is two slightly detuned saw/triangle oscillators, panned
    // gently for stereo width.
    const voices = [];
    cfg.freqs.forEach((f, i) => {
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) pan.pan.value = ((i % 2 === 0 ? -1 : 1)) * 0.35;

      const a = ctx.createOscillator(); a.type = "sawtooth"; a.frequency.value = f;
      const b = ctx.createOscillator(); b.type = "triangle"; b.frequency.value = f * 1.005;
      const g = ctx.createGain(); g.gain.value = 0.10;       // per-voice level
      a.connect(g); b.connect(g);
      if (pan) { g.connect(pan); pan.connect(lp); } else { g.connect(lp); }
      a.start(); b.start();
      voices.push({ a, b, g, pan });
    });

    lp.connect(out);
    out.connect(master);
    // Send a little to the reverb tail too.
    const sendG = ctx.createGain(); sendG.gain.value = 0.45;
    out.connect(sendG); sendG.connect(convolver);

    return { out, lp, lfo, voices };
  }

  function setAmbient(mode) {
    ensureContext();
    if (!ctx) return;
    if (mode === currentMode) return;
    currentMode = mode;

    const now = ctx.currentTime;
    const next = buildAmbientFor(mode);

    // Fade old layer out, then disconnect after the ramp.
    if (ambient) {
      const old = ambient;
      old.out.gain.cancelScheduledValues(now);
      old.out.gain.setValueAtTime(old.out.gain.value, now);
      old.out.gain.linearRampToValueAtTime(0.0001, now + 1.8);
      setTimeout(() => {
        try {
          old.voices.forEach((v) => { v.a.stop(); v.b.stop(); });
          old.lfo.stop();
          old.out.disconnect();
        } catch {}
      }, 2200);
    }

    ambient = next;
    if (next) {
      next.out.gain.setValueAtTime(0.0001, now);
      next.out.gain.linearRampToValueAtTime(0.6, now + 2.2);
    }
  }

  // Short oscillator burst with an envelope. Used for one-shot cues.
  // type: 'reveal' | 'ping' | 'whoosh' | 'chime' | 'tick' | 'burst' | 'orbPulse' | 'finale'
  function cue(type) {
    ensureContext();
    if (!ctx || muted) return;
    const now = ctx.currentTime;

    const route = (oscOrSrc, gain, dur, sendReverb = true) => {
      oscOrSrc.connect(gain);
      gain.connect(master);
      if (sendReverb) {
        const send = ctx.createGain(); send.gain.value = 0.35;
        gain.connect(send); send.connect(convolver);
      }
      if (oscOrSrc.start) {
        oscOrSrc.start(now);
        oscOrSrc.stop(now + dur);
      }
    };

    switch (type) {
      case "reveal": {
        // Soft gentle ding when a headline appears.
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 880;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        route(o, g, 1.5);
        break;
      }
      case "ping": {
        // High data-ping when a UI element appears in a sequence.
        const o = ctx.createOscillator(); o.type = "triangle";
        o.frequency.setValueAtTime(1320, now);
        o.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.10, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        route(o, g, 0.5);
        break;
      }
      case "whoosh": {
        // Filtered noise sweep — scene-to-scene transition.
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass"; bp.Q.value = 1.2;
        bp.frequency.setValueAtTime(400, now);
        bp.frequency.exponentialRampToValueAtTime(3200, now + 0.7);
        const g = ctx.createGain(); g.gain.value = 0.32;
        src.connect(bp); bp.connect(g); g.connect(master);
        src.start(now);
        break;
      }
      case "chime": {
        // Two-note major-third chime when a promise is added.
        [659.25, 987.77].forEach((f, i) => {
          const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
          const g = ctx.createGain();
          const t = now + i * 0.07;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
          o.connect(g); g.connect(master);
          const send = ctx.createGain(); send.gain.value = 0.45;
          g.connect(send); send.connect(convolver);
          o.start(t); o.stop(t + 2);
        });
        break;
      }
      case "tick": {
        // Soft tick — bus passing a stop, or a list item appearing.
        const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = 1100;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.05, now + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        route(o, g, 0.1, false);
        break;
      }
      case "orbPulse": {
        // Sub-bass thump that syncs with the orb's visible pulse.
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 55;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        route(o, g, 1.0);
        break;
      }
      case "burst": {
        // The activation moment — rising swell + sub-bass boom + bright shimmer.
        // This is the loudest cue on purpose; it's the emotional peak.
        const o1 = ctx.createOscillator(); o1.type = "sine";
        o1.frequency.setValueAtTime(220, now);
        o1.frequency.exponentialRampToValueAtTime(1100, now + 1.6);
        const o2 = ctx.createOscillator(); o2.type = "triangle";
        o2.frequency.setValueAtTime(55, now);
        o2.frequency.exponentialRampToValueAtTime(110, now + 2.0);
        const o3 = ctx.createOscillator(); o3.type = "sawtooth";
        o3.frequency.setValueAtTime(330, now);
        o3.frequency.exponentialRampToValueAtTime(660, now + 1.8);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.55, now + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

        // Noise crash overlay for the "explosion" feel.
        const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);
        const noise = ctx.createBufferSource(); noise.buffer = buf;
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2000;
        const ng = ctx.createGain(); ng.gain.value = 0.3;
        noise.connect(hp); hp.connect(ng); ng.connect(master);

        o1.connect(g); o2.connect(g); o3.connect(g);
        g.connect(master);
        const sendBurst = ctx.createGain(); sendBurst.gain.value = 0.55;
        g.connect(sendBurst); sendBurst.connect(convolver);

        o1.start(now); o2.start(now); o3.start(now); noise.start(now);
        o1.stop(now + 3.6); o2.stop(now + 3.6); o3.stop(now + 3.6);
        break;
      }
      case "finale": {
        // Triumphant major chord — held longer than other cues.
        [261.63, 329.63, 392, 523.25].forEach((f, i) => {
          const o = ctx.createOscillator(); o.type = i % 2 === 0 ? "sine" : "triangle"; o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.14, now + 0.4);
          g.gain.setValueAtTime(0.14, now + 2.0);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
          o.connect(g); g.connect(master);
          const send = ctx.createGain(); send.gain.value = 0.6;
          g.connect(send); send.connect(convolver);
          o.start(now); o.stop(now + 5);
        });
        break;
      }
      default: break;
    }
  }

  // The orb scene wants a recurring sub-bass thump on its pulse. Start it
  // when scene 2 begins, stop it when scene 2 ends.
  function startOrbPulse() {
    ensureContext();
    if (!ctx) return;
    stopOrbPulse();
    // Schedule a thump every 3s, matching the CSS animation cadence.
    const tick = () => {
      cue("orbPulse");
      pulseOsc = setTimeout(tick, 3000);
    };
    pulseOsc = setTimeout(tick, 200);
  }
  function stopOrbPulse() {
    if (pulseOsc) { clearTimeout(pulseOsc); pulseOsc = null; }
  }

  function setMuted(next) {
    muted = next;
    if (!ctx) {
      // No context yet means no sound is playing — flip the flag and bail.
      return;
    }
    // Resume the context on unmute (some browsers suspend it until a
    // gesture even after creation).
    if (!next && ctx.state === "suspended") ctx.resume?.();
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.linearRampToValueAtTime(next ? 0 : 1, now + 0.25);
  }

  function dispose() {
    stopOrbPulse();
    if (!ctx) return;
    try { ctx.close(); } catch {}
    ctx = null; master = null; convolver = null; ambient = null; currentMode = null;
  }

  return {
    ensureContext,           // call from a click handler to satisfy autoplay policy
    setAmbient,
    cue,
    startOrbPulse,
    stopOrbPulse,
    setMuted,
    dispose,
  };
}

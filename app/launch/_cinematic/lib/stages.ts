export type Stage =
  | "preload"
  | "intro"
  | "silence"
  | "activation"
  | "attendance"
  | "parents"
  | "transport"
  | "trust"
  | "ecosystem"
  | "testimonials"
  | "promise"
  | "finale"
  | "credits";

export const STAGE_ORDER: Stage[] = [
  "preload",
  "intro",
  "silence",
  "activation",
  "attendance",
  "parents",
  "transport",
  "trust",
  "ecosystem",
  "testimonials",
  "promise",
  // Credits ("Developed by Sirah Digital") plays BEFORE the finale so the
  // final beat the audience sees is the brand emblem + "Explore Platform"
  // CTA — that's the natural hand-off into the live product.
  "credits",
  "finale"
];

// Auto-advance durations (ms). preload/intro/silence are user-triggered or self-paced.
// "activation" is short and triggers the cascade.
//
// Snappy cinematic pacing — device frames now sit "at a distance" so the
// audience reads them as a glimpse, not a walkthrough. Total post-orb-tap
// runtime is ~78s, designed to keep the room leaning in.
//
//   preload     3800
//   intro       7400
//   activation  2600
//   attendance  9500  — roster + face-scan + parent ping
//   parents     9000  — composer types out + 3 phone messages stagger
//   transport   9500  — bus loop is 8s; viewer sees a full revolution
//   trust      10000  — densest screen; KPI tiles + chart + alerts
//   ecosystem   7500
//   testimonials 8500
//   promise     9500
//
// To slow for a contemplative auditorium audience: multiply all by 1.25.
export const STAGE_DURATIONS: Partial<Record<Stage, number>> = {
  preload: 3800,
  intro: 7400,
  activation: 3600,
  attendance: 9500,
  parents: 9000,
  transport: 9500,
  trust: 10000,
  ecosystem: 7500,
  testimonials: 8500,
  promise: 9500,
  // Credits ("Developed by Sirah Digital") plays for ~22s — long enough to
  // read the studio name + contact channels, then auto-advances into the
  // emotional final beat.
  credits: 22000,
  // Finale is the end card and stays on screen forever (host restarts with
  // R or via the Replay link). This is the moment the audience sits with
  // "The Next Generation Of Education Starts Here" and the "Explore
  // Platform" CTA.
  finale: 999_999
};

export function nextStage(current: Stage): Stage {
  const i = STAGE_ORDER.indexOf(current);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return current;
  return STAGE_ORDER[i + 1];
}

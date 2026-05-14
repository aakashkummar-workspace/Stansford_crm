// Cinematic digital inauguration experience for the Sanfort International
// School CRM launch event. Lives outside the regular app shell — no
// sidebar, no top bar, no auth required. The Chief Guest opens this URL on
// the projector, taps the activation orb once, and the whole ecosystem
// reveal plays itself out automatically.
//
// Route:  /launch
// Open in fullscreen (F11 or the on-screen Fullscreen button) for the
// best cinematic effect at the live event.

import LaunchExperience from "./LaunchExperience";

export const dynamic = "force-static";
export const metadata = {
  title: "Sanfort International School · Digital Inauguration",
  description:
    "Cinematic launch of the Sanfort International School CRM & Management System — presented by Sirah Digital.",
};

export default function LaunchPage() {
  return <LaunchExperience />;
}

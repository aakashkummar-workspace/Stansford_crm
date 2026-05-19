// PostCSS pipeline: tailwindcss → autoprefixer.
//
// Tailwind is configured to be utilities-only (no preflight reset), and its
// content scan is scoped to `./app/launch/**/*` — so the main CRM's CSS is
// left alone and only the cinematic page picks up Tailwind utilities.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

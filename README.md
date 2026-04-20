# Vidyalaya360 · Saraswati Trust Control Tower

Fullstack Next.js port of the Claude-designed Vidyalaya360 ERP + CRM for schools.

**Stack:** Next.js 14 (App Router) · React 18 · JSON-file persistence · API routes for
server-side writes.

## What's in it

- **18 screens** across four roles — Super Admin (Trust / Schools / Donors / Users / Audit /
  Settings), Principal (Dashboard / Money / Fees / Students / Academic / Staff / Transport /
  Inventory / Comms / Admissions / Complaints / Automation), Teacher, and Parent.
- **Desktop + iPhone frame** via the Tweaks panel (⌘K) or bottom-right toggle. Fully
  mobile-responsive CSS under 820px.
- **Live interactions wired to the backend:**
  - Fees: pick pending student → UPI QR → mark paid → receipt (POSTs `/api/fees/pay`)
  - Complaints: Open → In Progress → Resolved (PATCH `/api/complaints`)
  - Admissions: New → Contacted → Converted (PATCH `/api/enquiries`)
  - Transport: board / mark absent per stop (POST `/api/transport/board`)
  - Audit log tails live events written by the routes above.
- **Theme toggle** (light/dark), density (compact/balanced/spacious), sidebar (expanded/icons),
  and role switcher persist to `localStorage`.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The JSON datastore is seeded on first request to `data/db.json` from `lib/seed.js`. Delete that
file to reset.

## Layout

```
app/
  layout.jsx           Root layout · Google Fonts
  page.jsx             Server component · reads DB, passes shaped data to AppShell
  globals.css          Design system (paper + warm cream + amber)
  api/
    data/route.js              GET all data
    fees/pay/route.js          POST mark fee paid
    complaints/route.js        PATCH status
    enquiries/route.js         PATCH status / POST new
    transport/board/route.js   POST board / absent
components/
  AppShell.jsx         Client shell · role + view + screen routing + topbar
  Sidebar.jsx          Role-based nav
  MobileShell.jsx      iPhone frame + bottom tab bar
  Tweaks.jsx           ⌘K settings panel
  Icon.jsx             Inline SVG icon set
  ui.jsx               KPI, Sparkline, LineBarChart, BarChart, Ring, StatusChip, FakeQR, AvatarChip
  screens/             One file per screen (18)
lib/
  db.js                JSON-file persistence + patch/append/logAudit helpers
  seed.js              Initial data (Indian school context · classes 1–8 · UPI / ₹)
  format.js            money / moneyK helpers
```

## Notes

- The UPI QR is a deterministic fake pattern drawn in SVG — no external image.
- Money is in `en-IN` locale with Lakh/Crore truncation.
- The `data/` directory is git-ignored. Seed data lives in `lib/seed.js` so resetting the DB
  is just `rm data/db.json`.

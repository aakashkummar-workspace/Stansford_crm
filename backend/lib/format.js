// Indian-format money helpers, used both server- and client-side.

export const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

export const moneyK = (n) => {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + "Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + n;
};

// Canonical list of fee categories the school collects. Order matters — it's
// the order they appear in pickers, in the receipt particulars, and in the
// Reports breakdown. Both `key` (slug, used as the storage value) and `label`
// (display text) are exported so server validation and UI rendering agree.
export const FEE_TYPES = [
  // 'annual' is the bucket the bulk Excel import drops every student's
  // per-row Fees amount into — schools that quote a single yearly tuition
  // number (rather than splitting into Term I/II/III) live here.
  { key: "annual",      label: "Annual Fees" },
  { key: "application", label: "Application Fees" },
  { key: "kit",         label: "Kit Fees" },
  { key: "eca",         label: "ECA" },
  { key: "uniform",     label: "Uniform" },
  { key: "term1",       label: "Term I" },
  { key: "term2",       label: "Term II" },
  { key: "term3",       label: "Term III" },
  { key: "van",         label: "Van" },
  { key: "stem",        label: "STEM Fees" },
  { key: "annualday",   label: "Annual Day" },
];

const FEE_TYPE_BY_KEY = Object.fromEntries(FEE_TYPES.map((t) => [t.key, t]));

// Resolve a stored key to its display label. Unknown keys (or older records
// with no key at all) fall back to "Term I" — the most common bucket.
export function feeTypeLabel(key) {
  return FEE_TYPE_BY_KEY[key]?.label || FEE_TYPE_BY_KEY.term1.label;
}

// Validate + slug an arbitrary input down to a known FEE_TYPES key. Returns
// the canonical key, or "term1" if the input doesn't match anything.
export function normalizeFeeType(raw) {
  const k = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return FEE_TYPE_BY_KEY[k] ? k : "term1";
}

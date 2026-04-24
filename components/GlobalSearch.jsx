"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

// Cross-entity client-side search. Matches against the data already in memory
// (everything we render comes from `E`), so it's instantaneous and works
// while offline. Each result knows which screen to jump to via setCurrent.

const TYPE_META = {
  student:    { label: "Student",    icon: "students",  screen: "students" },
  fee:        { label: "Pending fee",icon: "fees",      screen: "fees" },
  paid:       { label: "Paid fee",   icon: "check",     screen: "fees" },
  staff:      { label: "Staff",      icon: "staff",     screen: "staff" },
  route:      { label: "Route",      icon: "bus",       screen: "transport" },
  inventory:  { label: "Inventory",  icon: "box",       screen: "inventory" },
  enquiry:    { label: "Admission",  icon: "enquiry",   screen: "enquiries" },
  complaint:  { label: "Complaint",  icon: "complaint", screen: "complaints" },
  donor:      { label: "Donor",      icon: "donors",    screen: "donors" },
  campaign:   { label: "Campaign",   icon: "send",      screen: "donors" },
  template:   { label: "Template",   icon: "mail",      screen: "communication" },
  klass:      { label: "Class",      icon: "book",      screen: "classes" },
};

function buildIndex(E) {
  const out = [];
  const push = (type, id, title, sub) => out.push({ type, id, title, sub });
  (E.ADDED_STUDENTS || []).forEach((s) => push("student", s.id, s.name, `${s.id} · Class ${s.cls} · ${s.parent}`));
  (E.PENDING_FEES   || []).forEach((f) => push("fee", f.id, `₹${f.amount} pending — ${f.name}`, `${f.id} · Class ${f.cls} · due ${f.due}`));
  (E.RECENT_FEES    || []).forEach((f) => push("paid", f.id, `₹${f.amount} paid — ${f.name}`, `${f.id} · ${f.method} · ${f.time}`));
  (E.STAFF          || []).forEach((s) => push("staff", s.id, s.name, `${s.id} · ${s.role} · ${s.dept}`));
  (E.ROUTES         || []).forEach((r) => push("route", r.code, `${r.code} — ${r.name}`, `Driver: ${r.driver} · ${r.bus}`));
  (E.INVENTORY      || []).forEach((i) => push("inventory", i.id, i.name, `${i.id} · ${i.category} · ${i.onHand} on hand`));
  (E.ENQUIRIES      || []).forEach((e) => push("enquiry", e.id, e.name, `${e.id} · Class ${e.cls} · ${e.status}`));
  (E.COMPLAINTS     || []).forEach((c) => push("complaint", c.id, c.student || c.id, `${c.id} · ${c.status} · ${c.issue?.slice(0, 60) || ""}`));
  (E.DONORS         || []).forEach((d) => push("donor", d.id, d.name, `${d.id} · ${d.type} · ₹${d.ytd} YTD`));
  (E.CAMPAIGNS      || []).forEach((c) => push("campaign", c.id, c.name, `${c.status} · ${c.raised}/${c.goal}`));
  (E.TEMPLATES      || []).forEach((t) => push("template", t.id, t.name, `${t.channel} · template`));
  (E.CLASSES        || []).forEach((c) => push("klass", `class-${c.n}`, c.label || `Class ${c.n}`, `Sections: ${(c.sections || []).join(", ")}`));
  return out;
}

function scoreMatch(item, q) {
  const needle = q.toLowerCase();
  const inTitle = item.title?.toLowerCase().includes(needle);
  const inSub   = item.sub?.toLowerCase().includes(needle);
  const inId    = item.id?.toString().toLowerCase().includes(needle);
  if (!inTitle && !inSub && !inId) return -1;
  let s = 0;
  if (inTitle) s += 10;
  if (item.title?.toLowerCase().startsWith(needle)) s += 8;
  if (inId)    s += 5;
  if (inSub)   s += 1;
  return s;
}

export default function GlobalSearch({ E, role, setCurrent, placeholder }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const index = useMemo(() => buildIndex(E), [E]);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return index
      .map((it) => ({ it, s: scoreMatch(it, query) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.it);
  }, [index, query]);

  useEffect(() => { setActive(0); }, [query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Cmd/Ctrl+F focuses the input (preventing browser find — appropriate for an
  // app like this where global app-search is the primary expectation)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(it) {
    const meta = TYPE_META[it.type];
    if (meta?.screen && setCurrent) setCurrent(meta.screen);
    setOpen(false);
    setQuery("");
  }

  function onInputKey(e) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active]); }
  }

  return (
    <div ref={wrapRef} className="topbar-search" style={{ position: "relative" }}>
      <Icon name="search" size={14} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKey}
        placeholder={placeholder}
      />

      {open && query.trim() && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--card)", border: "1px solid var(--rule)",
            borderRadius: 12, padding: 4, zIndex: 200, maxHeight: 420, overflowY: "auto",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "16px 14px", fontSize: 12, color: "var(--ink-3)" }}>
              No matches for <b style={{ color: "var(--ink)" }}>“{query}”</b>. Try a name, ID, class, or status.
            </div>
          ) : (
            results.map((it, i) => {
              const meta = TYPE_META[it.type] || {};
              const isActive = i === active;
              return (
                <div
                  key={`${it.type}-${it.id}-${i}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(it)}
                  style={{
                    display: "flex", gap: 10, alignItems: "center",
                    padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    background: isActive ? "var(--bg-2)" : "transparent",
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "var(--bg-2)", color: "var(--ink-3)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}>
                    <Icon name={meta.icon || "search"} size={13} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {it.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {it.sub}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 5,
                    background: "var(--bg-2)", color: "var(--ink-3)",
                    textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500,
                    flexShrink: 0,
                  }}>{meta.label || it.type}</span>
                </div>
              );
            })
          )}
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "8px 10px 4px",
            borderTop: "1px dashed var(--rule)", marginTop: 4,
            fontSize: 10.5, color: "var(--ink-4)",
          }}>
            <span>{results.length ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Type to search"}</span>
            <span>↑↓ navigate · ↵ open · esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}

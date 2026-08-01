"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Icon from "../Icon";
import { KPI } from "../ui";
import { formatClassLabel } from "@/lib/format";

// Built-in category buckets. Schools can also add their own — those show up
// alongside these in the filter strip via `extraCatsFromItems` below.
const BUILTIN_CATS = [
  { k: "book",    label: "Books" },
  { k: "uniform", label: "Uniforms" },
  { k: "asset",   label: "Assets" },
];
const BASE_FILTERS = [{ k: "all", label: "All" }];
const TAIL_FILTERS = [{ k: "out", label: "Out of stock" }];

// Spreadsheet header aliases → canonical inventory fields.
const COLUMN_ALIASES = {
  name:      ["name", "item", "itemname", "product", "sku", "description"],
  category:  ["category", "type", "bucket", "group"],
  cls:       ["class", "cls", "section", "classname", "classsection"],
  onHand:    ["onhand", "qty", "quantity", "stock", "onhandqty", "balance", "count"],
  min:       ["min", "minimum", "reorder", "minstock", "reorderlevel"],
  unitPrice: ["unitprice", "price", "rate", "cost", "unitcost", "mrp"],
  supplier:  ["supplier", "vendor", "dealer"],
};

function normHeader(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inferColumnMap(headers) {
  const map = {};
  const norm = headers.map(normHeader);
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = norm.indexOf(alias);
      if (idx !== -1) { map[field] = idx; break; }
    }
  }
  return map;
}

// Pretty-print a category id ("lab_equipment" → "Lab equipment") for chips,
// the filter strip, and the table.
function prettyCat(c) {
  if (!c) return "—";
  const s = String(c).replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Toast({ msg, tone, onClose }) {
  if (!msg) return null;
  const bg = tone === "ok" ? "var(--ok)" : tone === "err" ? "var(--err, #b13c1c)" : "var(--ink)";
  return (
    <div onClick={onClose} role="status" style={{
      position: "fixed", bottom: 18, right: 18, zIndex: 9000,
      background: bg, color: "#fff", padding: "9px 14px", borderRadius: 8,
      fontSize: 12, fontWeight: 500, cursor: "pointer", maxWidth: 360,
      boxShadow: "0 12px 30px -16px rgba(0,0,0,0.35)",
    }}>{msg}</div>
  );
}

function ModalShell({ title, sub, onClose, children, width = 460 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: width, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">{title}</div>
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{hint}</span>}
    </label>
  );
}

export default function ScreenInventory({ E, refresh, role }) {
  const canEdit = role === "principal" || role === "admin";
  const [filter, setFilter] = useState("all");
  // "" = no class filter; "all" = only shared (cls === "all") items; any other
  // value = that specific class-section plus the shared items (since shared
  // items are available to every class).
  const [classFilter, setClassFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMove, setShowMove] = useState(null); // 'in' | 'out' | null
  const [movePreset, setMovePreset] = useState(null); // pre-selected itemId
  const [toast, setToast] = useState(null);

  const items = E.INVENTORY || [];
  const movements = E.MOVEMENTS || [];
  const classes = E.CLASSES || [];
  // Categories the user explicitly saved via the "Save category" button.
  // Persisted server-side so they show up even before any item uses them.
  const savedCats = E.INVENTORY_CATEGORIES || [];

  const isOut = (it) => (it.onHand ?? 0) === 0;

  // Merge: built-in buckets + explicitly-saved + categories derived from
  // existing items (back-compat — older items had categories that were never
  // saved separately). Dedupe by id, preserving order.
  const allCats = useMemo(() => {
    const seen = new Set(BUILTIN_CATS.map((c) => c.k));
    const extras = [];
    const addOne = (k) => {
      if (!k || seen.has(k)) return;
      seen.add(k); extras.push(k);
    };
    savedCats.forEach(addOne);
    for (const i of items) addOne(i.category);
    return [...BUILTIN_CATS, ...extras.map((k) => ({ k, label: prettyCat(k) }))];
  }, [items, savedCats]);
  const FILTERS = useMemo(
    () => [...BASE_FILTERS, ...allCats, ...TAIL_FILTERS],
    [allCats]
  );

  // Dropdown options: every distinct cls seen on items. "all" is filtered out
  // because it's offered as a dedicated "All-class items only" entry; actual
  // class sections ("2-A", "5-A", …) are listed separately.
  const classOptions = useMemo(() => {
    const set = new Set();
    for (const i of items) if (i.cls) set.add(i.cls);
    return [...set].filter((c) => c !== "all").sort();
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "out") list = list.filter(isOut);
    else if (filter !== "all") list = list.filter((i) => i.category === filter);
    if (classFilter) {
      list = list.filter((i) => {
        if (classFilter === "all") return i.cls === "all";
        // A specific class sees its own items and everything tagged "all".
        return i.cls === classFilter || i.cls === "all";
      });
    }
    return list;
  }, [items, filter, classFilter]);

  const totalSkus = items.length;
  const outCount  = items.filter(isOut).length;
  const stockValue = items.reduce((a, i) => a + (i.onHand || 0) * (i.unitPrice || 0), 0);
  const supplierCount = new Set(items.map((i) => i.supplier).filter(Boolean)).size;

  // Class-wise health — bucketed by out-of-stock count.
  const classHealth = useMemo(() => {
    const map = new Map();
    for (const i of items) {
      const key = i.cls || "Unassigned";
      if (!map.has(key)) map.set(key, { items: 0, out: 0 });
      const e = map.get(key);
      e.items += 1;
      if (isOut(i)) e.out += 1;
    }
    return [...map.entries()].sort((a, b) => b[1].out - a[1].out);
  }, [items]);

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleAdd(payload) {
    const r = await fetch("/api/inventory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to add item");
    setShowAdd(false);
    showToast(`${json.item.name} added (${json.item.id})`, "ok");
    await refresh?.();
  }

  async function handleImport(rows) {
    const r = await fetch("/api/inventory/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Import failed");
    const okN = json.imported?.length || 0;
    const errN = json.errors?.length || 0;
    showToast(
      errN
        ? `Imported ${okN} · ${errN} skipped`
        : `Imported ${okN} item${okN === 1 ? "" : "s"}`,
      errN && !okN ? "err" : "ok",
    );
    await refresh?.();
    return json;
  }

  // Persist a new category id (without needing to add an item). Returns the
  // canonical slug the server stored, so the modal can preselect it.
  async function handleSaveCategory(rawCategory) {
    const r = await fetch("/api/inventory/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: rawCategory }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to save category");
    showToast(`Category "${prettyCat(json.category)}" saved`, "ok");
    await refresh?.();
    return json.category;
  }

  async function handleMove(type, payload) {
    const r = await fetch("/api/inventory/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
    setShowMove(null); setMovePreset(null);
    showToast(`${json.item.name}: ${type === "in" ? "+" : "-"}${payload.qty} (now ${json.item.onHand} on hand)`, "ok");
    await refresh?.();
  }

  async function handleRemove(it) {
    if (!confirm(`Remove ${it.name} from inventory?`)) return;
    try {
      const r = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: it.id }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`${it.name} removed`, "ok");
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
  }

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const fmtRupees = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const iconForCat = (c) => c === "book" ? "book" : c === "uniform" ? "user" : "box";
  const colourSoftForCat = (c) => c === "book" ? "var(--info-soft, #dfe9f3)" : c === "uniform" ? "var(--accent-soft)" : "var(--card-2)";
  const colourInkForCat = (c) => c === "book" ? "var(--info, #4a6b8c)" : c === "uniform" ? "var(--accent-2)" : "var(--ink-3)";

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Operations · Inventory</div>
          <div className="page-title">Inventory <span className="amber">register</span></div>
          <div className="page-sub">Books · uniforms · assets · class-wise stock</div>
        </div>
        <div className="page-actions">
          {canEdit && (
            <>
              <button className="btn" onClick={() => setShowImport(true)} title="Bulk-import items from an Excel/CSV file">
                <Icon name="upload" size={13} />Import Excel
              </button>
              <button className="btn" onClick={() => { setMovePreset(null); setShowMove("in"); }} disabled={items.length === 0}>
                <Icon name="upload" size={13} />Stock in
              </button>
              <button className="btn" onClick={() => { setMovePreset(null); setShowMove("out"); }} disabled={items.length === 0}>
                <Icon name="download" size={13} />Stock out
              </button>
              <button className="btn accent" onClick={() => setShowAdd(true)}>
                <Icon name="plus" size={13} />Add item
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI
          label="SKUs tracked" value={totalSkus} sub="across classes"
          puck="mint" puckIcon="box"
          details={{
            title: `Inventory · ${totalSkus} SKUs`,
            items: items.slice(0, 12).map((i) => ({
              label: i.name, value: `${i.onHand} on hand`,
              sub: `${i.category} · ${i.cls || "all"}`,
            })),
          }}
        />
        <KPI
          label="Out of stock items" value={outCount}
          sub={outCount ? "need re-order" : "all in stock"}
          puck="rose" puckIcon="warning"
          details={{
            title: `Out of stock · ${outCount} items`,
            sub: "Need re-order — currently at zero on-hand",
            items: items.filter(isOut).map((i) => ({
              label: i.name, value: "0 on hand", sub: `${i.category}`, tone: "bad",
            })),
          }}
        />
        <KPI
          label="Stock value" value={stockValue ? fmtRupees(stockValue) : "—"}
          sub={stockValue ? "based on unit prices" : "set unit prices"}
          puck="cream" puckIcon="trending"
          details={{
            title: `Stock value · ${stockValue ? fmtRupees(stockValue) : "₹0"}`,
            sub: "On-hand × unit price, top items first",
            items: [...items]
              .map((i) => ({ ...i, total: (i.onHand || 0) * (i.unitPrice || 0) }))
              .sort((a, b) => b.total - a.total)
              .slice(0, 10)
              .map((i) => ({ label: i.name, value: fmtRupees(i.total), sub: `${i.onHand} × ₹${i.unitPrice}` })),
          }}
        />
        <KPI label="Suppliers" value={supplierCount} sub={supplierCount ? "unique" : "add suppliers"} puck="sky" puckIcon="users" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div>
              <div className="card-title">Stock register</div>
              <div className="card-sub">Live · auto-updates on stock-in/out</div>
            </div>
            <div className="card-actions">
              <div className="segmented">
                {FILTERS.map((f) => (
                  <button key={f.k} className={filter === f.k ? "active" : ""} onClick={() => setFilter(f.k)}>{f.label}</button>
                ))}
              </div>
              <select
                className="select"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                title="Filter by class"
                style={{ minWidth: 150 }}
              >
                <option value="">All classes</option>
                <option value="all">All-class items only</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th><th>Category</th><th>Class</th>
                  <th className="num">On hand</th><th className="num">Min</th><th className="num">Issued</th>
                  <th>Status</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={canEdit ? 8 : 7} className="empty">
                    {items.length === 0
                      ? "No items yet. Click “Add item” to start tracking stock."
                      : (() => {
                          const catLbl = FILTERS.find((f) => f.k === filter)?.label;
                          const clsLbl = !classFilter
                            ? null
                            : classFilter === "all" ? "All-class items only" : `${formatClassLabel(String(classFilter))} items only`;
                          const bits = [];
                          if (filter !== "all") bits.push(`“${catLbl}”`);
                          if (clsLbl) bits.push(`“${clsLbl}”`);
                          return bits.length
                            ? `No items match the ${bits.join(" + ")} filter${bits.length > 1 ? "s" : ""}.`
                            : "No items to show.";
                        })()}
                  </td></tr>
                )}
                {filtered.map((it) => {
                  const out = isOut(it);
                  return (
                    <tr key={it.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: colourSoftForCat(it.category), color: colourInkForCat(it.category), display: "grid", placeItems: "center" }}>
                            <Icon name={iconForCat(it.category)} size={14} />
                          </div>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.name}</div>
                            <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{it.id}{it.supplier ? ` · ${it.supplier}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{prettyCat(it.category)}</span></td>
                      <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{it.cls || "—"}</td>
                      <td className="num" style={{ color: out ? "var(--err, #b13c1c)" : "inherit", fontWeight: out ? 500 : 400 }}>{it.onHand ?? 0}</td>
                      <td className="num" style={{ color: "var(--ink-3)" }}>{it.min ?? 0}</td>
                      <td className="num" style={{ color: "var(--ink-3)" }}>{it.issued ?? 0}</td>
                      <td>
                        {(it.onHand || 0) === 0
                          ? <span className="chip bad"><span className="dot" />Out of stock</span>
                          : <span className="chip ok"><span className="dot" />In stock</span>}
                      </td>
                      {canEdit && (
                        <td style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button className="btn sm" onClick={() => { setMovePreset(it.id); setShowMove("in"); }} title="Stock in">
                            <Icon name="upload" size={11} />In
                          </button>
                          <button className="btn sm" onClick={() => { setMovePreset(it.id); setShowMove("out"); }} title="Stock out" disabled={(it.onHand || 0) === 0}>
                            <Icon name="download" size={11} />Out
                          </button>
                          <button className="icon-btn" onClick={() => handleRemove(it)} title="Remove"><Icon name="x" size={12} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head"><div><div className="card-title">Class-wise stock health</div></div></div>
            {classHealth.length === 0 ? (
              <div className="empty">Stock health appears here once items are tagged to classes.</div>
            ) : (
              <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {classHealth.map(([cls, info]) => (
                  <div key={cls} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, alignItems: "center" }}>
                    <span style={{ color: "var(--ink-2)" }}>{formatClassLabel(String(cls))}</span>
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <span className="mono" style={{ color: "var(--ink-3)" }}>{info.items} item{info.items === 1 ? "" : "s"}</span>
                      {info.out > 0 ? (
                        <span className="chip bad"><span className="dot" />{info.out} out</span>
                      ) : (
                        <span className="chip ok"><span className="dot" />In stock</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Recent stock movements</div></div></div>
            {movements.length === 0 ? (
              <div className="empty">No stock-in / stock-out movements logged yet.</div>
            ) : (
              <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {movements.slice(0, 8).map((m) => {
                  const item = itemMap[m.itemId];
                  const inMove = m.type === "in";
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 22, height: 22, borderRadius: 5,
                        background: inMove ? "var(--ok-soft, #dfecd8)" : "var(--err-soft, #fbe1d8)",
                        color:      inMove ? "var(--ok)"             : "var(--err, #b13c1c)",
                      }}>
                        <Icon name={inMove ? "upload" : "download"} size={11} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item?.name || m.itemId}
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                          {inMove ? "Stocked in" : "Issued"} · {m.who}{m.note ? ` · ${m.note}` : ""}
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: 12, fontWeight: 500, color: inMove ? "var(--ok)" : "var(--err, #b13c1c)" }}>
                        {inMove ? "+" : "−"}{m.qty}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && canEdit && (
        <AddItemModal
          classes={classes}
          existingCats={allCats}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
          onSaveCategory={handleSaveCategory}
        />
      )}
      {showImport && canEdit && (
        <ImportInventoryModal
          onClose={() => setShowImport(false)}
          onSubmit={handleImport}
        />
      )}
      {showMove && canEdit && (
        <MoveModal
          items={items}
          type={showMove}
          presetItemId={movePreset}
          onClose={() => { setShowMove(null); setMovePreset(null); }}
          onSubmit={(payload) => handleMove(showMove, payload)}
        />
      )}

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function AddItemModal({ classes, existingCats, onClose, onSubmit, onSaveCategory }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "", category: "book", cls: "all",
    onHand: "", min: "", unitPrice: "", supplier: "",
  });
  // When the user picks "Add new…" from the category dropdown we flip into a
  // text-entry mode so they can type whatever bucket they want.
  const [customCat, setCustomCat] = useState(false);
  const [customCatVal, setCustomCatVal] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (!form.name.trim()) throw new Error("Name is required");
      const cat = customCat ? customCatVal.trim() : form.category;
      if (!cat) throw new Error("Category is required");
      await onSubmit({
        name: form.name.trim(),
        category: cat,
        cls: form.cls === "all" ? "all" : form.cls,
        onHand: Number(form.onHand) || 0,
        min: Number(form.min) || 0,
        unitPrice: Number(form.unitPrice) || 0,
        supplier: form.supplier.trim() || null,
      });
    } catch (ex) { setErr(ex.message || String(ex)); setBusy(false); }
  }

  // Build flat list of class-section options.
  const classOpts = ["all", ...classes.flatMap((c) =>
    (c.sections || ["A"]).map((s) => `${c.n}-${s}`)
  )];

  return (
    <ModalShell title="Add inventory item" sub="Auto-assigned ID · counts as one SKU" onClose={onClose} width={520}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Item name *">
          <input className="input" ref={nameRef} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Class 5 maths textbook" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Category" hint={customCat ? "Letters, numbers, _ and - · Save to keep this option for next time" : undefined}>
            {customCat ? (
              <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                <input
                  className="input"
                  autoFocus
                  value={customCatVal}
                  onChange={(e) => setCustomCatVal(e.target.value)}
                  placeholder="e.g. stationery, lab, sports"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn sm"
                  disabled={!customCatVal.trim() || savingCat}
                  onClick={async () => {
                    if (!onSaveCategory) return;
                    setErr(""); setSavingCat(true);
                    try {
                      const slug = await onSaveCategory(customCatVal);
                      // Switch back to dropdown with the new category preselected
                      // — the parent's refresh will surface it via existingCats.
                      setForm((f) => ({ ...f, category: slug }));
                      setCustomCat(false);
                      setCustomCatVal("");
                    } catch (ex) { setErr(ex.message || String(ex)); }
                    finally { setSavingCat(false); }
                  }}
                  title="Save this category as a permanent option"
                >
                  <Icon name="check" size={11} />{savingCat ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => { setCustomCat(false); setCustomCatVal(""); }}
                  title="Pick from existing categories"
                >
                  <Icon name="x" size={11} />
                </button>
              </div>
            ) : (
              <select
                className="select"
                value={form.category}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__new__") { setCustomCat(true); setCustomCatVal(""); }
                  else set("category", v);
                }}
              >
                {(existingCats || []).map((c) => (
                  <option key={c.k} value={c.k}>{c.label}</option>
                ))}
                <option value="__new__">+ Add new category…</option>
              </select>
            )}
          </Field>
          <Field label="Class">
            <select className="select" value={form.cls} onChange={(e) => set("cls", e.target.value)}>
              <option value="all">All classes</option>
              {classOpts.filter((o) => o !== "all").map((o) => (
                <option key={o} value={o}>Class {o}</option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="On hand">
            <input className="input" inputMode="numeric" value={form.onHand} onChange={(e) => set("onHand", e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Field>
          <Field label="Min stock">
            <input className="input" inputMode="numeric" value={form.min} onChange={(e) => set("min", e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Field>
          <Field label="Unit price (₹)">
            <input className="input" inputMode="numeric" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Field>
        </div>
        <Field label="Supplier (optional)">
          <input className="input" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="e.g. Sapna Books" />
        </Field>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Adding…" : <><Icon name="check" size={13} />Add item</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function MoveModal({ items, type, presetItemId, onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    itemId: presetItemId || items[0]?.id || "",
    qty: "1",
    note: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selected = items.find((i) => i.id === form.itemId);
  const max = type === "out" ? (selected?.onHand || 0) : Infinity;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const q = Math.max(1, Number(form.qty) || 0);
      if (type === "out" && q > max) throw new Error(`Only ${max} on hand`);
      await onSubmit({ itemId: form.itemId, qty: q, note: form.note.trim() || null });
    } catch (ex) { setErr(ex.message || String(ex)); setBusy(false); }
  }

  return (
    <ModalShell
      title={type === "in" ? "Stock in" : "Stock out"}
      sub={type === "in" ? "Add purchased units to stock" : "Issue units (to a class, student, or staff)"}
      onClose={onClose}
      width={460}
    >
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Item">
          <select className="select" value={form.itemId} onChange={(e) => set("itemId", e.target.value)}>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · {i.id} · {i.onHand ?? 0} on hand
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quantity" hint={type === "out" ? `Max ${max} (current on-hand)` : undefined}>
          <input
            className="input" type="number" min={1}
            max={type === "out" ? max : undefined}
            value={form.qty}
            onChange={(e) => set("qty", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Note (optional)" hint={type === "out" ? "e.g. issued to Class 5-A · 30 students" : "e.g. PO #4521 · supplier delivery"}>
          <input className="input" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder={type === "in" ? "PO / delivery note" : "Issued to / reason"} />
        </Field>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy || !form.itemId}>
            {busy ? "Saving…" : <><Icon name={type === "in" ? "upload" : "download"} size={13} />{type === "in" ? "Stock in" : "Stock out"}</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ImportInventoryModal({ onClose, onSubmit }) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [colMap, setColMap] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const FIELD_LABELS = {
    name: "Item name",
    category: "Category",
    cls: "Class",
    onHand: "On hand",
    min: "Min stock",
    unitPrice: "Unit price",
    supplier: "Supplier",
  };

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(""); setResult(null);
    setFileName(f.name);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
      if (!arr.length) throw new Error("Spreadsheet is empty");
      const [head, ...body] = arr;
      const headerArr = head.map((h) => String(h || "").trim());
      setHeaders(headerArr);
      setRows(body);
      setColMap(inferColumnMap(headerArr));
    } catch (ex) {
      setHeaders([]); setRows([]); setColMap({});
      setErr(ex.message || "Couldn't read the file");
    }
  }

  const cell = (r, field, fallback = "") =>
    colMap[field] != null ? r[colMap[field]] : fallback;

  const previewRows = useMemo(() => {
    return rows.slice(0, 50).map((r) => ({
      name: cell(r, "name"),
      category: cell(r, "category", "asset"),
      cls: cell(r, "cls", "all"),
      onHand: Number(cell(r, "onHand", 0)) || 0,
      min: Number(cell(r, "min", 0)) || 0,
      unitPrice: Number(cell(r, "unitPrice", 0)) || 0,
      supplier: cell(r, "supplier"),
    }));
  }, [rows, colMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const validCount = previewRows.filter((r) => r.name && String(r.name).trim()).length;
  const missingName = previewRows.length - validCount;
  const remap = (field, idx) => setColMap((m) => ({ ...m, [field]: idx === "" ? undefined : Number(idx) }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!rows.length) { setErr("Pick a file first"); return; }
    if (colMap.name == null) { setErr("Map a column to “Item name” — it's required"); return; }
    setBusy(true); setErr("");
    try {
      const payload = rows.map((r) => ({
        name: cell(r, "name"),
        category: cell(r, "category", "asset") || "asset",
        cls: cell(r, "cls", "all") || "all",
        onHand: Number(cell(r, "onHand", 0)) || 0,
        min: Number(cell(r, "min", 0)) || 0,
        unitPrice: Number(cell(r, "unitPrice", 0)) || 0,
        supplier: cell(r, "supplier") || null,
      })).filter((r) => r.name && String(r.name).trim());
      if (!payload.length) throw new Error("No rows had an item name");
      const j = await onSubmit(payload);
      setResult(j);
    } catch (ex) { setErr(ex.message || String(ex)); }
    finally { setBusy(false); }
  }

  function downloadSample() {
    const data = [
      ["Name", "Category", "Class", "On_Hand", "Min", "Unit_Price", "Supplier"],
      ["Class 1 Notebook", "stationery", "1-A", 120, 20, 25, "Local Stores"],
      ["Boys Uniform Shirt", "uniform", "all", 40, 10, 350, "Uniform Hub"],
      ["Projector HDMI Cable", "computer", "all", 8, 2, 450, "Tech Mart"],
      ["NCERT Maths Class 5", "book", "5-A", 30, 5, 120, "Book Depot"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "inventory-import-template.xlsx");
  }

  return (
    <ModalShell title="Import inventory" sub="Upload an Excel or CSV file — preview before importing" onClose={onClose} width={780}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={13} />Choose file
          </button>
          <div style={{ fontSize: 12, color: "var(--ink-3)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName || "No file selected · accepts .xlsx, .xls, .csv"}
          </div>
          <button type="button" className="btn ghost sm" onClick={downloadSample} title="Download a starter template">
            <Icon name="download" size={11} />Sample template
          </button>
        </div>

        {headers.length > 0 && (
          <div style={{ background: "var(--bg-2)", padding: 10, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
              Match your columns
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {Object.keys(COLUMN_ALIASES).map((field) => (
                <label key={field} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
                  <span style={{ color: "var(--ink-3)" }}>
                    {FIELD_LABELS[field]}
                    {field === "name" && <span style={{ color: "var(--err, #b13c1c)" }}> *</span>}
                  </span>
                  <select
                    className="select"
                    value={colMap[field] == null ? "" : colMap[field]}
                    onChange={(e) => remap(field, e.target.value)}
                    style={{ fontSize: 12, padding: "4px 6px", height: 30 }}
                  >
                    <option value="">— ignore —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}

        {previewRows.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                Preview · first {previewRows.length} of {rows.length}
              </div>
              <div style={{ fontSize: 11, color: missingName ? "var(--warn)" : "var(--ink-3)" }}>
                {validCount} importable{missingName ? ` · ${missingName} skipped (no name)` : ""}
              </div>
            </div>
            <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--rule)", borderRadius: 7 }}>
              <table className="table" style={{ fontSize: 11.5 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Class</th>
                    <th className="num">On hand</th>
                    <th className="num">Min</th>
                    <th className="num">Price</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => {
                    const ok = !!String(r.name || "").trim();
                    return (
                      <tr key={i} style={ok ? undefined : { background: "var(--err-soft, #fbe1d8)" }}>
                        <td style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{String(r.name || "—")}</td>
                        <td style={{ color: "var(--ink-3)" }}>{String(r.category || "asset")}</td>
                        <td style={{ color: "var(--ink-3)" }}>{String(r.cls || "all")}</td>
                        <td className="num">{r.onHand}</td>
                        <td className="num">{r.min}</td>
                        <td className="num">{r.unitPrice || "—"}</td>
                        <td style={{ color: "var(--ink-3)" }}>{String(r.supplier || "—")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 10,
            padding: "14px 16px",
            background: "var(--ok-soft, #e6f4ec)",
            border: "1px solid var(--ok, #2f8854)",
            borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--ok, #2f8854)", color: "#fff",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <Icon name="check" size={14} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Import successful</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                  {(result.imported?.length || 0)} item{(result.imported?.length || 0) === 1 ? "" : "s"} added · the register behind this dialog is already updated.
                  {result.errors?.length ? ` · ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped — see below.` : ""}
                </div>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div style={{
                background: "var(--warn-soft, #fff4e2)",
                border: "1px solid var(--warn, #d4944e)",
                borderRadius: 7, padding: "8px 10px",
                fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.5,
                maxHeight: 120, overflowY: "auto",
              }}>
                {result.errors.slice(0, 8).map((e, i) => (
                  <div key={i}>Row {e.row}: {e.reason}</div>
                ))}
                {result.errors.length > 8 && (
                  <div style={{ color: "var(--ink-4)", marginTop: 4 }}>…and {result.errors.length - 8} more</div>
                )}
              </div>
            )}
          </div>
        )}

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {result ? (
            <button type="button" className="btn accent" onClick={onClose}>
              <Icon name="check" size={13} />Done
            </button>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn accent" disabled={busy || !rows.length || colMap.name == null}>
                <Icon name="upload" size={13} />
                {busy ? "Importing…" : `Import ${validCount} item${validCount === 1 ? "" : "s"}`}
              </button>
            </>
          )}
        </div>
      </form>
    </ModalShell>
  );
}

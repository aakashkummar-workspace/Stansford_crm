"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, LineBarChart } from "../ui";
import { money, moneyK } from "@/lib/format";

const EXPENSE_CATEGORIES = [
  "Salary", "Utilities", "Supplies", "Maintenance", "Transport", "Events",
  "Stationery", "Software", "Marketing", "Donation outflow", "Misc",
];
const PAYMENT_METHODS = ["Bank transfer", "UPI", "Cheque", "Cash", "Credit card"];

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

function ModalShell({ title, sub, onClose, children, width = 480 }) {
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

export default function ScreenMoney({ E, refresh, role }) {
  const canEdit = role === "admin" || role === "principal";

  // Build live ledger entries from real fee receipts + expenses.
  const incomeRows = useMemo(() => (E.RECENT_FEES || []).map((f) => ({
    id: f.id || `RCP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    date: f.time || "",
    desc: `Fee · ${f.name} · ${f.id || ""}`,
    scope: "school",
    category: "Fees",
    method: f.method || "—",
    amount: f.amount,
    in: true,
  })), [E.RECENT_FEES]);

  const donationRows = useMemo(() => (E.DONOR_RECEIPTS || []).map((r) => ({
    id: r.id, date: r.issuedAtLabel || r.issuedAt,
    desc: `Donation · ${r.donorName}${r.memo ? ` · ${r.memo}` : ""}`,
    scope: "trust",
    category: "Donation",
    method: r.method || "—",
    amount: r.amount,
    in: true,
  })), [E.DONOR_RECEIPTS]);

  const expenseRows = useMemo(() => (E.EXPENSES || []).map((e) => ({
    id: e.id, date: e.date,
    desc: `${e.category}${e.vendor ? ` · ${e.vendor}` : ""}${e.memo ? ` · ${e.memo}` : ""}`,
    scope: e.scope || "school",
    category: e.category,
    method: e.paymentMethod || "—",
    amount: e.amount,
    in: false,
  })), [E.EXPENSES]);

  const TXNS = useMemo(() => [...incomeRows, ...donationRows, ...expenseRows], [incomeRows, donationRows, expenseRows]);

  const [accountScope, setAccountScope] = useState("Combined");   // Combined | School only | Trust only
  const [ledgerType, setLedgerType] = useState("All");            // All | Income | Expense
  const [methodFilter, setMethodFilter] = useState("All");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const methods = useMemo(() => {
    const set = new Set(TXNS.map((t) => t.method).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [TXNS]);

  const scopeFilter = accountScope === "School only" ? "school" : accountScope === "Trust only" ? "trust" : null;

  const filteredTxns = useMemo(() => {
    return TXNS.filter((t) => {
      if (scopeFilter && t.scope !== scopeFilter) return false;
      if (ledgerType === "Income" && !t.in) return false;
      if (ledgerType === "Expense" && t.in) return false;
      if (methodFilter !== "All" && t.method !== methodFilter) return false;
      return true;
    });
  }, [TXNS, scopeFilter, ledgerType, methodFilter]);

  // KPIs respect the active scope filter.
  const incomeYtd  = filteredTxns.filter((t) => t.in).reduce((a, t) => a + (t.amount || 0), 0);
  const expenseYtd = filteredTxns.filter((t) => !t.in).reduce((a, t) => a + (t.amount || 0), 0);
  const surplus    = incomeYtd - expenseYtd;
  const margin     = incomeYtd > 0 ? Math.round((surplus / incomeYtd) * 100) : 0;
  const pendingTotal = (E.PENDING_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);

  async function submitExpense(payload) {
    const r = await fetch("/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
    setShowAddExpense(false);
    showToast(`Expense ${j.expense.id} logged`, "ok");
    await refresh?.();
  }

  async function removeExpense(t) {
    if (!confirm(`Remove expense ${t.id}?`)) return;
    try {
      const r = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: t.id }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      showToast("Expense removed", "ok");
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
  }

  return (
    <div className="page">
      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />

      <div className="page-head">
        <div>
          <div className="page-title">Money <span className="amber">Control</span></div>
          <div className="page-sub">Income, expenses & ledgers — School and Trust kept separate.</div>
        </div>
        <div className="page-actions">
          <div className="segmented">
            {["Combined", "School only", "Trust only"].map((s) => (
              <button key={s} className={accountScope === s ? "active" : ""} onClick={() => setAccountScope(s)}>{s}</button>
            ))}
          </div>
          {canEdit && (
            <button className="btn accent" onClick={() => setShowAddExpense(true)}>
              <Icon name="plus" size={13} />Log expense
            </button>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label={`Income · ${accountScope === "Combined" ? "all" : accountScope.replace(" only", "")}`} value={moneyK(incomeYtd)} sub={`${filteredTxns.filter((t) => t.in).length} entries`} puck="mint" puckIcon="trending" />
        <KPI label="Expense · YTD" value={moneyK(expenseYtd)} sub={`${filteredTxns.filter((t) => !t.in).length} entries`} puck="peach" puckIcon="money" />
        <KPI label="Net surplus" value={moneyK(surplus)} sub={incomeYtd > 0 ? `${margin}% margin` : "no income yet"} puck="cream" puckIcon="trending" />
        <KPI label="Pending receivables" value={moneyK(pendingTotal)} sub={`${(E.PENDING_FEES || []).length} student${(E.PENDING_FEES || []).length === 1 ? "" : "s"}`} puck="sky" puckIcon="fees" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Income vs Expense</div><div className="card-sub">Weekly · 12 weeks · ₹ lakhs</div></div>
          </div>
          <div className="card-body" style={{ padding: "8px 8px 0" }}>
            <LineBarChart data={E.INCOME_SERIES} w={760} h={260} lineKeys={["inc"]} barKey="exp" palette={["var(--accent-2)"]} />
          </div>
        </div>
        <div className="card col-4">
          <div className="card-head">
            <div><div className="card-title">Income breakup</div><div className="card-sub">{accountScope}</div></div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(() => {
              const byCat = new Map();
              for (const t of filteredTxns) {
                if (!t.in) continue;
                byCat.set(t.category, (byCat.get(t.category) || 0) + t.amount);
              }
              const total = [...byCat.values()].reduce((a, b) => a + b, 0);
              if (total === 0) return <div className="empty" style={{ padding: 16 }}>No income posted yet.</div>;
              return [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, val], i) => {
                const pct = (val / total) * 100;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span>{cat}</span>
                      <span className="mono">{moneyK(val)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar thick"><span style={{ width: `${pct}%`, background: "var(--accent)" }} /></div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="card col-12">
          <div className="card-head">
            <div>
              <div className="card-title">Ledger · recent transactions</div>
              <div className="card-sub">{filteredTxns.length} of {TXNS.length} transaction{TXNS.length === 1 ? "" : "s"} shown</div>
            </div>
            <div className="card-actions">
              <div className="segmented">
                {["All", "Income", "Expense"].map((t) => (
                  <button key={t} className={ledgerType === t ? "active" : ""} onClick={() => setLedgerType(t)}>{t}</button>
                ))}
              </div>
              <select className="select" style={{ height: 32, fontSize: 12 }} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                {methods.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th>Method</th><th className="num">Amount</th>{canEdit && <th></th>}</tr></thead>
              <tbody>
                {filteredTxns.length === 0 && (
                  <tr><td colSpan={canEdit ? 8 : 7} className="empty">
                    {TXNS.length === 0
                      ? "No transactions yet. Fee receipts and logged expenses will appear here."
                      : "No transactions match the current filters."}
                  </td></tr>
                )}
                {filteredTxns.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{t.id}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.date}</td>
                    <td style={{ fontSize: 13 }}>{t.desc}</td>
                    <td><span className={`chip ${t.scope === "trust" ? "accent" : "info"}`}><span className="dot" />{t.scope === "trust" ? "Trust" : "School"}</span></td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.category}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.method}</td>
                    <td className="num" style={{ color: t.in ? "var(--ok)" : "var(--bad)", fontWeight: 500 }}>
                      {t.in ? "+" : "−"}{money(t.amount)}
                    </td>
                    {canEdit && (
                      <td style={{ textAlign: "right" }}>
                        {!t.in && t.id?.startsWith("EXP-") && (
                          <button className="icon-btn" onClick={() => removeExpense(t)} title="Remove expense"><Icon name="x" size={12} /></button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddExpense && canEdit && (
        <AddExpenseModal onClose={() => setShowAddExpense(false)} onSubmit={submitExpense} defaultScope={accountScope === "Trust only" ? "trust" : "school"} />
      )}
    </div>
  );
}

function AddExpenseModal({ onClose, onSubmit, defaultScope }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    scope: defaultScope || "school",
    category: "Supplies",
    amount: "",
    vendor: "",
    memo: "",
    date: today,
    paymentMethod: "Bank transfer",
  });
  const amtRef = useRef(null);
  useEffect(() => { amtRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const amount = Number(form.amount);
      if (!amount) throw new Error("Enter a positive amount");
      await onSubmit({
        scope: form.scope, category: form.category,
        amount, vendor: form.vendor.trim() || null, memo: form.memo.trim() || null,
        date: form.date, paymentMethod: form.paymentMethod,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell title="Log expense" sub="Goes straight into the ledger and the relevant account" onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Account *">
            <div className="segmented">
              <button type="button" className={form.scope === "school" ? "active" : ""} onClick={() => set("scope", "school")}>School</button>
              <button type="button" className={form.scope === "trust" ? "active" : ""} onClick={() => set("scope", "trust")}>Trust</button>
            </div>
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Category">
            <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Amount (₹) *">
            <input ref={amtRef} className="input" inputMode="numeric" value={form.amount} onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))} placeholder="50000" />
          </Field>
        </div>
        <Field label="Vendor / paid to (optional)">
          <input className="input" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="e.g. Sapna Books" />
        </Field>
        <Field label="Memo (optional)" hint="invoice #, PO ref, notes">
          <input className="input" value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="INV-9234 · April supplies" />
        </Field>
        <Field label="Payment method">
          <select className="select" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>

        {err && <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy || !form.amount}>
            {busy ? "Logging…" : <><Icon name="check" size={13} />Log expense</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

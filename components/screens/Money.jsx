"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, LineBarChart } from "../ui";
import { money, moneyK } from "@/lib/format";

export default function ScreenMoney({ E }) {
  // Build live ledger entries from real fee receipts.
  const TXNS = useMemo(() => (E.RECENT_FEES || []).map((f) => ({
    id: `TXN-${(f.id || "").replace(/[^0-9]/g, "")}`,
    d: f.time || "",
    desc: `Fee · ${f.name} · ${f.id}`,
    acc: "School",
    cat: "Fees",
    m: f.method || "—",
    amt: f.amount,
    in: true,
  })), [E.RECENT_FEES]);

  const [accountScope, setAccountScope] = useState("Combined"); // Combined | School only | Trust only
  const [ledgerType, setLedgerType] = useState("All");          // All | Income | Expense
  const [methodFilter, setMethodFilter] = useState("All");      // All | UPI | Cash | Card | Bank | Cheque
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [filterOpen]);

  const methods = useMemo(() => {
    const set = new Set(TXNS.map((t) => t.m).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [TXNS]);

  const filteredTxns = useMemo(() => {
    return TXNS.filter((t) => {
      if (accountScope !== "Combined" && !accountScope.toLowerCase().includes(t.acc.toLowerCase())) return false;
      if (ledgerType === "Income" && !t.in) return false;
      if (ledgerType === "Expense" && t.in) return false;
      if (methodFilter !== "All" && t.m !== methodFilter) return false;
      return true;
    });
  }, [TXNS, accountScope, ledgerType, methodFilter]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Money <span className="amber">Control</span></div>
          <div className="page-sub">All receipts and payments — auto-posted, every action logged for audit.</div>
        </div>
        <div className="page-actions">
          <div className="segmented">
            {["Combined", "School only", "Trust only"].map((s) => (
              <button key={s} className={accountScope === s ? "active" : ""} onClick={() => setAccountScope(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {(() => {
        const incomeYtd = (E.RECENT_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);
        const pendingTotal = (E.PENDING_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);
        const expenseYtd = 0;
        const surplus = incomeYtd - expenseYtd;
        const margin = incomeYtd > 0 ? Math.round((surplus / incomeYtd) * 100) : 0;
        return (
          <div className="grid g-4" style={{ marginBottom: 14 }}>
            <KPI label="Total income · YTD" value={moneyK(incomeYtd)} sub={`from ${(E.RECENT_FEES || []).length} fee receipt${(E.RECENT_FEES || []).length === 1 ? "" : "s"}`} puck="mint" puckIcon="trending" />
            <KPI label="Total expense · YTD" value={moneyK(expenseYtd)} sub="not tracked yet" puck="peach" puckIcon="money" />
            <KPI label="Net surplus" value={moneyK(surplus)} sub={incomeYtd > 0 ? `${margin}% margin` : "no income yet"} puck="cream" puckIcon="trending" />
            <KPI label="Pending receivables" value={moneyK(pendingTotal)} sub={`${(E.PENDING_FEES || []).length} student${(E.PENDING_FEES || []).length === 1 ? "" : "s"}`} puck="sky" puckIcon="fees" />
          </div>
        );
      })()}

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
            <div><div className="card-title">Income breakup</div><div className="card-sub">Year to date</div></div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(() => {
              const feesTotal = (E.RECENT_FEES || []).reduce((a, f) => a + f.amount, 0);
              const buckets = [
                { l: "Fees · received", v: feesTotal, c: "var(--accent)" },
                { l: "Fees · pending", v: (E.PENDING_FEES || []).reduce((a, f) => a + f.amount, 0), c: "var(--warn)" },
                { l: "Donations", v: (E.DONORS || []).reduce((a, d) => a + (d.ytd || 0), 0), c: "var(--ok)" },
                { l: "Other income", v: 0, c: "var(--info)" },
              ];
              const total = buckets.reduce((a, b) => a + b.v, 0) || 1;
              if (total === 1 && feesTotal === 0) {
                return <div className="empty" style={{ padding: 16 }}>No income posted yet.</div>;
              }
              return buckets.map((r, i) => {
                const pct = (r.v / total) * 100;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span>{r.l}</span>
                      <span className="mono">{moneyK(r.v)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar thick"><span style={{ width: `${pct}%`, background: r.c }} /></div>
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
              <div className="card-sub">
                {filteredTxns.length} of {TXNS.length} transaction{TXNS.length === 1 ? "" : "s"} shown
              </div>
            </div>
            <div className="card-actions">
              <div className="segmented">
                {["All", "Income", "Expense"].map((t) => (
                  <button key={t} className={ledgerType === t ? "active" : ""} onClick={() => setLedgerType(t)}>{t}</button>
                ))}
              </div>
              <div ref={filterRef} style={{ position: "relative" }}>
                <button
                  className={`btn sm ${methodFilter !== "All" ? "accent" : ""}`}
                  onClick={() => setFilterOpen((s) => !s)}
                >
                  <Icon name="filter" size={12} />{methodFilter === "All" ? "Filter" : `Method: ${methodFilter}`}
                </button>
                {filterOpen && (
                  <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 6px)",
                    minWidth: 160, background: "var(--card)",
                    border: "1px solid var(--rule)", borderRadius: 8, padding: 4,
                    zIndex: 50, boxShadow: "var(--shadow-lg)",
                  }}>
                    <div style={{ fontSize: 10.5, color: "var(--ink-4)", padding: "6px 10px 4px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>Payment method</div>
                    {methods.map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMethodFilter(m); setFilterOpen(false); }}
                        style={{
                          width: "100%", textAlign: "left",
                          padding: "7px 10px", background: methodFilter === m ? "var(--bg-2)" : "transparent",
                          border: 0, borderRadius: 6, cursor: "pointer",
                          color: "var(--ink-2)", fontSize: 12,
                        }}
                        onMouseEnter={(e) => methodFilter !== m && (e.currentTarget.style.background = "var(--bg-2)")}
                        onMouseLeave={(e) => methodFilter !== m && (e.currentTarget.style.background = "transparent")}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Txn ID</th><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th>Method</th><th className="num">Amount</th><th></th></tr></thead>
            <tbody>
              {filteredTxns.length === 0 && (
                <tr><td colSpan={8} className="empty">
                  {TXNS.length === 0
                    ? "No transactions yet. Fee receipts and other entries will appear here."
                    : "No transactions match the current filters."}
                </td></tr>
              )}
              {filteredTxns.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{t.id}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.d}</td>
                  <td style={{ fontSize: 13 }}>{t.desc}</td>
                  <td><span className={`chip ${t.acc === "Trust" ? "accent" : "info"}`}><span className="dot" />{t.acc}</span></td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.cat}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{t.m}</td>
                  <td className="num" style={{ color: t.in ? "var(--ok)" : "var(--bad)", fontWeight: 500 }}>
                    {t.in ? "+" : ""}{money(t.amt)}
                  </td>
                  <td><button className="btn sm ghost">Receipt</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

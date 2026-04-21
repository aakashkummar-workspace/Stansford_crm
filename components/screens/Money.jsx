"use client";

import Icon from "../Icon";
import { KPI, LineBarChart } from "../ui";
import { money, moneyK } from "@/lib/format";

export default function ScreenMoney({ E }) {
  // Build live ledger entries from real fee receipts in the DB.
  const TXNS = (E.RECENT_FEES || []).map((f) => ({
    id: `TXN-${f.id.replace(/[^0-9]/g, "")}`,
    d: f.time || "",
    desc: `Fee · ${f.name} · ${f.id}`,
    acc: "School",
    cat: "Fees",
    m: f.method || "—",
    amt: f.amount,
    in: true,
  }));
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">School + Trust · Ledger</div>
          <div className="page-title">Money <span className="amber">Control</span></div>
          <div className="page-sub">All receipts and payments — auto-posted, every action logged for audit.</div>
        </div>
        <div className="page-actions">
          <div className="segmented">
            <button className="active">Combined</button>
            <button>School only</button>
            <button>Trust only</button>
          </div>
          <button className="btn"><Icon name="download" size={13} />Export ledger</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Total income · YTD" value={moneyK(E.KPIS.income.value)} delta="+14%" deltaDir="up" sub="fees + donations + other" puck="mint" puckIcon="trending" />
        <KPI label="Total expense · YTD" value={moneyK(E.KPIS.expense.value)} delta="+3%" deltaDir="up" sub="incl. salaries + ops" puck="peach" puckIcon="money" />
        <KPI label="Net surplus" value={moneyK(E.KPIS.income.value - E.KPIS.expense.value)} delta="42% margin" deltaDir="up" sub="target 35%" puck="cream" puckIcon="trending" />
        <KPI label="Combined balance" value={moneyK(E.KPIS.balance.value)} delta="+2.1%" deltaDir="up" sub="live as of 08:12" puck="sky" puckIcon="fees" />
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
            <div><div className="card-title">Income breakup</div><div className="card-sub">Year to date</div></div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(() => {
              const feesTotal = (E.RECENT_FEES || []).reduce((a, f) => a + f.amount, 0);
              const buckets = [
                { l: "Fees · received", v: feesTotal, c: "var(--accent)" },
                { l: "Fees · pending", v: (E.PENDING_FEES || []).reduce((a, f) => a + f.amount, 0), c: "var(--warn)" },
                { l: "Donations", v: 0, c: "var(--ok)" },
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
            <div><div className="card-title">Ledger · recent transactions</div><div className="card-sub">Auto-posted · every action logged</div></div>
            <div className="card-actions">
              <div className="segmented">
                <button className="active">All</button>
                <button>Income</button>
                <button>Expense</button>
              </div>
              <button className="btn sm"><Icon name="filter" size={12} />Filter</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Txn ID</th><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th>Method</th><th className="num">Amount</th><th></th></tr></thead>
            <tbody>
              {TXNS.length === 0 && (
                <tr><td colSpan={8} className="empty">No transactions yet. Fee receipts and other entries will appear here.</td></tr>
              )}
              {TXNS.map((t) => (
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

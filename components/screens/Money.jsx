"use client";

import Icon from "../Icon";
import { KPI, LineBarChart } from "../ui";
import { money, moneyK } from "@/lib/format";

const TXNS = [
  { id: "TXN-20412", d: "28 Apr 08:12", desc: "Fee · Aanya Sharma · STN-2041", acc: "School", cat: "Fees", m: "UPI", amt: 18500, in: true },
  { id: "TXN-20411", d: "28 Apr 08:03", desc: "Fee · Advait Patel · STN-1987", acc: "School", cat: "Fees", m: "UPI", amt: 16800, in: true },
  { id: "TXN-20410", d: "28 Apr 07:54", desc: "Fuel · Bus KA-01-BZ-4271", acc: "School", cat: "Transport", m: "Cash", amt: -2400, in: false },
  { id: "TXN-20409", d: "28 Apr 07:42", desc: "Fee · Kiara Reddy · STN-2105", acc: "School", cat: "Fees", m: "Cash", amt: 21200, in: true },
  { id: "TXN-20408", d: "27 Apr", desc: "Donation · Kothari Foundation", acc: "Trust", cat: "CSR", m: "Bank", amt: 100000, in: true },
  { id: "TXN-20407", d: "27 Apr", desc: "Purchase · Reading primers (40)", acc: "School", cat: "Inventory", m: "Bank", amt: -14000, in: false },
  { id: "TXN-20406", d: "26 Apr", desc: "Salary advance · Ms. Kulkarni", acc: "School", cat: "Payroll", m: "Bank", amt: -25000, in: false },
  { id: "TXN-20405", d: "26 Apr", desc: "Electricity bill · April", acc: "School", cat: "Utilities", m: "Bank", amt: -38400, in: false },
  { id: "TXN-20404", d: "25 Apr", desc: "Donation · Bansal Family Trust", acc: "Trust", cat: "Donation", m: "Bank", amt: 50000, in: true },
  { id: "TXN-20403", d: "25 Apr", desc: "Craft supplies · Class 2", acc: "School", cat: "Inventory", m: "UPI", amt: -8400, in: false },
];

export default function ScreenMoney({ E }) {
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
            {[
              { l: "Fees · tuition", v: 7640000, c: "var(--accent)" },
              { l: "Fees · activity", v: 620000, c: "var(--accent-2)" },
              { l: "Donations · CSR", v: 980000, c: "var(--ok)" },
              { l: "Donations · indiv.", v: 240000, c: "var(--info)" },
              { l: "Other income", v: 360000, c: "var(--warn)" },
            ].map((r, i) => {
              const pct = (r.v / 9840000) * 100;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>{r.l}</span>
                    <span className="mono">{moneyK(r.v)} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="bar thick"><span style={{ width: `${pct}%`, background: r.c }} /></div>
                </div>
              );
            })}
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

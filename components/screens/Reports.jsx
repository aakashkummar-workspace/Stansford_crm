"use client";

import { useMemo, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";
import { money, moneyK } from "@/lib/format";

// Single screen that aggregates the four most-asked-for reports:
// 1. Monthly P&L (income, expense, net) split by School / Trust
// 2. Fee collection summary (paid vs outstanding by class)
// 3. Donation summary (top donors, by campaign, by type)
// 4. Student strength (by class)
export default function ScreenReports({ E }) {
  const [tab, setTab] = useState("pl");

  const fees = E.RECENT_FEES || [];
  const pending = E.PENDING_FEES || [];
  const expenses = E.EXPENSES || [];
  const receipts = E.DONOR_RECEIPTS || [];
  const donors   = E.DONORS || [];
  const campaigns= E.CAMPAIGNS || [];
  const students = E.ADDED_STUDENTS || [];

  // ---- Tab 1: P&L by month ----
  // Group by month (YYYY-MM). Income = fees + donation receipts; Expense = expenses.
  const pl = useMemo(() => {
    const months = new Map(); // key -> { income_school, income_trust, expense_school, expense_trust }
    const bump = (key, k, v) => {
      if (!months.has(key)) months.set(key, { income_school: 0, income_trust: 0, expense_school: 0, expense_trust: 0 });
      months.get(key)[k] += v;
    };
    for (const f of fees) {
      // RECENT_FEES has free-form `time` strings ("just now" etc.) — fall back
      // to the current month so they don't disappear from the report.
      const key = isoMonthFrom(f.time) || isoMonthNow();
      bump(key, "income_school", f.amount || 0);
    }
    for (const r of receipts) {
      const key = (r.issuedAt || "").slice(0, 7) || isoMonthNow();
      bump(key, "income_trust", r.amount || 0);
    }
    for (const e of expenses) {
      const key = (e.date || "").slice(0, 7) || isoMonthNow();
      const k = (e.scope === "trust" ? "expense_trust" : "expense_school");
      bump(key, k, e.amount || 0);
    }
    return [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, v]) => ({
      month,
      monthLabel: monthLabel(month),
      income: v.income_school + v.income_trust,
      expense: v.expense_school + v.expense_trust,
      net: v.income_school + v.income_trust - v.expense_school - v.expense_trust,
      ...v,
    }));
  }, [fees, receipts, expenses]);

  // ---- Tab 2: Fee collection by class ----
  const feeByClass = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      if (!map.has(s.cls)) map.set(s.cls, { cls: s.cls, students: 0, collected: 0, pending: 0 });
      map.get(s.cls).students += 1;
    }
    for (const f of fees) {
      const cls = f.cls;
      if (!map.has(cls)) map.set(cls, { cls, students: 0, collected: 0, pending: 0 });
      map.get(cls).collected += f.amount || 0;
    }
    for (const p of pending) {
      const cls = p.cls;
      if (!map.has(cls)) map.set(cls, { cls, students: 0, collected: 0, pending: 0 });
      map.get(cls).pending += p.amount || 0;
    }
    return [...map.values()].sort((a, b) => a.cls.localeCompare(b.cls));
  }, [students, fees, pending]);

  // ---- Tab 3: Donation summary ----
  const donationSummary = useMemo(() => {
    const byType = new Map();
    for (const d of donors) {
      if (!byType.has(d.type)) byType.set(d.type, { type: d.type, donors: 0, ytd: 0 });
      const e = byType.get(d.type);
      e.donors += 1;
      e.ytd += d.ytd || 0;
    }
    return {
      totalRaised: receipts.reduce((a, r) => a + (r.amount || 0), 0),
      totalReceipts: receipts.length,
      byType: [...byType.values()].sort((a, b) => b.ytd - a.ytd),
      topDonors: [...donors].sort((a, b) => (b.ytd || 0) - (a.ytd || 0)).slice(0, 10),
      activeCampaigns: campaigns.filter((c) => c.status !== "completed"),
    };
  }, [donors, receipts, campaigns]);

  // ---- Tab 4: Student strength ----
  const strength = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      const grade = String(s.cls).split("-")[0];
      if (!map.has(grade)) map.set(grade, { grade, total: 0, sections: new Set() });
      map.get(grade).total += 1;
      map.get(grade).sections.add(String(s.cls).split("-")[1] || "—");
    }
    return [...map.values()]
      .map((g) => ({ grade: g.grade, total: g.total, sections: [...g.sections].sort().join(", ") }))
      .sort((a, b) => Number(a.grade) - Number(b.grade));
  }, [students]);

  function exportCsv() {
    let header = [], rows = [], name = "report";
    if (tab === "pl") {
      name = "monthly-pl";
      header = ["Month", "Income · School", "Income · Trust", "Expense · School", "Expense · Trust", "Total income", "Total expense", "Net"];
      rows = pl.map((r) => [r.monthLabel, r.income_school, r.income_trust, r.expense_school, r.expense_trust, r.income, r.expense, r.net]);
    } else if (tab === "fees") {
      name = "fee-collection-by-class";
      header = ["Class", "Students", "Collected", "Pending"];
      rows = feeByClass.map((r) => [r.cls, r.students, r.collected, r.pending]);
    } else if (tab === "donors") {
      name = "donation-summary";
      header = ["Type", "Donors", "YTD raised"];
      rows = donationSummary.byType.map((r) => [r.type, r.donors, r.ytd]);
    } else if (tab === "strength") {
      name = "student-strength";
      header = ["Grade", "Total students", "Sections"];
      rows = strength.map((r) => [r.grade, r.total, `"${r.sections}"`]);
    }
    const csv = [
      `# Vidyalaya360 — ${name} — ${new Date().toLocaleString("en-IN")}`,
      header.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Governance · Reports</div>
          <div className="page-title">Reports & <span className="amber">Financials</span></div>
          <div className="page-sub">Monthly P&amp;L · fee collection · donations · student strength</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportCsv}>
            <Icon name="download" size={13} />Export current view
          </button>
        </div>
      </div>

      {/* Top KPIs across everything */}
      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Total income · YTD" value={moneyK(pl.reduce((a, r) => a + r.income, 0))} sub={`${pl.length} months`} puck="mint" puckIcon="trending" />
        <KPI label="Total expense · YTD" value={moneyK(pl.reduce((a, r) => a + r.expense, 0))} sub={`${expenses.length} entries`} puck="peach" puckIcon="money" />
        <KPI label="Donations raised" value={moneyK(donationSummary.totalRaised)} sub={`${donationSummary.totalReceipts} receipts`} puck="cream" puckIcon="donors" />
        <KPI label="Students on roll" value={students.length} sub={`${strength.length} grades`} puck="sky" puckIcon="students" />
      </div>

      {/* Tab strip */}
      <div className="card" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, marginRight: 4 }}>Report:</span>
        {[
          { k: "pl",       label: "Monthly P&L" },
          { k: "fees",     label: "Fee collection" },
          { k: "donors",   label: "Donation summary" },
          { k: "strength", label: "Student strength" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 999,
              background: tab === t.k ? "var(--accent)" : "var(--bg-2)",
              color: tab === t.k ? "#fff" : "var(--ink-2)",
              border: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 500,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "pl" && (
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Monthly P&amp;L</div><div className="card-sub">Income, expense, net surplus per month — split by School & Trust</div></div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="num">Income · School</th>
                  <th className="num">Income · Trust</th>
                  <th className="num">Expense · School</th>
                  <th className="num">Expense · Trust</th>
                  <th className="num">Net</th>
                </tr>
              </thead>
              <tbody>
                {pl.length === 0 && <tr><td colSpan={6} className="empty">No financial activity yet.</td></tr>}
                {pl.map((r) => (
                  <tr key={r.month}>
                    <td style={{ fontSize: 12.5, fontWeight: 500 }}>{r.monthLabel}</td>
                    <td className="num">{money(r.income_school)}</td>
                    <td className="num">{money(r.income_trust)}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>{money(r.expense_school)}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>{money(r.expense_trust)}</td>
                    <td className="num" style={{ fontWeight: 600, color: r.net >= 0 ? "var(--ok)" : "var(--bad)" }}>{r.net >= 0 ? "+" : ""}{money(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "fees" && (
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Fee collection by class</div><div className="card-sub">Collected vs outstanding · all classes on roll</div></div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Class</th><th className="num">Students</th><th className="num">Collected</th><th className="num">Pending</th><th>Coverage</th></tr></thead>
              <tbody>
                {feeByClass.length === 0 && <tr><td colSpan={5} className="empty">No fee data yet.</td></tr>}
                {feeByClass.map((r) => {
                  const total = r.collected + r.pending;
                  const pct = total > 0 ? Math.round((r.collected / total) * 100) : 0;
                  return (
                    <tr key={r.cls}>
                      <td style={{ fontSize: 12.5, fontWeight: 500 }}>{r.cls}</td>
                      <td className="num">{r.students}</td>
                      <td className="num" style={{ color: "var(--ok)" }}>{money(r.collected)}</td>
                      <td className="num" style={{ color: r.pending > 0 ? "var(--bad)" : "var(--ink-3)" }}>{money(r.pending)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="bar" style={{ flex: 1, maxWidth: 120 }}><span style={{ width: `${pct}%`, background: "var(--accent)" }} /></div>
                          <span className="mono" style={{ fontSize: 11 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "donors" && (
        <div className="grid g-12">
          <div className="card col-6">
            <div className="card-head"><div><div className="card-title">By donor type</div></div></div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead><tr><th>Type</th><th className="num">Donors</th><th className="num">YTD raised</th></tr></thead>
                <tbody>
                  {donationSummary.byType.length === 0 && <tr><td colSpan={3} className="empty">No donors on file.</td></tr>}
                  {donationSummary.byType.map((r) => (
                    <tr key={r.type}>
                      <td><span className={`chip ${r.type === "CSR" ? "accent" : ""}`}><span className="dot" />{r.type}</span></td>
                      <td className="num">{r.donors}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{money(r.ytd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card col-6">
            <div className="card-head"><div><div className="card-title">Top 10 donors · YTD</div></div></div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead><tr><th>Donor</th><th>Type</th><th className="num">YTD</th></tr></thead>
                <tbody>
                  {donationSummary.topDonors.length === 0 && <tr><td colSpan={3} className="empty">No donors yet.</td></tr>}
                  {donationSummary.topDonors.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontSize: 12.5, fontWeight: 500 }}>{d.name}</td>
                      <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{d.type}</td>
                      <td className="num">{money(d.ytd || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "strength" && (
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Student strength · by grade</div><div className="card-sub">Total: {students.length} students</div></div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Grade</th><th className="num">Total students</th><th>Sections</th><th>Distribution</th></tr></thead>
              <tbody>
                {strength.length === 0 && <tr><td colSpan={4} className="empty">No students on roll yet.</td></tr>}
                {strength.map((g) => {
                  const pct = students.length > 0 ? Math.round((g.total / students.length) * 100) : 0;
                  return (
                    <tr key={g.grade}>
                      <td style={{ fontSize: 12.5, fontWeight: 500 }}>Class {g.grade}</td>
                      <td className="num">{g.total}</td>
                      <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{g.sections}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="bar" style={{ flex: 1, maxWidth: 200 }}><span style={{ width: `${pct}%`, background: "var(--accent)" }} /></div>
                          <span className="mono" style={{ fontSize: 11 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function isoMonthFrom(t) {
  if (!t) return null;
  const m = String(t).match(/(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}
function isoMonthNow() {
  return new Date().toISOString().slice(0, 7);
}
function monthLabel(iso) {
  const d = new Date(iso + "-01");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

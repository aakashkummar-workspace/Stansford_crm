"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { KPI, BarChart, LineBarChart, Ring, AvatarChip } from "../ui";
import { money, moneyK } from "@/lib/format";

export default function ScreenDashboard({ E, role }) {
  const { KPIS, CLASS_STRENGTH, RECENT_FEES, PENDING_FEES, ACTIVITIES, ROUTES, INCOME_SERIES } = E;
  const [range, setRange] = useState("12W");
  const isParent = role === "parent";
  const child = isParent ? (E.ADDED_STUDENTS || [])[0] : null;

  // Greeting + date string both depend on the client clock — computed after
  // mount to avoid SSR/CSR hydration mismatch.
  const [greet, setGreet] = useState("Hello");
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreet(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setDateLabel(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{dateLabel || "\u00A0"}</div>
          <div className="page-title">
            {isParent ? (
              child ? (
                <>{greet}. <span className="amber">{child.name.split(" ")[0]}</span><br />is in Class {child.cls}.</>
              ) : (
                <>{greet}.<br />No child linked to this account yet.</>
              )
            ) : (
              <>{greet}. <span className="amber">{(E.ADDED_STUDENTS || []).length || "No"} student{(E.ADDED_STUDENTS || []).length === 1 ? "" : "s"}</span><br />on roll today.</>
            )}
          </div>
          <div className="page-sub">
            {isParent
              ? "Your child's fees, attendance, and transport — all in one place."
              : "Your operating snapshot — fees, attendance, transport."}
          </div>
        </div>
        <div className="page-actions">
          <div className="segmented">
            {["Today", "1W", "4W", "12W", "YTD"].map((rg) => (
              <button key={rg} className={range === rg ? "active" : ""} onClick={() => setRange(rg)}>
                {rg}
              </button>
            ))}
          </div>
          <button className="btn">
            <Icon name="download" size={13} />
            Export
          </button>
          <button className="btn accent">
            <Icon name="plus" size={13} />
            Quick add
          </button>
        </div>
      </div>

      {(() => {
        const studentCount = (E.ADDED_STUDENTS || []).length;
        const collected = (RECENT_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);
        const pendingTotal = (PENDING_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);
        return (
          <div className="grid g-4" style={{ marginBottom: 20 }}>
            <KPI label="Students" value={studentCount} sub="on roll" puck="mint" puckIcon="students" />
            <KPI label="Fees collected" value={moneyK(collected)} sub={pendingTotal > 0 ? `${moneyK(pendingTotal)} still pending` : "this term"} puck="peach" puckIcon="fees" />
            <KPI label="Attendance" value="—" sub="needs attendance data" puck="cream" puckIcon="check" />
            <KPI label="Buses" value={(E.ROUTES || []).length || 0} sub={(E.ROUTES || []).length ? "running" : "no routes"} puck="sky" puckIcon="bus" />
          </div>
        );
      })()}

      <div className="grid g-12" style={{ marginBottom: 20 }}>
        <div className="card col-8">
          <div className="card-head">
            <div>
              <div className="card-title">Money coming in, money going out</div>
              <div className="card-sub">Weekly · lakhs · April YTD</div>
            </div>
            <div className="card-actions">
              <span className="chip accent">
                <span className="dot" />
                Income
              </span>
              <span className="chip">
                <span className="dot" />
                Expense
              </span>
            </div>
          </div>
          <div className="card-body" style={{ padding: "10px 14px 14px" }}>
            <LineBarChart data={INCOME_SERIES} w={760} h={240} lineKeys={["inc"]} barKey="exp" palette={["var(--accent)"]} />
            {(() => {
              const incomeYtd = (RECENT_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);
              const expenseYtd = 0;
              const surplus = incomeYtd - expenseYtd;
              const margin = incomeYtd > 0 ? Math.round((surplus / incomeYtd) * 100) : 0;
              return (
                <div style={{ display: "flex", gap: 28, paddingTop: 14, borderTop: "1px solid var(--rule-2)", marginTop: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Income YTD</div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginTop: 4, letterSpacing: "-0.02em" }}>{moneyK(incomeYtd)}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{(RECENT_FEES || []).length} fee receipt{(RECENT_FEES || []).length === 1 ? "" : "s"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Expense YTD</div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginTop: 4, letterSpacing: "-0.02em" }}>{moneyK(expenseYtd)}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>not tracked yet</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Net surplus</div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginTop: 4, letterSpacing: "-0.02em", color: "var(--ok)" }}>
                      {moneyK(surplus)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{incomeYtd > 0 ? `${margin}% margin` : "no income yet"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", alignSelf: "center" }}>
                    <button className="btn sm">
                      <Icon name="link" size={12} />
                      Open ledger
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="card col-4 ai-brief">
          <div className="card-body" style={{ position: "relative", zIndex: 1 }}>
            <div className="eyebrow">
              <Icon name="sparkles" size={11} /> Briefing
            </div>
            <div className="headline">Today's focus.</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5, lineHeight: 1.5 }}>
              Insights will appear here once there is enough activity to summarise — pending fees, late buses, low stock.
            </div>
          </div>
        </div>
      </div>

      <div className="grid g-12" style={{ marginBottom: 20 }}>
        <div className="card col-5">
          <div className="card-head">
            <div>
              <div className="card-title">Transport · live boarding</div>
              <div className="card-sub">Morning run · 3 buses</div>
            </div>
            <span className="live-pill">
              <span className="pulse-dot" />
              Live
            </span>
          </div>
          <div>
            {ROUTES.length === 0 && (
              <div className="empty">No transport routes yet.</div>
            )}
            {ROUTES.map((r) => {
              const boarded = r.stops.reduce((a, s) => a + s.boarded, 0);
              const total = r.stops.reduce((a, s) => a + s.cap, 0);
              const absent = r.stops.reduce((a, s) => a + s.absent, 0);
              const pct = total ? Math.round((boarded / total) * 100) : 0;
              return (
                <div key={r.code} className="lrow">
                  <div className="school-puck" style={{ width: 36, height: 36, borderRadius: 10 }}>
                    <Icon name="bus" size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{r.code}</span>
                      <span style={{ fontSize: 13 }}>{r.name}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                      {r.driver} · {r.eta}
                    </div>
                  </div>
                  <div style={{ width: 90 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--ink-3)", marginBottom: 4 }}>
                      <span>
                        {boarded}/{total}
                      </span>
                      {absent > 0 && <span style={{ color: "var(--bad)" }}>{absent} abs</span>}
                    </div>
                    <div className="bar">
                      <span style={{ width: `${pct}%`, background: r.status === "delayed" ? "var(--warn)" : "var(--ok)" }} />
                    </div>
                  </div>
                  <span className={`chip ${r.status === "delayed" ? "warn" : "ok"}`}>
                    <span className="dot" />
                    {r.status === "delayed" ? "Late" : "On route"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <div>
              <div className="card-title">Fees by class</div>
              <div className="card-sub">Paid vs pending · Classes 1–8</div>
            </div>
          </div>
          <div className="card-body" style={{ padding: "8px 6px" }}>
            <BarChart
              data={CLASS_STRENGTH}
              w={360}
              h={190}
              xKey="label"
              yKey="paid"
              yKey2="pending"
              labelFmt={(d) => `${d.paid}/${d.total}`}
              palette={["var(--accent)", "var(--rule-2)"]}
            />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 12px 4px", borderTop: "1px solid var(--rule-2)", marginTop: 6 }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Avg collection</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>
                {CLASS_STRENGTH.length && CLASS_STRENGTH.reduce((a, c) => a + c.total, 0)
                  ? Math.round((CLASS_STRENGTH.reduce((a, c) => a + c.paid, 0) / CLASS_STRENGTH.reduce((a, c) => a + c.total, 0)) * 100) + "%"
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="card col-3">
          <div className="card-head">
            <div>
              <div className="card-title">Today</div>
              <div className="card-sub">28 April · 08:14</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, justifyItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <Ring pct={91} label="91%" sub="attend." color="var(--accent)" track="var(--rule-2)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <Ring pct={87} label="87%" sub="h/work" color="var(--ok)" track="var(--rule-2)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <Ring pct={68} label="68%" sub="fees" color="var(--peach-ink)" track="var(--rule-2)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <Ring pct={92} label="38" sub="staff" color="var(--info)" track="var(--rule-2)" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid g-12">
        <div className="card col-5">
          <div className="card-head">
            <div>
              <div className="card-title">Recent fees</div>
              <div className="card-sub">Last 2 hours · auto-receipts sent</div>
            </div>
            <button className="btn sm ghost">
              View all <Icon name="chevronRight" size={11} />
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th className="num">Amount</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_FEES.length === 0 && (
                <tr><td colSpan={4} className="empty">No fees collected yet.</td></tr>
              )}
              {RECENT_FEES.slice(0, 6).map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <AvatarChip initials={f.name.split(" ").map((n) => n[0]).join("")} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{f.name}</div>
                        <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{f.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="chip">{f.cls}</span>
                  </td>
                  <td className="num">{money(f.amount)}</td>
                  <td style={{ color: "var(--ink-3)", fontSize: 12 }}>{f.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <div>
              <div className="card-title">Pending fees</div>
              <div className="card-sub">{PENDING_FEES.length} {PENDING_FEES.length === 1 ? "student" : "students"} · {moneyK(PENDING_FEES.reduce((a, f) => a + f.amount, 0))} outstanding</div>
            </div>
            <button className="btn sm">
              <Icon name="send" size={12} />
              Remind all
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th className="num">Amount</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {PENDING_FEES.length === 0 && (
                <tr><td colSpan={3} className="empty">No pending fees.</td></tr>
              )}
              {PENDING_FEES.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                      {f.name}{" "}
                      <span style={{ color: "var(--ink-4)", fontWeight: 400, marginLeft: 4 }}>{f.cls}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{f.id}</div>
                  </td>
                  <td className="num">{money(f.amount)}</td>
                  <td>
                    {f.overdue ? (
                      <span className="chip bad">
                        <span className="dot" />
                        {f.due}
                      </span>
                    ) : (
                      <span className="chip warn">
                        <span className="dot" />
                        {f.due}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card col-3">
          <div className="card-head">
            <div>
              <div className="card-title">Activity</div>
              <div className="card-sub">Live · audit trail</div>
            </div>
          </div>
          <div className="activity">
            {ACTIVITIES.length === 0 && (
              <div className="empty">No activity yet.</div>
            )}
            {ACTIVITIES.slice(0, 7).map((a, i) => (
              <div key={i} className="act-item">
                <div className={`act-ico ${a.tone === "accent" ? "accent" : a.tone}`}>
                  <Icon
                    name={
                      a.t === "fee" ? "fees" :
                      a.t === "enquiry" ? "enquiry" :
                      a.t === "complaint" ? "complaint" :
                      a.t === "stock" ? "inventory" :
                      a.t === "attendance" ? "students" :
                      a.t === "donation" ? "donors" :
                      a.t === "salary" ? "money" : "zap"
                    }
                    size={12}
                  />
                </div>
                <div className="act-body">
                  <div className="line">{a.title}</div>
                  <div className="sub">{a.sub}</div>
                </div>
                <div className="act-time">{a.ts}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

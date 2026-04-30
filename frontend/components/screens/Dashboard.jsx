"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { KPI, BarChart, LineBarChart, Ring, AvatarChip } from "../ui";
import { money, moneyK } from "@/lib/format";

export default function ScreenDashboard({ E, role }) {
  const { KPIS, CLASS_STRENGTH, RECENT_FEES, PENDING_FEES, ACTIVITIES, ROUTES, INCOME_SERIES } = E;
  const isParent = role === "parent";
  const child = isParent ? (E.ADDED_STUDENTS || [])[0] : null;

  // Greeting + date string both depend on the client clock — computed after
  // mount to avoid SSR/CSR hydration mismatch.
  const [greet, setGreet] = useState("Hello");
  const [dateLabel, setDateLabel] = useState("");
  const [todayIso, setTodayIso] = useState("");
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreet(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setDateLabel(now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    setTodayIso(now.toISOString().slice(0, 10));
  }, []);

  // Parent dashboard is a focused view for one child — daily log, attendance,
  // transport, and announcements. It replaces the operations-style layout
  // that staff/admin see.
  if (isParent) {
    return (
      <ParentDashboard
        child={child}
        greet={greet}
        dateLabel={dateLabel}
        todayIso={todayIso}
        E={E}
      />
    );
  }

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
      </div>

      {(() => {
        const studentCount = (E.ADDED_STUDENTS || []).length;
        const collected = (RECENT_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);
        const pendingTotal = (PENDING_FEES || []).reduce((a, f) => a + (f.amount || 0), 0);
        const studentsByClass = {};
        for (const s of (E.ADDED_STUDENTS || [])) {
          studentsByClass[s.cls] = (studentsByClass[s.cls] || 0) + 1;
        }
        return (
          <div className="grid g-4" style={{ marginBottom: 20 }}>
            <KPI
              label="Students" value={studentCount} sub="on roll"
              puck="mint" puckIcon="students"
              details={{
                title: `Students · ${studentCount} on roll`,
                sub: "Breakdown by class-section",
                items: Object.entries(studentsByClass)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([cls, n]) => ({ label: `Class ${cls}`, value: n, sub: `${n} student${n === 1 ? "" : "s"}` })),
              }}
            />
            <KPI
              label="Fees collected" value={moneyK(collected)}
              sub={pendingTotal > 0 ? `${moneyK(pendingTotal)} still pending` : "this term"}
              puck="peach" puckIcon="fees"
              details={{
                title: `Fees · ${moneyK(collected)} collected`,
                sub: `${(RECENT_FEES || []).length} receipts · ${moneyK(pendingTotal)} still outstanding`,
                items: (RECENT_FEES || []).slice(0, 8).map((f) => ({
                  label: `${f.name} · ${f.cls}`,
                  value: `₹${(f.amount || 0).toLocaleString("en-IN")}`,
                  sub: `${f.method} · ${f.time}`,
                  tone: "ok",
                })),
              }}
            />
            <KPI
              label="Attendance" value="—" sub="needs attendance data"
              puck="cream" puckIcon="check"
            />
            <KPI
              label="Buses" value={(E.ROUTES || []).length || 0}
              sub={(E.ROUTES || []).length ? "running" : "no routes"}
              puck="sky" puckIcon="bus"
              details={{
                title: `Transport · ${(E.ROUTES || []).length} bus${(E.ROUTES || []).length === 1 ? "" : "es"}`,
                sub: "Current run status by route",
                items: (E.ROUTES || []).map((r) => {
                  const stops = r.stops || [];
                  const cur = stops.find((s) => s.status === "current");
                  return {
                    label: `${r.code} · ${r.name}`,
                    value: r.status === "completed" ? "Done" : cur ? cur.name : (r.status || "Idle"),
                    sub: `${r.driver} · ${stops.length} stops`,
                  };
                }),
              }}
            />
          </div>
        );
      })()}

      <div className="grid g-12" style={{ marginBottom: 20 }}>
        <div className="card col-12">
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

      </div>

      {/* Live alerts strip — pulls from real data so the principal can act in one click */}
      {!isParent && (() => {
        const todayIso = new Date().toISOString().slice(0, 10);
        const todaysLogs = (E.DAILY_LOGS || []).filter((l) => l.date === todayIso);
        const absentToday = todaysLogs.filter((l) => l.attendance === "absent");
        const pendingHomework = todaysLogs.filter((l) => l.homeworkStatus === "pending");
        const incompleteClasswork = todaysLogs.filter((l) => l.classworkStatus === "not_completed");
        const openComplaints = (E.COMPLAINTS || []).filter((c) => c.status === "Open");
        const overdueFees = (PENDING_FEES || []).filter((f) => f.overdue);
        const items = [
          openComplaints.length && { tone: "bad", icon: "complaint", title: `${openComplaints.length} pending complaint${openComplaints.length === 1 ? "" : "s"}`, sub: openComplaints.slice(0, 3).map((c) => c.student || "—").join(" · ") },
          absentToday.length      && { tone: "warn", icon: "users",     title: `${absentToday.length} student${absentToday.length === 1 ? "" : "s"} absent today`, sub: absentToday.slice(0, 3).map((l) => l.studentName).join(" · ") },
          pendingHomework.length  && { tone: "warn", icon: "book",      title: `${pendingHomework.length} pending homework`, sub: pendingHomework.slice(0, 3).map((l) => l.studentName).join(" · ") },
          incompleteClasswork.length && { tone: "warn", icon: "pencil", title: `${incompleteClasswork.length} classwork not completed`, sub: incompleteClasswork.slice(0, 3).map((l) => l.studentName).join(" · ") },
          overdueFees.length      && { tone: "bad",  icon: "fees",      title: `${overdueFees.length} overdue fee${overdueFees.length === 1 ? "" : "s"}`, sub: overdueFees.slice(0, 3).map((f) => f.name).join(" · ") },
        ].filter(Boolean);
        if (items.length === 0) return null;
        return (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head">
              <div><div className="card-title">Live alerts</div><div className="card-sub">{items.length} item{items.length === 1 ? "" : "s"} need attention</div></div>
            </div>
            <div>
              {items.map((it, i) => (
                <div key={i} className="lrow">
                  <div className={`act-ico ${it.tone}`}><Icon name={it.icon} size={13} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{it.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{it.sub || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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

// ---------- Parent dashboard ----------
// Focused on a single child: today's daily log (attendance / classwork /
// homework / handwriting), bus status, recent announcements, fees summary.
function ParentDashboard({ child, greet, dateLabel, todayIso, E }) {
  if (!child) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">{dateLabel || " "}</div>
            <div className="page-title">{greet}.<br />No child linked yet.</div>
            <div className="page-sub">Ask the school office to link your account to your child's record.</div>
          </div>
        </div>
      </div>
    );
  }

  const logs = (E.DAILY_LOGS || []).filter((l) => l.studentId === child.id);
  const today = logs.find((l) => l.date === todayIso);
  const route = (E.ROUTES || []).find((r) => r.code === child.transport);
  const myFees    = (E.PENDING_FEES || []).filter((f) => f.id === child.id);
  const myPaid    = (E.RECENT_FEES || []).filter((f) => (f.studentId || f.id) === child.id);
  const announcements = (E.BROADCASTS || []).filter((b) =>
    b.audience === "all" || b.audience === `class_${child.cls}`
  ).slice(0, 4);

  // 7-day attendance summary from real logs
  const last7 = (() => {
    if (!todayIso) return [];
    const out = [];
    const today = new Date(`${todayIso}T00:00:00`);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const log = logs.find((l) => l.date === iso);
      out.push({
        iso,
        label: d.toLocaleDateString("en-IN", { weekday: "short" })[0],
        state: !log ? (d.getDay() === 0 ? "weekend" : "empty") : (log.attendance === "absent" ? "absent" : "present"),
      });
    }
    return out;
  })();

  const presentCount = logs.filter((l) => l.attendance !== "absent").length;
  const totalLogs = logs.length;
  const attendancePct = totalLogs ? Math.round((presentCount / totalLogs) * 100) : null;

  // Bus current stop label
  const busInfo = route
    ? {
        code: route.code, name: route.name,
        driver: route.driver,
        currentStop: (route.stops || []).find((s) => s.status === "current")?.name || (route.stops || [])[0]?.name || "—",
        eta: route.eta,
      }
    : null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{dateLabel || " "}</div>
          <div className="page-title">
            {greet}. <span className="amber">{child.name.split(" ")[0]}</span><br />is in Class {child.cls}.
          </div>
          <div className="page-sub">Today's classroom report, attendance, transport, and any messages from the school.</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Today" value={today ? (today.attendance === "absent" ? "Absent" : "Present") : "Not posted"}
             sub={today ? `posted by ${today.postedBy || "teacher"}` : "teacher hasn't posted yet"}
             puck={today?.attendance === "absent" ? "rose" : "mint"}
             puckIcon={today?.attendance === "absent" ? "x" : "check"} />
        <KPI label="Attendance · this term" value={attendancePct !== null ? `${attendancePct}%` : "—"}
             sub={totalLogs ? `${presentCount}/${totalLogs} days` : "no logs yet"}
             puck="cream" puckIcon="trending" />
        <KPI label="Bus" value={busInfo ? busInfo.code : "—"}
             sub={busInfo ? busInfo.currentStop : "no route assigned"}
             puck="sky" puckIcon="bus" />
        <KPI label="Fees pending" value={myFees.length ? `₹${myFees.reduce((a, f) => a + (f.amount || 0), 0).toLocaleString("en-IN")}` : "₹0"}
             sub={myFees.length ? `${myFees.length} pending` : "all clear"}
             puck="peach" puckIcon="fees" />
      </div>

      <div className="grid g-12">
        {/* Today's daily log */}
        <div className="card col-7">
          <div className="card-head">
            <div>
              <div className="card-title">Today · classroom report</div>
              <div className="card-sub">
                {today
                  ? `Posted by ${today.postedBy || "teacher"} · ${today.postedAt ? new Date(today.postedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}`
                  : "Your child's teacher hasn't posted today's update yet"}
              </div>
            </div>
            <div className="card-actions">
              {today
                ? <span className="chip ok"><span className="dot" />Submitted</span>
                : <span className="chip"><span className="dot" />Pending</span>}
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!today ? (
              <div className="empty" style={{ padding: 24 }}>Once the class teacher submits today's log, you'll see attendance, classwork, homework, handwriting and any teacher notes here.</div>
            ) : (() => {
              const absent = today.attendance === "absent";
              const rows = [
                { l: "Attendance", v: absent ? "Absent" : "Present", c: absent ? <span className="chip bad">Absent</span> : <span className="chip ok">Present</span> },
                ...(absent && today.leaveReason ? [{ l: "Reason", v: today.leaveReason, c: null }] : []),
                { l: "Classwork", v: today.classwork || "—", c: today.classworkStatus === "completed" ? <span className="chip ok">Done</span> : today.classworkStatus === "not_completed" ? <span className="chip bad">Not done</span> : null },
                { l: "Homework",  v: today.homework  || "—", c: today.homeworkStatus  === "completed" ? <span className="chip ok">Done</span> : today.homeworkStatus  === "pending"       ? <span className="chip warn">Pending</span> : null },
                { l: "Handwriting", v: today.handwritingNote || "—", c: today.handwritingGrade ? <span className="chip">{today.handwritingGrade}</span> : null },
                { l: "Topics covered", v: today.topics || "—", c: null },
                { l: "Behaviour", v: today.behaviour || "—", c: null },
                { l: "Extra-curricular", v: today.extra || "—", c: null },
              ];
              return rows.map((r, i, arr) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 12, alignItems: "flex-start", paddingBottom: 10, borderBottom: i < arr.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 1 }}>{r.l}</div>
                  <div style={{ fontSize: 13 }}>{r.v}</div>
                  <div>{r.c}</div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Right column: Bus + Last 7 days + Announcements */}
        <div className="col-5" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head"><div><div className="card-title">Bus · today</div><div className="card-sub">{busInfo ? `${busInfo.code} · ${busInfo.name}` : "No transport assigned"}</div></div></div>
            <div className="card-body">
              {busInfo ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ color: "var(--ink-3)" }}>Current stop</span>
                    <span style={{ fontWeight: 500 }}>{busInfo.currentStop}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ color: "var(--ink-3)" }}>Driver</span>
                    <span style={{ fontWeight: 500 }}>{busInfo.driver}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ color: "var(--ink-3)" }}>Window</span>
                    <span className="mono" style={{ fontSize: 12 }}>{busInfo.eta}</span>
                  </div>
                </div>
              ) : (
                <div className="empty" style={{ padding: 16 }}>Your child isn't assigned to a school route. Speak to the office to set this up.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Last 7 days</div><div className="card-sub">Attendance pattern</div></div></div>
            <div className="card-body">
              <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
                {last7.map((d) => {
                  const colours = { present: "var(--ok)", absent: "var(--err, #b13c1c)", weekend: "var(--rule-2)", empty: "var(--bg-2)" };
                  return (
                    <div key={d.iso} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div title={`${d.iso} — ${d.state}`} style={{
                        width: "100%", height: 36, borderRadius: 6,
                        background: colours[d.state],
                        opacity: d.state === "weekend" ? 0.5 : 1,
                      }} />
                      <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{d.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--ink-4)", display: "flex", gap: 12 }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--ok)", marginRight: 4 }}/>Present</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--err, #b13c1c)", marginRight: 4 }}/>Absent</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--bg-2)", marginRight: 4, border: "1px solid var(--rule)" }}/>No log</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">From the school</div><div className="card-sub">{announcements.length ? `${announcements.length} recent` : "No recent messages"}</div></div></div>
            {announcements.length === 0 ? (
              <div className="empty" style={{ padding: 16 }}>Class announcements and school broadcasts appear here.</div>
            ) : (
              <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {announcements.map((a) => (
                  <div key={a.id} style={{ padding: 10, background: "var(--bg-2)", borderRadius: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{a.campaign || a.audienceLabel}</div>
                      <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{a.sentAt ? new Date(a.sentAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.4 }}>{a.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fees summary */}
      <div className="grid g-12" style={{ marginTop: 14 }}>
        <div className="card col-12">
          <div className="card-head">
            <div><div className="card-title">Fees</div><div className="card-sub">{myFees.length ? `${myFees.length} pending · ${myPaid.length} paid this term` : `All clear · ${myPaid.length} receipt${myPaid.length === 1 ? "" : "s"} this term`}</div></div>
          </div>
          <table className="table">
            <thead><tr><th>Status</th><th>Description</th><th className="num">Amount</th><th>When / Due</th></tr></thead>
            <tbody>
              {myFees.length === 0 && myPaid.length === 0 && (
                <tr><td colSpan={4} className="empty">No fee history yet.</td></tr>
              )}
              {myFees.map((f) => (
                <tr key={`p-${f.id}-${f.due}`}>
                  <td><span className={`chip ${f.overdue ? "bad" : "warn"}`}><span className="dot" />{f.overdue ? "Overdue" : "Pending"}</span></td>
                  <td style={{ fontSize: 13 }}>Tuition · Class {f.cls}</td>
                  <td className="num" style={{ fontWeight: 500 }}>₹{(f.amount || 0).toLocaleString("en-IN")}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{f.due}</td>
                </tr>
              ))}
              {myPaid.slice(0, 5).map((f, i) => (
                <tr key={`r-${f.id}-${i}`}>
                  <td><span className="chip ok"><span className="dot" />Paid</span></td>
                  <td style={{ fontSize: 13 }}>Tuition · Class {f.cls} <span style={{ color: "var(--ink-4)", fontSize: 11 }}>({f.method})</span></td>
                  <td className="num" style={{ fontWeight: 500 }}>₹{(f.amount || 0).toLocaleString("en-IN")}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{f.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

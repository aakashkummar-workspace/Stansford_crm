"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { AvatarChip, FakeQR, StatusChip } from "../ui";
import { money, moneyK } from "@/lib/format";

const DEMO_PARENT_PHONE = "+919876543210";

export default function ScreenFees({ E, refresh, role }) {
  const isParent = role === "parent";
  // ---------- core state ----------
  const [selected, setSelected] = useState(E.PENDING_FEES[0] || E.RECENT_FEES[0]);
  const [stage, setStage] = useState("pick");
  const [method, setMethod] = useState("UPI");
  const [busy, setBusy] = useState(false);

  // ---------- filters / selection ----------
  const [statusFilter, setStatusFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [picked, setPicked] = useState(new Set());

  // ---------- toast ----------
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // ---------- derived data ----------
  const all = useMemo(
    () => [
      ...E.RECENT_FEES.map((f) => ({ ...f, status: "paid" })),
      ...E.PENDING_FEES.map((f) => ({ ...f, status: f.overdue ? "overdue" : "pending", method: "—", time: "due " + f.due })),
    ],
    [E.RECENT_FEES, E.PENDING_FEES]
  );

  const counts = {
    All: all.length,
    Paid: all.filter((f) => f.status === "paid").length,
    Pending: all.filter((f) => f.status === "pending").length,
    Overdue: all.filter((f) => f.status === "overdue").length,
  };

  const visible = all.filter((f) => {
    if (statusFilter === "Paid" && f.status !== "paid") return false;
    if (statusFilter === "Pending" && f.status !== "pending") return false;
    if (statusFilter === "Overdue" && f.status !== "overdue") return false;
    if (classFilter !== "All" && f.cls.split("-")[0] !== classFilter.replace("Class ", "")) return false;
    return true;
  });

  const totals = {
    collected: E.RECENT_FEES.reduce((a, f) => a + f.amount, 0),
    pending: E.PENDING_FEES.reduce((a, f) => a + f.amount, 0),
    overdue: E.PENDING_FEES.filter((f) => f.overdue).reduce((a, f) => a + f.amount, 0),
  };

  // After data refresh, if `selected` is paid and we're in "pick", advance to next pending
  useEffect(() => {
    if (stage !== "pick" || !selected) return;
    const stillPending = E.PENDING_FEES.find((f) => f.id === selected.id);
    if (!stillPending) {
      const next = E.PENDING_FEES[0];
      if (next) setSelected(next);
    }
  }, [E.PENDING_FEES, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop bulk selections that no longer exist
  useEffect(() => {
    setPicked((prev) => {
      const valid = new Set(all.map((f) => f.id));
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [all]);

  // ---------- handlers ----------
  const proceed = () => setStage("qr");

  const markPaid = async () => {
    if (!selected) return;
    if (selected.status === "paid") {
      setStage("paid");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/fees/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, method }),
      });
      const json = await r.json();
      if (!json.ok) {
        flash("Could not post payment", "bad");
        setBusy(false);
        return;
      }
      await refresh?.();
      flash("Payment posted · receipt auto-sent", "ok");
    } finally {
      setBusy(false);
      setStage("paid");
    }
  };

  const reset = () => setStage("pick");

  const openReceipt = (fee) => {
    setSelected(fee);
    setStage("paid");
    flash(`Receipt loaded · ${fee.id}`);
  };

  const headerCollect = () => {
    if (E.PENDING_FEES.length === 0) {
      flash("No pending fees right now", "ok");
      return;
    }
    setCollectOpen((v) => !v);
  };
  const pickFromCollect = (fee) => {
    setSelected(fee);
    setStage("pick");
    setCollectOpen(false);
    flash(`Loaded ${fee.name} · choose method and proceed`);
  };

  const togglePick = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const eligibleForRemind = visible.filter((f) => f.status !== "paid").map((f) => f.id);
  const allChecked = eligibleForRemind.length > 0 && eligibleForRemind.every((id) => picked.has(id));
  const togglePickAll = () => {
    if (allChecked) setPicked(new Set());
    else setPicked(new Set(eligibleForRemind));
  };

  const remindSelected = async (channel = "WhatsApp") => {
    if (picked.size === 0) {
      flash("Pick at least one row first", "bad");
      return;
    }
    const ids = [...picked];
    const r = await fetch("/api/fees/remind", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, channel }),
    });
    const json = await r.json();
    if (json.ok) {
      flash(`${json.count} ${channel} reminders queued`);
      setPicked(new Set());
      await refresh?.();
    } else {
      flash("Reminder failed", "bad");
    }
  };

  const exportCsv = () => {
    const header = "ID,Name,Class,Amount,Status,Method,When";
    const rows = all.map(
      (f) => `${f.id},"${f.name}",${f.cls},${f.amount},${f.status},${f.method || ""},${f.time || ""}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fees-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported ${all.length} rows to CSV`);
  };

  const importStructure = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      flash(`Imported "${f.name}" · ${(f.size / 1024).toFixed(1)} KB`);
    };
    input.click();
  };

  // Receipt actions
  const phoneFor = () => DEMO_PARENT_PHONE.replace(/[^0-9]/g, "");
  const sendWhatsApp = () => {
    const text = encodeURIComponent(`Receipt for ${selected.name} (${selected.id}) · ₹${selected.amount} paid via ${method}. Thank you — Stansford International HR.Sec.School.`);
    window.open(`https://wa.me/${phoneFor()}?text=${text}`, "_blank");
    flash("Opened WhatsApp");
  };
  const sendSms = () => {
    window.open(`sms:${DEMO_PARENT_PHONE}?body=Receipt%20${selected.id}%20%E2%82%B9${selected.amount}%20paid`, "_self");
    flash("Opened SMS app");
  };
  const sendEmail = () => {
    const subject = encodeURIComponent(`Fee receipt · ${selected.id} · ${selected.name}`);
    const body = encodeURIComponent(`Dear Parent,\n\nThis is to confirm receipt of ₹${selected.amount} towards fees for ${selected.name} (Class ${selected.cls}, Reg ID ${selected.id}).\nMethod: ${method}\n\nThank you,\nStansford International HR.Sec.School`);
    window.open(`mailto:parent@example.com?subject=${subject}&body=${body}`, "_self");
    flash("Opened email draft");
  };
  const printReceipt = () => {
    window.print();
    flash("Sent receipt to printer / PDF");
  };

  // ---------- render ----------
  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">Finance · Fees register</div>
          <div className="page-title">Fees & <span className="amber">UPI</span></div>
          <div style={{ display: "flex", gap: 10, color: "var(--ink-3)", fontSize: 12, marginTop: 12, flexWrap: "wrap" }}>
            <span className="chip ok"><span className="dot" />{moneyK(totals.collected)} collected (live)</span>
            <span className="chip warn"><span className="dot" />{moneyK(totals.pending)} pending</span>
            <span className="chip bad"><span className="dot" />{moneyK(totals.overdue)} overdue</span>
          </div>
        </div>
        <div className="page-actions">
          {isParent ? (
            /* Parent view: one primary call-to-action when a pending fee exists */
            E.PENDING_FEES.length > 0 && (
              <button className="btn accent" onClick={() => { setSelected(E.PENDING_FEES[0]); setStage("pick"); flash("Let's pay this term's fee"); }}>
                <Icon name="fees" size={13} />Pay now · {moneyK(E.PENDING_FEES[0].amount)}
              </button>
            )
          ) : (
            <>
              <button className="btn" onClick={importStructure}><Icon name="upload" size={13} />Import structure</button>
              <button className="btn" onClick={exportCsv}><Icon name="download" size={13} />Export CSV</button>
              <div style={{ position: "relative" }}>
                <button className="btn accent" onClick={headerCollect}>
                  <Icon name="plus" size={13} />Collect fee
                  {E.PENDING_FEES.length > 0 && (
                    <span className="mono" style={{ marginLeft: 4, fontSize: 11, opacity: 0.85 }}>
                      · {E.PENDING_FEES.length} pending
                    </span>
                  )}
                </button>
                {collectOpen && (
                  <CollectMenu
                    items={E.PENDING_FEES}
                    onPick={pickFromCollect}
                    onClose={() => setCollectOpen(false)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Fee register</div><div className="card-sub">Classes 1–8 · April 2026 term</div></div>
            <div className="card-actions">
              <div className="segmented">
                {["All", "Paid", "Pending", "Overdue"].map((s) => (
                  <button
                    key={s}
                    className={statusFilter === s ? "active" : ""}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s} · {counts[s]}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                <button className={`btn sm ${classFilter !== "All" ? "accent" : ""}`} onClick={() => setFilterOpen((v) => !v)}>
                  <Icon name="filter" size={12} />
                  {classFilter === "All" ? "Filter" : classFilter}
                </button>
                {filterOpen && (
                  <FilterMenu
                    value={classFilter}
                    onClose={() => setFilterOpen(false)}
                    onPick={(v) => { setClassFilter(v); setFilterOpen(false); }}
                  />
                )}
              </div>
            </div>
          </div>

          {!isParent && picked.size > 0 && (
            <div style={{
              padding: "10px 18px", display: "flex", alignItems: "center", gap: 12,
              background: "var(--accent-soft)", borderBottom: "1px solid var(--rule-2)",
              fontSize: 12.5,
            }}>
              <span style={{ fontWeight: 500, color: "var(--accent-2)" }}>{picked.size} selected</span>
              <button className="btn sm accent" onClick={() => remindSelected("WhatsApp")}>
                <Icon name="whatsapp" size={11} />Remind on WhatsApp
              </button>
              <button className="btn sm" onClick={() => remindSelected("SMS")}>
                <Icon name="sms" size={11} />Remind via SMS
              </button>
              <button className="btn sm ghost" onClick={() => setPicked(new Set())} style={{ marginLeft: "auto" }}>Clear</button>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 24 }}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={togglePickAll}
                      disabled={eligibleForRemind.length === 0}
                      title={eligibleForRemind.length ? "Select all unpaid in view" : "Nothing to select"}
                    />
                  </th>
                  <th>Student</th>
                  <th>Class</th>
                  <th className="num">Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={8} className="empty">No fees match this filter.</td></tr>
                )}
                {visible.map((f, i) => (
                  <tr key={f.id + "-" + i} style={selected && selected.id === f.id ? { background: "var(--card-2)" } : undefined}>
                    <td style={{ width: 24 }}>
                      <input
                        type="checkbox"
                        checked={picked.has(f.id)}
                        disabled={f.status === "paid"}
                        onChange={() => togglePick(f.id)}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarChip initials={f.name.split(" ").map((n) => n[0]).join("")} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{f.id}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="chip">{f.cls}</span></td>
                    <td className="num">{money(f.amount)}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{f.method}</td>
                    <td><StatusChip status={f.status}>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</StatusChip></td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{f.time}</td>
                    <td>
                      {f.status !== "paid" ? (
                        <button className="btn sm accent" onClick={() => { setSelected(f); setStage("pick"); flash(`Loaded ${f.name}`); }}>Collect</button>
                      ) : (
                        <button className="btn sm ghost" onClick={() => openReceipt(f)}>Receipt</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <div>
              <div className="card-title">Collect fee</div>
              <div className="card-sub">
                {stage === "pick" && "Step 1 of 3 · Review"}
                {stage === "qr" && "Step 2 of 3 · Payment"}
                {stage === "paid" && "Step 3 of 3 · Receipt"}
              </div>
            </div>
            <div className="card-actions">
              <div style={{ display: "flex", gap: 4 }}>
                {["pick", "qr", "paid"].map((s, i) => (
                  <div
                    key={s}
                    onClick={() => {
                      if (s === "pick") setStage("pick");
                      else if (s === "qr" && selected && selected.status !== "paid") setStage("qr");
                      else if (s === "paid" && selected && selected.status === "paid") setStage("paid");
                    }}
                    style={{
                      height: 4, width: 22, borderRadius: 3, cursor: "pointer",
                      background: ["pick", "qr", "paid"].indexOf(stage) >= i ? "var(--accent)" : "var(--rule-2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {selected && (
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "var(--card-2)", border: "1px solid var(--rule)", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 14 }}>
                    {selected.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{selected.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{selected.cls} · {selected.id} · {DEMO_PARENT_PHONE}</div>
                  </div>
                </div>
                <div className="hr" style={{ margin: "10px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4, fontSize: 12 }}>
                  <span style={{ color: "var(--ink-3)" }}>Term fee</span><span className="mono">{money(selected.amount - 500)}</span>
                  <span style={{ color: "var(--ink-3)" }}>Activity fee</span><span className="mono">{money(500)}</span>
                  <span style={{ color: "var(--ink-3)" }}>Discount</span><span className="mono">—</span>
                  <span style={{ color: "var(--ink-3)" }}>Late fee</span>
                  <span className="mono" style={{ color: selected.overdue ? "var(--bad)" : "inherit" }}>{selected.overdue ? money(200) : "—"}</span>
                </div>
                <div className="hr" style={{ margin: "10px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payable</span>
                  <span className="mono" style={{ fontSize: 20, fontWeight: 500 }}>{money(selected.amount + (selected.overdue ? 200 : 0))}</span>
                </div>
              </div>

              {stage === "pick" && (
                <>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Method</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {[{ k: "UPI", i: "qr" }, { k: "Cash", i: "money" }, { k: "Bank", i: "fees" }].map((m) => (
                        <button
                          key={m.k}
                          onClick={() => setMethod(m.k)}
                          className="btn"
                          style={{
                            justifyContent: "center", padding: "8px 6px",
                            background: method === m.k ? "var(--accent-soft)" : "var(--card)",
                            borderColor: method === m.k ? "var(--accent)" : "var(--rule)",
                            color: method === m.k ? "var(--accent-2)" : "var(--ink-2)",
                          }}
                        >
                          <Icon name={m.i} size={14} />{m.k}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selected.status === "paid" ? (
                    <button className="btn" onClick={() => setStage("paid")} style={{ justifyContent: "center", padding: "10px 12px" }}>
                      View receipt <Icon name="arrowRight" size={13} />
                    </button>
                  ) : (
                    <button className="btn accent" onClick={proceed} style={{ justifyContent: "center", padding: "10px 12px" }}>
                      Proceed <Icon name="arrowRight" size={13} />
                    </button>
                  )}
                </>
              )}

              {stage === "qr" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div className="qrbox"><FakeQR size={156} /></div>
                  <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>stansford@hdfc · {method}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", lineHeight: 1.5 }}>
                    Parent scans this QR in any UPI app.
                    <br />
                    Payment auto-verified & receipt sent.
                  </div>
                  <div style={{ display: "flex", gap: 6, width: "100%" }}>
                    <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={reset} disabled={busy}>Back</button>
                    <button className="btn accent" style={{ flex: 1, justifyContent: "center" }} onClick={markPaid} disabled={busy}>
                      <Icon name="check" size={13} />{busy ? "Posting…" : "Mark paid"}
                    </button>
                  </div>
                  <span className="live-pill"><span className="pulse-dot" />Listening for payment…</span>
                </div>
              )}

              {stage === "paid" && (
                <>
                  <div className="receipt" id="fee-receipt">
                    <div style={{ textAlign: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-sans)", fontSize: 13 }}>STANSFORD INTERNATIONAL HR.SEC.SCHOOL</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>Fee Receipt · STN/RC/2026/{selected.id.replace(/[^0-9]/g, "").slice(-4)}</div>
                    </div>
                    <div style={{ borderTop: "1px dashed var(--rule)", borderBottom: "1px dashed var(--rule)", padding: "6px 0" }}>
                      <div>Student  : {selected.name}</div>
                      <div>Class    : {selected.cls}</div>
                      <div>Reg ID   : {selected.id}</div>
                      <div>Method   : {selected.method && selected.method !== "—" ? selected.method : method} · @hdfc</div>
                      <div>Paid on  : 28-Apr-2026 08:14</div>
                    </div>
                    <div style={{ padding: "6px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Term fee</span><span>{money(selected.amount - 500)}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Activity fee</span><span>{money(500)}</span></div>
                      {selected.overdue && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Late fee</span><span>{money(200)}</span></div>
                      )}
                    </div>
                    <div style={{ borderTop: "1px dashed var(--rule)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                      <span>PAID</span><span>{money(selected.amount + (selected.overdue ? 200 : 0))}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <button className="btn" onClick={sendWhatsApp}><Icon name="whatsapp" size={12} />WhatsApp</button>
                    <button className="btn" onClick={sendSms}><Icon name="sms" size={12} />SMS</button>
                    <button className="btn" onClick={printReceipt}><Icon name="download" size={12} />PDF</button>
                    <button className="btn" onClick={sendEmail}><Icon name="mail" size={12} />Email</button>
                  </div>
                  <button className="btn accent" onClick={() => { reset(); headerCollect(); }} style={{ justifyContent: "center" }}>
                    <Icon name="check" size={13} />Done · collect another
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- helper components ----------
function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.tone === "bad" ? "var(--bad)" : toast.tone === "warn" ? "var(--warn)" : "var(--ok)";
  return (
    <div
      style={{
        position: "fixed",
        top: 76,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        background: bg,
        color: "#fff",
        padding: "10px 18px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 500,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {toast.msg}
    </div>
  );
}

function CollectMenu({ items, onPick, onClose }) {
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest(".collect-menu") && !e.target.closest(".btn")) onClose();
    };
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [onClose]);

  return (
    <div
      className="collect-menu"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 60,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 12,
        boxShadow: "var(--shadow-lg)",
        padding: 6,
        width: 320,
        maxHeight: 380,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 10px 6px", display: "flex", alignItems: "center", gap: 8 }}>
        Pending fees · pick a student
        <span className="mono" style={{ marginLeft: "auto", color: "var(--ink-4)" }}>{items.length}</span>
      </div>
      {items.length === 0 && <div className="empty" style={{ padding: 16 }}>No pending fees.</div>}
      {items.map((f) => (
        <button
          key={f.id}
          onClick={() => onPick(f)}
          className="btn ghost"
          style={{
            width: "100%",
            justifyContent: "flex-start",
            height: "auto",
            padding: "10px 10px",
            gap: 10,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "#fff", display: "grid", placeItems: "center",
            fontWeight: 600, fontSize: 11.5, flexShrink: 0,
          }}>
            {f.name.split(" ").map((n) => n[0]).join("")}
          </span>
          <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{f.name}</span>
            <span style={{ display: "block", fontSize: 11, color: "var(--ink-3)" }}>{f.cls} · {f.id} · due {f.due}</span>
          </span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: f.overdue ? "var(--bad)" : "var(--ink-2)" }}>
            ₹{f.amount.toLocaleString("en-IN")}
          </span>
        </button>
      ))}
    </div>
  );
}

function FilterMenu({ value, onPick, onClose }) {
  // close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest(".filter-menu") && !e.target.closest(".btn")) onClose();
    };
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [onClose]);

  const opts = ["All", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
  return (
    <div
      className="filter-menu"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 50,
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 10,
        boxShadow: "var(--shadow-lg)",
        padding: 6,
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 4px" }}>
        Filter by class
      </div>
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className="btn ghost"
          style={{
            width: "100%",
            justifyContent: "flex-start",
            height: 30,
            padding: "0 10px",
            fontSize: 12.5,
            background: value === o ? "var(--accent-soft)" : "transparent",
            color: value === o ? "var(--accent-2)" : "var(--ink)",
            fontWeight: value === o ? 500 : 400,
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

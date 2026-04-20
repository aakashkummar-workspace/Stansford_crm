"use client";

import { useState } from "react";
import Icon from "../Icon";
import { AvatarChip, FakeQR, StatusChip } from "../ui";
import { money, moneyK } from "@/lib/format";

export default function ScreenFees({ E, refresh }) {
  const [selected, setSelected] = useState(E.PENDING_FEES[0] || E.RECENT_FEES[0]);
  const [stage, setStage] = useState("pick");
  const [method, setMethod] = useState("UPI");
  const [busy, setBusy] = useState(false);

  const all = [
    ...E.RECENT_FEES.map((f) => ({ ...f, status: "paid" })),
    ...E.PENDING_FEES.map((f) => ({ ...f, status: f.overdue ? "overdue" : "pending", method: "—", time: "due " + f.due })),
  ];

  const proceed = () => setStage("qr");

  const markPaid = async () => {
    if (!selected || selected.status === "paid") {
      setStage("paid");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/fees/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, method }),
      });
      await refresh?.();
    } finally {
      setBusy(false);
      setStage("paid");
    }
  };

  const reset = () => setStage("pick");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Finance · Fees register</div>
          <div className="page-title">Fees & <span className="amber">UPI</span></div>
          <div style={{ display: "flex", gap: 10, color: "var(--ink-3)", fontSize: 12, marginTop: 12, flexWrap: "wrap" }}>
            <span className="chip ok"><span className="dot" />{moneyK(E.KPIS.collected.value)} collected</span>
            <span className="chip warn"><span className="dot" />{moneyK(E.KPIS.pending.value)} pending</span>
            <span className="chip bad"><span className="dot" />₹4.38L overdue</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="upload" size={13} />Import structure</button>
          <button className="btn"><Icon name="download" size={13} />Export CSV</button>
          <button className="btn accent"><Icon name="plus" size={13} />Collect fee</button>
        </div>
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Fee register</div><div className="card-sub">Classes 1–8 · April 2026 term</div></div>
            <div className="card-actions">
              <div className="segmented">
                <button className="active">All · {all.length}</button>
                <button>Paid · {E.RECENT_FEES.length}</button>
                <button>Pending · {E.PENDING_FEES.length}</button>
                <button>Overdue · {E.PENDING_FEES.filter((f) => f.overdue).length}</button>
              </div>
              <button className="btn sm"><Icon name="filter" size={12} />Filter</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th></th><th>Student</th><th>Class</th><th className="num">Amount</th><th>Method</th><th>Status</th><th>When</th><th></th></tr></thead>
            <tbody>
              {all.map((f, i) => (
                <tr key={f.id + i} style={selected && selected.id === f.id ? { background: "var(--card-2)" } : undefined}>
                  <td style={{ width: 24 }}><input type="checkbox" defaultChecked={false} /></td>
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
                      <button className="btn sm accent" onClick={() => { setSelected(f); setStage("pick"); }}>Collect</button>
                    ) : (
                      <button className="btn sm ghost">Receipt</button>
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
                    style={{
                      height: 4,
                      width: 22,
                      borderRadius: 3,
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
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{selected.cls} · {selected.id} · +91 98xxxx4251</div>
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
                          justifyContent: "center",
                          padding: "8px 6px",
                          background: method === m.k ? "var(--accent-soft)" : "var(--card)",
                          borderColor: method === m.k ? "var(--accent)" : "var(--rule)",
                          color: method === m.k ? "var(--accent-2)" : "var(--ink-2)",
                        }}
                      >
                        <Icon name={m.i} size={14} />
                        {m.k}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn accent" onClick={proceed} style={{ justifyContent: "center", padding: "10px 12px" }}>
                  Proceed <Icon name="arrowRight" size={13} />
                </button>
              </>
            )}

            {stage === "qr" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div className="qrbox"><FakeQR size={156} /></div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>stansford@hdfc · UPI</div>
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
                <div className="receipt">
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontFamily: "var(--font-sans)", fontSize: 13 }}>STANSFORD INTERNATIONAL SCHOOL</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>Fee Receipt · STN/RC/2026/0418</div>
                  </div>
                  <div style={{ borderTop: "1px dashed var(--rule)", borderBottom: "1px dashed var(--rule)", padding: "6px 0" }}>
                    <div>Student  : {selected.name}</div>
                    <div>Class    : {selected.cls}</div>
                    <div>Reg ID   : {selected.id}</div>
                    <div>Method   : {method} · @hdfc</div>
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
                  <button className="btn"><Icon name="whatsapp" size={12} />WhatsApp</button>
                  <button className="btn"><Icon name="sms" size={12} />SMS</button>
                  <button className="btn"><Icon name="download" size={12} />PDF</button>
                  <button className="btn"><Icon name="mail" size={12} />Email</button>
                </div>
                <button className="btn accent" onClick={reset} style={{ justifyContent: "center" }}>
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

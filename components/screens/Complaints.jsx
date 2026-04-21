"use client";

import { useState } from "react";
import Icon from "../Icon";
import { KPI, StatusChip } from "../ui";

export default function ScreenComplaints({ E, refresh }) {
  const [status, setStatus] = useState("All");
  const complaints = E.COMPLAINTS;
  const filtered = status === "All" ? complaints : complaints.filter((c) => c.status === status);

  const change = async (id, newStatus) => {
    await fetch("/api/complaints", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    await refresh?.();
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">CRM · Complaints</div>
          <div className="page-title">Parent <span className="amber">complaints</span></div>
          <div className="page-sub">Open · in progress · resolved · auto-routed by category</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13} />Export</button>
          <button className="btn accent"><Icon name="plus" size={13} />Log complaint</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Open" value={complaints.filter((c) => c.status === "Open").length} sub="needs action" puck="rose" puckIcon="warning" />
        <KPI label="In progress" value={complaints.filter((c) => c.status === "In Progress").length} sub="being handled" puck="peach" puckIcon="clock" />
        <KPI label="Resolved" value={complaints.filter((c) => c.status === "Resolved").length} sub="closed out" puck="mint" puckIcon="check" />
        <KPI label="Parent CSAT" value="—" sub="needs survey data" puck="cream" puckIcon="heart" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Complaint queue</div><div className="card-sub">Auto-routed by category</div></div>
          <div className="card-actions">
            <div className="segmented">
              {["All", "Open", "In Progress", "Resolved"].map((s) => (
                <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>ID</th><th>Student · Parent</th><th>Issue</th><th>Assigned</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="empty">No complaints match this filter.</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{c.id}</td>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.student} <span style={{ color: "var(--ink-4)", fontWeight: 400 }}>{c.cls}</span></div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.parent}</div>
                  </td>
                  <td style={{ fontSize: 13, maxWidth: 420 }}>{c.issue}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{c.assigned}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{c.date}</td>
                  <td><StatusChip status={c.status} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {c.status === "Open" && <button className="btn sm" onClick={() => change(c.id, "In Progress")}>Start</button>}
                      {c.status === "In Progress" && <button className="btn sm accent" onClick={() => change(c.id, "Resolved")}>Resolve</button>}
                      <button className="icon-btn"><Icon name="more" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

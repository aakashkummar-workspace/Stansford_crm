"use client";

import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";
import { money, moneyK } from "@/lib/format";

export default function ScreenDonors({ E }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">CRM · Trust & Donors</div>
          <div className="page-title">Trust & <span className="amber">Donors</span></div>
          <div className="page-sub">Donor CRM · campaigns · 80G receipts · annual statements</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="send" size={13} />Campaign</button>
          <button className="btn accent"><Icon name="plus" size={13} />Add donor</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Donors" value={(E.DONORS || []).length} sub="on file" puck="mint" puckIcon="donors" />
        <KPI label="Raised · YTD" value={moneyK((E.DONORS || []).reduce((a, d) => a + (d.ytd || 0), 0))} sub="across all donors" puck="cream" puckIcon="trending" />
        <KPI label="CSR partners" value={(E.DONORS || []).filter((d) => d.type === "CSR").length} sub="organisations" puck="peach" puckIcon="shield" />
        <KPI label="Recurring donors" value={0} sub="add to track" puck="sky" puckIcon="refresh" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Donor directory</div><div className="card-sub">Auto-receipts · annual statements</div></div>
            <div className="card-actions">
              <div className="segmented">
                <button className="active">All</button>
                <button>CSR</button>
                <button>Trusts</button>
                <button>Individuals</button>
                <button>Alumni</button>
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Donor</th><th>ID</th><th>Type</th><th className="num">Contributed YTD</th><th>Last gift</th><th>Next touchpoint</th><th></th></tr></thead>
              <tbody>
                {(E.DONORS || []).length === 0 && (
                  <tr><td colSpan={7} className="empty">No donors on file. Add the first one with “Add donor”.</td></tr>
                )}
                {(E.DONORS || []).map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarChip initials={d.name.split(" ").slice(0, 2).map((n) => n[0]).join("")} />
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{d.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{d.id}</td>
                    <td><span className={`chip ${d.type === "CSR" ? "accent" : d.type === "Trust" ? "info" : ""}`}><span className="dot" />{d.type}</span></td>
                    <td className="num" style={{ fontWeight: 500 }}>{money(d.ytd)}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{d.last}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{d.next}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn sm ghost"><Icon name="mail" size={12} /></button>
                        <button className="btn sm ghost"><Icon name="download" size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head"><div><div className="card-title">Active campaigns</div></div></div>
            <div className="empty">No campaigns yet. Create one to set fundraising targets.</div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Top contributors · YTD</div></div></div>
            {(E.DONORS || []).length === 0 ? (
              <div className="empty">Add donors to see contribution rankings.</div>
            ) : (
              <div>
                {[...E.DONORS].sort((a, b) => b.ytd - a.ytd).slice(0, 5).map((d, i) => (
                  <div key={d.id} className="lrow">
                    <div style={{ width: 18, fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{i + 1}</div>
                    <AvatarChip initials={d.name.split(" ").slice(0, 2).map((n) => n[0]).join("")} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                      <div className="s">{d.type}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{moneyK(d.ytd)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

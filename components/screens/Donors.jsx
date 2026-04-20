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
        <KPI label="Donors" value="18" delta="+1" deltaDir="up" sub="active this year" puck="mint" puckIcon="donors" />
        <KPI label="Raised · YTD" value="₹73.4L" delta="+24%" deltaDir="up" sub="across 3 campaigns" puck="cream" puckIcon="trending" />
        <KPI label="CSR partners" value="4" delta="Infosys, Wipro +2" deltaDir="up" sub="multi-year commits" puck="peach" puckIcon="shield" />
        <KPI label="Recurring donors" value="11" delta="61%" deltaDir="up" sub="of donor base" puck="sky" puckIcon="refresh" />
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
                {E.DONORS.map((d) => (
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
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { n: "Library expansion", tgt: 1500000, raised: 1124000, donors: 14 },
                { n: "Computer lab upgrade", tgt: 800000, raised: 312000, donors: 7 },
                { n: "Annual day sponsorship", tgt: 400000, raised: 380000, donors: 9 },
              ].map((c, i) => {
                const pct = Math.round((c.raised / c.tgt) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.n}</span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{pct}%</span>
                    </div>
                    <div className="bar thick"><span style={{ width: `${pct}%`, background: "var(--accent)" }} /></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      <span>{moneyK(c.raised)} / {moneyK(c.tgt)}</span>
                      <span>{c.donors} donors</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Top contributors · YTD</div></div></div>
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
          </div>
        </div>
      </div>
    </div>
  );
}

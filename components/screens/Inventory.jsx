"use client";

import Icon from "../Icon";
import { KPI } from "../ui";

export default function ScreenInventory({ E }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Operations · Inventory</div>
          <div className="page-title">Inventory <span className="amber">register</span></div>
          <div className="page-sub">Books · uniforms · assets · class-wise stock</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="upload" size={13} />Stock in</button>
          <button className="btn"><Icon name="download" size={13} />Stock out</button>
          <button className="btn accent"><Icon name="plus" size={13} />Add item</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="SKUs tracked" value="142" delta="+8" deltaDir="up" sub="across classes" puck="mint" puckIcon="box" />
        <KPI label="Low stock items" value="4" delta="reorder" deltaDir="down" sub="below threshold" puck="rose" puckIcon="warning" />
        <KPI label="Stock value" value="₹8.42L" delta="+3%" deltaDir="up" sub="current on-hand" puck="cream" puckIcon="trending" />
        <KPI label="Suppliers" value="12" sub="2 preferred" puck="sky" puckIcon="users" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Stock register</div><div className="card-sub">Live · auto-updates on issue/purchase</div></div>
            <div className="card-actions">
              <div className="segmented">
                <button className="active">All</button>
                <button>Books</button>
                <button>Uniforms</button>
                <button>Assets</button>
                <button>Low</button>
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Item</th><th>Category</th><th>Class</th><th className="num">On hand</th><th className="num">Min</th><th className="num">Issued</th><th>Health</th><th></th></tr></thead>
              <tbody>
                {E.INVENTORY.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: it.category === "Book" ? "var(--info-soft)" : it.category === "Uniform" ? "var(--accent-soft)" : "var(--card-2)", color: it.category === "Book" ? "var(--info)" : it.category === "Uniform" ? "var(--accent-2)" : "var(--ink-3)", display: "grid", placeItems: "center" }}>
                          <Icon name={it.category === "Book" ? "book" : it.category === "Uniform" ? "user" : "box"} size={14} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{it.item}</span>
                      </div>
                    </td>
                    <td><span className="chip">{it.category}</span></td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{it.cls}</td>
                    <td className="num" style={{ color: it.status === "low" ? "var(--bad)" : "inherit", fontWeight: it.status === "low" ? 500 : 400 }}>{it.stock}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>{it.min}</td>
                    <td className="num" style={{ color: "var(--ink-3)" }}>{it.issued}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="bar" style={{ width: 70 }}>
                          <span style={{ width: `${Math.min(100, (it.stock / (it.min * 1.5)) * 100)}%`, background: it.status === "low" ? "var(--bad)" : "var(--ok)" }} />
                        </div>
                        {it.status === "low" ? <span className="chip bad"><span className="dot" />Low</span> : <span className="chip ok"><span className="dot" />OK</span>}
                      </div>
                    </td>
                    <td>
                      {it.status === "low" ? <button className="btn sm accent"><Icon name="plus" size={11} />Reorder</button> : <button className="btn sm ghost">Issue</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head"><div><div className="card-title">Class-wise stock health</div></div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => {
                const pct = [90, 86, 72, 92, 58, 94, 88, 82][c - 1];
                return (
                  <div key={c} style={{ display: "grid", gridTemplateColumns: "60px 1fr 40px", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 12 }}>Class {c}</div>
                    <div className="bar thick"><span style={{ width: `${pct}%`, background: pct < 70 ? "var(--bad)" : pct < 85 ? "var(--warn)" : "var(--ok)" }} /></div>
                    <div className="mono" style={{ fontSize: 11, textAlign: "right", color: "var(--ink-3)" }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Recent stock movements</div></div></div>
            <div>
              {[
                { t: "IN", tone: "ok", item: "Reading Primers · Class 1", qty: 40, who: "Shree Books Supplier", ago: "20 min" },
                { t: "OUT", tone: "info", item: "Uniform (PE) · Class 6", qty: 4, who: "Issued to students", ago: "1 hr" },
                { t: "IN", tone: "ok", item: "Chemistry reagents", qty: 12, who: "Shakti Labs", ago: "3 hr" },
                { t: "OUT", tone: "info", item: "Tablet iPad 10", qty: 2, who: "AV Dept · Room 204", ago: "yesterday" },
                { t: "IN", tone: "ok", item: "Craft pack · Class 2", qty: 24, who: "Artify India", ago: "yesterday" },
              ].map((m, i) => (
                <div key={i} className="lrow">
                  <div className={`act-ico ${m.tone}`}><Icon name={m.t === "IN" ? "arrowDown" : "arrowUp"} size={13} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5 }}>{m.item}</div>
                    <div className="s">{m.t} · {m.qty} units · {m.who}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{m.ago}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { AvatarChip, FakeQR, StatusChip, UpiQR, buildUpiUri } from "../ui";
import { money, moneyK, FEE_TYPES, feeTypeLabel, formatClassLabel } from "@/lib/format";
import { resolveSchool, downloadPdf } from "@/lib/export";

const DEMO_PARENT_PHONE = "+919876543210";

// Escape HTML for the print-popup template (the receipt is built as a string
// because it lives in a fresh window outside React's reach).
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export default function ScreenFees({ E, refresh, role, session, searchFocus, clearSearchFocus }) {
  const school = resolveSchool(E?.SETTINGS);
  const actor  = session?.name || null;
  const isParent = role === "parent";
  // ---------- core state ----------
  // Parent-aware initial selection: pick the first PENDING (or the first
  // PAID) for the currently-logged-in child, not whichever happens to be
  // top of the global list.
  const [selected, setSelected] = useState(() => {
    const childId = role === "parent" && E.ADDED_STUDENTS && E.ADDED_STUDENTS[0]
      ? E.ADDED_STUDENTS[0].id : null;
    const p = childId ? (E.PENDING_FEES || []).filter((f) => (f.studentId || f.id) === childId) : (E.PENDING_FEES || []);
    const r = childId ? (E.RECENT_FEES  || []).filter((f) => (f.studentId || f.id) === childId) : (E.RECENT_FEES  || []);
    return p[0] || r[0];
  });
  const [stage, setStage] = useState("pick");
  const [method, setMethod] = useState("UPI");
  const [busy, setBusy] = useState(false);
  // Amount the parent is paying right now. Empty string = pay full balance.
  // Validated against the selected fee's outstanding amount in markPaid().
  const [payAmount, setPayAmount] = useState("");
  // Last-completed payment summary for the receipt (so the receipt reflects
  // what was actually paid, even after the pending row is updated).
  const [lastPayment, setLastPayment] = useState(null);

  // Reset the pay-amount whenever the selected fee changes.
  useEffect(() => { setPayAmount(""); setLastPayment(null); }, [selected?.id, selected?.amount]);

  // Trust-wide finance settings (UPI ID, payee name) — used to build the
  // scannable QR on the Pay step. Fetched once on mount; admin changes them
  // under Settings → Finance.
  const [finance, setFinance] = useState({ upi: "", upiPayeeName: "" });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/settings", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled && j.ok) {
          setFinance({
            upi: j.settings?.finance?.upi || "",
            upiPayeeName: j.settings?.finance?.upiPayeeName || "",
          });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Pending row currently being edited (amount-only). Staff-only.
  const [editingFee, setEditingFee] = useState(null);
  // Receipt awaiting delete-confirmation. Only admin/principal/accountant
  // can open this — parents and teachers don't get the delete affordance.
  const [deletingReceipt, setDeletingReceipt] = useState(null);
  const canDeleteReceipt = role === "admin" || role === "principal" || role === "school_accountant";
  // "Add fee" modal — staff picks a student + fee type + amount to create a
  // brand-new pending row. Lets the school collect Application, Kit, ECA,
  // Uniform, Term I/II/III, Van, STEM, Annual Day fees as separate items.
  const [addFeeOpen, setAddFeeOpen] = useState(false);

  const handleAddFee = async (payload) => {
    const r = await fetch("/api/fees/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      flash(j.error || "Could not add fee", "bad");
      return false;
    }
    flash(`${feeTypeLabel(payload.feeType)} added · ₹${Number(payload.amount).toLocaleString("en-IN")}`);
    await refresh?.();
    return true;
  };
  const saveFeeAmount = async (id, amount) => {
    const r = await fetch("/api/fees/amount", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, amount }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      flash(j.error || "Could not update fee", "bad");
      return false;
    }
    flash(`Fee updated · ₹${Number(amount).toLocaleString("en-IN")} outstanding`);
    await refresh?.();
    return true;
  };

  // ---------- parent-scoped fee lists ----------
  // Defence-in-depth: even if AppShell's parent-scoping was applied upstream,
  // we also scope here, so the Fees screen *always* respects "only my child"
  // when viewed as a parent. Non-parent roles see every row as before.
  const myChildId = isParent && E.ADDED_STUDENTS && E.ADDED_STUDENTS[0]
    ? E.ADDED_STUDENTS[0].id : null;
  const scopedPending = useMemo(
    () => (myChildId ? (E.PENDING_FEES || []).filter((f) => (f.studentId || f.id) === myChildId) : (E.PENDING_FEES || [])),
    [E.PENDING_FEES, myChildId]
  );
  const scopedRecent = useMemo(
    () => (myChildId ? (E.RECENT_FEES || []).filter((f) => (f.studentId || f.id) === myChildId) : (E.RECENT_FEES || [])),
    [E.RECENT_FEES, myChildId]
  );

  // ---------- derived data ----------
  const all = useMemo(
    () => [
      ...scopedRecent.map((f) => ({ ...f, status: "paid" })),
      ...scopedPending.map((f) => ({ ...f, status: f.overdue ? "overdue" : "pending", method: "—", time: "due " + f.due })),
    ],
    [scopedRecent, scopedPending]
  );

  // Global search deep-link: when a fee/paid row is picked from the
  // topbar search, select it so the right-hand Collect/Receipt panel
  // jumps to that record.
  useEffect(() => {
    if (!searchFocus) return;
    if (searchFocus.type !== "fee" && searchFocus.type !== "paid") return;
    const hit = all.find((f) => f.id === searchFocus.id);
    if (hit) setSelected(hit);
    clearSearchFocus?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFocus]);

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
    // classFilter holds the raw class number string ("1"-"12", "13"=PRE-MONT,
    // "14"=MONT I, "15"=MONT II) or "All". Compare against f.cls's leading
    // segment so Roman / Montessori labels all work without per-label mapping.
    if (classFilter !== "All" && String(f.cls || "").split("-")[0] !== classFilter) return false;
    return true;
  });

  const totals = {
    collected: scopedRecent.reduce((a, f) => a + f.amount, 0),
    pending: scopedPending.reduce((a, f) => a + f.amount, 0),
    overdue: scopedPending.filter((f) => f.overdue).reduce((a, f) => a + f.amount, 0),
  };

  // After data refresh, if `selected` is paid and we're in "pick", advance to next pending
  useEffect(() => {
    if (stage !== "pick" || !selected) return;
    const stillPending = scopedPending.find((f) => f.id === selected.id);
    if (!stillPending) {
      const next = scopedPending[0];
      if (next) setSelected(next);
    }
  }, [scopedPending, stage]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // UPI needs the QR step so the parent can scan and the office can wait
  // for a "Mark paid" tap once the bank confirms. Cash is collected
  // physically at the counter — there's nothing to scan, so we skip
  // straight to recording the payment.
  //
  // For UPI specifically: as soon as we move to the QR step we ALSO fire
  // the QR off to the parent's WhatsApp via n8n, so they can scan it on
  // their own phone if they're not at the office. Send is fire-and-forget
  // — we don't block the UI on it; the in-office QR shows immediately.
  const proceed = () => {
    if (method === "Cash") {
      markPaid();
      return;
    }
    setStage("qr");
    if (method === "UPI") {
      const balance = (selected.amount || 0) + (selected.overdue ? 200 : 0);
      const amt = payAmount.trim() === "" ? balance : Math.floor(Number(payAmount) || 0);
      // Don't await — the QR is on screen the moment setStage runs.
      // The user sees a toast when WhatsApp confirms (or fails).
      sendQrToWhatsApp(amt);
    }
  };

  const markPaid = async () => {
    if (!selected) return;
    if (selected.status === "paid") {
      setStage("paid");
      return;
    }
    // Validate the partial-amount input before hitting the API.
    const balance = (selected.amount || 0) + (selected.overdue ? 200 : 0);
    const amt = payAmount.trim() === "" ? null : Math.floor(Number(payAmount));
    if (amt !== null) {
      if (!Number.isFinite(amt) || amt <= 0) {
        flash("Enter a valid amount", "bad");
        return;
      }
      if (amt > balance) {
        flash(`Amount can't exceed ₹${balance.toLocaleString("en-IN")}`, "bad");
        return;
      }
    }
    setBusy(true);
    try {
      const r = await fetch("/api/fees/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, method, amount: amt }),
      });
      const json = await r.json();
      if (!json.ok) {
        flash(json.error || "Could not post payment", "bad");
        setBusy(false);
        return;
      }
      // Stash the payment details for the receipt + remember the partial state.
      setLastPayment({
        amount: json.fee.amount,
        remaining: json.remaining,
        partial: json.partial,
        method,
      });
      await refresh?.();
      flash(json.partial
        ? `Partial payment posted · ₹${json.remaining.toLocaleString("en-IN")} still pending`
        : "Payment posted · receipt auto-sent",
        "ok");
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
    if (scopedPending.length === 0) {
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

  // After a Collect-fee → Mark paid, the freshly-paid id is still sitting in
  // `picked` and the user can no longer tick/untick it (the row is disabled).
  // Reconcile silently against the live data so the next Remind only targets
  // ids that are still pending.
  const eligibleSet = new Set(eligibleForRemind);
  useEffect(() => {
    if (picked.size === 0) return;
    let drift = false;
    const next = new Set();
    picked.forEach((id) => {
      if (eligibleSet.has(id)) next.add(id);
      else drift = true;
    });
    if (drift) setPicked(next);
  }, [eligibleForRemind.join("|")]);
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

  // Branded PDF export — opens a printable, properly aligned report with the
  // school logo, identity block, summary chips, and a clean data table.
  const exportPdf = () => {
    const totalCollected = all
      .filter((f) => f.status === "paid")
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalPending = all
      .filter((f) => f.status === "pending" || f.status === "overdue")
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const overdueCount = all.filter((f) => f.status === "overdue").length;

    const opened = downloadPdf({
      title: "Fees Register",
      subtitle: `${all.length} fee record${all.length === 1 ? "" : "s"} · paid, pending and overdue`,
      school,
      actor,
      dateRange: "Current snapshot",
      orientation: "landscape",
      summary: [
        { label: "Total records", value: all.length },
        { label: "Collected",     value: money(totalCollected) },
        { label: "Pending",       value: money(totalPending) },
        { label: "Overdue",       value: overdueCount },
      ],
      columns: [
        { key: "i",      label: "#",        align: "right",  width: "32px" },
        { key: "id",     label: "Receipt / ID", width: "150px" },
        { key: "name",   label: "Student" },
        { key: "cls",    label: "Class",    align: "center", width: "60px" },
        { key: "feeType",label: "Fee type" },
        { key: "amount", label: "Amount",   align: "right" },
        { key: "status", label: "Status",   align: "center", width: "80px" },
        { key: "method", label: "Method",   align: "center", width: "80px" },
        { key: "time",   label: "When",     align: "right",  width: "90px" },
      ],
      rows: all.map((f, i) => ({
        i: i + 1,
        id: f.id,
        name: f.name || "—",
        cls: f.cls || "—",
        feeType: feeTypeLabel(f.feeType) || "—",
        amount: money(f.amount || 0),
        status: (f.status || "—").replace(/^./, (c) => c.toUpperCase()),
        method: f.method || "—",
        time: f.time || "—",
      })),
      filename: `${school.name.replace(/\s+/g, "-").toLowerCase()}-fees-register-${new Date().toISOString().slice(0, 10)}`,
    });
    if (opened === false) {
      flash("Pop-up blocked — please allow pop-ups for this site", "bad");
    } else {
      flash(`Opened PDF preview · ${all.length} rows`);
    }
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
    const text = encodeURIComponent(`Receipt for ${selected.name} (${selected.id}) · ₹${selected.amount} paid via ${method}. Thank you — Sanfort International School.`);
    window.open(`https://wa.me/${phoneFor()}?text=${text}`, "_blank");
    flash("Opened WhatsApp");
  };
  const sendSms = () => {
    window.open(`sms:${DEMO_PARENT_PHONE}?body=Receipt%20${selected.id}%20%E2%82%B9${selected.amount}%20paid`, "_self");
    flash("Opened SMS app");
  };
  const sendEmail = () => {
    const subject = encodeURIComponent(`Fee receipt · ${selected.id} · ${selected.name}`);
    const body = encodeURIComponent(`Dear Parent,\n\nThis is to confirm receipt of ₹${selected.amount} towards fees for ${selected.name} (${formatClassLabel(selected.cls)}, Reg ID ${selected.id}).\nMethod: ${method}\n\nThank you,\nSanfort International School\nRun by Sanvi Educational and Charitable Trust`);
    window.open(`mailto:parent@example.com?subject=${subject}&body=${body}`, "_self");
    flash("Opened email draft");
  };
  // Sends the UPI QR (with amount + student details baked in) to the
  // parent's WhatsApp via the n8n webhook. Server-side resolves the
  // parent's phone from the student record so the UI doesn't need it.
  const sendQrToWhatsApp = async (amt) => {
    if (!selected) return;
    if (busy) return;
    if (!finance.upi) {
      flash("Set the school's UPI ID under Settings → Finance first", "bad");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/fees/send-qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, amount: amt, method }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "Could not send QR");
      flash(`QR sent on WhatsApp to ${j.sentTo}`);
    } catch (e) {
      flash(e.message, "bad");
    } finally { setBusy(false); }
  };
  const printReceipt = () => {
    if (!selected) return;
    const paidAmt   = lastPayment?.amount ?? (selected.amount + (selected.overdue ? 200 : 0));
    const partial   = lastPayment?.partial && lastPayment.remaining > 0;
    const remaining = lastPayment?.remaining || 0;
    const methodUsed = (selected.method && selected.method !== "—") ? selected.method : method;
    const receiptNo  = selected.id.replace(/[^0-9]/g, "").slice(-3).padStart(3, "0");
    const today = new Date();
    const dateStr  = today.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const monthStr = today.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    // Particulars come straight from the fee row's category. A late-fee line
    // is added when the row is overdue. This way the printed receipt matches
    // exactly what was paid (Application Fees / Kit / ECA / Term I etc.).
    const lines = [
      { label: feeTypeLabel(selected.feeType), amount: selected.amount },
    ];
    if (selected.overdue) lines.push({ label: "Late Fee", amount: 200 });
    // Pad to a minimum of 5 rows so the printed receipt has consistent height
    // (matches the physical-book look of the template).
    const minRows = 5;
    const padded = [
      ...lines,
      ...Array.from({ length: Math.max(0, minRows - lines.length) }, () => ({ label: "", amount: null })),
    ];
    const rowsHtml = padded.map((l, i) => `
      <tr>
        <td class="sno">${l.label ? `${i + 1}.` : ""}</td>
        <td class="part">${l.label ? `${escapeHtml(l.label)}<span class="dots"></span>` : "&nbsp;"}</td>
        <td class="amt">${l.amount !== null ? l.amount.toLocaleString("en-IN") : ""}</td>
      </tr>`).join("");
    const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Receipt · ${escapeHtml(selected.name)} · ${escapeHtml(selected.id)}</title>
<style>
  *{box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:18px;background:#fff;}
  .wrap{width:360px;margin:0 auto;border:1px solid #1f3a8a;padding:14px 16px 18px;}
  .school{color:#1f3a8a;font-weight:800;font-size:18px;text-align:center;letter-spacing:0.3px;line-height:1.15;}
  .reg{color:#1f3a8a;font-weight:600;font-size:10.5px;text-align:center;margin-top:2px;}
  .addr{color:#1f3a8a;font-weight:600;font-size:10.5px;text-align:center;margin-top:1px;}
  .cell{color:#1f3a8a;font-weight:600;font-size:10.5px;text-align:center;margin-top:1px;}
  .meta{margin-top:10px;font-size:11.5px;color:#1f3a8a;font-weight:600;}
  .meta .row{display:flex;justify-content:space-between;gap:14px;padding:3px 0;}
  .meta .cell-l{flex:1;}
  .meta .cell-r{flex:1;text-align:left;}
  .field{display:inline-flex;align-items:baseline;gap:4px;}
  .val{display:inline-block;border-bottom:1px dotted #1f3a8a;min-width:90px;padding:0 4px;color:#000;font-weight:500;}
  .slno{color:#c11d1d;font-weight:800;font-size:18px;letter-spacing:1px;border:0;padding-left:6px;}
  table.part{width:100%;border-collapse:collapse;margin-top:10px;border:1px solid #1f3a8a;}
  table.part th{background:#fff;color:#1f3a8a;font-weight:700;font-size:11.5px;border:1px solid #1f3a8a;padding:5px 6px;text-align:left;}
  table.part th.amt-col{text-align:right;width:80px;}
  table.part td{border:1px solid #1f3a8a;padding:6px 6px;font-size:12px;height:22px;}
  table.part td.sno{width:36px;text-align:center;font-weight:600;color:#000;}
  table.part td.amt{width:80px;text-align:right;font-weight:600;font-family:Arial,sans-serif;}
  table.part td.part{position:relative;}
  table.part td.part .dots{display:inline-block;border-bottom:1px dotted #888;flex:1;margin-left:6px;width:60%;}
  table.part tr.total td{font-weight:700;color:#1f3a8a;font-size:13px;background:#fafbff;}
  .footer{display:flex;justify-content:flex-end;margin-top:6px;font-size:11px;color:#000;font-style:italic;}
  .balance{margin-top:6px;font-size:11px;color:#a06820;text-align:right;font-weight:600;}
  .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
  .logo-row img{width:54px;height:54px;object-fit:contain;}
  .logo-row .school-block{flex:1;text-align:center;}
  .trust{color:#1f3a8a;font-weight:700;font-size:11px;text-align:center;margin-top:2px;letter-spacing:0.3px;}
  @media print { @page { size: auto; margin: 8mm; } body{padding:0;} }
</style></head>
<body>
  <div class="wrap">
    <div class="logo-row">
      <img src="${window.location.origin}/logo.png" alt="logo" />
      <div class="school-block">
        <div class="school">SANFORT INTERNATIONAL SCHOOL</div>
        <div class="trust">Sanvi Educational and Charitable Trust</div>
      </div>
    </div>
    <div class="reg">Reg No: SIS/2026/${receiptNo}</div>
    <div class="addr">No.45, MG Road, Chennai - 600 001.</div>
    <div class="cell">Cell : 9876 543 210</div>

    <div class="meta">
      <div class="row">
        <div class="cell-l"><span class="field">Adm. No : <span class="val">${escapeHtml(selected.id)}</span></span></div>
        <div class="cell-r"><span class="field">SL. No. <span class="slno">${receiptNo}</span></span></div>
      </div>
      <div class="row">
        <div class="cell-l"><span class="field">Name : <span class="val">${escapeHtml(selected.name)}</span></span></div>
        <div class="cell-r"><span class="field">Class : <span class="val">${escapeHtml(formatClassLabel(selected.cls))}</span></span></div>
      </div>
      <div class="row">
        <div class="cell-l"><span class="field">Month : <span class="val">${escapeHtml(monthStr)}</span></span></div>
        <div class="cell-r"><span class="field">Date : <span class="val">${escapeHtml(dateStr)}</span></span></div>
      </div>
    </div>

    <table class="part">
      <thead>
        <tr>
          <th>S.No.</th>
          <th>Particulars</th>
          <th class="amt-col">Amount<br/>Rs.</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total">
          <td class="sno"></td>
          <td class="part" style="text-align:right;padding-right:10px;">TOTAL</td>
          <td class="amt">${paidAmt.toLocaleString("en-IN")}</td>
        </tr>
      </tbody>
    </table>

    ${partial ? `<div class="balance">Balance pending: Rs. ${remaining.toLocaleString("en-IN")}</div>` : ""}

    <div class="footer">Paid via ${escapeHtml(methodUsed)} &nbsp;·&nbsp; Cashier</div>
  </div>
  <script>window.addEventListener("load",()=>{setTimeout(()=>{window.print();},80);});</script>
</body></html>`;
    const w = window.open("", "_blank", "width=560,height=820");
    if (!w) { flash("Popup blocked — allow popups to download the receipt", "bad"); return; }
    w.document.open(); w.document.write(html); w.document.close();
    flash(`Receipt for ${selected.name} ready to print / save as PDF`);
  };

  // ---------- render ----------
  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">Finance · Fees register</div>
          <div className="page-title">Fees & <span className="amber">Transaction</span></div>
          <div style={{ display: "flex", gap: 10, color: "var(--ink-3)", fontSize: 12, marginTop: 12, flexWrap: "wrap" }}>
            <span className="chip ok"><span className="dot" />{moneyK(totals.collected)} collected (live)</span>
            <span className="chip warn"><span className="dot" />{moneyK(totals.pending)} pending</span>
            <span className="chip bad"><span className="dot" />{moneyK(totals.overdue)} overdue</span>
          </div>
        </div>
        <div className="page-actions">
          {isParent ? (
            /* Parent view is read-only — payments are taken at the school
               office; this screen just shows what's pending and what's been
               recorded against this child. */
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 30, padding: "0 12px",
              background: "var(--bg-2)", border: "1px solid var(--rule)",
              borderRadius: 999, fontSize: 11.5, color: "var(--ink-3)",
            }}>
              <Icon name="audit" size={11} />Read-only · pay at the school office
            </span>
          ) : (
            <>
              <button
                className="btn"
                onClick={async () => {
                  if (scopedPending.length === 0) { flash("No pending fees to remind about", "bad"); return; }
                  if (!confirm(`Send fee reminder to ${scopedPending.length} parent${scopedPending.length === 1 ? "" : "s"}?`)) return;
                  try {
                    const r = await fetch("/api/fees/remind", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({}),  // no ids = remind all pending
                    });
                    const j = await r.json();
                    if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
                    flash(`Reminder sent to ${j.sent.length} parent${j.sent.length === 1 ? "" : "s"}`, "ok");
                    await refresh?.();
                  } catch (e) { flash(e.message, "bad"); }
                }}
                disabled={scopedPending.length === 0}
                title={scopedPending.length === 0 ? "No pending fees" : `Reminds all ${scopedPending.length} parents with pending fees`}
              >
                <Icon name="megaphone" size={13} />Remind overdue
              </button>
              <button className="btn" onClick={importStructure}><Icon name="upload" size={13} />Import structure</button>
              <button className="btn" onClick={exportPdf} title="Open a printable, branded PDF report">
                <Icon name="download" size={13} />Export PDF
              </button>
              <button className="btn" onClick={() => setAddFeeOpen(true)} title="Create a new pending fee item (Kit, ECA, Term I…)">
                <Icon name="plus" size={13} />Add fee
              </button>
              <div style={{ position: "relative" }}>
                <button className="btn accent" onClick={headerCollect}>
                  <Icon name="plus" size={13} />Collect fee
                  {scopedPending.length > 0 && (
                    <span className="mono" style={{ marginLeft: 4, fontSize: 11, opacity: 0.85 }}>
                      · {scopedPending.length} pending
                    </span>
                  )}
                </button>
                {collectOpen && (
                  <CollectMenu
                    items={scopedPending}
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
                  {classFilter === "All" ? "Filter" : formatClassLabel(classFilter)}
                </button>
                {filterOpen && (
                  <FilterMenu
                    value={classFilter}
                    classes={E.CLASSES || []}
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
                  <th>Fee type</th>
                  <th className="num">Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr><td colSpan={9} className="empty">No fees match this filter.</td></tr>
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
                    <td><span className="chip">{formatClassLabel(f.cls)}</span></td>
                    <td><span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}>{feeTypeLabel(f.feeType)}</span></td>
                    <td className="num">{money(f.amount)}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{f.method}</td>
                    <td><StatusChip status={f.status}>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</StatusChip></td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{f.time}</td>
                    <td>
                      {f.status === "paid" ? (
                        <span style={{ display: "inline-flex", gap: 4 }}>
                          <button className="btn sm ghost" onClick={() => openReceipt(f)}>Receipt</button>
                          {canDeleteReceipt && (
                            <button
                              className="btn sm ghost"
                              title="Delete this receipt from history"
                              onClick={() => setDeletingReceipt(f)}
                              style={{ color: "var(--bad)" }}
                            >
                              <Icon name="x" size={11} />
                            </button>
                          )}
                        </span>
                      ) : isParent ? (
                        <span style={{ fontSize: 11, color: "var(--ink-4)" }}>Pay at office</span>
                      ) : (
                        <span style={{ display: "inline-flex", gap: 4 }}>
                          <button
                            className="btn sm ghost"
                            title="Edit outstanding amount"
                            onClick={() => setEditingFee(f)}
                          >
                            <Icon name="pencil" size={11} />Edit
                          </button>
                          <button className="btn sm accent" onClick={() => { setSelected(f); setStage("pick"); flash(`Loaded ${f.name}`); }}>Collect</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Parents get a read-only summary card; staff get the live Collect flow. */}
        {isParent ? (
          <ParentFeesSummary
            scopedPending={scopedPending}
            scopedRecent={scopedRecent}
            child={E.ADDED_STUDENTS && E.ADDED_STUDENTS[0]}
            openReceipt={openReceipt}
            onRefresh={refresh}
          />
        ) : (
        <>
        {editingFee && (
          <EditFeeAmountModal
            fee={editingFee}
            onClose={() => setEditingFee(null)}
            onSave={async (amt) => {
              const ok = await saveFeeAmount(editingFee.id, amt);
              if (ok) setEditingFee(null);
            }}
          />
        )}
        {deletingReceipt && (
          <DeleteReceiptModal
            receipt={deletingReceipt}
            onCancel={() => setDeletingReceipt(null)}
            onConfirm={async () => {
              try {
                const r = await fetch("/api/fees/receipt", {
                  method: "DELETE",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ id: deletingReceipt.id }),
                });
                const json = await r.json().catch(() => ({}));
                if (!r.ok || !json.ok) throw new Error(json.error || "Delete failed");
                flash(`Receipt ${deletingReceipt.id} removed from history`, "ok");
                setDeletingReceipt(null);
                await refresh?.();
              } catch (e) {
                flash(e.message || "Delete failed", "bad");
              }
            }}
          />
        )}
        <div
          className="card col-4"
          // Sticky so the Collect-fee flow stays in view while the cashier
          // scrolls through a long fee register on the left.
          //   - `top: 68px` clears the 56px sticky topbar plus a 12px gap,
          //     so the card title isn't hidden behind it
          //   - `alignSelf: start` stops the grid cell from stretching to
          //     the row's full height (which would defeat sticky)
          //   - `maxHeight` + scrollY ensures the panel scrolls internally
          //     when its steps grow tall (e.g. QR step with full receipt)
          //   - `zIndex: 4` keeps it under the topbar (z-index 5) so the
          //     topbar still covers its top edge during scroll transitions
          style={{
            position: "sticky",
            top: 68,
            alignSelf: "start",
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
            zIndex: 4,
          }}
        >
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
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{formatClassLabel(selected.cls)} · {selected.id} · {DEMO_PARENT_PHONE}</div>
                  </div>
                </div>
                <div className="hr" style={{ margin: "10px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4, fontSize: 12 }}>
                  <span style={{ color: "var(--ink-3)" }}>{feeTypeLabel(selected.feeType)}</span><span className="mono">{money(selected.amount)}</span>
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
                  {selected.status !== "paid" && (() => {
                    const balance = (selected.amount || 0) + (selected.overdue ? 200 : 0);
                    const amt = payAmount.trim() === "" ? balance : Math.floor(Number(payAmount) || 0);
                    const valid = amt > 0 && amt <= balance;
                    const remaining = balance - amt;
                    const isPartial = remaining > 0;
                    return (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount to pay</span>
                          <button
                            type="button"
                            onClick={() => setPayAmount(String(balance))}
                            style={{ background: "none", border: 0, color: "var(--accent)", fontSize: 11, fontWeight: 500, cursor: "pointer", padding: 0 }}
                          >
                            Pay full ₹{balance.toLocaleString("en-IN")}
                          </button>
                        </div>
                        <div style={{
                          display: "flex", alignItems: "center", height: 38,
                          background: "var(--card-2)", border: `1px solid ${valid ? "var(--rule)" : "var(--bad)"}`,
                          borderRadius: 9, overflow: "hidden",
                        }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", height: "100%",
                            padding: "0 11px",
                            background: "var(--bg-2)", borderRight: "1px solid var(--rule)",
                            fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-3)",
                          }}>₹</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ""))}
                            placeholder={String(balance)}
                            style={{
                              flex: 1, height: "100%", border: 0, background: "transparent",
                              outline: "none", padding: "0 12px",
                              fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink)",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5 }}>
                          <span style={{ color: isPartial ? "var(--warn)" : "var(--ok)" }}>
                            {!valid
                              ? <span style={{ color: "var(--bad)" }}>Enter a valid amount up to ₹{balance.toLocaleString("en-IN")}</span>
                              : isPartial
                                ? <>Partial · ₹{remaining.toLocaleString("en-IN")} will remain pending</>
                                : <>Full payment · this clears the balance</>
                            }
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Method</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {[{ k: "UPI", i: "qr" }, { k: "Cash", i: "money" }].map((m) => (
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
                    <button
                      className="btn accent"
                      onClick={proceed}
                      disabled={busy}
                      style={{ justifyContent: "center", padding: "10px 12px" }}
                    >
                      {method === "Cash"
                        ? <>{busy ? "Recording…" : "Record cash payment"} <Icon name="check" size={13} /></>
                        : <>Show QR to scan <Icon name="arrowRight" size={13} /></>}
                    </button>
                  )}
                </>
              )}

              {stage === "qr" && (() => {
                // Build the actual UPI deep-link from the saved finance settings
                // and the current selection. The amount on the QR matches what
                // the parent typed in the previous step (full balance if blank).
                const balance = (selected.amount || 0) + (selected.overdue ? 200 : 0);
                const amt = payAmount.trim() === "" ? balance : Math.floor(Number(payAmount) || 0);
                const upiUri = buildUpiUri({
                  upiId: finance.upi,
                  payeeName: finance.upiPayeeName || "Sanfort International School",
                  amount: amt,
                  note: `Fee ${selected.id}`,
                  transactionRef: selected.id,
                });
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div className="qrbox"><UpiQR size={180} uri={upiUri} /></div>
                    {finance.upi ? (
                      <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        {finance.upi} · {method}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: "var(--warn)", textAlign: "center", maxWidth: 240 }}>
                        Set the school's UPI ID under <b>Settings → Finance</b> for parents to be able to scan & pay.
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", lineHeight: 1.5 }}>
                      Parent scans this QR in any UPI app.
                      <br />
                      Payment auto-verified &amp; receipt sent.
                    </div>
                    {/* Send the same QR to the parent's WhatsApp so they can
                        scan it on their own phone if they're not at the office. */}
                    <button
                      className="btn"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => sendQrToWhatsApp(amt)}
                      disabled={busy || !finance.upi}
                      title={finance.upi ? "Send this QR to the parent's WhatsApp" : "Set a UPI ID under Settings → Finance first"}
                    >
                      <Icon name="whatsapp" size={13} />Send QR to WhatsApp
                    </button>
                    <div style={{ display: "flex", gap: 6, width: "100%" }}>
                      <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={reset} disabled={busy}>Back</button>
                      <button className="btn accent" style={{ flex: 1, justifyContent: "center" }} onClick={markPaid} disabled={busy}>
                        <Icon name="check" size={13} />{busy ? "Posting…" : "Mark paid"}
                      </button>
                    </div>
                    <span className="live-pill"><span className="pulse-dot" />Listening for payment…</span>
                  </div>
                );
              })()}

              {stage === "paid" && (() => {
                // Match the printed-receipt layout (school header + meta grid +
                // particulars table) so the on-screen preview is faithful to
                // what the user will get out of the printer.
                const navy = "#1f3a8a";
                // One particulars line per fee type. The legacy "Tuition +
                // Activity" split is replaced by the actual feeType on the
                // pending/receipt row.
                const lines = [
                  { label: feeTypeLabel(selected.feeType), amount: selected.amount },
                ];
                if (selected.overdue) lines.push({ label: "Late Fee", amount: 200 });
                const totalAmt = lastPayment?.amount ?? (selected.amount + (selected.overdue ? 200 : 0));
                const slNo = selected.id.replace(/[^0-9]/g, "").slice(-3).padStart(3, "0");
                const today = new Date();
                const dateStr  = today.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
                const monthStr = today.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                const dotted = { display: "inline-block", borderBottom: `1px dotted ${navy}`, minWidth: 70, padding: "0 4px", color: "#000", fontWeight: 500 };
                return (
                <>
                  <div className="receipt" id="fee-receipt" style={{ background: "#fff", border: `1px solid ${navy}`, padding: "12px 14px", color: "#000", fontFamily: "Arial, Helvetica, sans-serif" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <img src="/logo.png" alt="logo" style={{ width: 50, height: 50, objectFit: "contain", flexShrink: 0 }} />
                      <div style={{ flex: 1, textAlign: "center", color: navy }}>
                        <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.3, lineHeight: 1.15 }}>SANFORT INTERNATIONAL SCHOOL</div>
                        <div style={{ fontWeight: 700, fontSize: 10.5, marginTop: 2, letterSpacing: 0.3 }}>Sanvi Educational and Charitable Trust</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", color: navy }}>
                      <div style={{ fontWeight: 600, fontSize: 10 }}>Reg No: SIS/2026/{slNo}</div>
                      <div style={{ fontWeight: 600, fontSize: 10 }}>No.45, MG Road, Chennai - 600 001.</div>
                      <div style={{ fontWeight: 600, fontSize: 10 }}>Cell : 9876 543 210</div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 11, color: navy, fontWeight: 600 }}>
                      <div style={{ display: "flex", gap: 10, padding: "2px 0" }}>
                        <div style={{ flex: 1 }}>Adm. No : <span style={dotted}>{selected.id}</span></div>
                        <div style={{ flex: 1 }}>SL. No. <span style={{ color: "#c11d1d", fontWeight: 800, fontSize: 14, letterSpacing: 1, marginLeft: 4 }}>{slNo}</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 10, padding: "2px 0" }}>
                        <div style={{ flex: 1 }}>Name : <span style={dotted}>{selected.name}</span></div>
                        <div style={{ flex: 1 }}>Class : <span style={dotted}>{formatClassLabel(selected.cls)}</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 10, padding: "2px 0" }}>
                        <div style={{ flex: 1 }}>Month : <span style={dotted}>{monthStr}</span></div>
                        <div style={{ flex: 1 }}>Date : <span style={dotted}>{dateStr}</span></div>
                      </div>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, border: `1px solid ${navy}`, fontSize: 11.5 }}>
                      <thead>
                        <tr>
                          <th style={{ border: `1px solid ${navy}`, padding: "4px 6px", color: navy, textAlign: "left", fontSize: 10.5, fontWeight: 700, width: 40 }}>S.No.</th>
                          <th style={{ border: `1px solid ${navy}`, padding: "4px 6px", color: navy, textAlign: "left", fontSize: 10.5, fontWeight: 700 }}>Particulars</th>
                          <th style={{ border: `1px solid ${navy}`, padding: "4px 6px", color: navy, textAlign: "right", fontSize: 10.5, fontWeight: 700, width: 80 }}>Amount<br />Rs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l, i) => (
                          <tr key={i}>
                            <td style={{ border: `1px solid ${navy}`, padding: "5px 6px", textAlign: "center", fontWeight: 600 }}>{i + 1}.</td>
                            <td style={{ border: `1px solid ${navy}`, padding: "5px 6px" }}>{l.label}<span style={{ borderBottom: "1px dotted #888", display: "inline-block", width: "40%", marginLeft: 6, verticalAlign: "middle", height: 1 }} /></td>
                            <td style={{ border: `1px solid ${navy}`, padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{l.amount.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                        {Array.from({ length: Math.max(0, 5 - lines.length) }).map((_, i) => (
                          <tr key={`pad-${i}`}>
                            <td style={{ border: `1px solid ${navy}`, padding: "5px 6px", height: 22 }}>&nbsp;</td>
                            <td style={{ border: `1px solid ${navy}`, padding: "5px 6px" }}>&nbsp;</td>
                            <td style={{ border: `1px solid ${navy}`, padding: "5px 6px" }}>&nbsp;</td>
                          </tr>
                        ))}
                        <tr style={{ background: "#fafbff" }}>
                          <td style={{ border: `1px solid ${navy}`, padding: "5px 6px" }}></td>
                          <td style={{ border: `1px solid ${navy}`, padding: "5px 10px", color: navy, fontWeight: 700, fontSize: 12, textAlign: "right" }}>TOTAL</td>
                          <td style={{ border: `1px solid ${navy}`, padding: "5px 6px", textAlign: "right", color: navy, fontWeight: 700, fontSize: 12 }}>{totalAmt.toLocaleString("en-IN")}</td>
                        </tr>
                      </tbody>
                    </table>

                    {lastPayment?.partial && lastPayment.remaining > 0 && (
                      <div style={{ textAlign: "right", marginTop: 6, color: "#a06820", fontSize: 11, fontWeight: 600 }}>
                        Balance pending: Rs. {lastPayment.remaining.toLocaleString("en-IN")}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, fontSize: 10.5, fontStyle: "italic", color: "#000" }}>
                      Paid via {selected.method && selected.method !== "—" ? selected.method : method} &nbsp;·&nbsp; Cashier
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
                );
              })()}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {addFeeOpen && !isParent && (
        <AddFeeItemModal
          students={E.ADDED_STUDENTS || []}
          onClose={() => setAddFeeOpen(false)}
          onSave={async (payload) => {
            const ok = await handleAddFee(payload);
            if (ok) setAddFeeOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- parent fees summary (read-only) ----------
// Shows the same financial picture as the staff "Collect fee" panel —
// pending balance broken into term/activity/late, plus a list of past
// receipts — but with no payment controls. Parents pay at the school
// office; this card is purely informational.
function ParentFeesSummary({ scopedPending, scopedRecent, child, openReceipt, onRefresh }) {
  const totalPending = scopedPending.reduce((a, f) => a + (f.amount || 0), 0);
  const overdueChip  = scopedPending.some((f) => f.overdue);
  const totalPaid    = scopedRecent.reduce((a, f) => a + (f.amount || 0), 0);
  const initials = (n) => (n || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const [payingOrder, setPayingOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  async function startOnlinePayment() {
    if (!child || totalPending === 0) return;
    setBusy(true);
    try {
      const r = await fetch("/api/fees/pay-online", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: child.id, amount: scopedPending[0].amount, intent: "create" }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Could not start payment");
      setPayingOrder(j.order);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function confirmOnlinePayment() {
    if (!payingOrder) return;
    setBusy(true);
    try {
      const r = await fetch("/api/fees/pay-online", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: payingOrder.studentId, amount: payingOrder.amount, intent: "verify" }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Verify failed");
      setPayingOrder(null);
      await onRefresh?.();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div
      className="card col-4"
      style={{
        position: "sticky",
        top: 68,
        alignSelf: "start",
        maxHeight: "calc(100vh - 80px)",
        overflowY: "auto",
        zIndex: 4,
      }}
    >
      <div className="card-head">
        <div>
          <div className="card-title">{child?.name ? `${child.name.split(" ")[0]}'s fees` : "Fees · summary"}</div>
          <div className="card-sub">Read-only · payments are recorded by the school office</div>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {child && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--card-2)", border: "1px solid var(--rule)", borderRadius: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13 }}>
              {initials(child.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{child.name}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{formatClassLabel(child.cls)} · {child.id}</div>
            </div>
          </div>
        )}

        <div style={{ background: "var(--card-2)", border: "1px solid var(--rule)", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Outstanding</span>
            <span className="mono" style={{ fontSize: 20, fontWeight: 500, color: totalPending > 0 ? "var(--ink)" : "var(--ok)" }}>
              {totalPending > 0 ? `₹${totalPending.toLocaleString("en-IN")}` : "All clear"}
            </span>
          </div>
          {totalPending > 0 && (
            <>
              <div style={{ marginTop: 8, fontSize: 11.5, color: overdueChip ? "var(--bad)" : "var(--warn)" }}>
                {overdueChip ? "One or more items overdue" : "Pending — settle online or at the office"}
              </div>
              <button
                className="btn accent"
                style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                onClick={startOnlinePayment}
                disabled={busy}
              >
                <Icon name="fees" size={12} />Pay online (UPI / Razorpay)
              </button>
            </>
          )}
        </div>

        <div style={{ background: "var(--card-2)", border: "1px solid var(--rule)", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Paid this term</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 500, color: "var(--ok)" }}>₹{totalPaid.toLocaleString("en-IN")}</span>
          </div>
          {scopedRecent.length === 0 ? (
            <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>No receipts on file yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {scopedRecent.slice(0, 4).map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
                  <span style={{ color: "var(--ink-3)" }}>
                    {r.method} · {r.time} {r.status === "partial" && <span style={{ color: "var(--warn)" }}>· partial</span>}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className="mono">₹{(r.amount || 0).toLocaleString("en-IN")}</span>
                    <button className="btn sm ghost" style={{ height: 22, padding: "0 6px", fontSize: 10.5 }} onClick={() => openReceipt(r)}>Receipt</button>
                  </span>
                </div>
              ))}
              {scopedRecent.length > 4 && (
                <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 4 }}>+{scopedRecent.length - 4} more in the table on the left</div>
              )}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "var(--ink-4)", lineHeight: 1.5 }}>
          You can pay online from this app, or visit the school office during working hours. Receipts appear here as soon as payment is captured.
        </div>
      </div>

      {payingOrder && (
        <PayOnlineModal order={payingOrder} busy={busy} onClose={() => setPayingOrder(null)} onConfirm={confirmOnlinePayment} />
      )}
    </div>
  );
}

function PayOnlineModal({ order, busy, onClose, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Confirm online payment</div>
            <div className="card-sub">Order {order.orderId} · {order.gateway}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "var(--bg-2)", padding: 16, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.5 }}>Amount</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: "var(--ink)" }}>₹{order.amount.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>For {order.studentName} · {formatClassLabel(order.cls)}</div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
            In production this opens the Razorpay / PhonePe checkout. For this demo, click <b>Confirm payment</b> to simulate
            a successful capture — the receipt will be generated and the fee marked paid.
          </div>
          <a className="btn" href={order.payUrl} target="_blank" rel="noreferrer" style={{ justifyContent: "center" }}>
            <Icon name="upload" size={12} />Open UPI app
          </a>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn accent" onClick={onConfirm} disabled={busy}>
              <Icon name="check" size={13} />{busy ? "Verifying…" : "Confirm payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Confirm-and-delete dialog for a single receipt row. The endpoint
// itself enforces the role gate (admin / principal / school_accountant
// only) — this dialog is the user-facing "are you sure?" step. The
// modal is deliberately blunt about the side effect: the receipt
// disappears from history but the pending balance is NOT auto-restored
// (mirrors how the API behaves; matches the user's stated intent of
// "just delete the history alone").
function DeleteReceiptModal({ receipt, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  const amt = Number(receipt?.amount) || 0;
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.55)",
      display: "grid", placeItems: "center", zIndex: 300, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ padding: "18px 18px 6px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 9,
            background: "var(--bad-soft, #fbe1d8)", color: "var(--bad, #b13c1c)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <Icon name="warning" size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>
              Delete this receipt?
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.55 }}>
              <div><strong>{receipt.name}</strong> · {formatClassLabel(receipt.cls)} · {receipt.id}</div>
              <div style={{ marginTop: 4 }}>
                ₹{amt.toLocaleString("en-IN")} · {receipt.method || "—"} · {receipt.time || ""}
              </div>
            </div>
            <div style={{
              marginTop: 12, padding: "10px 12px",
              background: "var(--warn-soft, #fff4e2)",
              border: "1px solid var(--warn, #d4944e)",
              borderRadius: 7, fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.5,
            }}>
              <strong>Heads up:</strong> the receipt disappears from history and from the audit-ready ledger. The student's pending balance is <em>not</em> automatically reopened — if they actually owe this amount, raise it back via <b>Edit fees</b> after this delete.
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 18px 18px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className="btn"
            onClick={submit}
            disabled={busy}
            style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "#fff" }}
          >
            <Icon name="x" size={13} />{busy ? "Deleting…" : "Delete receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Staff-only modal to edit the outstanding amount of a pending fee.
// Set to 0 to drop the pending row entirely (e.g. full waiver/scholarship).
function EditFeeAmountModal({ fee, onClose, onSave }) {
  const initial = String(fee.amount ?? 0);
  const [val, setVal] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const num = val === "" ? null : Math.floor(Number(val));
  const valid = num !== null && Number.isFinite(num) && num >= 0;
  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try { await onSave(num); } finally { setBusy(false); }
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16,
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Edit fee amount</div>
            <div className="card-sub">{fee.name} · {formatClassLabel(fee.cls)} · {fee.id}</div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Update the outstanding balance for this term. Use <b>0</b> to waive the fee entirely (the pending row will be removed).
          </div>
          <div style={{
            display: "flex", alignItems: "center", height: 38,
            border: "1px solid", borderColor: valid ? "var(--rule)" : "var(--bad)",
            borderRadius: 9, background: "var(--card-2)", overflow: "hidden",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "0 12px",
              background: "var(--bg-2)", borderRight: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-3)",
            }}>₹</span>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))}
              style={{
                flex: 1, height: "100%", border: 0, background: "transparent",
                outline: "none", padding: "0 12px",
                fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink)",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
            Was ₹{Number(fee.amount || 0).toLocaleString("en-IN")}
            {valid && num !== Number(fee.amount || 0) && (
              <> · new outstanding ₹{num.toLocaleString("en-IN")}</>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn accent" disabled={!valid || busy}>
              <Icon name="check" size={13} />{busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Staff modal for adding a brand-new pending-fee row of any FEE_TYPES bucket
// (Application, Kit, ECA, Uniform, Term I/II/III, Van, STEM, Annual Day).
// Lets the school collect more than one fee per student per term, each
// printed on its own receipt.
function AddFeeItemModal({ students, onClose, onSave }) {
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [feeType, setFeeType]     = useState(FEE_TYPES[0].key);
  const [amount, setAmount]       = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  // Quick filter so the picker stays usable when the school has hundreds of
  // students. Matches name + reg id (case-insensitive substring).
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) =>
      `${s.name} ${s.id} ${s.cls} ${formatClassLabel(s.cls)}`.toLowerCase().includes(needle)
    );
  }, [students, q]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const num = amount === "" ? 0 : Math.floor(Number(amount));
  const valid = !!studentId && num > 0;

  async function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setErr("");
    try {
      await onSave({ studentId, feeType, amount: num });
    } catch (ex) { setErr(ex.message || String(ex)); setBusy(false); }
  }

  const selectedStudent = students.find((s) => s.id === studentId);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto",
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">Add fee</div>
            <div className="card-sub">Create a new pending-fee item · pick the student, type, and amount</div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Student *</div>
            <input
              className="input"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, reg ID, or class…"
              style={{ marginBottom: 6 }}
            />
            <div style={{
              border: "1px solid var(--rule)",
              borderRadius: 9,
              maxHeight: 200,
              overflowY: "auto",
              background: "var(--card-2)",
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--ink-4)", textAlign: "center" }}>
                  No students match "{q}"
                </div>
              ) : filtered.map((s) => {
                const active = s.id === studentId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStudentId(s.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      border: 0,
                      borderBottom: "1px solid var(--rule-2)",
                      background: active ? "var(--accent-soft)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: active ? "var(--accent)" : "var(--bg-2)",
                      color: active ? "#fff" : "var(--ink-2)",
                      display: "grid", placeItems: "center",
                      fontWeight: 600, fontSize: 11, flexShrink: 0,
                    }}>
                      {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: active ? "var(--accent-2)" : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.name}
                      </span>
                      <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
                        {s.id} · {formatClassLabel(s.cls)}
                      </span>
                    </span>
                    {active && <Icon name="check" size={13} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Fee type *</div>
              <select
                className="select"
                value={feeType}
                onChange={(e) => setFeeType(e.target.value)}
                style={{ width: "100%" }}
              >
                {FEE_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>Amount (₹) *</div>
              <div style={{
                display: "flex", alignItems: "center", height: 38,
                border: `1px solid ${num > 0 ? "var(--rule)" : "var(--rule-2)"}`,
                borderRadius: 9, background: "var(--card-2)", overflow: "hidden",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", padding: "0 10px",
                  background: "var(--bg-2)", borderRight: "1px solid var(--rule)",
                  fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-3)",
                }}>₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  style={{
                    flex: 1, height: "100%", border: 0, background: "transparent",
                    outline: "none", padding: "0 10px",
                    fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink)",
                  }}
                />
              </div>
            </div>
          </div>

          {selectedStudent && (
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", padding: "8px 10px", background: "var(--bg-2)", borderRadius: 7 }}>
              Adding <b>{feeTypeLabel(feeType)}</b> of <span className="mono">₹{num.toLocaleString("en-IN")}</span> for <b>{selectedStudent.name}</b> ({formatClassLabel(selectedStudent.cls)}).
              {" "}If a {feeTypeLabel(feeType)} row already exists for this student, it will be replaced.
            </div>
          )}

          {err && (
            <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn accent" disabled={!valid || busy}>
              <Icon name="check" size={13} />{busy ? "Saving…" : "Add fee"}
            </button>
          </div>
        </div>
      </form>
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
            <span style={{ display: "block", fontSize: 11, color: "var(--ink-3)" }}>{feeTypeLabel(f.feeType)} · {formatClassLabel(f.cls)} · due {f.due}</span>
          </span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: f.overdue ? "var(--bad)" : "var(--ink-2)" }}>
            ₹{f.amount.toLocaleString("en-IN")}
          </span>
        </button>
      ))}
    </div>
  );
}

function FilterMenu({ value, classes = [], onPick, onClose }) {
  // close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest(".filter-menu") && !e.target.closest(".btn")) onClose();
    };
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [onClose]);

  // Build options from the real class roster (mirrors the Students filter).
  // key === stringified class number ("1"-"12", "13"=PRE-MONT, "14"=MONT I,
  // "15"=MONT II); label uses formatClassLabel so PRE-MONT / MONT I / MONT II
  // / Class XII all render correctly. Fallback to 1-12 if CLASSES is empty
  // so the filter never disappears entirely.
  const opts = (() => {
    if (classes.length) {
      return [{ key: "All", label: "All" }, ...classes.map((c) => ({
        key: String(c.n),
        label: c.label || formatClassLabel(String(c.n)),
      }))];
    }
    return [
      { key: "All", label: "All" },
      ...Array.from({ length: 12 }, (_, i) => ({
        key: String(i + 1),
        label: formatClassLabel(String(i + 1)),
      })),
    ];
  })();
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
        maxHeight: 320,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 4px" }}>
        Filter by class
      </div>
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onPick(o.key)}
          className="btn ghost"
          style={{
            width: "100%",
            justifyContent: "flex-start",
            height: 30,
            padding: "0 10px",
            fontSize: 12.5,
            background: value === o.key ? "var(--accent-soft)" : "transparent",
            color: value === o.key ? "var(--accent-2)" : "var(--ink)",
            fontWeight: value === o.key ? 500 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

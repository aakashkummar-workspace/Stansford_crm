"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

// Each role gets a unique accent so the picker reads as a glanceable
// palette instead of a wall of identical cards. Tones are tuned to feel
// professional (no neon) and to stay legible against the soft backgrounds.
const ROLE_CARDS = [
  { k: "admin",             label: "Admin",             icon: "shield",  blurb: "Full school access",         tint: "#c11d1d", soft: "#fde7e7" },
  { k: "principal",         label: "Principal",         icon: "school",  blurb: "Fees, staff, ops",           tint: "#1f3f8b", soft: "#e6ebf5" },
  { k: "academic_director", label: "Academic Dir.",     icon: "academic",blurb: "Curriculum & logs",          tint: "#6d28d9", soft: "#ede7fe" },
  { k: "teacher",           label: "Teacher",           icon: "book",    blurb: "Classroom & daily logs",     tint: "#1f7a3a", soft: "#e3f2e7" },
  { k: "school_accountant", label: "School Accountant", icon: "fees",    blurb: "School finance & fees",      tint: "#0d6e9a", soft: "#e0f1f8" },
  { k: "trust_accountant",  label: "Trust Accountant",  icon: "money",   blurb: "Donations & trust ledger",   tint: "#a04020", soft: "#fbeae0" },
  { k: "parent",            label: "Parent",            icon: "heart",   blurb: "My child's updates",         tint: "#e8530e", soft: "#fde6d6" },
];

const HIGHLIGHTS = [
  { icon: "fees",        title: "Fees & receipts",     blurb: "UPI collection, online payments, auto receipts on WhatsApp." },
  { icon: "academic",    title: "Daily classroom log", blurb: "Attendance, classwork, homework — visible to every parent." },
  { icon: "megaphone",   title: "Parent communication",blurb: "In-app messages, broadcasts, fee reminders, exam alerts." },
  { icon: "shield",      title: "Role-based access",   blurb: "Each role sees exactly what it needs — nothing more." },
];

export default function LoginScreen({ demo, next }) {
  const [picked, setPicked] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function pick(roleKey) {
    setPicked(roleKey);
    setErr("");
    const account = demo.find((a) => a.role === roleKey);
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
    } else {
      setEmail("");
      setPassword("");
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Sign in failed");
      window.location.href = next || "/";
    } catch (e) {
      setErr(e.message || String(e));
      setBusy(false);
    }
  }

  const pickedRole = ROLE_CARDS.find((r) => r.k === picked);
  const year = new Date().getFullYear();

  return (
    <div className="login-shell">
      {/* Left: brand showcase ------------------------------------------------ */}
      <aside className="login-pane-left">
        <div className="lp-bg-grid" aria-hidden />
        <div className="lp-bg-glow" aria-hidden />
        <div className="lp-inner">
          <div className="lp-brand">
            <img src="/logo.png" alt="" className="lp-logo" />
            <div className="lp-brand-text">
              <div className="lp-school">Sanfort <span>International</span></div>
              <div className="lp-trust">Sanvi Educational &amp; Charitable Trust</div>
            </div>
          </div>

          <div className="lp-headline">
            <h1>One login for the entire school.</h1>
            <p>Fees, attendance, timetables, parent messaging — everything your team and families need, in one place.</p>
          </div>

          <ul className="lp-features">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title}>
                <span className="lp-ic"><Icon name={h.icon} size={16} /></span>
                <div>
                  <div className="lp-ft-title">{h.title}</div>
                  <div className="lp-ft-blurb">{h.blurb}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="lp-foot">© {year} Sanvi Educational &amp; Charitable Trust · All rights reserved</div>
        </div>
      </aside>

      {/* Right: sign-in panel ------------------------------------------------- */}
      <main className="login-pane-right">
        <div className="lp-form-wrap">
          {/* Compact brand for mobile */}
          <div className="lp-brand-mobile">
            <img src="/logo.png" alt="" />
            <div>
              <div className="lp-school">Sanfort <span>International</span></div>
              <div className="lp-trust">Sanvi Educational &amp; Charitable Trust</div>
            </div>
          </div>

          <header className="lp-form-head">
            <h2>{picked
              ? (picked === "__other__" ? "Sign in with email" : `Welcome back, ${pickedRole?.label || ""}`)
              : "Welcome back"}</h2>
            <p>{picked
              ? (picked === "__other__"
                  ? "Enter the email and password your admin issued you. Works for every role, including custom ones."
                  : "Enter your credentials to continue. Use the back link to switch roles.")
              : "Sign in to your account. Pick the role that matches your access."}</p>
          </header>

          {!picked && (
            <>
              <div className="lp-roles">
                {ROLE_CARDS.map((r) => (
                  <button
                    key={r.k}
                    type="button"
                    className="lp-role"
                    onClick={() => pick(r.k)}
                    style={{ "--tint": r.tint, "--tint-soft": r.soft }}
                  >
                    <span className="lp-role-ic"><Icon name={r.icon} size={15} /></span>
                    <span className="lp-role-lbl">{r.label}</span>
                    <span className="lp-role-blurb">{r.blurb}</span>
                  </button>
                ))}
              </div>

              {/* Direct email + password sign-in. Used by anyone the admin
                  has provisioned with a custom role (Office, Mid-office,
                  Sports head…) — they don't have a role tile of their own
                  but their email + password still let them in. */}
              <div className="lp-other">
                <div className="lp-divider"><span>or</span></div>
                <button
                  type="button"
                  className="lp-other-btn"
                  onClick={() => { setPicked("__other__"); setEmail(""); setPassword(""); }}
                  title="Sign in with your school-issued email + password (works for custom roles too)"
                >
                  <Icon name="user" size={13} />
                  Sign in with email &amp; password
                </button>
                <div className="lp-other-hint">
                  Use this if your admin gave you a login that doesn't match the tiles above.
                </div>
              </div>
            </>
          )}

          {picked && (
            <form onSubmit={submit} className="lp-form">
              <button
                type="button" className="lp-back"
                onClick={() => { setPicked(null); setErr(""); }}
              >
                <Icon name="arrowLeft" size={12} /> Back to roles
              </button>

              <label className="lp-field">
                <span>Email address</span>
                <input
                  type="email" autoComplete="username" required autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.com"
                />
              </label>

              <label className="lp-field">
                <span className="lp-field-row">
                  <span>Password</span>
                  <button type="button" className="lp-show" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              {err && <div className="lp-err"><Icon name="warning" size={12} /> <span>{err}</span></div>}

              <button className="lp-submit" type="submit" disabled={busy}>
                {busy
                  ? <><span className="lp-spinner" aria-hidden /> Signing in…</>
                  : <>Sign in <Icon name="arrowRight" size={13} /></>}
              </button>

              <div className="lp-help">
                Trouble signing in? Contact the school office.
              </div>
            </form>
          )}

          <div className="lp-credit-line">
            Developed by{" "}
            <a href="https://sirahdigital.in/" target="_blank" rel="noopener noreferrer" className="lp-credit">
              Sirah Digital
            </a>
          </div>

          <div className="lp-foot-mobile">© {year} Sanvi Educational &amp; Charitable Trust</div>
        </div>
      </main>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          background: var(--bg);
          color: var(--ink);
        }

        /* ===== Left: brand panel =============================================== */
        .login-pane-left {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(1200px 800px at -10% -10%, rgba(255,255,255,0.08), transparent 55%),
            radial-gradient(900px 700px at 110% 110%, rgba(232,83,14,0.18), transparent 55%),
            linear-gradient(160deg, var(--brand-blue, #1f3f8b) 0%, var(--brand-blue-2, #15306b) 100%);
          color: #fff;
          padding: 48px 56px;
          display: flex;
          align-items: center;
        }
        .lp-bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(900px 600px at 30% 50%, #000 30%, transparent 75%);
          opacity: 0.5;
          pointer-events: none;
        }
        .lp-bg-glow {
          position: absolute; right: -180px; bottom: -180px;
          width: 540px; height: 540px; border-radius: 50%;
          background: radial-gradient(circle, rgba(232,83,14,0.40), transparent 70%);
          filter: blur(20px);
          pointer-events: none;
        }
        .lp-inner {
          position: relative; z-index: 1;
          max-width: 520px; width: 100%;
          display: flex; flex-direction: column; gap: 36px;
        }
        .lp-brand { display: flex; align-items: center; gap: 14px; }
        .lp-logo {
          width: 56px; height: 56px; border-radius: 12px;
          background: #fff; padding: 4px; object-fit: contain;
          box-shadow: 0 8px 24px -12px rgba(0,0,0,0.5);
        }
        .lp-school {
          font-family: var(--font-serif, Georgia, serif);
          font-size: 22px; font-weight: 600; letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .lp-school :global(span) { color: #ffd5bd; font-style: italic; }
        .lp-trust {
          font-size: 11.5px; color: rgba(255,255,255,0.72);
          letter-spacing: 0.04em; text-transform: uppercase; margin-top: 4px;
        }
        .lp-headline h1 {
          font-family: var(--font-serif, Georgia, serif);
          font-size: 38px; line-height: 1.12; margin: 0 0 12px;
          letter-spacing: -0.02em; font-weight: 600;
        }
        .lp-headline p {
          font-size: 14px; line-height: 1.6; margin: 0;
          color: rgba(255,255,255,0.78); max-width: 440px;
        }
        .lp-features {
          list-style: none; padding: 0; margin: 0;
          display: grid; grid-template-columns: 1fr; gap: 14px;
        }
        .lp-features li {
          display: flex; gap: 12px; align-items: flex-start;
          padding: 12px 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 10px;
          backdrop-filter: blur(6px);
        }
        .lp-ic {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(232,83,14,0.18); color: #ffd5bd;
          display: grid; place-items: center; flex-shrink: 0;
          border: 1px solid rgba(232,83,14,0.28);
        }
        .lp-ft-title { font-size: 13px; font-weight: 600; }
        .lp-ft-blurb {
          font-size: 11.5px; line-height: 1.5;
          color: rgba(255,255,255,0.72); margin-top: 2px;
        }
        .lp-foot {
          font-size: 11px; color: rgba(255,255,255,0.55);
          letter-spacing: 0.02em;
          line-height: 1.6;
        }
        .lp-credit {
          color: var(--accent);
          font-weight: 600;
          text-decoration: none;
        }
        .lp-credit:hover { text-decoration: underline; }

        /* ===== Right: form panel =============================================== */
        .login-pane-right {
          display: flex; align-items: center; justify-content: center;
          padding: 48px 32px;
          background: var(--bg);
        }
        .lp-form-wrap {
          width: 100%; max-width: 420px;
          display: flex; flex-direction: column; gap: 22px;
        }
        .lp-brand-mobile {
          display: none;
          align-items: center; gap: 12px;
          padding-bottom: 8px;
        }
        .lp-brand-mobile :global(img) {
          width: 44px; height: 44px; border-radius: 10px;
          background: #fff; padding: 3px; object-fit: contain;
          border: 1px solid var(--rule, #e5dfd1);
        }
        .lp-brand-mobile .lp-school { color: var(--brand-blue); font-size: 17px; }
        .lp-brand-mobile .lp-school :global(span) { color: var(--accent); font-style: italic; }
        .lp-brand-mobile .lp-trust { color: var(--ink-3); }

        .lp-form-head h2 {
          font-family: var(--font-serif, Georgia, serif);
          font-size: 26px; font-weight: 600; margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .lp-form-head p {
          font-size: 13px; color: var(--ink-3); margin: 0; line-height: 1.55;
        }

        /* role tiles — compact 2-column grid, per-role accent.
           Last row has a single tile (Parent) which gets centered via the
           odd:last-child rule below. */
        .lp-roles {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .lp-role {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          gap: 5px;
          padding: 12px 10px 10px;
          background: var(--card, #fff);
          border: 1px solid var(--rule, #e5dfd1);
          border-radius: 10px; cursor: pointer; text-align: center;
          color: var(--ink-2);
          transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
          overflow: hidden;
        }
        /* Coloured accent strip on top — same hue as the icon. Subtle but
           gives each card its own identity even before hover. */
        .lp-role::before {
          content: ""; position: absolute; left: 0; right: 0; top: 0;
          height: 3px; background: var(--tint, var(--accent));
          opacity: 0.85;
        }
        .lp-role:hover {
          border-color: var(--tint, var(--accent));
          box-shadow: 0 8px 20px -14px var(--tint, rgba(232,83,14,0.5));
          transform: translateY(-2px);
        }
        .lp-role-ic {
          width: 32px; height: 32px; border-radius: 8px;
          background: var(--tint-soft, var(--accent-soft));
          color: var(--tint, var(--accent));
          display: grid; place-items: center; flex-shrink: 0;
          margin-top: 2px;
        }
        .lp-role-lbl {
          font-size: 12.5px; font-weight: 600; color: var(--ink);
          line-height: 1.2;
        }
        .lp-role-blurb {
          font-size: 10.5px; color: var(--ink-4); line-height: 1.35;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 100%;
        }
        /* When the last child is alone in its row (odd count, e.g. Parent in
           the 5-role list) we span both columns but center the tile and
           constrain its width to match the others, so it visually sits
           between the two tiles in the row above. */
        .lp-role:last-child:nth-child(odd) {
          grid-column: 1 / -1;
          justify-self: center;
          width: calc(50% - 4px); /* 50% minus half of the 8px column gap */
        }

        /* sign-in form */
        .lp-form { display: flex; flex-direction: column; gap: 16px; }
        .lp-back {
          align-self: flex-start;
          display: inline-flex; align-items: center; gap: 5px;
          background: transparent; border: 0;
          color: var(--ink-3); font-size: 12px;
          cursor: pointer; padding: 4px 0;
        }
        .lp-back:hover { color: var(--accent); }

        .lp-field { display: flex; flex-direction: column; gap: 6px; }
        .lp-field > span {
          font-size: 11.5px; color: var(--ink-2);
          font-weight: 500; letter-spacing: 0.02em;
        }
        .lp-field-row {
          display: flex; justify-content: space-between; align-items: center;
        }
        .lp-show {
          background: transparent; border: 0; cursor: pointer;
          font-size: 11px; color: var(--accent); font-weight: 500;
          padding: 0; letter-spacing: 0.02em;
        }
        .lp-show:hover { text-decoration: underline; }
        .lp-field input {
          padding: 11px 13px; font-size: 13.5px;
          background: var(--card, #fff); color: var(--ink);
          border: 1px solid var(--rule, #e5dfd1); border-radius: 9px;
          outline: none; transition: all .12s ease;
          font-family: inherit;
        }
        .lp-field input:hover { border-color: var(--ink-4); }
        .lp-field input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(232,83,14,0.15);
        }

        .lp-err {
          background: var(--err-soft, #fbe1d8); color: var(--err, #b13c1c);
          padding: 10px 12px; border-radius: 8px;
          font-size: 12px; line-height: 1.45;
          display: flex; align-items: center; gap: 8px;
          border: 1px solid rgba(177,60,28,0.18);
        }

        .lp-submit {
          margin-top: 4px;
          padding: 12px 16px; font-size: 13.5px; font-weight: 600;
          background: var(--accent); color: var(--accent-ink, #fff);
          border: 0; border-radius: 9px; cursor: pointer;
          transition: all .15s ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 6px 18px -10px rgba(232,83,14,0.5);
        }
        .lp-submit:hover { background: var(--accent-2); transform: translateY(-1px); }
        .lp-submit:disabled { opacity: 0.7; cursor: wait; transform: none; }

        .lp-spinner {
          width: 12px; height: 12px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          animation: spin .7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lp-help {
          font-size: 11.5px; color: var(--ink-4); text-align: center;
          margin-top: 2px;
        }

        /* Direct sign-in (used by custom-role users who don't have a tile). */
        .lp-other {
          margin-top: 4px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .lp-divider {
          display: flex; align-items: center; gap: 10px;
          color: var(--ink-4);
          font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em;
          margin: 4px 0 2px;
        }
        .lp-divider::before, .lp-divider::after {
          content: ""; flex: 1; height: 1px; background: var(--rule, #e5dfd1);
        }
        .lp-other-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 14px;
          background: var(--card, #fff);
          border: 1.5px solid var(--brand-blue, #1f3f8b);
          color: var(--brand-blue, #1f3f8b);
          border-radius: 9px; cursor: pointer;
          font-size: 12.5px; font-weight: 600;
          transition: all .15s ease;
        }
        .lp-other-btn:hover {
          background: var(--brand-blue, #1f3f8b); color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px -10px rgba(31,63,139,0.5);
        }
        .lp-other-hint {
          font-size: 10.5px; color: var(--ink-4); text-align: center;
          line-height: 1.5;
        }

        /* "Developed by Sirah Digital" — sits under the role tiles in the
           main login dashboard (always visible, not just on mobile). */
        .lp-credit-line {
          margin-top: 6px; padding-top: 14px;
          border-top: 1px dashed var(--rule, #e5dfd1);
          font-size: 11.5px; color: var(--ink-3);
          text-align: center; letter-spacing: 0.02em;
        }

        .lp-foot-mobile {
          display: none;
          font-size: 10.5px; color: var(--ink-4);
          text-align: center; margin-top: 4px;
          line-height: 1.6;
        }

        /* ===== Responsive ===================================================== */
        @media (max-width: 880px) {
          .login-shell { grid-template-columns: 1fr; }
          .login-pane-left { display: none; }
          .login-pane-right { padding: 28px 20px; min-height: 100vh; }
          .lp-brand-mobile { display: flex; }
          .lp-foot-mobile { display: block; }
        }
      `}</style>
    </div>
  );
}

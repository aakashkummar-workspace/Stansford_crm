"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

const ROLE_CARDS = [
  { k: "admin",             label: "Admin",             icon: "shield",  blurb: "Full access — every module across the school." },
  { k: "academic_director", label: "Academic Director", icon: "academic",blurb: "Curriculum, classes, daily logs, complaints." },
  { k: "principal",         label: "Principal",         icon: "school",  blurb: "Run the school — fees, staff, ops, alerts." },
  { k: "teacher",           label: "Teacher",           icon: "book",    blurb: "Classroom, daily monitoring, my students." },
  { k: "parent",            label: "Parent",            icon: "heart",   blurb: "My child — fees, attendance, messages." },
];

export default function LoginScreen({ demo, next }) {
  const [picked, setPicked] = useState(null); // role key
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (!r.ok || !json.ok) {
        throw new Error(json.error || "Sign in failed");
      }
      window.location.href = next || "/";
    } catch (e) {
      setErr(e.message || String(e));
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <header className="login-head">
          <div className="login-brand">
            <div className="brand-mark">V</div>
            <div className="brand-text">
              <div className="b1">
                Vidyalaya<span className="num">360</span>
              </div>
              <div className="b2">Stansford International HR.Sec.School</div>
            </div>
          </div>
          <p className="login-sub">
            Choose your role and sign in. Each account scopes the app to what that
            role is meant to see.
          </p>
        </header>

        {!picked && (
          <div className="login-roles">
            {ROLE_CARDS.map((r) => (
              <button key={r.k} type="button" className="login-role" onClick={() => pick(r.k)}>
                <div className="login-role-ic"><Icon name={r.icon} size={18} /></div>
                <div className="login-role-txt">
                  <div className="login-role-lbl">{r.label}</div>
                  <div className="login-role-blurb">{r.blurb}</div>
                </div>
                <Icon name="chevronRight" size={14} />
              </button>
            ))}
          </div>
        )}

        {picked && (
          <form onSubmit={submit} className="login-form">
            <button
              type="button"
              className="login-back"
              onClick={() => { setPicked(null); setErr(""); }}
            >
              <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>←</span> Back to roles
            </button>
            <div className="login-role-banner">
              <Icon name={ROLE_CARDS.find((r) => r.k === picked)?.icon || "user"} size={14} />
              <span>Signing in as {ROLE_CARDS.find((r) => r.k === picked)?.label}</span>
            </div>

            <label className="login-field">
              <span>Email</span>
              <input
                type="email" autoComplete="username" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.com"
              />
            </label>
            <label className="login-field">
              <span>Password</span>
              <input
                type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {err && <div className="login-err">{err}</div>}

            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <details className="login-demo">
          <summary>Demo credentials (click to expand)</summary>
          <div className="login-demo-grid">
            {demo.map((a) => (
              <div key={a.email} className="login-demo-row">
                <div className="login-demo-role">{ROLE_CARDS.find((r) => r.k === a.role)?.label || a.role}</div>
                <div className="login-demo-creds">
                  <code>{a.email}</code>
                  <span>·</span>
                  <code>{a.password}</code>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 16px;
          background: var(--bg);
        }
        .login-card {
          width: 100%;
          max-width: 460px;
          background: var(--card, #fff);
          border: 1px solid var(--line, #e5dfd1);
          border-radius: 14px;
          padding: 28px 24px;
          box-shadow: 0 16px 40px -28px rgba(0,0,0,0.35);
        }
        .login-head { margin-bottom: 18px; }
        .login-brand {
          display: flex; align-items: center; gap: 11px; margin-bottom: 12px;
        }
        :global(.login-brand .brand-mark) {
          width: 38px; height: 38px; border-radius: 9px;
          background: linear-gradient(135deg, var(--ok), #2f6048);
          color: #fff; display: grid; place-items: center;
          font-family: var(--font-serif, serif); font-size: 20px;
        }
        :global(.login-brand .brand-text .b1) {
          font-size: 17px; font-weight: 600; color: var(--ink);
        }
        :global(.login-brand .brand-text .b1 .num) { color: var(--accent); }
        :global(.login-brand .brand-text .b2) {
          color: var(--ink-3); font-size: 11px; margin-top: 2px;
        }
        .login-sub { font-size: 12.5px; color: var(--ink-3); line-height: 1.5; margin: 0; }

        .login-roles { display: flex; flex-direction: column; gap: 6px; }
        .login-role {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-2); border: 1px solid var(--line, #e5dfd1);
          border-radius: 10px; cursor: pointer; text-align: left;
          color: var(--ink-2); transition: all .12s ease;
        }
        .login-role:hover {
          background: var(--card, #fff); color: var(--ink);
          border-color: var(--accent); transform: translateY(-1px);
        }
        .login-role-ic {
          width: 32px; height: 32px; border-radius: 8px;
          background: var(--accent-soft); color: var(--accent);
          display: grid; place-items: center; flex-shrink: 0;
        }
        .login-role-txt { flex: 1; min-width: 0; }
        .login-role-lbl { font-size: 13.5px; font-weight: 600; color: var(--ink); }
        .login-role-blurb { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }

        .login-form { display: flex; flex-direction: column; gap: 14px; }
        .login-back {
          align-self: flex-start;
          background: transparent; border: 0;
          color: var(--ink-3); font-size: 11.5px;
          display: inline-flex; align-items: center; gap: 4px;
          cursor: pointer; padding: 0; margin-bottom: 4px;
        }
        .login-back:hover { color: var(--ink); }
        .login-role-banner {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--accent-soft); color: var(--accent);
          padding: 8px 12px; border-radius: 8px;
          font-size: 12px; font-weight: 500; align-self: flex-start;
        }
        .login-field { display: flex; flex-direction: column; gap: 5px; }
        .login-field span {
          font-size: 11.5px; color: var(--ink-2); font-weight: 500;
        }
        .login-field input {
          padding: 10px 12px; font-size: 13.5px;
          background: var(--bg-2); color: var(--ink);
          border: 1px solid var(--line, #e5dfd1); border-radius: 8px;
          outline: none; transition: all .12s ease;
        }
        .login-field input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .login-err {
          background: var(--err-soft, #fbe1d8); color: var(--err, #b13c1c);
          padding: 9px 12px; border-radius: 8px;
          font-size: 12px; line-height: 1.4;
        }
        .login-submit {
          padding: 11px 14px; font-size: 13px; font-weight: 600;
          background: var(--accent); color: var(--accent-ink);
          border: 0; border-radius: 9px; cursor: pointer;
          transition: background .12s ease;
        }
        .login-submit:hover { background: var(--accent-2); }
        .login-submit:disabled { opacity: 0.6; cursor: wait; }

        .login-demo {
          margin-top: 18px; padding-top: 16px;
          border-top: 1px dashed var(--line, #e5dfd1);
          font-size: 12px;
        }
        .login-demo summary {
          color: var(--ink-3); cursor: pointer; font-size: 11.5px;
          user-select: none;
        }
        .login-demo summary:hover { color: var(--ink); }
        .login-demo-grid {
          display: flex; flex-direction: column; gap: 4px;
          margin-top: 10px;
        }
        .login-demo-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 8px; background: var(--bg-2); border-radius: 6px;
        }
        .login-demo-role { font-weight: 500; color: var(--ink); font-size: 11.5px; }
        .login-demo-creds {
          display: inline-flex; gap: 6px; align-items: center;
          font-size: 10.5px; color: var(--ink-3);
        }
        .login-demo-creds code {
          font-family: var(--font-mono, monospace);
          background: var(--card, #fff); padding: 2px 6px; border-radius: 4px;
          color: var(--ink-2);
        }
      `}</style>
    </div>
  );
}

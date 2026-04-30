// Direct Evolution API bridge — sends WhatsApp messages straight from the
// CRM backend, no n8n in between.
//
// Env vars (set in .env.local):
//   EVOLUTION_API_URL   = https://message.sirahagents.com   (no trailing slash)
//   EVOLUTION_API_KEY   = <per-instance API key from Sirah Messenger dashboard>
//   EVOLUTION_INSTANCE  = School_Crm
//
// Why fire-and-forget: a fee payment / reminder is the user-facing happy
// path; we never want a downstream WhatsApp glitch to block or fail it.
// Errors are logged to the server console and swallowed.

// India numbers: strip everything except digits, drop leading 0, prefix 91
// if missing. Returns null if the result isn't a 12-digit Indian number
// (so we don't burn a WhatsApp credit on a bad row).
function normalizeIndianPhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) d = "91" + d;
  if (d.length !== 12 || !d.startsWith("91")) return null;
  return d;
}

function evolutionConfig() {
  const base = (process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!base || !key || !instance) return null;
  return { base, key, instance };
}

// Low-level POST to Evolution. 8s timeout (image sends take a couple of
// seconds because Evolution streams the upload to WhatsApp).
async function evoPost(path, body) {
  const cfg = evolutionConfig();
  if (!cfg) return { ok: false, skipped: "Evolution env vars not set" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${cfg.base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.key,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, status: res.status, body: text.slice(0, 400) };
    }
    return { ok: true, body: text };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e.message };
  }
}

// Public entry point — keeps the same signature the route files already use,
// so pay/route.js, pay-online/route.js, send-qr/route.js and remind/route.js
// don't need any edits when we switch from n8n to direct Evolution.
//
//   notifyWhatsApp("fee_paid",     { phone, imageUrl, caption, ... })
//   notifyWhatsApp("fee_qr_send",  { phone, imageUrl, caption, ... })
//   notifyWhatsApp("fee_reminder", { phone, message, ... })
export async function notifyWhatsApp(event, payload = {}) {
  const cfg = evolutionConfig();
  if (!cfg) {
    console.warn(`[whatsapp] ${event} skipped: Evolution env vars not set`);
    return { ok: false, skipped: "Evolution env vars not set" };
  }

  const phone = normalizeIndianPhone(payload.phone);
  if (!phone) return { ok: false, skipped: "no valid phone" };

  // Image events: fee_paid (rendered receipt PNG), fee_qr_send (UPI QR URL).
  // Reminder is text-only.
  const isImageEvent = event === "fee_paid" || event === "fee_qr_send";

  let result;
  if (isImageEvent) {
    if (!payload.imageUrl) {
      console.warn(`[whatsapp] ${event} skipped: no imageUrl in payload`);
      return { ok: false, skipped: "no imageUrl" };
    }
    // Evolution v2 sendMedia. `media` accepts a URL or raw base64 (no
    // "data:image/png;base64," prefix — we strip that in receipt-image.js).
    result = await evoPost(`/message/sendMedia/${cfg.instance}`, {
      number: phone,
      mediatype: "image",
      mimetype: "image/png",
      media: payload.imageUrl,
      caption: payload.caption || "",
      fileName: `receipt-${Date.now()}.png`,
    });
  } else {
    // Text-only path (fee_reminder).
    if (!payload.message) {
      console.warn(`[whatsapp] ${event} skipped: no message in payload`);
      return { ok: false, skipped: "no message" };
    }
    result = await evoPost(`/message/sendText/${cfg.instance}`, {
      number: phone,
      text: payload.message,
    });
  }

  if (!result.ok) {
    console.warn(
      `[whatsapp] ${event} → ${result.status || "ERR"}: ${
        result.body || result.error || result.skipped || ""
      }`
    );
  }
  return result;
}

# Deploying the merged CRM to `crm.sectpondy.org`

The cinematic now lives inside the main school CRM at the `/launch` route, so
there's **one Next.js app to deploy**, not two. This guide walks through a
fresh VPS deployment.

Tested target: **Ubuntu 22.04 / 24.04** with **PM2 + nginx + Let's Encrypt**.

Estimated time: **20–30 minutes** end-to-end if DNS already points to the VPS.

---

## URLs once deployed

| Path | What |
|---|---|
| `https://crm.sectpondy.org/launch` | Cinematic digital inauguration |
| `https://crm.sectpondy.org/login` | Main CRM login (where "Explore Platform" lands) |
| `https://crm.sectpondy.org/donorform` | Donor form (existing) |
| `https://crm.sectpondy.org/api/*` | Existing API routes (auth-gated) |

The cinematic is reachable only by typing the URL — no link from any other
page in the app.

---

## 0. Prereqs

- [ ] VPS with SSH (root or sudo user)
- [ ] DNS `A` record: `crm.sectpondy.org` → VPS public IP, propagated
      (`ping crm.sectpondy.org` from your laptop)
- [ ] Whatever Supabase / DB credentials the main CRM needs (collect them
      from the current `.env.local`)

---

## 1. Server bootstrap (once per VPS)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential nginx
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### Node 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

### PM2 process manager

```bash
sudo npm install -g pm2
```

---

## 2. Get the code onto the VPS

### Via git (recommended)

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone <YOUR_REPO_URL> sectpondy
cd sectpondy
```

### Via SCP (if no remote repo yet)

From your laptop, in the project root:

```bash
# Exclude noisy stuff. The sub-app folder is no longer needed.
rsync -av --progress \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude "Stansford CRM" --exclude logs \
  ./ user@vps.public.ip:/var/www/sectpondy/
```

---

## 3. Environment file

Inside `/var/www/sectpondy/`:

```bash
nano .env.local
```

Copy in whatever your current `.env.local` has (DB / Supabase / JWT secret /
etc.). The cinematic itself needs **no** env vars by default — same-origin
`/login` handoff, music ships in `public/music/crm_music.mpeg`. If you want
to override either:

```
# (optional) point Explore Platform somewhere other than the same-origin /login
NEXT_PUBLIC_PLATFORM_URL=/login

# (optional) move/rename the score
NEXT_PUBLIC_MUSIC_URL=/music/crm_music.mpeg
```

---

## 4. Install + build

```bash
npm ci          # exact deps from package-lock.json
npm run build   # produces .next/standalone/ for ultra-light prod runtime
```

Expected: route table prints with `○ /launch (74.1 kB / 162 kB)` and the
existing `/login`, `/donorform`, all `/api/*` routes intact. No errors.

> The project uses **`output: "standalone"`** in next.config.js, which packs
> only the deps the app actually uses into `.next/standalone/`. PM2 runs
> that directly, no copying of `node_modules` to a server folder needed.

The standalone build doesn't copy `public/` or the static chunks — Next
expects you to copy them in. One line:

```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

---

## 5. PM2 ecosystem

Create `/var/www/sectpondy/ecosystem.config.js`:

```js
module.exports = {
  apps: [{
    name: "sectpondy-crm",
    script: ".next/standalone/server.js",
    cwd: __dirname,
    max_restarts: 10,
    restart_delay: 2000,
    autorestart: true,
    watch: false,
    out_file: "logs/out.log",
    error_file: "logs/err.log",
    merge_logs: true,
    time: true,
    env: {
      NODE_ENV: "production",
      PORT: "3000",
      HOSTNAME: "127.0.0.1"
    }
  }]
};
```

Boot the app:

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd        # follow the printed command to enable boot-time autostart
pm2 status                 # should show "sectpondy-crm" online
curl -I http://127.0.0.1:3000/launch    # expect HTTP/1.1 200
```

---

## 6. nginx reverse proxy

Create `/etc/nginx/sites-available/sectpondy`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name crm.sectpondy.org;

    client_max_body_size 25M;
    proxy_read_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Hashed Next assets — cache aggressively
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # Public media (logo, music) — cache moderately
    location ~* \.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp3|mpeg|mp4|webm|ogg|wav|m4a)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
        access_log off;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/sectpondy /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null
sudo nginx -t
sudo systemctl reload nginx
```

Smoke test from your laptop:

```bash
curl -I http://crm.sectpondy.org/launch
curl -I http://crm.sectpondy.org/login
```

Both should be 200.

---

## 7. SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d crm.sectpondy.org
# enter email, agree to TOS, choose to redirect HTTP→HTTPS

# Verify auto-renew works
sudo certbot renew --dry-run
```

Open https://crm.sectpondy.org/launch — the cinematic should play, music
should unlock on first click, "Explore Platform" at the finale should land
on https://crm.sectpondy.org/login.

---

## 8. Updating later

After you push code from your laptop:

```bash
ssh user@vps.public.ip
cd /var/www/sectpondy
git pull
npm ci                                    # only if package.json changed
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
pm2 restart sectpondy-crm
```

About 90 seconds total.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` from nginx | App not running on 3000 | `pm2 status` then `pm2 logs sectpondy-crm` |
| `/launch` works but no music | `.mpeg` not in middleware whitelist | Already fixed in `middleware.js` — make sure you pulled the latest |
| `/launch` works but "Explore Platform" 404s | `/login` route missing or returning 404 | Verify the main CRM is intact — `curl /login` |
| Fonts look wrong on /launch | Google Fonts blocked at build time | Build with internet, or self-host the fonts |
| Cinematic dark theme leaks into /login | `.cinematic-root` wrapper missing | Make sure `app/launch/layout.tsx` wraps with `<div className="cinematic-root ...">` |
| `EADDRINUSE :3000` | Old node process holding the port | `lsof -i:3000` → `kill -9 <PID>` → `pm2 restart sectpondy-crm` |
| HTTPS renew fails | Port 80 blocked | `sudo ufw allow 80; sudo ufw allow 443` |

### Useful commands

```bash
pm2 status                              # is the app running?
pm2 logs sectpondy-crm --lines 100      # tail logs
pm2 restart sectpondy-crm               # restart after a code change
sudo systemctl reload nginx             # apply nginx config changes
sudo tail -f /var/log/nginx/error.log
```

---

## 10. Architecture notes (for future you)

- **One Next.js app** at `/var/www/sectpondy/` serves everything on port 3000.
- **`output: "standalone"`** in [next.config.js](next.config.js) — PM2 runs
  `.next/standalone/server.js` directly, no `next start` wrapper.
- **Cinematic isolation**: all `/launch/*` code lives under `app/launch/`
  with a private `_cinematic/` folder (Next 14 treats `_`-prefixed folders
  as private, so they're not routed).
- **Tailwind** is configured with `corePlugins.preflight = false` and
  `content` scoped to `app/launch/**` only — Tailwind utilities ship only
  inside the cinematic's CSS bundle, and the main CRM's `paper` theme is
  not touched by Tailwind's reset.
- **`@/cinematic/*`** path alias resolves to `app/launch/_cinematic/*`, kept
  separate from the existing `@/components/*` (which still points at
  `frontend/components/*`) and `@/lib/*` (at `backend/lib/*`).
- **Middleware**: `/launch` is whitelisted as a public path, and the
  static-asset regex includes `.mpeg / .mp3 / .ogg / .wav / .m4a / .mp4 /
  .webm` so the score and any future media play without auth.

If you ever want to remove the cinematic entirely, delete `app/launch/` and
remove `framer-motion`, `lucide-react`, `tailwindcss`, `postcss`,
`autoprefixer` from package.json. Nothing else in the main CRM depends on
them.

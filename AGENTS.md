# AGENTS.md — Base44 Dev Environment

## Project Overview

Static website for JAC Tours & Transfer (Punta Cana excursions/transfers). Two parts:

1. **Public website** (`01-website-mirror/site/`) — Framer-exported static HTML. Main entry is `traslados.html` (transfer booking page with interactive map).
2. **Admin panel** (`02-sistema-reservas/panelweb/`) — Static HTML/JS/CSS that connects to an external Supabase instance (URL + anon key hardcoded in `main.js`). No local backend needed.

Service pages live in two places: root `servicios/` (served at `/servicios/:slug`) and `01-website-mirror/site/servicios/` (same files, referenced internally with relative `../` paths).

## How It Runs

- **nginx:alpine** serves static files on port 3000.
- `nginx.base44.conf` replicates the `vercel.json` routing rules (Vercel rewrites → nginx `try_files`).
- Source is bind-mounted read-only at `/app`; edits to HTML/CSS/JS are reflected on next request (no restart needed).
- No external credentials required — the panel connects to a remote Supabase; Supabase edge functions handle PayPal server-side.

## Key Routes

| URL | Serves |
|-----|--------|
| `/` | `01-website-mirror/site/traslados.html` |
| `/assets/*` | `01-website-mirror/site/assets/*` |
| `/servicios/:slug` | `servicios/:slug.html` (root-level) |
| `/panelweb/*` | `02-sistema-reservas/panelweb/*` |
| `/en/*` | `01-website-mirror/site/en/*` |
| `/:path` | `01-website-mirror/site/:path.html` (catch-all) |

## Gotchas

- The repo root directory has restrictive permissions (`drwx------`). Run `chmod a+rx .` if nginx returns 404 for everything (worker user can't traverse the mount).
- Healthcheck must use `127.0.0.1` not `localhost` (IPv6 resolution issue in alpine container).
- `01-website-mirror/external/` directory referenced in README does not exist; Framer CDN images (`framerusercontent.com`) will 404 locally — pages still render.

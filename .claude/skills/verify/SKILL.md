# Verify: MediAgent (healt-status)

How to run and drive this app for verification.

## Launch

```bash
# Backend (FastAPI, reads backend/.env) — from repo root:
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 3001

# Frontend dev (proxies /api -> 127.0.0.1:3001):
cd frontend && npm run dev -- --port 3000 --strictPort

# Production bundle (closest to deploy; preview proxies /api -> deployed Vercel):
cd frontend && npx vite build && npx vite preview --port 4173 --strictPort
```

## Drive (Playwright + system Chromium)

- Playwright is in `frontend/node_modules` but ESM resolution follows the
  script path — import it by absolute path from scratchpad scripts:
  `import { chromium } from '<repo>/frontend/node_modules/playwright/index.mjs'`
- No Playwright browsers are downloaded; use
  `chromium.launch({ executablePath: '/usr/bin/chromium' })`.
- Mock geolocation via context: `geolocation: {latitude, longitude}, permissions: ['geolocation']`.

## Gotchas

- **Sandbox has no external DNS.** Groq/Gemini, Nominatim, Overpass, OSM tiles,
  Google Fonts, Firebase all fail with ERR_NAME_NOT_RESOLVED. The backend runs
  fine but LLM calls return a graceful in-card error. For full-flow UI runs,
  mock at the browser boundary with `page.route`:
  - `**/api/chat/stream` → SSE (`text/event-stream`): `event: meta` with
    `{conversation_id}`, then `data: {"delta": "..."}` chunks, then
    `event: done` with `{bot_message_id}`. Events separated by `\n\n`.
  - `**/api/hospitals/nearby*` → `{hospitals: [{id,name,kind,lat,lon,distance_km,address,phone}]}`
  - Register the catch-all `**/api/**` route BEFORE specific routes
    (Playwright matches last-registered first).
- The wizard scrolls inside `.scroll-region` (not window/body). Scroll-driven
  header effects: `.sticky-top.is-scrolled` and `--scroll-progress` on it.
  Use `behavior:'instant'` when measuring — `scroll-behavior:smooth` races
  short waits, and short content makes maxScroll ~0 (progress meaningless).
- Empty-submit feedback is an inline coral underline + focus on the textarea
  (no `.error-banner`, no aria-invalid).
- Red-flag keywords (e.g. "chest pain", "difficulty breathing") trigger
  `.emergency-banner` client-side, before any API call.

## Flows worth driving

1. Fill textarea (+ optional city) → "Analyze symptoms" → assessment streams in.
2. "View first aid guidance" → step 3.
3. "Find nearest care" → geolocation → hospitals list + Leaflet map.
4. Probes: empty submit, Escape dismisses `.error-banner`, theme toggle
   (`.theme-btn`), history panel (`button[aria-label="View chat history"]`),
   mobile 390px (no horizontal scroll), red-flag input.

# Deploying Medi-Agent (100% free)

**Live at: https://medi-agent-issaka-felixs-projects.vercel.app**

Everything runs in **one Vercel project** (free Hobby plan) using
[Vercel Services](https://vercel.com/docs/services): the Vite frontend is
served as static files and the FastAPI backend runs as serverless functions —
same domain, so there is no CORS setup, and no cold-start pinger is needed.

```
Browser ──▶ https://medi-agent-….vercel.app
              ├── /              → frontend service (frontend/, Vite static)
              ├── /api/*,/health → backend service  (backend/, FastAPI)
              │                     ├─▶ Groq API (free LLM: llama-3.3-70b)
              │                     ├─▶ OpenStreetMap (hospitals, keyless)
              │                     └─▶ Firebase Admin (auth verification)
```

Routing lives in [vercel.json](vercel.json). The backend service receives the
original request path, so FastAPI's `/api/...` routes work unchanged.

## How to deploy changes

Just push — GitHub repo `issakafelix/Medi-Agent` is connected, every push to
`main` auto-deploys:

```bash
git add -A && git commit -m "your change" && git push
```

Manual deploy (from repo root): `npx vercel --prod`

## Environment variables (already set, Production)

Vercel dashboard → medi-agent → Settings → Environment Variables:

| Variable | Purpose |
|---|---|
| `APP_ENV=prod` | enables CORS/host restrictions, prod mode |
| `LLM_PROVIDER=openai-compatible` | Groq via OpenAI-compatible adapter |
| `OPENAI_BASE_URL=https://api.groq.com/openai/v1` | Groq endpoint |
| `OPENAI_CHAT_MODEL=llama-3.3-70b-versatile` | chat model |
| `OPENAI_VISION_MODEL=llama-3.3-70b-versatile` | (text-only; see caveats) |
| `LLM_REQUEST_TIMEOUT_S=50` | stay under function time limit |
| `TRUSTED_HOSTS=*` | host header check |
| `DATABASE_URL=sqlite:////tmp/app.db` | /tmp is the only writable dir |
| `OPENAI_API_KEY` | **secret** — Groq key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **secret** — admin credentials |
| `VITE_FIREBASE_CONFIG` | Firebase web config (build-time, not secret) |

> No `ANTHROPIC_API_KEY` / `GOOGLE_MAPS_API_KEY` exist in this project — the
> LLM is Groq and hospital lookup is OpenStreetMap (no key).

## Verify after a deploy

```bash
curl https://medi-agent-issaka-felixs-projects.vercel.app/health
# {"status":"ok"}
curl "https://medi-agent-issaka-felixs-projects.vercel.app/api/hospitals/geocode?q=Accra"
```

## Free-tier caveats

- **Chat history does not persist** until you attach a real database. The
  code is already Postgres-ready (`psycopg2-binary` is installed and
  `postgres://` URLs are handled). To enable persistent history, free:
  1. Create a free account at https://neon.tech (no card needed)
  2. Create a project → copy the **connection string** (`postgres://...`)
  3. Vercel dashboard → medi-agent → Settings → Environment Variables →
     edit `DATABASE_URL` → paste the Neon string → redeploy.
- **Vision & image generation don't work** — `llama-3.3-70b-versatile` is
  text-only and Groq has no image-generation endpoint. Chat, symptom wizard,
  and hospital search all work.
- **Render is retired.** The old `ai-health-backend` service there was on a
  *paid* "starter" plan, which caused the non-payment suspension. Nothing in
  this setup uses Render; `render.yaml` is kept only in case you ever return.
- **Never commit** `backend/.env`, `frontend/.env.local`, or
  `backend/service-account.json` — all covered by `.gitignore`.

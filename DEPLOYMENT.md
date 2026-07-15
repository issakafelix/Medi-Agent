# Deploying Medi-Agent (100% free tier)

Architecture: **Vercel** (static React frontend) → **Render** (FastAPI backend)
→ **Groq** (free LLM API) + **OpenStreetMap** (free, keyless hospital lookup)
+ **Firebase** (free Spark-plan auth).

```
Browser ──▶ Vercel (frontend, always fast)
              │  fetch(VITE_API_URL)
              ▼
            Render free web service (FastAPI)
              ├─▶ Groq API   (chat, free tier)
              ├─▶ Nominatim/Overpass (hospitals, no key)
              └─▶ Firebase Admin (token verification)
```

---

## 1. Backend on Render

The repo root contains `render.yaml` (a Render Blueprint). Two options:

**Option A — update the existing service** (`ai-health-backend-mgcx`):
Dashboard → your service → *Settings*:
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Option B — fresh service via Blueprint:** Dashboard → *New → Blueprint* →
pick this repo. Render reads `render.yaml` automatically.

### Environment variables (Render dashboard → Environment)

| Variable | Value | Secret? |
|---|---|---|
| `APP_ENV` | `prod` | no |
| `LLM_PROVIDER` | `openai-compatible` | no |
| `OPENAI_BASE_URL` | `https://api.groq.com/openai/v1` | no |
| `OPENAI_CHAT_MODEL` | `llama-3.3-70b-versatile` | no |
| `OPENAI_VISION_MODEL` | `llama-3.3-70b-versatile` | no |
| `LLM_REQUEST_TIMEOUT_S` | `120.0` | no |
| `TRUSTED_HOSTS` | `*` | no |
| `OPENAI_API_KEY` | your **Groq** key (`gsk_…`) | **yes** |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | full JSON string of `service-account.json` (paste the whole file on one line) | **yes** |
| `CORS_ORIGINS` | your Vercel URL(s), comma-separated — set after step 2, e.g. `https://medi-agent.vercel.app` | no |

> This project uses Groq, not Anthropic or Google Places — so there is no
> `ANTHROPIC_API_KEY` / `GOOGLE_MAPS_API_KEY`. Hospitals use OpenStreetMap
> (no key needed).

## 2. Frontend on Vercel

Vercel dashboard → *Add New → Project* → import the GitHub repo:
- **Root Directory:** `frontend`
- **Framework Preset:** Vite (build `npm run build`, output `dist` — auto-detected)

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<your-service>.onrender.com/api` |
| `VITE_FIREBASE_CONFIG` | the JSON string from `frontend/.env.local` (Firebase *web* config — safe to expose; it is not a secret) |

`frontend/vercel.json` contains the SPA rewrite so client-side routes work.

## 3. Connect the two

1. Deploy backend → note the `https://….onrender.com` URL.
2. Deploy frontend with `VITE_API_URL=https://….onrender.com/api` → note the Vercel URL.
3. Back on Render, set `CORS_ORIGINS=https://<your-app>.vercel.app` → *Save* (service restarts).

## 4. Verify end-to-end

```bash
curl https://<service>.onrender.com/health          # → {"status":"ok"}
curl "https://<service>.onrender.com/api/hospitals/geocode?q=Accra"
```
Then open the Vercel URL, sign in, and run a symptom check in the wizard.

## 5. Keep it warm (cron-job.org)

Render free services sleep after ~15 min idle (cold start ≈ 30–60 s).
1. Create a free account at https://cron-job.org
2. *Create cronjob* → URL `https://<service>.onrender.com/health`
3. Schedule: **every 10 minutes** → Save.

Render's free tier includes 750 instance-hours/month — enough to keep one
service awake 24/7 (≈ 730 h).

---

## Free-tier caveats

- **Database is ephemeral.** SQLite lives on Render's disk, which is wiped on
  every deploy/restart — chat history will not survive. Free fix: a free
  Postgres from [Neon](https://neon.tech) or Supabase, set as `DATABASE_URL`
  (requires adding `psycopg2-binary` to requirements).
- **Vision & image generation are not wired to a working provider.**
  `llama-3.3-70b-versatile` is text-only and Groq has no DALL·E endpoint, so
  image describe/generate will return errors. Chat and hospital search work.
- **Never commit** `backend/.env`, `frontend/.env.local`, or
  `backend/service-account.json` — all are covered by `.gitignore`.

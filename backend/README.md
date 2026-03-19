# Backend (FastAPI)

This backend implements the routes expected by the frontend `services/apiService.js`.

## Run

1) Create/activate a Python env (3.10+)
2) Install deps

- Using pip:
  - `pip install -e .`

3) Copy env file
- `copy .env.example .env` (PowerShell: `Copy-Item .env.example .env`)

4) Start server
- Dev (API only):
  - `python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 3005`

## Public deployment (single URL)

In production (`APP_ENV=prod`), the backend can serve the built frontend from `../dist`.

1) Build the frontend from the repo root:
- `npm install`
- `npm run build`

2) Run the backend:
- `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 3005`

Then open `http://<server>:3005/`.

## Enable a real LLM (text) + Vision (images)

By default, the backend returns demo text responses and image metadata. To use a real model:

1) Set `LLM_PROVIDER=openai-compatible`
2) Set `OPENAI_API_KEY`
3) Optionally set model names:
  - `OPENAI_CHAT_MODEL` (text)
  - `OPENAI_VISION_MODEL` (images)
  - `OPENAI_IMAGE_MODEL` (image generation)
  - `OPENAI_IMAGE_SIZE` (e.g. `1024x1024`)
4) Restart the server

The backend calls the OpenAI-compatible endpoint `POST /v1/chat/completions` at `OPENAI_BASE_URL`.

### Fireworks AI example

- `LLM_PROVIDER=openai-compatible`
- `OPENAI_BASE_URL=https://api.fireworks.ai/inference/v1`
- `OPENAI_API_KEY=<YOUR_FIREWORKS_API_KEY>`
- `OPENAI_CHAT_MODEL=accounts/fireworks/models/deepseek-v3p1`
- `OPENAI_VISION_MODEL=accounts/fireworks/models/qwen2p5-vl-32b-instruct`

## Endpoints
- `POST /api/chat`
- `GET /api/history?limit=50`
- `DELETE /api/conversations/{conversationId}`
- `POST /api/messages/{messageId}/rating`
- `POST /api/image/describe` (multipart field: `image`)
- `POST /api/image/generate` (json: `{ "prompt": "...", "size": "1024x1024" }`)

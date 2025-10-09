# AwaazPilot – Murf WebSocket Voice App

A lightning-fast, multilingual **voice agent + instant dubber (optional)** built **strictly on Murf APIs**:
- **TTS Streaming via WebSocket** (`wss://api.murf.ai/v1/speech/stream-input`) for ultra-low latency.
- **Auth Token Minting** (`GET /v1/auth/token` using `api-key`) on the **server only**.
- **India-first languages** (Marathi, Telugu, Kannada, Gujarati, Hindi, en-IN).
- **Clean UX** + **secure backend proxy** (your API key never touches the browser).

> ✅ Designed to meet hackathon criteria: correct WS usage, pure Murf stack, innovation, great UX, robust code, and clear presentation.

---

## ✨ Features
- **Voice Response Console**: type/speak → hear **streaming** Murf audio immediately.
- **Language & Voice Picker**: swap language/voice without reconnecting.
- **(Bonus) Dub Automation**: upload a short MP4 and receive a dubbed clip (route scaffold provided).
- **Secure**: API key kept server-side; backend mints short-lived Bearer token and proxies WS.

---

## 🧱 Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Web Audio API, Tailwind/CSS.
- **Backend**: Node 18, Express, `ws` (WebSocket proxy), `node-fetch`, `dotenv`.
- **Murf**: Auth Token API, TTS WebSocket, (optional) Dub Automation API.
- **Tooling**: PNPM workspaces, GitHub Actions (Vercel + Render/Railway hooks).

---

## 📁 Monorepo Layout


AwaazPilot/
README.md
LICENSE
package.json
pnpm-workspace.yaml
.gitignore
.env.example
.github/workflows/deploy.yml
server/ # Node/Express + WS proxy (see server/README if present)
web/ # React + Vite frontend
scripts/ # demo-script.md, test-ws.ts, etc. (optional)
tests/ # optional unit/integration tests


> The `server/` and `web/` folders contain the actual app code (already scaffolded in your canvas).  
> This README focuses on **root setup & running**.

---

## 🔐 Environment Setup

### 1) Create `server/.env`
```env
MURF_API_KEY=your_murf_api_key_here
PORT=3000

2) Create web/.env (optional; defaults shown in code)
VITE_API_BASE=http://localhost:3000

3) (Optional) Root .env
NODE_ENV=development

🚀 Quick Start
# Install PNPM if needed
npm i -g pnpm

# Install dependencies for all workspaces
pnpm install

# Start dev servers (concurrently): API on :3000 and Web on :5173
pnpm dev

# Visit the app
http://localhost:5173

Production build & run
# Build all packages
pnpm build

# Start backend only (serves the WS proxy; host frontend separately or from a static host)
pnpm start

🖇️ How the Murf WebSocket Flow Works (Important)

Backend calls:

GET https://api.murf.ai/v1/auth/token with header api-key: <YOUR_API_KEY>

Receives a short-lived Bearer token (≈30 minutes)

Backend opens upstream WebSocket to Murf:

wss://api.murf.ai/v1/speech/stream-input

Header: Authorization: Bearer <token>

❌ Do not send api-key on the WS. Mixing headers can cause 1008 Invalid api key.

Frontend opens browser WebSocket to your backend:

ws://<your-backend>/ws/tts

Sends { type: 'voice_config', ... } then { type: 'text', input: "..." }

Backend forwards messages to Murf and relays audio chunks back to the browser, which plays them via Web Audio API.

Demo Script (90 seconds)

Select Marathi → click Speak with a short phrase → hear instant streaming.

Switch to Gujarati, no reconnect → speak again.

(Bonus) Upload a 10-sec MP4 → Dub to Kannada → play the returned snippet.

Show the Network/Console tab: browser → backend WS → Murf WS with Bearer token (API key never in browser).

🛠️ Troubleshooting

WS closes with 1008 (Invalid api key)
You likely passed the API key to the WS or mixed api-key with Authorization: Bearer.
Fix: Only server mints token; WS uses Bearer token header.

WS closes with 1005/1011
Network hiccup or token expiry. The backend auto-refreshes token ~60s early and reconnects.
Ensure your proxy code handles close events and resumes gracefully.

No audio playback
Confirm format matches your decoding path (e.g., MP3/WAV/PCM16).
Start audio context on user gesture (some browsers block autoplay).

📦 Scripts (root)

pnpm dev – run frontend + backend concurrently.

pnpm build – build all workspaces.

pnpm start – start backend (useful in production; serve frontend separately).

🔧 CI/CD (GitHub Actions)

Workflow builds both apps.

Deploys frontend to Vercel (requires VERCEL_* secrets).

Triggers backend deploy via Render/Railway deploy hook (requires RENDER_DEPLOY_HOOK or equivalent).

See .github/workflows/deploy.yml.
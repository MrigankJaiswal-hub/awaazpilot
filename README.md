# 🎙️ AwaazPilot — Real-Time AI Voice & Dubbing Agent

> _“AwaazPilot lets anyone speak or dub instantly — a real-time AI voice agent that converts text to natural speech and dubs media into multiple languages using Murf & Bedrock intelligence.”_

---

## 🚀 Project Overview

Modern creators and educators spend hours recording, re-recording, or manually dubbing their content.  
AwaazPilot eliminates that pain by offering **instant, lifelike dubbing and text-to-speech** in the browser — powered by **Murf.ai**, **AWS Bedrock**, and a custom **Express WebSocket backend**.

The goal is to make **voice AI accessible**, **affordable**, and **developer-friendly**.

---

## 🧠 Problem Statement

> Content creators lack a unified tool for real-time multilingual voiceovers and dubbing — manual workflows are time-consuming, expensive, and inconsistent.

---

## 💡 Solution

AwaazPilot is a **real-time, browser-based voice agent** that brings together:
- 🧠 **Murf AI** for lifelike speech synthesis and dubbing  
- ☁️ **AWS Bedrock AgentCore** for reasoning and automation  
- 🔁 **WebSocket proxy** for low-latency streaming  
- 🎞️ **Instant Dubber** for MP3/WAV uploads and auto-generated voiceovers  

Users simply upload or type, select a language, and get instant high-quality speech.

---

## ⚙️ Tech Stack

| Layer | Technology / Service |
|-------|----------------------|
| **Frontend** | React + Vite + TypeScript + Tailwind CSS |
| **Backend** | Node.js (Express) + WebSocket Proxy |
| **AI / APIs** | Murf.ai API, AWS Bedrock AgentCore |
| **Infra** | Render (API), Netlify (Frontend) |
| **Auth / CI** | AWS Cognito (planned), GitHub Actions |
| **Storage** | AWS S3 + Athena (planned for run history) |

---

## 🧩 Architecture Overview

Frontend (Netlify)
↓ REST / WS
Backend (Render: Express + WS Proxy)
↓
Murf.ai ←→ AWS Bedrock AgentCore
↓
S3 / Athena (historical runs, optional)


---

## 🧱 Features

- 🎧 Real-time **text-to-speech** with Murf voice streaming  
- 🎞️ **Instant Dubber** – upload media (MP3/WAV) → get dubbed audio  
- 🗣️ **Multilingual** (English 🇬🇧 & Hindi 🇮🇳, extensible to more)  
- ⚡ Sub-2-second latency WebSocket pipeline  
- 🧩 Modular architecture – drop-in Murf & Bedrock agent APIs  
- 🧠 Ready for AgentCore “plan→tool→refine” loops  

---

## 🎬 Demo Links

| Type | URL |
|------|-----|
| 🌐 Live App (Frontend) | [https://lambent-caramel-605436.netlify.app/](https://lambent-caramel-605436.netlify.app/) |
| ⚙️ Backend Health | [https://awaazpilot-36sp.onrender.com/health](https://awaazpilot-36sp.onrender.com/health) |
| 💾 GitHub Repository | _Add this repo link once pushed_ |

---

## 🧮 Benchmarks

| Metric | Before | After |
|---------|---------|--------|
| Time to generate multilingual dub | 2–3 hours | ~30 seconds |
| Cost per voiceover | ₹2000–₹4000 | < ₹50 |
| Accessibility reach | English only | English + Hindi (scalable) |

---

## 🧭 Future Scope

- 🤖 Integrate Bedrock **AgentGraph** for AutoDub (plan→tool→refine)  
- 🧬 Personalized voice cloning with Murf SDK  
- 🌏 Expand to 10+ Indian languages  
- 🧠 Context memory for dialogue continuity  
- 📱 PWA / mobile version for creators  

---

## 🧰 Local Development

### 1️⃣ Clone & Setup
```bash
git clone https://github.com/<your-username>/awaazpilot.git
cd awaazpilot

2️⃣ Install dependencies

Frontend:

cd web
pnpm install


Backend:

cd server
pnpm install

3️⃣ Add environment variables

For Backend (server/.env):

PORT=3000
MURF_API_KEY=<your-murf-api-key>
FRONTEND_ORIGIN=http://localhost:5173


For Frontend (web/.env):

VITE_API_BASE_URL=http://localhost:3000

4️⃣ Run locally
# Backend
cd server
pnpm dev

# Frontend (new terminal)
cd web
pnpm dev


Visit → http://localhost:5173

🌍 Deployment
| Service                | URL                                                                                      | Notes              |
| ---------------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| **Render (Backend)**   | [https://awaazpilot-36sp.onrender.com](https://awaazpilot-36sp.onrender.com)             | Express + WS Proxy |
| **Netlify (Frontend)** | [https://lambent-caramel-605436.netlify.app](https://lambent-caramel-605436.netlify.app) | Vite static site   |
| **Env Vars (Netlify)** | `VITE_API_BASE_URL=https://awaazpilot-36sp.onrender.com`                                 | Required for CORS  |

✨ Credits

Developer: Mrigank Jaisawal

Voice AI: Murf.ai

Infra & Agents: AWS Bedrock

Hosting: Netlify + Render

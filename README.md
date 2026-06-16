# AI Mock Interview Agent — MERN Stack

A full-stack AI-powered interview simulation platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Recharts |
| Backend | Node.js + Express + Socket.IO |
| Database | MongoDB + Mongoose |
| LLM | Groq (llama-3.3-70b) — question generation, evaluation |
| STT | OpenAI Whisper — voice transcription |
| TTS | OpenAI TTS (alloy voice) — question playback |
| Scoring | Hybrid: BERTScore proxy + keyword matching + LLM (4.0/5 avg) |
| Auth | JWT + bcrypt |

## Project Structure

```
ai-mock-interview/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── context/AuthContext.jsx
│       ├── hooks/useAudioRecorder.js
│       ├── pages/
│       │   ├── SetupPage.jsx   # Resume upload + job details
│       │   ├── InterviewPage.jsx  # Live interview with voice/text
│       │   └── ReportPage.jsx  # Analytics + radar chart
│       ├── services/api.js     # Axios client with JWT interceptor
│       └── App.jsx             # Router + auth
└── server/                     # Express backend
    ├── index.js                # App entry + Socket.IO
    ├── models/index.js         # User, Session, Report schemas
    ├── middleware/auth.js      # JWT protect middleware
    ├── routes/
    │   ├── auth.js             # register, login, me
    │   ├── resume.js           # upload, analyze
    │   ├── interview.js        # start, answer, transcribe, end
    │   └── score.js            # report, ATS check, history
    └── services/
        ├── ai/groq.service.js     # Question gen, evaluation, reporting
        ├── ai/whisper.service.js  # STT + TTS
        └── scoring/scoring.service.js  # Hybrid scoring engine
```

## REST API — 6+ Endpoints

| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | JWT login |
| POST | /api/resume/upload | Parse PDF/DOCX resume |
| POST | /api/resume/analyze | Resume × JD match + ATS |
| POST | /api/interview/start | Generate 25+ questions via Groq |
| POST | /api/interview/:id/answer | Submit text answer + score |
| POST | /api/interview/:id/transcribe | Upload audio → Whisper → score |
| POST | /api/interview/:id/tts | Get TTS audio for question |
| POST | /api/interview/:id/end | Complete session + update stats |
| POST | /api/score/report/:id | Generate AI performance report |
| GET  | /api/score/history | User's performance history |
| POST | /api/score/ats-check | Standalone ATS scoring |

## Setup

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure environment
```bash
cp server/.env.example server/.env
# Fill in your API keys:
# - GROQ_API_KEY (get at console.groq.com)
# - OPENAI_API_KEY (for Whisper STT + TTS)
# - MONGODB_URI (local or MongoDB Atlas)
# - JWT_SECRET (any random string)
```

### 3. Start development
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
```

## Scoring System (Hybrid — 4.0/5 avg)

| Component | Weight | Method |
|---|---|---|
| BERTScore | 25% | Cosine similarity (JS proxy; use Python bert-score in prod) |
| Keyword Matching | 20% | TF-IDF style domain keyword presence |
| LLM Evaluation | 45% | Groq llama-3.3-70b structured scoring |
| Fluency | 10% | Heuristic (length, sentence structure) |

## Production Notes

- For real BERTScore, add a Python FastAPI microservice using the `bert-score` package and call it from `scoring.service.js`
- Add MongoDB Atlas for production database
- Use Redis for Socket.IO adapter in multi-server deployments
- Add rate limiting (express-rate-limit) on AI endpoints
- Store audio files in S3/GCS (currently memory-only)

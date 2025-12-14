## Deployment Plan (Recommended)

### Overview
- **Frontend**: Vercel (Vite build → `dist/`)
- **Backend (Node orchestrator)**: Render/Fly/Railway via Docker
- **Python service (image processing)**: Render/Fly/Railway via Docker
- Frontend talks to Backend at `VITE_API_URL`, Backend talks to Python via `PYTHON_SERVICE_URL`.

---

### 1) Python service (Docker → Render/Fly/Railway)
Path: `python-service/`

Dockerfile (already present; includes potrace/opencv deps). Start command:
```bash
python app.py
```

Env:
- `PORT` (platform will provide; default 8000)

Health check: `GET /health`

Notes:
- `app.py` binds to `0.0.0.0` and respects `PORT`.
- Requires system `potrace`, `libgl1`, `libglib2.0-0` (already installed in Dockerfile).

---

### 2) Node Backend (Docker)
Path: `backend/`

Build & run:
```bash
npm ci
npm run build
npm start   # uses dist/index.js
```

Dockerfile already present. Env:
- `PORT` (default 3000)
- `PYTHON_SERVICE_URL` (e.g. `https://your-python-service.onrender.com`)
- `CORS_ORIGIN` (e.g. `https://your-frontend.vercel.app`)

Health check: `GET /api/health`

---

### 3) Frontend (Vercel, Vite)
Path: `frontend/`

Env (Vercel Project Settings → Environment Variables):
```
VITE_API_URL=https://your-backend.onrender.com
VITE_USE_AI=false
VITE_COLOR_COUNT=5
VITE_PRESERVE_STYLE=true
VITE_USE_COLOR_PIPELINE=false
VITE_INVERT_COLORS=false
VITE_MIN_ARTIFACT_SIZE=100
VITE_TURDSIZE=15
```

Build settings:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

`vite.config.ts` allows `.vercel.app` and proxies `/api` to `localhost:3000` for local dev; in production Vercel serves static and calls `VITE_API_URL`.

---

### 4) CORS
- Backend: set `CORS_ORIGIN` to your Vercel domain (`https://your-frontend.vercel.app`).
- Python: `CORS(app)` is open; you may restrict origins if needed.

---

### 5) Local verification before deploy
```bash
# Python
cd python-service && pip install -r requirements.txt && python app.py
# Backend
cd backend && npm ci && npm run dev
# Frontend
cd frontend && npm ci && npm run dev
```
Test:
- `curl http://localhost:8000/health`
- `curl http://localhost:3000/api/health`
- Open `http://localhost:5173`

---

### 6) Deploy steps (summary)
**Python (Render example)**: New Web Service → Docker → repo `python-service/` → Start `python app.py`.

**Backend (Render example)**: New Web Service → Docker → repo `backend/` → Start `npm start` → set env `PYTHON_SERVICE_URL`, `CORS_ORIGIN`.

**Frontend (Vercel)**: Connect repo → set env (`VITE_API_URL` to backend URL) → Deploy.

Update Telegram Web App URL to your Vercel domain.



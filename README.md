# Maliaka - Child Drawing Vectorizer Telegram Web App

A Telegram Web App that converts children's drawings into clean SVG vectors while preserving their artistic style.

## Project Structure

```
maliaka/
├── frontend/          # React + Vite + TypeScript
├── backend/           # Node.js Express API
├── python-service/    # Python image processing microservice
└── docker-compose.yml # Development environment setup
```

## Features

- 📸 Photo upload via Telegram Web App
- 🎨 Image preprocessing (background removal, contrast enhancement)
- 🔄 Vectorization using Potrace
- 👕 T-shirt mockup previews
- 🌍 Multi-language support (EN, UK, SL)
- 💾 SVG download functionality

## Tech Stack

**Frontend:**

- React 18 + TypeScript
- Vite
- Telegram Web Apps SDK
- TailwindCSS
- Konva.js (for SVG rendering)

**Backend:**

- Node.js + Express
- TypeScript
- Multer (file uploads)

**Image Processing:**

- Python 3.11+
- OpenCV (image preprocessing)
- Potrace (vectorization)
- PIL/Pillow (image manipulation)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (optional)

### Development Setup

1. **Backend (Node.js)**

```bash
cd backend
npm install
npm run dev
```

2. **Python Service**

```bash
cd python-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

3. **Frontend**

```bash
cd frontend
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose up --build
```

## API Endpoints

### POST `/api/process`

Process an image and return SVG.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `image` (file)

**Response:**

```json
{
  "success": true,
  "svg": "<svg>...</svg>",
  "originalSize": { "width": 1920, "height": 1080 },
  "processingTime": 1.23
}
```

### GET `/api/health`

Health check endpoint.

## Environment Variables

### Backend (.env)

```
PORT=3000
PYTHON_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
```

### Python Service (.env)

```
PORT=8000
MAX_FILE_SIZE=10485760  # 10MB
```

## Deployment

See `DEPLOYMENT.md` for production deployment instructions.

## License

MIT

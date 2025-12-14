# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed
- Docker & Docker Compose (optional, for containerized deployment)
- Telegram Bot Token (for Telegram Web App)

## Environment Setup

### Backend (.env)

```env
PORT=3000
PYTHON_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=https://your-frontend-domain.com
NODE_ENV=production
```

### Python Service (.env)

```env
PORT=8000
MAX_FILE_SIZE=10485760
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend-domain.com
```

## Local Development

### Option 1: Individual Services

1. **Start Python Service:**

```bash
cd python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

2. **Start Backend:**

```bash
cd backend
npm install
npm run dev
```

3. **Start Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Option 2: Docker Compose

```bash
docker-compose up --build
```

## Production Deployment

### Backend (Node.js)

1. Build:

```bash
cd backend
npm install
npm run build
```

2. Start:

```bash
npm start
```

Or use PM2:

```bash
pm2 start dist/index.js --name maliaka-backend
```

### Python Service

1. Install dependencies:

```bash
cd python-service
pip install -r requirements.txt
```

2. Run with Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

Or use systemd service:

```ini
[Unit]
Description=Maliaka Python Service
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/python-service
ExecStart=/usr/bin/gunicorn -w 4 -b 0.0.0.0:8000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### Frontend

1. Build:

```bash
cd frontend
npm install
npm run build
```

2. Serve with Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Telegram Web App Setup

1. Create a Telegram Bot via [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set Web App URL in BotFather:
   - `/newapp` or `/editapp`
   - Set URL to your frontend domain
4. Configure CORS in backend to allow your Telegram Web App domain

## Docker Production

### Build Images

```bash
# Backend
docker build -t maliaka-backend ./backend

# Python Service
docker build -t maliaka-python ./python-service

# Frontend
docker build -t maliaka-frontend ./frontend
```

### Run with Docker Compose

Update `docker-compose.yml` with production settings:

```yaml
version: "3.8"

services:
  backend:
    image: maliaka-backend
    environment:
      - NODE_ENV=production
      - PYTHON_SERVICE_URL=http://python-service:8000
    ports:
      - "3000:3000"

  python-service:
    image: maliaka-python
    ports:
      - "8000:8000"

  frontend:
    image: maliaka-frontend
    ports:
      - "80:5173"
```

## Monitoring

### Health Checks

Monitor endpoints:

- Backend: `GET /api/health`
- Python Service: `GET /health`

### Logging

- Backend logs: Check console output or PM2 logs
- Python logs: Check Gunicorn logs or systemd journal

## Scaling

### Horizontal Scaling

- Backend: Use load balancer (Nginx) with multiple instances
- Python Service: Use Gunicorn with multiple workers (already configured)

### Vertical Scaling

- Increase worker count in Gunicorn
- Use process manager (PM2) for Node.js clustering

## Security Considerations

1. **CORS**: Configure allowed origins in backend
2. **File Upload**: Validate file types and sizes
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **HTTPS**: Use SSL/TLS certificates in production
5. **Environment Variables**: Never commit `.env` files

## Troubleshooting

### Python Service Not Starting

- Check if Potrace is installed: `which potrace`
- Verify Python dependencies: `pip list`
- Check logs for errors

### Backend Can't Connect to Python Service

- Verify `PYTHON_SERVICE_URL` environment variable
- Check network connectivity between services
- Ensure Python service is running and accessible

### Frontend Build Errors

- Clear `node_modules` and reinstall
- Check TypeScript errors: `npm run build`
- Verify environment variables are set

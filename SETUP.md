# Setup Instructions

## Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://www.python.org/downloads/))
- **Potrace** (for vectorization)
  - macOS: `brew install potrace`
  - Ubuntu/Debian: `sudo apt-get install potrace`
  - Windows: Download from [Potrace website](http://potrace.sourceforge.net/)

### Step 1: Clone and Setup Backend

```bash
cd backend
npm install
cp .env.example .env  # Edit .env with your settings
npm run dev
```

Backend will run on `http://localhost:3000`

### Step 2: Setup Python Service

```bash
cd python-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run service
python app.py
```

Python service will run on `http://localhost:8000`

### Step 3: Setup Frontend

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3000" > .env

# Run development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## Testing the Setup

1. **Check Backend Health:**

```bash
curl http://localhost:3000/api/health
```

2. **Check Python Service Health:**

```bash
curl http://localhost:8000/health
```

3. **Test Image Processing:**

```bash
curl -X POST http://localhost:3000/api/process \
  -F "image=@path/to/test-image.jpg"
```

## Docker Setup (Alternative)

If you prefer Docker:

```bash
# Build and run all services
docker-compose up --build

# Or run individually
docker-compose up backend
docker-compose up python-service
docker-compose up frontend
```

## Troubleshooting

### Python Service Issues

**Error: `ModuleNotFoundError: No module named 'potrace'`**

- Ensure you've installed all requirements: `pip install -r requirements.txt`
- Verify virtual environment is activated

**Error: `potrace: command not found`**

- Install Potrace system package (see Prerequisites)
- On macOS: `brew install potrace`
- On Linux: `sudo apt-get install potrace`

**Error: `cv2` import fails**

- Reinstall OpenCV: `pip install --upgrade opencv-python`

### Backend Issues

**Error: `Cannot connect to Python service`**

- Verify Python service is running on port 8000
- Check `PYTHON_SERVICE_URL` in backend `.env` file

**Error: Port already in use**

- Change port in `.env` file
- Or kill process using the port

### Frontend Issues

**Error: `Cannot connect to API`**

- Verify backend is running
- Check `VITE_API_URL` in frontend `.env`
- Ensure CORS is configured correctly in backend

**Build errors**

- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## Development Tips

1. **Hot Reload**: Both frontend (Vite) and backend (tsx watch) support hot reload
2. **Python Reload**: Use `flask run --reload` or install `watchdog` for auto-reload
3. **Logging**: Check console outputs for debugging
4. **API Testing**: Use Postman or curl for API testing

## Next Steps

- Configure Telegram Bot (see DEPLOYMENT.md)
- Set up production environment
- Configure domain and SSL certificates
- Set up monitoring and logging

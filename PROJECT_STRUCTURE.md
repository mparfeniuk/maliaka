# Project Structure

```
maliaka/
├── frontend/                    # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Upload.tsx       # Image upload component
│   │   │   ├── Result.tsx       # Result display component
│   │   │   ├── SVGViewer.tsx    # SVG rendering component
│   │   │   └── MockupPreview.tsx # T-shirt mockup preview
│   │   ├── i18n/                # Internationalization
│   │   │   ├── config.ts        # i18n configuration
│   │   │   └── locales/         # Translation files
│   │   │       ├── en.json      # English
│   │   │       ├── uk.json      # Ukrainian
│   │   │       └── sl.json      # Slovenian
│   │   ├── services/            # API services
│   │   │   └── api.ts           # API client
│   │   ├── types/               # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx              # Main app component
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── index.html
│
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── routes/              # API routes
│   │   │   ├── process.ts       # Image processing endpoint
│   │   │   └── health.ts        # Health check endpoint
│   │   └── index.ts             # Express app entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
│
├── python-service/              # Python Flask Image Processing Service
│   ├── app.py                   # Flask application
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile
│
├── docker-compose.yml           # Docker Compose configuration
├── .gitignore
├── README.md                    # Main documentation
├── API.md                       # API documentation
├── DEPLOYMENT.md                # Deployment guide
└── PROJECT_STRUCTURE.md         # This file
```

## Component Responsibilities

### Frontend Components

- **App.tsx**: Main application component, handles state and routing
- **Upload.tsx**: Handles image upload via file input or camera
- **Result.tsx**: Displays processed SVG and download/mockup options
- **SVGViewer.tsx**: Renders SVG inline
- **MockupPreview.tsx**: Shows SVG on T-shirt mockup using Canvas

### Backend Routes

- **process.ts**: Receives image, forwards to Python service, returns SVG
- **health.ts**: Health check endpoint

### Python Service

- **app.py**:
  - `/process`: Image processing pipeline
  - `/health`: Health check
  - Functions:
    - `remove_background()`: Background removal using OpenCV
    - `enhance_contrast()`: Contrast enhancement with CLAHE
    - `convert_to_bw()`: Black and white conversion
    - `vectorize_with_potrace()`: SVG vectorization

## Data Flow

1. User uploads image in Telegram Web App (Frontend)
2. Frontend sends image to Backend API (`POST /api/process`)
3. Backend forwards image to Python Service (`POST /process`)
4. Python Service processes image:
   - Background removal
   - Contrast enhancement
   - B&W conversion
   - Vectorization with Potrace
5. Python Service returns SVG to Backend
6. Backend returns SVG to Frontend
7. Frontend displays SVG and mockup preview

## Technology Stack

### Frontend

- React 18
- TypeScript
- Vite
- TailwindCSS
- Telegram Web Apps SDK
- i18next (internationalization)

### Backend

- Node.js
- Express
- TypeScript
- Multer (file uploads)
- Axios (HTTP client)

### Image Processing

- Python 3.11
- Flask
- OpenCV
- Potrace
- PIL/Pillow
- NumPy

## Environment Variables

### Backend

- `PORT`: Server port (default: 3000)
- `PYTHON_SERVICE_URL`: Python service URL
- `CORS_ORIGIN`: Allowed CORS origin
- `NODE_ENV`: Environment (development/production)

### Python Service

- `PORT`: Service port (default: 8000)
- `MAX_FILE_SIZE`: Maximum file size in bytes

### Frontend

- `VITE_API_URL`: Backend API URL

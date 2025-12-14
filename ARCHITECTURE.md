# Architecture Overview

## System Architecture

```
┌─────────────────┐
│  Telegram Web   │
│      App        │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP POST (multipart/form-data)
         │ Image File
         ▼
┌─────────────────┐
│  Node.js API    │
│   (Backend)     │
│   Port: 3000    │
└────────┬────────┘
         │ HTTP POST (multipart/form-data)
         │ Forward Image
         ▼
┌─────────────────┐
│ Python Service  │
│   Flask API     │
│   Port: 8000    │
└────────┬────────┘
         │
         │ Image Processing Pipeline:
         │ 1. Background Removal (OpenCV)
         │ 2. Contrast Enhancement (CLAHE)
         │ 3. B&W Conversion (Adaptive Threshold)
         │ 4. Vectorization (Potrace)
         │
         ▼
┌─────────────────┐
│   SVG Output    │
└─────────────────┘
         │
         │ Return SVG
         │
         ▼
┌─────────────────┐
│   Frontend      │
│  Display &      │
│  Download       │
└─────────────────┘
```

## Component Details

### Frontend (React + TypeScript)

**Responsibilities:**

- User interface for Telegram Web App
- Image upload handling
- SVG display and rendering
- T-shirt mockup preview
- Multi-language support (EN, UK, SL)

**Key Technologies:**

- React 18 for UI components
- Telegram Web Apps SDK for Telegram integration
- i18next for internationalization
- TailwindCSS for styling
- Canvas API for mockup rendering

**State Management:**

- React hooks (useState, useEffect)
- Local component state
- No global state management (MVP scope)

### Backend (Node.js + Express)

**Responsibilities:**

- API gateway between frontend and Python service
- File upload handling (Multer)
- Request validation
- Error handling and formatting
- Health check endpoints

**Key Technologies:**

- Express.js for HTTP server
- Multer for file uploads
- Axios for HTTP client (to Python service)
- TypeScript for type safety

**API Design:**

- RESTful endpoints
- JSON responses
- Multipart form data for file uploads
- Consistent error response format

### Python Service (Flask)

**Responsibilities:**

- Image preprocessing
- Background removal
- Contrast enhancement
- Black & white conversion
- SVG vectorization

**Key Technologies:**

- Flask for HTTP server
- OpenCV for image processing
- Potrace for vectorization
- PIL/Pillow for image manipulation
- NumPy for array operations

**Processing Pipeline:**

1. **Background Removal**

   - LAB color space conversion
   - Lightness channel thresholding
   - Morphological operations
   - Alpha channel creation

2. **Contrast Enhancement**

   - CLAHE (Contrast Limited Adaptive Histogram Equalization)
   - Preserves local contrast
   - Maintains child-like style

3. **B&W Conversion**

   - Adaptive thresholding
   - Preserves uneven lines
   - Maintains artistic style

4. **Vectorization**
   - Potrace bitmap tracing
   - Bezier curve optimization
   - SVG path generation

## Data Flow

### Image Upload Flow

1. User selects/takes photo in Telegram Web App
2. Frontend creates FormData with image file
3. Frontend sends POST request to `/api/process`
4. Backend receives file via Multer middleware
5. Backend validates file (type, size)
6. Backend forwards file to Python service
7. Python service processes image:
   - Loads image into memory
   - Applies preprocessing pipeline
   - Generates SVG
8. Python service returns SVG string
9. Backend returns JSON response with SVG
10. Frontend receives SVG and displays it

### Error Handling

- **Frontend**: Catches errors, displays user-friendly messages
- **Backend**: Validates requests, handles Python service errors
- **Python Service**: Catches processing errors, returns error responses

## Communication Patterns

### Frontend ↔ Backend

- **Protocol**: HTTP/HTTPS
- **Format**: JSON (responses), multipart/form-data (requests)
- **Authentication**: None (MVP scope, can be added later)

### Backend ↔ Python Service

- **Protocol**: HTTP/HTTPS
- **Format**: multipart/form-data (requests), JSON (responses)
- **Service Discovery**: Environment variable (`PYTHON_SERVICE_URL`)

## Scalability Considerations

### Current Architecture (MVP)

- Single instance of each service
- Synchronous processing
- In-memory file handling

### Future Enhancements

- **Horizontal Scaling**: Load balancer for multiple instances
- **Async Processing**: Queue system (Redis/RabbitMQ) for long-running tasks
- **Caching**: Redis for frequently accessed SVGs
- **Storage**: Object storage (S3) for original images
- **CDN**: Serve static assets and SVGs via CDN

## Security Considerations

### Current (MVP)

- File type validation
- File size limits
- CORS configuration
- Basic error handling

### Production Recommendations

- Rate limiting
- Authentication/Authorization
- Input sanitization
- HTTPS enforcement
- File scanning (malware detection)
- Request size limits
- API key authentication

## Performance Optimization

### Image Processing

- Image resizing before processing (if too large)
- Parallel processing for multiple images (future)
- Caching processed SVGs

### Frontend

- Lazy loading components
- Image compression before upload
- SVG optimization
- Code splitting

### Backend

- Connection pooling to Python service
- Response compression
- Request queuing

## Monitoring & Logging

### Recommended Metrics

- Request count and latency
- Error rates
- Processing time
- File sizes
- Service health

### Logging

- Structured logging (JSON format)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Request IDs for tracing
- Error stack traces

## Deployment Architecture

### Development

- All services run locally
- Hot reload enabled
- Debug mode active

### Production

- Containerized services (Docker)
- Reverse proxy (Nginx)
- SSL/TLS termination
- Health checks
- Auto-scaling (future)

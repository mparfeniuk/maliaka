# API Documentation

## Base URL

- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

## Endpoints

### POST `/api/process`

Process an uploaded image and return an SVG vector.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `image` (file, required): Image file (JPEG, PNG, or WebP)
  - Max file size: 10MB

**Response (Success):**

```json
{
  "success": true,
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"...>...</svg>",
  "originalSize": {
    "width": 1920,
    "height": 1080
  },
  "processingTime": 1.23
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error message (optional)"
}
```

**Status Codes:**

- `200`: Success
- `400`: Bad request (no file, invalid file type)
- `500`: Internal server error
- `503`: Service unavailable (Python service not running)

**Example (cURL):**

```bash
curl -X POST http://localhost:3000/api/process \
  -F "image=@drawing.jpg"
```

### GET `/api/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "backend": "ok",
    "pythonService": "ok"
  }
}
```

## Python Service Endpoints

### POST `/process`

Internal endpoint called by the Node.js backend.

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `image` (file, required): Image file

**Response:**
Same as `/api/process` endpoint.

### GET `/health`

Health check for Python service.

**Response:**

```json
{
  "status": "ok",
  "service": "python-image-processor"
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common errors:

- `No image file provided`: Missing file in request
- `Invalid file type`: File type not supported
- `File too large`: File exceeds size limit
- `Image processing service unavailable`: Python service not running
- `Failed to process image`: Processing error

# Color-Preserving Vectorization API

## Base URL
- Development: `http://localhost:8000`
- Production: `https://your-domain.com`

## Endpoints

### POST `/process`

Process an image through the color-preserving vectorization pipeline.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `image` (file, required): Image file (JPEG, PNG, or WebP)
  - `colorCount` (integer, optional): Number of colors to extract (3-7, default: 5)
  - `preserveStyle` (boolean, optional): Preserve imperfections (default: true)
  - `useAI` (boolean, optional): Use AI background removal (default: true)
- Max file size: 10MB

**Response (Success):**
```json
{
  "success": true,
  "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"...>...</svg>",
  "colors": [
    {
      "rgb": [255, 0, 0],
      "hex": "#ff0000",
      "percentage": 35.5
    },
    {
      "rgb": [0, 255, 0],
      "hex": "#00ff00",
      "percentage": 28.3
    }
  ],
  "originalSize": {
    "width": 1920,
    "height": 1080
  },
  "processedSize": {
    "width": 1500,
    "height": 1000
  },
  "processingTime": 2.34,
  "metadata": {
    "colorCount": 5,
    "regionCount": 5,
    "style": "authentic"
  }
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
- `400`: Bad request (no file, invalid file type, invalid parameters)
- `500`: Internal server error
- `503`: Service unavailable

**Example (cURL):**
```bash
curl -X POST http://localhost:8000/process \
  -F "image=@drawing.jpg" \
  -F "colorCount=5" \
  -F "preserveStyle=true" \
  -F "useAI=true"
```

### POST `/process/variants`

Generate multiple color variants (future implementation).

**Status:** `501 Not Implemented` (for MVP)

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "python-image-processor-color",
  "pipeline": "color-preserving"
}
```

## Processing Options

### `colorCount` (3-7)
- **3 colors**: Very simple, minimal palette
- **5 colors** (default): Balanced, good for most drawings
- **7 colors**: More detailed, preserves more color nuances

### `preserveStyle` (true/false)
- **true** (default): Keeps imperfections, uneven lines, authentic style
- **false**: More smoothing, cleaner output

### `useAI` (true/false)
- **true** (default): Uses rembg/U²-Net for background removal
- **false**: Falls back to traditional color-based background removal

## Response Fields

### `colors` Array
Each color object contains:
- `rgb`: RGB color values `[R, G, B]`
- `hex`: Hex color code (e.g., `"#ff0000"`)
- `percentage`: Percentage of image covered by this color

### `metadata` Object
- `colorCount`: Number of colors extracted
- `regionCount`: Number of color regions segmented
- `style`: `"authentic"` or `"clean"` based on `preserveStyle`

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
- `Failed to extract colors`: Color extraction failed
- `Vectorization failed`: SVG generation failed


# Integration Guide: Color Pipeline

## Quick Integration Steps

### 1. Backend is Already Configured ✅

The new endpoint `/api/process/color` is already added to `backend/src/index.ts`.

### 2. Update Python Service

**Option A: Run Both Services (Recommended for Testing)**
```bash
# Terminal 1: Original B&W service
cd python-service
python app.py  # Port 8000

# Terminal 2: New color service  
cd python-service
python app_color.py  # Port 8001 (update PORT in .env)
```

**Option B: Replace Service**
```bash
cd python-service
mv app.py app_bw_backup.py
mv app_color.py app.py
python app.py
```

### 3. Install Python Dependencies

```bash
cd python-service
source venv/bin/activate
pip install -r requirements.txt

# Download AI models (first time only)
python models/download_models.py
```

### 4. Update Frontend (Optional)

Add support for color pipeline in frontend:

```typescript
// frontend/src/services/api.ts

export interface ColorInfo {
  rgb: [number, number, number];
  hex: string;
  percentage: number;
}

export interface ProcessColorResult {
  success: boolean;
  svg: string;
  colors: ColorInfo[];
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  processingTime: number;
  metadata: {
    colorCount: number;
    regionCount: number;
    style: string;
  };
}

export async function processImageColor(
  file: File,
  options?: {
    colorCount?: number;
    preserveStyle?: boolean;
    useAI?: boolean;
  }
): Promise<ProcessColorResult> {
  const formData = new FormData();
  formData.append('image', file);
  
  if (options?.colorCount) {
    formData.append('colorCount', options.colorCount.toString());
  }
  if (options?.preserveStyle !== undefined) {
    formData.append('preserveStyle', options.preserveStyle.toString());
  }
  if (options?.useAI !== undefined) {
    formData.append('useAI', options.useAI.toString());
  }

  const response = await axios.post<ProcessColorResult>(
    `${API_URL}/api/process/color`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 120 seconds
    }
  );

  if (!response.data.success) {
    throw new Error(response.data.error || 'Processing failed');
  }

  return response.data;
}
```

## Testing the Integration

### Test Backend → Python Service

```bash
# Test health
curl http://localhost:8000/health

# Test color processing
curl -X POST http://localhost:8000/process \
  -F "image=@test_drawing.jpg" \
  -F "colorCount=5" \
  -F "preserveStyle=true" \
  -F "useAI=true"
```

### Test Full Stack

```bash
# Via backend API
curl -X POST http://localhost:3000/api/process/color \
  -F "image=@test_drawing.jpg" \
  -F "colorCount=5"
```

## Configuration

### Environment Variables

**Backend** (`.env`):
```
PORT=3000
PYTHON_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
```

**Python Service** (`.env`):
```
PORT=8000
MAX_FILE_SIZE=10485760
```

### Processing Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `colorCount` | 3-7 | 5 | Number of colors to extract |
| `preserveStyle` | true/false | true | Keep imperfections |
| `useAI` | true/false | true | Use AI background removal |

## Performance Tuning

### For Faster Processing
- Lower `colorCount` (3-4 colors)
- Set `useAI=false` (if background is simple)
- Reduce image size before upload

### For Better Quality
- Higher `colorCount` (6-7 colors)
- Set `preserveStyle=true`
- Set `useAI=true`

### For Smaller SVG Files
- Lower `colorCount`
- Set `preserveStyle=false` (more smoothing = fewer points)

## Troubleshooting

### Python Service Won't Start
```bash
# Check dependencies
pip list | grep -E "rembg|scikit|opencv"

# Check Potrace
which potrace

# Check Python version
python --version  # Should be 3.11+
```

### AI Models Not Loading
```bash
# Check model cache
ls ~/.u2net/

# Re-download
python models/download_models.py

# Check disk space (models are ~170MB)
df -h
```

### Processing Fails
- Check Python service logs
- Verify image format (JPEG/PNG/WebP)
- Check file size (< 10MB)
- Verify Potrace is installed

## Migration Checklist

- [ ] Install Python dependencies
- [ ] Download AI models
- [ ] Test Python service standalone
- [ ] Test backend → Python service
- [ ] Update frontend (optional)
- [ ] Test full stack
- [ ] Monitor performance
- [ ] Update documentation

## Next Steps

1. **Test with real drawings**: Try various child drawings
2. **Tune parameters**: Adjust colorCount based on results
3. **Monitor performance**: Track processing times
4. **Gather feedback**: See if style preservation works well
5. **Iterate**: Adjust parameters based on results


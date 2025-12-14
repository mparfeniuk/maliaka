# Implementation Guide: Color-Preserving Pipeline

## Quick Start

### 1. Install Dependencies

```bash
cd python-service
source venv/bin/activate
pip install -r requirements.txt
```

**Important**: Install Potrace system-wide:
```bash
# macOS
brew install potrace

# Linux
sudo apt-get install potrace
```

### 2. Download AI Models (First Time)

```bash
cd python-service
python models/download_models.py
```

This downloads rembg models (~170MB) and caches them locally.

### 3. Switch to Color Pipeline

**Option A: Use new endpoint (recommended)**
- Backend: Already configured at `/api/process/color`
- Frontend: Update API call to use new endpoint

**Option B: Replace existing service**
- Rename `app.py` to `app_bw.py` (backup)
- Rename `app_color.py` to `app.py`
- Restart Python service

### 4. Test the Pipeline

```bash
# Test health
curl http://localhost:8000/health

# Test processing
curl -X POST http://localhost:8000/process \
  -F "image=@test_drawing.jpg" \
  -F "colorCount=5" \
  -F "preserveStyle=true"
```

## Frontend Integration

### Update API Service

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
      timeout: 120000,
    }
  );

  if (!response.data.success) {
    throw new Error('Processing failed');
  }

  return response.data;
}
```

### Update Result Component

Add color palette display:

```typescript
// frontend/src/components/Result.tsx

{result.colors && (
  <div className="mb-4">
    <h3 className="text-sm font-semibold text-gray-700 mb-2">Color Palette</h3>
    <div className="flex gap-2 flex-wrap">
      {result.colors.map((color, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 px-3 py-1 rounded-lg border"
          style={{ borderColor: color.hex }}
        >
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: color.hex }}
          />
          <span className="text-xs text-gray-600">
            {color.hex} ({color.percentage.toFixed(1)}%)
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

## Pipeline Configuration

### Environment Variables

```bash
# python-service/.env
PORT=8000
MAX_FILE_SIZE=10485760  # 10MB
REMBG_MODEL=u2net  # or u2net_human_seg, silueta, isnet-general-use
```

### Processing Parameters

**Color Count (3-7)**
- Lower (3-4): Simpler, faster, good for simple drawings
- Medium (5): Balanced, recommended default
- Higher (6-7): More detail, slower processing

**Preserve Style**
- `true`: Keeps imperfections, authentic look
- `false`: More smoothing, cleaner output

**Use AI**
- `true`: Better background removal, requires model download
- `false`: Faster, traditional method, may miss complex backgrounds

## Performance Considerations

### Processing Time
- **Small images** (< 1000px): 2-5 seconds
- **Medium images** (1000-1500px): 5-10 seconds
- **Large images** (> 1500px): 10-20 seconds

### Memory Usage
- Base: ~200MB
- With AI models: ~500MB
- Peak during processing: ~1GB

### Optimization Tips
1. **Resize before processing**: Images are auto-resized to max 1500px
2. **Lower color count**: Reduces processing time
3. **Disable AI**: Faster if background is simple
4. **Cache models**: Models are cached after first download

## Troubleshooting

### AI Models Not Loading
```bash
# Check if models downloaded
ls ~/.u2net/

# Re-download models
python models/download_models.py
```

### Potrace Not Found
```bash
# Verify installation
which potrace

# Install if missing
brew install potrace  # macOS
sudo apt-get install potrace  # Linux
```

### Memory Issues
- Reduce `MAX_DIMENSION` in `app_color.py` (default: 1500)
- Process smaller images
- Increase system memory

### Color Extraction Fails
- Check if image has enough color variation
- Try increasing `min_color_percentage` in `color_cleanup.py`
- Verify image isn't completely white/black

## Testing

### Unit Tests (Future)
```bash
pytest tests/test_preprocessing.py
pytest tests/test_color_cleanup.py
pytest tests/test_segmentation.py
pytest tests/test_vectorization.py
```

### Integration Test
```python
# test_pipeline.py
from pipeline import *
import cv2
import numpy as np

# Create test image
test_image = np.ones((500, 500, 3), dtype=np.uint8) * 255
cv2.rectangle(test_image, (100, 100), (400, 400), (255, 0, 0), -1)

# Run pipeline
processed, mask = preprocess_image(test_image)
colors, flattened = create_color_map(processed[:, :, :3], mask)
regions = segment_by_color(flattened, mask, colors)
svg = vectorize_regions(regions, 500, 500)

assert len(svg) > 100, "SVG should not be empty"
print("✅ Pipeline test passed")
```

## Migration from B&W Pipeline

### Step-by-Step Migration

1. **Keep both pipelines running**
   - `/api/process` → B&W (existing)
   - `/api/process/color` → Color (new)

2. **Update frontend gradually**
   - Add feature flag for color pipeline
   - A/B test with users
   - Monitor performance

3. **Full migration**
   - Switch default endpoint
   - Deprecate B&W endpoint
   - Remove old code

### Backward Compatibility

The color pipeline can generate monochrome output:
- Set `colorCount=1` (will extract dominant color)
- Or post-process SVG to remove colors

## Next Steps

1. **Variant Generation**: Implement `/process/variants` endpoint
2. **Path Optimization**: Add Douglas-Peucker algorithm
3. **Layer Organization**: Better SVG structure with named groups
4. **Caching**: Cache processed results for repeated requests
5. **Batch Processing**: Process multiple images


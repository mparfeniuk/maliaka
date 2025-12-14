# Color-Preserving Vectorization Pipeline Architecture

## Overview

This document describes the AI-assisted color-preserving pipeline for vectorizing children's drawings while maintaining their authentic, imperfect style.

## Core Principles

1. **Preserve Authenticity**: Keep uneven lines, imperfect shapes, and child-like style
2. **Color Preservation**: Maintain original color palette without recoloring
3. **No Over-Polishing**: Avoid AI beautification that removes character
4. **Production-Ready**: Use reliable, explainable methods

## Pipeline Stages

### Stage 1: AI-Assisted Preprocessing
**Goal**: Clean input while preserving strokes and colors

**Steps**:
1. **Background Removal** (U²-Net or rembg)
   - Remove paper background and environment
   - Preserve all drawing strokes
   - Output: RGBA image with transparent background

2. **Lighting Normalization**
   - Correct uneven lighting from phone camera
   - Preserve color accuracy
   - Use CLAHE on LAB color space

3. **Noise Reduction**
   - Gentle denoising (bilateral filter)
   - Preserve stroke edges
   - Avoid blurring details

### Stage 2: Color Cleanup
**Goal**: Simplify colors while keeping original palette

**Steps**:
1. **Color Quantization** (K-means clustering)
   - Extract 3-7 dominant colors from original
   - Use original colors, not generated ones
   - Preserve color relationships

2. **Color Flattening**
   - Map pixels to nearest dominant color
   - Create solid color regions
   - Maintain shape boundaries

### Stage 3: Color-Based Segmentation
**Goal**: Separate drawing into color layers

**Steps**:
1. **Region Extraction**
   - Extract each color region as separate mask
   - Use flood fill or connected components
   - Preserve imperfect boundaries

2. **Boundary Smoothing** (minimal)
   - Light morphological operations
   - Remove tiny artifacts only
   - Keep hand-drawn imperfections

### Stage 4: Vectorization
**Goal**: Convert each color region to SVG paths

**Steps**:
1. **Per-Color Vectorization**
   - Use Potrace for each color mask
   - Low smoothing tolerance (preserve imperfections)
   - Generate separate SVG paths

2. **SVG Assembly**
   - Combine all color paths into single SVG
   - Use `<g>` groups for each color
   - Maintain layer order

### Stage 5: Post-Processing
**Goal**: Clean SVG without losing character

**Steps**:
1. **Path Optimization**
   - Simplify paths slightly (reduce points by 10-20%)
   - Keep shape accuracy
   - Remove duplicate paths

2. **SVG Structure**
   - Organize by color layers
   - Add metadata (colors used, original size)
   - Optimize for printing

## API Design

### Endpoint: `POST /api/process`

**Request**:
```json
{
  "image": "<multipart file>",
  "options": {
    "colorCount": 5,           // 3-7 colors
    "preserveStyle": true,     // Keep imperfections
    "outputFormat": "svg"      // svg, png, or both
  }
}
```

**Response**:
```json
{
  "success": true,
  "svg": "<svg>...</svg>",
  "colors": [
    {"hex": "#FF0000", "percentage": 25.5},
    {"hex": "#00FF00", "percentage": 30.2}
  ],
  "originalSize": {"width": 1920, "height": 1080},
  "processingTime": 2.34,
  "metadata": {
    "colorCount": 5,
    "pathCount": 127,
    "style": "authentic"
  }
}
```

### Endpoint: `POST /api/process/variants`

**Request**: Same as `/api/process` plus:
```json
{
  "variants": ["original", "monochrome", "pastel"]
}
```

**Response**: Multiple SVG variants

## Technology Stack

### AI Models
- **Background Removal**: `rembg` (U²-Net based) - lightweight, production-ready
- **Alternative**: `u2net` directly if more control needed

### Image Processing
- **OpenCV**: Color clustering, segmentation, morphological operations
- **scikit-image**: Advanced segmentation if needed
- **PIL/Pillow**: Image manipulation

### Vectorization
- **Potrace**: Per-color-region vectorization
- **SVG Processing**: `svglib` or custom SVG builder

### Python Libraries
```python
rembg>=2.0.0          # AI background removal
opencv-python>=4.8.0  # Image processing
scikit-image>=0.21.0  # Advanced segmentation
scikit-learn>=1.3.0   # K-means clustering
numpy>=1.24.0
pillow>=10.0.0
```

## Folder Structure

```
python-service/
├── app.py                    # Flask app entry point
├── pipeline/
│   ├── __init__.py
│   ├── preprocessing.py      # Stage 1: AI preprocessing
│   ├── color_cleanup.py      # Stage 2: Color quantization
│   ├── segmentation.py       # Stage 3: Color-based segmentation
│   ├── vectorization.py      # Stage 4: SVG generation
│   └── postprocessing.py     # Stage 5: SVG cleanup
├── models/
│   └── download_models.py    # Download AI models on startup
├── utils/
│   ├── image_utils.py        # Image manipulation helpers
│   └── svg_utils.py          # SVG building helpers
└── requirements.txt
```

## Processing Flow

```
Input Image (JPEG/PNG)
    ↓
[Stage 1] AI Preprocessing
    ├─ Background Removal (rembg)
    ├─ Lighting Normalization
    └─ Noise Reduction
    ↓
[Stage 2] Color Cleanup
    ├─ Extract Dominant Colors (K-means)
    ├─ Flatten Colors
    └─ Create Color Map
    ↓
[Stage 3] Segmentation
    ├─ Extract Color Regions
    ├─ Create Masks per Color
    └─ Boundary Cleanup
    ↓
[Stage 4] Vectorization
    ├─ Vectorize Each Color Mask (Potrace)
    ├─ Generate SVG Paths
    └─ Combine into Single SVG
    ↓
[Stage 5] Post-Processing
    ├─ Optimize Paths
    ├─ Organize Layers
    └─ Add Metadata
    ↓
Output SVG
```

## Key Implementation Details

### Color Quantization Strategy
- Use K-means clustering in LAB color space (better perceptual uniformity)
- Extract colors from original image (not generated)
- Limit to 3-7 colors to keep SVG manageable
- Preserve color relationships

### Style Preservation
- Low smoothing in Potrace (`opttolerance: 0.2-0.3`)
- Minimal morphological operations
- Keep small imperfections
- Preserve stroke width variations

### Performance Considerations
- Cache AI models after first load
- Process colors in parallel where possible
- Optimize SVG size without losing quality
- Timeout protection (60s max)

## Error Handling

- Invalid input: Return 400 with clear message
- Processing timeout: Return 504 with partial results if available
- Model loading failure: Fallback to traditional methods
- Memory issues: Resize image automatically

## Testing Strategy

1. **Unit Tests**: Each pipeline stage independently
2. **Integration Tests**: Full pipeline with sample images
3. **Style Preservation Tests**: Compare before/after for authenticity
4. **Performance Tests**: Measure processing time and memory usage


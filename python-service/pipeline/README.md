# Color-Preserving Vectorization Pipeline

## Overview

This pipeline processes children's drawings through 5 stages to create color-preserving SVG vectors while maintaining their authentic, imperfect style.

## Pipeline Stages

### Stage 1: Preprocessing (`preprocessing.py`)
- **AI Background Removal**: Uses rembg/U²-Net to remove paper background
- **Lighting Normalization**: Corrects uneven lighting using CLAHE
- **Noise Reduction**: Gentle denoising with bilateral filter

**Key Functions:**
- `preprocess_image(image, use_ai=True)` → Returns (processed_image_with_alpha, mask)

### Stage 2: Color Cleanup (`color_cleanup.py`)
- **Color Extraction**: K-means clustering to find 3-7 dominant colors
- **Color Flattening**: Maps pixels to nearest palette color

**Key Functions:**
- `create_color_map(image, mask, n_colors=5)` → Returns (color_palette, flattened_image)
- `ColorInfo` class: Represents a color with RGB, hex, and percentage

### Stage 3: Segmentation (`segmentation.py`)
- **Region Extraction**: Separates image into color regions
- **Boundary Cleaning**: Minimal cleanup to preserve style

**Key Functions:**
- `segment_by_color(image, mask, color_palette, preserve_style=True)` → Returns List[ColorRegion]
- `ColorRegion` class: Represents a color region with mask and bounds

### Stage 4: Vectorization (`vectorization.py`)
- **Per-Color Vectorization**: Uses Potrace for each color mask
- **SVG Assembly**: Combines all paths into single SVG

**Key Functions:**
- `vectorize_regions(regions, width, height, preserve_style=True)` → Returns SVG string

### Stage 5: Post-Processing (`postprocessing.py`)
- **Path Optimization**: Minimal optimization to preserve style
- **Metadata Addition**: Adds color and processing info to SVG

**Key Functions:**
- `postprocess_svg(svg, colors, original_size, processing_info)` → Returns final SVG

## Usage Example

```python
from pipeline import *
import cv2

# Load image
image = cv2.imread('drawing.jpg')

# Run pipeline
processed, mask = preprocess_image(image, use_ai=True)
colors, flattened = create_color_map(processed[:, :, :3], mask, n_colors=5)
regions = segment_by_color(flattened, mask, colors, preserve_style=True)
svg = vectorize_regions(regions, image.shape[1], image.shape[0], preserve_style=True)
final_svg = postprocess_svg(svg, colors, {'width': image.shape[1], 'height': image.shape[0]}, {})
```

## Style Preservation

The pipeline preserves child-like style through:
- **Low smoothing**: `opttolerance: 0.2` (vs 0.4 for clean)
- **Minimal morphology**: Small kernels, single iterations
- **Original colors**: Extracted from image, not generated
- **Imperfect boundaries**: Keeps uneven lines and shapes

## Dependencies

- `opencv-python`: Image processing
- `scikit-learn`: K-means clustering
- `rembg`: AI background removal
- `numpy`: Array operations
- `PIL/Pillow`: Image manipulation
- `potrace`: System binary for vectorization

## Testing

Each stage can be tested independently:

```python
# Test preprocessing
from pipeline.preprocessing import preprocess_image
processed, mask = preprocess_image(test_image)

# Test color extraction
from pipeline.color_cleanup import create_color_map
colors, flattened = create_color_map(processed[:, :, :3], mask)

# etc.
```


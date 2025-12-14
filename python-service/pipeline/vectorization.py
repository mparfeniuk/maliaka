"""
Stage 4: Vectorization
- Vectorize each color region separately using Potrace
- Combine into single SVG with color layers
- Preserve imperfect style
"""

import cv2
import numpy as np
import subprocess
import tempfile
import os
import re
from typing import List
from .segmentation import ColorRegion


def vectorize_mask_to_svg(
    mask: np.ndarray,
    color_hex: str,
    width: int,
    height: int,
    preserve_style: bool = True
) -> str:
    """
    Vectorize a binary mask to SVG path using Potrace.
    
    Args:
        mask: Binary mask (255 = foreground, 0 = background)
        color_hex: Color in hex format (e.g., "#FF0000")
        width: Image width
        height: Image height
        preserve_style: Use low smoothing to preserve imperfections
        
    Returns:
        SVG path string
    """
    tmp_input_path = None
    tmp_output_path = None
    
    try:
        # Invert mask for potrace (potrace traces black areas)
        # Our mask has 255 = foreground, but potrace needs 0 = foreground
        mask_inverted = 255 - mask
        
        # Save mask as BMP (potrace doesn't support PNG on macOS)
        with tempfile.NamedTemporaryFile(suffix='.bmp', delete=False) as tmp_input:
            cv2.imwrite(tmp_input.name, mask_inverted)
            tmp_input_path = tmp_input.name
        
        # Create temporary SVG output file
        with tempfile.NamedTemporaryFile(suffix='.svg', delete=False, mode='w', encoding='utf-8') as tmp_output:
            tmp_output_path = tmp_output.name
        
        # Potrace parameters
        # Low smoothing for style preservation
        opttolerance = '0.2' if preserve_style else '0.4'
        turdsize = '3' if preserve_style else '5'
        
        # Call potrace
        subprocess.run([
            'potrace',
            tmp_input_path,
            '-o', tmp_output_path,
            '-s',  # SVG output
            '--turdsize', turdsize,
            '--alphamax', '1.0',
            '--opttolerance', opttolerance,
            '--color', color_hex,
            '--flat'
        ], check=True, capture_output=True, text=True, timeout=30)
        
        # Read generated SVG
        if not os.path.exists(tmp_output_path):
            return ''
        
        with open(tmp_output_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        return svg_content
        
    except Exception as e:
        print(f"Error vectorizing mask: {e}")
        return ''
    finally:
        # Cleanup
        for path in [tmp_input_path, tmp_output_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except:
                    pass


def extract_paths_from_svg(svg_content: str) -> str:
    """
    Extract path elements from Potrace SVG.
    Removes SVG wrapper, keeps only paths.
    
    Args:
        svg_content: Full SVG content from Potrace
        
    Returns:
        Path elements as string
    """
    if not svg_content:
        return ''
    
    # Extract paths from SVG
    # Potrace generates SVG with paths, we want to extract them
    import re
    
    # Find all path elements (handle both <path/> and <path></path>)
    path_pattern = r'<path[^>]*d="([^"]*)"[^>]*(?:/>|>.*?</path>)'
    matches = re.finditer(path_pattern, svg_content, re.IGNORECASE | re.DOTALL)
    
    paths = []
    for match in matches:
        path_d = match.group(1)
        # Extract fill/stroke attributes if present
        full_match = match.group(0)
        fill_match = re.search(r'fill="([^"]*)"', full_match, re.IGNORECASE)
        stroke_match = re.search(r'stroke="([^"]*)"', full_match, re.IGNORECASE)
        
        attrs = []
        if fill_match:
            attrs.append(f'fill="{fill_match.group(1)}"')
        if stroke_match:
            attrs.append(f'stroke="{stroke_match.group(1)}"')
        if not attrs:
            attrs.append('fill="black"')
        
        paths.append(f'<path {" ".join(attrs)} d="{path_d}"/>')
    
    if not paths:
        return ''
    
    # Return paths as string (will be wrapped in <g> later)
    return '\n'.join(paths)


def vectorize_regions(
    regions: List[ColorRegion],
    image_width: int,
    image_height: int,
    preserve_style: bool = True
) -> str:
    """
    Vectorize all color regions and combine into single SVG.
    
    Args:
        regions: List of ColorRegion objects
        image_width: Original image width
        image_height: Original image height
        preserve_style: Preserve imperfections
        
    Returns:
        Complete SVG string
    """
    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{image_width}" height="{image_height}" viewBox="0 0 {image_width} {image_height}">',
        '<g id="drawing">'
    ]
    
    # Process each color region
    for region in regions:
        color_hex = region.color_info.hex
        
        # Vectorize mask (Potrace will use the color we specify)
        svg_content = vectorize_mask_to_svg(
            region.mask,
            color_hex,
            image_width,
            image_height,
            preserve_style=preserve_style
        )
        
        if svg_content:
            # Extract paths from Potrace SVG
            paths = extract_paths_from_svg(svg_content)
            
            if paths:
                # Wrap in group with color (override any colors from Potrace)
                svg_parts.append(f'<g fill="{color_hex}" stroke="none">')
                # Replace fill colors in paths to ensure correct color
                paths_colored = paths.replace('fill="black"', f'fill="{color_hex}"')
                paths_colored = re.sub(r'fill="[^"]*"', f'fill="{color_hex}"', paths_colored)
                svg_parts.append(paths_colored)
                svg_parts.append('</g>')
    
    svg_parts.append('</g>')
    svg_parts.append('</svg>')
    
    return '\n'.join(svg_parts)


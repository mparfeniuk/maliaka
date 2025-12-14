"""
Stage 5: SVG Post-Processing
- Optimize paths slightly
- Organize layers
- Add metadata
"""

import re
from typing import Dict, List
from .color_cleanup import ColorInfo


def optimize_svg_paths(svg_content: str, reduction_percent: float = 0.15) -> str:
    """
    Slightly optimize SVG paths by reducing points.
    Keeps shape accuracy while reducing file size.
    
    Args:
        svg_content: SVG string
        reduction_percent: Percentage of points to remove (0.0-0.3)
        
    Returns:
        Optimized SVG string
    """
    # For MVP, we'll keep paths as-is to preserve style
    # Future: Implement Douglas-Peucker algorithm for path simplification
    return svg_content


def add_metadata(
    svg_content: str,
    colors: List[ColorInfo],
    original_size: Dict,
    processing_info: Dict
) -> str:
    """
    Add metadata to SVG.
    
    Args:
        svg_content: SVG string
        colors: List of ColorInfo objects
        original_size: Dict with 'width' and 'height'
        processing_info: Dict with processing metadata
        
    Returns:
        SVG with metadata
    """
    # Find SVG opening tag
    svg_pattern = r'(<svg[^>]*>)'
    match = re.search(svg_pattern, svg_content)
    
    if not match:
        return svg_content
    
    svg_tag = match.group(1)
    
    # Create metadata comment
    color_list = ', '.join([c.hex for c in colors])
    metadata = f'''<!--
    Metadata:
    - Colors: {color_list}
    - Color Count: {len(colors)}
    - Original Size: {original_size['width']}x{original_size['height']}
    - Style: {processing_info.get('style', 'authentic')}
    - Processing Time: {processing_info.get('processing_time', 0):.2f}s
-->'''
    
    # Insert metadata after SVG tag
    svg_content = svg_content.replace(svg_tag, svg_tag + '\n' + metadata)
    
    return svg_content


def organize_svg_layers(svg_content: str) -> str:
    """
    Organize SVG into logical layers.
    Currently keeps structure as-is.
    
    Args:
        svg_content: SVG string
        
    Returns:
        Organized SVG string
    """
    # For MVP, keep structure simple
    # Future: Organize by color groups, add layer names
    return svg_content


def postprocess_svg(
    svg_content: str,
    colors: List[ColorInfo],
    original_size: Dict,
    processing_info: Dict
) -> str:
    """
    Complete post-processing pipeline.
    
    Args:
        svg_content: Raw SVG from vectorization
        colors: List of ColorInfo objects
        original_size: Dict with 'width' and 'height'
        processing_info: Dict with processing metadata
        
    Returns:
        Post-processed SVG
    """
    # Optimize paths (minimal for style preservation)
    optimized = optimize_svg_paths(svg_content, reduction_percent=0.1)
    
    # Organize layers
    organized = organize_svg_layers(optimized)
    
    # Add metadata
    final = add_metadata(organized, colors, original_size, processing_info)
    
    return final


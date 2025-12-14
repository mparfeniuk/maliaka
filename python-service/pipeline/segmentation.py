"""
Stage 3: Color-Based Segmentation
- Extract each color region as separate mask
- Preserve imperfect boundaries
- Clean up tiny artifacts only
"""

import cv2
import numpy as np
from typing import List, Tuple, Dict
from .color_cleanup import ColorInfo


class ColorRegion:
    """Represents a color region in the image."""
    def __init__(self, color_info: ColorInfo, mask: np.ndarray):
        self.color_info = color_info
        self.mask = mask
        self.bounds = self._calculate_bounds()
    
    def _calculate_bounds(self) -> Dict:
        """Calculate bounding box of the region."""
        coords = np.where(self.mask > 128)
        if len(coords[0]) == 0:
            return {"x": 0, "y": 0, "width": 0, "height": 0}
        
        y_min, y_max = coords[0].min(), coords[0].max()
        x_min, x_max = coords[1].min(), coords[1].max()
        
        return {
            "x": int(x_min),
            "y": int(y_min),
            "width": int(x_max - x_min + 1),
            "height": int(y_max - y_min + 1)
        }


def extract_color_regions(
    image: np.ndarray,
    mask: np.ndarray,
    color_palette: List[ColorInfo],
    tolerance: int = 10
) -> List[ColorRegion]:
    """
    Extract separate masks for each color region.
    
    Args:
        image: Color-flattened image in BGR format
        mask: Overall drawing mask
        color_palette: List of ColorInfo objects
        tolerance: Color matching tolerance (0-255)
        
    Returns:
        List of ColorRegion objects
    """
    regions = []
    
    # Convert palette colors to BGR
    for color_info in color_palette:
        # RGB to BGR
        target_bgr = np.array([
            color_info.rgb[2],
            color_info.rgb[1],
            color_info.rgb[0]
        ], dtype=np.uint8)
        
        # Create mask for this color
        # Use color matching with tolerance
        lower_bound = np.maximum(target_bgr - tolerance, 0)
        upper_bound = np.minimum(target_bgr + tolerance, 255)
        
        color_mask = cv2.inRange(image, lower_bound, upper_bound)
        
        # Intersect with overall drawing mask
        color_mask = cv2.bitwise_and(color_mask, mask)
        
        # Remove tiny artifacts (preserve style but remove noise)
        # Use small kernel to avoid over-smoothing
        kernel = np.ones((2, 2), np.uint8)
        color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_CLOSE, kernel, iterations=1)
        
        # Only include regions with significant area
        area = np.sum(color_mask > 128)
        if area > 100:  # Minimum 100 pixels
            region = ColorRegion(color_info, color_mask)
            regions.append(region)
    
    # Sort by area (largest first) for better layer ordering
    regions.sort(key=lambda r: np.sum(r.mask > 128), reverse=True)
    
    return regions


def clean_boundaries(mask: np.ndarray, preserve_style: bool = True) -> np.ndarray:
    """
    Clean up boundaries while preserving hand-drawn imperfections.
    
    Args:
        mask: Binary mask
        preserve_style: If True, minimal cleaning (preserve imperfections)
        
    Returns:
        Cleaned mask
    """
    if not preserve_style:
        # More aggressive cleaning
        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    else:
        # Minimal cleaning - only remove tiny artifacts
        kernel = np.ones((2, 2), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    
    return mask


def segment_by_color(
    image: np.ndarray,
    mask: np.ndarray,
    color_palette: List[ColorInfo],
    preserve_style: bool = True
) -> List[ColorRegion]:
    """
    Complete segmentation pipeline.
    
    Args:
        image: Color-flattened image in BGR format
        mask: Overall drawing mask
        color_palette: List of ColorInfo objects
        preserve_style: Preserve imperfections
        
    Returns:
        List of ColorRegion objects
    """
    # Extract color regions
    regions = extract_color_regions(image, mask, color_palette)
    
    # Clean boundaries (minimal if preserving style)
    for region in regions:
        region.mask = clean_boundaries(region.mask, preserve_style=preserve_style)
    
    return regions


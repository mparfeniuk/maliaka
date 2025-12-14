"""
Stage 2: Color Cleanup
- Extract dominant colors using K-means clustering
- Flatten colors into solid regions
- Preserve original color palette
"""

import cv2
import numpy as np
from sklearn.cluster import KMeans
from typing import List, Tuple, Dict
import colorsys


class ColorInfo:
    """Information about a color in the palette."""
    def __init__(self, rgb: Tuple[int, int, int], count: int, percentage: float):
        self.rgb = rgb
        self.count = count
        self.percentage = percentage
        self.hex = f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
    
    def to_dict(self) -> Dict:
        return {
            "rgb": self.rgb,
            "hex": self.hex,
            "percentage": round(self.percentage, 2)
        }


def extract_dominant_colors(
    image: np.ndarray,
    mask: np.ndarray,
    n_colors: int = 5,
    min_color_percentage: float = 2.0
) -> Tuple[List[ColorInfo], np.ndarray]:
    """
    Extract dominant colors from image using K-means clustering.
    
    Args:
        image: Input image in BGR format
        mask: Mask indicating drawing area (255 = drawing, 0 = background)
        n_colors: Number of colors to extract (3-7)
        min_color_percentage: Minimum percentage to include a color
        
    Returns:
        Tuple of (color_info_list, color_mapped_image)
    """
    # Ensure n_colors is in valid range
    n_colors = max(3, min(7, n_colors))
    
    # Extract pixels from drawing area only
    mask_bool = mask > 128  # Convert to boolean mask
    pixels = image[mask_bool]
    
    print(f'📊 Extracting colors: {len(pixels)} pixels in drawing area')
    
    if len(pixels) == 0:
        # No drawing pixels found, return default
        print('⚠️ No drawing pixels found in mask')
        return [], image.copy()
    
    if len(pixels) < n_colors:
        print(f'⚠️ Not enough pixels ({len(pixels)}) for {n_colors} colors, reducing to {len(pixels)}')
        n_colors = max(1, len(pixels))
    
    # Reshape pixels for K-means (flatten to list of BGR values)
    pixels_reshaped = pixels.reshape(-1, 3)
    
    print(f'🎨 Running K-means clustering for {n_colors} colors...')
    
    try:
        # Use K-means clustering in BGR space
        # Note: LAB space would be better perceptually, but BGR is simpler
        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10, max_iter=300)
        kmeans.fit(pixels_reshaped)
        print('✅ K-means clustering completed')
    except Exception as e:
        print(f'🚨 K-means clustering failed: {e}')
        raise
    
    # Get cluster centers (dominant colors)
    colors_bgr = kmeans.cluster_centers_.astype(np.uint8)
    
    # Count pixels per cluster
    labels = kmeans.labels_
    unique, counts = np.unique(labels, return_counts=True)
    
    total_pixels = len(pixels_reshaped)
    
    # Create ColorInfo objects
    color_info_list = []
    for i, color_bgr in enumerate(colors_bgr):
        count = int(counts[i]) if i < len(counts) else 0
        percentage = (count / total_pixels) * 100
        
        # Filter out colors below minimum percentage
        if percentage >= min_color_percentage:
            rgb = (int(color_bgr[2]), int(color_bgr[1]), int(color_bgr[0]))  # BGR to RGB
            color_info = ColorInfo(rgb, count, percentage)
            color_info_list.append(color_info)
    
    # Sort by percentage (most common first)
    color_info_list.sort(key=lambda x: x.percentage, reverse=True)
    
    # Create color-mapped image
    # Map each pixel to nearest cluster center
    color_mapped = np.zeros_like(image)
    
    # For pixels in mask, assign cluster color
    for i in range(len(pixels_reshaped)):
        label = labels[i]
        if label < len(colors_bgr):
            color_mapped[mask_bool][i] = colors_bgr[label]
    
    # Keep background transparent/white
    color_mapped[~mask_bool] = [255, 255, 255]  # White background
    
    return color_info_list, color_mapped


def flatten_colors(
    image: np.ndarray,
    mask: np.ndarray,
    color_palette: List[ColorInfo]
) -> np.ndarray:
    """
    Flatten image colors to palette colors.
    Maps each pixel to nearest palette color.
    
    Args:
        image: Input image in BGR format
        mask: Mask indicating drawing area
        color_palette: List of ColorInfo objects
        
    Returns:
        Color-flattened image
    """
    if not color_palette:
        return image.copy()
    
    # Convert palette colors to BGR numpy array
    palette_bgr = np.array([
        [c.rgb[2], c.rgb[1], c.rgb[0]]  # RGB to BGR
        for c in color_palette
    ], dtype=np.float32)
    
    # Create result image
    result = image.copy()
    
    # Only process pixels in mask
    mask_bool = mask > 128
    pixels = image[mask_bool]
    
    if len(pixels) == 0:
        return result
    
    # Find nearest palette color for each pixel
    pixels_float = pixels.astype(np.float32).reshape(-1, 3)
    
    # Calculate distances to all palette colors
    distances = np.sqrt(((pixels_float[:, np.newaxis, :] - palette_bgr[np.newaxis, :, :]) ** 2).sum(axis=2))
    
    # Find nearest color index
    nearest_indices = np.argmin(distances, axis=1)
    
    # Assign palette colors
    flattened_pixels = palette_bgr[nearest_indices].astype(np.uint8)
    result[mask_bool] = flattened_pixels
    
    return result


def create_color_map(
    image: np.ndarray,
    mask: np.ndarray,
    n_colors: int = 5
) -> Tuple[List[ColorInfo], np.ndarray]:
    """
    Complete color cleanup pipeline.
    
    Args:
        image: Input image in BGR format
        mask: Mask indicating drawing area
        n_colors: Number of colors to extract
        
    Returns:
        Tuple of (color_info_list, color_flattened_image)
    """
    # Extract dominant colors
    color_info_list, color_mapped = extract_dominant_colors(
        image, mask, n_colors=n_colors
    )
    
    # Flatten colors to palette
    flattened = flatten_colors(image, mask, color_info_list)
    
    return color_info_list, flattened


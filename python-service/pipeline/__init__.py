"""
Color-preserving vectorization pipeline.
"""

from .preprocessing import preprocess_image
from .color_cleanup import create_color_map, ColorInfo
from .segmentation import segment_by_color
from .vectorization import vectorize_regions

__all__ = [
    'preprocess_image',
    'create_color_map',
    'ColorInfo',
    'segment_by_color',
    'vectorize_regions'
]


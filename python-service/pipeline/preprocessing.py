"""
Stage 1: AI-Assisted Preprocessing
- Background removal using AI models
- Lighting normalization
- Noise reduction while preserving strokes
"""

import cv2
import numpy as np
from PIL import Image
import io
from typing import Tuple, Optional

try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("Warning: rembg not available, using fallback background removal")


def remove_background_ai(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Remove background using AI model (rembg/U²-Net).
    
    Args:
        image: Input image in BGR format
        
    Returns:
        Tuple of (processed_image_with_alpha, mask)
    """
    if REMBG_AVAILABLE:
        try:
            print('🤖 Using AI background removal (rembg)')
            # Convert BGR to RGB for rembg
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image
            pil_image = Image.fromarray(rgb_image)
            
            # Remove background using AI
            # This may take time on first run (model loading)
            print('⏳ Processing with rembg...')
            output = remove(pil_image)
            print('✅ rembg processing completed')
            
            # Convert back to numpy array
            result = np.array(output)
            
            # Extract alpha channel as mask
            if result.shape[2] == 4:
                mask = result[:, :, 3]
                # Convert RGBA to BGRA for OpenCV
                result_bgra = cv2.cvtColor(result[:, :, :3], cv2.COLOR_RGB2BGR)
                result_bgra = cv2.cvtColor(result_bgra, cv2.COLOR_BGR2BGRA)
                result_bgra[:, :, 3] = mask
                return result_bgra, mask
            else:
                # No alpha channel, create one
                mask = np.ones((result.shape[0], result.shape[1]), dtype=np.uint8) * 255
                result_bgra = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)
                result_bgra = cv2.cvtColor(result_bgra, cv2.COLOR_BGR2BGRA)
                result_bgra[:, :, 3] = mask
                return result_bgra, mask
        except Exception as e:
            print(f'⚠️ AI background removal failed: {e}')
            print('🔄 Falling back to traditional method')
            return remove_background_traditional(image)
    else:
        # Fallback to traditional method
        print('⚠️ rembg not available, using traditional method')
        return remove_background_traditional(image)


def remove_background_traditional(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Fallback background removal using color-based segmentation.
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Use thresholding on L channel (lightness)
    # Assuming white/light background
    _, mask = cv2.threshold(l, 240, 255, cv2.THRESH_BINARY_INV)
    
    # Morphological operations to clean up the mask
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Apply mask
    result = cv2.bitwise_and(image, image, mask=mask)
    
    # Create alpha channel
    result_bgra = cv2.cvtColor(result, cv2.COLOR_BGR2BGRA)
    result_bgra[:, :, 3] = mask
    
    return result_bgra, mask


def normalize_lighting(image: np.ndarray) -> np.ndarray:
    """
    Normalize lighting while preserving colors.
    Uses CLAHE on LAB color space.
    
    Args:
        image: Input image in BGR format
        
    Returns:
        Normalized image in BGR format
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE only to L channel (lightness)
    # This preserves color while normalizing lighting
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_normalized = clahe.apply(l)
    
    # Merge channels back
    lab_normalized = cv2.merge([l_normalized, a, b])
    
    # Convert back to BGR
    result = cv2.cvtColor(lab_normalized, cv2.COLOR_LAB2BGR)
    
    return result


def reduce_noise_preserve_strokes(image: np.ndarray) -> np.ndarray:
    """
    Reduce noise while preserving stroke edges.
    Uses bilateral filter which preserves edges.
    
    Args:
        image: Input image in BGR format
        
    Returns:
        Denoised image
    """
    # Bilateral filter preserves edges while reducing noise
    # Parameters tuned for preserving child-like strokes
    denoised = cv2.bilateralFilter(
        image,
        d=9,              # Diameter of pixel neighborhood
        sigmaColor=75,     # Filter sigma in color space
        sigmaSpace=75      # Filter sigma in coordinate space
    )
    
    return denoised


def preprocess_image(image: np.ndarray, use_ai: bool = True) -> Tuple[np.ndarray, np.ndarray]:
    """
    Complete preprocessing pipeline.
    
    Args:
        image: Input image in BGR format
        use_ai: Whether to use AI background removal
        
    Returns:
        Tuple of (processed_image_with_alpha, mask)
    """
    try:
        # Step 1: Remove background
        if use_ai and REMBG_AVAILABLE:
            processed, mask = remove_background_ai(image)
            # Extract BGR from BGRA
            bgr_image = processed[:, :, :3]
        else:
            print('📐 Using traditional background removal')
            processed, mask = remove_background_traditional(image)
            bgr_image = processed[:, :, :3]
        
        print(f'✅ Background removed, mask size: {mask.shape}')
        
        # Step 2: Normalize lighting
        print('💡 Normalizing lighting...')
        normalized = normalize_lighting(bgr_image)
        
        # Step 3: Reduce noise (preserve strokes)
        print('🔇 Reducing noise...')
        denoised = reduce_noise_preserve_strokes(normalized)
        
        # Combine with original alpha mask
        result_bgra = cv2.cvtColor(denoised, cv2.COLOR_BGR2BGRA)
        result_bgra[:, :, 3] = mask
        
        print('✅ Preprocessing completed')
        return result_bgra, mask
    except Exception as e:
        print(f'🚨 Preprocessing error: {e}')
        import traceback
        traceback.print_exc()
        raise


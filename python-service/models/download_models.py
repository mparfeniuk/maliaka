"""
Download AI models on first startup.
This ensures rembg models are available.
"""

import os
from rembg import remove
from PIL import Image
import numpy as np


def download_models():
    """
    Download rembg models by running a test removal.
    Models will be cached automatically.
    """
    print("Downloading AI models (first time only)...")
    
    try:
        # Create a dummy image to trigger model download
        dummy_image = Image.new('RGB', (100, 100), color='white')
        
        # This will download models if not already cached
        _ = remove(dummy_image)
        
        print("✅ AI models ready")
        return True
    except Exception as e:
        print(f"⚠️  Warning: Could not download models: {e}")
        print("   Falling back to traditional background removal")
        return False


if __name__ == '__main__':
    download_models()


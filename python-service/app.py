import os
import io
import subprocess
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import cv2
import numpy as np
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv('PORT', 8000))
MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 10485760))  # 10MB

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def remove_background(image, threshold=220):
    """
    Remove background using improved color-based segmentation.
    More aggressive background removal for cleaner results.
    """
    # Convert to RGB if needed
    if len(image.shape) == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    
    # Apply Gaussian blur to reduce noise before processing
    blurred = cv2.GaussianBlur(image, (5, 5), 0)
    
    # Convert to LAB color space for better color separation
    lab = cv2.cvtColor(blurred, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Use thresholding on L channel (lightness)
    # Lower threshold (220 instead of 240) to capture more background
    _, mask = cv2.threshold(l, threshold, 255, cv2.THRESH_BINARY_INV)
    
    # Also check for near-white colors in RGB space
    gray = cv2.cvtColor(blurred, cv2.COLOR_BGR2GRAY)
    _, gray_mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY_INV)
    
    # Combine masks
    mask = cv2.bitwise_and(mask, gray_mask)
    
    # More aggressive morphological operations to clean up
    kernel_small = np.ones((3, 3), np.uint8)
    kernel_large = np.ones((5, 5), np.uint8)
    
    # Close small gaps in the drawing
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_large, iterations=2)
    
    # Remove small noise spots
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_small, iterations=2)
    
    # Dilate slightly to include edges
    mask = cv2.dilate(mask, kernel_small, iterations=1)
    
    # Apply mask
    result = cv2.bitwise_and(image, image, mask=mask)
    
    # Create alpha channel
    result = cv2.cvtColor(result, cv2.COLOR_BGR2BGRA)
    result[:, :, 3] = mask
    
    print(f'✅ Background removed (threshold={threshold})')
    return result, mask


def enhance_contrast(image):
    """Enhance contrast while preserving child-like style"""
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    # This preserves local contrast better than global histogram equalization
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    return enhanced


def clean_noise(binary_image, min_artifact_size=100):
    """
    Remove small artifacts and noise from binary image.
    Keeps only connected components larger than min_artifact_size pixels.
    """
    print(f'🧹 Cleaning noise (min_artifact_size={min_artifact_size})')
    
    # Apply median blur to remove salt-and-pepper noise
    cleaned = cv2.medianBlur(binary_image, 3)
    
    # Find connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(cleaned, connectivity=8)
    
    # Create output image
    output = np.zeros_like(cleaned)
    
    # Keep only components larger than min_artifact_size
    kept_count = 0
    removed_count = 0
    for i in range(1, num_labels):  # Skip background (label 0)
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_artifact_size:
            output[labels == i] = 255
            kept_count += 1
        else:
            removed_count += 1
    
    print(f'   Kept {kept_count} components, removed {removed_count} small artifacts')
    
    # Additional morphological cleanup
    kernel = np.ones((3, 3), np.uint8)
    
    # Close small gaps
    output = cv2.morphologyEx(output, cv2.MORPH_CLOSE, kernel, iterations=1)
    
    # Remove tiny remaining noise
    output = cv2.morphologyEx(output, cv2.MORPH_OPEN, kernel, iterations=1)
    
    return output


def convert_to_bw(image, preserve_style=True):
    """Convert to black and white with style preservation"""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Apply slight blur to reduce noise before binarization
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    
    if preserve_style:
        # Use adaptive thresholding to preserve uneven lines
        # Increased block size (15 instead of 11) for better results
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 15, 3
        )
    else:
        # Simple thresholding for cleaner lines
        _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
    
    return binary


def vectorize_with_potrace(binary_image, invert_colors=False, turdsize=15):
    """
    Convert binary image to SVG using Potrace via BMP format.
    
    Args:
        binary_image: Binary image (255 = drawing, 0 = background)
        invert_colors: If True, output white on transparent; if False, black on transparent
        turdsize: Minimum size of features to keep (higher = cleaner, removes more small artifacts)
    """
    # Potrace traces black areas (0) and ignores white (255)
    # Our binary_image has 255 for lines and 0 for background
    # So we need to INVERT it for potrace!
    binary_image = 255 - binary_image
    
    # Get image dimensions
    height, width = binary_image.shape
    print(f'✏️ Vectorizing image: {width}x{height} (turdsize={turdsize}, invert={invert_colors})')
    
    tmp_input_path = None
    tmp_output_path = None
    
    try:
        # Save as BMP format (potrace supports BMP on all platforms!)
        with tempfile.NamedTemporaryFile(suffix='.bmp', delete=False) as tmp_input:
            tmp_input_path = tmp_input.name
        
        # Save binary image as BMP using OpenCV
        success = cv2.imwrite(tmp_input_path, binary_image)
        if not success:
            raise Exception('Failed to write BMP file')
        
        print(f'   Saved BMP: {os.path.getsize(tmp_input_path)} bytes')
        
        # Create temporary SVG output file
        with tempfile.NamedTemporaryFile(suffix='.svg', delete=False, mode='w', encoding='utf-8') as tmp_output:
            tmp_output_path = tmp_output.name
        
        # Choose color based on invert_colors setting
        color = '#FFFFFF' if invert_colors else '#000000'
        print(f'   🎨 Color setting: invert_colors={invert_colors}, using color={color}')
        
        # Call potrace with BMP input
        # Increased turdsize to remove more small artifacts
        cmd = [
            'potrace',
            tmp_input_path,
            '-o', tmp_output_path,
            '-s',  # SVG output
            '--turdsize', str(turdsize),  # Remove small artifacts (bigger = cleaner)
            '--alphamax', '1.0',  # Corner threshold
            '--opttolerance', '0.5',  # Slightly higher tolerance for smoother curves
            '--color', color,  # Color for paths
            '--flat'  # Flatten paths
        ]
        print(f'   Running potrace with color={color}')
        
        result = subprocess.run(
            cmd, 
            check=True, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        
        if result.stderr:
            print(f'   Potrace stderr: {result.stderr}')
        
        # Read generated SVG
        if not os.path.exists(tmp_output_path):
            raise Exception('Potrace did not create output file')
        
        with open(tmp_output_path, 'r', encoding='utf-8') as f:
            svg = f.read()
        
        if not svg or len(svg) < 50:
            raise Exception(f'Generated SVG is too short or empty: {len(svg)} bytes')
        
        # Force replace fill color in SVG (potrace --color doesn't always work)
        if invert_colors:
            # Replace black fills with white
            svg = svg.replace('fill="#000000"', 'fill="#FFFFFF"')
            svg = svg.replace("fill='#000000'", "fill='#FFFFFF'")
            svg = svg.replace('fill="black"', 'fill="#FFFFFF"')
            svg = svg.replace("fill='black'", "fill='#FFFFFF'")
            # Also handle style attribute
            svg = svg.replace('fill:black', 'fill:#FFFFFF')
            svg = svg.replace('fill:#000000', 'fill:#FFFFFF')
            print(f'   🔄 Replaced fill colors to white (#FFFFFF)')
        
        print(f'✅ Generated SVG: {len(svg)} bytes, color: {color}')
        return svg
        
    except subprocess.TimeoutExpired:
        raise Exception('Potrace timeout - image may be too complex')
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else (e.stdout if e.stdout else 'Unknown potrace error')
        print(f'Potrace CalledProcessError: {error_msg}')
        raise Exception(f'Potrace failed: {error_msg}')
    except FileNotFoundError:
        raise Exception('Potrace not found. Please install potrace: brew install potrace')
    except Exception as e:
        print(f'Vectorization error: {str(e)}')
        raise
    finally:
        # Clean up temporary files
        if tmp_input_path and os.path.exists(tmp_input_path):
            try:
                os.unlink(tmp_input_path)
            except:
                pass
        if tmp_output_path and os.path.exists(tmp_output_path):
            try:
                os.unlink(tmp_output_path)
            except:
                pass


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'python-image-processor'
    }), 200


def apply_user_mask_to_binary(binary_image, mask_image, image_size):
    """
    Apply user-drawn mask to binary image AFTER binarization.
    This removes the masked areas from the final binary image without creating edge artifacts.
    
    Args:
        binary_image: Binary image (255 = drawing, 0 = background)
        mask_image: User mask image (RGBA, red areas indicate exclusion)
        image_size: Tuple of (width, height) for resizing mask
    
    Returns:
        Binary image with masked areas set to 0 (removed)
    """
    print('🎭 Applying user mask to binary image...')
    
    # Resize mask to match image dimensions
    mask_resized = mask_image.resize(image_size, Image.Resampling.LANCZOS)
    
    # Convert mask to numpy array
    mask_array = np.array(mask_resized)
    
    # Get alpha channel (areas with alpha > 0 are masked)
    if len(mask_array.shape) == 3 and mask_array.shape[2] >= 4:
        alpha = mask_array[:, :, 3]
    elif len(mask_array.shape) == 3:
        # If no alpha channel, use red channel
        alpha = mask_array[:, :, 0]
    else:
        alpha = mask_array
    
    # Create exclusion mask (areas where alpha > 50 should be excluded)
    # Use threshold to avoid partial transparency issues
    exclusion_mask = (alpha > 50).astype(np.uint8) * 255
    
    # Dilate the exclusion mask slightly to ensure complete removal of edge artifacts
    kernel = np.ones((5, 5), np.uint8)
    exclusion_mask = cv2.dilate(exclusion_mask, kernel, iterations=2)
    
    # Apply mask - set excluded areas to 0 (background) in binary image
    result = binary_image.copy()
    result[exclusion_mask > 0] = 0  # Remove masked areas
    
    # Count excluded pixels
    excluded_pixels = np.sum(exclusion_mask > 0)
    total_pixels = exclusion_mask.shape[0] * exclusion_mask.shape[1]
    excluded_percent = (excluded_pixels / total_pixels) * 100
    
    print(f'   Excluded {excluded_percent:.1f}% of binary image ({excluded_pixels} pixels)')
    
    return result


@app.route('/process', methods=['POST'])
def process_image():
    try:
        print('🎨 Processing request received')
        
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, WebP'
            }), 400
        
        # Check for optional mask file
        mask_file = request.files.get('mask')
        has_mask = mask_file is not None and mask_file.filename != ''
        
        # Parse options from form data
        invert_colors = request.form.get('invertColors', 'false').lower() == 'true'
        min_artifact_size = int(request.form.get('minArtifactSize', '100'))
        preserve_style = request.form.get('preserveStyle', 'true').lower() == 'true'
        turdsize = int(request.form.get('turdsize', '15'))
        
        print(f'⚙️ Options: invertColors={invert_colors}, minArtifactSize={min_artifact_size}, preserveStyle={preserve_style}, turdsize={turdsize}, hasMask={has_mask}')
        
        # Read image
        file_bytes = file.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'error': f'File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB'
            }), 400
        
        print(f'📁 File: {file.filename}, size: {len(file_bytes)} bytes')
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(file_bytes))
        original_size = pil_image.size
        
        # Load mask if provided
        pil_mask = None
        if has_mask:
            mask_bytes = mask_file.read()
            pil_mask = Image.open(io.BytesIO(mask_bytes))
            print(f'🎭 Mask loaded: {pil_mask.size}, mode: {pil_mask.mode}')
            # Convert mask to RGBA if not already
            if pil_mask.mode != 'RGBA':
                pil_mask = pil_mask.convert('RGBA')
        
        # Convert to RGB if needed (handles RGBA, palette images, etc.)
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Resize image if too large (max 1000px on longest side)
        MAX_DIMENSION = 1000
        width, height = pil_image.size
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            if width > height:
                new_width = MAX_DIMENSION
                new_height = int(height * (MAX_DIMENSION / width))
            else:
                new_height = MAX_DIMENSION
                new_width = int(width * (MAX_DIMENSION / height))
            pil_image = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f'📐 Resized: {width}x{height} → {new_width}x{new_height}')
        
        # Convert to OpenCV format (BGR)
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Step 1: Remove background (more aggressive)
        print('🔧 Step 1: Removing background...')
        processed_image, mask = remove_background(cv_image, threshold=220)
        
        # Extract BGR from BGRA if needed
        if len(processed_image.shape) == 4:
            bgr_image = processed_image[:, :, :3]
        else:
            bgr_image = processed_image
        
        # Step 2: Enhance contrast
        print('🔧 Step 2: Enhancing contrast...')
        enhanced = enhance_contrast(bgr_image)
        
        # Step 3: Convert to black and white
        print('🔧 Step 3: Converting to B&W...')
        bw_image = convert_to_bw(enhanced, preserve_style=preserve_style)
        
        # Step 4: Apply user mask AFTER binarization (to avoid edge artifacts)
        if pil_mask:
            print('🔧 Step 4a: Applying user mask...')
            bw_image = apply_user_mask_to_binary(bw_image, pil_mask, pil_image.size)
        
        # Step 5: Clean noise and remove artifacts
        print('🔧 Step 5: Cleaning noise...')
        cleaned_image = clean_noise(bw_image, min_artifact_size=min_artifact_size)
        
        # Step 6: Vectorize
        print('🔧 Step 6: Vectorizing...')
        svg = vectorize_with_potrace(cleaned_image, invert_colors=invert_colors, turdsize=turdsize)
        
        print('✅ Processing completed successfully!')
        
        return jsonify({
            'success': True,
            'svg': svg,
            'originalSize': {
                'width': original_size[0],
                'height': original_size[1]
            },
            'options': {
                'invertColors': invert_colors,
                'minArtifactSize': min_artifact_size,
                'preserveStyle': preserve_style,
                'turdsize': turdsize,
                'maskApplied': has_mask
            }
        }), 200
        
    except Exception as e:
        print(f'🚨 Error processing image: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to process image',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    # Bind to 0.0.0.0 and respect PORT env for container platforms (Render/Fly/Railway)
    app.run(host='0.0.0.0', port=PORT, debug=False)


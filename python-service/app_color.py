"""
Flask application for color-preserving vectorization pipeline.
"""

import os
import io
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import cv2
import numpy as np
from dotenv import load_dotenv

from pipeline import (
    preprocess_image,
    create_color_map,
    segment_by_color,
    vectorize_regions
)
from pipeline.postprocessing import postprocess_svg

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv('PORT', 8000))
MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 10485760))  # 10MB

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'python-image-processor-color',
        'pipeline': 'color-preserving'
    }), 200


@app.route('/process', methods=['POST'])
def process_image():
    """
    Process image through color-preserving vectorization pipeline.
    
    Request body:
    - image: multipart file
    - colorCount: optional, number of colors (3-7, default 5)
    - preserveStyle: optional, preserve imperfections (default true)
    - useAI: optional, use AI background removal (default true)
    """
    start_time = time.time()
    
    try:
        print('🎨 Color processing request received')
        
        if 'image' not in request.files:
            print('❌ No image file in request')
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            print('❌ Empty filename')
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            print(f'❌ Invalid file type: {file.filename}')
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, WebP'
            }), 400
        
        # Read image
        print(f'📁 Reading file: {file.filename}')
        file_bytes = file.read()
        print(f'📊 File size: {len(file_bytes)} bytes')
        
        if len(file_bytes) > MAX_FILE_SIZE:
            print(f'❌ File too large: {len(file_bytes)} bytes')
            return jsonify({
                'success': False,
                'error': f'File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB'
            }), 400
        
        # Parse options
        color_count = int(request.form.get('colorCount', 5))
        color_count = max(3, min(7, color_count))  # Clamp to 3-7
        
        preserve_style = request.form.get('preserveStyle', 'true').lower() == 'true'
        use_ai = request.form.get('useAI', 'true').lower() == 'true'
        
        print(f'⚙️ Options: colorCount={color_count}, preserveStyle={preserve_style}, useAI={use_ai}')
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(file_bytes))
        original_size = pil_image.size
        
        # Resize if too large (max 1500px on longest side for color processing)
        MAX_DIMENSION = 1500
        width, height = pil_image.size
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            if width > height:
                new_width = MAX_DIMENSION
                new_height = int(height * (MAX_DIMENSION / width))
            else:
                new_height = MAX_DIMENSION
                new_width = int(width * (MAX_DIMENSION / height))
            pil_image = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f'Resized image from {width}x{height} to {new_width}x{new_height}')
        
        # Convert to OpenCV format (BGR)
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        processed_width, processed_height = cv_image.shape[1], cv_image.shape[0]
        
        # ===== PIPELINE STAGE 1: Preprocessing =====
        print('🔧 Stage 1: Preprocessing...')
        stage1_start = time.time()
        processed_image, mask = preprocess_image(cv_image, use_ai=use_ai)
        print(f'✅ Stage 1 completed in {time.time() - stage1_start:.2f}s')
        
        # Extract BGR from BGRA
        bgr_image = processed_image[:, :, :3]
        
        # ===== PIPELINE STAGE 2: Color Cleanup =====
        print(f'🎨 Stage 2: Color cleanup (extracting {color_count} colors)...')
        stage2_start = time.time()
        color_palette, color_flattened = create_color_map(
            bgr_image,
            mask,
            n_colors=color_count
        )
        print(f'✅ Stage 2 completed in {time.time() - stage2_start:.2f}s, found {len(color_palette)} colors')
        
        if not color_palette:
            print('❌ No colors extracted')
            return jsonify({
                'success': False,
                'error': 'Failed to extract colors from image'
            }), 500
        
        # ===== PIPELINE STAGE 3: Segmentation =====
        print('✂️ Stage 3: Color-based segmentation...')
        stage3_start = time.time()
        color_regions = segment_by_color(
            color_flattened,
            mask,
            color_palette,
            preserve_style=preserve_style
        )
        print(f'✅ Stage 3 completed in {time.time() - stage3_start:.2f}s, found {len(color_regions)} regions')
        
        if not color_regions:
            print('❌ No color regions found')
            return jsonify({
                'success': False,
                'error': 'Failed to segment image into color regions'
            }), 500
        
        # ===== PIPELINE STAGE 4: Vectorization =====
        print('✏️ Stage 4: Vectorization...')
        stage4_start = time.time()
        svg_content = vectorize_regions(
            color_regions,
            processed_width,
            processed_height,
            preserve_style=preserve_style
        )
        print(f'✅ Stage 4 completed in {time.time() - stage4_start:.2f}s, SVG size: {len(svg_content)} bytes')
        
        if not svg_content or len(svg_content) < 100:
            print(f'❌ Invalid SVG: length={len(svg_content) if svg_content else 0}')
            return jsonify({
                'success': False,
                'error': 'Vectorization failed or produced empty result'
            }), 500
        
        # ===== PIPELINE STAGE 5: Post-Processing =====
        print('📦 Stage 5: Post-processing...')
        stage5_start = time.time()
        processing_time = time.time() - start_time
        
        final_svg = postprocess_svg(
            svg_content,
            color_palette,
            {'width': original_size[0], 'height': original_size[1]},
            {
                'style': 'authentic' if preserve_style else 'clean',
                'processing_time': processing_time
            }
        )
        print(f'✅ Stage 5 completed in {time.time() - stage5_start:.2f}s')
        
        # Prepare response
        colors_data = [c.to_dict() for c in color_palette]
        
        print(f'✨ Processing completed successfully in {processing_time:.2f}s')
        print(f'📊 Result: {len(colors_data)} colors, {len(color_regions)} regions, SVG: {len(final_svg)} bytes')
        
        return jsonify({
            'success': True,
            'svg': final_svg,
            'colors': colors_data,
            'originalSize': {
                'width': original_size[0],
                'height': original_size[1]
            },
            'processedSize': {
                'width': processed_width,
                'height': processed_height
            },
            'processingTime': round(processing_time, 2),
            'metadata': {
                'colorCount': len(color_palette),
                'regionCount': len(color_regions),
                'style': 'authentic' if preserve_style else 'clean'
            }
        }), 200
        
    except Exception as e:
        print(f'🚨 Error processing image: {str(e)}')
        import traceback
        print('Full traceback:')
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to process image',
            'message': str(e)
        }), 500


@app.route('/process/variants', methods=['POST'])
def process_variants():
    """
    Process image and generate multiple variants:
    - original: Original colors
    - monochrome: Black and white
    - pastel: Pastel version (optional)
    """
    # For MVP, return single variant
    # Future: Implement variant generation
    return jsonify({
        'success': False,
        'error': 'Variants endpoint not yet implemented'
    }), 501


if __name__ == '__main__':
    print('🎨 Color-preserving vectorization service starting...')
    print('📦 Pipeline stages: Preprocessing → Color Cleanup → Segmentation → Vectorization → Post-processing')
    # Run without debug mode for stability (debug=True causes issues with concurrent requests)
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)


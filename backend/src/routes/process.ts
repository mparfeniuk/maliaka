import { Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept various JPEG MIME types (browsers can send different ones)
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/pjpeg',  // Progressive JPEG
      'image/x-jpeg', // Alternative JPEG type
      'image/png',
      'image/x-png',  // Alternative PNG type
      'image/webp',
      'image/x-webp',  // Alternative WebP type
      'application/octet-stream'  // Some browsers send this for images
    ];
    
    // Also check file extension as fallback (primary check)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileName = file.originalname.toLowerCase();
    const fileExt = fileName.includes('.') 
      ? fileName.substring(fileName.lastIndexOf('.'))
      : '';
    
    console.log('🔍 File upload check:', {
      mimetype: file.mimetype,
      originalname: file.originalname,
      extension: fileExt,
      filename: fileName,
      fieldname: file.fieldname
    });
    
    // Check MIME type OR extension (extension takes priority if MIME is ambiguous)
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExt = fileExt && allowedExtensions.includes(fileExt);
    
    // Accept if extension is valid, even if MIME type is unknown/octet-stream
    if (isValidExt || isValidMime) {
      console.log('✅ File accepted:', { mimetype: file.mimetype, extension: fileExt });
      cb(null, true);
    } else {
      console.error('❌ File rejected:', { 
        mimetype: file.mimetype, 
        extension: fileExt, 
        filename: file.originalname,
        allowedMimes,
        allowedExtensions
      });
      cb(new Error(`Invalid file type: ${file.mimetype || 'unknown'}. Please use JPEG, PNG, or WebP.`));
    }
  }
});

// Multer error handler - must be separate middleware
const handleMulterError = (err: any, req: Request, res: Response, next: any) => {
  if (err) {
    console.error('🚨 Multer error:', {
      code: err.code,
      message: err.message,
      field: err.field,
      name: err.name
    });
    
    // Multer errors are passed here
    if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Please use'))) {
      return res.status(400).json({
        success: false,
        error: err.message,
        message: 'Please upload a JPEG, PNG, or WebP image file'
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Maximum file size is 10MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
        message: 'Please use "image" as the field name'
      });
    }
    // Pass other errors to Express error handler
    return next(err);
  }
  next();
};

// Configure multer for multiple fields (image + optional mask)
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]);

export const processImage = [
  uploadFields,
  // Error handler for multer (must be right after upload middleware)
  (err: any, req: Request, res: Response, next: any) => {
    if (err) {
      console.error('🚨 Multer error in route:', {
        code: err.code,
        message: err.message,
        field: err.field,
        name: err.name
      });
      
      if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Please use'))) {
        return res.status(400).json({
          success: false,
          error: err.message,
          message: 'Please upload a JPEG, PNG, or WebP image file'
        });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: 'Maximum file size is 10MB'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          message: 'Please use "image" and optionally "mask" as field names'
        });
      }
      return next(err);
    }
    next();
  },
  (req: Request, res: Response, next: any) => {
    // Check if image file was uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const imageFile = files?.['image']?.[0];
    
    if (!imageFile) {
      console.error('❌ No image file in request:', {
        body: req.body,
        files: files,
        headers: req.headers,
        contentType: req.headers['content-type']
      });
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
        message: 'Please upload an image file'
      });
    }
    
    const maskFile = files?.['mask']?.[0];
    
    console.log('✅ Files received:', {
      image: {
        originalname: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size
      },
      mask: maskFile ? {
        originalname: maskFile.originalname,
        mimetype: maskFile.mimetype,
        size: maskFile.size
      } : 'none'
    });
    next();
  },
  async (req: Request, res: Response, next: any) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFile = files['image'][0];
      const maskFile = files['mask']?.[0];
      
      console.log('Processing file:', {
        originalname: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size,
        hasMask: !!maskFile
      });

      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      const startTime = Date.now();

      // Prepare form data for Python service
      const formData = new FormData();
      formData.append('image', imageFile.buffer, {
        filename: imageFile.originalname || 'image.jpg',
        contentType: imageFile.mimetype
      });
      
      // Add mask if provided
      if (maskFile) {
        formData.append('mask', maskFile.buffer, {
          filename: maskFile.originalname || 'mask.png',
          contentType: maskFile.mimetype
        });
        console.log('🎭 Mask included in request');
      }
      
      // Add processing options from body (always send them, even if false)
      console.log('📦 Processing options from request body:', {
        invertColors: req.body.invertColors,
        minArtifactSize: req.body.minArtifactSize,
        preserveStyle: req.body.preserveStyle,
        turdsize: req.body.turdsize
      });
      
      // Always append options (they're strings, not booleans)
      formData.append('invertColors', req.body.invertColors || 'false');
      formData.append('minArtifactSize', req.body.minArtifactSize || '20');
      formData.append('preserveStyle', req.body.preserveStyle || 'true');
      formData.append('turdsize', req.body.turdsize || '5');

      // Send to Python service
      console.log(`Sending request to Python service: ${pythonServiceUrl}/process`);
      const response = await axios.post(
        `${pythonServiceUrl}/process`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      console.log('Python service response:', {
        status: response.status,
        hasData: !!response.data,
        success: response.data?.success,
        hasSvg: !!response.data?.svg,
        svgLength: response.data?.svg?.length
      });

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      if (response.data && response.data.success && response.data.svg) {
        res.json({
          success: true,
          svg: response.data.svg,
          originalSize: response.data.originalSize,
          processingTime: parseFloat(processingTime)
        });
      } else {
        console.error('Python service returned invalid response:', response.data);
        throw new Error('Python service returned unsuccessful response');
      }
    } catch (error) {
      console.error('Image processing error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          return res.status(503).json({
            success: false,
            error: 'Image processing service unavailable',
            message: 'Please ensure the Python service is running'
          });
        }
        
        if (error.response) {
          return res.status(error.response.status).json({
            success: false,
            error: error.response.data?.error || 'Processing failed',
            message: error.response.data?.message
          });
        }
      }
      
      // Pass error to Express error handler
      next(error);
    }
  },
  // Error handler for this route
  (err: any, req: Request, res: Response, next: any) => {
    console.error('🚨 Route error handler:', err);
    
    // Handle multer errors
    if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Please use'))) {
      return res.status(400).json({
        success: false,
        error: err.message,
        message: 'Please upload a JPEG, PNG, or WebP image file'
      });
    }
    
    // Pass to global error handler
    next(err);
  }
];


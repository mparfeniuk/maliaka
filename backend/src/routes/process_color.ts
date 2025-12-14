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
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/pjpeg',
      'image/x-jpeg',
      'image/png',
      'image/x-png',
      'image/webp',
      'image/x-webp'
    ];
    
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Please use JPEG, PNG, or WebP.`));
    }
  }
});

// Error handler for multer
const multerErrorHandler = (err: any, req: Request, res: Response, next: any) => {
  if (err) {
    return next(err);
  }
  next();
};

export interface ColorInfo {
  rgb: [number, number, number];
  hex: string;
  percentage: number;
}

export interface ProcessColorResult {
  success: boolean;
  svg: string;
  colors: ColorInfo[];
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  processingTime: number;
  metadata: {
    colorCount: number;
    regionCount: number;
    style: string;
  };
}

// Configure multer for multiple fields (image + optional mask)
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]);

export const processImageColor = [
  uploadFields,
  multerErrorHandler,
  async (req: Request, res: Response, next: any) => {
    try {
      console.log('🎨 Color processing request received');
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const imageFile = files?.['image']?.[0];
      const maskFile = files?.['mask']?.[0];
      
      if (!imageFile) {
        console.error('❌ No image file in request');
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }
      
      console.log('📁 File info:', {
        originalname: imageFile.originalname,
        mimetype: imageFile.mimetype,
        size: imageFile.size,
        hasMask: !!maskFile
      });
      
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
      const startTime = Date.now();
      
      // Parse options
      const colorCount = req.body.colorCount ? parseInt(req.body.colorCount) : 5;
      const preserveStyle = req.body.preserveStyle !== 'false';
      const useAI = req.body.useAI !== 'false';
      const invertColors = req.body.invertColors === 'true';
      const minArtifactSize = req.body.minArtifactSize || '20';
      const turdsize = req.body.turdsize || '5';
      
      console.log('⚙️ Processing options:', { colorCount, preserveStyle, useAI, invertColors, minArtifactSize, turdsize, hasMask: !!maskFile });
      
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
        console.log('🎭 Mask included in color request');
      }
      
      formData.append('colorCount', colorCount.toString());
      formData.append('preserveStyle', preserveStyle.toString());
      formData.append('useAI', useAI.toString());
      formData.append('invertColors', invertColors.toString());
      formData.append('minArtifactSize', minArtifactSize);
      formData.append('turdsize', turdsize);
      
      console.log(`📤 Sending request to Python service: ${pythonServiceUrl}/process`);
      
      // Send to Python service
      const response = await axios.post<ProcessColorResult>(
        `${pythonServiceUrl}/process`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 120000, // 120 seconds timeout (color processing takes longer)
        }
      );
      
      console.log('✅ Python service response:', {
        status: response.status,
        success: response.data?.success,
        hasSvg: !!response.data?.svg,
        svgLength: response.data?.svg?.length,
        colorsCount: response.data?.colors?.length
      });
      
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (response.data.success && response.data.svg) {
        console.log(`✨ Processing completed in ${processingTime}s`);
        res.json({
          ...response.data,
          processingTime: parseFloat(processingTime)
        });
      } else {
        console.error('❌ Python service returned unsuccessful response:', response.data);
        throw new Error('Python service returned unsuccessful response');
      }
    } catch (error) {
      console.error('🚨 Image processing error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          code: error.code,
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        if (error.code === 'ECONNREFUSED') {
          return res.status(503).json({
            success: false,
            error: 'Image processing service unavailable',
            message: 'Please ensure the Python service is running'
          });
        }
        
        if (error.code === 'ECONNABORTED') {
          return res.status(504).json({
            success: false,
            error: 'Processing timeout',
            message: 'Image processing took too long. Please try with a smaller image.'
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
    next(err);
  }
];


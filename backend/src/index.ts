import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { processImage } from './routes/process';
import { processImageColor } from './routes/process_color';
import { healthCheck } from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.post('/api/process', processImage);  // Legacy B&W pipeline
app.post('/api/process/color', processImageColor);  // New color-preserving pipeline
app.get('/api/health', healthCheck);

// Error handling middleware (must be after routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error middleware:', err);
  console.error('Error stack:', err.stack);
  
  // Handle multer fileFilter errors
  if (err instanceof Error && err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Invalid file type',
      message: 'Please use JPEG, PNG, or WebP format'
    });
  }
  
  // Handle multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large',
      message: 'Maximum file size is 10MB'
    });
  }
  
  // Handle multer field errors
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field',
      message: 'Please use "image" as the field name'
    });
  }
  
  // Default error handler
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Python service URL: ${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}`);
});


import { Request, Response } from 'express';
import axios from 'axios';

export const healthCheck = async (req: Request, res: Response) => {
  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    
    // Check Python service health
    let pythonServiceHealthy = false;
    try {
      const response = await axios.get(`${pythonServiceUrl}/health`, { timeout: 2000 });
      pythonServiceHealthy = response.status === 200;
    } catch (error) {
      console.warn('Python service health check failed:', error);
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'ok',
        pythonService: pythonServiceHealthy ? 'ok' : 'unavailable'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


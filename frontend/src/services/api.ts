import axios from 'axios';

// Configuration from environment variables
// Empty string = use relative URLs (works with Vite proxy and production)
const API_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_USE_AI = import.meta.env.VITE_USE_AI !== 'false';
const DEFAULT_COLOR_COUNT = parseInt(import.meta.env.VITE_COLOR_COUNT || '5', 10);
const DEFAULT_PRESERVE_STYLE = import.meta.env.VITE_PRESERVE_STYLE !== 'false';
const USE_COLOR_PIPELINE = import.meta.env.VITE_USE_COLOR_PIPELINE !== 'false';
const DEFAULT_INVERT_COLORS = import.meta.env.VITE_INVERT_COLORS === 'true';
const DEFAULT_MIN_ARTIFACT_SIZE = parseInt(import.meta.env.VITE_MIN_ARTIFACT_SIZE || '100', 10);

// Log configuration for debugging
console.log('🔧 API Configuration:', {
  API_URL,
  DEFAULT_USE_AI,
  DEFAULT_COLOR_COUNT,
  DEFAULT_PRESERVE_STYLE,
  USE_COLOR_PIPELINE,
  DEFAULT_INVERT_COLORS,
  DEFAULT_MIN_ARTIFACT_SIZE
});

export interface ColorInfo {
  rgb: [number, number, number];
  hex: string;
  percentage: number;
}

export interface ProcessResult {
  success: boolean;
  svg: string;
  colors?: ColorInfo[];
  originalSize: {
    width: number;
    height: number;
  };
  processedSize?: {
    width: number;
    height: number;
  };
  processingTime: number;
  metadata?: {
    colorCount: number;
    regionCount: number;
    style: string;
  };
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
}

export interface ProcessOptions {
  colorCount?: number;  // 3-7 colors
  preserveStyle?: boolean;
  useAI?: boolean;
  useColorPipeline?: boolean;
  invertColors?: boolean;  // true = white on transparent, false = black on transparent
  minArtifactSize?: number;  // minimum size of objects to keep (in pixels)
  turdsize?: number;  // potrace parameter for removing small artifacts
  maskDataUrl?: string | null;  // data URL of mask image (areas to exclude from vectorization)
}

export async function processImage(
  file: File, 
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const formData = new FormData();
  formData.append('image', file);
  
  // Use defaults from env, allow override from options
  const useAI = options.useAI ?? DEFAULT_USE_AI;
  const colorCount = options.colorCount ?? DEFAULT_COLOR_COUNT;
  const preserveStyle = options.preserveStyle ?? DEFAULT_PRESERVE_STYLE;
  const useColorPipeline = options.useColorPipeline ?? USE_COLOR_PIPELINE;
  const invertColors = options.invertColors ?? DEFAULT_INVERT_COLORS;
  const minArtifactSize = options.minArtifactSize ?? DEFAULT_MIN_ARTIFACT_SIZE;
  const turdsize = options.turdsize ?? 15;
  const maskDataUrl = options.maskDataUrl ?? null;
  
  // Add options for processing
  formData.append('colorCount', colorCount.toString());
  formData.append('preserveStyle', preserveStyle.toString());
  formData.append('useAI', useAI.toString());
  formData.append('invertColors', invertColors.toString());
  formData.append('minArtifactSize', minArtifactSize.toString());
  formData.append('turdsize', turdsize.toString());
  
  // Add mask data if provided
  if (maskDataUrl) {
    // Convert data URL to blob and append as file
    const maskBlob = await dataUrlToBlob(maskDataUrl);
    formData.append('mask', maskBlob, 'mask.png');
    console.log('🎭 Mask included, size:', maskBlob.size, 'bytes');
  }
  
  // Select endpoint based on pipeline type
  const endpoint = useColorPipeline ? '/api/process/color' : '/api/process';
  
  console.log('📤 Processing image with options:', {
    useAI,
    colorCount,
    preserveStyle,
    useColorPipeline,
    invertColors,
    minArtifactSize,
    turdsize,
    hasMask: !!maskDataUrl,
    endpoint
  });

  try {
    const response = await axios.post<ProcessResult | ApiError>(
      `${API_URL}${endpoint}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 120 seconds (color processing takes longer)
      }
    );

    if (!response.data.success) {
      const error = response.data as ApiError;
      throw new Error(error.message || error.error || 'Processing failed');
    }

    console.log('✅ Processing completed successfully');
    return response.data as ProcessResult;
  } catch (error) {
    console.error('❌ Processing error:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try with a smaller image.');
      }
      if (error.response) {
        const errorData = error.response.data as ApiError;
        throw new Error(errorData.message || errorData.error || 'Processing failed');
      }
      if (error.request) {
        throw new Error('No response from server. Please try again.');
      }
    }
    throw error;
  }
}

// Helper function to convert data URL to Blob
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}


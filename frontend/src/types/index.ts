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


import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  IconButton,
  Slider,
  Stack,
  Switch,
  FormControlLabel,
  Collapse,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Divider,
} from '@mui/material';
import BrushIcon from '@mui/icons-material/Brush';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';

export interface ProcessingSettings {
  minArtifactSize: number;
  turdsize: number;
  preserveStyle: boolean;
  invertColors: boolean;
}

interface MaskEditorProps {
  imageFile: File;
  onProcess: (imageFile: File, maskDataUrl: string | null, settings: ProcessingSettings) => void;
  onCancel: () => void;
}

type Tool = 'brush' | 'eraser';

export default function MaskEditor({ imageFile, onProcess, onCancel }: MaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Processing settings
  const [minArtifactSize, setMinArtifactSize] = useState(20);
  const [turdsize, setTurdsize] = useState(5);
  const [preserveStyle, setPreserveStyle] = useState(true);
  const [invertColors, setInvertColors] = useState(false);
  
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = url;
    
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Setup canvases when image is loaded
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !maskCanvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const maxWidth = container.clientWidth - 16;
    const maxHeight = 400;
    
    const scaleX = maxWidth / imageSize.width;
    const scaleY = maxHeight / imageSize.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    const displayWidth = Math.floor(imageSize.width * scale);
    const displayHeight = Math.floor(imageSize.height * scale);
    
    setCanvasSize({ width: displayWidth, height: displayHeight });
    
    const canvas = canvasRef.current;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    const maskCanvas = maskCanvasRef.current;
    maskCanvas.width = displayWidth;
    maskCanvas.height = displayHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx && imageSrc) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = imageSrc;
    }
    
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.clearRect(0, 0, displayWidth, displayHeight);
      saveToHistory();
    }
  }, [imageLoaded, imageSize, imageSrc]);

  const saveToHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    saveToHistory();
  }, [saveToHistory]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const draw = useCallback((x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    
    if (tool === 'brush') {
      ctx.fillStyle = 'rgba(244, 67, 54, 0.5)';
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [tool, brushSize]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    draw(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getTouchPos(e);
    draw(pos.x, pos.y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getTouchPos(e);
    draw(pos.x, pos.y);
  };

  const handleTouchEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const getSettings = (): ProcessingSettings => ({
    minArtifactSize,
    turdsize,
    preserveStyle,
    invertColors,
  });

  const handleProcess = () => {
    const maskCanvas = maskCanvasRef.current;
    
    let hasMask = false;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] > 0) {
            hasMask = true;
            break;
          }
        }
      }
    }
    
    const maskDataUrl = hasMask && maskCanvas ? maskCanvas.toDataURL('image/png') : null;
    onProcess(imageFile, maskDataUrl, getSettings());
  };

  if (!imageLoaded) {
    return (
      <Card elevation={0} sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 4 }}>
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            🎨 Редактор
          </Typography>
          <IconButton onClick={onCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Замалюйте області, які НЕ потрібно векторизувати
        </Typography>

        {/* Toolbar */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            {/* Tools */}
            <ToggleButtonGroup
              value={tool}
              exclusive
              onChange={(_, newTool) => newTool && setTool(newTool)}
              size="small"
            >
              <ToggleButton value="brush">
                <Tooltip title="Пензель">
                  <BrushIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="eraser">
                <Tooltip title="Ластик">
                  <AutoFixHighIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem />

            {/* History */}
            <IconButton onClick={undo} disabled={historyIndex <= 0} size="small">
              <UndoIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={redo} disabled={historyIndex >= history.length - 1} size="small">
              <RedoIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={clearMask} size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>

            <Divider orientation="vertical" flexItem />

            {/* Visibility */}
            <IconButton onClick={() => setShowMask(!showMask)} size="small">
              {showMask ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
            </IconButton>
          </Stack>

          {/* Brush size */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
              Розмір: {brushSize}
            </Typography>
            <Slider
              value={brushSize}
              onChange={(_, value) => setBrushSize(value as number)}
              min={5}
              max={100}
              size="small"
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>

        {/* Canvas area */}
        <Box 
          ref={containerRef}
          sx={{
            position: 'relative',
            bgcolor: 'grey.200',
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 250,
            mb: 2,
          }}
        >
          <Box sx={{ position: 'relative', width: canvasSize.width, height: canvasSize.height }}>
            <canvas
              ref={canvasRef}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasSize.width, 
                height: canvasSize.height,
              }}
            />
            <canvas
              ref={maskCanvasRef}
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasSize.width, 
                height: canvasSize.height,
                opacity: showMask ? 1 : 0,
                touchAction: 'none',
                cursor: 'crosshair',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </Box>
        </Box>

        {/* Settings */}
        <Button
          startIcon={<SettingsIcon />}
          onClick={() => setShowSettings(!showSettings)}
          size="small"
          sx={{ mb: 2 }}
        >
          Налаштування
        </Button>

        <Collapse in={showSettings}>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3, mb: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Мін. розмір об'єктів: {minArtifactSize}px
                </Typography>
                <Slider
                  value={minArtifactSize}
                  onChange={(_, v) => setMinArtifactSize(v as number)}
                  min={5}
                  max={500}
                  size="small"
                />
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Згладжування: {turdsize}
                </Typography>
                <Slider
                  value={turdsize}
                  onChange={(_, v) => setTurdsize(v as number)}
                  min={1}
                  max={50}
                  size="small"
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch 
                    checked={preserveStyle} 
                    onChange={(e) => setPreserveStyle(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Зберегти стиль</Typography>}
              />

              <FormControlLabel
                control={
                  <Switch 
                    checked={invertColors} 
                    onChange={(e) => setInvertColors(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Білий вектор</Typography>}
              />

              {/* Presets */}
              <Stack direction="row" spacing={1}>
                <Chip 
                  label="Деталізовано" 
                  size="small" 
                  onClick={() => { setMinArtifactSize(20); setTurdsize(5); }}
                  color={minArtifactSize === 20 && turdsize === 5 ? 'primary' : 'default'}
                />
                <Chip 
                  label="Чисто" 
                  size="small" 
                  onClick={() => { setMinArtifactSize(300); setTurdsize(30); }}
                  color={minArtifactSize === 300 && turdsize === 30 ? 'primary' : 'default'}
                />
              </Stack>
            </Stack>
          </Box>
        </Collapse>

        {/* Action buttons */}
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<PlayArrowIcon />}
            onClick={handleProcess}
            sx={{ py: 1.5 }}
          >
            Обробити
          </Button>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={() => onProcess(imageFile, null, getSettings())}
          >
            Обробити без маски
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';

interface SVGEditorProps {
  svg: string;
  onSvgChange: (newSvg: string) => void;
  onClose: () => void;
}

interface SubpathInfo {
  id: string;
  d: string;
  fill: string;
  parentPathIndex: number;
}

// Split a path's d attribute into individual subpaths
function splitPathIntoSubpaths(d: string): string[] {
  if (!d || d.trim().length === 0) return [];
  
  const subpaths: string[] = [];
  const normalized = d.trim().replace(/\s+/g, ' ');
  
  let currentStart = 0;
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if ((char === 'M' || char === 'm') && i > 0) {
      const subpath = normalized.substring(currentStart, i).trim();
      if (subpath.length > 0) {
        subpaths.push(subpath);
      }
      currentStart = i;
    }
  }
  
  const lastSubpath = normalized.substring(currentStart).trim();
  if (lastSubpath.length > 0) {
    subpaths.push(lastSubpath);
  }
  
  return subpaths;
}

function combineSubpaths(subpaths: string[]): string {
  return subpaths.join(' ');
}

export default function SVGEditor({ svg, onSvgChange, onClose }: SVGEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [subpaths, setSubpaths] = useState<SubpathInfo[]>([]);
  const [selectedSubpaths, setSelectedSubpaths] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>([svg]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [hoveredSubpath, setHoveredSubpath] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState<string>('0 0 100 100');

  // Parse SVG and extract subpaths
  useEffect(() => {
    const currentSvg = history[historyIndex];
    
    // Extract viewBox or width/height
    const viewBoxMatch = currentSvg.match(/viewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
      setViewBox(viewBoxMatch[1]);
    } else {
      const widthMatch = currentSvg.match(/width=["']([^"']+)["']/i);
      const heightMatch = currentSvg.match(/height=["']([^"']+)["']/i);
      if (widthMatch && heightMatch) {
        const w = parseFloat(widthMatch[1]) || 100;
        const h = parseFloat(heightMatch[1]) || 100;
        setViewBox(`0 0 ${w} ${h}`);
      }
    }
    
    // Extract all path elements
    const pathRegex = /<path[^>]*\/?>/gi;
    const pathMatches = currentSvg.match(pathRegex) || [];
    
    const allSubpaths: SubpathInfo[] = [];
    
    pathMatches.forEach((pathElement, pathIndex) => {
      const dMatch = pathElement.match(/d=["']([^"']+)["']/);
      const fillMatch = pathElement.match(/fill=["']([^"']+)["']/);
      
      if (dMatch) {
        const fullD = dMatch[1];
        const fill = fillMatch ? fillMatch[1] : '#000000';
        
        const subpathStrings = splitPathIntoSubpaths(fullD);
        
        subpathStrings.forEach((subpathD, subIndex) => {
          allSubpaths.push({
            id: `path-${pathIndex}-sub-${subIndex}`,
            d: subpathD,
            fill,
            parentPathIndex: pathIndex,
          });
        });
      }
    });
    
    setSubpaths(allSubpaths);
    setSelectedSubpaths(new Set());
  }, [history, historyIndex]);

  const toggleSelection = useCallback((id: string, multiSelect: boolean) => {
    setSelectedSubpaths(prev => {
      const next = new Set(prev);
      if (multiSelect) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      } else {
        if (next.has(id) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSubpaths(new Set(subpaths.map(s => s.id)));
  }, [subpaths]);

  const invertSelection = useCallback(() => {
    setSelectedSubpaths(prev => {
      const next = new Set<string>();
      subpaths.forEach(s => {
        if (!prev.has(s.id)) {
          next.add(s.id);
        }
      });
      return next;
    });
  }, [subpaths]);

  const clearSelection = useCallback(() => {
    setSelectedSubpaths(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedSubpaths.size === 0) return;
    
    const remainingSubpaths = subpaths.filter(s => !selectedSubpaths.has(s.id));
    
    // Group by parent path
    const pathGroups = new Map<number, string[]>();
    remainingSubpaths.forEach(s => {
      if (!pathGroups.has(s.parentPathIndex)) {
        pathGroups.set(s.parentPathIndex, []);
      }
      pathGroups.get(s.parentPathIndex)!.push(s.d);
    });
    
    // Reconstruct SVG
    let newSvg = history[historyIndex];
    const pathRegex = /<path[^>]*\/?>/gi;
    const pathMatches = newSvg.match(pathRegex) || [];
    
    pathMatches.forEach((pathElement, pathIndex) => {
      const remainingDs = pathGroups.get(pathIndex);
      
      if (!remainingDs || remainingDs.length === 0) {
        newSvg = newSvg.replace(pathElement, '');
      } else {
        const newD = combineSubpaths(remainingDs);
        const newPathElement = pathElement.replace(/d=["'][^"']*["']/, `d="${newD}"`);
        newSvg = newSvg.replace(pathElement, newPathElement);
      }
    });
    
    // Clean up
    newSvg = newSvg.replace(/>\s+</g, '><').replace(/\n\s*\n/g, '\n');
    
    // Save to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSvg);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setSelectedSubpaths(new Set());
  }, [selectedSubpaths, subpaths, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history.length]);

  const handleApply = useCallback(() => {
    onSvgChange(history[historyIndex]);
    onClose();
  }, [history, historyIndex, onSvgChange, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAll();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key === 'Escape') {
        clearSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, selectAll, undo, redo, clearSelection]);

  // Interactive SVG
  const interactiveSvg = useMemo(() => {
    if (subpaths.length === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <Typography color="text.secondary">
            Немає елементів для редагування
          </Typography>
        </Box>
      );
    }

    const vbParts = viewBox.split(' ').map(Number);
    const svgWidth = vbParts[2] || 400;
    const svgHeight = vbParts[3] || 400;

    const pathElements = subpaths.map(subpath => {
      const isSelected = selectedSubpaths.has(subpath.id);
      const isHovered = hoveredSubpath === subpath.id;
      
      return (
        <path
          key={subpath.id}
          d={subpath.d}
          fill={isSelected ? '#EF4444' : isHovered ? '#F97316' : subpath.fill}
          stroke={isSelected ? '#DC2626' : isHovered ? '#EA580C' : 'none'}
          strokeWidth={isSelected || isHovered ? 2 : 0}
          style={{
            cursor: 'pointer',
            transition: 'fill 0.15s, stroke 0.15s',
            opacity: isSelected ? 0.8 : 1,
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(subpath.id, e.shiftKey);
          }}
          onMouseEnter={() => setHoveredSubpath(subpath.id)}
          onMouseLeave={() => setHoveredSubpath(null)}
        />
      );
    });

    return (
      <svg
        viewBox={viewBox}
        width={svgWidth}
        height={svgHeight}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
        onClick={() => clearSelection()}
      >
        {pathElements}
      </svg>
    );
  }, [subpaths, selectedSubpaths, hoveredSubpath, viewBox, toggleSelection, clearSelection]);

  return (
    <Dialog 
      open 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={window.innerWidth < 600}
      PaperProps={{
        sx: { borderRadius: { xs: 0, sm: 6 }, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          ✂️ Редактор SVG
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Stack 
          direction="row" 
          spacing={1} 
          alignItems="center" 
          sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
        >
          {/* Selection controls */}
          <Tooltip title="Виділити все (Ctrl+A)">
            <IconButton onClick={selectAll} size="small">
              <SelectAllIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Інвертувати виділення">
            <IconButton onClick={invertSelection} size="small">
              <FlipCameraAndroidIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Скасувати виділення (Esc)">
            <IconButton onClick={clearSelection} size="small" disabled={selectedSubpaths.size === 0}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Delete */}
          <Tooltip title="Видалити (Delete)">
            <IconButton 
              onClick={deleteSelected} 
              size="small" 
              disabled={selectedSubpaths.size === 0}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* History */}
          <Tooltip title="Скасувати (Ctrl+Z)">
            <IconButton onClick={undo} size="small" disabled={historyIndex === 0}>
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Повторити (Ctrl+Shift+Z)">
            <IconButton onClick={redo} size="small" disabled={historyIndex >= history.length - 1}>
              <RedoIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Zoom */}
          <IconButton onClick={() => setZoom(z => Math.max(25, z - 25))} size="small">
            <ZoomOutIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
            {zoom}%
          </Typography>
          <IconButton onClick={() => setZoom(z => Math.min(400, z + 25))} size="small">
            <ZoomInIcon fontSize="small" />
          </IconButton>

          {/* Status */}
          <Box sx={{ flex: 1 }} />
          {selectedSubpaths.size > 0 && (
            <Chip 
              size="small" 
              color="error" 
              label={`Виділено: ${selectedSubpaths.size}`}
            />
          )}
          <Chip 
            size="small" 
            variant="outlined" 
            label={`${subpaths.length} об'єктів`}
          />
        </Stack>

        {/* Canvas */}
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            bgcolor: 'grey.100',
            borderRadius: 3,
            p: 2,
            minHeight: 300,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='10' height='10' fill='%23f0f0f0'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23f0f0f0'/%3E%3C/svg%3E")`,
          }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -25 : 25;
              setZoom(z => Math.max(25, Math.min(400, z + delta)));
            }
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'flex-start',
              minHeight: '100%',
            }}
          >
            <Box
              sx={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                p: 2,
              }}
            >
              {interactiveSvg}
            </Box>
          </Box>
        </Box>

        {/* Help */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
          💡 Клікніть на елемент щоб виділити. Shift+клік для множинного виділення. Ctrl+колесо для зуму.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} color="inherit">
          Скасувати
        </Button>
        <Button 
          onClick={handleApply} 
          variant="contained" 
          startIcon={<CheckIcon />}
          disabled={historyIndex === 0}
        >
          Застосувати
        </Button>
      </DialogActions>
    </Dialog>
  );
}

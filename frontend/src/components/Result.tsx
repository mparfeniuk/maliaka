import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  Collapse,
  Alert,
  Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PaletteIcon from '@mui/icons-material/Palette';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SVGViewer from './SVGViewer';
import MockupPreview from './MockupPreview';
import SVGEditor from './SVGEditor';
import type { ProcessResult } from '../types';

interface ResultProps {
  result: ProcessResult;
  onReset: () => void;
}

// Preset colors for quick selection
const PRESET_COLORS = [
  { name: 'Чорний', hex: '#000000' },
  { name: 'Білий', hex: '#FFFFFF' },
  { name: 'Червоний', hex: '#E53935' },
  { name: 'Синій', hex: '#1E88E5' },
  { name: 'Зелений', hex: '#43A047' },
  { name: 'Жовтий', hex: '#FDD835' },
  { name: 'Помаранч.', hex: '#FB8C00' },
  { name: 'Фіолет.', hex: '#8E24AA' },
  { name: 'Рожевий', hex: '#EC407A' },
  { name: 'Бірюзов.', hex: '#00ACC1' },
];

// Function to change SVG fill color
function changeSvgColor(svg: string, newColor: string): string {
  let modified = svg
    .replace(/fill="#[0-9A-Fa-f]{6}"/g, `fill="${newColor}"`)
    .replace(/fill='#[0-9A-Fa-f]{6}'/g, `fill='${newColor}'`)
    .replace(/fill="(black|white|red|blue|green)"/gi, `fill="${newColor}"`)
    .replace(/fill='(black|white|red|blue|green)'/gi, `fill='${newColor}'`)
    .replace(/fill:\s*#[0-9A-Fa-f]{6}/gi, `fill:${newColor}`)
    .replace(/fill:\s*(black|white|red|blue|green)/gi, `fill:${newColor}`);
  
  return modified;
}

export default function Result({ result, onReset }: ResultProps) {
  const { t } = useTranslation();
  const [showMockup, setShowMockup] = useState(false);
  const [vectorColor, setVectorColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editedSvg, setEditedSvg] = useState<string | null>(null);

  // Use edited SVG if available, otherwise use original
  const baseSvg = editedSvg ?? result.svg;

  // Memoize the colored SVG to avoid recalculating on every render
  const coloredSvg = useMemo(() => {
    return changeSvgColor(baseSvg, vectorColor);
  }, [baseSvg, vectorColor]);

  // Handle SVG changes from editor
  const handleSvgChange = (newSvg: string) => {
    setEditedSvg(newSvg);
  };

  const handleToggleMockup = () => {
    setShowMockup(!showMockup);
  };

  const handleDownload = () => {
    const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maliaka-drawing.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Card elevation={0} sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight={600}>
              {t('result.title')}
            </Typography>
            <Tooltip title="Почати знову">
              <IconButton onClick={onReset} size="small">
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* SVG Preview */}
          <Box 
            sx={{ 
              mb: 3, 
              p: 2, 
              borderRadius: 4,
              bgcolor: vectorColor === '#FFFFFF' ? 'grey.700' : 'grey.100',
              overflow: 'auto',
              maxHeight: 350,
            }}
          >
            <SVGViewer svg={coloredSvg} />
          </Box>

          {/* Color Picker */}
          <Box sx={{ mb: 3 }}>
            <Button
              startIcon={<PaletteIcon />}
              endIcon={showColorPicker ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowColorPicker(!showColorPicker)}
              sx={{ mb: 2 }}
              size="small"
            >
              Колір вектора
            </Button>
            
            <Collapse in={showColorPicker}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {PRESET_COLORS.map((color) => (
                  <Tooltip key={color.hex} title={color.name}>
                    <IconButton
                      onClick={() => setVectorColor(color.hex)}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: color.hex,
                        border: vectorColor === color.hex ? '3px solid' : '1px solid',
                        borderColor: vectorColor === color.hex ? 'primary.main' : 'divider',
                        '&:hover': {
                          bgcolor: color.hex,
                          transform: 'scale(1.1)',
                        },
                        boxShadow: color.hex === '#FFFFFF' ? 'inset 0 0 0 1px #e0e0e0' : 'none',
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              
              {/* Custom color input */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                  type="color"
                  value={vectorColor}
                  onChange={(e) => setVectorColor(e.target.value)}
                  style={{ 
                    width: 48, 
                    height: 48, 
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                />
                <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                  {vectorColor}
                </Typography>
              </Box>
            </Collapse>
          </Box>

          {/* Edited indicator */}
          {editedSvg && (
            <Alert 
              severity="info" 
              sx={{ mb: 3, borderRadius: 3 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => setEditedSvg(null)}
                >
                  Скинути
                </Button>
              }
            >
              SVG було відредаговано
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{ py: 1.5 }}
            >
              {t('result.download')}
            </Button>
            
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<EditIcon />}
                onClick={() => setShowEditor(true)}
                color="warning"
              >
                Редагувати
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<CheckroomIcon />}
                onClick={handleToggleMockup}
              >
                Футболка
              </Button>
            </Stack>
          </Stack>

          {/* Processing info */}
          {result.processingTime && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                size="small" 
                label={`⏱️ ${result.processingTime}с`}
                variant="outlined"
              />
              {result.metadata?.colorCount && (
                <Chip 
                  size="small" 
                  label={`🎨 ${result.metadata.colorCount} кольорів`}
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Mockup Preview */}
      <Collapse in={showMockup}>
        {showMockup && coloredSvg && (
          <MockupPreview svg={coloredSvg} />
        )}
      </Collapse>

      {/* SVG Editor Modal */}
      {showEditor && baseSvg && (
        <SVGEditor
          svg={baseSvg}
          onSvgChange={handleSvgChange}
          onClose={() => setShowEditor(false)}
        />
      )}
    </Box>
  );
}

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Alert,
  Stack,
  alpha,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ImageIcon from '@mui/icons-material/Image';

interface UploadProps {
  onUpload: (file: File) => void;
  error: string | null;
}

export default function Upload({ onUpload, error }: UploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    // Telegram Web App camera access
    if (WebApp.initDataUnsafe?.user) {
      fileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  };

  return (
    <Card 
      elevation={0}
      sx={{ 
        borderRadius: 4,
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
            {t('upload.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('upload.subtitle')}
          </Typography>
        </Box>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          capture="environment"
        />

        {/* Drop zone */}
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
          sx={{
            border: '2px dashed',
            borderColor: isDragOver ? 'primary.main' : 'divider',
            borderRadius: 4,
            p: 4,
            mb: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            bgcolor: isDragOver ? alpha('#6750A4', 0.05) : 'transparent',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha('#6750A4', 0.03),
            },
          }}
        >
          <ImageIcon 
            sx={{ 
              fontSize: 48, 
              color: isDragOver ? 'primary.main' : 'text.disabled',
              mb: 2,
            }} 
          />
          <Typography variant="body1" color="text.secondary">
            Перетягніть зображення сюди
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            або натисніть щоб вибрати
          </Typography>
        </Box>

        {/* Action buttons */}
        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<CloudUploadIcon />}
            onClick={handleButtonClick}
            sx={{ 
              py: 1.5,
              fontSize: '1rem',
            }}
          >
            {t('upload.button')}
          </Button>

          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<CameraAltIcon />}
            onClick={handleCameraClick}
            sx={{ 
              py: 1.5,
              fontSize: '1rem',
            }}
          >
            {t('upload.camera')}
          </Button>
        </Stack>

        {/* Error message */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mt: 3, borderRadius: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* Supported formats */}
        <Typography 
          variant="caption" 
          color="text.disabled" 
          sx={{ 
            display: 'block',
            textAlign: 'center',
            mt: 3,
          }}
        >
          Підтримувані формати: JPEG, PNG, WebP
        </Typography>
      </CardContent>
    </Card>
  );
}

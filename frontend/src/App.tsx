import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  Link,
} from '@mui/material';
import Upload from './components/Upload';
import Result from './components/Result';
import MaskEditor, { ProcessingSettings } from './components/MaskEditor';
import { processImage } from './services/api';
import type { ProcessResult } from './types';

type AppState = 'upload' | 'edit' | 'processing' | 'result';

function App() {
  const { i18n, t } = useTranslation();
  const [appState, setAppState] = useState<AppState>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Telegram Web App if available
    if (typeof WebApp !== 'undefined' && WebApp.initDataUnsafe) {
      WebApp.ready();
      WebApp.expand();

      // Set language based on Telegram user language
      const tgLang = WebApp.initDataUnsafe?.user?.language_code || 'en';
      const supportedLangs: Record<string, string> = {
        'uk': 'uk',
        'sl': 'sl',
        'en': 'en',
      };
      const lang = supportedLangs[tgLang] || 'en';
      i18n.changeLanguage(lang);
    } else {
      // Development mode - use browser language or default to Ukrainian
      const browserLang = navigator.language.split('-')[0];
      const supportedLangs: Record<string, string> = {
        'uk': 'uk',
        'sl': 'sl',
        'en': 'en',
      };
      const lang = supportedLangs[browserLang] || 'uk';
      i18n.changeLanguage(lang);
      console.log('Running in development mode (not in Telegram)');
    }
  }, [i18n]);

  // Handle file selection - go to mask editor
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setAppState('edit');
  };

  // Handle processing from mask editor
  const handleProcessWithMask = async (file: File, maskDataUrl: string | null, settings: ProcessingSettings) => {
    setAppState('processing');
    setError(null);

    try {
      console.log('🎨 Processing with settings:', {
        hasMask: !!maskDataUrl,
        ...settings
      });
      const data = await processImage(file, { 
        maskDataUrl,
        minArtifactSize: settings.minArtifactSize,
        turdsize: settings.turdsize,
        preserveStyle: settings.preserveStyle,
        invertColors: settings.invertColors,
      });
      setResult(data);
      setAppState('result');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      // Map common errors to translation keys
      if (errorMessage.includes('network') || errorMessage.includes('connect')) {
        setError(t('errors.networkError'));
      } else if (errorMessage.includes('file') || errorMessage.includes('type')) {
        setError(t('errors.invalidFile'));
      } else if (errorMessage.includes('large') || errorMessage.includes('size')) {
        setError(t('errors.tooLarge'));
      } else {
        setError(t('errors.processingFailed'));
      }
      setAppState('edit'); // Go back to editor on error
    }
  };

  // Cancel mask editing - go back to upload
  const handleCancelEdit = () => {
    setSelectedFile(null);
    setAppState('upload');
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSelectedFile(null);
    setAppState('upload');
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #6750A4 0%, #381E72 100%)',
        pb: 4,
      }}
    >
      {/* App Bar */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          background: 'transparent',
          color: 'white',
        }}
      >
        <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 600,
              fontSize: { xs: '2rem', sm: '2.5rem' },
              letterSpacing: '0.02em',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              background: 'linear-gradient(45deg, #FFD54F, #FFAB91, #F48FB1)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Maliaka ✨
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ px: 2 }}>
        {/* Subtitle */}
        <Typography 
          variant="body1" 
          align="center" 
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            mb: 3,
            mt: -1,
          }}
        >
          {t('app.subtitle')}
        </Typography>

        {/* Main Content */}
        <Fade in={appState === 'upload'} unmountOnExit>
          <Box>
            {appState === 'upload' && (
              <Upload onUpload={handleFileSelect} error={error} />
            )}
          </Box>
        </Fade>

        <Fade in={appState === 'edit'} unmountOnExit>
          <Box>
            {appState === 'edit' && selectedFile && (
              <MaskEditor
                imageFile={selectedFile}
                onProcess={handleProcessWithMask}
                onCancel={handleCancelEdit}
              />
            )}
          </Box>
        </Fade>

        <Fade in={appState === 'processing'} unmountOnExit>
          <Box>
            {appState === 'processing' && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  py: 10,
                }}
              >
                <CircularProgress 
                  size={60} 
                  thickness={4}
                  sx={{ color: 'white', mb: 3 }} 
                />
                <Typography variant="h6" sx={{ color: 'white' }}>
                  {t('upload.processing')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                  Це може зайняти кілька секунд...
                </Typography>
              </Box>
            )}
          </Box>
        </Fade>

        <Fade in={appState === 'result'} unmountOnExit>
          <Box>
            {appState === 'result' && result && (
              <Result 
                result={result} 
                onReset={handleReset}
              />
            )}
          </Box>
        </Fade>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          mt: 4,
          pb: 3,
          color: 'rgba(255,255,255,0.85)',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2">
          Day I. Vibe coding marathon.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Author{' '}
          <Link
            href="https://www.linkedin.com/in/mparfeniuk/"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            underline="always"
          >
            Max Parfeniuk
          </Link>
        </Typography>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error && appState === 'edit'}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%', borderRadius: 3 }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;

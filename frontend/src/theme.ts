import { createTheme } from '@mui/material/styles';

// Material Design 3 inspired theme for Telegram Web App
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4', // MD3 Primary
      light: '#D0BCFF',
      dark: '#381E72',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71', // MD3 Secondary
      light: '#CCC2DC',
      dark: '#1D192B',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#B3261E',
      light: '#F2B8B5',
      dark: '#601410',
    },
    warning: {
      main: '#F9A825',
    },
    success: {
      main: '#2E7D32',
    },
    background: {
      default: '#FEF7FF', // MD3 Surface
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C1B1F',
      secondary: '#49454F',
    },
  },
  typography: {
    fontFamily: '"Roboto", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '2.5rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    h2: {
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h5: {
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    h6: {
      fontFamily: '"Fredoka", sans-serif',
      fontSize: '1rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    button: {
      fontFamily: '"Fredoka", sans-serif',
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12, // Balanced rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: '0.9375rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
        },
        thumb: {
          width: 20,
          height: 20,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          borderRadius: '16px 16px 0 0',
        },
      },
    },
  },
});

export default theme;


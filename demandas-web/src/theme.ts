import { createTheme } from '@mui/material/styles'

/** Paleta NIG + cores semânticas: Info #004F75, Success #00A649, Warning #E5B800 (amarelo forte), Error #DA3832 */
const theme = createTheme({
  palette: {
    success: {
      main: '#00A649',
      light: '#e6f7ed',
      dark: '#008c3a',
      contrastText: '#fff',
    },
    warning: {
      main: '#E5B800',
      light: '#FBF4D4',
      dark: '#C9A227',
      contrastText: '#1a1a1a',
    },
    error: {
      main: '#DA3832',
      light: '#fdeaea',
      dark: '#b82e29',
      contrastText: '#fff',
    },
    info: {
      main: '#004F75',
      light: '#e6f2f8',
      dark: '#003d5c',
      contrastText: '#fff',
    },
    primary: {
      main: '#002561',
      light: '#009FDF',
      dark: '#001a42',
      contrastText: '#fff',
    },
    secondary: {
      main: '#050032',
      light: '#0d0066',
      dark: '#030020',
      contrastText: '#fff',
    },
    grey: {
      50: '#f5f6f7',
      100: '#DCDFE3',
      200: '#c8cdd2',
      300: '#A3B5BC',
      400: '#8a9ba2',
      500: '#6b7a80',
      600: '#556268',
      700: '#3d4850',
      800: '#252d33',
      900: '#0d1114',
    },
    background: {
      default: '#f7f8f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#050032',
      secondary: '#6b7a80',
      disabled: '#8a9ba2',
    },
    divider: '#DCDFE3',
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Geometria", sans-serif',
    h1: { fontFamily: '"Geometria", sans-serif', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontFamily: '"Geometria", sans-serif', fontWeight: 700, lineHeight: 1.25 },
    h3: { fontFamily: '"Geometria", sans-serif', fontWeight: 700, lineHeight: 1.25 },
    h4: { fontFamily: '"Geometria", sans-serif', fontWeight: 500, lineHeight: 1.25 },
    h5: { fontFamily: '"Geometria", sans-serif', fontWeight: 500, lineHeight: 1.25 },
    h6: { fontFamily: '"Geometria", sans-serif', fontWeight: 500, lineHeight: 1.25 },
    body1: { fontFamily: '"Geometria", sans-serif', fontWeight: 400, lineHeight: 1.25 },
    body2: { fontFamily: '"Geometria", sans-serif', fontWeight: 400, lineHeight: 1.25 },
    subtitle1: { fontFamily: '"Geometria", sans-serif', fontWeight: 500, lineHeight: 1.25 },
    subtitle2: { fontFamily: '"Geometria", sans-serif', fontWeight: 500, lineHeight: 1.25 },
    button: { fontFamily: '"Geometria", sans-serif', fontWeight: 500, lineHeight: 1.25 },
    caption: { fontFamily: '"Geometria", sans-serif', fontWeight: 300, lineHeight: 1.25 },
    overline: { fontFamily: '"Geometria", sans-serif', fontWeight: 300, lineHeight: 1.25 },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: '#F5F7FA',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: '"Geometria", sans-serif',
          fontWeight: 600,
          color: '#002561',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          fontFamily: '"Geometria", sans-serif',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          fontFamily: '"Geometria", sans-serif',
        },
      },
    },
  },
})

/** Tema escuro NIG (alinhado ao Tailwind `dark:` e à paleta institucional). */
export const darkTheme = createTheme(theme, {
  palette: {
    mode: 'dark',
    primary: {
      main: '#009FDF',
      light: '#4db5ed',
      dark: '#002561',
      contrastText: '#fff',
    },
    secondary: {
      main: '#a5b4fc',
      light: '#c7d2fe',
      dark: '#050032',
      contrastText: '#0a0a0a',
    },
    background: {
      default: '#0d1114',
      paper: '#151b26',
    },
    text: {
      primary: '#f5f6f7',
      secondary: '#a3b5bc',
      disabled: '#8a9ba2',
    },
    divider: 'rgba(163, 181, 188, 0.22)',
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1a1f2e',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: '#f5f6f7',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export default theme

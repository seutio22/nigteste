import { createTheme } from '@mui/material/styles'

/** Paleta NIG + cores semânticas: Info #004F75, Success #00A649, Warning #FCDA4F, Error #DA3832 */
const theme = createTheme({
  palette: {
    success: {
      main: '#00A649',
      light: '#e6f7ed',
      dark: '#008c3a',
      contrastText: '#fff',
    },
    warning: {
      main: '#FCDA4F',
      light: '#fef9e6',
      dark: '#e5c547',
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
      secondary: '#A3B5BC',
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
  },
})

export default theme

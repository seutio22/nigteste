import { createTheme } from '@mui/material/styles'

/** Paleta alinhada ao tom institucional (Nexus / NIG) */
export const portalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#050032',
      light: '#1a0f4d',
      dark: '#030022',
    },
    secondary: {
      main: '#2563eb',
    },
    background: {
      default: '#f4f6f9',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
})

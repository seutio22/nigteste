import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AppRoutes } from './routes/AppRoutes'

const theme = createTheme({
  palette: { mode: 'light' },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRoutes />
    </ThemeProvider>
  )
}



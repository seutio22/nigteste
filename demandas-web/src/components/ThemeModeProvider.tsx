import { useEffect, useState, type ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme, { darkTheme } from '../theme'
import { getStoredTheme, THEME_CHANGE_EVENT, type ThemeMode } from '../lib/themeMode'

type Props = { children: ReactNode }

/** Troca o tema MUI conforme o modo claro/escuro (classe `dark` no documento). */
export function ThemeModeProvider({ children }: Props) {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme())

  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail
      if (detail === 'light' || detail === 'dark') setMode(detail)
    }
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange)
  }, [])

  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  )
}

import { useEffect } from 'react'
import { applyThemeMode, getStoredTheme } from '../lib/themeMode'

/** Sincroniza classe `dark`, variáveis CSS e tema MUI com o valor salvo (e entre abas). */
export function useTheme() {
  useEffect(() => {
    applyThemeMode(getStoredTheme())

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue != null) {
        applyThemeMode(e.newValue === 'dark' ? 'dark' : 'light')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
}

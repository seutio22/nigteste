export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'theme'

/** Disparado após aplicar tema (mesma aba). Use para sincronizar MUI / estado React. */
export const THEME_CHANGE_EVENT = 'nig-theme-change'

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

/** Aplica classe `dark` no &lt;html&gt;, variáveis CSS e persiste no localStorage. */
export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  document.body.classList.toggle('dark', mode === 'dark')
  localStorage.setItem(STORAGE_KEY, mode)
  root.style.colorScheme = mode === 'dark' ? 'dark' : 'light'

  if (mode === 'dark') {
    root.style.setProperty('--bg-primary', '#0d1114')
    root.style.setProperty('--bg-secondary', '#151b26')
    root.style.setProperty('--bg-elevated', '#1a2230')
    root.style.setProperty('--text-primary', '#f5f6f7')
    root.style.setProperty('--text-secondary', '#a3b5bc')
    root.style.setProperty('--border-color', '#334155')
  } else {
    root.style.setProperty('--bg-primary', '#ffffff')
    root.style.setProperty('--bg-secondary', '#f5f6f7')
    root.style.setProperty('--bg-elevated', '#ffffff')
    root.style.setProperty('--text-primary', '#050032')
    root.style.setProperty('--text-secondary', '#6b7a80')
    root.style.setProperty('--border-color', '#dcdfe3')
  }

  window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGE_EVENT, { detail: mode }))
}

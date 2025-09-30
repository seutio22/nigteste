import { useEffect } from 'react'

export function useTheme() {
  useEffect(() => {
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    
    if (savedTheme) {
      // Aplicar tema ao documento
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
      
      // Aplicar tema ao body também
      document.body.classList.toggle('dark', savedTheme === 'dark')
      
      // Adicionar classes CSS para tema escuro
      if (savedTheme === 'dark') {
        document.documentElement.style.setProperty('--bg-primary', '#1f2937')
        document.documentElement.style.setProperty('--bg-secondary', '#374151')
        document.documentElement.style.setProperty('--text-primary', '#f9fafb')
        document.documentElement.style.setProperty('--text-secondary', '#d1d5db')
        document.documentElement.style.setProperty('--border-color', '#4b5563')
      } else {
        document.documentElement.style.setProperty('--bg-primary', '#ffffff')
        document.documentElement.style.setProperty('--bg-secondary', '#f9fafb')
        document.documentElement.style.setProperty('--text-primary', '#111827')
        document.documentElement.style.setProperty('--text-secondary', '#6b7280')
        document.documentElement.style.setProperty('--border-color', '#e5e7eb')
      }
    }
  }, [])
}

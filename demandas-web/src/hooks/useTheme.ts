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
        document.documentElement.style.setProperty('--bg-primary', '#050032')
        document.documentElement.style.setProperty('--bg-secondary', '#002561')
        document.documentElement.style.setProperty('--text-primary', '#f9fafb')
        document.documentElement.style.setProperty('--text-secondary', '#A3B5BC')
        document.documentElement.style.setProperty('--border-color', '#556268')
      } else {
        document.documentElement.style.setProperty('--bg-primary', '#ffffff')
        document.documentElement.style.setProperty('--bg-secondary', '#f5f6f7')
        document.documentElement.style.setProperty('--text-primary', '#050032')
        document.documentElement.style.setProperty('--text-secondary', '#A3B5BC')
        document.documentElement.style.setProperty('--border-color', '#DCDFE3')
      }
    }
  }, [])
}

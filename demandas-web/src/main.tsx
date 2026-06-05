import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import '@fontsource/plus-jakarta-sans/300.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import { ThemeModeProvider } from './components/ThemeModeProvider'

// Error handler mais seletivo - só suprimir erros de recursos estáticos claramente de cache antigo
window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement
  
  // Só suprimir erros de recursos estáticos (CSS/JS) que claramente são de cache antigo
  if (target && (target.tagName === 'LINK' || target.tagName === 'SCRIPT' || target.tagName === 'IMG')) {
    const element = target as HTMLLinkElement | HTMLScriptElement | HTMLImageElement
    const url = 'href' in element ? element.href : 'src' in element ? element.src : ''
    
    // Só suprimir se for claramente um recurso estático com versão antiga
    if (url && (
      (url.includes('.css') && url.includes('v063')) ||
      (url.includes('.js') && url.includes('v063')) ||
      (url.includes('dynamic-logo.png') && url.includes('v063'))
    )) {
      console.warn('⚠️ Erro ao carregar recurso estático (cache antigo):', url)
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  }
  
  // Não suprimir outros erros - deixar o ErrorBoundary capturar
  return true
}, true)

// Capturar erros de promise rejeitadas - só suprimir 404 de recursos estáticos
window.addEventListener('unhandledrejection', (event) => {
  // Só suprimir se for claramente um erro 404 de recurso estático
  if (event.reason && typeof event.reason === 'object' && 'status' in event.reason) {
    const reason = event.reason as { status: number; url?: string }
    if (reason.status === 404 && reason.url && (
      reason.url.includes('.css') || 
      reason.url.includes('.js') || 
      reason.url.includes('dynamic-logo.png')
    )) {
      console.warn('⚠️ Promise rejeitada com 404 (recurso estático):', reason.url)
      event.preventDefault()
      return false
    }
  }
  // Deixar outros erros serem tratados normalmente
  return true
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeModeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeModeProvider>
  </ErrorBoundary>
)



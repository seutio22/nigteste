import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import './index.css'

// Error boundary para capturar erros de carregamento de recursos
window.addEventListener('error', (event) => {
  // Ignorar erros de recursos CSS/JS que podem ser de cache antigo
  const target = event.target as HTMLElement
  if (target) {
    if (target.tagName === 'LINK') {
      const link = target as HTMLLinkElement
      if (link.href && (link.href.includes('.css') || link.href.includes('v063'))) {
        console.warn('⚠️ Erro ao carregar CSS (pode ser cache antigo):', link.href)
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }
    if (target.tagName === 'SCRIPT') {
      const script = target as HTMLScriptElement
      if (script.src && (script.src.includes('.js') || script.src.includes('v063'))) {
        console.warn('⚠️ Erro ao carregar JS (pode ser cache antigo):', script.src)
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }
  }
  // Ignorar erros de recursos que retornam 404 (cache antigo)
  if (event.message && event.message.includes('404')) {
    console.warn('⚠️ Recurso não encontrado (404) - pode ser cache antigo:', event.filename)
    event.preventDefault()
    event.stopPropagation()
    return false
  }
  return true
}, true)

// Capturar erros de promise rejeitadas
window.addEventListener('unhandledrejection', (event) => {
  // Ignorar erros de carregamento de recursos
  if (event.reason && typeof event.reason === 'object' && 'status' in event.reason) {
    if (event.reason.status === 404) {
      console.warn('⚠️ Promise rejeitada com 404 (pode ser cache antigo):', event.reason)
      event.preventDefault()
      return false
    }
  }
  return true
})

// Configuração do router com future flags para v7
const router = createBrowserRouter([
  {
    path: "*",
    element: <App />
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)



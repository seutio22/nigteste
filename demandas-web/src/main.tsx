import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import './index.css'

// Error boundary para capturar erros de carregamento de recursos
window.addEventListener('error', (event) => {
  // Ignorar erros de recursos CSS/JS que podem ser de cache antigo
  if (event.target && (event.target as HTMLElement).tagName === 'LINK') {
    const link = event.target as HTMLLinkElement
    if (link.href && link.href.includes('.css')) {
      console.warn('⚠️ Erro ao carregar CSS (pode ser cache antigo):', link.href)
      // Não quebrar a aplicação por causa de CSS não encontrado
      event.preventDefault()
      return false
    }
  }
  return true
}, true)

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



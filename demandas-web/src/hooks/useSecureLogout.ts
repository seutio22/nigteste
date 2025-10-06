/**
 * 🔒 HOOK DE LOGOUT SEGURO
 * 
 * Hook que garante que o logout seja executado de forma segura,
 * limpando todos os dados do localStorage e redirecionando corretamente.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function useSecureLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  const secureLogout = useCallback((reason?: string) => {
    console.log(`🔒 Executando logout seguro${reason ? ` - ${reason}` : ''}`)
    
    // O logout do authStore já limpa todos os dados automaticamente
    logout()
    
    // Redirecionar para login
    navigate('/login', { replace: true })
    
    console.log('✅ Logout seguro concluído')
  }, [logout, navigate])

  return { secureLogout }
}

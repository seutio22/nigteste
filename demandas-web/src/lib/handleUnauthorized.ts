/** Evita tempestade de redirects quando várias APIs respondem 401 ao mesmo tempo. */
let redirecting = false

/**
 * Sessão inválida/expirada: limpa auth uma vez e vai para /login.
 * Não usar em /auth/login (senha errada também é 401).
 */
export function handleUnauthorizedOnce(requestUrl?: string): void {
  if (typeof window === 'undefined') return

  const path = window.location.pathname || ''
  if (path.includes('/login') || path.includes('/share')) return

  if (requestUrl) {
    const u = requestUrl.toLowerCase()
    if (u.includes('/auth/login') || u.includes('/auth/change-password')) return
  }

  if (redirecting) return
  redirecting = true

  try {
    // Limpar sync antes do navigate — evita reidratar token inválido e novo loop
    localStorage.removeItem('auth-store')
    sessionStorage.clear()
  } catch {
    /* ignore */
  }

  import('../store/authStore')
    .then(({ useAuthStore }) => {
      try {
        useAuthStore.setState({ token: null, user: null, loading: false, loginDate: null })
      } catch {
        /* ignore */
      }
      window.location.replace('/login')
    })
    .catch(() => {
      window.location.replace('/login')
    })
}

import { useEffect, useMemo } from 'react'
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getUserPermissions } from '../utils/defaultPermissions'
import {
  canViewAnyDadosSection,
  canViewDadosSubpage,
  type DadosSubpage,
} from '../utils/dadosPermissions'

const TAB_CONFIG: { id: DadosSubpage; label: string }[] = [
  { id: 'nig', label: 'NIG' },
  { id: 'produtividade', label: 'Produtividade' },
  { id: 'placement', label: 'Placement' },
]

function getActiveSubpage(pathname: string): DadosSubpage {
  if (pathname.startsWith('/dados/produtividade')) return 'produtividade'
  if (pathname.startsWith('/dados/placement')) return 'placement'
  return 'nig'
}

export default function DadosLayoutPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const permissions = useMemo(
    () => getUserPermissions(user?.permissions, user?.role ?? ''),
    [user?.permissions, user?.role]
  )

  const visibleTabs = useMemo(
    () => TAB_CONFIG.filter((tab) => canViewDadosSubpage(permissions, tab.id)),
    [permissions]
  )

  const active = getActiveSubpage(pathname)
  const fillViewport = active === 'produtividade'
  const activeAllowed = canViewDadosSubpage(permissions, active)

  useEffect(() => {
    if (!user) return
    if (!activeAllowed) {
      const first = visibleTabs[0]
      if (first) navigate(`/dados/${first.id}`, { replace: true })
    }
  }, [activeAllowed, user, visibleTabs, navigate])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!canViewAnyDadosSection(permissions)) {
    return <Navigate to="/" replace />
  }

  if (visibleTabs.length === 0) {
    return <Navigate to="/" replace />
  }

  if (!activeAllowed) {
    const first = visibleTabs[0]
    if (first) return <Navigate to={`/dados/${first.id}`} replace />
    return <Navigate to="/" replace />
  }

  return (
    <Paper
      sx={{
        p: 2,
        boxSizing: 'border-box',
        height: fillViewport ? 'calc(100vh - 64px)' : 'auto',
        maxHeight: fillViewport ? 'calc(100vh - 64px)' : undefined,
        display: 'flex',
        flexDirection: 'column',
        overflow: fillViewport ? 'hidden' : 'visible',
      }}
    >
      <Typography variant="h6" sx={{ mb: 1, flexShrink: 0 }}>
        Dados
      </Typography>

      {visibleTabs.length > 1 ? (
        <Tabs
          value={visibleTabs.some((t) => t.id === active) ? active : visibleTabs[0].id}
          onChange={(_, next: DadosSubpage) => navigate(`/dados/${next}`)}
          sx={{ mb: 2, flexShrink: 0 }}
        >
          {visibleTabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </Tabs>
      ) : null}

      <Box
        sx={{
          flex: fillViewport ? 1 : undefined,
          minHeight: fillViewport ? 0 : undefined,
          display: fillViewport ? 'flex' : 'block',
          flexDirection: 'column',
          overflow: fillViewport ? 'hidden' : 'visible',
        }}
      >
        <Outlet />
      </Box>
    </Paper>
  )
}

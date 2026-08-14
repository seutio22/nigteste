import { Box, Paper, Tab, Tabs, Typography } from '@mui/material'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

type DadosSubpage = 'nig' | 'produtividade' | 'placement'

function getActiveSubpage(pathname: string): DadosSubpage {
  if (pathname.startsWith('/dados/produtividade')) return 'produtividade'
  if (pathname.startsWith('/dados/placement')) return 'placement'
  return 'nig'
}

export default function DadosLayoutPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = getActiveSubpage(pathname)
  const fillViewport = active === 'produtividade'

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

      <Tabs
        value={active}
        onChange={(_, next: DadosSubpage) => navigate(`/dados/${next}`)}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Tab value="nig" label="NIG" />
        <Tab value="produtividade" label="Produtividade" />
        <Tab value="placement" label="Placement" />
      </Tabs>

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

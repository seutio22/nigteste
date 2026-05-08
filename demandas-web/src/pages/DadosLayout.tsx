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

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Dados
      </Typography>

      <Tabs
        value={active}
        onChange={(_, next: DadosSubpage) => navigate(`/dados/${next}`)}
        sx={{ mb: 2 }}
      >
        <Tab value="nig" label="NIG" />
        <Tab value="produtividade" label="Produtividade" />
        <Tab value="placement" label="Placement" />
      </Tabs>

      <Box>
        <Outlet />
      </Box>
    </Paper>
  )
}


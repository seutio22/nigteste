import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Box, CssBaseline, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PriceChangeIcon from '@mui/icons-material/PriceChange'
import InsightsIcon from '@mui/icons-material/Insights'
import TableChartIcon from '@mui/icons-material/TableChart'
import SettingsIcon from '@mui/icons-material/Settings'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useMasterDataStore } from '@/store/masterDataStore'

const drawerWidth = 240

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthStore()
  const sync = useMasterDataStore((s) => s.syncFromApi)

  useEffect(() => {
    if (auth.token && sync) {
      sync().catch(() => {})
    }
  }, [auth.token])

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen)

  const menu = [
    { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/cadastro', label: 'Cadastro', icon: <AssignmentIcon /> },
    { to: '/validacao', label: 'Validação', icon: <CheckCircleIcon /> },
    { to: '/reajuste', label: 'Reajuste', icon: <PriceChangeIcon /> },
    { to: '/analytics', label: 'Analytics', icon: <InsightsIcon /> },
    { to: '/matriz', label: 'Matriz', icon: <TableChartIcon /> },
    { to: '/dados', label: 'Dados', icon: <SettingsIcon /> },
  ]

  const adminItems = auth.user?.role === 'admin' ? [
    { to: '/admin/usuarios', label: 'Usuários (Admin)', icon: <SettingsIcon /> },
  ] : []

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6">Demandas</Typography>
      </Toolbar>
      <Divider />
      <List>
        {[...menu, ...adminItems].map((item) => (
          <ListItem key={item.to} disablePadding>
            <ListItemButton component={Link} to={item.to} selected={location.pathname === item.to}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Plataforma de Demandas</Typography>
          {auth.user ? (
            <Typography variant="body2" onClick={() => { useAuthStore.getState().clear(); navigate('/login') }} sx={{ cursor: 'pointer' }}>Sair</Typography>
          ) : null}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="menu">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}



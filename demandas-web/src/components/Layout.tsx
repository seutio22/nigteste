import React, { useState, useEffect } from 'react'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  CssBaseline
} from '@mui/material'
import { 
  AccountCircle, 
  Settings, 
  Logout, 
  Notifications, 
  Search, 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  PriceChange as PriceChangeIcon,
  Insights as InsightsIcon,
  ViewKanban as KanbanIcon
} from '@mui/icons-material'
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SidebarTrigger } from './SidebarTrigger'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'

const drawerWidth = 240

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthStore()
  const sync = useMasterDataStore((s) => s.syncFromApi)

  useEffect(() => {
    // Sincronizar dados mestres sempre que o Layout carrega
    if (sync) {
      console.log('🔄 Layout: Iniciando sincronização automática...')
      sync().catch((error) => {
        console.error('❌ Layout: Erro na sincronização automática:', error)
      })
    }
  }, [sync])

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen)

  const menu = [
    { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { to: '/cadastro', label: 'Cadastro', icon: <AssignmentIcon /> },
    { to: '/kanban', label: 'Kanban', icon: <KanbanIcon /> },
    { to: '/validacao', label: 'Validação', icon: <CheckCircleIcon /> },
    { to: '/reajuste', label: 'Reajuste', icon: <PriceChangeIcon /> },
    { to: '/analytics', label: 'Analytics', icon: <InsightsIcon /> },
    { to: '/dados', label: 'Dados', icon: <Settings /> },
    { to: '/admin/usuarios', label: 'Usuários', icon: <Settings /> },
  ]

  // As permissões são controladas pelo painel de usuário, não por código
  // Todos os usuários veem todos os itens do menu

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6">Demandas - v0.1.2</Typography>
      </Toolbar>
      <Divider />
      <List>
        {menu.map((item) => (
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
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Demandas - v0.1.2</Typography>
          {auth.user ? (
            <Typography variant="body2" onClick={() => { useAuthStore.getState().logout(); navigate('/login') }} sx={{ cursor: 'pointer' }}>Sair</Typography>
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

      <Box component="main" sx={{ flexGrow: 1, p: 0, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Box sx={{ height: '100vh', width: '100%', overflow: 'hidden' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}



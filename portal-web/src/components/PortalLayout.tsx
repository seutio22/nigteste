import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import ListAltIcon from '@mui/icons-material/ListAlt'
import PersonIcon from '@mui/icons-material/Person'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import PolicyIcon from '@mui/icons-material/Policy'
import GroupsIcon from '@mui/icons-material/Groups'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import { useAuth } from '../context/AuthContext'
import PortalFooter from './PortalFooter'

const DRAWER_WIDTH = 260

const navLinkSx = {
  color: 'inherit',
  textDecoration: 'none',
  '&.active': { bgcolor: 'action.selected', borderRadius: 1 },
}

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  managerOnly?: boolean
  opsOnly?: boolean
}

type NavGroup = { id: string; title: string; items: NavItem[] }

export default function PortalLayout() {
  const theme = useTheme()
  const isMd = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const groups: NavGroup[] = [
    {
      id: 'solic',
      title: 'Solicitações',
      items: [
        { to: '/', label: 'Início', icon: <DashboardIcon fontSize="small" /> },
        { to: '/solicitacoes/nova', label: 'Nova solicitação', icon: <AddCircleOutlineIcon fontSize="small" /> },
        { to: '/solicitacoes', label: 'Minhas solicitações', icon: <ListAltIcon fontSize="small" /> },
      ],
    },
    {
      id: 'cad',
      title: 'Cadastros',
      items: [{ to: '/apolice', label: 'Carteira de seguros', icon: <PolicyIcon fontSize="small" /> }],
    },
    {
      id: 'gestao',
      title: 'Gestão e operação',
      items: [
        {
          to: '/gestao/solicitacoes',
          label: 'Gestão — equipe',
          icon: <GroupsIcon fontSize="small" />,
          managerOnly: true,
        },
        {
          to: '/operacao/fila',
          label: 'Operação — fila',
          icon: <PrecisionManufacturingIcon fontSize="small" />,
          opsOnly: true,
        },
      ],
    },
    {
      id: 'conta',
      title: 'Conta',
      items: [
        { to: '/ajuda', label: 'Ajuda', icon: <HelpOutlineIcon fontSize="small" /> },
        { to: '/conta', label: 'Minha conta', icon: <PersonIcon fontSize="small" /> },
      ],
    },
    {
      id: 'admin',
      title: 'Administração',
      items: [
        { to: '/admin/centro', label: 'Painel administrativo', icon: <AdminPanelSettingsIcon fontSize="small" />, adminOnly: true },
      ],
    },
  ]

  function itemVisible(i: NavItem): boolean {
    if (i.adminOnly && user?.role !== 'PORTAL_ADMIN') return false
    if (i.managerOnly && user?.role !== 'REQUESTER_MANAGER') return false
    if (i.opsOnly && user?.role !== 'PORTAL_OPERATOR' && user?.role !== 'PORTAL_ADMIN') return false
    return true
  }

  const drawer = (
    <Box sx={{ py: 1 }}>
      <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
        Menu
      </Typography>
      <List dense>
        {groups.map((g) => {
          const vis = g.items.filter(itemVisible)
          if (vis.length === 0) return null
          return (
            <Box key={g.id}>
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: 'background.paper',
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  lineHeight: 2,
                  py: 0.5,
                }}
              >
                {g.title}
              </ListSubheader>
              {vis.map((item) => (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.to === '/' || item.to === '/solicitacoes'}
                  onClick={() => setMobileOpen(false)}
                  sx={navLinkSx}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </Box>
          )
        })}
      </List>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block" noWrap title={user?.email}>
          {user?.name}
        </Typography>
        <Button size="small" color="inherit" onClick={() => { logout(); navigate('/entrar') }} sx={{ mt: 1 }}>
          Sair
        </Button>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'primary.main',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          {!isMd && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5,
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            P
          </Box>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Portal do colaborador
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          pt: 8,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            flex: 1,
            width: '100%',
            minWidth: 0,
            bgcolor: 'grey.50',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet />
        </Box>
        <PortalFooter />
      </Box>
    </Box>
  )
}

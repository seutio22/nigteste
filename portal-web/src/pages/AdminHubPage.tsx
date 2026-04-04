import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Box, Container, Tab, Tabs, Typography } from '@mui/material'
import { useAuth } from '../context/AuthContext'
import NexusFieldsPanel from '../components/NexusFieldsPanel'
import AreasTypesAdminPanel from '../components/AreasTypesAdminPanel'
import SlaAdminPanel from '../components/SlaAdminPanel'
import PortalUsersAdminPanel from '../components/PortalUsersAdminPanel'

const TAB_KEYS = ['users', 'nexus', 'areas', 'sla'] as const

export default function AdminHubPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(0)

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'nexus') setTab(1)
    else if (t === 'areas') setTab(2)
    else if (t === 'sla') setTab(3)
    else if (t === 'users') setTab(0)
    else setTab(0)
  }, [searchParams])

  if (user?.role !== 'PORTAL_ADMIN') return <Navigate to="/" replace />

  return (
    <Container
      maxWidth={tab === 2 || tab === 3 ? false : 'lg'}
      sx={{ py: 3, px: tab === 2 || tab === 3 ? { xs: 2, md: 3 } : undefined }}
    >
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Administração do portal
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Usuários, <strong>catálogo Nexus</strong>, <strong>perfis de SLA</strong> (triagem, atuação, pausa e adicional) e{' '}
        <strong>áreas e tipos</strong> com formulários amplos — sem editar JSON.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v)
          setSearchParams({ tab: TAB_KEYS[v] })
        }}
        sx={{ mb: 2 }}
      >
        <Tab label="Usuários" />
        <Tab label="Banco de dados Nexus" />
        <Tab label="Áreas e tipos (gestão)" />
        <Tab label="SLA" />
      </Tabs>

      {tab === 0 && <PortalUsersAdminPanel />}

      {tab === 1 && <NexusFieldsPanel onChanged={() => {}} />}

      {tab === 2 && (
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          <AreasTypesAdminPanel />
        </Box>
      )}

      {tab === 3 && (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <SlaAdminPanel />
        </Box>
      )}

    </Container>
  )
}

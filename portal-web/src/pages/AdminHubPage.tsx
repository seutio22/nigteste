import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Box, Tab, Tabs, Typography } from '@mui/material'
import { useAuth } from '../context/AuthContext'
import DatabaseHubPanel from '../components/DatabaseHubPanel'
import AreasTypesAdminPanel from '../components/AreasTypesAdminPanel'
import SlaAdminPanel from '../components/SlaAdminPanel'
import PortalUsersAdminPanel from '../components/PortalUsersAdminPanel'
import PageScaffold from '../components/PageScaffold'

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
    <PageScaffold>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Administração do portal
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Usuários, <strong>catálogo de campos</strong> (integração e listas), <strong>perfis de SLA</strong> (triagem, atuação,
        pausa e adicional) e <strong>áreas e tipos</strong> com formulários amplos — sem editar JSON.
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
        <Tab label="Banco de dados" />
        <Tab label="Áreas e tipos (gestão)" />
        <Tab label="SLA" />
      </Tabs>

      {tab === 0 && <PortalUsersAdminPanel />}

      {tab === 1 && <DatabaseHubPanel />}

      {tab === 2 && (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
          <AreasTypesAdminPanel />
        </Box>
      )}

      {tab === 3 && (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
          <SlaAdminPanel />
        </Box>
      )}

    </PageScaffold>
  )
}

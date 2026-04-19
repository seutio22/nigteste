import { useState } from 'react'
import { Box, Tab, Tabs, Typography } from '@mui/material'
import NexusSyncCard from './NexusSyncCard'
import PortalLookupListsPanel from './PortalLookupListsPanel'
import NexusFieldsPanel from './NexusFieldsPanel'

export default function DatabaseHubPanel() {
  const [tab, setTab] = useState(0)
  const [syncTick, setSyncTick] = useState(0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <NexusSyncCard onSynced={() => setSyncTick((n) => n + 1)} />
      <Typography variant="body2" color="text.secondary">
        A <strong>sincronização</strong> alimenta dados externos para listas dinâmicas. As <strong>listas do portal</strong>{' '}
        são tabelas criadas por você (ex.: filiais). Os <strong>campos de referência</strong> ligam formulários à
        integração.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Listas do portal" />
        <Tab label="Campos de referência" />
      </Tabs>
      {tab === 0 && <PortalLookupListsPanel key={syncTick} />}
      {tab === 1 && <NexusFieldsPanel embedInHub key={syncTick} onChanged={() => {}} />}
    </Box>
  )
}

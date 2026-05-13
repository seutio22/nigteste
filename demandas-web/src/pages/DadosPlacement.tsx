import React, { useState } from 'react'
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material'
import FiliaisTab from './Placement/FiliaisTab'

type PlacementTabKey = 'filiais'

export default function DadosPlacementPage() {
  const [activeTab, setActiveTab] = useState<PlacementTabKey>('filiais')

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ mb: 0.25 }}>
          Dados · Placement
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cadastros do módulo Placement. Selecione uma tabela abaixo.
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, next: PlacementTabKey) => setActiveTab(next)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          '& .MuiTab-root': {
            minWidth: 'auto',
            px: 2,
            py: 1,
            fontSize: '0.875rem',
            textTransform: 'none',
            fontWeight: 500,
          },
        }}
      >
        <Tab value="filiais" label="Filiais" />
      </Tabs>

      <Box>{activeTab === 'filiais' && <FiliaisTab />}</Box>
    </Paper>
  )
}

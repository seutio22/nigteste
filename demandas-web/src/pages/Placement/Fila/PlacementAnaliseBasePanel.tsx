import React, { Suspense, lazy, useEffect, useState } from 'react'
import {
  Box,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import {
  ANALISE_BASE_SECTIONS,
  type AnaliseBaseSectionKey,
  type AnaliseBaseViewMode,
} from './placementAnaliseBase'

const PlacementAnaliseBaseUnifiedPage = lazy(() =>
  import('./PlacementAnaliseBaseUnifiedPage').then((m) => ({ default: m.PlacementAnaliseBaseUnifiedPage }))
)

function SectionLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

type Props = {
  cotacaoId: string
  disabled?: boolean
  /** Seção inicial ao abrir em modo por etapa (ex.: subetapa legada etapa3). */
  initialSection?: AnaliseBaseSectionKey
}

export function PlacementAnaliseBasePanel({
  cotacaoId,
  disabled,
  initialSection = 'grupo_elegivel',
}: Props) {
  const [viewMode, setViewMode] = useState<AnaliseBaseViewMode>('unified')
  const [activeSection, setActiveSection] = useState<AnaliseBaseSectionKey>(initialSection)

  useEffect(() => {
    setActiveSection(initialSection)
    if (viewMode === 'unified' && initialSection !== 'grupo_elegivel') {
      const el = document.getElementById(`analise-${initialSection}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [initialSection, viewMode])

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
          Painel analítico contínuo da base importada — grupo elegível, contrato e geografia em um só
          fluxo de leitura. Alterne para focar em uma área, se necessário.
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewMode}
          onChange={(_, next: AnaliseBaseViewMode | null) => {
            if (next) setViewMode(next)
          }}
          aria-label="Modo de visualização da análise"
        >
          <ToggleButton value="unified" aria-label="Página unificada">
            <ViewAgendaIcon fontSize="small" sx={{ mr: 0.75 }} />
            Painel completo
          </ToggleButton>
          <ToggleButton value="split" aria-label="Por seção">
            <ViewWeekIcon fontSize="small" sx={{ mr: 0.75 }} />
            Por área
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {viewMode === 'split' ? (
        <Box>
          <Tabs
            value={activeSection}
            onChange={(_, value: AnaliseBaseSectionKey) => setActiveSection(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            {ANALISE_BASE_SECTIONS.map((section) => (
              <Tab
                key={section.key}
                value={section.key}
                label={section.label}
                sx={{ textTransform: 'none', fontWeight: activeSection === section.key ? 700 : 500 }}
              />
            ))}
          </Tabs>
          <Suspense fallback={<SectionLoading />}>
            <PlacementAnaliseBaseUnifiedPage
              cotacaoId={cotacaoId}
              disabled={disabled}
              focusSection={activeSection}
            />
          </Suspense>
        </Box>
      ) : (
        <Suspense fallback={<SectionLoading />}>
          <PlacementAnaliseBaseUnifiedPage cotacaoId={cotacaoId} disabled={disabled} />
        </Suspense>
      )}
    </Box>
  )
}

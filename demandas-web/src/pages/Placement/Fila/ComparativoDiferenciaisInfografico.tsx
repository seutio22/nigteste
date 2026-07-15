import React, { useEffect, useMemo, useState } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import VideoCallIcon from '@mui/icons-material/VideoCall'
import PsychologyIcon from '@mui/icons-material/Psychology'
import FlightIcon from '@mui/icons-material/Flight'
import HomeIcon from '@mui/icons-material/Home'
import VaccinesIcon from '@mui/icons-material/Vaccines'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import {
  getContratoAtualLayoutSpec,
  getContratoTypography,
  planosPorSlideFromCount,
  type ContratoAtualLayoutSpec,
} from './placementContratoAtualLayout'
import {
  fetchOperadoraIdsComLogo,
  loadOperadoraLogoObjectUrls,
  revokeOperadoraLogoUrls,
} from './placementOperadoraLogo'
import { DiferencialCelulaContent } from './DiferencialCelulaContent'
import type { DiferencialItemKey } from './placementDiferenciaisCatalogo'
import type {
  ComparativoDiferencialColuna,
  ComparativoDiferencialPagina,
} from './placementComparativoDiferenciais'
import {
  PlacementExpandedFrame,
  PlacementSlideHeader,
  SlidePageFooter,
} from './placementSlideShell'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'

const FONT = SLIDE_FONT
const PRIMARY = SLIDE_COLORS.primary
const INFO = SLIDE_COLORS.info
const WHITE = SLIDE_COLORS.white
const BORDER = SLIDE_COLORS.border
const SURFACE = '#f3f5f8'
const ROW_MIN = 56

/** Layout do infográfico — alinhado ao comparativo financeiro e coparticipação. */
function getDiferenciaisInfograficoLayout(colCount: number): ContratoAtualLayoutSpec {
  const base = getContratoAtualLayoutSpec(planosPorSlideFromCount(Math.max(colCount, 1)))
  const legendBoost = colCount >= 6 ? 36 : colCount >= 5 ? 32 : colCount >= 4 ? 24 : 16
  return {
    ...base,
    legendW: base.legendW + legendBoost,
    tabH: base.tabH + (colCount >= 5 ? 12 : 8),
    logoWellH: base.logoWellH + 4,
    compact: false,
  }
}

function itemIcon(key: DiferencialItemKey): React.ReactNode {
  switch (key) {
    case 'telemedicina':
      return <VideoCallIcon />
    case 'telepsicologia':
      return <PsychologyIcon />
    case 'assistencia_viagem':
      return <FlightIcon />
    case 'coleta_domiciliar':
      return <HomeIcon />
    case 'vacinas_calendario':
      return <VaccinesIcon />
    case 'retaguarda':
      return <SupportAgentIcon />
    case 'check_up':
      return <MonitorHeartIcon />
    case 'resgate_domiciliar':
      return <LocalHospitalIcon />
    case 'resgate_saude':
      return <HealthAndSafetyIcon />
    default:
      return <AutoAwesomeIcon />
  }
}

function PlanoTabHeader({
  col,
  logoUrl,
  layout,
}: {
  col: ComparativoDiferencialColuna
  logoUrl?: string | null
  layout: ContratoAtualLayoutSpec
}) {
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = Boolean(logoUrl) && !logoFailed
  const typo = getContratoTypography(layout)

  return (
    <Box
      sx={{
        borderRadius: '14px 14px 0 0',
        overflow: 'hidden',
        borderRight: `1px solid ${BORDER}`,
        borderTop: `1px solid ${BORDER}`,
        borderLeft: `1px solid ${BORDER}`,
        minHeight: layout.tabH + layout.logoWellH,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          minHeight: layout.logoWellH,
          maxHeight: layout.logoWellH,
          bgcolor: WHITE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 0.75,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {showLogo ? (
          <Box
            component="img"
            src={logoUrl!}
            alt={col.operadora}
            onError={() => setLogoFailed(true)}
            sx={{ maxHeight: layout.logoWellH - 10, maxWidth: '92%', objectFit: 'contain' }}
          />
        ) : (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: typo.tabOperadora,
              fontWeight: 800,
              color: PRIMARY,
              textAlign: 'center',
              lineHeight: 1.15,
              wordBreak: 'break-word',
              px: 0.35,
            }}
          >
            {col.operadora}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          flex: 1,
          py: 0.85,
          px: 0.75,
          background: `linear-gradient(180deg, ${col.tabColor}22 0%, ${col.tabColor}10 55%, ${WHITE} 100%)`,
          borderTop: `3px solid ${col.tabColor}`,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.4,
          position: 'relative',
          minHeight: layout.tabH,
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -16,
            right: -16,
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: `${col.tabColor}18`,
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: typo.tabProduto,
            fontWeight: 600,
            color: INFO,
            letterSpacing: 0.3,
            lineHeight: 1.2,
            position: 'relative',
          }}
        >
          {col.grupo === 'atual' ? 'CENÁRIO ATUAL' : 'PROPOSTA · MERCADO'}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: typo.tabGrupo,
            fontWeight: 800,
            color: col.tabColor,
            letterSpacing: 0.4,
            lineHeight: 1.15,
            position: 'relative',
          }}
        >
          {col.grupo === 'atual' ? '● ATUAL' : '● MERCADO'}
        </Typography>
        {showLogo ? (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: typo.tabPlano,
              fontWeight: 800,
              color: PRIMARY,
              lineHeight: 1.25,
              wordBreak: 'break-word',
              px: 0.35,
              position: 'relative',
            }}
          >
            {col.operadora}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

function LegendCell({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: ROW_MIN,
        display: 'flex',
        alignItems: 'center',
        gap: 0.85,
        px: 1.25,
        py: 0.65,
        borderBottom: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        bgcolor: SURFACE,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${SLIDE_COLORS.mint} 0%, ${WHITE} 100%)`,
          color: INFO,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,37,97,0.08)',
          '& svg': { fontSize: 16 },
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 9.5,
          fontWeight: 700,
          color: PRIMARY,
          lineHeight: 1.25,
          flex: 1,
          minWidth: 0,
          wordBreak: 'break-word',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

function DataCell({
  children,
  zebra,
}: {
  children: React.ReactNode
  zebra?: number
}) {
  return (
    <Box
      sx={{
        minHeight: ROW_MIN,
        height: '100%',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 0.75,
        py: 0.65,
        borderBottom: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        bgcolor: zebra != null ? (zebra % 2 === 0 ? WHITE : '#f8f9fb') : WHITE,
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </Box>
    </Box>
  )
}

type Props = {
  page: ComparativoDiferencialPagina
  ticket: string
}

export function ComparativoDiferenciaisInfografico({ page, ticket }: Props) {
  const colunas = page.colunas
  const layout = useMemo(
    () => getDiferenciaisInfograficoLayout(Math.max(colunas.length, 1)),
    [colunas.length]
  )
  const typo = getContratoTypography(layout)
  const legendW = layout.legendW
  const tabRowH = layout.tabH + layout.logoWellH
  const gridCols = `${legendW}px repeat(${colunas.length}, minmax(0, 1fr))`

  const operadoraIds = useMemo(
    () => colunas.map((c) => c.operadoraId).filter(Boolean),
    [colunas]
  )

  const [logoUrls, setLogoUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const ids = await fetchOperadoraIdsComLogo(operadoraIds)
      if (cancelled) return
      const urls = await loadOperadoraLogoObjectUrls(ids)
      if (!cancelled) setLogoUrls(urls)
    })()
    return () => {
      cancelled = true
      revokeOperadoraLogoUrls(logoUrls)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operadoraIds.join('|')])

  return (
    <PlacementExpandedFrame>
      <PlacementSlideHeader
        title={page.titulo}
        subtitle={`Comparativo de diferenciais · ${ticket}`}
        icon={<AutoAwesomeIcon sx={{ fontSize: 22, color: '#fff' }} />}
        badge={page.totalPages > 1 ? `${page.pageIndex + 1}/${page.totalPages}` : undefined}
      />

      <Box sx={{ px: 1.5, py: 1.25, bgcolor: WHITE }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,37,97,0.06)',
            border: `1px solid ${BORDER}`,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <Box
              sx={{
                bgcolor: SURFACE,
                borderRight: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1,
                minHeight: tabRowH,
              }}
            >
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 800, color: PRIMARY }}>
                DIFERENCIAIS
              </Typography>
            </Box>
            {colunas.map((col) => (
              <Box key={col.id} sx={{ minWidth: 0 }}>
                <PlanoTabHeader
                  col={col}
                  logoUrl={col.operadoraId ? logoUrls.get(col.operadoraId) : null}
                  layout={layout}
                />
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              alignItems: 'stretch',
            }}
          >
            {page.linhas.map((linha, rowIdx) => (
              <React.Fragment key={linha.itemKey}>
                <LegendCell label={linha.label} icon={itemIcon(linha.itemKey)} />
                {colunas.map((col) => (
                  <DataCell key={`${linha.itemKey}-${col.id}`} zebra={rowIdx}>
                    <DiferencialCelulaContent
                      celulas={linha.celulasPorColuna[col.id]}
                      tabColor={col.tabColor}
                      variant="infografico"
                    />
                  </DataCell>
                ))}
              </React.Fragment>
            ))}
          </Box>
        </Paper>

        <Typography
          sx={{
            display: 'block',
            mt: 1.25,
            fontFamily: FONT,
            fontSize: 8,
            color: SLIDE_COLORS.infoLight,
            lineHeight: 1.4,
          }}
        >
          {page.notasRodape}
        </Typography>
      </Box>

      <SlidePageFooter pageIndex={page.pageIndex} totalPages={page.totalPages} />
    </PlacementExpandedFrame>
  )
}

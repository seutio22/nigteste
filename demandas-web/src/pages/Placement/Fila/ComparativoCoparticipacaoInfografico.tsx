import React, { useEffect, useMemo, useState } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import PaymentsIcon from '@mui/icons-material/Payments'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import DescriptionIcon from '@mui/icons-material/Description'
import { CoparticipacaoSelo } from './CoparticipacaoSelo'
import {
  labelFormaCobrancaCopart,
  type CopartProcedimentoKey,
} from './placementCoparticipacao'
import {
  COMPARATIVO_COPART_LINHAS,
  valorCopartLinha,
  type ComparativoCopartColuna,
  type ComparativoCoparticipacaoPagina,
} from './placementComparativoCoparticipacao'
import {
  fetchOperadoraIdsComLogo,
  loadOperadoraLogoObjectUrls,
  revokeOperadoraLogoUrls,
} from './placementOperadoraLogo'
import {
  getContratoAtualLayoutSpec,
  getContratoTypography,
  planosPorSlideFromCount,
  type ContratoAtualLayoutSpec,
} from './placementContratoAtualLayout'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'

const FONT = SLIDE_FONT
const PRIMARY = SLIDE_COLORS.primary
const INFO = SLIDE_COLORS.info
const WHITE = SLIDE_COLORS.white
const BORDER = SLIDE_COLORS.border
const SURFACE = '#f3f5f8'
const MUTED = SLIDE_COLORS.muted
const SECTION_BG = '#e8f4f0'

const ROW_SUMMARY = 112
const ROW_PROC_MIN = 50
const ROW_INTERN_MIN = 54
const ROW_SECTION = 32

/** Layout do infográfico de copart — legenda mais larga e cabeçalhos menos compactos. */
function getCopartInfograficoLayout(colCount: number): ContratoAtualLayoutSpec {
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

function procIcon(key: CopartProcedimentoKey): React.ReactNode {
  switch (key) {
    case 'consultas_eletivas':
    case 'consultas_ps':
      return <LocalHospitalIcon />
    case 'terapias':
      return <HealthAndSafetyIcon />
    default:
      return <DescriptionIcon />
  }
}

type Props = {
  page: ComparativoCoparticipacaoPagina
}

function CopartSlideText({
  children,
  sx,
}: {
  children: React.ReactNode
  sx?: Record<string, unknown>
}) {
  return (
    <Typography component="span" sx={{ m: 0, p: 0, display: 'block', lineHeight: 1.15, fontFamily: FONT, ...sx }}>
      {children}
    </Typography>
  )
}

function LegendCell({
  icon,
  label,
  accent,
  fontSize = 9.5,
}: {
  icon: React.ReactNode
  label: string
  accent?: string
  fontSize?: number
}) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
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
          background: accent
            ? `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`
            : `linear-gradient(135deg, ${SLIDE_COLORS.mint} 0%, ${WHITE} 100%)`,
          color: accent ? WHITE : INFO,
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
          fontSize,
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
  minH,
  zebra,
  accentTop,
}: {
  children: React.ReactNode
  minH: number
  zebra?: number
  accentTop?: string
}) {
  return (
    <Box
      sx={{
        minHeight: minH,
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
        borderTop: accentTop ? `3px solid ${accentTop}` : undefined,
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

function SectionBanner({
  label,
  colCount,
  legendW,
}: {
  label: string
  colCount: number
  legendW: number
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `${legendW}px repeat(${colCount}, minmax(0, 1fr))`,
        bgcolor: SECTION_BG,
        borderLeft: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <Box
        sx={{
          gridColumn: '1 / -1',
          px: 1.25,
          py: 0.55,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        <HealthAndSafetyIcon sx={{ fontSize: 15, color: INFO }} />
        <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: PRIMARY, letterSpacing: 0.6 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  )
}

function PlanoTabHeader({
  col,
  logoUrl,
  layout,
}: {
  col: ComparativoCopartColuna
  logoUrl?: string | null
  layout: ContratoAtualLayoutSpec
}) {
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = Boolean(logoUrl) && !logoFailed && !col.placeholder
  const typo = getContratoTypography(layout)

  if (col.placeholder) {
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
          bgcolor: SURFACE,
          opacity: 0.55,
        }}
      >
        <Box
          sx={{
            minHeight: layout.logoWellH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: typo.tabOperadora,
              fontWeight: 700,
              color: MUTED,
              textAlign: 'center',
            }}
          >
            {col.operadora}
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: layout.tabH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: `3px solid ${BORDER}`,
          }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: typo.tabPlano, fontWeight: 700, color: MUTED }}>
            —
          </Typography>
        </Box>
      </Box>
    )
  }

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
            px: 0.25,
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
          }}
        >
          {col.grupo === 'atual' ? '● ATUAL' : '● MERCADO'}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: typo.tabPlano,
            fontWeight: 800,
            color: PRIMARY,
            lineHeight: 1.25,
            wordBreak: 'break-word',
            px: 0.35,
          }}
        >
          {col.planoLabel}
        </Typography>
        {col.acomodacao ? (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: typo.tabAcomodacao,
              fontWeight: 600,
              color: MUTED,
              lineHeight: 1.15,
            }}
          >
            {col.acomodacao}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

function CopartValorBadge({
  texto,
  col,
  destaque,
}: {
  texto: string
  col: ComparativoCopartColuna
  destaque?: boolean
}) {
  if (!texto || texto === '—') {
    return (
      <CopartSlideText sx={{ fontSize: 9, fontWeight: 600, color: MUTED, textAlign: 'center' }}>
        —
      </CopartSlideText>
    )
  }

  if (texto === 'Sem copay') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
          py: 0.45,
          borderRadius: 99,
          bgcolor: '#f1f5f9',
          border: `1px solid ${BORDER}`,
          maxWidth: '100%',
        }}
      >
        <CopartSlideText sx={{ fontSize: 9, fontWeight: 700, color: MUTED, textAlign: 'center', lineHeight: 1.2 }}>
          Sem copay
        </CopartSlideText>
      </Box>
    )
  }

  const bg = destaque ? `${col.tabColor}20` : `${col.tabColor}12`
  const border = `${col.tabColor}55`

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.15,
        px: 1,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: bg,
        border: `1px solid ${border}`,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <CopartSlideText
        sx={{
          fontSize: destaque ? 10 : 9,
          fontWeight: 800,
          color: PRIMARY,
          textAlign: 'center',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          width: '100%',
        }}
      >
        {texto}
      </CopartSlideText>
    </Box>
  )
}

function ResumoCopartPanel({
  colunas,
  layout,
}: {
  colunas: ComparativoCopartColuna[]
  layout: ContratoAtualLayoutSpec
}) {
  const typo = getContratoTypography(layout)
  const seloLinha = COMPARATIVO_COPART_LINHAS.find((l) => l.tipo === 'selo')!
  const formaLinha = COMPARATIVO_COPART_LINHAS.find((l) => l.tipo === 'forma')!

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `${layout.legendW}px repeat(${colunas.length}, minmax(0, 1fr))`,
        borderLeft: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        bgcolor: SURFACE,
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 1,
          minHeight: ROW_SUMMARY,
          borderRight: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          boxSizing: 'border-box',
        }}
      >
        <HealthAndSafetyIcon sx={{ fontSize: 18, color: INFO, flexShrink: 0 }} />
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaLabel, fontWeight: 800, color: PRIMARY, lineHeight: 1.25 }}>
            Coparticipação do plano
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 600, color: MUTED, lineHeight: 1.2 }}>
            Possui copay e forma de cobrança
          </Typography>
        </Box>
      </Box>
      {colunas.map((col) => {
        if (col.placeholder) {
          return (
            <Box
              key={`resumo-${col.id}`}
              sx={{
                minHeight: ROW_SUMMARY,
                py: 1,
                px: 0.65,
                borderRight: `1px solid ${BORDER}`,
                borderTop: `3px solid ${BORDER}`,
                bgcolor: SURFACE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.55,
                boxSizing: 'border-box',
              }}
            >
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 700, color: MUTED }}>
                —
              </Typography>
            </Box>
          )
        }
        const tem = col.copart.possui
        const forma = valorCopartLinha(col, formaLinha)
        const isRef = col.grupo === 'atual'
        const bg = isRef ? `${PRIMARY}08` : tem ? `${col.tabColor}10` : WHITE

        return (
          <Box
            key={`resumo-${col.id}`}
            sx={{
              minHeight: ROW_SUMMARY,
              py: 1,
              px: 0.65,
              borderRight: `1px solid ${BORDER}`,
              borderTop: `3px solid ${isRef ? PRIMARY : col.tabColor}`,
              bgcolor: bg,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <CoparticipacaoSelo
              valor={valorCopartLinha(col, seloLinha)}
              temCoparticipacao={tem}
              fontSize={typo.copart}
            />
            {tem ? (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: 0.35,
                  px: 1,
                  py: 0.45,
                  borderRadius: 99,
                  bgcolor: `${col.tabColor}18`,
                  border: `1px solid ${col.tabColor}44`,
                  maxWidth: '100%',
                }}
              >
                <PaymentsIcon sx={{ fontSize: 13, color: col.tabColor, flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: typo.faturaMicro,
                    fontWeight: 700,
                    color: PRIMARY,
                    lineHeight: 1.25,
                    wordBreak: 'break-word',
                  }}
                >
                  {forma}
                </Typography>
              </Box>
            ) : (
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: typo.faturaMicro,
                  fontWeight: 600,
                  color: MUTED,
                  lineHeight: 1.25,
                  px: 0.5,
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                }}
              >
                Plano sem coparticipação
              </Typography>
            )}
            {isRef && (
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 800, color: PRIMARY, lineHeight: 1.2 }}>
                Cenário base
              </Typography>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

function CopartInfograficoGrid({
  colunas,
  layout,
  logoUrls,
}: {
  colunas: ComparativoCopartColuna[]
  layout: ContratoAtualLayoutSpec
  logoUrls: Map<string, string>
}) {
  const typo = getContratoTypography(layout)
  const procLinhas = COMPARATIVO_COPART_LINHAS.filter((l) => l.tipo === 'procedimento')
  const internLinha = COMPARATIVO_COPART_LINHAS.find((l) => l.tipo === 'internacao')!
  const gridCols = `${layout.legendW}px repeat(${colunas.length}, minmax(0, 1fr))`

  const procStartRow = 1
  const internSectionRow = procStartRow + procLinhas.length
  const internRow = internSectionRow + 1
  const rowHeights = [
    ...procLinhas.map(() => `minmax(${ROW_PROC_MIN}px, auto)`),
    `${ROW_SECTION}px`,
    `minmax(${ROW_INTERN_MIN}px, auto)`,
  ]

  return (
    <Paper
      elevation={0}
      sx={{
        flexShrink: 0,
        width: '100%',
        bgcolor: WHITE,
        borderRadius: 3,
        p: 1.25,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(0,37,97,0.06)',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gridAutoRows: 'auto',
          border: `1px solid ${BORDER}`,
          borderRadius: '8px 8px 0 0',
        }}
      >
        <Box sx={{ gridColumn: 1, bgcolor: SURFACE, borderRight: `1px solid ${BORDER}` }} />
        {colunas.map((col, i) => (
          <Box key={col.id} sx={{ gridColumn: i + 2, minWidth: 0 }}>
            <PlanoTabHeader col={col} logoUrl={col.operadoraId ? logoUrls.get(col.operadoraId) : null} layout={layout} />
          </Box>
        ))}
      </Box>

      <ResumoCopartPanel colunas={colunas} layout={layout} />

      <SectionBanner label="DETALHAMENTO AMBULATORIAL" colCount={colunas.length} legendW={layout.legendW} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gridTemplateRows: rowHeights.join(' '),
          alignItems: 'stretch',
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderRadius: '0 0 8px 8px',
        }}
      >
        {/* procedimentos ambulatoriais */}
        {procLinhas.map((linha, idx) => {
          const procKey = linha.procedimentoKey!
          const gridRow = procStartRow + idx
          return (
            <React.Fragment key={linha.id}>
              <Box sx={{ gridColumn: 1, gridRow, display: 'flex', alignSelf: 'stretch' }}>
                <LegendCell icon={procIcon(procKey)} label={linha.label} fontSize={typo.legend} />
              </Box>
              {colunas.map((col, i) => (
                <Box key={`${linha.id}-${col.id}`} sx={{ gridColumn: i + 2, gridRow, minWidth: 0 }}>
                  <DataCell minH={ROW_PROC_MIN} zebra={idx}>
                    <CopartValorBadge texto={valorCopartLinha(col, linha)} col={col} />
                  </DataCell>
                </Box>
              ))}
            </React.Fragment>
          )
        })}

        <Box sx={{ gridColumn: '1 / -1', gridRow: internSectionRow, minHeight: ROW_SECTION, bgcolor: SECTION_BG, borderBottom: `1px solid ${BORDER}`, px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <LocalHospitalIcon sx={{ fontSize: 15, color: INFO }} />
          <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: PRIMARY, letterSpacing: 0.6 }}>
            INTERNAÇÃO
          </Typography>
        </Box>

        <Box sx={{ gridColumn: 1, gridRow: internRow, display: 'flex', alignSelf: 'stretch' }}>
          <LegendCell icon={<LocalHospitalIcon />} label="Internação" accent={INFO} fontSize={typo.legend} />
        </Box>
        {colunas.map((col, i) => (
          <Box key={`intern-${col.id}`} sx={{ gridColumn: i + 2, gridRow: internRow, minWidth: 0 }}>
            <DataCell minH={ROW_INTERN_MIN} accentTop={col.tabColor}>
              <CopartValorBadge texto={valorCopartLinha(col, internLinha)} col={col} destaque />
            </DataCell>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 1, px: 0.5 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 8, color: MUTED, fontWeight: 600 }}>
          Valores conforme lançamento em propostas · {labelFormaCobrancaCopart(colunas[0]?.copart.formaCobranca ?? 'percentual')} quando aplicável
        </Typography>
      </Box>
    </Paper>
  )
}

export function ComparativoCoparticipacaoInfografico({ page }: Props) {
  const colunas = page.colunas
  const [logoUrls, setLogoUrls] = useState<Map<string, string>>(new Map())

  const layout = useMemo(() => getCopartInfograficoLayout(colunas.length), [colunas.length])

  useEffect(() => {
    const ids = colunas.filter((c) => !c.placeholder).map((c) => c.operadoraId).filter(Boolean)
    if (!ids.length) return
    let cancelled = false
    void fetchOperadoraIdsComLogo().then((idsComLogo) => {
      if (cancelled) return
      void loadOperadoraLogoObjectUrls(ids, idsComLogo).then((urls) => {
        if (!cancelled) setLogoUrls(urls)
      })
    })
    return () => {
      cancelled = true
    }
  }, [colunas])

  useEffect(() => () => revokeOperadoraLogoUrls(logoUrls), [logoUrls])

  return (
    <Box sx={{ width: '100%' }}>
      <CopartInfograficoGrid colunas={colunas} layout={layout} logoUrls={logoUrls} />
    </Box>
  )
}

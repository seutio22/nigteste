import React, { useEffect, useMemo, useState } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import PaymentsIcon from '@mui/icons-material/Payments'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import DescriptionIcon from '@mui/icons-material/Description'
import { ReembolsoSelo } from './ReembolsoSelo'
import { ReembolsoComparacaoIcon, ReembolsoComparacaoLegenda } from './ReembolsoComparacaoIcon'
import { REEMBOLSO_PROCEDIMENTOS_FIXOS } from './placementReembolso'
import {
  COMPARATIVO_REEMB_LINHAS_FIXAS,
  comparacaoReembolsoCelula,
  valorReembolsoLinha,
  type ComparacaoReembolsoVsAtual,
  type ComparativoReembColuna,
  type ComparativoReembolsoPagina,
} from './placementComparativoReembolso'
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
const REEMB_ACCENT = '#009FDF'
const WHITE = SLIDE_COLORS.white
const BORDER = SLIDE_COLORS.border
const SURFACE = '#f3f5f8'
const MUTED = SLIDE_COLORS.muted
const SECTION_BG = '#E8F4FC'

const ROW_SUMMARY = 112
const ROW_PROC_MIN = 58
const ROW_PRAZO_MIN = 44
const ROW_SECTION = 32

function getReembInfograficoLayout(colCount: number): ContratoAtualLayoutSpec {
  const base = getContratoAtualLayoutSpec(planosPorSlideFromCount(Math.max(colCount, 1)))
  const legendBoost = colCount >= 6 ? 56 : colCount >= 5 ? 48 : colCount >= 4 ? 40 : 32
  return {
    ...base,
    legendW: base.legendW + legendBoost,
    tabH: base.tabH + (colCount >= 5 ? 12 : 8),
    logoWellH: base.logoWellH + 4,
    compact: false,
  }
}

function procIcon(key: string): React.ReactNode {
  if (key === 'consultas') return <LocalHospitalIcon />
  if (key.includes('parto') || key.includes('revascularizacao')) return <HealthAndSafetyIcon />
  if (key.includes('sessao') || key.includes('terapia') || key.includes('fono') || key.includes('fisio')) {
    return <HealthAndSafetyIcon />
  }
  return <DescriptionIcon />
}

type Props = {
  page: ComparativoReembolsoPagina
  ticket: string
}

function ReembSlideText({
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
  variant = 'default',
}: {
  icon: React.ReactNode
  label: string
  accent?: string
  fontSize?: number
  variant?: 'default' | 'procedimento'
}) {
  const isProc = variant === 'procedimento'
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: isProc ? 1 : 0.85,
        px: isProc ? 1.5 : 1.25,
        py: isProc ? 0.85 : 0.65,
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
            : `linear-gradient(135deg, ${SECTION_BG} 0%, ${WHITE} 100%)`,
          color: accent ? WHITE : REEMB_ACCENT,
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
          fontSize: isProc ? Math.max(fontSize, 10) : fontSize,
          fontWeight: 700,
          color: PRIMARY,
          lineHeight: isProc ? 1.35 : 1.25,
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

function PlanoTabHeader({
  col,
  logoUrl,
  layout,
}: {
  col: ComparativoReembColuna
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
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontSize: typo.tabProduto, fontWeight: 600, color: REEMB_ACCENT, letterSpacing: 0.3, lineHeight: 1.2 }}>
          {col.grupo === 'atual' ? 'CENÁRIO ATUAL' : 'PROPOSTA · MERCADO'}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: typo.tabGrupo, fontWeight: 800, color: col.tabColor, letterSpacing: 0.4, lineHeight: 1.15 }}>
          {col.grupo === 'atual' ? '● ATUAL' : '● MERCADO'}
        </Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: typo.tabPlano, fontWeight: 800, color: PRIMARY, lineHeight: 1.25, wordBreak: 'break-word', px: 0.35 }}>
          {col.planoLabel}
        </Typography>
        {col.acomodacao ? (
          <Typography sx={{ fontFamily: FONT, fontSize: typo.tabAcomodacao, fontWeight: 600, color: MUTED, lineHeight: 1.15 }}>
            {col.acomodacao}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

function ReembValorBadge({
  texto,
  comparacao,
}: {
  texto: string
  comparacao?: ComparacaoReembolsoVsAtual | null
}) {
  if (!texto || texto === '—') {
    return (
      <ReembSlideText sx={{ fontSize: 9, fontWeight: 600, color: MUTED, textAlign: 'center' }}>
        —
      </ReembSlideText>
    )
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        px: 0.35,
      }}
    >
      <ReembolsoComparacaoIcon comparacao={comparacao} size={14} />
      <ReembSlideText
        sx={{
          fontSize: 9.5,
          fontWeight: 800,
          color: PRIMARY,
          textAlign: 'center',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          minWidth: 0,
        }}
      >
        {texto}
      </ReembSlideText>
    </Box>
  )
}

function ResumoReembolsoPanel({ colunas, layout }: { colunas: ComparativoReembColuna[]; layout: ContratoAtualLayoutSpec }) {
  const typo = getContratoTypography(layout)
  const seloLinha = COMPARATIVO_REEMB_LINHAS_FIXAS.find((l) => l.tipo === 'selo')!
  const prazoConsulta = COMPARATIVO_REEMB_LINHAS_FIXAS.find((l) => l.tipo === 'prazo_consulta')!
  const prazoProc = COMPARATIVO_REEMB_LINHAS_FIXAS.find((l) => l.tipo === 'prazo_procedimentos')!

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
      <Box sx={{ px: 1.25, py: 1, minHeight: ROW_SUMMARY, borderRight: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 0.75, boxSizing: 'border-box' }}>
        <PaymentsIcon sx={{ fontSize: 18, color: REEMB_ACCENT, flexShrink: 0 }} />
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaLabel, fontWeight: 800, color: PRIMARY, lineHeight: 1.25 }}>
            Reembolso do plano
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 600, color: MUTED, lineHeight: 1.2 }}>
            Possui reembolso e prazos
          </Typography>
        </Box>
      </Box>
      {colunas.map((col) => {
        const tem = col.temReembolso
        const isRef = col.grupo === 'atual'
        const bg = isRef ? `${PRIMARY}08` : tem ? `${REEMB_ACCENT}10` : WHITE

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
            <ReembolsoSelo valor={valorReembolsoLinha(col, seloLinha)} temReembolso={tem} fontSize={typo.copart} />
            {tem ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, maxWidth: '100%' }}>
                <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 700, color: PRIMARY, lineHeight: 1.25, wordBreak: 'break-word' }}>
                  Consulta: {valorReembolsoLinha(col, prazoConsulta)}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 600, color: MUTED, lineHeight: 1.25, wordBreak: 'break-word' }}>
                  Proc.: {valorReembolsoLinha(col, prazoProc)}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontFamily: FONT, fontSize: typo.faturaMicro, fontWeight: 600, color: MUTED, lineHeight: 1.25 }}>
                Plano sem reembolso
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

function ReembInfograficoGrid({
  colunas,
  layout,
  logoUrls,
  linhas,
}: {
  colunas: ComparativoReembColuna[]
  layout: ContratoAtualLayoutSpec
  logoUrls: Map<string, string>
  linhas: ComparativoReembolsoPagina['linhas']
}) {
  const typo = getContratoTypography(layout)
  const colAtual = colunas.find((c) => c.grupo === 'atual' && !c.placeholder)
  const prazoLinhas = linhas.filter((l) => l.tipo === 'prazo_consulta' || l.tipo === 'prazo_procedimentos')
  const procLinhas = linhas.filter((l) => l.tipo === 'procedimento' || l.tipo === 'custom')
  const gridCols = `${layout.legendW}px repeat(${colunas.length}, minmax(0, 1fr))`

  const rowHeights = [
    ...prazoLinhas.map(() => `minmax(${ROW_PRAZO_MIN}px, auto)`),
    `${ROW_SECTION}px`,
    ...procLinhas.map(() => `minmax(${ROW_PROC_MIN}px, auto)`),
  ]

  let gridRow = 1

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
      <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, gridAutoRows: 'auto', border: `1px solid ${BORDER}`, borderRadius: '8px 8px 0 0' }}>
        <Box sx={{ gridColumn: 1, bgcolor: SURFACE, borderRight: `1px solid ${BORDER}` }} />
        {colunas.map((col, i) => (
          <Box key={col.id} sx={{ gridColumn: i + 2, minWidth: 0 }}>
            <PlanoTabHeader col={col} logoUrl={col.operadoraId ? logoUrls.get(col.operadoraId) : null} layout={layout} />
          </Box>
        ))}
      </Box>

      <ResumoReembolsoPanel colunas={colunas} layout={layout} />

      <Box sx={{ gridColumn: '1 / -1', bgcolor: SECTION_BG, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <PaymentsIcon sx={{ fontSize: 15, color: REEMB_ACCENT }} />
        <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: PRIMARY, letterSpacing: 0.6 }}>
          PRAZOS DE REEMBOLSO
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gridTemplateRows: rowHeights.join(' '),
          alignItems: 'stretch',
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderBottom: procLinhas.length ? undefined : `1px solid ${BORDER}`,
          borderRadius: procLinhas.length ? undefined : '0 0 8px 8px',
        }}
      >
        {prazoLinhas.map((linha, idx) => {
          const row = gridRow++
          return (
            <React.Fragment key={linha.id}>
              <Box sx={{ gridColumn: 1, gridRow: row, display: 'flex', alignSelf: 'stretch' }}>
                <LegendCell icon={<PaymentsIcon />} label={linha.label} accent={REEMB_ACCENT} fontSize={typo.legend} />
              </Box>
              {colunas.map((col, i) => (
                <Box key={`${linha.id}-${col.id}`} sx={{ gridColumn: i + 2, gridRow: row, minWidth: 0 }}>
                  <DataCell minH={ROW_PRAZO_MIN} zebra={idx}>
                    <ReembValorBadge texto={valorReembolsoLinha(col, linha)} />
                  </DataCell>
                </Box>
              ))}
            </React.Fragment>
          )
        })}

        {procLinhas.length > 0 && (
          <Box sx={{ gridColumn: '1 / -1', gridRow: gridRow++, minHeight: ROW_SECTION, bgcolor: SECTION_BG, borderBottom: `1px solid ${BORDER}`, px: 1.25, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <LocalHospitalIcon sx={{ fontSize: 15, color: REEMB_ACCENT }} />
            <Typography sx={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: PRIMARY, letterSpacing: 0.6 }}>
              VALORES POR PROCEDIMENTO
            </Typography>
          </Box>
        )}

        {procLinhas.map((linha, idx) => {
          const row = gridRow++
          const procKey = linha.procedimentoKey ?? ''
          const labelFixo = REEMBOLSO_PROCEDIMENTOS_FIXOS.find((p) => p.key === procKey)?.label ?? linha.label
          return (
            <React.Fragment key={linha.id}>
              <Box sx={{ gridColumn: 1, gridRow: row, display: 'flex', alignSelf: 'stretch' }}>
                <LegendCell
                  icon={procIcon(procKey)}
                  label={labelFixo}
                  fontSize={typo.legend}
                  variant="procedimento"
                />
              </Box>
              {colunas.map((col, i) => (
                <Box key={`${linha.id}-${col.id}`} sx={{ gridColumn: i + 2, gridRow: row, minWidth: 0 }}>
                  <DataCell minH={ROW_PROC_MIN} zebra={idx} accentTop={linha.procedimentoKey === 'consultas' ? col.tabColor : undefined}>
                    <ReembValorBadge
                      texto={valorReembolsoLinha(col, linha)}
                      comparacao={comparacaoReembolsoCelula(col, linha, colAtual)}
                    />
                  </DataCell>
                </Box>
              ))}
            </React.Fragment>
          )
        })}
      </Box>

      {procLinhas.length > 0 && (
        <Box sx={{ borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, borderRadius: '0 0 8px 8px', height: 0 }} />
      )}

      <Box sx={{ mt: 1, px: 0.5, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 8, color: MUTED, fontWeight: 600 }}>
          Valores conforme lançamento em propostas · prazos em dias úteis/corridos conforme operadora
        </Typography>
        {colAtual ? (
          <Typography
            component="div"
            sx={{ fontFamily: FONT, fontSize: 8, color: MUTED, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}
          >
            Comparação vs cenário atual:
            <ReembolsoComparacaoLegenda fontSize={8} />
          </Typography>
        ) : null}
      </Box>
    </Paper>
  )
}

export function ComparativoReembolsoInfografico({ page, ticket }: Props) {
  const colunas = page.colunas
  const [logoUrls, setLogoUrls] = useState<Map<string, string>>(new Map())
  const layout = useMemo(() => getReembInfograficoLayout(colunas.length), [colunas.length])

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
      {page.grupoLabel ? (
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 800,
            color: PRIMARY,
            mb: 0.75,
            letterSpacing: 0.2,
          }}
        >
          Plano equivalente · {page.grupoLabel}
        </Typography>
      ) : null}
      <ReembInfograficoGrid colunas={colunas} layout={layout} logoUrls={logoUrls} linhas={page.linhas} />
      {page.totalPages > 1 && (
        <Typography sx={{ fontFamily: FONT, fontSize: 9, color: MUTED, fontWeight: 700, textAlign: 'right', mt: 1 }}>
          Página {page.pageIndex + 1} de {page.totalPages} · {ticket}
        </Typography>
      )}
    </Box>
  )
}

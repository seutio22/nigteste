import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
  Alert,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import StorefrontIcon from '@mui/icons-material/Storefront'
import type { CotacaoFormState } from './CotacaoFormFields'
import type { Operadora } from '../../../types/masterData'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
  type QuadroMercadoVisibilidade,
} from './placementAguardandoOperadora'
import {
  buildMercadoQuadroBuckets,
  MERCADO_CLASSIFICACAO_LABELS,
  QUADRO_MERCADO_LABELS,
  quadroVisivel,
} from './placementMercadoQuadro'
import type { PlacementPresentationMode } from './placementAnaliseBase'
import {
  exportSlidePng,
  PlacementSlideFrame,
  PlacementSlideHeader,
  SLIDE_FONT_FAMILY,
  SLIDE_W,
  TABLE_GRAY,
  TABLE_NAVY,
} from './placementSlideShell'
import { SLIDE_COLORS } from './placementSlideTheme'

const FONT = SLIDE_FONT_FAMILY

type Props = {
  form: CotacaoFormState
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
  quadroMercado: QuadroMercadoVisibilidade
  onQuadroChange?: (next: QuadroMercadoVisibilidade) => void
  disabled?: boolean
  showToggles?: boolean
  presentationMode?: PlacementPresentationMode
}

const QUAD_STYLES = [
  {
    key: 'showFornecedorAtual' as const,
    title: QUADRO_MERCADO_LABELS.showFornecedorAtual,
    classificacao: 'fornecedor_atual' as const,
    headerBg: SLIDE_COLORS.primary,
    accent: SLIDE_COLORS.infoLight,
  },
  {
    key: 'showMercadoConsultado' as const,
    title: QUADRO_MERCADO_LABELS.showMercadoConsultado,
    classificacao: 'mercado_consultado' as const,
    headerBg: SLIDE_COLORS.info,
    accent: '#009FDF',
  },
  {
    key: 'showForaPerfilDeclinado' as const,
    title: QUADRO_MERCADO_LABELS.showForaPerfilDeclinado,
    classificacao: 'fora_perfil_declinado' as const,
    headerBg: '#E87B35',
    accent: '#F4B740',
  },
  {
    key: 'showNaoApresentada' as const,
    title: QUADRO_MERCADO_LABELS.showNaoApresentada,
    classificacao: 'nao_apresentada' as const,
    headerBg: '#6b7a80',
    accent: '#9aa5ab',
  },
]

function MercadoQuadroPanel({
  title,
  items,
  headerBg,
  accent,
  detailed,
}: {
  title: string
  items: string[]
  headerBg: string
  accent: string
  detailed?: boolean
}) {
  return (
    <Box
      sx={{
        border: `1px solid ${SLIDE_COLORS.border}`,
        borderRadius: 1.5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: SLIDE_COLORS.white,
        boxShadow: '0 2px 8px rgba(0,37,97,0.06)',
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 0.75,
          bgcolor: headerBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: detailed ? 12 : 9,
            fontWeight: 800,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            minWidth: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: '#fff' }}>
            {items.length}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ flex: 1, p: detailed ? 1.5 : 1, overflow: 'auto', minHeight: detailed ? 120 : 0 }}>
        {items.length ? (
          <Stack gap={detailed ? 0.75 : 0.5}>
            {items.map((nome) => (
              <Box
                key={nome}
                sx={{
                  px: detailed ? 1.25 : 1,
                  py: detailed ? 0.75 : 0.5,
                  borderRadius: 1,
                  bgcolor: TABLE_GRAY,
                  borderLeft: `3px solid ${accent}`,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: detailed ? 13 : 10,
                    fontWeight: 700,
                    color: TABLE_NAVY,
                    lineHeight: 1.2,
                  }}
                >
                  {nome}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              height: '100%',
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: 9, color: SLIDE_COLORS.muted, fontStyle: 'italic' }}>
              Nenhum fornecedor
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function MercadoConsultadoSlide({
  form,
  buckets,
  quadroMercado,
  visibleQuads,
}: {
  form: CotacaoFormState
  buckets: ReturnType<typeof buildMercadoQuadroBuckets>
  quadroMercado: QuadroMercadoVisibilidade
  visibleQuads: typeof QUAD_STYLES
}) {
  const bucketMap = {
    fornecedor_atual: buckets.fornecedorAtual,
    mercado_consultado: buckets.mercadoConsultado,
    fora_perfil_declinado: buckets.foraPerfilDeclinado,
    nao_apresentada: buckets.naoApresentada,
  }

  const totalMercado =
    buckets.fornecedorAtual.length +
    buckets.mercadoConsultado.length +
    buckets.foraPerfilDeclinado.length +
    buckets.naoApresentada.length

  return (
    <PlacementSlideFrame>
      <PlacementSlideHeader
        title="Mercado Consultado"
        subtitle="Quadro comparativo de fornecedores · base para apresentação do estudo"
        badge={form.ticket || undefined}
        icon={<StorefrontIcon sx={{ fontSize: 22, color: '#fff' }} />}
      />
      <Box sx={{ flex: 1, minHeight: 0, px: 1.5, py: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 0.5,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: TABLE_NAVY }}>
            Fornecedores mapeados no estudo
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 9, color: SLIDE_COLORS.muted }}>
            {totalMercado} operadora(s) · {visibleQuads.length} quadro(s) visível(is)
          </Typography>
        </Box>

        {visibleQuads.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: TABLE_GRAY,
              borderRadius: 1.5,
            }}
          >
            <Typography sx={{ fontFamily: FONT, fontSize: 11, color: SLIDE_COLORS.muted }}>
              Ative ao menos um quadro para visualizar o slide.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: visibleQuads.length === 1 ? '1fr' : '1fr 1fr',
              gridTemplateRows: visibleQuads.length <= 2 ? '1fr' : '1fr 1fr',
              gap: 1,
            }}
          >
            {visibleQuads.map((q) => (
              <MercadoQuadroPanel
                key={q.key}
                title={q.title}
                items={bucketMap[q.classificacao]}
                headerBg={q.headerBg}
                accent={q.accent}
              />
            ))}
          </Box>
        )}

        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: 7.5,
            color: SLIDE_COLORS.muted,
            flexShrink: 0,
            lineHeight: 1.35,
            px: 0.5,
          }}
        >
          Classificação: {Object.values(MERCADO_CLASSIFICACAO_LABELS).join(' · ')}. Ajuste na etapa Aguardando
          operadora.
        </Typography>
      </Box>
    </PlacementSlideFrame>
  )
}

function MercadoConsultadoDetalhe({
  form,
  buckets,
  quadroMercado,
  visibleQuads,
}: {
  form: CotacaoFormState
  buckets: ReturnType<typeof buildMercadoQuadroBuckets>
  quadroMercado: QuadroMercadoVisibilidade
  visibleQuads: typeof QUAD_STYLES
}) {
  const bucketMap = {
    fornecedor_atual: buckets.fornecedorAtual,
    mercado_consultado: buckets.mercadoConsultado,
    fora_perfil_declinado: buckets.foraPerfilDeclinado,
    nao_apresentada: buckets.naoApresentada,
  }

  const todosFornecedores = [
    ...buckets.fornecedorAtual.map((nome) => ({ nome, classificacao: 'fornecedor_atual' as const })),
    ...buckets.mercadoConsultado.map((nome) => ({ nome, classificacao: 'mercado_consultado' as const })),
    ...buckets.foraPerfilDeclinado.map((nome) => ({ nome, classificacao: 'fora_perfil_declinado' as const })),
    ...buckets.naoApresentada.map((nome) => ({ nome, classificacao: 'nao_apresentada' as const })),
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const totalMercado = todosFornecedores.length

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          background: `linear-gradient(90deg, ${SLIDE_COLORS.primary} 0%, ${SLIDE_COLORS.info} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" alignItems="center" gap={1.25}>
          <StorefrontIcon sx={{ fontSize: 28, color: '#fff' }} />
          <Box>
            <Typography sx={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
              Mercado Consultado
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
              Visão detalhada · {form.ticket || 'cotação'}
            </Typography>
          </Box>
        </Stack>
        <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {totalMercado} fornecedor(es) mapeados
        </Typography>
      </Box>

      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          {QUAD_STYLES.map((q) => (
            <Paper key={q.key} variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {q.title}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: q.headerBg, lineHeight: 1.2 }}>
                {bucketMap[q.classificacao].length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {quadroMercado[q.key] ? 'visível no slide' : 'oculto'}
              </Typography>
            </Paper>
          ))}
        </Box>

        {visibleQuads.length === 0 ? (
          <Alert severity="warning">Ative ao menos um quadro para visualizar os fornecedores.</Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            {visibleQuads.map((q) => (
              <MercadoQuadroPanel
                key={q.key}
                title={q.title}
                items={bucketMap[q.classificacao]}
                headerBg={q.headerBg}
                accent={q.accent}
                detailed
              />
            ))}
          </Box>
        )}

        <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Lista completa de fornecedores
            </Typography>
          </Box>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.100' }}>
                <Box component="th" sx={{ textAlign: 'left', px: 2, py: 1, fontSize: 12 }}>
                  Fornecedor
                </Box>
                <Box component="th" sx={{ textAlign: 'left', px: 2, py: 1, fontSize: 12 }}>
                  Classificação
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              {todosFornecedores.map((row) => (
                <Box
                  component="tr"
                  key={`${row.classificacao}-${row.nome}`}
                  sx={{ borderTop: 1, borderColor: 'divider' }}
                >
                  <Box component="td" sx={{ px: 2, py: 1, fontSize: 13, fontWeight: 600 }}>
                    {row.nome}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1, fontSize: 13, color: 'text.secondary' }}>
                    {MERCADO_CLASSIFICACAO_LABELS[row.classificacao]}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Paper>
  )
}

export const MercadoConsultadoSlideDashboard = React.memo(function MercadoConsultadoSlideDashboard({
  form,
  operadoras,
  operadorasById,
  quadroMercado,
  onQuadroChange,
  disabled,
  showToggles = true,
  presentationMode = 'slide',
}: Props) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [slideReady, setSlideReady] = useState(false)

  const state = useMemo(
    () =>
      ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById
      ),
    [form, operadoras, operadorasById]
  )

  const buckets = useMemo(
    () => buildMercadoQuadroBuckets(form, state, operadoras, operadorasById),
    [form, state, operadoras, operadorasById]
  )

  const visibleQuads = QUAD_STYLES.filter((q) => quadroVisivel(quadroMercado, q.classificacao))
  const isSlide = presentationMode === 'slide'

  useEffect(() => {
    const t = window.setTimeout(() => setSlideReady(true), 500)
    return () => window.clearTimeout(t)
  }, [quadroMercado, buckets])

  async function handleExport() {
    const slide = exportRef.current?.querySelector('[data-slide-inner]') as HTMLElement | null
    if (!slide) return
    setExporting(true)
    try {
      await new Promise((r) => setTimeout(r, slideReady ? 400 : 800))
      await exportSlidePng(
        slide,
        `mercado-consultado-${(form.ticket || 'cotacao').replace(/\s+/g, '-').slice(0, 20)}.png`
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <Stack gap={2}>
      {showToggles && onQuadroChange && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Exibir quadros {isSlide ? 'no slide' : 'na visão detalhada'}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {QUAD_STYLES.map((c) => (
              <FormControlLabel
                key={c.key}
                control={
                  <Switch
                    size="small"
                    checked={quadroMercado[c.key]}
                    disabled={disabled}
                    onChange={(e) => onQuadroChange({ ...quadroMercado, [c.key]: e.target.checked })}
                  />
                }
                label={c.title}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {isSlide ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <SlideshowIcon sx={{ color: SLIDE_COLORS.info, fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                Slide 16:9 · Mercado consultado — exporte em PNG para apresentação.
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="contained"
              startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
              disabled={disabled || exporting || !slideReady || visibleQuads.length === 0}
              onClick={() => void handleExport()}
              sx={{ bgcolor: SLIDE_COLORS.info, fontFamily: FONT, '&:hover': { bgcolor: SLIDE_COLORS.primary } }}
            >
              Baixar slide (PNG)
            </Button>
          </Box>

          <Box sx={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
            <Box ref={exportRef} data-export-root sx={{ width: SLIDE_W, maxWidth: '100%', flexShrink: 0 }}>
              <MercadoConsultadoSlide
                form={form}
                buckets={buckets}
                quadroMercado={quadroMercado}
                visibleQuads={visibleQuads}
              />
            </Box>
          </Box>
        </>
      ) : (
        <MercadoConsultadoDetalhe
          form={form}
          buckets={buckets}
          quadroMercado={quadroMercado}
          visibleQuads={visibleQuads}
        />
      )}
    </Stack>
  )
})

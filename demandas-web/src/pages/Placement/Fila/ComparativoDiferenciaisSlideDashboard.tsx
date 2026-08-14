import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DownloadIcon from '@mui/icons-material/Download'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementPresentationMode } from './placementAnaliseBase'
import { buildComparativoDiferencialPages, filterDiferencialPages } from './placementComparativoDiferenciais'
import { ComparativoDiferenciaisInfografico } from './ComparativoDiferenciaisInfografico'
import { emptyComparativoEstudoConfig } from './placementAguardandoOperadora'
import { filterComparativoColunas } from './placementComparativoVisibilidade'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { exportSlidePng, SLIDE_W } from './placementSlideShell'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'

const FONT = SLIDE_FONT

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  disabled?: boolean
  presentationMode?: PlacementPresentationMode
}

export function ComparativoDiferenciaisSlideDashboard({
  cotacaoId,
  form,
  disabled,
  presentationMode = 'slide',
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [slideReady, setSlideReady] = useState(false)

  const config = emptyComparativoEstudoConfig
  const isSlide = presentationMode === 'slide'
  const ticket = form.ticket || cotacaoId

  const pages = useMemo(() => {
    const rawPages = buildComparativoDiferencialPages(
      form,
      operadoras,
      operadorasById,
      config.incluirColunaAtual
    )
    if (!rawPages.length) return []
    const colunasVisiveis = filterComparativoColunas(rawPages[0].colunas, config.colunasOcultas)
    return filterDiferencialPages(rawPages, colunasVisiveis)
  }, [form, operadoras, operadorasById, config.incluirColunaAtual, config.colunasOcultas])

  useEffect(() => {
    const t = window.setTimeout(() => setSlideReady(true), 500)
    return () => window.clearTimeout(t)
  }, [pages])

  async function handleExport() {
    const slide = exportRef.current?.querySelector('[data-slide-inner]') as HTMLElement | null
    if (!slide) return
    setExporting(true)
    try {
      await new Promise((r) => setTimeout(r, slideReady ? 400 : 800))
      await exportSlidePng(
        slide,
        `comparativo-${ticket.replace(/\s+/g, '-').slice(0, 24)}.png`
      )
    } finally {
      setExporting(false)
    }
  }

  if (!pages.length || !pages[0]?.colunas.length) {
    return (
      <Alert severity="info">
        Cadastre propostas por fornecedor na etapa Aguardando operadora e preencha diferenciais e condições
        contratuais em Consolidando dados para gerar este slide.
      </Alert>
    )
  }

  const slideBody = (
    <Stack spacing={2.5}>
      {pages.map((page, i) => (
        <ComparativoDiferenciaisInfografico key={`slide-${page.secao}-${i}`} page={page} ticket={ticket} />
      ))}
    </Stack>
  )

  return (
    <Stack gap={2}>
      {isSlide && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <SlideshowIcon sx={{ color: SLIDE_COLORS.info, fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              Comparativo · {pages[0].colunas.length} fornecedor(es) · {pages.length} slide(s) · exporte em PNG.
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="contained"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={disabled || exporting || !slideReady}
            onClick={() => void handleExport()}
            sx={{ bgcolor: SLIDE_COLORS.info, fontFamily: FONT, '&:hover': { bgcolor: SLIDE_COLORS.primary } }}
          >
            Baixar slide (PNG)
          </Button>
        </Box>
      )}

      {!isSlide && (
        <Stack direction="row" alignItems="center" gap={1}>
          <AutoAwesomeIcon sx={{ color: SLIDE_COLORS.info, fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            Visão detalhada do comparativo (diferenciais e condições contratuais).
          </Typography>
        </Stack>
      )}

      <Box sx={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <Box
          ref={exportRef}
          data-export-root
          sx={{
            width: isSlide ? SLIDE_W : '100%',
            maxWidth: '100%',
            flexShrink: 0,
          }}
        >
          {slideBody}
        </Box>
      </Box>
    </Stack>
  )
}

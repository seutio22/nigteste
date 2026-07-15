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

  const page = useMemo(() => {
    const pages = buildComparativoDiferencialPages(
      form,
      operadoras,
      operadorasById,
      config.incluirColunaAtual
    )
    const raw = pages[0]
    if (!raw) return null
    const colunasVisiveis = filterComparativoColunas(raw.colunas, config.colunasOcultas)
    const filtered = filterDiferencialPages([raw], colunasVisiveis)
    return filtered[0] ?? null
  }, [form, operadoras, operadorasById, config.incluirColunaAtual, config.colunasOcultas])

  useEffect(() => {
    const t = window.setTimeout(() => setSlideReady(true), 500)
    return () => window.clearTimeout(t)
  }, [page])

  async function handleExport() {
    const slide = exportRef.current?.querySelector('[data-slide-inner]') as HTMLElement | null
    if (!slide) return
    setExporting(true)
    try {
      await new Promise((r) => setTimeout(r, slideReady ? 400 : 800))
      await exportSlidePng(
        slide,
        `diferenciais-${ticket.replace(/\s+/g, '-').slice(0, 24)}.png`
      )
    } finally {
      setExporting(false)
    }
  }

  if (!page?.colunas.length) {
    return (
      <Alert severity="info">
        Cadastre propostas por fornecedor na etapa Aguardando operadora e preencha os diferenciais em
        Consolidando dados para gerar este slide.
      </Alert>
    )
  }

  const slideBody = (
    <ComparativoDiferenciaisInfografico page={page} ticket={ticket} />
  )

  return (
    <Stack gap={2}>
      {isSlide && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <SlideshowIcon sx={{ color: SLIDE_COLORS.info, fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              Comparativo de diferenciais · {page.colunas.length} fornecedor(es) · exporte em PNG para apresentação.
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
            Visão detalhada do comparativo de diferenciais.
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

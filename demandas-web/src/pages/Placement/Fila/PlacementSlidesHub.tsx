import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress, List, ListItemButton, ListItemText } from '@mui/material'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
  type QuadroMercadoVisibilidade,
} from './placementAguardandoOperadora'
import {
  ensureComunicarMercadoState,
  mercadoFornecedoresFromForm,
  parseComunicarMercadoFromKickOff,
} from './placementComunicarMercado'
import { patchKickOffInForm } from './placementPatchKickOff'
import { mergeSavedKickOffIntoApiCotacao } from './placementKickOffPersist'
import {
  defaultPlacementSlideId,
  PLACEMENT_SLIDES_CATALOG,
  presentationModeForSlide,
  type PlacementSlideId,
  type PlacementSlideViewMode,
} from './placementSlidesCatalog'
import {
  propostaDeckCatalog,
  propostaDeckNavLabel,
  propostaDeckNavSecondary,
} from './placementPropostaDeck'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { api } from '../../../lib/api.local'
import { ComparativoEstudoDashboard } from './ComparativoEstudoDashboard'
import { PlacementSlideViewToolbar } from './PlacementSlideViewToolbar'

const BeneficiariosResumoDashboard = lazy(() =>
  import('./BeneficiariosResumoDashboard').then((m) => ({ default: m.BeneficiariosResumoDashboard }))
)
const ContratoAtualDashboard = lazy(() =>
  import('./ContratoAtualDashboard').then((m) => ({ default: m.ContratoAtualDashboard }))
)
const BeneficiariosLocalidadeDashboard = lazy(() =>
  import('./BeneficiariosLocalidadeDashboard').then((m) => ({ default: m.BeneficiariosLocalidadeDashboard }))
)
const MercadoConsultadoSlideDashboard = lazy(() =>
  import('./MercadoConsultadoSlideDashboard').then((m) => ({ default: m.MercadoConsultadoSlideDashboard }))
)
const ComparativoDiferenciaisSlideDashboard = lazy(() =>
  import('./ComparativoDiferenciaisSlideDashboard').then((m) => ({
    default: m.ComparativoDiferenciaisSlideDashboard,
  }))
)

function SlideLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
      <CircularProgress size={32} />
    </Box>
  )
}

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  workflowStageKey: string
  disabled?: boolean
  onChange?: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  initialSlideId?: PlacementSlideId
  /** Ordem customizada (ex.: deck da proposta). */
  slideOrder?: PlacementSlideId[]
  /** Oculta toolbar compacto/detalhado (força modo apresentação). */
  forceCompactSlide?: boolean
  /** Título/contexto na lista lateral. */
  deckMode?: 'default' | 'proposta'
}

export function PlacementSlidesHub({
  cotacaoId,
  form,
  workflowStageKey,
  disabled,
  onChange,
  onPersisted,
  initialSlideId,
  slideOrder,
  forceCompactSlide,
  deckMode = 'default',
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)

  const catalog = useMemo(() => {
    if (deckMode === 'proposta' || slideOrder?.length) {
      return propostaDeckCatalog(slideOrder)
    }
    return PLACEMENT_SLIDES_CATALOG
  }, [deckMode, slideOrder])

  const [slideId, setSlideId] = useState<PlacementSlideId>(
    () => initialSlideId ?? catalog[0]?.id ?? defaultPlacementSlideId(workflowStageKey)
  )
  const [viewBySlide, setViewBySlide] = useState<Partial<Record<PlacementSlideId, PlacementSlideViewMode>>>({})

  useEffect(() => {
    const fallback = catalog[0]?.id ?? defaultPlacementSlideId(workflowStageKey)
    const next = initialSlideId && catalog.some((s) => s.id === initialSlideId) ? initialSlideId : fallback
    setSlideId(next)
  }, [workflowStageKey, initialSlideId, catalog])

  const viewMode: PlacementSlideViewMode = forceCompactSlide
    ? 'compacto'
    : viewBySlide[slideId] ?? 'compacto'
  const presentationMode = presentationModeForSlide(slideId, viewMode)

  const kickOffRaw = form.kickOffEstrategia

  const fornecedores = useMemo(
    () => mercadoFornecedoresFromForm(form, operadoras, operadorasById),
    [form.itens, form.operadorasSugestaoIds, kickOffRaw?.mercadoAnalisado, operadoras, operadorasById]
  )

  const aguardandoOperadora = useMemo(() => {
    const comunicar = ensureComunicarMercadoState(
      parseComunicarMercadoFromKickOff(kickOffRaw),
      form,
      operadoras,
      operadorasById
    )
    return ensureAguardandoOperadoraState(
      parseAguardandoOperadoraFromKickOff(kickOffRaw),
      form,
      operadoras,
      operadorasById,
      comunicar
    )
  }, [kickOffRaw, form, operadoras, operadorasById])

  function persistQuadroMercado(nextQuadro: QuadroMercadoVisibilidade) {
    if (!onChange) return
    const nextAg = { ...aguardandoOperadora, quadroMercado: nextQuadro }
    const nextForm = patchKickOffInForm(form, { aguardandoOperadora: nextAg }, fornecedores)
    onChange(nextForm)
    if (!cotacaoId) return
    const kickOff = nextForm.kickOffEstrategia!
    void (async () => {
      try {
        const updated = await api.put(`/placement/cotacoes/${cotacaoId}`, { kickOffEstrategia: kickOff })
        onPersisted?.(mergeSavedKickOffIntoApiCotacao(updated, kickOff))
      } catch {
        /* panel principal já trata erro */
      }
    })()
  }

  const slideContent = (() => {
    switch (slideId) {
      case 'grupo_elegivel':
        return (
          <BeneficiariosResumoDashboard
            cotacaoId={cotacaoId}
            disabled={disabled}
            presentationMode={presentationMode}
          />
        )
      case 'contrato_atual':
        return (
          <ContratoAtualDashboard
            cotacaoId={cotacaoId}
            disabled={disabled}
            presentationMode={presentationMode}
          />
        )
      case 'localidades':
        return (
          <BeneficiariosLocalidadeDashboard
            cotacaoId={cotacaoId}
            disabled={disabled}
            presentationMode={presentationMode}
          />
        )
      case 'mercado_quadro':
        return (
          <MercadoConsultadoSlideDashboard
            form={form}
            operadoras={operadoras}
            operadorasById={operadorasById}
            quadroMercado={aguardandoOperadora.quadroMercado}
            onQuadroChange={onChange ? persistQuadroMercado : undefined}
            disabled={disabled}
            showToggles={!!onChange}
            presentationMode={presentationMode}
          />
        )
      case 'comparativo_propostas':
        return (
          <ComparativoEstudoDashboard
            variant="embed"
            slidesViewMode={viewMode}
            cotacaoId={cotacaoId}
            form={form}
            disabled={disabled}
            onChange={onChange}
            onPersisted={onPersisted}
          />
        )
      case 'comparativo_diferenciais':
        return (
          <ComparativoDiferenciaisSlideDashboard
            cotacaoId={cotacaoId}
            form={form}
            disabled={disabled}
            presentationMode={presentationMode}
          />
        )
      default:
        return null
    }
  })()

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        minHeight: 0,
        width: '100%',
      }}
    >
      <Box
        sx={{
          width: { xs: 220, md: 280 },
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
          overflow: 'auto',
        }}
      >
        <List dense disablePadding>
          {catalog.map((slide) => (
            <ListItemButton
              key={slide.id}
              selected={slideId === slide.id}
              onClick={() => setSlideId(slide.id)}
            >
              <ListItemText
                primary={
                  deckMode === 'proposta' ? propostaDeckNavLabel(slide.id) : slide.label
                }
                secondary={
                  deckMode === 'proposta'
                    ? propostaDeckNavSecondary(slide.id)
                    : slide.description
                }
                primaryTypographyProps={{
                  fontWeight: slideId === slide.id ? 700 : 500,
                  fontSize: 15,
                }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          bgcolor: 'background.default',
        }}
      >
        {!forceCompactSlide && (
          <PlacementSlideViewToolbar
            value={viewMode}
            disabled={disabled}
            onChange={(next) => setViewBySlide((prev) => ({ ...prev, [slideId]: next }))}
          />
        )}
        <Box
          sx={{
            flex: 1,
            p: { xs: 1.5, md: 2 },
            overflow: 'auto',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <Suspense fallback={<SlideLoading />}>{slideContent}</Suspense>
        </Box>
      </Box>
    </Box>
  )
}

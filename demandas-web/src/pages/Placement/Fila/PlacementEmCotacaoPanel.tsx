import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Typography,
} from '@mui/material'
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { api } from '../../../lib/api.local'
import { BeneficiariosBaseModule } from './BeneficiariosBaseModule'
import { PlacementComunicarMercadoPanel } from './PlacementComunicarMercadoPanel'
import type { CotacaoFormState } from './CotacaoFormFields'
import { useBeneficiariosValidacaoContext } from './useBeneficiariosValidacaoContext'
import { PlacementAnaliseBasePanel } from './PlacementAnaliseBasePanel'
import {
  analiseSectionFromLegacySubetapa,
} from './placementAnaliseBase'
import {
  EM_COTACAO_SUBETAPAS,
  VALIDACAO_SUBETAPAS,
  clampSubetapaForValidacao,
  nextEmCotacaoSubetapa,
  nextValidacaoSubetapa,
  normalizeEmCotacaoSubetapa,
  persistSubetapaForAnaliseBase,
  subetapaIndexInList,
  type EmCotacaoSubetapaKey,
  type EmCotacaoSubetapaMeta,
} from './placementEmCotacaoWorkflow'
import {
  PlacementNavBackButton,
  PlacementNavForwardButton,
  PlacementWorkflowNavActions,
  PlacementWorkflowNavLabel,
  PlacementWorkflowNavRow,
  PlacementWorkflowNavShell,
  PlacementWorkflowNavStatus,
  PlacementWorkflowStageLine,
} from './placementWorkflowNav'
import { PlacementWorkflowStepsRail } from './PlacementWorkflowStepsRail'

export type SubetapasPanelVariant = 'validacao' | 'em_cotacao'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  variant?: SubetapasPanelVariant
  subetapaInicial?: string | null
  disabled?: boolean
  onChange?: (next: CotacaoFormState) => void
  analistaResponsavelNome?: string
  onSubetapaChange?: (key: EmCotacaoSubetapaKey) => void
  onBeneficiariosTotalChange?: (total: number) => void
  onPersisted?: (apiCotacao: unknown) => void
}

export function PlacementEmCotacaoPanel({
  cotacaoId,
  form,
  variant = 'em_cotacao',
  subetapaInicial,
  disabled,
  onChange,
  analistaResponsavelNome,
  onSubetapaChange,
  onBeneficiariosTotalChange,
  onPersisted,
}: Props) {
  const subetapas: EmCotacaoSubetapaMeta[] =
    variant === 'validacao' ? VALIDACAO_SUBETAPAS : EM_COTACAO_SUBETAPAS
  const normalizeInitial = (value: string | null | undefined) =>
    variant === 'validacao' ? clampSubetapaForValidacao(value) : normalizeEmCotacaoSubetapa(value)
  const nextSubetapa =
    variant === 'validacao' ? nextValidacaoSubetapa : nextEmCotacaoSubetapa

  const [subetapa, setSubetapa] = useState<EmCotacaoSubetapaKey>(() => normalizeInitial(subetapaInicial))
  const [beneficiariosTotal, setBeneficiariosTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { context: validationContext, loading: validationContextLoading } =
    useBeneficiariosValidacaoContext(form, cotacaoId)

  const analiseInitialSection = useMemo(
    () => analiseSectionFromLegacySubetapa(subetapaInicial),
    [subetapaInicial]
  )
  useEffect(() => {
    setSubetapa(normalizeInitial(subetapaInicial))
  }, [subetapaInicial, variant])

  useEffect(() => {
    if (!cotacaoId) return
    let cancelled = false
    void (async () => {
      try {
        const resp = (await api.get(`/placement/cotacoes/${cotacaoId}/beneficiarios`)) as {
          total?: number
          beneficiarios?: unknown[]
        }
        if (cancelled) return
        const n = resp?.total ?? resp?.beneficiarios?.length ?? 0
        setBeneficiariosTotal(n)
        onBeneficiariosTotalChange?.(n)
      } catch {
        /* módulo de upload trata erro */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cotacaoId, onBeneficiariosTotalChange])

  const meta = subetapas.find((s) => s.key === subetapa)!
  const activeStep = subetapaIndexInList(subetapa, subetapas)
  const nextKey = nextSubetapa(subetapa)
  const nextLabel = nextKey ? subetapas.find((s) => s.key === nextKey)?.label : null
  const panelTitle = variant === 'validacao' ? 'Análise' : 'Solicitação Mercado'
  const panelIcon =
    variant === 'validacao' ? (
      <AnalyticsOutlinedIcon fontSize="small" />
    ) : (
      <CampaignOutlinedIcon fontSize="small" />
    )
  const subetapasHeading =
    variant === 'validacao' ? 'Subetapas da Análise' : 'Subetapas da Solicitação Mercado'

  const subetapaSteps = subetapas.map((s, index) => ({
    id: s.key,
    label: s.label,
    description: s.description,
    stepNumber: index + 1,
    state:
      index < activeStep
        ? ('completed' as const)
        : s.key === subetapa
          ? ('active' as const)
          : ('upcoming' as const),
  }))

  async function persistSubetapa(key: EmCotacaoSubetapaKey) {
    const prev = subetapa
    setSubetapa(key)
    onSubetapaChange?.(key)
    setSaving(true)
    setErrorMsg(null)
    try {
      await api.put(`/placement/cotacoes/${cotacaoId}/em-cotacao-subetapa`, { subetapa: key })
    } catch (err: any) {
      setSubetapa(prev)
      onSubetapaChange?.(prev)
      setErrorMsg(err?.message ?? 'Erro ao mudar etapa.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    if (
      (subetapa === 'beneficiarios' || subetapa === 'analise_base') &&
      beneficiariosTotal < 1
    ) {
      setErrorMsg(
        subetapa === 'beneficiarios'
          ? 'Importe a planilha de beneficiários antes de avançar.'
          : 'É necessário ter beneficiários importados para visualizar a análise da base.'
      )
      return
    }
    if (!nextKey) return
    await persistSubetapa(nextKey)
  }

  async function handleGoToStep(key: EmCotacaoSubetapaKey) {
    if (key === subetapa || disabled || saving) return
    if (key === 'analise_base' && beneficiariosTotal < 1) {
      setErrorMsg('Importe a planilha de beneficiários antes de abrir a análise da base.')
      return
    }
    setErrorMsg(null)
    await persistSubetapa(key === 'analise_base' ? persistSubetapaForAnaliseBase() : key)
  }

  async function handleBack() {
    const prev = subetapas[activeStep - 1]
    if (!prev) return
    await persistSubetapa(prev.key)
  }

  const prevLabel = activeStep > 0 ? subetapas[activeStep - 1]?.label : undefined

  return (
    <Box>
      <PlacementWorkflowNavShell nested>
        <PlacementWorkflowStageLine
          label={panelTitle}
          description={
            variant === 'validacao'
              ? 'Valide beneficiários e análise da base antes do Kick off'
              : 'Comunique o mercado e finalize o cenário de estudo'
          }
          icon={panelIcon}
        />

        <Box sx={{ mb: 2.5 }}>
          <PlacementWorkflowStepsRail
            steps={subetapaSteps}
            heading={subetapasHeading}
            onStepClick={
              disabled || saving
                ? undefined
                : (id) => void handleGoToStep(id as EmCotacaoSubetapaKey)
            }
          />
        </Box>

        <PlacementWorkflowNavRow>
          <PlacementWorkflowNavActions>
            <PlacementNavBackButton
              disabled={disabled || saving || activeStep === 0}
              onClick={() => void handleBack()}
            >
              <PlacementWorkflowNavLabel action="Anterior" target={prevLabel} />
            </PlacementNavBackButton>
            {nextKey ? (
              <PlacementNavForwardButton
                disabled={disabled || saving}
                onClick={() => void handleNext()}
              >
                {saving ? (
                  'Salvando…'
                ) : (
                  <PlacementWorkflowNavLabel action="Próxima" target={nextLabel ?? undefined} />
                )}
              </PlacementNavForwardButton>
            ) : null}
          </PlacementWorkflowNavActions>

          <PlacementWorkflowNavStatus icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}>
            Subetapa {activeStep + 1} de {subetapas.length} — <strong>{meta.label}</strong>
            <br />
            {meta.objective}
          </PlacementWorkflowNavStatus>
        </PlacementWorkflowNavRow>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: { xs: 'block', md: 'none' }, mt: 1.5, lineHeight: 1.5 }}
        >
          Subetapa {activeStep + 1} de {subetapas.length} — <strong>{meta.label}</strong> — {meta.objective}
        </Typography>

        {errorMsg && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}
      </PlacementWorkflowNavShell>

      {variant === 'validacao' && subetapa === 'analise_base' && !nextKey && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Análise concluída. Use «Avançar» na barra superior para ir a Kick off.
        </Alert>
      )}

      {subetapa === 'beneficiarios' && (
        <BeneficiariosBaseModule
          cotacaoId={cotacaoId}
          disabled={disabled || saving}
          validationContext={validationContext}
          validationContextLoading={validationContextLoading}
          onTotalChange={(n) => {
            setBeneficiariosTotal(n)
            onBeneficiariosTotalChange?.(n)
          }}
        />
      )}

      {subetapa === 'analise_base' && (
        <PlacementAnaliseBasePanel
          cotacaoId={cotacaoId}
          disabled={disabled || saving}
          initialSection={analiseInitialSection}
        />
      )}

      {subetapa === 'comunicar_mercado' && onChange && (
        <PlacementComunicarMercadoPanel
          cotacaoId={cotacaoId}
          form={form}
          onChange={onChange}
          onPersisted={onPersisted}
          analistaResponsavelNome={analistaResponsavelNome}
          disabled={disabled || saving}
        />
      )}

      {subetapa === 'comunicar_mercado' && !onChange && (
        <Alert severity="warning">Salve a cotação para habilitar a comunicação ao mercado.</Alert>
      )}
    </Box>
  )
}

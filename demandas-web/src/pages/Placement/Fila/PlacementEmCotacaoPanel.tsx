import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PrimaryActionButton } from '../../../components/PrimaryActionButton'
import { api } from '../../../lib/api.local'
import { BeneficiariosBaseModule } from './BeneficiariosBaseModule'
import { BeneficiariosResumoDashboard } from './BeneficiariosResumoDashboard'
import { ContratoAtualDashboard } from './ContratoAtualDashboard'
import { BeneficiariosLocalidadeDashboard } from './BeneficiariosLocalidadeDashboard'
import { PlacementComunicarMercadoPanel } from './PlacementComunicarMercadoPanel'
import type { CotacaoFormState } from './CotacaoFormFields'
import { useBeneficiariosValidacaoContext } from './useBeneficiariosValidacaoContext'
import {
  EM_COTACAO_SUBETAPAS,
  emCotacaoSubetapaIndex,
  nextEmCotacaoSubetapa,
  normalizeEmCotacaoSubetapa,
  type EmCotacaoSubetapaKey,
} from './placementEmCotacaoWorkflow'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
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
  subetapaInicial,
  disabled,
  onChange,
  analistaResponsavelNome,
  onSubetapaChange,
  onBeneficiariosTotalChange,
  onPersisted,
}: Props) {
  const [subetapa, setSubetapa] = useState<EmCotacaoSubetapaKey>(() =>
    normalizeEmCotacaoSubetapa(subetapaInicial)
  )
  const [beneficiariosTotal, setBeneficiariosTotal] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { context: validationContext, loading: validationContextLoading } =
    useBeneficiariosValidacaoContext(form, cotacaoId)

  useEffect(() => {
    setSubetapa(normalizeEmCotacaoSubetapa(subetapaInicial))
  }, [subetapaInicial])

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

  const meta = EM_COTACAO_SUBETAPAS.find((s) => s.key === subetapa)!
  const activeStep = emCotacaoSubetapaIndex(subetapa)
  const nextKey = nextEmCotacaoSubetapa(subetapa)

  async function persistSubetapa(key: EmCotacaoSubetapaKey) {
    setSaving(true)
    setErrorMsg(null)
    try {
      await api.put(`/placement/cotacoes/${cotacaoId}/em-cotacao-subetapa`, { subetapa: key })
      setSubetapa(key)
      onSubetapaChange?.(key)
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao mudar etapa.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    if (
      (subetapa === 'beneficiarios' ||
        subetapa === 'etapa2' ||
        subetapa === 'etapa3' ||
        subetapa === 'etapa4') &&
      beneficiariosTotal < 1
    ) {
      setErrorMsg(
        subetapa === 'beneficiarios'
          ? 'Importe a planilha de beneficiários antes de avançar.'
          : 'É necessário ter beneficiários importados para gerar os slides de apresentação.'
      )
      return
    }
    if (!nextKey) return
    await persistSubetapa(nextKey)
  }

  async function handleBack() {
    const prev = EM_COTACAO_SUBETAPAS[activeStep - 1]
    if (!prev) return
    await persistSubetapa(prev.key)
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Em cotação — etapas do processo
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
        {EM_COTACAO_SUBETAPAS.map((s) => (
          <Step key={s.key} completed={emCotacaoSubetapaIndex(s.key) < activeStep}>
            <StepLabel
              optional={
                <Typography variant="caption" color="text.secondary">
                  {s.description}
                </Typography>
              }
            >
              {s.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {meta.label}
        </Typography>
        <Typography variant="body2">{meta.objective}</Typography>
      </Alert>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
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

      {subetapa === 'etapa2' && (
        <BeneficiariosResumoDashboard cotacaoId={cotacaoId} disabled={disabled || saving} />
      )}

      {subetapa === 'etapa3' && (
        <ContratoAtualDashboard cotacaoId={cotacaoId} disabled={disabled || saving} />
      )}

      {subetapa === 'etapa4' && (
        <BeneficiariosLocalidadeDashboard cotacaoId={cotacaoId} disabled={disabled || saving} />
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          disabled={disabled || saving || activeStep === 0}
          onClick={() => void handleBack()}
        >
          Etapa anterior
        </Button>
        {nextKey && (
          <PrimaryActionButton
            endIcon={<ArrowForwardIcon />}
            disabled={disabled || saving}
            onClick={() => void handleNext()}
          >
            {saving
              ? 'Salvando…'
              : `Próxima: ${EM_COTACAO_SUBETAPAS.find((s) => s.key === nextKey)?.label}`}
          </PrimaryActionButton>
        )}
      </Box>
    </Box>
  )
}

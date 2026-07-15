import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
  type ComparativoEstudoConfig,
} from './placementAguardandoOperadora'
import { mercadoFornecedoresFromForm } from './placementComunicarMercado'
import { buildKickOffEstrategiaPatch, mergeSavedKickOffIntoApiCotacao } from './placementKickOffPersist'
import { api } from '../../../lib/api.local'
import type { Operadora } from '../../../types/masterData'

type Args = {
  cotacaoId: string
  form: CotacaoFormState
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
  onChange?: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
}

export function useComparativoConfigPersist({
  cotacaoId,
  form,
  operadoras,
  operadorasById,
  onChange,
  onPersisted,
}: Args) {
  const configSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const agState = useMemo(
    () =>
      ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById
      ),
    [form, operadoras, operadorasById]
  )

  const config = agState.comparativoConfig

  useEffect(() => {
    return () => {
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current)
    }
  }, [])

  const persistConfig = useCallback(
    (next: ComparativoEstudoConfig) => {
      if (!onChange) return
      const fornecedores = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
      const agAtual = ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById
      )
      const nextAg = { ...agAtual, comparativoConfig: next }
      const kickOff = buildKickOffEstrategiaPatch(form.kickOffEstrategia, { aguardandoOperadora: nextAg }, fornecedores)
      onChange({ ...form, kickOffEstrategia: kickOff })
      if (!cotacaoId) return
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current)
      configSaveTimerRef.current = setTimeout(() => {
        void (async () => {
          try {
            const updated = await api.put(`/placement/cotacoes/${cotacaoId}`, { kickOffEstrategia: kickOff })
            onPersisted?.(mergeSavedKickOffIntoApiCotacao(updated, kickOff))
          } catch {
            /* ignore */
          }
        })()
      }, 450)
    },
    [onChange, form, operadoras, operadorasById, cotacaoId, onPersisted]
  )

  return { config, persistConfig, canPersist: Boolean(onChange) }
}

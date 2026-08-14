import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  createComparativoEstudo,
  duplicateComparativoEstudo,
  ensureAguardandoOperadoraState,
  ensureComparativosEstudos,
  parseAguardandoOperadoraFromKickOff,
  patchComparativoAtivoConfig,
  removeComparativoEstudo,
  renameComparativoEstudo,
  setComparativoAtivoId,
  type AguardandoOperadoraState,
  type ComparativoCriacaoModo,
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

/** Mescla propostas/estudos mais recentes do form no nextAg (evita PUT stale apagar digitação). */
function mergePropostasFromForm(
  nextAg: AguardandoOperadoraState,
  form: CotacaoFormState
): AguardandoOperadoraState {
  const local = parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia)
  if (!local?.propostas) return nextAg
  const localKeys = Object.keys(local.propostas)
  if (!localKeys.length) return nextAg
  return {
    ...nextAg,
    propostas: { ...nextAg.propostas, ...local.propostas },
    ...(local.comparativosEstudos?.length
      ? {
          comparativosEstudos: local.comparativosEstudos.map((estudo) => {
            const fromNext = nextAg.comparativosEstudos?.find((e) => e.id === estudo.id)
            if (!fromNext) return estudo
            // Preserva propostas do form; aplica config do nextAg no estudo ativo quando for o caso.
            return {
              ...estudo,
              ...fromNext,
              propostas: { ...estudo.propostas, ...fromNext.propostas, ...estudo.propostas },
            }
          }),
          comparativoAtivoId: nextAg.comparativoAtivoId || local.comparativoAtivoId,
        }
      : {}),
  }
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
  const pendingKickOffRef = useRef<ReturnType<typeof buildKickOffEstrategiaPatch> | null>(null)
  const formRef = useRef(form)
  formRef.current = form
  const operadorasRef = useRef(operadoras)
  operadorasRef.current = operadoras
  const operadorasByIdRef = useRef(operadorasById)
  operadorasByIdRef.current = operadorasById

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

  const estudosState = useMemo(() => ensureComparativosEstudos(agState), [agState])
  const config = estudosState.comparativoConfig

  useEffect(() => {
    return () => {
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current)
    }
  }, [])

  const persistAg = useCallback(
    (nextAg: AguardandoOperadoraState) => {
      if (!onChange) return
      const f = formRef.current
      const fornecedores = mercadoFornecedoresFromForm(
        f,
        operadorasRef.current,
        operadorasByIdRef.current
      )
      const withLocalPropostas = mergePropostasFromForm(nextAg, f)
      const ensured = { ...withLocalPropostas, ...ensureComparativosEstudos(withLocalPropostas) }
      const kickOff = buildKickOffEstrategiaPatch(
        f.kickOffEstrategia,
        { aguardandoOperadora: ensured },
        fornecedores
      )
      const nextForm = { ...f, kickOffEstrategia: kickOff }
      formRef.current = nextForm
      pendingKickOffRef.current = kickOff
      onChange(nextForm)
      if (!cotacaoId) return
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current)
      configSaveTimerRef.current = setTimeout(() => {
        void (async () => {
          // Sempre envia o kickOff mais recente do form (pode ter propostas digitadas depois).
          const latestForm = formRef.current
          const latestLocal = parseAguardandoOperadoraFromKickOff(latestForm.kickOffEstrategia)
          const baseKickOff = pendingKickOffRef.current
          if (!baseKickOff) return
          const payloadKickOff =
            latestLocal?.propostas
              ? buildKickOffEstrategiaPatch(
                  latestForm.kickOffEstrategia,
                  {
                    aguardandoOperadora: {
                      ...(baseKickOff.aguardandoOperadora ?? ensured),
                      ...latestLocal,
                      propostas: latestLocal.propostas,
                      comparativosEstudos:
                        latestLocal.comparativosEstudos ??
                        baseKickOff.aguardandoOperadora?.comparativosEstudos,
                      comparativoAtivoId:
                        latestLocal.comparativoAtivoId ??
                        baseKickOff.aguardandoOperadora?.comparativoAtivoId,
                    },
                  },
                  mercadoFornecedoresFromForm(
                    latestForm,
                    operadorasRef.current,
                    operadorasByIdRef.current
                  )
                )
              : baseKickOff
          try {
            const updated = await api.put(`/placement/cotacoes/${cotacaoId}`, {
              kickOffEstrategia: payloadKickOff,
            })
            // Share público: PUT é no-op local — não chamar onPersisted (evita toFormState parcial).
            if (
              updated &&
              typeof updated === 'object' &&
              (updated as { __placementShareLocalNoop?: boolean }).__placementShareLocalNoop
            ) {
              return
            }
            onPersisted?.(mergeSavedKickOffIntoApiCotacao(updated, payloadKickOff))
          } catch {
            /* ignore */
          }
        })()
      }, 450)
    },
    [onChange, cotacaoId, onPersisted]
  )

  const persistConfig = useCallback(
    (next: ComparativoEstudoConfig) => {
      persistAg(patchComparativoAtivoConfig(agState, next))
    },
    [persistAg, agState]
  )

  const selectEstudo = useCallback(
    (id: string) => {
      persistAg(setComparativoAtivoId(agState, id))
    },
    [persistAg, agState]
  )

  const createEstudo = useCallback(
    (modo: ComparativoCriacaoModo) => {
      persistAg(createComparativoEstudo(agState, { modo }))
    },
    [persistAg, agState]
  )

  const duplicateEstudo = useCallback(
    (modo: ComparativoCriacaoModo) => {
      persistAg(duplicateComparativoEstudo(agState, modo))
    },
    [persistAg, agState]
  )

  const renameEstudo = useCallback(
    (id: string, nome: string) => {
      persistAg(renameComparativoEstudo(agState, id, nome))
    },
    [persistAg, agState]
  )

  const removeEstudo = useCallback(
    (id: string) => {
      persistAg(removeComparativoEstudo(agState, id))
    },
    [persistAg, agState]
  )

  return {
    config,
    persistConfig,
    canPersist: Boolean(onChange),
    estudos: estudosState.comparativosEstudos,
    ativoId: estudosState.comparativoAtivoId,
    selectEstudo,
    createEstudo,
    duplicateEstudo,
    renameEstudo,
    removeEstudo,
  }
}

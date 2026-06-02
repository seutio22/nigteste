import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../lib/api.local'
import { onlyDigitsCnpj } from '../../../lib/placementCnpjConsulta'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore } from '../../../store/placementStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import { reconcilePlanosParaItens, rowIdsNeedingPlano } from './placementCotacaoDetalhes'
import type { BeneficiariosValidacaoContext } from './placementBeneficiariosValidacao'

export function useBeneficiariosValidacaoContext(
  form: CotacaoFormState | null | undefined,
  cotacaoId: string
): { context: BeneficiariosValidacaoContext | null; loading: boolean } {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const condicoes = usePlacementStore((s) => s.condicoes)
  const prospects = usePlacementStore((s) => s.prospects)
  const syncCondicoes = usePlacementStore((s) => s.syncCondicoes)
  const syncProspects = usePlacementStore((s) => s.syncProspects)

  const [subfaturaCnpjs, setSubfaturaCnpjs] = useState<string[]>([])
  const [loadingSubfaturas, setLoadingSubfaturas] = useState(false)

  useEffect(() => {
    syncCondicoes?.()
    syncProspects?.()
  }, [syncCondicoes, syncProspects])

  useEffect(() => {
    if (!cotacaoId) {
      setSubfaturaCnpjs([])
      return
    }
    let cancelled = false
    setLoadingSubfaturas(true)
    void api
      .get(`/placement/cotacoes/${cotacaoId}/subfaturas`)
      .then((resp: { subfaturas?: { cnpj?: string }[] }) => {
        if (cancelled) return
        const list = (resp?.subfaturas ?? [])
          .map((s) => onlyDigitsCnpj(s.cnpj ?? ''))
          .filter((c) => c.length === 14)
        setSubfaturaCnpjs(list)
      })
      .catch(() => {
        if (!cancelled) setSubfaturaCnpjs([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSubfaturas(false)
      })
    return () => {
      cancelled = true
    }
  }, [cotacaoId])

  const context = useMemo((): BeneficiariosValidacaoContext | null => {
    if (!form) return null

    let estipulanteCnpj: string | null = null
    if (form.clienteTipo === 'prospect' && form.prospectId) {
      const p = prospects.find((x) => x.id === form.prospectId)
      estipulanteCnpj = p?.cnpj ? onlyDigitsCnpj(p.cnpj) : null
    } else if (form.condicaoId) {
      const c = condicoes.find((x) => x.id === form.condicaoId)
      estipulanteCnpj = c?.cnpj ? onlyDigitsCnpj(c.cnpj) : null
    }

    const fornecedorNomes = form.itens
      .map((item) => {
        if (!item.fornecedorId) return ''
        const op = operadoras.find((o) => o.id === item.fornecedorId)
        return op?.nome ?? ''
      })
      .filter(Boolean)

    const rowIds = rowIdsNeedingPlano(form.itens)
    const planos = reconcilePlanosParaItens(form.planos, rowIds)

    const subfaturas = [...subfaturaCnpjs]
    for (const draft of form.subfaturasDraft ?? []) {
      const d = onlyDigitsCnpj(draft.cnpj ?? '')
      if (d.length === 14 && !subfaturas.includes(d)) subfaturas.push(d)
    }

    return {
      subfaturaCnpjs: subfaturas,
      estipulanteCnpj: estipulanteCnpj && estipulanteCnpj.length === 14 ? estipulanteCnpj : null,
      fornecedorNomes: [...new Set(fornecedorNomes)],
      planos,
    }
  }, [form, operadoras, condicoes, prospects, subfaturaCnpjs])

  return { context, loading: loadingSubfaturas }
}

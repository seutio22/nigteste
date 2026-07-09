import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../lib/api.local'
import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  validarBeneficiariosImportados,
  type BeneficiariosValidacaoResumo,
} from './placementBeneficiariosValidacao'
import {
  resumoInconsistenciasPorMensagem,
  type InconsistenciaResumoItem,
} from './placementBeneficiariosValidacaoExport'
import { useBeneficiariosValidacaoContext } from './useBeneficiariosValidacaoContext'

export function useKickOffValidacaoResumo(
  cotacaoId: string | undefined,
  form: CotacaoFormState | undefined
): {
  loading: boolean
  validacao: BeneficiariosValidacaoResumo | null
  itens: InconsistenciaResumoItem[]
  totalLinhas: number
} {
  const { context, loading: loadingCtx } = useBeneficiariosValidacaoContext(form, cotacaoId ?? '')
  const [beneficiarios, setBeneficiarios] = useState<PlacementBeneficiario[]>([])
  const [loadingBen, setLoadingBen] = useState(false)

  useEffect(() => {
    if (!cotacaoId) {
      setBeneficiarios([])
      return
    }
    let cancelled = false
    setLoadingBen(true)
    void api
      .get(`/placement/cotacoes/${cotacaoId}/beneficiarios`)
      .then((resp: { beneficiarios?: PlacementBeneficiario[] }) => {
        if (cancelled) return
        setBeneficiarios(resp?.beneficiarios ?? [])
      })
      .catch(() => {
        if (!cancelled) setBeneficiarios([])
      })
      .finally(() => {
        if (!cancelled) setLoadingBen(false)
      })
    return () => {
      cancelled = true
    }
  }, [cotacaoId])

  const validacao = useMemo(() => {
    if (!context || !beneficiarios.length) return null
    return validarBeneficiariosImportados(beneficiarios, context)
  }, [context, beneficiarios])

  const itens = useMemo(
    () => (validacao ? resumoInconsistenciasPorMensagem(validacao) : []),
    [validacao]
  )

  return {
    loading: loadingCtx || loadingBen,
    validacao,
    itens,
    totalLinhas: validacao?.totalLinhas ?? beneficiarios.length,
  }
}

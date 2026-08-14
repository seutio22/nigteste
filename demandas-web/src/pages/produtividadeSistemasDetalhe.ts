import { computeQuantityLineSeconds } from './produtividadePageConfig'

/** Linha de tempo por sistema na regra de produtividade. */
export type SistemaTempoLinha = {
  /** null / ausente = padrão para qualquer sistema */
  sistemaId: string | null
  tempoSeconds: number
  /**
   * Extra por unidade do Total daquele sistema no chamado (Manutenção → Operação).
   * Ex.: Total 10 e 30s → +300s.
   */
  tempoAdicionalPorTotalSeconds?: number | null
}

export function parseSistemasDetalhe(raw: unknown): SistemaTempoLinha[] {
  if (raw == null) return []
  let arr: unknown = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  const out: SistemaTempoLinha[] = []
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const tempo = Number(r.tempoSeconds)
    if (!Number.isFinite(tempo) || tempo < 0) continue
    const sid = r.sistemaId == null || r.sistemaId === '' ? null : String(r.sistemaId)
    const porTotal =
      r.tempoAdicionalPorTotalSeconds == null || r.tempoAdicionalPorTotalSeconds === ''
        ? null
        : Number(r.tempoAdicionalPorTotalSeconds)
    out.push({
      sistemaId: sid,
      tempoSeconds: Math.round(tempo),
      tempoAdicionalPorTotalSeconds:
        porTotal != null && Number.isFinite(porTotal) && porTotal > 0 ? Math.round(porTotal) : null,
    })
  }
  return out
}

function lineSeconds(
  tempoSeconds: number,
  porTotalSeconds: number | null | undefined,
  totalSistema: number
): number {
  let s = Math.max(0, tempoSeconds || 0)
  if (porTotalSeconds && porTotalSeconds > 0 && totalSistema > 0) {
    s += totalSistema * porTotalSeconds
  }
  return s
}

/**
 * Tempo de sistemas:
 * - Com detalhe: cada sistema do chamado usa linha específica ou linha "padrão (qualquer)";
 *   sistemas sem cobertura usam tempo adicional (demais) + opcional por Total.
 * - Sem detalhe: legado base + (qtd-1)×adicional.
 */
export function computeSistemasTempoSeconds(input: {
  sistemaIds: string[]
  sistemasTotais?: Record<string, number> | null
  detalhe?: SistemaTempoLinha[] | null
  tempoBaseSeconds?: number | null
  tempoAdicionalSeconds?: number | null
  /** Adicional por unidade do Total nos sistemas "demais" (sem linha específica/padrão) */
  tempoAdicionalPorTotalDemaisSeconds?: number | null
}): number {
  const ids = [...new Set((input.sistemaIds || []).filter(Boolean).map(String))]
  const totais = input.sistemasTotais && typeof input.sistemasTotais === 'object' ? input.sistemasTotais : {}
  const detalhe = input.detalhe || []

  if (!detalhe.length) {
    const qtd = ids.length || null
    return computeQuantityLineSeconds(qtd, input.tempoBaseSeconds, input.tempoAdicionalSeconds)
  }

  const specifics = detalhe.filter((d) => d.sistemaId)
  const padrao = detalhe.find((d) => !d.sistemaId) || null
  const adicDemais = input.tempoAdicionalSeconds ?? 0
  const porTotalDemais = input.tempoAdicionalPorTotalDemaisSeconds ?? null

  // Sem sistemas no chamado: se só há padrão, conta 1 unidade do padrão
  if (!ids.length) {
    if (padrao) return lineSeconds(padrao.tempoSeconds, padrao.tempoAdicionalPorTotalSeconds, 0)
    return computeQuantityLineSeconds(1, input.tempoBaseSeconds, input.tempoAdicionalSeconds)
  }

  let sum = 0
  for (const sid of ids) {
    const specific = specifics.find((d) => d.sistemaId === sid)
    const row = specific || padrao
    const total = Number((totais as any)[sid]) || 0
    if (row) {
      sum += lineSeconds(row.tempoSeconds, row.tempoAdicionalPorTotalSeconds, total)
    } else {
      sum += lineSeconds(adicDemais, porTotalDemais, total)
    }
  }
  return sum
}

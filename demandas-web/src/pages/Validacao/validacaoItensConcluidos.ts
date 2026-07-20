export type ItensConcluidosDetalhe = {
  contrato?: number
  subs?: number
}

export function parseItensConcluidosDetalhe(raw: unknown): ItensConcluidosDetalhe {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as ItensConcluidosDetalhe
    return {
      contrato: normalizeQty(o.contrato),
      subs: normalizeQty(o.subs),
    }
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseItensConcluidosDetalhe(JSON.parse(raw))
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeQty(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (!Number.isFinite(n) || n < 0) return undefined
  return n
}

export function sumItensConcluidosDetalhe(detalhe?: ItensConcluidosDetalhe | null): number {
  const d = detalhe ?? {}
  return (d.contrato ?? 0) + (d.subs ?? 0)
}

export function serializeItensConcluidosDetalhe(detalhe?: ItensConcluidosDetalhe | null): string | null {
  const parsed = parseItensConcluidosDetalhe(detalhe)
  if (parsed.contrato == null && parsed.subs == null) return null
  return JSON.stringify(parsed)
}

export function inferItensConcluidosDetalhe(
  itensConcluidos?: number | null,
  detalheRaw?: unknown,
  tipo?: string | null
): ItensConcluidosDetalhe {
  const parsed = parseItensConcluidosDetalhe(detalheRaw)
  if (parsed.contrato != null || parsed.subs != null) return parsed
  if (itensConcluidos == null || itensConcluidos <= 0) return {}

  if (tipo === 'SUB') return { subs: itensConcluidos }
  if (tipo === 'Total') return { contrato: itensConcluidos }
  return { contrato: itensConcluidos }
}

export function formatItensConcluidosDisplay(
  itensConcluidos?: number | null,
  detalheRaw?: unknown,
  tipo?: string | null
): string {
  const detalhe = inferItensConcluidosDetalhe(itensConcluidos, detalheRaw, tipo)
  const parts: string[] = []
  if (detalhe.contrato != null && detalhe.contrato > 0) parts.push(`Contrato: ${detalhe.contrato}`)
  if (detalhe.subs != null && detalhe.subs > 0) parts.push(`SUB's: ${detalhe.subs}`)
  const total = sumItensConcluidosDetalhe(detalhe) || itensConcluidos || 0
  if (parts.length === 0) return total > 0 ? String(total) : '-'
  return `${parts.join(' · ')} (total: ${total})`
}

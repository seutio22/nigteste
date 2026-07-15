import { parseBRLToCents, formatCentsToBRL } from './utils'

export type ReembolsoSimNao = 'Sim' | 'Não' | '—'

function isSimNaoToken(v: string): v is 'Sim' | 'Não' {
  const lower = v.toLowerCase()
  return lower === 'sim' || lower === 'não' || lower === 'nao'
}

/** Normaliza flag Sim/Não de reembolso consulta (proposta ou legado). */
export function reembolsoSimNaoLabel(valor: string | undefined | null): ReembolsoSimNao {
  const v = String(valor ?? '').trim()
  if (!v || v === '—') return '—'
  const lower = v.toLowerCase()
  if (lower === 'não' || lower === 'nao' || lower === 'sem reembolso') return 'Não'
  if (lower === 'sim' || lower === 'com reembolso') return 'Sim'
  return '—'
}

export function temReembolsoFromValor(valor: string | undefined | null): boolean {
  return reembolsoSimNaoLabel(valor) === 'Sim'
}

/** Valor legado em reembolsoConsulta (R$ ou texto) indica que há reembolso. */
export function legacyReembolsoConsultaTemValor(valor: string | undefined | null): boolean {
  const v = String(valor ?? '').trim()
  if (!v || v === '—') return false
  if (isSimNaoToken(v)) return false
  return true
}

export function parseReembolsoPropostaFields(
  reembolsoRaw: unknown,
  valorRaw: unknown
): { reembolso: string; reembolsoConsulta: string } {
  const reembolso = String(reembolsoRaw ?? '').trim()
  const valor = String(valorRaw ?? '').trim()

  if (reembolso === 'Sim' || reembolso === 'Não') {
    return { reembolso, reembolsoConsulta: valor }
  }

  if (valor === 'Sim' || valor === 'Não') {
    return { reembolso: valor, reembolsoConsulta: '' }
  }

  if (legacyReembolsoConsultaTemValor(valor)) {
    return { reembolso: 'Sim', reembolsoConsulta: valor }
  }

  return { reembolso: '', reembolsoConsulta: '' }
}

/** Exibe valor de reembolso consulta no comparativo (quando há reembolso). */
export function formatReembolsoConsultaValor(valor: string | undefined | null): string {
  const v = String(valor ?? '').trim()
  if (!v || v === '—') return '—'
  const cents = parseBRLToCents(v)
  if (cents != null) return formatCentsToBRL(cents)
  return v
}

export function resolveReembolsoConsultaComparativo(
  reembolso: string | undefined | null,
  valor: string | undefined | null
): { flag: ReembolsoSimNao; temReembolso: boolean; valorDisplay: string } {
  const parsed = parseReembolsoPropostaFields(reembolso, valor)
  const flag = reembolsoSimNaoLabel(parsed.reembolso)
  const temReembolso =
    flag === 'Sim' ||
    (flag === '—' && legacyReembolsoConsultaTemValor(parsed.reembolsoConsulta))
  const resolvedFlag: ReembolsoSimNao = temReembolso ? 'Sim' : flag === 'Não' ? 'Não' : '—'
  const valorDisplay = temReembolso ? formatReembolsoConsultaValor(parsed.reembolsoConsulta) : '—'
  return { flag: resolvedFlag, temReembolso, valorDisplay }
}

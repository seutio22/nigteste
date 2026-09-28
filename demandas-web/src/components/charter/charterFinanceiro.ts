export type FinanceiroTipo = 'mensal' | 'investimento'
export type FinanceiroPagador = 'empresa' | 'cliente'

/** `meses`: duração do recurso mensal ou prazo de diluição do investimento. */
export type CharterFinanceiroItem = {
  id: string
  descricao: string
  tipo: FinanceiroTipo
  pagador: FinanceiroPagador
  valor: number
  meses: number
}

export type ResumoFinanceiro = {
  recorrenteMensal: number
  investimentoTotal: number
  investimentoDiluidoMensal: number
  custoMensalDiluido: number
  custoTotalProjeto: number
}

export const PAGADORES: { value: FinanceiroPagador; label: string; color: string }[] = [
  { value: 'empresa', label: 'Empresa', color: '#1565C0' },
  { value: 'cliente', label: 'Cliente', color: '#6A1B9A' },
]

export const TIPOS_FINANCEIRO: { value: FinanceiroTipo; label: string }[] = [
  { value: 'mensal', label: 'Recurso mensal' },
  { value: 'investimento', label: 'Investimento' },
]

export function normalizarFinanceiro(raw: unknown): CharterFinanceiroItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f) => f && typeof f === 'object')
    .map((f: any) => {
      const valor = Number(f.valor)
      const meses = Math.round(Number(f.meses))
      return {
        id: String(f.id ?? ''),
        descricao: typeof f.descricao === 'string' ? f.descricao : '',
        tipo: f.tipo === 'investimento' ? 'investimento' : 'mensal',
        pagador: f.pagador === 'cliente' ? 'cliente' : 'empresa',
        valor: Number.isFinite(valor) && valor > 0 ? valor : 0,
        meses: Number.isFinite(meses) && meses >= 1 ? meses : 12,
      }
    })
}

export function mensalDoItem(item: CharterFinanceiroItem): number {
  return item.tipo === 'mensal' ? item.valor : item.valor / Math.max(1, item.meses)
}

export function totalDoItem(item: CharterFinanceiroItem): number {
  return item.tipo === 'mensal' ? item.valor * Math.max(1, item.meses) : item.valor
}

export function resumoFinanceiro(itens: CharterFinanceiroItem[], pagador?: FinanceiroPagador): ResumoFinanceiro {
  const r: ResumoFinanceiro = {
    recorrenteMensal: 0,
    investimentoTotal: 0,
    investimentoDiluidoMensal: 0,
    custoMensalDiluido: 0,
    custoTotalProjeto: 0,
  }
  for (const item of itens) {
    if (pagador && item.pagador !== pagador) continue
    if (item.tipo === 'mensal') r.recorrenteMensal += item.valor
    else {
      r.investimentoTotal += item.valor
      r.investimentoDiluidoMensal += mensalDoItem(item)
    }
    r.custoTotalProjeto += totalDoItem(item)
  }
  r.custoMensalDiluido = r.recorrenteMensal + r.investimentoDiluidoMensal
  return r
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function formatBRL(v: number): string {
  return brl.format(Number.isFinite(v) ? v : 0)
}

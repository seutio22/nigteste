export type RiscoNivel = 'baixo' | 'intermediario' | 'alto' | 'muito_alto'

export type CharterItem = { id: string; descricao: string }

export type CharterRisco = {
  id: string
  descricao: string
  nivel: RiscoNivel
  mitigacao: string
  createdAt: string
}

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

export type ProjectCharter = {
  escopo: string
  incluidos: CharterItem[]
  excluidos: CharterItem[]
  riscos: CharterRisco[]
  financeiro: CharterFinanceiroItem[]
  atualizadoEm?: string | null
  atualizadoPor?: string | null
}

const NIVEIS: RiscoNivel[] = ['baixo', 'intermediario', 'alto', 'muito_alto']
const MAX_VALOR = 1e12
const MAX_MESES = 600
const MAX_TEXTO = 20000
const MAX_ITEM = 2000
const MAX_ITENS = 500

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : ''
}

function id(v: unknown, prefix: string, i: number): string {
  const s = typeof v === 'string' ? v.trim().slice(0, 80) : ''
  return s || `${prefix}-${Date.now()}-${i}`
}

function items(raw: unknown, prefix: string): CharterItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, MAX_ITENS)
    .map((it: any, i) => ({ id: id(it?.id, prefix, i), descricao: str(it?.descricao, MAX_ITEM).trim() }))
    .filter((it) => it.descricao)
}

export function normalizeCharter(raw: unknown): ProjectCharter {
  let obj: any = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      obj = {}
    }
  }
  if (!obj || typeof obj !== 'object') obj = {}
  const riscos: CharterRisco[] = Array.isArray(obj.riscos)
    ? obj.riscos
        .slice(0, MAX_ITENS)
        .map((r: any, i: number) => ({
          id: id(r?.id, 'risco', i),
          descricao: str(r?.descricao, MAX_ITEM).trim(),
          nivel: NIVEIS.includes(r?.nivel) ? r.nivel : 'intermediario',
          mitigacao: str(r?.mitigacao, MAX_ITEM).trim(),
          createdAt: typeof r?.createdAt === 'string' && r.createdAt ? r.createdAt : new Date().toISOString(),
        }))
        .filter((r: CharterRisco) => r.descricao)
    : []
  const financeiro: CharterFinanceiroItem[] = Array.isArray(obj.financeiro)
    ? obj.financeiro
        .slice(0, MAX_ITENS)
        .map((f: any, i: number) => {
          const valor = Number(f?.valor)
          const meses = Math.round(Number(f?.meses))
          return {
            id: id(f?.id, 'fin', i),
            descricao: str(f?.descricao, MAX_ITEM).trim(),
            tipo: f?.tipo === 'investimento' ? 'investimento' : 'mensal',
            pagador: f?.pagador === 'cliente' ? 'cliente' : 'empresa',
            valor: Number.isFinite(valor) ? Math.min(Math.max(valor, 0), MAX_VALOR) : 0,
            meses: Number.isFinite(meses) && meses >= 1 ? Math.min(meses, MAX_MESES) : 12,
          } as CharterFinanceiroItem
        })
        .filter((f: CharterFinanceiroItem) => f.descricao)
    : []
  return {
    escopo: str(obj.escopo, MAX_TEXTO),
    incluidos: items(obj.incluidos, 'inc'),
    excluidos: items(obj.excluidos, 'exc'),
    riscos,
    financeiro,
    atualizadoEm: typeof obj.atualizadoEm === 'string' ? obj.atualizadoEm : null,
    atualizadoPor: typeof obj.atualizadoPor === 'string' ? obj.atualizadoPor : null,
  }
}

/**
 * Link público: "charter" libera escopo/incluídos/excluídos; "riscos" libera os riscos mapeados;
 * "financeiro" libera os itens financeiros.
 */
export function charterForShare(raw: unknown, allowedViews: string[]): ProjectCharter | null {
  const escopo = allowedViews.includes('charter')
  const riscos = allowedViews.includes('riscos')
  const financeiro = allowedViews.includes('financeiro')
  if (!escopo && !riscos && !financeiro) return null
  const c = normalizeCharter(raw)
  return {
    escopo: escopo ? c.escopo : '',
    incluidos: escopo ? c.incluidos : [],
    excluidos: escopo ? c.excluidos : [],
    riscos: riscos ? c.riscos : [],
    financeiro: financeiro ? c.financeiro : [],
    atualizadoEm: c.atualizadoEm,
    atualizadoPor: null,
  }
}

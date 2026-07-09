export const MANUTENCAO_QUALIFICACAO_ITENS = [
  { key: 'semFormalizacao', label: 'Sem formalização' },
  { key: 'semLayout', label: 'Sem layout' },
  { key: 'formularioIncorreto', label: 'Formulário incorreto' },
  { key: 'dadosIncorretos', label: 'Dados incorretos' },
  { key: 'dadosIncompletos', label: 'Dados incompletos' },
  { key: 'semRetorno', label: 'Sem retorno' },
] as const

export type ManutencaoQualificacaoKey = (typeof MANUTENCAO_QUALIFICACAO_ITENS)[number]['key']

export interface ManutencaoQualificacao {
  semFormalizacao: boolean
  semLayout: boolean
  formularioIncorreto: boolean
  dadosIncorretos: boolean
  dadosIncompletos: boolean
  semRetorno: boolean
  observacao?: string
  avaliadoEm?: string
  avaliadoPor?: string
}

export const EMPTY_MANUTENCAO_QUALIFICACAO: ManutencaoQualificacao = {
  semFormalizacao: false,
  semLayout: false,
  formularioIncorreto: false,
  dadosIncorretos: false,
  dadosIncompletos: false,
  semRetorno: false,
  observacao: '',
}

export function parseManutencaoQualificacao(raw: unknown): ManutencaoQualificacao | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  return {
    semFormalizacao: Boolean(o.semFormalizacao),
    semLayout: Boolean(o.semLayout),
    formularioIncorreto: Boolean(o.formularioIncorreto),
    dadosIncorretos: Boolean(o.dadosIncorretos),
    dadosIncompletos: Boolean(o.dadosIncompletos),
    semRetorno: Boolean(o.semRetorno),
    observacao: typeof o.observacao === 'string' ? o.observacao : '',
    avaliadoEm: typeof o.avaliadoEm === 'string' ? o.avaliadoEm : undefined,
    avaliadoPor: typeof o.avaliadoPor === 'string' ? o.avaliadoPor : undefined,
  }
}

export function countManutencaoQualificacaoPontos(q: ManutencaoQualificacao): number {
  return MANUTENCAO_QUALIFICACAO_ITENS.filter(({ key }) => q[key]).length
}

export function manutencaoQualificacaoIgual(a: ManutencaoQualificacao, b: ManutencaoQualificacao): boolean {
  return MANUTENCAO_QUALIFICACAO_ITENS.every(({ key }) => a[key] === b[key]) &&
    String(a.observacao ?? '') === String(b.observacao ?? '')
}

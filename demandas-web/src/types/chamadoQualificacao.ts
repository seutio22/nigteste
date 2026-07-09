export const CHAMADO_QUALIFICACAO_ITENS = [
  { key: 'dadosIncorretos', label: 'Dados incorretos' },
  { key: 'dadosIncompletos', label: 'Dados incompletos' },
  { key: 'semGestorEmCopia', label: 'Sem gestor em cópia' },
  { key: 'semRetorno', label: 'Sem retorno' },
  { key: 'formularioIncorreto', label: 'Formulário incorreto' },
] as const

export type ChamadoQualificacaoKey = (typeof CHAMADO_QUALIFICACAO_ITENS)[number]['key']

export interface ChamadoQualificacao {
  dadosIncorretos: boolean
  dadosIncompletos: boolean
  semGestorEmCopia: boolean
  semRetorno: boolean
  formularioIncorreto: boolean
  observacao?: string
  avaliadoEm?: string
  avaliadoPor?: string
}

export const EMPTY_CHAMADO_QUALIFICACAO: ChamadoQualificacao = {
  dadosIncorretos: false,
  dadosIncompletos: false,
  semGestorEmCopia: false,
  semRetorno: false,
  formularioIncorreto: false,
  observacao: '',
}

export function parseChamadoQualificacao(raw: unknown): ChamadoQualificacao | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  return {
    dadosIncorretos: Boolean(o.dadosIncorretos),
    dadosIncompletos: Boolean(o.dadosIncompletos),
    semGestorEmCopia: Boolean(o.semGestorEmCopia),
    semRetorno: Boolean(o.semRetorno),
    formularioIncorreto: Boolean(o.formularioIncorreto),
    observacao: typeof o.observacao === 'string' ? o.observacao : '',
    avaliadoEm: typeof o.avaliadoEm === 'string' ? o.avaliadoEm : undefined,
    avaliadoPor: typeof o.avaliadoPor === 'string' ? o.avaliadoPor : undefined,
  }
}

export function countChamadoQualificacaoPontos(q: ChamadoQualificacao): number {
  return CHAMADO_QUALIFICACAO_ITENS.filter(({ key }) => q[key]).length
}

export function chamadoQualificacaoIgual(a: ChamadoQualificacao, b: ChamadoQualificacao): boolean {
  return CHAMADO_QUALIFICACAO_ITENS.every(({ key }) => a[key] === b[key]) &&
    String(a.observacao ?? '') === String(b.observacao ?? '')
}

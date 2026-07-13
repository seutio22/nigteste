/** Procedimentos do modelo de coparticipação (layout padrão de mercado). */
export const COPART_PROCEDIMENTOS = [
  { key: 'consultas_eletivas', label: 'Consultas eletivas', col: 0 },
  { key: 'consultas_ps', label: 'Consultas PS', col: 0 },
  { key: 'terapias', label: 'Terapias', col: 0 },
  { key: 'exames_simples', label: 'Exames simples', col: 1 },
  { key: 'exames_especiais', label: 'Exames especiais', col: 1 },
  { key: 'procedimentos_simples', label: 'Procedimentos simples', col: 2 },
  { key: 'proced_especiais', label: 'Proced. especiais', col: 2 },
] as const

export type CopartProcedimentoKey = (typeof COPART_PROCEDIMENTOS)[number]['key']

export type FormaCobrancaCopart = 'percentual' | 'valor'

export type TipoCobrancaInternacaoCopart = '' | 'percentual' | 'valor' | 'desconto'

export interface LinhaCoparticipacao {
  valor: string
  limitador: string
}

export interface CoparticipacaoForm {
  possui: boolean
  formaCobranca: FormaCobrancaCopart
  linhas: Record<CopartProcedimentoKey, LinhaCoparticipacao>
  internacao: {
    tipoCobranca: TipoCobrancaInternacaoCopart
    valor: string
    limitador: string
  }
}

function emptyLinhas(): Record<CopartProcedimentoKey, LinhaCoparticipacao> {
  return Object.fromEntries(
    COPART_PROCEDIMENTOS.map((p) => [p.key, { valor: '', limitador: '' }])
  ) as Record<CopartProcedimentoKey, LinhaCoparticipacao>
}

export function emptyCoparticipacao(): CoparticipacaoForm {
  return {
    possui: false,
    formaCobranca: 'percentual',
    linhas: emptyLinhas(),
    internacao: { tipoCobranca: '', valor: '', limitador: '' },
  }
}

/** Cópia profunda para replicar coparticipação entre planos da cotação. */
export function cloneCoparticipacao(c: CoparticipacaoForm): CoparticipacaoForm {
  return {
    possui: c.possui,
    formaCobranca: c.formaCobranca,
    linhas: Object.fromEntries(
      COPART_PROCEDIMENTOS.map((p) => [
        p.key,
        { valor: c.linhas[p.key].valor, limitador: c.linhas[p.key].limitador },
      ])
    ) as Record<CopartProcedimentoKey, LinhaCoparticipacao>,
    internacao: {
      tipoCobranca: c.internacao.tipoCobranca,
      valor: c.internacao.valor,
      limitador: c.internacao.limitador,
    },
  }
}

export function parseCoparticipacaoFromApi(raw: unknown): CoparticipacaoForm {
  const base = emptyCoparticipacao()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  base.possui = r.possui === true
  base.formaCobranca = r.formaCobranca === 'valor' ? 'valor' : 'percentual'

  if (r.linhas && typeof r.linhas === 'object' && !Array.isArray(r.linhas)) {
    const src = r.linhas as Record<string, unknown>
    for (const p of COPART_PROCEDIMENTOS) {
      const row = src[p.key]
      if (row && typeof row === 'object') {
        const lr = row as Record<string, unknown>
        base.linhas[p.key] = {
          valor: lr.valor != null ? String(lr.valor) : '',
          limitador: lr.limitador != null ? String(lr.limitador) : '',
        }
      }
    }
  }

  if (r.internacao && typeof r.internacao === 'object') {
    const i = r.internacao as Record<string, unknown>
    const t = String(i.tipoCobranca ?? '')
    base.internacao = {
      tipoCobranca:
        t === 'percentual' || t === 'valor' || t === 'desconto'
          ? t
          : '',
      valor: i.valor != null ? String(i.valor) : '',
      limitador: i.limitador != null ? String(i.limitador) : '',
    }
  }

  return base
}

export function coparticipacaoToApiPayload(c: CoparticipacaoForm) {
  if (!c.possui) return { possui: false as const }
  return {
    possui: true as const,
    formaCobranca: c.formaCobranca,
    linhas: c.linhas,
    internacao: c.internacao,
  }
}

export function placeholderValorCopart(forma: FormaCobrancaCopart): string {
  return forma === 'valor' ? 'R$ 0,00' : '0 %'
}

export function placeholderLimitadorCopart(forma: FormaCobrancaCopart): string {
  return forma === 'valor' ? 'Limite R$' : 'Limite %'
}

export function procedimentosPorColuna(col: 0 | 1 | 2) {
  return COPART_PROCEDIMENTOS.filter((p) => p.col === col)
}

export function formatCopartProcedimentoCelula(
  copart: CoparticipacaoForm,
  key: CopartProcedimentoKey
): string {
  if (!copart.possui) return 'Sem copay'
  const linha = copart.linhas[key]
  const valor = linha.valor.trim()
  const limitador = linha.limitador.trim()
  if (!valor && !limitador) return '—'
  const suffix = copart.formaCobranca === 'valor' ? '' : '%'
  const parts: string[] = []
  if (valor) parts.push(`${valor}${suffix}`)
  if (limitador) parts.push(`lim. ${limitador}`)
  return parts.join(' · ')
}

export function formatCopartInternacaoCelula(copart: CoparticipacaoForm): string {
  if (!copart.possui) return 'Sem copay'
  const { internacao } = copart
  const valor = internacao.valor.trim()
  const limitador = internacao.limitador.trim()
  if (!valor && !limitador && !internacao.tipoCobranca) return '—'
  const suffix =
    internacao.tipoCobranca === 'valor'
      ? ''
      : internacao.tipoCobranca === 'percentual' || internacao.tipoCobranca === 'desconto'
        ? '%'
        : copart.formaCobranca === 'valor'
          ? ''
          : '%'
  const tipo =
    internacao.tipoCobranca === 'desconto'
      ? 'desc.'
      : internacao.tipoCobranca === 'valor'
        ? 'R$'
        : ''
  const parts: string[] = []
  if (valor) parts.push(tipo ? `${valor}${suffix} (${tipo})` : `${valor}${suffix}`)
  if (limitador) parts.push(`lim. ${limitador}`)
  return parts.join(' · ')
}

export function labelFormaCobrancaCopart(forma: FormaCobrancaCopart): string {
  return forma === 'valor' ? 'Valor (R$)' : 'Percentual (%)'
}

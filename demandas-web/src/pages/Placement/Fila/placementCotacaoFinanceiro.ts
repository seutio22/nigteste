export type ParticipacaoPercentual = {
  mds: string
  corretorParceiro: string
}

export type ComissaoAtualContrato = {
  comissaoVitalicioContrato: string
  participacao: ParticipacaoPercentual
}

export type ComissaoEstudoCotacao = {
  comissaoAgenciamento: string
  comissaoVitalicio: string
  participacao: ParticipacaoPercentual
}

export type DadosFinanceirosCotacao = {
  atual: ComissaoAtualContrato
  estudo: ComissaoEstudoCotacao
}

export const EMPTY_PARTICIPACAO: ParticipacaoPercentual = {
  mds: '',
  corretorParceiro: '',
}

export const EMPTY_DADOS_FINANCEIROS: DadosFinanceirosCotacao = {
  atual: {
    comissaoVitalicioContrato: '',
    participacao: { ...EMPTY_PARTICIPACAO },
  },
  estudo: {
    comissaoAgenciamento: '',
    comissaoVitalicio: '',
    participacao: { ...EMPTY_PARTICIPACAO },
  },
}

/** Permite dígitos, vírgula e ponto (percentual). */
export function sanitizePercentInput(input: string): string {
  let v = String(input).replace(/[^\d,.]/g, '')
  const commaIdx = v.indexOf(',')
  if (commaIdx >= 0) {
    const before = v.slice(0, commaIdx + 1)
    const after = v.slice(commaIdx + 1).replace(/[,.]/g, '')
    v = before + after
  }
  const dotParts = v.split('.')
  if (dotParts.length > 2) {
    v = dotParts[0] + '.' + dotParts.slice(1).join('')
  }
  return v
}

export function parsePercentValue(input: string): number | null {
  const t = String(input).trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n
}

export function somaParticipacaoPercentual(mds: string, corretor: string): number {
  return (parsePercentValue(mds) ?? 0) + (parsePercentValue(corretor) ?? 0)
}

export function participacaoExcedeLimite(
  mds: string,
  corretor: string,
  limite = 100
): boolean {
  return somaParticipacaoPercentual(mds, corretor) > limite + 1e-9
}

function participacaoFromApi(raw: unknown): ParticipacaoPercentual {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_PARTICIPACAO }
  }
  const o = raw as Record<string, unknown>
  return {
    mds: o.mds != null ? String(o.mds) : '',
    corretorParceiro:
      o.corretorParceiro != null
        ? String(o.corretorParceiro)
        : o.corretor != null
          ? String(o.corretor)
          : '',
  }
}

export function dadosFinanceirosFromApi(raw: unknown): DadosFinanceirosCotacao {
  const base = {
    atual: { ...EMPTY_DADOS_FINANCEIROS.atual, participacao: { ...EMPTY_PARTICIPACAO } },
    estudo: { ...EMPTY_DADOS_FINANCEIROS.estudo, participacao: { ...EMPTY_PARTICIPACAO } },
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>

  if (o.atual && typeof o.atual === 'object') {
    const a = o.atual as Record<string, unknown>
    base.atual = {
      comissaoVitalicioContrato:
        a.comissaoVitalicioContrato != null ? String(a.comissaoVitalicioContrato) : '',
      participacao: participacaoFromApi(a.participacao),
    }
  }

  if (o.estudo && typeof o.estudo === 'object') {
    const e = o.estudo as Record<string, unknown>
    base.estudo = {
      comissaoAgenciamento:
        e.comissaoAgenciamento != null ? String(e.comissaoAgenciamento) : '',
      comissaoVitalicio: e.comissaoVitalicio != null ? String(e.comissaoVitalicio) : '',
      participacao: participacaoFromApi(e.participacao),
    }
  }

  return base
}

function participacaoToApi(p: ParticipacaoPercentual) {
  return {
    mds: p.mds.trim(),
    corretorParceiro: p.corretorParceiro.trim(),
  }
}

export function dadosFinanceirosToApi(df: DadosFinanceirosCotacao) {
  const hasAtual =
    df.atual.comissaoVitalicioContrato.trim() ||
    df.atual.participacao.mds.trim() ||
    df.atual.participacao.corretorParceiro.trim()
  const hasEstudo =
    df.estudo.comissaoAgenciamento.trim() ||
    df.estudo.comissaoVitalicio.trim() ||
    df.estudo.participacao.mds.trim() ||
    df.estudo.participacao.corretorParceiro.trim()

  if (!hasAtual && !hasEstudo) return undefined

  return {
    atual: {
      comissaoVitalicioContrato: df.atual.comissaoVitalicioContrato.trim(),
      participacao: participacaoToApi(df.atual.participacao),
    },
    estudo: {
      comissaoAgenciamento: df.estudo.comissaoAgenciamento.trim(),
      comissaoVitalicio: df.estudo.comissaoVitalicio.trim(),
      participacao: participacaoToApi(df.estudo.participacao),
    },
  }
}

export function hasDadosFinanceirosPreenchidos(df: DadosFinanceirosCotacao): boolean {
  return !!dadosFinanceirosToApi(df)
}

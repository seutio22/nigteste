import type { WorkflowStageKey } from './placementCotacaoWorkflow'

/** Escopo do formulário na página de detalhe (evita repetir todos os blocos). */
export type CotacaoFormScope = 'all' | 'base_atual' | 'kick_off' | 'estrategia' | 'em_cotacao' | 'observacoes_only' | 'dados_abertura'

/** Blocos do formulário de abertura (consulta/edição na aba «Dados da abertura»). */
export type AberturaSectionKey =
  | 'prazos'
  | 'mapeamento'
  | 'detalhes_base'
  | 'cenario_estudo'
  | 'subfaturas'
  | 'observacoes'

function aberturaSectionVisible(
  scope: CotacaoFormScope,
  key: AberturaSectionKey,
  sectionsOnly?: AberturaSectionKey[]
): boolean {
  if (scope !== 'dados_abertura') return false
  if (!sectionsOnly?.length) return true
  return sectionsOnly.includes(key)
}

export function formScopeForWorkflow(
  workflowStageKey: WorkflowStageKey | string,
  isDraft: boolean
): CotacaoFormScope {
  if (isDraft) return 'all'
  if (workflowStageKey === 'base_atual') return 'base_atual'
  if (workflowStageKey === 'validacao') return 'observacoes_only'
  if (workflowStageKey === 'kick_off') return 'kick_off'
  if (workflowStageKey === 'estrategia') return 'estrategia'
  if (workflowStageKey === 'em_cotacao') return 'em_cotacao'
  if (
    workflowStageKey === 'aguardando_operadora' ||
    workflowStageKey === 'consolidando_dados' ||
    workflowStageKey === 'proposta_enviada'
  ) {
    return 'observacoes_only'
  }
  return 'observacoes_only'
}

export function showPrazosSection(
  scope: CotacaoFormScope,
  sectionsOnly?: AberturaSectionKey[]
): boolean {
  if (aberturaSectionVisible(scope, 'prazos', sectionsOnly)) return true
  return scope === 'all' || scope === 'base_atual'
}

export function showMapeamentoSection(
  scope: CotacaoFormScope,
  sectionsOnly?: AberturaSectionKey[]
): boolean {
  if (aberturaSectionVisible(scope, 'mapeamento', sectionsOnly)) return true
  return scope === 'all' || scope === 'base_atual'
}

export function showDetalhesBaseSection(
  scope: CotacaoFormScope,
  sectionsOnly?: AberturaSectionKey[]
): boolean {
  if (aberturaSectionVisible(scope, 'detalhes_base', sectionsOnly)) return true
  return scope === 'all' || scope === 'base_atual'
}

export function showDetalhesEmCotacaoSection(
  scope: CotacaoFormScope,
  sectionsOnly?: AberturaSectionKey[]
): boolean {
  if (aberturaSectionVisible(scope, 'cenario_estudo', sectionsOnly)) return true
  return scope === 'all' || scope === 'base_atual' || scope === 'em_cotacao'
}

/** Upgrade/downgrade, reembolso atual e coberturas especiais (preenchidos na abertura, junto aos planos). */
export function showPlanosCondicoesAbertura(scope: CotacaoFormScope): boolean {
  return scope === 'all' || scope === 'base_atual' || scope === 'dados_abertura'
}

export function showSubfaturaSection(
  scope: CotacaoFormScope,
  sectionsOnly?: AberturaSectionKey[]
): boolean {
  if (aberturaSectionVisible(scope, 'subfaturas', sectionsOnly)) return true
  return scope === 'all' || scope === 'base_atual'
}

export function showObservacoesSection(
  scope: CotacaoFormScope,
  sectionsOnly?: AberturaSectionKey[]
): boolean {
  if (aberturaSectionVisible(scope, 'observacoes', sectionsOnly)) return true
  return scope === 'all' || scope === 'em_cotacao' || scope === 'observacoes_only'
}

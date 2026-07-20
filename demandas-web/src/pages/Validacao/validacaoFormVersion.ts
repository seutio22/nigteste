import type { ValidationEntry } from '../../types/validation'
import { parseEstruturaStoredValue } from './validacaoEstruturaOptions'
import { parseItensConcluidosDetalhe } from './validacaoItensConcluidos'

/** Chamados criados a partir desta data (BRT) usam o formulário V2 na edição, salvo exceções abaixo. */
export const VALIDACAO_FORM_V2_SINCE = new Date('2026-07-20T03:00:00.000Z')

function hasPersistedItensConcluidosDetalhe(validation: ValidationEntry): boolean {
  const raw = validation.itensConcluidosDetalhe
  if (raw == null) return false
  const parsed = parseItensConcluidosDetalhe(raw)
  return parsed.contrato != null || parsed.subs != null
}

function hasEstruturaComQuantidadeVariavel(validation: ValidationEntry): boolean {
  const entries = [
    ...(Array.isArray(validation.estruturaEdge) ? validation.estruturaEdge : []),
    ...(Array.isArray(validation.estruturaMove) ? validation.estruturaMove : []),
  ]
  return entries.some((entry) => parseEstruturaStoredValue(String(entry)).qty > 1)
}

export function usesValidacaoFormularioNovo(validation: ValidationEntry): boolean {
  if (validation.formularioVersao === 2) return true
  if (hasPersistedItensConcluidosDetalhe(validation)) return true
  if (hasEstruturaComQuantidadeVariavel(validation)) return true
  if (validation.createdAt && new Date(validation.createdAt) >= VALIDACAO_FORM_V2_SINCE) return true
  return false
}

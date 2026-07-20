/** Status selecionáveis ao criar ou editar chamado de validação. */
export const VALIDACAO_CHAMADO_STATUS_OPTIONS = [
  'Em andamento',
  'Transf. Analista',
  'Com erros',
  'Concluído Parcialmente',
  'Concluída',
  'Cancelada',
] as const

const LEGACY_STATUS = ['Aguardando validação', 'Em reajuste'] as const

/** Inclui status legado no select apenas se o registro já estiver nele (edição). */
export function validacaoChamadoStatusSelectOptions(currentStatus?: string | null): string[] {
  const cur = (currentStatus ?? '').trim()
  if (cur && (LEGACY_STATUS as readonly string[]).includes(cur) && !VALIDACAO_CHAMADO_STATUS_OPTIONS.includes(cur as (typeof VALIDACAO_CHAMADO_STATUS_OPTIONS)[number])) {
    return [cur, ...VALIDACAO_CHAMADO_STATUS_OPTIONS]
  }
  return [...VALIDACAO_CHAMADO_STATUS_OPTIONS]
}

/** Extrai UUID de campo de relação (objeto aninhado, string ou *Id). */
export function relationId(value: unknown, idFallback?: string | null): string {
  if (value != null && typeof value === 'object' && (value as { id?: string }).id) {
    return String((value as { id: string }).id).trim()
  }
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (idFallback && String(idFallback).trim()) return String(idFallback).trim()
  return ''
}

type ContratoLike = { id: string; numero?: string | null; codigo?: string | null }

/** Valida contrato selecionado antes de salvar validação. Retorna mensagem de erro ou null. */
export function validateContratoParaCliente(
  contratoId: string | undefined,
  clienteId: string | undefined,
  contratosDoCliente: { id: string }[],
  todosContratos: { id: string }[]
): string | null {
  const id = contratoId?.trim()
  if (!id) return null
  if (!todosContratos.some((c) => c.id === id)) {
    return 'Contrato não encontrado no cadastro. Atualize a página ou cadastre o contrato antes de continuar.'
  }
  if (clienteId && !contratosDoCliente.some((c) => c.id === id)) {
    return 'Selecione o contrato na lista do cliente.'
  }
  return null
}

/** Rótulo legível do contrato para listagem e detalhe. */
export function formatContratoLabel(
  contrato: unknown,
  contratoId?: string | null,
  contratos?: ContratoLike[]
): string {
  if (contrato != null && typeof contrato === 'object') {
    const o = contrato as { numero?: string; codigo?: string }
    return o.codigo || o.numero || '-'
  }
  const id = relationId(contrato, contratoId)
  if (!id) return '-'
  const found = contratos?.find((c) => c.id === id)
  return found?.codigo || found?.numero || '-'
}

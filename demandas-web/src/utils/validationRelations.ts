function extractRelationId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'object' && value !== null && (value as { id?: string }).id) {
    return String((value as { id: string }).id).trim()
  }
  return undefined
}

/**
 * Resolve FK para PUT de validação.
 * O formulário edita o campo legado (`contrato`, `cliente`, …); o spread do registro
 * mantém o *Id antigo. Quando divergem, o legado é a fonte da verdade.
 */
export function resolveValidationRelationId(
  entry: Record<string, unknown>,
  idKey: string,
  legacyKey: string,
  objKey?: string
): string | undefined {
  const fromIdKey = extractRelationId(entry[idKey])
  const fromLegacy = extractRelationId(entry[legacyKey])
  const fromObj = objKey ? extractRelationId(entry[objKey]) : undefined

  if (fromLegacy !== undefined) {
    if (fromIdKey !== undefined && fromIdKey !== fromLegacy) return fromLegacy
    return fromLegacy
  }

  if (fromIdKey !== undefined) return fromIdKey
  if (fromObj !== undefined) return fromObj
  return undefined
}

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

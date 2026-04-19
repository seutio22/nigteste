/**
 * Monta a visão “grupo econômico → empresas” a partir do snapshot Nexus `clientes`
 * (mesma ideia do demandas-api: Cliente.grupoEconomico + nome + cnpj).
 */

export type NexusEmpresaGrupoView = {
  nexusClienteId: string
  grupoEconomicoNome: string
  razaoSocial: string
  cnpj: string
  status: string
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    if (!(k in obj)) continue
    const v = obj[k]
    if (v === null || v === undefined) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

function pickStatus(obj: Record<string, unknown>): string {
  if ('ativo' in obj) {
    const v = obj.ativo
    if (typeof v === 'boolean') return v ? 'Ativo' : 'Inativo'
    const t = String(v).trim().toLowerCase()
    if (['true', 's', 'sim', '1', 'ativo'].includes(t)) return 'Ativo'
    if (['false', 'n', 'nao', 'não', '0', 'inativo'].includes(t)) return 'Inativo'
  }
  const s = pickStr(obj, ['status', 'situacao', 'situacaoCadastro', 'situacao_cadastro', 'situacaoCadastral'])
  return s || '—'
}

/** Linhas planas: uma por empresa (cliente), repetindo o nome do grupo quando há várias empresas. */
export function buildNexusGruposEconomicosEmpresas(rows: unknown[]): NexusEmpresaGrupoView[] {
  const out: NexusEmpresaGrupoView[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const grupoRaw = pickStr(o, ['grupoEconomico', 'grupo_economico', 'grupoEconomicoNome', 'grupo'])
    const grupoNome = grupoRaw || '(Sem grupo econômico)'
    const razao = pickStr(o, ['razaoSocial', 'razao_social', 'nome', 'name', 'nomeFantasia', 'fantasia'])
    if (!razao) continue
    const id = pickStr(o, ['id', 'idCliente', 'id_cliente'])
    if (!id) continue
    const cnpj = pickStr(o, ['cnpj', 'CNPJ', 'documento', 'cpfCnpj']) || '—'
    out.push({
      nexusClienteId: id,
      grupoEconomicoNome: grupoNome,
      razaoSocial: razao,
      cnpj,
      status: pickStatus(o),
    })
  }
  out.sort((a, b) => {
    const g = a.grupoEconomicoNome.localeCompare(b.grupoEconomicoNome, 'pt-BR', { sensitivity: 'base' })
    if (g !== 0) return g
    return a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR', { sensitivity: 'base' })
  })
  return out
}

/** Linha de contrato no snapshot Nexus `contratos` (ex.: demandas-api Contrato). */

export type NexusContratoOpcao = {
  nexusContratoId: string
  numero: string
  codigo: string
  grupoEconomico: string
  clienteId: string
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

function norm(s: string): string {
  return s.trim().toLowerCase()
}

export function parseContratosSnapshot(rows: unknown[]): NexusContratoOpcao[] {
  const out: NexusContratoOpcao[] = []
  for (const r of rows) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    const id = pickStr(o, ['id', 'idContrato', 'id_contrato'])
    const numero = pickStr(o, ['numero', 'numeroApolice', 'numero_apolice', 'nApolice'])
    if (!id || !numero) continue
    out.push({
      nexusContratoId: id,
      numero,
      codigo: pickStr(o, ['codigo', 'codigoContrato']),
      grupoEconomico: pickStr(o, ['grupoEconomico', 'grupo_economico']),
      clienteId: pickStr(o, ['clienteId', 'cliente_id', 'idCliente']),
      status: pickStr(o, ['status', 'ativo', 'situacao']) || '—',
    })
  }
  return out
}

export function filterContratosForEstipulante(
  contratos: NexusContratoOpcao[],
  est: { grupoEconomicoNome: string; nexusClienteId: string | null; cnpj: string },
): NexusContratoOpcao[] {
  const gEst = norm(est.grupoEconomicoNome)
  return contratos.filter((c) => {
    if (!norm(c.grupoEconomico) || norm(c.grupoEconomico) !== gEst) return false
    if (est.nexusClienteId?.trim()) {
      return norm(c.clienteId) === norm(est.nexusClienteId)
    }
    return true
  })
}

export function findContratoById(contratos: NexusContratoOpcao[], id: string): NexusContratoOpcao | undefined {
  const t = id.trim()
  return contratos.find((c) => c.nexusContratoId === t)
}

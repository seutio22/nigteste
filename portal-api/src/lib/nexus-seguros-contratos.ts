/**
 * Linha de contrato no snapshot Nexus `contratos` (entidade sincronizada `contratos`).
 * O número exibido como «Nº apólice» no portal usa `numero`; no Nexus costuma vir em `codigo`
 * quando `numero`/`numeroApolice` vêm vazios — o parse replica isso em `numero`.
 * O filtro principal no portal é pelo grupo económico do contrato.
 */

export type NexusContratoOpcao = {
  nexusContratoId: string
  /** Valor usado como número da apólice (Nexus: numero* ou codigo). */
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
    const codigo = pickStr(o, ['codigo', 'codigoContrato', 'codigo_contrato'])
    const numeroExplicit = pickStr(o, ['numero', 'numeroApolice', 'numero_apolice', 'nApolice', 'numeroContrato'])
    const numero = numeroExplicit || codigo
    if (!id || !numero) continue
    out.push({
      nexusContratoId: id,
      numero,
      codigo,
      grupoEconomico: pickStr(o, [
        'grupoEconomico',
        'grupo_economico',
        'grupoEconomicoNome',
        'nomeGrupoEconomico',
        'grupoEconomicoDescricao',
      ]),
      clienteId: pickStr(o, ['clienteId', 'cliente_id', 'idCliente', 'cliente', 'id_cliente']),
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
    const estCli = est.nexusClienteId?.trim()
    const cCli = c.clienteId?.trim()
    if (estCli && cCli) return norm(cCli) === norm(estCli)
    return true
  })
}

export function findContratoById(contratos: NexusContratoOpcao[], id: string): NexusContratoOpcao | undefined {
  const t = id.trim()
  return contratos.find((c) => c.nexusContratoId === t)
}

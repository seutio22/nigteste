export type ManutencaoContratoVinculo = {
  contratoId: string
  operadoraId?: string | null
  produtoId?: string | null
}

/** Linha no formulário (id local para React). */
export type ContratoVinculoRow = ManutencaoContratoVinculo & {
  rowId: string
}

export function newContratoVinculoRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cv-${crypto.randomUUID()}`
  }
  return `cv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyContratoVinculoRow(): ContratoVinculoRow {
  return {
    rowId: newContratoVinculoRowId(),
    contratoId: '',
    operadoraId: '',
    produtoId: '',
  }
}

export function parseContratosIds(raw: unknown, fallbackContratoId?: string | null): string[] {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(String).map((s) => s.trim()).filter(Boolean))]
  }
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return []
    try {
      if (t.startsWith('[')) {
        const j = JSON.parse(t)
        if (Array.isArray(j)) return parseContratosIds(j)
      }
    } catch {
      /* ignore */
    }
  }
  if (fallbackContratoId) return [String(fallbackContratoId)]
  return []
}

function parseVinculoItem(raw: unknown): ManutencaoContratoVinculo | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const contratoId = o.contratoId != null ? String(o.contratoId).trim() : ''
  if (!contratoId) return null
  return {
    contratoId,
    operadoraId: o.operadoraId != null && String(o.operadoraId).trim() ? String(o.operadoraId) : '',
    produtoId: o.produtoId != null && String(o.produtoId).trim() ? String(o.produtoId) : '',
  }
}

export function parseContratosVinculos(
  raw: unknown,
  legacy?: {
    contratosIds?: unknown
    contratoId?: string | null
    operadoraId?: string | null
    produtoId?: string | null
  }
): ManutencaoContratoVinculo[] {
  if (Array.isArray(raw)) {
    const list = raw.map(parseVinculoItem).filter((x): x is ManutencaoContratoVinculo => !!x)
    if (list.length) return list
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const arr = (raw as { itens?: unknown }).itens
    if (Array.isArray(arr)) {
      const list = arr.map(parseVinculoItem).filter((x): x is ManutencaoContratoVinculo => !!x)
      if (list.length) return list
    }
  }

  const ids = parseContratosIds(legacy?.contratosIds, legacy?.contratoId)
  if (!ids.length) return []

  const op = legacy?.operadoraId ? String(legacy.operadoraId) : ''
  const pr = legacy?.produtoId ? String(legacy.produtoId) : ''
  return ids.map((contratoId) => ({
    contratoId,
    operadoraId: op,
    produtoId: pr,
  }))
}

export function vinculosToRows(vinculos: ManutencaoContratoVinculo[]): ContratoVinculoRow[] {
  if (!vinculos.length) return [emptyContratoVinculoRow()]
  return vinculos.map((v) => ({
    rowId: newContratoVinculoRowId(),
    contratoId: v.contratoId,
    operadoraId: v.operadoraId ?? '',
    produtoId: v.produtoId ?? '',
  }))
}

export function rowsToVinculos(rows: ContratoVinculoRow[]): ManutencaoContratoVinculo[] {
  return rows
    .filter((r) => r.contratoId?.trim())
    .map((r) => ({
      contratoId: r.contratoId.trim(),
      operadoraId: r.operadoraId?.trim() || null,
      produtoId: r.produtoId?.trim() || null,
    }))
}

export function deriveContratosIds(vinculos: ManutencaoContratoVinculo[]): string[] {
  return [...new Set(vinculos.map((v) => v.contratoId).filter(Boolean))]
}

export function contratosVinculosToApi(rows: ContratoVinculoRow[]): ManutencaoContratoVinculo[] | null {
  const v = rowsToVinculos(rows)
  return v.length ? v : null
}

export function serializeVinculos(vinculos: ManutencaoContratoVinculo[]): string {
  return JSON.stringify(
    vinculos.map((x) => ({
      contratoId: x.contratoId,
      operadoraId: x.operadoraId ?? null,
      produtoId: x.produtoId ?? null,
    }))
  )
}

export function filterContratosDoCliente<
  T extends { id: string; clienteId?: string | null; grupoEconomico?: string | null }
>(contratos: T[], clienteId: string | undefined, grupoEconomico?: string | null): T[] {
  if (!clienteId) return []
  return contratos.filter(
    (c) => c.clienteId === clienteId || (grupoEconomico && c.grupoEconomico === grupoEconomico)
  )
}

/** Aplica o primeiro vínculo (contrato + operadora + produto) no payload da validação. */
export function applyPrimeiroVinculoToPayload(
  payload: Record<string, unknown>,
  vinculos: ManutencaoContratoVinculo[] | null
): void {
  const first = vinculos?.[0]
  if (first?.contratoId) {
    payload.contratoId = first.contratoId
    payload.contrato = first.contratoId
    payload.operadoraId = first.operadoraId || undefined
    payload.operadora = first.operadoraId || undefined
    payload.produtoId = first.produtoId || undefined
    payload.produto = first.produtoId || undefined
  } else {
    delete payload.contratoId
    delete payload.contrato
    delete payload.operadoraId
    delete payload.operadora
    delete payload.produtoId
    delete payload.produto
  }
}

export function contratosIdsToLabel(
  ids: string[],
  contratos: { id: string; codigo?: string | null; numero?: string | null }[]
): string {
  if (!ids.length) return '—'
  return ids
    .map((id) => {
      const c = contratos.find((x) => x.id === id)
      return c?.codigo || c?.numero || id
    })
    .join(', ')
}

export function vinculosToLabel(
  vinculos: ManutencaoContratoVinculo[],
  contratos: { id: string; codigo?: string | null; numero?: string | null }[],
  operadoras: { id: string; nome: string }[],
  produtos: { id: string; nome: string }[]
): string {
  if (!vinculos.length) return '—'
  return vinculos
    .map((v) => {
      const c = contratos.find((x) => x.id === v.contratoId)
      const contratoLbl = c?.codigo || c?.numero || v.contratoId
      const op = operadoras.find((o) => o.id === v.operadoraId)?.nome
      const pr = produtos.find((p) => p.id === v.produtoId)?.nome
      const extra = [op, pr].filter(Boolean).join(' · ')
      return extra ? `${contratoLbl} (${extra})` : contratoLbl
    })
    .join('; ')
}

export type EmailLinhaContrato = {
  id: number
  contrato: string
  operadora: string
  produto: string
  atualizacao: string
  subtipo: string
  tipo: string
}

export function buildEmailLinhasFromManutencao(
  manutencao: any,
  md: {
    contratos: { id: string; codigo?: string | null; numero?: string | null }[]
    operadoras: { id: string; nome: string }[]
    produtos: { id: string; nome: string }[]
    sistemas: { id: string; nome: string }[]
    tiposCadastro: { id: string; nome: string }[]
    padrao: { id: string; nome: string }[]
  }
): EmailLinhaContrato[] {
  const tipoServico = md.tiposCadastro.find((t) => t.id === manutencao?.tipoServicoId)
  const tipo = md.padrao.find((t) => t.id === manutencao?.tipoId)
  const sistema = md.sistemas.find((s) => s.id === manutencao?.sistemaId)
  const atualizacao = tipoServico?.nome || ''
  const subtipo = tipo?.nome || ''
  const tipoSistema = sistema?.nome || ''

  const vinculos = parseContratosVinculos((manutencao as any)?.contratosVinculos, {
    contratosIds: manutencao?.contratosIds,
    contratoId: manutencao?.contratoId,
    operadoraId: manutencao?.operadoraId,
    produtoId: manutencao?.produtoId,
  })

  if (vinculos.length) {
    return vinculos.map((v, idx) => {
      const c = md.contratos.find((x) => x.id === v.contratoId)
      const op = md.operadoras.find((o) => o.id === v.operadoraId)
      const pr = md.produtos.find((p) => p.id === v.produtoId)
      return {
        id: idx + 1,
        contrato: c?.codigo || c?.numero || manutencao?.ticket || '',
        operadora: op?.nome || '',
        produto: pr?.nome || '',
        atualizacao,
        subtipo,
        tipo: tipoSistema,
      }
    })
  }

  const contrato = manutencao?.contratoId
    ? md.contratos.find((c) => c.id === manutencao.contratoId)
    : null
  const operadora = md.operadoras.find((o) => o.id === manutencao?.operadoraId)
  const produto = md.produtos.find((p) => p.id === manutencao?.produtoId)

  return [
    {
      id: 1,
      contrato: contrato?.codigo || contrato?.numero || manutencao?.ticket || '',
      operadora: operadora?.nome || '',
      produto: produto?.nome || '',
      atualizacao,
      subtipo,
      tipo: tipoSistema,
    },
  ]
}

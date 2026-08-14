import type {
  BeneficiariosFieldHeaderMap,
  PlacementBeneficiario,
} from './placementBeneficiarios'
import {
  BENEFICIARIO_COLUMN_LABELS,
  beneficiarioMatchKey,
  beneficiarioRowHasMeaningfulData,
  mapSpreadsheetRowsToBeneficiarios,
} from './placementBeneficiarios'
import { loadBeneficiariosMappingSnapshot } from './placementBeneficiariosMappingStore'
import { loadBeneficiariosOriginalFile } from './placementBeneficiariosOriginalStore'
import { formatBeneficiarioCustoDisplay } from './placementBeneficiariosParse'
import {
  CAMPO_VALIDACAO_LABEL,
  type BeneficiarioApontamento,
  type BeneficiarioValidacaoCampo,
  type BeneficiariosValidacaoResumo,
} from './placementBeneficiariosValidacao'

export type CriticaExportRow = {
  id: string
  ordem: string
  matricula: string
  nome: string
  cnpj: string
  operadora: string
  planoAtual: string
  custoPerCapita: string
  campo: string
  severidade: string
  critica: string
}

/** Texto agregado de todas as críticas/avisos de uma vida (para coluna CRITICA). */
export function formatApontamentosCriticaCell(apontamentos: BeneficiarioApontamento[]): string {
  if (!apontamentos.length) return ''
  return apontamentos
    .map((a) => {
      const sev = a.severidade === 'erro' ? 'Erro' : 'Aviso'
      const campo = CAMPO_VALIDACAO_LABEL[a.campo] || a.campo
      return `[${sev}] ${campo}: ${a.mensagem}`
    })
    .join('\n')
}

function formatDateCell(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  return raw
}

function beneficiarioToBaseCells(b: PlacementBeneficiario): string[] {
  return [
    b.ordem != null ? String(b.ordem) : '',
    b.empresa ?? '',
    b.sub ?? '',
    b.cnpj ?? '',
    b.matricula ?? '',
    b.sexo ?? '',
    b.nome ?? '',
    formatDateCell(b.dataNascimento),
    b.grauParentesco ?? '',
    b.statusBeneficiario ?? '',
    b.cid10 ?? '',
    b.motivoAfastamento ?? '',
    formatDateCell(b.dataInicioBeneficio),
    formatDateCell(b.dataFinalBeneficio),
    b.cargo ?? '',
    b.cidade ?? '',
    b.uf ?? '',
    b.operadora ?? '',
    b.planoAtual ?? '',
    b.acomodacao ?? '',
    formatBeneficiarioCustoDisplay(b.custoPerCapita),
  ]
}

/**
 * Monta a base completa (1 linha por vida) com coluna CRITICA contendo todos os apontamentos.
 * Vidas sem crítica ficam com a coluna vazia.
 */
export function buildBaseComCriticaRows(
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo
): { headers: string[]; rows: string[][] } {
  const apontamentosById = new Map<string, BeneficiarioApontamento[]>()
  for (const linha of validacao.linhas) {
    apontamentosById.set(linha.beneficiarioId, linha.apontamentos)
  }

  const sorted = [...beneficiarios].sort((a, b) => {
    const oa = a.ordem ?? Number.POSITIVE_INFINITY
    const ob = b.ordem ?? Number.POSITIVE_INFINITY
    if (oa !== ob) return oa - ob
    return String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR')
  })

  const headers = [...BENEFICIARIO_COLUMN_LABELS, 'CRITICA']
  const rows = sorted.map((b) => [
    ...beneficiarioToBaseCells(b),
    formatApontamentosCriticaCell(apontamentosById.get(b.id) ?? []),
  ])

  return { headers, rows }
}

export function flattenCriticasParaExport(
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo
): CriticaExportRow[] {
  const byId = new Map(beneficiarios.map((b) => [b.id, b]))
  const out: CriticaExportRow[] = []

  for (const linha of validacao.linhas) {
    const b = byId.get(linha.beneficiarioId)
    linha.apontamentos.forEach((a, idx) => {
      out.push({
        id: `${linha.beneficiarioId}-${a.campo}-${idx}`,
        ordem: linha.ordem != null ? String(linha.ordem) : b?.ordem != null ? String(b.ordem) : '',
        matricula: linha.matricula ?? b?.matricula ?? '',
        nome: linha.nome ?? b?.nome ?? '',
        cnpj: linha.cnpj ?? b?.cnpj ?? '',
        operadora: linha.operadora ?? b?.operadora ?? '',
        planoAtual: linha.planoAtual ?? b?.planoAtual ?? '',
        custoPerCapita: formatBeneficiarioCustoDisplay(linha.custoPerCapita ?? b?.custoPerCapita),
        campo: CAMPO_VALIDACAO_LABEL[a.campo],
        severidade: a.severidade === 'erro' ? 'Erro' : 'Aviso',
        critica: a.mensagem,
      })
    })
  }

  return out.sort((a, b) => {
    const oa = Number(a.ordem) || 0
    const ob = Number(b.ordem) || 0
    if (oa !== ob) return oa - ob
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}

export function resumoCriticasPorCampo(
  validacao: BeneficiariosValidacaoResumo
): { campo: BeneficiarioValidacaoCampo; label: string; total: number }[] {
  const map = new Map<BeneficiarioValidacaoCampo, number>()
  for (const linha of validacao.linhas) {
    for (const a of linha.apontamentos) {
      map.set(a.campo, (map.get(a.campo) ?? 0) + 1)
    }
  }
  return (Object.keys(CAMPO_VALIDACAO_LABEL) as BeneficiarioValidacaoCampo[])
    .filter((c) => (map.get(c) ?? 0) > 0)
    .map((campo) => ({
      campo,
      label: CAMPO_VALIDACAO_LABEL[campo],
      total: map.get(campo) ?? 0,
    }))
}

export type InconsistenciaResumoItem = { descricao: string; total: number }

/** Agrupa apontamentos pela descrição (mensagem) — resumo sintético para Kick off. */
export function resumoInconsistenciasPorMensagem(
  validacao: BeneficiariosValidacaoResumo
): InconsistenciaResumoItem[] {
  const map = new Map<string, number>()
  for (const linha of validacao.linhas) {
    for (const a of linha.apontamentos) {
      const key = a.mensagem.trim()
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  }
  return [...map.entries()]
    .map(([descricao, total]) => ({ descricao, total }))
    .sort((a, b) => b.total - a.total || a.descricao.localeCompare(b.descricao, 'pt-BR'))
}

/** Export principal: mesma base de beneficiários + coluna CRITICA com todos os apontamentos. */
export async function downloadBaseComCriticasValidacaoXlsx(
  cotacaoId: string,
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo
): Promise<void> {
  if (!beneficiarios.length) return

  const { headers, rows } = buildBaseComCriticaRows(beneficiarios, validacao)
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map((h) => ({
    wch: h === 'CRITICA' ? 56 : Math.min(22, Math.max(10, h.length + 2)),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Base')
  const suffix = cotacaoId.slice(0, 8) || 'cotacao'
  XLSX.writeFile(wb, `placement-base-criticas-${suffix}.xlsx`)
}

function buildCriticaLookup(
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo
): Map<string, string> {
  const byId = new Map(beneficiarios.map((b) => [b.id, b]))
  const map = new Map<string, string>()
  for (const linha of validacao.linhas) {
    const b = byId.get(linha.beneficiarioId)
    if (!b) continue
    const text = formatApontamentosCriticaCell(linha.apontamentos)
    if (!text) continue
    const full = beneficiarioMatchKey(b)
    const loose = beneficiarioMatchKey({ ...b, ordem: null })
    if (full !== '|||') map.set(full, text)
    if (loose !== '|||') map.set(loose, text)
  }
  return map
}

function outFileNameWithCriticas(originalFileName: string): string {
  const name = originalFileName.trim() || 'planilha-beneficiarios.xlsx'
  if (/\.[^.]+$/.test(name)) return name.replace(/(\.[^.]+)$/, '-com-criticas$1')
  return `${name}-com-criticas.xlsx`
}

/**
 * Devolve o arquivo original do upload com a coluna CRITICA acrescentada/preenchida.
 */
export async function downloadOriginalSpreadsheetComCriticas(options: {
  originalBuffer: ArrayBuffer
  originalFileName: string
  fieldHeaderMap: BeneficiariosFieldHeaderMap
  beneficiarios: PlacementBeneficiario[]
  validacao: BeneficiariosValidacaoResumo
}): Promise<void> {
  const { originalBuffer, originalFileName, fieldHeaderMap, beneficiarios, validacao } = options
  const XLSX = await import('xlsx')
  const wb = XLSX.read(originalBuffer, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('Planilha original sem abas.')
  const sheet = wb.Sheets[sheetName]
  if (!sheet) throw new Error('Aba da planilha original não encontrada.')

  const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown as unknown[][]
  if (!aoa.length) throw new Error('Planilha original vazia.')

  const headerRow = (aoa[0] ?? []).map((h) => String(h ?? ''))
  const norm = (h: string) =>
    h
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
  let criticaIdx = headerRow.findIndex((h) => norm(h) === 'CRITICA')
  if (criticaIdx < 0) {
    criticaIdx = headerRow.length
    headerRow.push('CRITICA')
    aoa[0] = headerRow
  } else {
    aoa[0] = headerRow
  }

  const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const criticaByKey = buildCriticaLookup(beneficiarios, validacao)

  for (let i = 0; i < sheetRows.length; i++) {
    const dataRowIdx = i + 1
    if (!aoa[dataRowIdx]) aoa[dataRowIdx] = []
    const rowArr = aoa[dataRowIdx] as unknown[]
    while (rowArr.length < criticaIdx) rowArr.push('')

    const mapped = mapSpreadsheetRowsToBeneficiarios([sheetRows[i]], fieldHeaderMap)[0]
    let critica = ''
    if (mapped && beneficiarioRowHasMeaningfulData(mapped)) {
      const full = beneficiarioMatchKey(mapped)
      const loose = beneficiarioMatchKey({ ...mapped, ordem: null })
      critica = criticaByKey.get(full) || criticaByKey.get(loose) || ''
    }
    rowArr[criticaIdx] = critica
  }

  wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(aoa)
  const outName = outFileNameWithCriticas(originalFileName)
  const isCsv = /\.csv$/i.test(originalFileName)
  if (isCsv) {
    XLSX.writeFile(wb, outName, { bookType: 'csv', FS: ';' })
  } else {
    XLSX.writeFile(wb, outName)
  }
}

/**
 * Prefere o arquivo original do upload; se não estiver disponível no navegador,
 * gera a base reconstruída com coluna CRITICA.
 */
export async function downloadBaseComCriticasPreferindoOriginal(
  cotacaoId: string,
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo,
  fieldHeaderMap?: BeneficiariosFieldHeaderMap
): Promise<'original' | 'reconstruido'> {
  const original = await loadBeneficiariosOriginalFile(cotacaoId)
  const map =
    fieldHeaderMap && Object.keys(fieldHeaderMap).length > 0
      ? fieldHeaderMap
      : loadBeneficiariosMappingSnapshot(cotacaoId)?.fieldHeaderMap ?? {}

  if (original?.buffer && original.buffer.byteLength > 0) {
    await downloadOriginalSpreadsheetComCriticas({
      originalBuffer: original.buffer,
      originalFileName: original.fileName,
      fieldHeaderMap: map,
      beneficiarios,
      validacao,
    })
    return 'original'
  }

  await downloadBaseComCriticasValidacaoXlsx(cotacaoId, beneficiarios, validacao)
  return 'reconstruido'
}

export function downloadBaseComCriticasValidacaoCsv(
  cotacaoId: string,
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo
): void {
  if (!beneficiarios.length) return

  const { headers, rows } = buildBaseComCriticaRows(beneficiarios, validacao)
  const lines = rows.map((row) =>
    row.map((v) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' | ')}"`).join(';')
  )
  const csv = [headers.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `placement-base-criticas-${cotacaoId.slice(0, 8) || 'cotacao'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Relatório detalhado (1 linha por apontamento) — mantido para análise pontual. */
export async function downloadCriticasValidacaoXlsx(
  cotacaoId: string,
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo
): Promise<void> {
  const criticas = flattenCriticasParaExport(beneficiarios, validacao)
  if (!criticas.length) return

  const XLSX = await import('xlsx')
  const header = [
    'ORDEM',
    'MATRICULA',
    'NOME',
    'CNPJ',
    'OPERADORA',
    'PLANO ATUAL',
    'CUSTO PER CAPITA',
    'CAMPO',
    'SEVERIDADE',
    'CRITICA',
  ]
  const data = criticas.map((c) => [
    c.ordem,
    c.matricula,
    c.nome,
    c.cnpj,
    c.operadora,
    c.planoAtual,
    c.custoPerCapita,
    c.campo,
    c.severidade,
    c.critica,
  ])
  const ws = XLSX.utils.aoa_to_sheet([header, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Criticas')
  const suffix = cotacaoId.slice(0, 8) || 'cotacao'
  XLSX.writeFile(wb, `placement-criticas-validacao-${suffix}.xlsx`)
}

export function downloadCriticasValidacaoCsv(
  cotacaoId: string,
  beneficiarios: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo
): void {
  const criticas = flattenCriticasParaExport(beneficiarios, validacao)
  if (!criticas.length) return

  const header = [
    'Ordem',
    'Matricula',
    'Nome',
    'CNPJ',
    'Operadora',
    'Plano atual',
    'Custo per capita',
    'Campo',
    'Severidade',
    'Critica',
  ]
  const lines = criticas.map((c) =>
    [
      c.ordem,
      c.matricula,
      c.nome,
      c.cnpj,
      c.operadora,
      c.planoAtual,
      c.custoPerCapita,
      c.campo,
      c.severidade,
      c.critica,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  )
  const csv = [header.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `placement-criticas-validacao-${cotacaoId.slice(0, 8) || 'cotacao'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

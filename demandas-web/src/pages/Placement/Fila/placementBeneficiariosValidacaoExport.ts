import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  CAMPO_VALIDACAO_LABEL,
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
        matricula: b?.matricula ?? '',
        nome: linha.nome ?? b?.nome ?? '',
        cnpj: b?.cnpj ?? '',
        operadora: b?.operadora ?? '',
        planoAtual: b?.planoAtual ?? '',
        custoPerCapita: b?.custoPerCapita ?? '',
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

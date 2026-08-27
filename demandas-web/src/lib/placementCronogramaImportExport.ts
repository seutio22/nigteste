import * as XLSX from 'xlsx'

import { PLACEMENT_WORKFLOW_MAIN_STAGES } from '../pages/Placement/Fila/placementCotacaoWorkflow'

import {

  buildCronogramaTree,

  etapaWorkflowIndex,

  slaReferenciaLabel,

  type PlacementCronogramaSlaReferencia,

} from '../pages/Placement/Fila/placementCronograma'

import type { PlacementCronogramaAtividade } from '../store/placementStore'

import { normHeaderKey, pickCell, readSpreadsheetRows, type SpreadsheetImportResult } from './dadosSpreadsheet'



export const CRONOGRAMA_EXPORT_HEADERS = [
  'Ordem',
  'Etapa',
  'Tarefa',
  'Subtarefa',
  'Responsável',
  'Prazo entrega (dias)',
  'Referência prazo',
  'Ativo',
  'Observações',
] as const

/** Exemplo completo alinhado ao seed padrão da API (todas as etapas do workflow). */
export const CRONOGRAMA_TEMPLATE_ATIVIDADES: PlacementCronogramaAtividade[] = [
  { id: 'tpl-1', ordem: 1, etapaKey: 'base_atual', tarefa: 'Abertura e premissas', subtarefa: null, slaDias: 2, slaReferencia: 'inicio_processo', ativo: true },
  { id: 'tpl-2', ordem: 2, etapaKey: 'validacao', tarefa: 'Importar base de beneficiários', subtarefa: 'Base de beneficiários', slaDias: 3, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-3', ordem: 3, etapaKey: 'validacao', tarefa: 'Análise da base', subtarefa: 'Grupo elegível, contrato e localidades', slaDias: 2, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-4', ordem: 4, etapaKey: 'kick_off', tarefa: 'Kick off com cliente', subtarefa: null, slaDias: 5, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-5', ordem: 5, etapaKey: 'estrategia', tarefa: 'Formalizar estratégia', subtarefa: null, slaDias: 3, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-6', ordem: 6, etapaKey: 'em_cotacao', tarefa: 'Revisar base de beneficiários', subtarefa: 'Base de beneficiários', slaDias: 1, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-7', ordem: 7, etapaKey: 'em_cotacao', tarefa: 'Análise do cenário de estudo', subtarefa: 'Análise da base', slaDias: 2, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-8', ordem: 8, etapaKey: 'em_cotacao', tarefa: 'Comunicar mercado', subtarefa: 'E-mail aos fornecedores', slaDias: 2, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-9', ordem: 9, etapaKey: 'aguardando_operadora', tarefa: 'Aguardar retorno das operadoras', subtarefa: null, slaDias: 15, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-10', ordem: 10, etapaKey: 'consolidando_dados', tarefa: 'Consolidar dados da proposta', subtarefa: null, slaDias: 5, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-11', ordem: 11, etapaKey: 'validacao_proposta', tarefa: 'Validar proposta', subtarefa: null, slaDias: 3, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-12', ordem: 12, etapaKey: 'proposta_enviada', tarefa: 'Enviar proposta ao cliente', subtarefa: null, slaDias: 2, slaReferencia: 'apos_anterior', ativo: true },
  { id: 'tpl-13', ordem: 13, etapaKey: 'fechada', tarefa: 'Encerramento do processo', subtarefa: null, slaDias: 1, slaReferencia: 'apos_anterior', ativo: true },
]



const ETAPA_BY_KEY = new Map(PLACEMENT_WORKFLOW_MAIN_STAGES.map((s) => [s.key, s.label]))

const ETAPA_BY_NORM = new Map(

  PLACEMENT_WORKFLOW_MAIN_STAGES.flatMap((s) => [

    [normHeaderKey(s.label), s.key] as const,

    [normHeaderKey(s.key), s.key] as const,

  ])

)



export function resolveCronogramaEtapaKey(input: string): string | null {

  const raw = String(input ?? '').trim()

  if (!raw) return null

  if (ETAPA_BY_KEY.has(raw)) return raw

  const norm = normHeaderKey(raw)

  if (ETAPA_BY_NORM.has(norm)) return ETAPA_BY_NORM.get(norm)!

  return null

}



function parseSlaReferencia(input: string): PlacementCronogramaSlaReferencia {

  const v = String(input ?? '').trim().toLowerCase()

  if (v === 'inicio_processo' || v.includes('início') || v.includes('inicio')) return 'inicio_processo'

  return 'apos_anterior'

}



function parseAtivo(input: string): boolean {

  const v = String(input ?? '').trim().toLowerCase()

  if (!v) return true

  return !['nao', 'não', 'false', '0', 'inativo', 'n'].includes(v)

}



export function buildCronogramaExportRows(atividades: PlacementCronogramaAtividade[]): Record<string, unknown>[] {
  const real = atividades.filter((a) => !String(a.id).startsWith('workflow-stage-'))
  const etapas = buildCronogramaTree(real, null)
  const rows: Record<string, unknown>[] = []

  for (const etapa of etapas) {
    for (const task of etapa.tasks) {
      rows.push({
        Ordem: task.ordem,
        Etapa: etapa.etapaLabel,
        Tarefa: task.nome,
        Subtarefa: '',
        Responsável: task.responsavelPadrao ?? '',
        'Prazo entrega (dias)': task.slaDias ?? '',
        'Referência prazo': slaReferenciaLabel(task.slaReferencia),
        Ativo: task.ativo !== false ? 'Sim' : 'Não',
        Observações: task.observacoes ?? '',
      })
      for (const sub of task.subtasks) {
        rows.push({
          Ordem: sub.ordem,
          Etapa: etapa.etapaLabel,
          Tarefa: task.nome,
          Subtarefa: sub.nome,
          Responsável: sub.responsavelPadrao ?? task.responsavelPadrao ?? '',
          'Prazo entrega (dias)': sub.slaDias ?? '',
          'Referência prazo': slaReferenciaLabel(sub.slaReferencia),
          Ativo: sub.ativo !== false ? 'Sim' : 'Não',
          Observações: sub.observacoes ?? '',
        })
      }
    }
  }

  return rows
}



export function downloadCronogramaXlsx(

  atividades: PlacementCronogramaAtividade[],

  filename = `placement-cronograma_${new Date().toISOString().slice(0, 10)}.xlsx`

): number {

  const rows = buildCronogramaExportRows(atividades)

  const workbook = XLSX.utils.book_new()

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...CRONOGRAMA_EXPORT_HEADERS] })

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma')

  XLSX.writeFile(workbook, filename)

  return rows.length

}



export function downloadCronogramaTemplateXlsx(): void {
  const exampleRows = buildCronogramaExportRows(CRONOGRAMA_TEMPLATE_ATIVIDADES)

  const workbook = XLSX.utils.book_new()

  const worksheet = XLSX.utils.json_to_sheet(exampleRows, { header: [...CRONOGRAMA_EXPORT_HEADERS] })

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma')

  XLSX.writeFile(workbook, 'placement-cronograma-modelo.xlsx')

}



export async function importCronogramaSpreadsheet(

  file: File,

  importBatch: (items: Array<{

    ordem?: number

    etapaKey: string

    tarefa: string

    subtarefa?: string | null

    slaDias?: number | null

    slaReferencia?: PlacementCronogramaSlaReferencia

    responsavelPadrao?: string | null

    ativo?: boolean

    observacoes?: string | null

  }>, replace: boolean) => Promise<{ imported: number; errors: string[] }>

): Promise<SpreadsheetImportResult> {

  const rows = await readSpreadsheetRows(file)

  if (!rows.length) throw new Error('Nenhuma linha encontrada na planilha.')



  const items: Array<{

    ordem?: number

    etapaKey: string

    tarefa: string

    subtarefa?: string | null

    slaDias?: number | null

    slaReferencia?: PlacementCronogramaSlaReferencia

    responsavelPadrao?: string | null

    ativo?: boolean

    observacoes?: string | null

  }> = []

  const errors: string[] = []



  for (let i = 0; i < rows.length; i++) {

    const row = rows[i]

    const tarefa = pickCell(row, ['Tarefa', 'tarefa', 'Atividade', 'Nome', 'nome'])

    if (!tarefa) {

      errors.push(`Linha ${i + 2}: tarefa obrigatória.`)

      continue

    }



    const etapaInput = pickCell(row, ['Etapa', 'etapa', 'Fase', 'EtapaKey', 'etapaKey'])

    const etapaKey = resolveCronogramaEtapaKey(etapaInput)

    if (!etapaKey) {

      errors.push(`Linha ${i + 2}: etapa inválida (${etapaInput || 'vazia'}).`)

      continue

    }



    const ordemRaw = pickCell(row, ['Ordem', 'ordem'])

    const ordemParsed = ordemRaw ? Math.round(Number(ordemRaw)) : NaN

    const slaRaw = pickCell(row, [

      'Prazo entrega (dias)',

      'Prazo entrega',

      'Data entrega (dias)',

      'SLA (dias)',

      'SLA',

      'slaDias',

      'sla',

    ])

    const slaDias = slaRaw.trim() === '' ? null : Math.max(0, Math.round(Number(slaRaw)))

    const subtarefa = pickCell(row, ['Subtarefa', 'subtarefa', 'Sub-etapa', 'Subetapa']) || null

    const refSla = pickCell(row, [

      'Referência prazo',

      'Referencia prazo',

      'Referência SLA',

      'Referencia SLA',

      'slaReferencia',

    ])

    const responsavelPadrao = pickCell(row, ['Responsável', 'Responsavel', 'responsavel']) || null

    const ativo = parseAtivo(pickCell(row, ['Ativo', 'ativo']))

    const observacoes = pickCell(row, ['Observações', 'Observacoes', 'observacoes']) || null



    items.push({

      ordem: Number.isFinite(ordemParsed)

        ? ordemParsed

        : etapaWorkflowIndex(etapaKey) * 100 + items.filter((x) => x.etapaKey === etapaKey).length + 1,

      etapaKey,

      tarefa,

      subtarefa,

      slaDias: slaDias != null && Number.isFinite(slaDias) ? slaDias : null,

      slaReferencia: parseSlaReferencia(refSla),

      responsavelPadrao,

      ativo,

      observacoes,

    })

  }



  if (!items.length) {

    const detail = errors.length ? errors.slice(0, 5).join(' · ') : 'Verifique Etapa e Tarefa em cada linha.'

    throw new Error(`Nenhuma linha válida para importar. ${detail}`)

  }



  const replace = window.confirm(

    'Substituir todo o cronograma pelos registros importados?\n\nOK = substituir · Cancelar = acrescentar novas linhas'

  )



  const batch = await importBatch(items, replace)

  if (batch.imported === 0 && batch.errors.length) {

    throw new Error(batch.errors.slice(0, 5).join(' · '))

  }

  return {

    imported: batch.imported,

    errors: [...errors, ...batch.errors],

  }

}



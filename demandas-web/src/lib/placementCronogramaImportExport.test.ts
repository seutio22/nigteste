import { describe, expect, it } from 'vitest'
import {
  buildCronogramaExportRows,
  CRONOGRAMA_TEMPLATE_ATIVIDADES,
  resolveCronogramaEtapaKey,
} from './placementCronogramaImportExport'

describe('placementCronogramaImportExport', () => {
  it('resolve etapa por label ou chave (sem acento)', () => {
    expect(resolveCronogramaEtapaKey('Premissa')).toBe('base_atual')
    expect(resolveCronogramaEtapaKey('validacao')).toBe('validacao')
    expect(resolveCronogramaEtapaKey('Solicitacao Mercado')).toBe('em_cotacao')
    expect(resolveCronogramaEtapaKey('Kick off')).toBe('kick_off')
    expect(resolveCronogramaEtapaKey('Validação')).toBe('validacao_proposta')
  })

  it('exporta tarefas e subtarefas com ordem e responsável', () => {
    const rows = buildCronogramaExportRows([
      {
        id: 'a1',
        ordem: 2,
        etapaKey: 'validacao',
        tarefa: 'Importar base',
        subtarefa: 'Base de beneficiários',
        slaDias: 3,
        slaReferencia: 'apos_anterior',
        responsavelPadrao: 'Analista',
        ativo: true,
      },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ Ordem: 2, Etapa: 'Análise', Tarefa: 'Importar base', Subtarefa: '' })
    expect(rows[1]).toMatchObject({ Tarefa: 'Importar base', Subtarefa: 'Base de beneficiários' })
  })

  it('modelo inclui todas as etapas do workflow', () => {
    const rows = buildCronogramaExportRows(CRONOGRAMA_TEMPLATE_ATIVIDADES)
    const etapas = new Set(rows.map((r) => r.Etapa))
    expect(etapas.size).toBe(10)
    expect(rows.length).toBeGreaterThanOrEqual(13)
  })
})

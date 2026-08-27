import { describe, expect, it } from 'vitest'

import {

  addCalendarDays,

  buildCronogramaTree,

  expandAtividadesHierarquia,

  flattenCronogramaTree,

  normalizeIsoDate,

} from './placementCronograma'

import type { PlacementCronogramaAtividade } from '../../../store/placementStore'



const template: PlacementCronogramaAtividade[] = [

  {

    id: 'a1',

    ordem: 1,

    etapaKey: 'base_atual',

    tarefa: 'Abertura e premissas',

    subtarefa: null,

    slaDias: 2,

    slaReferencia: 'inicio_processo',

    ativo: true,

  },

  {

    id: 'a2',

    ordem: 2,

    etapaKey: 'validacao',

    tarefa: 'Importar base de beneficiários',

    subtarefa: 'Base de beneficiários',

    slaDias: 3,

    slaReferencia: 'apos_anterior',

    ativo: true,

  },

]



describe('placementCronograma', () => {

  it('expande legado tarefa+subtarefa em hierarquia', () => {

    const expanded = expandAtividadesHierarquia(template)

    expect(expanded).toHaveLength(3)

    expect(expanded[1].tarefa).toBe('Importar base de beneficiários')

    expect(expanded[2].parentId).toBe('a2')

    expect(expanded[2].tarefa).toBe('Base de beneficiários')

  })



  it('calcula datas em cadeia (tarefa + subtarefa)', () => {

    const etapas = buildCronogramaTree(template, { dataInicioProcesso: '2026-01-10', linhas: [] })

    const items = flattenCronogramaTree(etapas)

    expect(items).toHaveLength(3)

    expect(items[0].dataInicioEfetiva).toBe('2026-01-10')

    expect(items[0].dataPrevistaEfetiva).toBe('2026-01-12')

    expect(items[1].dataInicioEfetiva).toBe('2026-01-12')

    expect(items[1].dataPrevistaEfetiva).toBe('2026-01-15')

    expect(items[2].dataInicioEfetiva).toBe('2026-01-15')

  })



  it('agrupa por etapa com subtarefas aninhadas', () => {
    const etapas = buildCronogramaTree(template, { dataInicioProcesso: '2026-01-10', linhas: [] })
    expect(etapas).toHaveLength(10)
    const premissa = etapas.find((e) => e.etapaKey === 'base_atual')
    expect(premissa?.etapaLabel).toBe('Premissa')
    const validacao = etapas.find((e) => e.etapaKey === 'validacao')
    expect(validacao?.tasks[0].subtasks).toHaveLength(1)
    expect(validacao?.dataPrevistaEtapa).toBe('2026-01-15')
  })



  it('normaliza datas ISO', () => {

    expect(normalizeIsoDate('2026-03-05')).toBe('2026-03-05')

    expect(addCalendarDays('2026-03-05', 1)).toBe('2026-03-06')

  })

})



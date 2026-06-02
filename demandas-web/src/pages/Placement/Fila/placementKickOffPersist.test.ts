import { describe, expect, it } from 'vitest'
import { buildKickOffEstrategiaPatch } from './placementKickOffPersist'

describe('placementKickOffPersist', () => {
  it('preserva seções ao salvar apenas comunicarMercado', () => {
    const current = {
      secoes: [{ id: 's1', titulo: 'Premissas', itens: [{ id: 'i1', rotulo: 'A', valor: '1' }] }],
      mercadoAnalisado: ['AMIL'],
      notas: '',
      comunicarMercado: {
        prazoRetorno: '2026-06-09',
        conteudoCompartilhado: {
          topicosOverrides: {},
          sinistralidade: {
            sinistralidadePeriodo: '',
            estimativaReajuste: '',
            indiceReajusteFinanceiro: '',
            justificativaPicos: '',
            maioresUsuarios: '',
            maioresUsuariosMesAMes: '',
            imagemDataUri: '',
          },
          localidades: { incluirNoEmail: false, imagemDataUri: '' },
        },
        fornecedores: {},
      },
    }
    const next = buildKickOffEstrategiaPatch(current, {
      comunicarMercado: {
        ...current.comunicarMercado!,
        fornecedores: {
          amil: {
            razaoSocial: 'AMIL',
            cnpj: '',
            atividadeEconomica: '',
            municipioUf: '',
            grupoProducao: 'SP',
            enviado: true,
            destinatariosEmails: [],
            topicosOverrides: {},
            dataEnvio: '2026-06-02',
            dataPrevisaoRetorno: '2026-06-09',
            dataRetornoEfetiva: '',
          },
        },
      },
    })
    expect(next.secoes).toHaveLength(1)
    expect(next.comunicarMercado?.fornecedores.amil?.dataEnvio).toBe('2026-06-02')
    expect(next.comunicarMercado?.fornecedores.amil?.enviado).toBe(true)
  })
})

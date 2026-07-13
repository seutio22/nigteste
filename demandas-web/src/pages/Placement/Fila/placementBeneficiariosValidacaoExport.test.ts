import { describe, expect, it } from 'vitest'
import { flattenCriticasParaExport } from './placementBeneficiariosValidacaoExport'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import type { BeneficiariosValidacaoResumo } from './placementBeneficiariosValidacao'

describe('flattenCriticasParaExport', () => {
  it('gera uma linha por crítica com dados do beneficiário', () => {
    const beneficiarios: PlacementBeneficiario[] = [
      {
        id: 'b1',
        cotacaoId: 'c1',
        ordem: 1,
        matricula: '123',
        nome: 'Maria',
        cnpj: '11.222.333/0001-81',
        operadora: 'Unimed',
        planoAtual: 'Ouro',
        custoPerCapita: '100',
      },
    ]
    const validacao: BeneficiariosValidacaoResumo = {
      totalLinhas: 1,
      linhasComApontamento: 1,
      totalApontamentos: 2,
      linhas: [
        {
          beneficiarioId: 'b1',
          ordem: 1,
          nome: 'Maria',
          matricula: '123',
          cnpj: '11.222.333/0001-81',
          operadora: 'Unimed',
          planoAtual: 'Ouro',
          custoPerCapita: '100',
          apontamentos: [
            { campo: 'cnpj', severidade: 'erro', mensagem: 'CNPJ divergente' },
            { campo: 'operadora', severidade: 'aviso', mensagem: 'Operadora diferente' },
          ],
        },
      ],
    }

    const out = flattenCriticasParaExport(beneficiarios, validacao)
    expect(out).toHaveLength(2)
    expect(out[0].matricula).toBe('123')
    expect(out[0].nome).toBe('Maria')
    expect(out[0].critica).toBe('CNPJ divergente')
    expect(out[0].custoPerCapita).toMatch(/R\$\s*100,00/)
    expect(out[1].severidade).toBe('Aviso')
  })

  it('preenche dados da linha de validação mesmo sem match por id', () => {
    const validacao: BeneficiariosValidacaoResumo = {
      totalLinhas: 1,
      linhasComApontamento: 1,
      totalApontamentos: 1,
      linhas: [
        {
          beneficiarioId: 'id-antigo',
          ordem: 5,
          nome: 'João',
          matricula: '999',
          cnpj: '11.222.333/0001-81',
          operadora: 'Unimed',
          planoAtual: 'Prata',
          custoPerCapita: '200,00',
          apontamentos: [{ campo: 'sexo', severidade: 'aviso', mensagem: 'Sexo ausente na planilha.' }],
        },
      ],
    }
    const out = flattenCriticasParaExport([], validacao)
    expect(out[0].nome).toBe('João')
    expect(out[0].matricula).toBe('999')
    expect(out[0].operadora).toBe('Unimed')
  })
})

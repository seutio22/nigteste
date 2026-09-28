import { describe, expect, it } from 'vitest'
import { normalizarFinanceiro, resumoFinanceiro, type CharterFinanceiroItem } from './charterFinanceiro'

const itens: CharterFinanceiroItem[] = [
  { id: '1', descricao: 'Licença', tipo: 'mensal', pagador: 'cliente', valor: 1000, meses: 6 },
  { id: '2', descricao: 'Servidor', tipo: 'investimento', pagador: 'empresa', valor: 12000, meses: 12 },
  { id: '3', descricao: 'Consultoria', tipo: 'investimento', pagador: 'cliente', valor: 3000, meses: 3 },
]

describe('resumoFinanceiro', () => {
  it('dilui investimentos no custo mensal e soma o total do projeto', () => {
    const r = resumoFinanceiro(itens)
    expect(r.recorrenteMensal).toBe(1000)
    expect(r.investimentoTotal).toBe(15000)
    expect(r.investimentoDiluidoMensal).toBe(2000)
    expect(r.custoMensalDiluido).toBe(3000)
    expect(r.custoTotalProjeto).toBe(21000)
  })

  it('separa por pagador', () => {
    expect(resumoFinanceiro(itens, 'empresa').custoMensalDiluido).toBe(1000)
    expect(resumoFinanceiro(itens, 'cliente').custoMensalDiluido).toBe(2000)
    expect(resumoFinanceiro(itens, 'cliente').custoTotalProjeto).toBe(9000)
  })
})

describe('normalizarFinanceiro', () => {
  it('aplica padrões para valores inválidos', () => {
    const [f] = normalizarFinanceiro([{ id: 'x', descricao: 'A', tipo: '?', pagador: '?', valor: 'abc', meses: 0 }])
    expect(f).toMatchObject({ tipo: 'mensal', pagador: 'empresa', valor: 0, meses: 12 })
    expect(normalizarFinanceiro(null)).toEqual([])
  })
})

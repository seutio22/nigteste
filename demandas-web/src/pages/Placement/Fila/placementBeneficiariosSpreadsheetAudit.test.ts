import { describe, expect, it } from 'vitest'
import {
  auditBeneficiariosSpreadsheetHeaders,
  formatBeneficiariosSpreadsheetAuditMessage,
  mapSpreadsheetRowsToBeneficiarios,
  spreadsheetAuditHasIssues,
} from './placementBeneficiarios'

describe('auditBeneficiariosSpreadsheetHeaders', () => {
  it('reconhece cabeçalhos do template e marca como ok', () => {
    const audit = auditBeneficiariosSpreadsheetHeaders([
      {
        NOME: 'Ana',
        'DATA DE NASCIMENTO': '1990-01-01',
        'GRAU DE PARENTESCO': 'Titular',
        CNPJ: '123',
        OPERADORA: 'Op',
        SEXO: 'F',
      },
    ])

    expect(audit.mappedHeaders).toEqual([
      'NOME',
      'DATA DE NASCIMENTO',
      'GRAU DE PARENTESCO',
      'CNPJ',
      'OPERADORA',
      'SEXO',
    ])
    expect(audit.missingRequiredHeaders).toEqual([])
    expect(audit.unrecognizedHeaders).toEqual([])
    expect(spreadsheetAuditHasIssues(audit)).toBe(false)
    expect(audit.columnMappings.filter((m) => m.status === 'ok').length).toBeGreaterThanOrEqual(6)
  })

  it('aceita alias PARENTESCO e marca colunas essenciais ausentes', () => {
    const audit = auditBeneficiariosSpreadsheetHeaders([
      {
        NOME: 'João',
        PARENTESCO: 'Titular',
        'Coluna extra': 'x',
      },
    ])

    const parentesco = audit.columnMappings.find((m) => m.field === 'grauParentesco')
    expect(parentesco?.uploadedHeader).toBe('PARENTESCO')
    expect(parentesco?.status).toBe('ok')
    expect(audit.missingRequiredHeaders).toContain('DATA DE NASCIMENTO')
    expect(audit.missingRequiredHeaders).toContain('CNPJ')
    expect(audit.unrecognizedHeaders).toEqual(['Coluna extra'])
    expect(spreadsheetAuditHasIssues(audit)).toBe(true)
    expect(formatBeneficiariosSpreadsheetAuditMessage(audit)).toMatch(/Colunas essenciais ausentes/)
  })

  it('marca colunas opcionais do modelo como missing quando ausentes', () => {
    const audit = auditBeneficiariosSpreadsheetHeaders([
      {
        NOME: 'Maria',
        'DATA DE NASCIMENTO': '1985-05-05',
        'GRAU DE PARENTESCO': 'Titular',
        CNPJ: '1',
        OPERADORA: 'Op',
        SEXO: 'F',
      },
    ])

    const ordem = audit.columnMappings.find((m) => m.templateLabel === 'ORDEM')
    expect(ordem?.status).toBe('missing')
    expect(ordem?.required).toBe(false)
    expect(spreadsheetAuditHasIssues(audit)).toBe(false)
  })

  it('permite mapeamento manual de cabeçalhos não reconhecidos', () => {
    const rows = [
      {
        'Nome completo': 'Ana',
        'Dt nasc': '1990-01-01',
        Relacao: 'Titular',
        'CNPJ empresa': '123',
        Convênio: 'Op',
        Genero: 'F',
      },
    ]
    const auto = auditBeneficiariosSpreadsheetHeaders(rows)
    expect(auto.mappedHeaders).toEqual([])
    expect(auto.missingRequiredHeaders.length).toBeGreaterThan(0)

    const overrides = {
      nome: 'Nome completo',
      dataNascimento: 'Dt nasc',
      grauParentesco: 'Relacao',
      cnpj: 'CNPJ empresa',
      operadora: 'Convênio',
      sexo: 'Genero',
    }
    const manualAudit = auditBeneficiariosSpreadsheetHeaders(rows, overrides)
    expect(manualAudit.missingRequiredHeaders).toEqual([])
    expect(spreadsheetAuditHasIssues(manualAudit)).toBe(false)

    const mapped = mapSpreadsheetRowsToBeneficiarios(rows, overrides)
    expect(mapped).toHaveLength(1)
    expect(mapped[0].nome).toBe('Ana')
    expect(mapped[0].grauParentesco).toBe('Titular')
    expect(manualAudit.columnMappings.find((m) => m.field === 'nome')?.manual).toBe(true)
  })
})

import { onlyDigitsCnpj } from '../../../lib/placementCnpjConsulta'
import {
  FAIXAS_ETARIAS,
  type FaixaEtariaKey,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import { parseBRLToCents } from './utils'

export type BeneficiarioValidacaoCampo = 'cnpj' | 'operadora' | 'planoAtual' | 'custoPerCapita'

export const CAMPO_VALIDACAO_LABEL: Record<BeneficiarioValidacaoCampo, string> = {
  cnpj: 'CNPJ',
  operadora: 'Operadora',
  planoAtual: 'Plano atual',
  custoPerCapita: 'Custo per capita',
}

export type BeneficiarioApontamento = {
  campo: BeneficiarioValidacaoCampo
  severidade: 'erro' | 'aviso'
  mensagem: string
}

export type BeneficiariosValidacaoContext = {
  /** CNPJs das subfaturas (14 dígitos). */
  subfaturaCnpjs: string[]
  /** CNPJ do estipulante (condição casa ou prospect). */
  estipulanteCnpj: string | null
  /** Nomes das operadoras/fornecedores atuais do mapeamento. */
  fornecedorNomes: string[]
  planos: PlanoCoberturaForm[]
}

export type BeneficiarioValidacaoLinha = {
  beneficiarioId: string
  ordem?: number | null
  nome?: string | null
  apontamentos: BeneficiarioApontamento[]
}

export type BeneficiariosValidacaoResumo = {
  totalLinhas: number
  linhasComApontamento: number
  totalApontamentos: number
  linhas: BeneficiarioValidacaoLinha[]
}

function normText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function parseIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null
  const raw = String(dataNascimento).trim()
  const iso = raw.includes('T') ? raw.slice(0, 10) : raw.slice(0, 10)
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

export function faixaEtariaKeyFromIdade(idade: number): FaixaEtariaKey | null {
  if (idade >= 0 && idade <= 18) return '00-18'
  if (idade >= 19 && idade <= 23) return '19-23'
  if (idade >= 24 && idade <= 28) return '24-28'
  if (idade >= 29 && idade <= 33) return '29-33'
  if (idade >= 34 && idade <= 38) return '34-38'
  if (idade >= 39 && idade <= 43) return '39-43'
  if (idade >= 44 && idade <= 48) return '44-48'
  if (idade >= 49 && idade <= 53) return '49-53'
  if (idade >= 54 && idade <= 58) return '54-58'
  if (idade >= 59) return '59-mais'
  return null
}

function parseCustoCell(value: string | null | undefined): number | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const asNumber = Number(raw.replace(/\./g, '').replace(',', '.'))
  if (Number.isFinite(asNumber)) return Math.round(asNumber * 100)
  return parseBRLToCents(raw)
}

function custosIguais(a: number | null, b: number | null, toleranciaCents = 1): boolean {
  if (a == null || b == null) return false
  return Math.abs(a - b) <= toleranciaCents
}

function nomeCompativel(a: string, b: string): boolean {
  const na = normText(a)
  const nb = normText(b)
  if (!na || !nb) return false
  if (na === nb) return true
  return na.includes(nb) || nb.includes(na)
}

function findPlanoPorNome(planos: PlanoCoberturaForm[], planoAtual: string): PlanoCoberturaForm | null {
  const alvo = normText(planoAtual)
  if (!alvo) return null
  const exato = planos.find((p) => normText(p.nomePlano) === alvo)
  if (exato) return exato
  return planos.find((p) => nomeCompativel(p.nomePlano, planoAtual)) ?? null
}

function operadoraCompativel(valorPlanilha: string, fornecedores: string[]): boolean {
  const alvo = normText(valorPlanilha)
  if (!alvo) return false
  return fornecedores.some((f) => {
    const nf = normText(f)
    if (!nf) return false
    return nf === alvo || nf.includes(alvo) || alvo.includes(nf)
  })
}

function validarCnpj(
  row: PlacementBeneficiario,
  ctx: BeneficiariosValidacaoContext
): BeneficiarioApontamento[] {
  const out: BeneficiarioApontamento[] = []
  const digits = onlyDigitsCnpj(row.cnpj ?? '')
  if (digits.length !== 14) {
    if (String(row.cnpj ?? '').trim()) {
      out.push({
        campo: 'cnpj',
        severidade: 'erro',
        mensagem: 'CNPJ inválido ou incompleto na planilha.',
      })
    }
    return out
  }

  const subfaturas = new Set(ctx.subfaturaCnpjs.map(onlyDigitsCnpj).filter((c) => c.length === 14))
  const estipulante = ctx.estipulanteCnpj ? onlyDigitsCnpj(ctx.estipulanteCnpj) : ''

  const emSubfatura = subfaturas.has(digits)
  const ehEstipulante = estipulante.length === 14 && digits === estipulante

  if (!emSubfatura && !ehEstipulante) {
    const partes: string[] = []
    if (subfaturas.size) partes.push('subfaturas do formulário')
    if (estipulante.length === 14) partes.push('CNPJ do estipulante (casa/prospect)')
    out.push({
      campo: 'cnpj',
      severidade: 'erro',
      mensagem:
        partes.length > 0
          ? `CNPJ não encontrado em ${partes.join(' nem em ')}.`
          : 'CNPJ não vinculado a subfaturas nem ao estipulante — cadastre subfaturas ou estipulante na abertura.',
    })
  }

  return out
}

function validarOperadora(
  row: PlacementBeneficiario,
  ctx: BeneficiariosValidacaoContext
): BeneficiarioApontamento[] {
  const valor = String(row.operadora ?? '').trim()
  if (!valor) return []
  if (!ctx.fornecedorNomes.length) {
    return [
      {
        campo: 'operadora',
        severidade: 'aviso',
        mensagem: 'Fornecedor atual não informado no formulário — não foi possível comparar a operadora.',
      },
    ]
  }
  if (!operadoraCompativel(valor, ctx.fornecedorNomes)) {
    return [
      {
        campo: 'operadora',
        severidade: 'erro',
        mensagem: `Operadora "${valor}" diverge do fornecedor atual (${ctx.fornecedorNomes.join(', ')}).`,
      },
    ]
  }
  return []
}

function validarPlanoAtual(
  row: PlacementBeneficiario,
  ctx: BeneficiariosValidacaoContext
): { apontamentos: BeneficiarioApontamento[]; plano: PlanoCoberturaForm | null } {
  const valor = String(row.planoAtual ?? '').trim()
  if (!valor) return { apontamentos: [], plano: null }
  if (!ctx.planos.length) {
    return {
      apontamentos: [
        {
          campo: 'planoAtual',
          severidade: 'aviso',
          mensagem: 'Nenhum plano cadastrado no formulário — não foi possível comparar o plano atual.',
        },
      ],
      plano: null,
    }
  }
  const plano = findPlanoPorNome(ctx.planos, valor)
  if (!plano) {
    const esperados = ctx.planos.map((p) => p.nomePlano).filter(Boolean)
    return {
      apontamentos: [
        {
          campo: 'planoAtual',
          severidade: 'erro',
          mensagem: `Plano "${valor}" não consta nos planos do formulário (${esperados.join(', ') || '—'}).`,
        },
      ],
      plano: null,
    }
  }
  return { apontamentos: [], plano }
}

function validarCustoPerCapita(
  row: PlacementBeneficiario,
  plano: PlanoCoberturaForm | null
): BeneficiarioApontamento[] {
  const custoPlanilha = parseCustoCell(row.custoPerCapita)
  const temCustoPlanilha = custoPlanilha != null

  if (!plano) {
    if (temCustoPlanilha) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'aviso',
          mensagem: 'Custo per capita na planilha sem plano correspondente no formulário para conferência.',
        },
      ]
    }
    return []
  }

  if (plano.tipoCusto === 'per_capita') {
    const esperado = parseBRLToCents(plano.custoPerCapitaBRL)
    if (!temCustoPlanilha && esperado != null) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'aviso',
          mensagem: 'Custo per capita ausente na planilha; o formulário informa valor per capita para este plano.',
        },
      ]
    }
    if (temCustoPlanilha && esperado == null) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'aviso',
          mensagem: 'Custo per capita na planilha, mas o plano no formulário não tem valor per capita informado.',
        },
      ]
    }
    if (temCustoPlanilha && esperado != null && !custosIguais(custoPlanilha, esperado)) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'erro',
          mensagem: `Custo per capita diverge do informado no formulário para o plano "${plano.nomePlano}".`,
        },
      ]
    }
    return []
  }

  const idade = parseIdade(row.dataNascimento)
  if (idade == null) {
    if (temCustoPlanilha) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'aviso',
          mensagem:
            'Plano com custeio por faixa etária: informe data de nascimento na planilha para validar o custo.',
        },
      ]
    }
    return []
  }

  const faixa = faixaEtariaKeyFromIdade(idade)
  if (!faixa) {
    return [
      {
        campo: 'custoPerCapita',
        severidade: 'aviso',
        mensagem: 'Idade fora das faixas etárias configuradas no formulário.',
      },
    ]
  }

  const faixaLabel = FAIXAS_ETARIAS.find((f) => f.key === faixa)?.label ?? faixa
  const esperado = parseBRLToCents(plano.custosFaixa[faixa] ?? '')

  if (!temCustoPlanilha && esperado != null) {
    return [
      {
        campo: 'custoPerCapita',
        severidade: 'aviso',
        mensagem: `Custo ausente na planilha; faixa ${faixaLabel} (idade ${idade}) tem valor no formulário.`,
      },
    ]
  }

  if (temCustoPlanilha && esperado == null) {
    return [
      {
        campo: 'custoPerCapita',
        severidade: 'aviso',
        mensagem: `Custo na planilha, mas faixa ${faixaLabel} (idade ${idade}) sem valor no formulário.`,
      },
    ]
  }

  if (temCustoPlanilha && esperado != null && !custosIguais(custoPlanilha, esperado)) {
    return [
      {
        campo: 'custoPerCapita',
        severidade: 'erro',
        mensagem: `Custo diverge da faixa ${faixaLabel} (idade ${idade}) informada no formulário para "${plano.nomePlano}".`,
      },
    ]
  }

  return []
}

/** Valida beneficiários importados contra subfaturas, estipulante, fornecedor, planos e custos do formulário. */
export function validarBeneficiariosImportados(
  rows: PlacementBeneficiario[],
  ctx: BeneficiariosValidacaoContext
): BeneficiariosValidacaoResumo {
  const linhas: BeneficiarioValidacaoLinha[] = []

  for (const row of rows) {
    const apontamentos: BeneficiarioApontamento[] = [
      ...validarCnpj(row, ctx),
      ...validarOperadora(row, ctx),
    ]

    const planoCheck = validarPlanoAtual(row, ctx)
    apontamentos.push(...planoCheck.apontamentos)
    apontamentos.push(...validarCustoPerCapita(row, planoCheck.plano))

    if (apontamentos.length) {
      linhas.push({
        beneficiarioId: row.id,
        ordem: row.ordem,
        nome: row.nome,
        apontamentos,
      })
    }
  }

  const totalApontamentos = linhas.reduce((n, l) => n + l.apontamentos.length, 0)

  return {
    totalLinhas: rows.length,
    linhasComApontamento: linhas.length,
    totalApontamentos,
    linhas,
  }
}

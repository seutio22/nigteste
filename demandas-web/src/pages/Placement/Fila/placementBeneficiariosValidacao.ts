import { onlyDigitsCnpj } from '../../../lib/placementCnpjConsulta'
import {
  FAIXAS_ETARIAS,
  type FaixaEtariaKey,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import { isGrauParentescoConhecido, isGrauConjuge, isGrauFilho, isGrauTitular, normGrauParentesco, resolveTipoParentesco } from './placementBeneficiarioTipoParentesco'
import {
  parseBeneficiarioCustoToCents,
  parseBeneficiarioIdadeFromValue,
} from './placementBeneficiariosParse'
import { formatCentsToBRL, parseBRLToCents } from './utils'

export type BeneficiarioValidacaoCampo =
  | 'cnpj'
  | 'operadora'
  | 'planoAtual'
  | 'custoPerCapita'
  | 'grauParentesco'
  | 'sexo'
  | 'dataNascimento'
  | 'cid10'
  | 'motivoAfastamento'
  | 'dataInicioBeneficio'
  | 'dataFinalBeneficio'
  | 'cidade'
  | 'uf'
  | 'nome'
  | 'matricula'

export const CAMPO_VALIDACAO_LABEL: Record<BeneficiarioValidacaoCampo, string> = {
  cnpj: 'CNPJ',
  operadora: 'Operadora',
  planoAtual: 'Plano atual',
  custoPerCapita: 'Custo per capita',
  grauParentesco: 'Grau de parentesco',
  sexo: 'Sexo',
  dataNascimento: 'Data de nascimento',
  cid10: 'CID 10',
  motivoAfastamento: 'Motivo do afastamento',
  dataInicioBeneficio: 'Data de início do benefício',
  dataFinalBeneficio: 'Data final do benefício',
  cidade: 'Cidade',
  uf: 'UF',
  nome: 'Nome',
  matricula: 'Matrícula',
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
  matricula?: string | null
  cnpj?: string | null
  operadora?: string | null
  planoAtual?: string | null
  custoPerCapita?: string | null
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
  return parseBeneficiarioIdadeFromValue(dataNascimento)
}

function sexoPermitido(valor: string): boolean {
  const n = normText(valor)
  return n === 'm' || n === 'f' || n === 'masculino' || n === 'feminino'
}

function temTexto(value: string | null | undefined): boolean {
  return String(value ?? '').trim().length > 0
}

/** CID-10 médico (ex.: F32, C50.1), distinto dos rótulos da planilha. */
function isCid10CodigoMedico(value: string): boolean {
  return /^[A-Z]\d{2}(\.\d{1,4})?$/i.test(value.trim())
}

function isGrauAfastadoCronicoInvalidez(grau: string): boolean {
  return grau.includes('afast') || grau.includes('cronic') || grau.includes('invalidez')
}

function isGrauAposentadoLei(grau: string): boolean {
  return grau.includes('aposent') && grau.includes('lei')
}

function isGrauDemitido(grau: string): boolean {
  return grau.includes('demitid')
}

function isGrauRemido(grau: string): boolean {
  return grau.includes('remid')
}

function normNome(value: string | null | undefined): string {
  return normText(value)
}

function normMatricula(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function normDataNascimento(value: string | null | undefined): string {
  if (!value) return ''
  const raw = String(value).trim()
  return raw.includes('T') ? raw.slice(0, 10) : raw.slice(0, 10)
}

function validarCidadeUf(row: PlacementBeneficiario): BeneficiarioApontamento[] {
  const out: BeneficiarioApontamento[] = []
  if (!temTexto(row.cidade)) {
    out.push({
      campo: 'cidade',
      severidade: 'aviso',
      mensagem: 'Cidade ausente na planilha.',
    })
  }
  if (!temTexto(row.uf)) {
    out.push({
      campo: 'uf',
      severidade: 'aviso',
      mensagem: 'UF ausente na planilha.',
    })
  }
  return out
}

/** Detecta nomes repetidos na base (análise entre linhas). */
function validarNomesDuplicados(rows: PlacementBeneficiario[]): Map<string, BeneficiarioApontamento[]> {
  const porNome = new Map<string, PlacementBeneficiario[]>()

  for (const row of rows) {
    const chave = normNome(row.nome)
    if (!chave) continue
    const grupo = porNome.get(chave) ?? []
    grupo.push(row)
    porNome.set(chave, grupo)
  }

  const out = new Map<string, BeneficiarioApontamento[]>()

  for (const grupo of porNome.values()) {
    if (grupo.length < 2) continue

    for (const row of grupo) {
      const outras = grupo.filter((r) => r.id !== row.id)
      const matricula = normMatricula(row.matricula)
      const nascimento = normDataNascimento(row.dataNascimento)

      const duplicataExata = outras.some(
        (o) => normMatricula(o.matricula) === matricula && normDataNascimento(o.dataNascimento) === nascimento
      )

      const ordensOutras = outras
        .map((o) => o.ordem)
        .filter((o) => o != null)
        .join(', ')

      const apontamentos: BeneficiarioApontamento[] = []

      if (duplicataExata) {
        apontamentos.push({
          campo: 'nome',
          severidade: 'aviso',
          mensagem:
            ordensOutras.length > 0
              ? `Nome duplicado com mesma data de nascimento e matrícula (ordem ${ordensOutras}).`
              : 'Nome duplicado com mesma data de nascimento e matrícula.',
        })
      } else {
        apontamentos.push({
          campo: 'nome',
          severidade: 'aviso',
          mensagem:
            ordensOutras.length > 0
              ? `Nome duplicado na planilha — verifique data de nascimento e matrícula (ordem ${ordensOutras}).`
              : 'Nome duplicado na planilha — verifique data de nascimento e matrícula.',
        })
      }

      out.set(row.id, apontamentos)
    }
  }

  return out
}

function validarSexo(row: PlacementBeneficiario): BeneficiarioApontamento[] {
  const valor = String(row.sexo ?? '').trim()
  if (!valor) {
    return [
      {
        campo: 'sexo',
        severidade: 'aviso',
        mensagem: 'Sexo ausente na planilha.',
      },
    ]
  }
  if (!sexoPermitido(valor)) {
    return [
      {
        campo: 'sexo',
        severidade: 'erro',
        mensagem: `Sexo "${valor}" inválido. Use F, M, Feminino ou Masculino.`,
      },
    ]
  }
  return []
}

function validarDataNascimento(row: PlacementBeneficiario): BeneficiarioApontamento[] {
  const valor = String(row.dataNascimento ?? '').trim()
  if (!valor) {
    return [
      {
        campo: 'dataNascimento',
        severidade: 'aviso',
        mensagem: 'Data de nascimento ausente na planilha.',
      },
    ]
  }

  const idade = parseIdade(valor)
  if (idade == null) {
    return [
      {
        campo: 'dataNascimento',
        severidade: 'erro',
        mensagem: 'Data de nascimento inválida na planilha.',
      },
    ]
  }

  const out: BeneficiarioApontamento[] = []
  const grau = row.grauParentesco

  if (isGrauTitular(grau)) {
    if (idade < 18) {
      out.push({
        campo: 'dataNascimento',
        severidade: 'aviso',
        mensagem: 'Titular menor de 18 anos (exceções legais devem ser controladas).',
      })
    }
    if (idade >= 70) {
      out.push({
        campo: 'dataNascimento',
        severidade: 'aviso',
        mensagem: 'Titular com 70 anos ou mais.',
      })
    }
  }

  if (isGrauConjuge(grau)) {
    if (idade < 18) {
      out.push({
        campo: 'dataNascimento',
        severidade: 'erro',
        mensagem: 'Cônjuge menor de 18 anos.',
      })
    }
    if (idade >= 70) {
      out.push({
        campo: 'dataNascimento',
        severidade: 'aviso',
        mensagem: 'Cônjuge com 70 anos ou mais.',
      })
    }
  }

  if (isGrauFilho(grau)) {
    if (idade >= 25) {
      out.push({
        campo: 'dataNascimento',
        severidade: 'aviso',
        mensagem: 'Filho(a) com 25 anos ou mais (exige regra contratual).',
      })
    }
    if (idade > 39) {
      out.push({
        campo: 'dataNascimento',
        severidade: 'aviso',
        mensagem: 'Filho(a) acima de 39 anos.',
      })
    }
  }

  return out
}

function validarCondicoesGrauParentesco(row: PlacementBeneficiario): BeneficiarioApontamento[] {
  const grau = normGrauParentesco(row.grauParentesco)
  if (!grau) return []

  const out: BeneficiarioApontamento[] = []
  const hasCid = temTexto(row.cid10)
  const hasMotivo = temTexto(row.motivoAfastamento)
  const hasInicio = temTexto(row.dataInicioBeneficio)
  const hasFinal = temTexto(row.dataFinalBeneficio)

  if (isGrauAfastadoCronicoInvalidez(grau) && !hasCid && !hasMotivo) {
    out.push({
      campo: 'grauParentesco',
      severidade: 'aviso',
      mensagem:
        'Afastados, crônicos ou aposentados por invalidez sem CID 10 ou motivo do afastamento informado.',
    })
  }

  if (grau.includes('home care') || grau.includes('homecare')) {
    out.push({
      campo: 'grauParentesco',
      severidade: 'aviso',
      mensagem: 'Home Care exige detalhamento operacional e de sinistro.',
    })
  }

  if (hasCid && isCid10CodigoMedico(String(row.cid10))) {
    out.push({
      campo: 'cid10',
      severidade: 'aviso',
      mensagem: 'Caso com CID grave ou de alto impacto — revisar.',
    })
  }

  if (grau.includes('liminar') && !hasMotivo) {
    out.push({
      campo: 'grauParentesco',
      severidade: 'aviso',
      mensagem: 'Liminar sem documentação ou explicação (informe motivo do afastamento).',
    })
  }

  if (grau.includes('liberal') && !hasMotivo) {
    out.push({
      campo: 'grauParentesco',
      severidade: 'aviso',
      mensagem: 'Liberalidade sem tipo ou condição informada (informe motivo do afastamento).',
    })
  }

  if (isGrauAposentadoLei(grau) || isGrauDemitido(grau)) {
    if (!hasInicio) {
      out.push({
        campo: 'dataInicioBeneficio',
        severidade: 'aviso',
        mensagem: 'Aposentado (Lei) ou demitido sem data de início do benefício.',
      })
    }
    if (!hasFinal) {
      out.push({
        campo: 'dataFinalBeneficio',
        severidade: 'aviso',
        mensagem: 'Aposentado (Lei) ou demitido sem data final do benefício.',
      })
    }
  }

  if (isGrauRemido(grau)) {
    if (!hasInicio) {
      out.push({
        campo: 'dataInicioBeneficio',
        severidade: 'aviso',
        mensagem: 'Remido sem data de início do benefício.',
      })
    }
    if (!hasFinal) {
      out.push({
        campo: 'dataFinalBeneficio',
        severidade: 'aviso',
        mensagem: 'Remido sem data de término (data final do benefício).',
      })
    }
  }

  return out
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

function custosIguais(a: number | null, b: number | null, toleranciaCents = 1): boolean {
  if (a == null || b == null) return false
  return Math.abs(a - b) <= toleranciaCents
}

function mensagemCustoDivergente(planilha: number, formulario: number): string {
  return `Planilha: ${formatCentsToBRL(planilha)} · Formulário: ${formatCentsToBRL(formulario)}`
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
  const rawCnpj = String(row.cnpj ?? '').trim()
  if (!rawCnpj) {
    out.push({
      campo: 'cnpj',
      severidade: 'aviso',
      mensagem: 'Sem CNPJ na planilha.',
    })
    return out
  }

  const digits = onlyDigitsCnpj(rawCnpj)
  if (digits.length !== 14) {
    out.push({
      campo: 'cnpj',
      severidade: 'erro',
      mensagem: 'CNPJ inválido ou incompleto na planilha.',
    })
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
  if (!valor) {
    return [
      {
        campo: 'operadora',
        severidade: 'aviso',
        mensagem: 'Operadora ausente na planilha.',
      },
    ]
  }
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

function validarGrauParentesco(row: PlacementBeneficiario): BeneficiarioApontamento[] {
  const valor = String(row.grauParentesco ?? '').trim()
  const out: BeneficiarioApontamento[] = []
  if (!valor) {
    out.push({
      campo: 'grauParentesco',
      severidade: 'aviso',
      mensagem: 'Grau de parentesco ausente na planilha.',
    })
    return out
  }
  if (!isGrauParentescoConhecido(valor)) {
    out.push({
      campo: 'grauParentesco',
      severidade: 'erro',
      mensagem: `Grau de parentesco "${valor}" não consta na tabela T/D/A (ex.: Titular, Filho (C), Agregado, CRÔNICO (A)).`,
    })
    return out
  }
  const tipo = resolveTipoParentesco(valor)
  if (!tipo) {
    out.push({
      campo: 'grauParentesco',
      severidade: 'erro',
      mensagem: 'Não foi possível classificar o grau de parentesco em T, D ou A.',
    })
    return out
  }
  out.push(...validarCondicoesGrauParentesco(row))
  return out
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
  const custoPlanilha = parseBeneficiarioCustoToCents(row.custoPerCapita)
  const temCustoPlanilha = custoPlanilha != null

  if (!plano) {
    if (temCustoPlanilha) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'aviso',
          mensagem: `Custo per capita na planilha (${formatCentsToBRL(custoPlanilha)}) sem plano correspondente no formulário para conferência.`,
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
          mensagem: `Custo per capita ausente na planilha; formulário: ${formatCentsToBRL(esperado)} para o plano "${plano.nomePlano}".`,
        },
      ]
    }
    if (temCustoPlanilha && esperado == null) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'aviso',
          mensagem: `Custo per capita na planilha (${formatCentsToBRL(custoPlanilha)}); o plano "${plano.nomePlano}" não tem valor per capita no formulário.`,
        },
      ]
    }
    if (temCustoPlanilha && esperado != null && !custosIguais(custoPlanilha, esperado)) {
      return [
        {
          campo: 'custoPerCapita',
          severidade: 'erro',
          mensagem: `Custo per capita diverge do plano "${plano.nomePlano}". ${mensagemCustoDivergente(custoPlanilha, esperado)}.`,
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
        mensagem: `Custo ausente na planilha; faixa ${faixaLabel} (idade ${idade}): ${formatCentsToBRL(esperado)} no formulário.`,
      },
    ]
  }

  if (temCustoPlanilha && esperado == null) {
    return [
      {
        campo: 'custoPerCapita',
        severidade: 'aviso',
        mensagem: `Custo na planilha (${formatCentsToBRL(custoPlanilha)}); faixa ${faixaLabel} (idade ${idade}) sem valor no formulário.`,
      },
    ]
  }

  if (temCustoPlanilha && esperado != null && !custosIguais(custoPlanilha, esperado)) {
    return [
      {
        campo: 'custoPerCapita',
        severidade: 'erro',
        mensagem: `Custo diverge da faixa ${faixaLabel} (idade ${idade}) no plano "${plano.nomePlano}". ${mensagemCustoDivergente(custoPlanilha, esperado)}.`,
      },
    ]
  }

  return []
}

/** Vidas sem nenhuma crítica após validação. */
export function countBeneficiariosValidados(validacao: BeneficiariosValidacaoResumo): number {
  return Math.max(0, validacao.totalLinhas - validacao.linhasComApontamento)
}

/** Valida beneficiários importados contra subfaturas, estipulante, fornecedor, planos e custos do formulário. */
export function validarBeneficiariosImportados(
  rows: PlacementBeneficiario[],
  ctx: BeneficiariosValidacaoContext
): BeneficiariosValidacaoResumo {
  const linhas: BeneficiarioValidacaoLinha[] = []
  const duplicatasPorId = validarNomesDuplicados(rows)

  for (const row of rows) {
    const apontamentos: BeneficiarioApontamento[] = [
      ...validarCnpj(row, ctx),
      ...validarOperadora(row, ctx),
      ...validarSexo(row),
      ...validarDataNascimento(row),
      ...validarGrauParentesco(row),
      ...validarCidadeUf(row),
      ...(duplicatasPorId.get(row.id) ?? []),
    ]

    const planoCheck = validarPlanoAtual(row, ctx)
    apontamentos.push(...planoCheck.apontamentos)
    apontamentos.push(...validarCustoPerCapita(row, planoCheck.plano))

    if (apontamentos.length) {
      linhas.push({
        beneficiarioId: row.id,
        ordem: row.ordem,
        nome: row.nome,
        matricula: row.matricula,
        cnpj: row.cnpj,
        operadora: row.operadora,
        planoAtual: row.planoAtual,
        custoPerCapita: row.custoPerCapita,
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

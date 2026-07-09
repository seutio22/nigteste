import type { PlacementBeneficiario } from './placementBeneficiarios'
import { resolveTipoParentesco } from './placementBeneficiarioTipoParentesco'

/** Faixas etárias do painel de apresentação (pirâmide). */
export const BENEFICIARIO_FAIXAS_APRESENTACAO = [
  { key: '00-18', label: '00 - 18', min: 0, max: 18 },
  { key: '19-23', label: '19 - 23', min: 19, max: 23 },
  { key: '24-28', label: '24 - 28', min: 24, max: 28 },
  { key: '29-33', label: '29 - 33', min: 29, max: 33 },
  { key: '34-38', label: '34 - 38', min: 34, max: 38 },
  { key: '39-43', label: '39 - 43', min: 39, max: 43 },
  { key: '44-48', label: '44 - 48', min: 44, max: 48 },
  { key: '49-53', label: '49 - 53', min: 49, max: 53 },
  { key: '54-58', label: '54 - 58', min: 54, max: 58 },
  { key: '59-mais', label: '59 ou mais', min: 59, max: 200 },
] as const

export type BeneficiarioCategoriaApresentacao =
  | 'demais'
  | 'afastados'
  | 'aposent_invalidez'
  | 'aposent_tempo_servico'
  | 'agregados'
  | 'cronicos'
  | 'demitidos'
  | 'enteado'
  | 'expatriados'
  | 'filhos_maiores_24'
  | 'home_care'
  | 'liberalidade'
  | 'licenca_maternidade'
  | 'liminares'
  | 'prestadores_servico'
  | 'reclusos'
  | 'remidos'
  | 'tea'

export const CATEGORIAS_APRESENTACAO: {
  key: BeneficiarioCategoriaApresentacao
  label: string
  footnote?: string
}[] = [
  { key: 'demais', label: 'DEMAIS BENEFICIÁRIOS' },
  { key: 'afastados', label: 'AFASTADOS' },
  { key: 'aposent_invalidez', label: 'APOSENT. INVALIDEZ¹' },
  { key: 'aposent_tempo_servico', label: 'APOSENT. TEMPO DE SERVIÇO¹' },
  { key: 'agregados', label: 'AGREGADOS' },
  { key: 'cronicos', label: 'CRÔNICOS¹' },
  { key: 'demitidos', label: 'DEMITIDOS¹' },
  { key: 'enteado', label: 'ENTEADO' },
  { key: 'expatriados', label: 'EXPATRIADOS¹' },
  { key: 'filhos_maiores_24', label: 'FILHOS MAIORES DE 24 ANOS' },
  { key: 'home_care', label: 'HOME CARE¹' },
  { key: 'liberalidade', label: 'LIBERALIDADE¹' },
  { key: 'licenca_maternidade', label: 'LICENÇA MATERNIDADE' },
  { key: 'liminares', label: 'LIMINARES¹' },
  { key: 'prestadores_servico', label: 'PRESTADORES DE SERVIÇO¹' },
  { key: 'reclusos', label: 'RECLUSOS' },
  { key: 'remidos', label: 'REMIDOS' },
  { key: 'tea', label: 'TEA¹ ²', footnote: '² Transtorno do Espectro Autista' },
]

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseSexo(sexo: string | null | undefined): 'M' | 'F' | null {
  const s = norm(sexo)
  if (!s) return null
  if (s === 'm' || s.startsWith('masc') || s === 'homem') return 'M'
  if (s === 'f' || s.startsWith('fem') || s === 'mulher') return 'F'
  return null
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

function classifyCategoria(b: PlacementBeneficiario): BeneficiarioCategoriaApresentacao {
  const status = norm(b.statusBeneficiario)
  const cid = norm(b.cid10)
  const grau = norm(b.grauParentesco)
  const motivo = norm(b.motivoAfastamento)

  if (status.includes('afast') || cid.includes('afast') || motivo.includes('afast')) return 'afastados'
  if (status.includes('invalidez') || cid.includes('invalidez')) return 'aposent_invalidez'
  if (status.includes('tempo de servico') || status.includes('aposentado')) return 'aposent_tempo_servico'
  if (grau.includes('agregad') || status.includes('agregad')) return 'agregados'
  if (status.includes('cron') || cid.includes('cron')) return 'cronicos'
  if (status.includes('demit') || status.includes('inativo')) return 'demitidos'
  if (grau.includes('entead')) return 'enteado'
  if (status.includes('expat') || grau.includes('expat')) return 'expatriados'
  if (grau.includes('maior de 24') || grau.includes('24 anos')) return 'filhos_maiores_24'
  if (status.includes('home care') || cid.includes('home care')) return 'home_care'
  if (status.includes('liberal')) return 'liberalidade'
  if (status.includes('gestante') || cid.includes('gestante') || status.includes('maternidade')) {
    return 'licenca_maternidade'
  }
  if (status.includes('liminar')) return 'liminares'
  if (status.includes('prestador') || status.includes('pj')) return 'prestadores_servico'
  if (status.includes('reclus')) return 'reclusos'
  if (status.includes('remid') || status.includes('remido')) return 'remidos'
  if (status.includes('tea') || status.includes('autista') || cid.includes('tea')) return 'tea'

  return 'demais'
}

export type BeneficiariosResumoApresentacao = {
  total: number
  sexoM: number
  sexoF: number
  pctMasculino: number
  pctFeminino: number
  potencialGestacional: number
  acima59: number
  mediaIdade: number | null
  titulares: number
  dependentes: number
  agregados: number
  categorias: Record<BeneficiarioCategoriaApresentacao, number>
  faixasEtarias: {
    key: string
    label: string
    masculino: number
    feminino: number
  }[]
  planos: { plano: string; quantidade: number }[]
}

export function computeBeneficiariosResumo(
  rows: PlacementBeneficiario[]
): BeneficiariosResumoApresentacao {
  const categorias = Object.fromEntries(
    CATEGORIAS_APRESENTACAO.map((c) => [c.key, 0])
  ) as Record<BeneficiarioCategoriaApresentacao, number>

  const faixaMap = new Map(
    BENEFICIARIO_FAIXAS_APRESENTACAO.map((f) => [
      f.key,
      { key: f.key, label: f.label, masculino: 0, feminino: 0 },
    ])
  )

  let sexoM = 0
  let sexoF = 0
  let potencialGestacional = 0
  let acima59 = 0
  let titulares = 0
  let dependentes = 0
  let agregados = 0
  let somaIdade = 0
  let countIdade = 0
  const planoCount = new Map<string, number>()

  for (const b of rows) {
    const sex = parseSexo(b.sexo)
    if (sex === 'M') sexoM += 1
    else if (sex === 'F') sexoF += 1

    const idade = parseIdade(b.dataNascimento)
    if (idade != null) {
      somaIdade += idade
      countIdade += 1
      if (idade >= 59) acima59 += 1
      if (sex === 'F' && idade >= 19 && idade <= 38) potencialGestacional += 1

      const faixa = BENEFICIARIO_FAIXAS_APRESENTACAO.find(
        (f) => idade >= f.min && idade <= f.max
      )
      if (faixa) {
        const cell = faixaMap.get(faixa.key)!
        if (sex === 'M') cell.masculino += 1
        else if (sex === 'F') cell.feminino += 1
      }
    }

    const tipo = resolveTipoParentesco(b.grauParentesco)
    if (tipo === 'T') titulares += 1
    else if (tipo === 'D') dependentes += 1
    else if (tipo === 'A') agregados += 1

    const cat = classifyCategoria(b)
    categorias[cat] += 1

    const plano = String(b.planoAtual ?? '').trim() || 'Sem plano informado'
    planoCount.set(plano, (planoCount.get(plano) ?? 0) + 1)
  }

  const total = rows.length
  const pctMasculino = total > 0 ? Math.round((sexoM / total) * 100) : 0
  const pctFeminino = total > 0 ? Math.round((sexoF / total) * 100) : 0
  const mediaIdade = countIdade > 0 ? Math.round(somaIdade / countIdade) : null

  const planos = [...planoCount.entries()]
    .map(([plano, quantidade]) => ({ plano, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)

  return {
    total,
    sexoM,
    sexoF,
    pctMasculino,
    pctFeminino,
    potencialGestacional,
    acima59,
    mediaIdade,
    titulares,
    dependentes,
    agregados,
    categorias,
    faixasEtarias: BENEFICIARIO_FAIXAS_APRESENTACAO.map((f) => faixaMap.get(f.key)!),
    planos,
  }
}

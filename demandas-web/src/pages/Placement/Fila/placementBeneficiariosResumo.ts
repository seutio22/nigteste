import type { PlacementBeneficiario } from './placementBeneficiarios'
import { resolveTipoParentesco } from './placementBeneficiarioTipoParentesco'
import { faixaEtariaKeyFromIdade } from './placementBeneficiariosValidacao'
import { parseBeneficiarioIdadeFromValue, parseBeneficiarioSexo } from './placementBeneficiariosParse'

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

function emptyTitularidadeBucket(): TitularidadeBucket {
  return { titulares: 0, dependentes: 0, agregados: 0, naoClassificada: 0 }
}

function addTitularidade(bucket: TitularidadeBucket, tipo: ReturnType<typeof resolveTipoParentesco>) {
  if (tipo === 'T') bucket.titulares += 1
  else if (tipo === 'D') bucket.dependentes += 1
  else if (tipo === 'A') bucket.agregados += 1
  else bucket.naoClassificada += 1
}

/** Resumo T/D/A para exibir no painel de titularidade (cruzamento com STATUS). */
export function formatTitularidadeResumo(bucket: TitularidadeBucket): string | null {
  const parts: string[] = []
  if (bucket.titulares > 0) parts.push(`T${bucket.titulares}`)
  if (bucket.dependentes > 0) parts.push(`D${bucket.dependentes}`)
  if (bucket.agregados > 0) parts.push(`A${bucket.agregados}`)
  if (bucket.naoClassificada > 0) parts.push(`?${bucket.naoClassificada}`)
  return parts.length ? parts.join(' · ') : null
}

export type TitularidadeBucket = {
  titulares: number
  dependentes: number
  agregados: number
  naoClassificada: number
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
  titularidadeNaoClassificada: number
  categorias: Record<BeneficiarioCategoriaApresentacao, number>
  /** STATUS (categoria) cruzado com titularidade (grau de parentesco). */
  categoriasPorTitularidade: Record<BeneficiarioCategoriaApresentacao, TitularidadeBucket>
  faixasEtarias: {
    key: string
    label: string
    masculino: number
    feminino: number
    semSexo: number
  }[]
  planos: { plano: string; quantidade: number }[]
}

export function computeBeneficiariosResumo(
  rows: PlacementBeneficiario[]
): BeneficiariosResumoApresentacao {
  const categorias = Object.fromEntries(
    CATEGORIAS_APRESENTACAO.map((c) => [c.key, 0])
  ) as Record<BeneficiarioCategoriaApresentacao, number>

  const categoriasPorTitularidade = Object.fromEntries(
    CATEGORIAS_APRESENTACAO.map((c) => [c.key, emptyTitularidadeBucket()])
  ) as Record<BeneficiarioCategoriaApresentacao, TitularidadeBucket>

  const faixaMap = new Map(
    BENEFICIARIO_FAIXAS_APRESENTACAO.map((f) => [
      f.key,
      { key: f.key, label: f.label, masculino: 0, feminino: 0, semSexo: 0 },
    ])
  )

  let sexoM = 0
  let sexoF = 0
  let potencialGestacional = 0
  let acima59 = 0
  let titulares = 0
  let dependentes = 0
  let agregados = 0
  let titularidadeNaoClassificada = 0
  let somaIdade = 0
  let countIdade = 0
  const planoCount = new Map<string, number>()

  for (const b of rows) {
    const sex = parseBeneficiarioSexo(b.sexo)
    if (sex === 'M') sexoM += 1
    else if (sex === 'F') sexoF += 1

    const idade = parseBeneficiarioIdadeFromValue(b.dataNascimento)
    if (idade != null) {
      somaIdade += idade
      countIdade += 1
      if (idade >= 59) acima59 += 1
      if (sex === 'F' && idade >= 19 && idade <= 38) potencialGestacional += 1

      const faixaKey = faixaEtariaKeyFromIdade(idade)
      if (faixaKey) {
        const cell = faixaMap.get(faixaKey)!
        if (sex === 'M') cell.masculino += 1
        else if (sex === 'F') cell.feminino += 1
        else cell.semSexo += 1
      }
    }

    const tipo = resolveTipoParentesco(b.grauParentesco)
    if (tipo === 'T') titulares += 1
    else if (tipo === 'D') dependentes += 1
    else if (tipo === 'A') agregados += 1
    else titularidadeNaoClassificada += 1

    const cat = classifyCategoria(b)
    categorias[cat] += 1
    addTitularidade(categoriasPorTitularidade[cat], tipo)

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
    titularidadeNaoClassificada,
    categorias,
    categoriasPorTitularidade,
    faixasEtarias: BENEFICIARIO_FAIXAS_APRESENTACAO.map((f) => faixaMap.get(f.key)!),
    planos,
  }
}

/** Dimensões clicáveis no painel Grupo elegível (filtros cruzados). */
export type BeneficiariosResumoFiltro = {
  titularidade?: 'T' | 'D' | 'A' | '?' | null
  faixaKey?: string | null
  plano?: string | null
  categoria?: BeneficiarioCategoriaApresentacao | null
  sexo?: 'M' | 'F' | null
  potencialGestacional?: boolean
  acima59?: boolean
}

export function emptyBeneficiariosResumoFiltro(): BeneficiariosResumoFiltro {
  return {}
}

export function beneficiariosResumoFiltroAtivo(filtro: BeneficiariosResumoFiltro | null | undefined): boolean {
  if (!filtro) return false
  return Boolean(
    filtro.titularidade ||
      filtro.faixaKey ||
      filtro.plano ||
      filtro.categoria ||
      filtro.sexo ||
      filtro.potencialGestacional ||
      filtro.acima59
  )
}

function planoLabel(b: PlacementBeneficiario): string {
  return String(b.planoAtual ?? '').trim() || 'Sem plano informado'
}

function matchesFiltro(b: PlacementBeneficiario, filtro: BeneficiariosResumoFiltro): boolean {
  if (filtro.titularidade) {
    const tipo = resolveTipoParentesco(b.grauParentesco)
    const code = tipo ?? '?'
    if (code !== filtro.titularidade) return false
  }
  if (filtro.categoria && classifyCategoria(b) !== filtro.categoria) return false
  if (filtro.plano && planoLabel(b) !== filtro.plano) return false
  if (filtro.sexo) {
    const sex = parseBeneficiarioSexo(b.sexo)
    if (sex !== filtro.sexo) return false
  }

  const idade = parseBeneficiarioIdadeFromValue(b.dataNascimento)
  if (filtro.faixaKey) {
    if (idade == null) return false
    if (faixaEtariaKeyFromIdade(idade) !== filtro.faixaKey) return false
  }
  if (filtro.acima59) {
    if (idade == null || idade < 59) return false
  }
  if (filtro.potencialGestacional) {
    const sex = parseBeneficiarioSexo(b.sexo)
    if (sex !== 'F' || idade == null || idade < 19 || idade > 38) return false
  }
  return true
}

/** Filtra a base antes de recomputar o resumo (titularidade → faixas/planos/métricas). */
export function filterBeneficiariosForResumo(
  rows: PlacementBeneficiario[],
  filtro: BeneficiariosResumoFiltro | null | undefined
): PlacementBeneficiario[] {
  if (!beneficiariosResumoFiltroAtivo(filtro)) return rows
  return rows.filter((b) => matchesFiltro(b, filtro!))
}

export function toggleBeneficiariosFiltroValor<K extends keyof BeneficiariosResumoFiltro>(
  filtro: BeneficiariosResumoFiltro,
  key: K,
  value: BeneficiariosResumoFiltro[K]
): BeneficiariosResumoFiltro {
  const current = filtro[key]
  const same =
    current === value ||
    (current == null && (value == null || value === false)) ||
    (value === true && current === true)
  if (same) {
    const next = { ...filtro }
    delete next[key]
    return next
  }
  return { ...filtro, [key]: value }
}

export function describeBeneficiariosFiltro(filtro: BeneficiariosResumoFiltro): string[] {
  const parts: string[] = []
  if (filtro.titularidade === 'T') parts.push('Titulares')
  else if (filtro.titularidade === 'D') parts.push('Dependentes')
  else if (filtro.titularidade === 'A') parts.push('Agregados')
  else if (filtro.titularidade === '?') parts.push('Não classificados')
  if (filtro.sexo === 'M') parts.push('Masculino')
  if (filtro.sexo === 'F') parts.push('Feminino')
  if (filtro.faixaKey) {
    const label = BENEFICIARIO_FAIXAS_APRESENTACAO.find((f) => f.key === filtro.faixaKey)?.label
    parts.push(label ? `Faixa ${label}` : `Faixa ${filtro.faixaKey}`)
  }
  if (filtro.plano) parts.push(`Plano: ${filtro.plano}`)
  if (filtro.categoria) {
    const label = CATEGORIAS_APRESENTACAO.find((c) => c.key === filtro.categoria)?.label
    parts.push(label ? label.replace(/¹|²/g, '').trim() : filtro.categoria)
  }
  if (filtro.potencialGestacional) parts.push('Pot. gestacional (F 19–38)')
  if (filtro.acima59) parts.push('59+ anos')
  return parts
}

/** Frase curta de inteligência sobre o recorte filtrado. */
export function insightBeneficiariosResumo(
  resumo: BeneficiariosResumoApresentacao,
  totalBase: number
): string {
  const pctBase = totalBase > 0 ? Math.round((resumo.total / totalBase) * 100) : 0
  const parts: string[] = [`${resumo.total} de ${totalBase} vidas (${pctBase}%)`]
  if (resumo.mediaIdade != null) parts.push(`média ${resumo.mediaIdade} anos`)
  if (resumo.planos[0]) {
    const top = resumo.planos[0]
    const pctPlano = resumo.total > 0 ? Math.round((top.quantidade / resumo.total) * 100) : 0
    parts.push(`plano líder: ${top.plano} (${pctPlano}%)`)
  }
  if (resumo.total > 0) {
    parts.push(`${resumo.pctFeminino}% ♀ · ${resumo.pctMasculino}% ♂`)
  }
  return parts.join(' · ')
}

import type { PlacementBeneficiario } from './placementBeneficiarios'

const UF_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

const UF_FROM_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(UF_NAMES).map(([uf, name]) => [
    name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
    uf,
  ])
)

function normText(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function normalizeUf(uf: string | null | undefined): string | null {
  const raw = normText(uf)
  if (!raw) return null
  if (raw.length === 2 && UF_NAMES[raw]) return raw
  return UF_FROM_NAME[raw] ?? null
}

function normCidade(cidade: string | null | undefined): string {
  const c = String(cidade ?? '').trim()
  if (!c) return 'Sem município informado'
  return c
}

export type MunicipioRankingRow = {
  rank: number
  uf: string
  municipio: string
  vidas: number
  percentual: number
}

export type UfVidasRow = {
  uf: string
  nome: string
  vidas: number
}

export type LocalidadeResumoApresentacao = {
  total: number
  operadoraLabel: string
  topMunicipios: MunicipioRankingRow[]
  demaisLocalidades: { vidas: number; percentual: number }
  porUf: UfVidasRow[]
  maxUfVidas: number
  minUfVidas: number
}

const TOP_N = 10

export function computeLocalidadeResumo(rows: PlacementBeneficiario[]): LocalidadeResumoApresentacao {
  const total = rows.length

  const municipioMap = new Map<string, { uf: string; municipio: string; count: number }>()
  const ufMap = new Map<string, number>()
  const operadoraMap = new Map<string, number>()

  for (const b of rows) {
    const uf = normalizeUf(b.uf) ?? 'NI'
    const municipio = normCidade(b.cidade)
    const key = `${uf}|${municipio.toLowerCase()}`

    const m = municipioMap.get(key) ?? { uf, municipio, count: 0 }
    m.count += 1
    municipioMap.set(key, m)

    ufMap.set(uf, (ufMap.get(uf) ?? 0) + 1)

    const op = String(b.operadora ?? '').trim()
    if (op) operadoraMap.set(op, (operadoraMap.get(op) ?? 0) + 1)
  }

  const sortedMunicipios = [...municipioMap.values()].sort((a, b) => b.count - a.count)
  const topRaw = sortedMunicipios.slice(0, TOP_N)
  const topSum = topRaw.reduce((s, m) => s + m.count, 0)
  const demaisVidas = Math.max(total - topSum, 0)

  const topMunicipios: MunicipioRankingRow[] = topRaw.map((m, i) => ({
    rank: i + 1,
    uf: m.uf,
    municipio: m.municipio,
    vidas: m.count,
    percentual: total > 0 ? Math.round((m.count / total) * 100) : 0,
  }))

  const demaisLocalidades = {
    vidas: demaisVidas,
    percentual: total > 0 ? Math.round((demaisVidas / total) * 100) : 0,
  }

  const porUf: UfVidasRow[] = [...ufMap.entries()]
    .map(([uf, vidas]) => ({
      uf,
      nome: UF_NAMES[uf] ?? uf,
      vidas,
    }))
    .sort((a, b) => b.vidas - a.vidas)

  const vidasList = porUf.map((u) => u.vidas)
  const maxUfVidas = vidasList.length ? Math.max(...vidasList) : 0
  const minUfVidas = vidasList.length ? Math.min(...vidasList) : 0

  const topOperadora = [...operadoraMap.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    total,
    operadoraLabel: topOperadora?.[0]?.toUpperCase() ?? 'VIDAS',
    topMunicipios,
    demaisLocalidades,
    porUf,
    maxUfVidas,
    minUfVidas: minUfVidas === maxUfVidas && maxUfVidas > 0 ? 0 : minUfVidas,
  }
}

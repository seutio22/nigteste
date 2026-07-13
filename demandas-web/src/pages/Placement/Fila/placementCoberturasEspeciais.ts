import type { PlanoCoberturaForm } from './placementCotacaoDetalhes'
import type { SimNaoChoice } from './UpgradeDowngradeFields'

export type CoberturaEspecialCatalogEntry = {
  key: string
  titulo: string
  detalheLabel: string
}

/** Catálogo fixo conforme especificação / imagem. */
export const COBERTURAS_ESPECIAIS_CATALOGO: CoberturaEspecialCatalogEntry[] = [
  {
    key: 'cirurgia_refrativa',
    titulo: 'Cirurgia refrativa (Além do rol)',
    detalheLabel: 'A partir de quantos graus?',
  },
  {
    key: 'escleroterapia',
    titulo: 'Escleroterapia',
    detalheLabel: 'Quantidade por ano',
  },
  {
    key: 'checkup_cobertura',
    titulo: 'Check-up',
    detalheLabel: 'Possui cobertura?',
  },
  {
    key: 'checkup_elegibilidade',
    titulo: 'Check-up',
    detalheLabel: 'Qual a regra de elegibilidade?',
  },
  {
    key: 'checkup_prestadores',
    titulo: 'Check-up',
    detalheLabel: 'Quais os prestadores cobertos?',
  },
  {
    key: 'acompanhante_internacao',
    titulo: 'Acompanhante em internação',
    detalheLabel: 'Possui limite de idade? Cobertura para refeição?',
  },
  {
    key: 'transplantes_extra_rol',
    titulo: 'Transplantes extra Rol ANS?',
    detalheLabel: 'Se positivo, especificar',
  },
  {
    key: 'rpg',
    titulo: 'RPG',
    detalheLabel: 'Quantidade de sessões / cobertura ou reembolso?',
  },
  {
    key: 'remissao',
    titulo: 'Remissão?',
    detalheLabel: 'Qual período?',
  },
  {
    key: 'telemedicina',
    titulo: 'Possui telemedicina?',
    detalheLabel: 'Se sim, incide coparticipação?',
  },
  {
    key: 'telepsicologia',
    titulo: 'Possui telepsicologia?',
    detalheLabel: 'Se sim, incide coparticipação?',
  },
  {
    key: 'retaguarda',
    titulo: 'Possui retaguarda?',
    detalheLabel: 'Especificar hospitais (ex.: HIAE, HSL e STAR)',
  },
  {
    key: 'sala_vip',
    titulo: 'Possui sala VIP?',
    detalheLabel: 'Especificar hospitais elegíveis',
  },
  {
    key: 'coleta_domicilio',
    titulo: 'Coleta de exames em domicílio',
    detalheLabel: '',
  },
  {
    key: 'seguro_viagem',
    titulo: 'Seguro viagem?',
    detalheLabel: 'Especificar abrangência, coberturas e valores',
  },
  {
    key: 'isencao_copart_gestante',
    titulo: 'Isenção de coparticipação de gestante',
    detalheLabel: '',
  },
  {
    key: 'concierge',
    titulo: 'Concierge',
    detalheLabel: 'Detalhar coberturas e elegíveis',
  },
  {
    key: 'vacinas',
    titulo: 'Vacinas',
    detalheLabel: 'Detalhar calendário oficial e/ou se viajante',
  },
]

export type CoberturaEspecialItem = {
  id: string
  catalogKey: string | null
  titulo: string
  detalheLabel: string
  possui: SimNaoChoice
  planosIds: string[]
  detalhe: string
}

export type CoberturasEspeciais = {
  itens: CoberturaEspecialItem[]
}

export const EMPTY_COBERTURAS_ESPECIAIS: CoberturasEspeciais = {
  itens: emptyCoberturasEspeciaisItens(),
}

export function newCoberturaEspecialId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cob-esp-${crypto.randomUUID()}`
  }
  return `cob-esp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function catalogItemToForm(entry: CoberturaEspecialCatalogEntry): CoberturaEspecialItem {
  return {
    id: entry.key,
    catalogKey: entry.key,
    titulo: entry.titulo,
    detalheLabel: entry.detalheLabel,
    possui: '',
    planosIds: [],
    detalhe: '',
  }
}

export function emptyCoberturasEspeciaisItens(): CoberturaEspecialItem[] {
  return COBERTURAS_ESPECIAIS_CATALOGO.map(catalogItemToForm)
}

function parsePossui(raw: unknown): SimNaoChoice {
  if (raw === true || raw === 'sim') return 'sim'
  if (raw === false || raw === 'nao') return 'nao'
  return ''
}

function itemFromApiRow(row: Record<string, unknown>, valid: Set<string>): CoberturaEspecialItem | null {
  const catalogKey = row.catalogKey != null ? String(row.catalogKey) : null
  const catalog = catalogKey
    ? COBERTURAS_ESPECIAIS_CATALOGO.find((c) => c.key === catalogKey)
    : undefined

  const id = String(row.id ?? catalogKey ?? newCoberturaEspecialId())
  const titulo = row.titulo != null ? String(row.titulo).trim() : catalog?.titulo ?? ''
  if (!titulo) return null

  const detalheLabel =
    row.detalheLabel != null
      ? String(row.detalheLabel)
      : catalog?.detalheLabel ?? ''

  const planosIds = Array.isArray(row.planosIds)
    ? row.planosIds.map(String).filter((pid) => valid.has(pid))
    : []

  return {
    id,
    catalogKey: catalogKey && catalog ? catalogKey : null,
    titulo,
    detalheLabel,
    possui: parsePossui(row.possui),
    planosIds,
    detalhe: row.detalhe != null ? String(row.detalhe) : '',
  }
}

export function mergeCoberturasEspeciaisItens(
  fromApi: CoberturaEspecialItem[]
): CoberturaEspecialItem[] {
  const byKey = new Map<string, CoberturaEspecialItem>()
  for (const item of fromApi) {
    if (item.catalogKey) byKey.set(item.catalogKey, item)
  }

  const merged: CoberturaEspecialItem[] = COBERTURAS_ESPECIAIS_CATALOGO.map((entry) => {
    const saved = byKey.get(entry.key)
    if (saved) {
      return {
        ...catalogItemToForm(entry),
        possui: saved.possui,
        planosIds: saved.planosIds,
        detalhe: saved.detalhe,
      }
    }
    return catalogItemToForm(entry)
  })

  for (const item of fromApi) {
    if (!item.catalogKey) merged.push(item)
  }

  return merged
}

export function pruneCoberturasEspeciaisItens(
  itens: CoberturaEspecialItem[],
  validPlanoIds: Set<string>
): CoberturaEspecialItem[] {
  return itens.map((item) => {
    if (item.possui !== 'sim') {
      return { ...item, planosIds: [], detalhe: '' }
    }
    return {
      ...item,
      planosIds: item.planosIds.filter((id) => validPlanoIds.has(id)),
    }
  })
}

/** Marca «Não» em todos os itens do catálogo e coberturas adicionais. */
export function marcarTodasCoberturasEspeciaisNao(state: CoberturasEspeciais): CoberturasEspeciais {
  return {
    itens: state.itens.map((item) => ({
      ...item,
      possui: 'nao',
      planosIds: [],
      detalhe: '',
    })),
  }
}

export function coberturasEspeciaisFromApi(
  raw: unknown,
  planos: PlanoCoberturaForm[]
): CoberturasEspeciais {
  const valid = new Set(planos.map((p) => p.id))
  if (!raw) return { itens: emptyCoberturasEspeciaisItens() }

  let rows: unknown[] = []
  if (Array.isArray(raw)) rows = raw
  else if (typeof raw === 'object' && raw !== null && Array.isArray((raw as { itens?: unknown }).itens)) {
    rows = (raw as { itens: unknown[] }).itens
  }

  const parsed: CoberturaEspecialItem[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const item = itemFromApiRow(row as Record<string, unknown>, valid)
    if (item) parsed.push(item)
  }

  return {
    itens: pruneCoberturasEspeciaisItens(mergeCoberturasEspeciaisItens(parsed), valid),
  }
}

export function coberturasEspeciaisToApi(state: CoberturasEspeciais) {
  const itens = state.itens.filter(
    (i) =>
      i.possui !== '' ||
      i.planosIds.length > 0 ||
      i.detalhe.trim() ||
      (!i.catalogKey && i.titulo.trim())
  )

  if (!itens.length) return undefined

  return {
    itens: itens.map((i) => ({
      id: i.id,
      catalogKey: i.catalogKey,
      titulo: i.titulo.trim(),
      detalheLabel: i.detalheLabel.trim(),
      possui: i.possui === 'sim',
      planosIds: i.possui === 'sim' ? i.planosIds : [],
      detalhe: i.possui === 'sim' ? i.detalhe.trim() : '',
    })),
  }
}

import type { CotacaoFormState } from './CotacaoFormFields'
import type { KickOffEstrategia } from './placementKickOffEstrategia'
import {
  ensureConsolidandoDadosState,
  parseConsolidandoDadosFromKickOff,
  type ConsolidandoDadosState,
} from './placementConsolidandoDados'
import { DIFERENCIAL_ITEM_KEYS, labelDiferencialItem } from './placementDiferenciaisCatalogo'
import {
  CONDICAO_CONTRATUAL_ITEM_KEYS,
  labelCondicaoContratualItem,
} from './placementCondicoesContratuaisCatalogo'
import {
  INDICADOR_OPERADORA_ITEM_KEYS,
  labelIndicadorOperadoraItem,
} from './placementIndicadoresOperadorasCatalogo'

export type ValidacaoPropostaItemStatus = 'pendente' | 'ok' | 'ajuste'

export type ValidacaoPropostaSecao =
  | 'resumo'
  | 'condicoes'
  | 'diferenciais'
  | 'indicadores'
  | 'outro'

export type ValidacaoPropostaItem = {
  id: string
  secao: ValidacaoPropostaSecao
  itemKey?: string
  label: string
  status: ValidacaoPropostaItemStatus
  comentario: string
  updatedAt?: string
  updatedBy?: string
}

export type ValidacaoPropostaHistorico = {
  id: string
  at: string
  by?: string
  acao: 'designar' | 'avaliar' | 'devolver' | 'aprovar' | 'outro'
  detalhe?: string
}

export type ValidacaoPropostaState = {
  analistaValidadorId: string
  itens: ValidacaoPropostaItem[]
  decisao?: 'aprovado' | 'devolver' | null
  historico: ValidacaoPropostaHistorico[]
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyValidacaoPropostaState(): ValidacaoPropostaState {
  return {
    analistaValidadorId: '',
    itens: [],
    decisao: null,
    historico: [],
  }
}

function mapTemTexto(
  map: Record<string, Record<string, Array<{ texto?: string }>>> | undefined,
  itemKey: string
): boolean {
  const porColuna = map?.[itemKey]
  if (!porColuna || typeof porColuna !== 'object') return false
  for (const celulas of Object.values(porColuna)) {
    if (Array.isArray(celulas) && celulas.some((c) => String(c?.texto ?? '').trim())) return true
  }
  return false
}

/** Gera a lista inicial de itens a avaliar a partir do consolidado. */
export function buildValidacaoItensFromConsolidando(
  cd: ConsolidandoDadosState | null | undefined
): ValidacaoPropostaItem[] {
  const state = ensureConsolidandoDadosState(cd)
  const now = new Date().toISOString()
  const itens: ValidacaoPropostaItem[] = []

  if (state.resumoCoberturas.trim()) {
    itens.push({
      id: uid('vp-resumo'),
      secao: 'resumo',
      itemKey: 'resumoCoberturas',
      label: 'Resumo de coberturas',
      status: 'pendente',
      comentario: '',
      updatedAt: now,
    })
  }

  if (state.condicoesContratuais.trim()) {
    itens.push({
      id: uid('vp-cond-livres'),
      secao: 'condicoes',
      itemKey: 'condicoesContratuais',
      label: 'Condições contratuais (texto livre)',
      status: 'pendente',
      comentario: '',
      updatedAt: now,
    })
  }

  for (const key of CONDICAO_CONTRATUAL_ITEM_KEYS) {
    if (!mapTemTexto(state.condicoes, key)) continue
    itens.push({
      id: uid(`vp-cond-${key}`),
      secao: 'condicoes',
      itemKey: key,
      label: labelCondicaoContratualItem(key),
      status: 'pendente',
      comentario: '',
      updatedAt: now,
    })
  }

  for (const key of DIFERENCIAL_ITEM_KEYS) {
    if (!mapTemTexto(state.diferenciais, key)) continue
    itens.push({
      id: uid(`vp-dif-${key}`),
      secao: 'diferenciais',
      itemKey: key,
      label: labelDiferencialItem(key),
      status: 'pendente',
      comentario: '',
      updatedAt: now,
    })
  }

  for (const key of INDICADOR_OPERADORA_ITEM_KEYS) {
    if (!mapTemTexto(state.indicadores, key)) continue
    itens.push({
      id: uid(`vp-ind-${key}`),
      secao: 'indicadores',
      itemKey: key,
      label: labelIndicadorOperadoraItem(key),
      status: 'pendente',
      comentario: '',
      updatedAt: now,
    })
  }

  return itens
}

export function parseValidacaoPropostaFromKickOff(raw: unknown): ValidacaoPropostaState {
  const kick =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as KickOffEstrategia)
      : null
  const vp = kick?.validacaoProposta
  if (!vp || typeof vp !== 'object') return emptyValidacaoPropostaState()

  const itensRaw = Array.isArray(vp.itens) ? vp.itens : []
  const itens: ValidacaoPropostaItem[] = itensRaw
    .map((it) => {
      if (!it || typeof it !== 'object') return null
      const o = it as Record<string, unknown>
      const statusRaw = String(o.status ?? 'pendente')
      const status: ValidacaoPropostaItemStatus =
        statusRaw === 'ok' || statusRaw === 'ajuste' || statusRaw === 'pendente'
          ? statusRaw
          : 'pendente'
      const secaoRaw = String(o.secao ?? 'outro')
      const secao: ValidacaoPropostaSecao =
        secaoRaw === 'resumo' ||
        secaoRaw === 'condicoes' ||
        secaoRaw === 'diferenciais' ||
        secaoRaw === 'indicadores' ||
        secaoRaw === 'outro'
          ? secaoRaw
          : 'outro'
      return {
        id: String(o.id || uid('vp')),
        secao,
        itemKey: o.itemKey != null ? String(o.itemKey) : undefined,
        label: String(o.label || 'Item'),
        status,
        comentario: String(o.comentario ?? ''),
        updatedAt: o.updatedAt != null ? String(o.updatedAt) : undefined,
        updatedBy: o.updatedBy != null ? String(o.updatedBy) : undefined,
      } satisfies ValidacaoPropostaItem
    })
    .filter(Boolean) as ValidacaoPropostaItem[]

  const histRaw = Array.isArray(vp.historico) ? vp.historico : []
  const historico: ValidacaoPropostaHistorico[] = histRaw
    .map((h) => {
      if (!h || typeof h !== 'object') return null
      const o = h as Record<string, unknown>
      const acaoRaw = String(o.acao ?? 'outro')
      const acao: ValidacaoPropostaHistorico['acao'] =
        acaoRaw === 'designar' ||
        acaoRaw === 'avaliar' ||
        acaoRaw === 'devolver' ||
        acaoRaw === 'aprovar' ||
        acaoRaw === 'outro'
          ? acaoRaw
          : 'outro'
      return {
        id: String(o.id || uid('vph')),
        at: String(o.at || new Date().toISOString()),
        by: o.by != null ? String(o.by) : undefined,
        acao,
        detalhe: o.detalhe != null ? String(o.detalhe) : undefined,
      } satisfies ValidacaoPropostaHistorico
    })
    .filter(Boolean) as ValidacaoPropostaHistorico[]

  const decisaoRaw = vp.decisao
  const decisao =
    decisaoRaw === 'aprovado' || decisaoRaw === 'devolver' ? decisaoRaw : null

  return {
    analistaValidadorId: String(vp.analistaValidadorId ?? '').trim(),
    itens,
    decisao,
    historico,
  }
}

/** Garante itens seedados a partir do consolidado se a lista estiver vazia. */
export function ensureValidacaoPropostaState(
  current: ValidacaoPropostaState | null | undefined,
  form: CotacaoFormState
): ValidacaoPropostaState {
  const base = current ?? emptyValidacaoPropostaState()
  if (base.itens.length > 0) return base
  const cd = parseConsolidandoDadosFromKickOff(form.kickOffEstrategia)
  return {
    ...base,
    itens: buildValidacaoItensFromConsolidando(cd),
  }
}

export function validacaoPropostaHasValidador(state: ValidacaoPropostaState | null | undefined): boolean {
  return !!String(state?.analistaValidadorId ?? '').trim()
}

export function validacaoPropostaItensPendentes(
  state: ValidacaoPropostaState | null | undefined
): ValidacaoPropostaItem[] {
  return (state?.itens ?? []).filter((i) => i.status === 'pendente')
}

export function validacaoPropostaItensComAjuste(
  state: ValidacaoPropostaState | null | undefined
): ValidacaoPropostaItem[] {
  return (state?.itens ?? []).filter((i) => i.status === 'ajuste')
}

/** Pronto para enviar proposta: validador + todos avaliados + nenhum ajuste pendente. */
export function validacaoPropostaPodeAprovar(state: ValidacaoPropostaState | null | undefined): {
  ok: boolean
  message?: string
} {
  if (!validacaoPropostaHasValidador(state)) {
    return { ok: false, message: 'Designe o analista validador antes de aprovar.' }
  }
  if (!(state?.itens ?? []).length) {
    return { ok: false, message: 'Não há itens para avaliar. Avance a partir de Consolidando dados.' }
  }
  const pendentes = validacaoPropostaItensPendentes(state)
  if (pendentes.length) {
    return {
      ok: false,
      message: `Ainda há ${pendentes.length} item(ns) pendente(s) de avaliação.`,
    }
  }
  const ajustes = validacaoPropostaItensComAjuste(state)
  if (ajustes.length) {
    return {
      ok: false,
      message: `Há ${ajustes.length} ajuste(s) registrado(s). Devolva para Consolidando dados ou marque-os como OK após correção.`,
    }
  }
  return { ok: true }
}

/** Devolver: precisa de pelo menos um item com ajuste e comentário. */
export function validacaoPropostaPodeDevolver(state: ValidacaoPropostaState | null | undefined): {
  ok: boolean
  message?: string
} {
  if (!validacaoPropostaHasValidador(state)) {
    return { ok: false, message: 'Designe o analista validador antes de devolver.' }
  }
  const ajustes = validacaoPropostaItensComAjuste(state)
  if (!ajustes.length) {
    return {
      ok: false,
      message: 'Marque ao menos um item como «Ajuste» e descreva o que precisa ser corrigido.',
    }
  }
  const semComentario = ajustes.filter((a) => !String(a.comentario ?? '').trim())
  if (semComentario.length) {
    return {
      ok: false,
      message: 'Todo item marcado como ajuste precisa de um comentário descrevendo a correção.',
    }
  }
  return { ok: true }
}

export function appendValidacaoHistorico(
  state: ValidacaoPropostaState,
  entry: Omit<ValidacaoPropostaHistorico, 'id' | 'at'> & { at?: string }
): ValidacaoPropostaState {
  return {
    ...state,
    historico: [
      {
        id: uid('vph'),
        at: entry.at ?? new Date().toISOString(),
        by: entry.by,
        acao: entry.acao,
        detalhe: entry.detalhe,
      },
      ...state.historico,
    ],
  }
}

export function createValidacaoAjusteLivre(label: string, comentario: string): ValidacaoPropostaItem {
  return {
    id: uid('vp-livre'),
    secao: 'outro',
    label: label.trim() || 'Ajuste adicional',
    status: 'ajuste',
    comentario: comentario.trim(),
    updatedAt: new Date().toISOString(),
  }
}

export function secaoLabel(secao: ValidacaoPropostaSecao): string {
  switch (secao) {
    case 'resumo':
      return 'Consolidado — Resumo de coberturas'
    case 'condicoes':
      return 'Consolidado — Condições contratuais'
    case 'diferenciais':
      return 'Consolidado — Diferenciais'
    case 'indicadores':
      return 'Consolidado — Indicadores'
    default:
      return 'Itens adicionais / ajustes livres'
  }
}

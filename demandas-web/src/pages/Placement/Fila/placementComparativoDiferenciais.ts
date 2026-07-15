import type { CotacaoFormState } from './CotacaoFormFields'
import { TAB_COLORS } from './placementContratoAtual'
import {
  ensureAguardandoOperadoraState,
  classificacaoPermitePropostaValores,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
import {
  DIFERENCIAL_ITENS,
  labelDiferencialItem,
  type DiferencialItemKey,
} from './placementDiferenciaisCatalogo'
import {
  ensureConsolidandoDadosState,
  formatDiferencialCelulasTexto,
  parseConsolidandoDadosFromKickOff,
  type DiferencialCelulaCotacao,
} from './placementConsolidandoDados'
import { isFornecedorAtualNome } from './placementPropostaCenarioAtual'
import { mercadoNomesComFornecedoresAtuais, normMercadoKey } from './placementMercadoQuadro'
import type { Operadora } from '../../../types/masterData'

export type ComparativoDiferencialColuna = {
  id: string
  grupo: 'atual' | 'mercado'
  operadora: string
  operadoraId: string
  tabColor: string
}

export type ComparativoDiferencialLinha = {
  itemKey: DiferencialItemKey
  label: string
  valores: Record<string, string>
  celulasPorColuna: Record<string, DiferencialCelulaCotacao[]>
}

export type ComparativoDiferencialPagina = {
  pageIndex: number
  totalPages: number
  titulo: string
  colunas: ComparativoDiferencialColuna[]
  linhas: ComparativoDiferencialLinha[]
  notasRodape: string
}

function resolveOperadoraIdByNome(
  nome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): string {
  const key = normMercadoKey(nome)
  const hit = operadoras.find((o) => normMercadoKey(o.nome) === key)
  if (hit) return hit.id
  if (operadorasById) {
    for (const o of Object.values(operadorasById)) {
      if (normMercadoKey(o.nome) === key) return o.id
    }
  }
  return ''
}

export function buildComparativoDiferencialColunas(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): ComparativoDiferencialColuna[] {
  const agState = ensureAguardandoOperadoraState(
    parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
    form,
    operadoras,
    operadorasById
  )
  const quadro = agState.quadroMercado
  const mercado = mercadoNomesComFornecedoresAtuais(form, operadoras, operadorasById)
  const colunas: ComparativoDiferencialColuna[] = []
  let colorIdx = 0

  for (const nome of mercado) {
    const key = normMercadoKey(nome)
    const proposta = agState.propostas[key]
    if (!proposta?.incluirNoComparativo) continue

    const ag = agState.fornecedores[key]
    if (ag && !classificacaoPermitePropostaValores(ag.classificacaoMercado)) continue

    const isAtual =
      ag?.classificacaoMercado === 'fornecedor_atual' ||
      isFornecedorAtualNome(nome, form, operadoras, operadorasById)

    if (isAtual && !incluirAtual) continue
    if (isAtual && !quadro.showFornecedorAtual) continue
    if (!isAtual && !quadro.showMercadoConsultado) continue

    colunas.push({
      id: key,
      grupo: isAtual ? 'atual' : 'mercado',
      operadora: nome.toUpperCase(),
      operadoraId: resolveOperadoraIdByNome(nome, operadoras, operadorasById),
      tabColor: TAB_COLORS[colorIdx++ % TAB_COLORS.length],
    })
  }

  return colunas
}

export function buildComparativoDiferencialPages(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): ComparativoDiferencialPagina[] {
  const colunas = buildComparativoDiferencialColunas(form, operadoras, operadorasById, incluirAtual)
  const cd = ensureConsolidandoDadosState(parseConsolidandoDadosFromKickOff(form.kickOffEstrategia))

  const linhas: ComparativoDiferencialLinha[] = DIFERENCIAL_ITENS.map((item) => {
    const porColuna = cd.diferenciais[item.key] ?? {}
    const valores: Record<string, string> = {}
    const celulasPorColuna: Record<string, DiferencialCelulaCotacao[]> = {}
    for (const col of colunas) {
      const celulas = porColuna[col.id] ?? []
      celulasPorColuna[col.id] = celulas
      valores[col.id] = formatDiferencialCelulasTexto(celulas)
    }
    return {
      itemKey: item.key,
      label: labelDiferencialItem(item.key),
      valores,
      celulasPorColuna,
    }
  })

  if (!colunas.length) return []

  return [
    {
      pageIndex: 0,
      totalPages: 1,
      titulo: 'Diferenciais',
      colunas,
      linhas,
      notasRodape:
        cd.notasRodape?.trim() ||
        'Informações sujeitas a limites e critérios contratuais. Podem ser revisadas a qualquer momento, sem aviso prévio.',
    },
  ]
}

export function buildComparativoDiferencialLinhasResumo(): { key: DiferencialItemKey; label: string }[] {
  return DIFERENCIAL_ITENS.map((i) => ({ key: i.key, label: i.label }))
}

export function listarColunasDiferenciais(
  colunas: ComparativoDiferencialColuna[]
): { id: string; label: string; grupo: string; operadora: string; planoLabel: string }[] {
  return colunas.map((c) => ({
    id: c.id,
    label: c.operadora,
    grupo: c.grupo === 'atual' ? 'Contrato atual' : 'Mercado consultado',
    operadora: c.operadora,
    planoLabel: c.grupo === 'atual' ? 'ATUAL' : 'MERCADO CONSUL.',
  }))
}

export function filterDiferencialPages(
  pages: ComparativoDiferencialPagina[],
  colunasVisiveis: ComparativoDiferencialColuna[]
): ComparativoDiferencialPagina[] {
  const ids = new Set(colunasVisiveis.map((c) => c.id))
  return pages.map((p) => ({
    ...p,
    colunas: p.colunas.filter((c) => ids.has(c.id)),
    linhas: p.linhas.map((l) => ({
      ...l,
      valores: Object.fromEntries(
        Object.entries(l.valores).filter(([id]) => ids.has(id))
      ),
      celulasPorColuna: Object.fromEntries(
        Object.entries(l.celulasPorColuna).filter(([id]) => ids.has(id))
      ),
    })),
  }))
}

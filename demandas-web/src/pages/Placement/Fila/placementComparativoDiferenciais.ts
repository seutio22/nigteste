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
} from './placementDiferenciaisCatalogo'
import {
  CONDICAO_CONTRATUAL_ITENS,
  labelCondicaoContratualItem,
} from './placementCondicoesContratuaisCatalogo'
import {
  INDICADOR_OPERADORA_ITENS,
  INDICADORES_NOTAS_RODAPE_DEFAULT,
  labelIndicadorOperadoraItem,
} from './placementIndicadoresOperadorasCatalogo'
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

export type ComparativoMatrizSecao = 'diferenciais' | 'condicoes' | 'indicadores'

export type ComparativoDiferencialLinha = {
  itemKey: string
  label: string
  secao: ComparativoMatrizSecao
  valores: Record<string, string>
  celulasPorColuna: Record<string, DiferencialCelulaCotacao[]>
}

export type ComparativoDiferencialPagina = {
  pageIndex: number
  totalPages: number
  titulo: string
  /** Rótulo do canto esquerdo do cabeçalho da matriz (ex.: DIFERENCIAIS). */
  matrizLabel: string
  secao: ComparativoMatrizSecao
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

function buildLinhasSecao(args: {
  secao: ComparativoMatrizSecao
  itens: { key: string; label: string }[]
  mapa: Record<string, Record<string, DiferencialCelulaCotacao[]>>
  ocultos: string[]
  colunas: ComparativoDiferencialColuna[]
}): ComparativoDiferencialLinha[] {
  const ocultos = new Set(args.ocultos)
  return args.itens
    .filter((item) => !ocultos.has(item.key))
    .map((item) => {
      const porColuna = args.mapa[item.key] ?? {}
      const valores: Record<string, string> = {}
      const celulasPorColuna: Record<string, DiferencialCelulaCotacao[]> = {}
      for (const col of args.colunas) {
        const celulas = porColuna[col.id] ?? []
        celulasPorColuna[col.id] = celulas
        valores[col.id] = formatDiferencialCelulasTexto(celulas)
      }
      return {
        itemKey: item.key,
        label: item.label,
        secao: args.secao,
        valores,
        celulasPorColuna,
      }
    })
}

export function buildComparativoDiferencialPages(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): ComparativoDiferencialPagina[] {
  const colunas = buildComparativoDiferencialColunas(form, operadoras, operadorasById, incluirAtual)
  if (!colunas.length) return []

  const cd = ensureConsolidandoDadosState(parseConsolidandoDadosFromKickOff(form.kickOffEstrategia))
  const notasRodape =
    cd.notasRodape?.trim() ||
    'Informações sujeitas a limites e critérios contratuais. Podem ser revisadas a qualquer momento, sem aviso prévio.'

  const linhasDiff = buildLinhasSecao({
    secao: 'diferenciais',
    itens: DIFERENCIAL_ITENS.map((i) => ({
      key: i.key,
      label: labelDiferencialItem(i.key),
    })),
    mapa: cd.diferenciais,
    ocultos: cd.itensOcultos?.diferenciais ?? [],
    colunas,
  })

  const linhasCond = buildLinhasSecao({
    secao: 'condicoes',
    itens: CONDICAO_CONTRATUAL_ITENS.map((i) => ({
      key: i.key,
      label: labelCondicaoContratualItem(i.key),
    })),
    mapa: cd.condicoes,
    ocultos: cd.itensOcultos?.condicoes ?? [],
    colunas,
  })

  const linhasInd = buildLinhasSecao({
    secao: 'indicadores',
    itens: INDICADOR_OPERADORA_ITENS.map((i) => ({
      key: i.key,
      label: labelIndicadorOperadoraItem(i.key),
    })),
    mapa: cd.indicadores,
    ocultos: cd.itensOcultos?.indicadores ?? [],
    colunas,
  })

  const pagesRaw: Omit<ComparativoDiferencialPagina, 'pageIndex' | 'totalPages'>[] = []
  if (linhasDiff.length) {
    pagesRaw.push({
      titulo: 'Diferenciais',
      matrizLabel: 'DIFERENCIAIS',
      secao: 'diferenciais',
      colunas,
      linhas: linhasDiff,
      notasRodape,
    })
  }
  if (linhasCond.length) {
    pagesRaw.push({
      titulo: 'Condições contratuais',
      matrizLabel: 'CONDIÇÕES CONTRATUAIS',
      secao: 'condicoes',
      colunas,
      linhas: linhasCond,
      notasRodape,
    })
  }
  if (linhasInd.length) {
    pagesRaw.push({
      titulo: 'Comparativo de Indicadores das Operadoras',
      matrizLabel: 'INDICADORES DAS OPERADORAS',
      secao: 'indicadores',
      colunas,
      linhas: linhasInd,
      notasRodape: INDICADORES_NOTAS_RODAPE_DEFAULT,
    })
  }

  const totalPages = pagesRaw.length
  return pagesRaw.map((p, pageIndex) => ({
    ...p,
    pageIndex,
    totalPages,
  }))
}

export function buildComparativoDiferencialLinhasResumo(): { key: string; label: string }[] {
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
  const filtered = pages
    .map((p) => ({
      ...p,
      colunas: p.colunas.filter((c) => ids.has(c.id)),
      linhas: p.linhas.map((l) => ({
        ...l,
        valores: Object.fromEntries(Object.entries(l.valores).filter(([id]) => ids.has(id))),
        celulasPorColuna: Object.fromEntries(
          Object.entries(l.celulasPorColuna).filter(([id]) => ids.has(id))
        ),
      })),
    }))
    .filter((p) => p.colunas.length > 0 && p.linhas.length > 0)

  const totalPages = filtered.length
  return filtered.map((p, pageIndex) => ({ ...p, pageIndex, totalPages }))
}

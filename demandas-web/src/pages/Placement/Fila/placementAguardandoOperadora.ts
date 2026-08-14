import type { CotacaoFormState } from './CotacaoFormFields'
import {
  emptyCustosFaixa,
  emptyVidasFaixa,
  type FaixaEtariaKey,
} from './placementCotacaoDetalhes'
import {
  emptyCoparticipacao,
  parseCoparticipacaoFromApi,
  type CoparticipacaoForm,
} from './placementCoparticipacao'
import {
  emptyReembolsoPlanoDetalhe,
  parseReembolsoPlanoDetalheFromApi,
  type ReembolsoPlanoDetalhe,
} from './placementReembolso'
import {
  ensureComunicarMercadoState,
  mercadoFornecedoresFromForm,
  parseComunicarMercadoFromKickOff,
  type ComunicarMercadoState,
} from './placementComunicarMercado'
import { defaultClassificacaoFornecedor, mercadoNomesComFornecedoresAtuais, normMercadoKey } from './placementMercadoQuadro'
import {
  ensurePropostaFornecedorAtual,
  emptyCenarioResumoLinha,
  emptyCenarioVariante,
  isFornecedorAtualNome,
} from './placementPropostaCenarioAtual'
import { ensurePropostaMercadoEquivalencia, planosReferenciaAbertura } from './placementPropostaEquivalencia'
import { parseReembolsoPropostaFields } from './placementReembolsoConsulta'
import type { Operadora } from '../../../types/masterData'
import type { KickOffEstrategia } from './placementKickOffEstrategia'
import {
  COMPARATIVO_LINHA_CHAVES,
  type ComparativoLinhaChave,
  type ComparativoVisualizacao,
} from './placementComparativoConfig'

export type { ComparativoLinhaChave, ComparativoVisualizacao }

export type MercadoFornecedorClassificacao =
  | 'fornecedor_atual'
  | 'mercado_consultado'
  | 'fora_perfil_declinado'
  | 'nao_apresentada'

/** Fora do perfil / não apresentada não exibem cadastro de proposta e custos. */
export function classificacaoPermitePropostaValores(classificacao: MercadoFornecedorClassificacao): boolean {
  return classificacao === 'fornecedor_atual' || classificacao === 'mercado_consultado'
}

export type QuadroMercadoVisibilidade = {
  showFornecedorAtual: boolean
  showMercadoConsultado: boolean
  showForaPerfilDeclinado: boolean
  showNaoApresentada: boolean
}

export type PropostaCenarioResumoLinha = {
  id: string
  rotulo: string
  valor: string
}

export type PropostaCenarioVariante = {
  id: string
  titulo: string
  /** Percentual sobre custos: positivo = reajuste, negativo = desconto. */
  reajustePercent: string
  vigenciaMeses: string
  resumoLinhas: PropostaCenarioResumoLinha[]
  planos: PropostaPlanoLinha[]
}

export type PropostaPlanoLinha = {
  id: string
  /** ID do plano na abertura (equivalência / ordenação do comparativo). */
  planoReferenciaId: string
  nomePlano: string
  tipoCusto: 'per_capita' | 'faixa_etaria'
  numeroVidas: string
  custoPerCapitaBRL: string
  vidasFaixa: Record<FaixaEtariaKey, string>
  custosFaixa: Record<FaixaEtariaKey, string>
  reembolsoConsulta: string
  /** Sim/Não — possui reembolso de consulta. */
  reembolso: string
  acomodacao: string
  eventosReembolsaveis: string
  abrangencia: string
  contribuicao: string
  /** Sim/Não — resumo no comparativo financeiro. */
  coparticipacao: string
  /** Detalhamento por procedimento (comparativo de coparticipação). */
  coparticipacaoDetalhe: CoparticipacaoForm
  /** Detalhamento por procedimento (comparativo de reembolso). */
  reembolsoDetalhe: ReembolsoPlanoDetalhe
}

export type ComparativoEstudoModo =
  | 'contrato_plano'
  | 'consolidado'
  | 'detalhe_plano'
  | 'unificado'
  | 'faixa_etaria'
  | 'planos_empilhados'

/** Como exibir valores nas linhas de faixa etária. */
export type ComparativoFaixaCelula = 'unitario' | 'unitario_e_subtotal' | 'subtotal'

/** Horizontal (pagina colunas) ou uma seção por plano equivalente (empilhado). */
export type ComparativoFaixaAgrupamento = 'horizontal' | 'por_plano_equivalente'

/** Linha de custo do plano: unitário médio ou total (fatura) do plano. */
export type ComparativoCustoPlanoExibicao = 'medio' | 'total'

/**
 * Orientação do modelo Contrato atual (ATUAL × mercado):
 * - horizontal: colunas lado a lado (visão clássica)
 * - vertical: planos empilhados (quadro alinhado por operadora)
 */
export type ComparativoContratoOrientacao = 'horizontal' | 'vertical'

export type ComparativoEstudoConfig = {
  modoSlide: ComparativoEstudoModo
  colunasPorSlide: 3 | 4 | 5 | 6 | 7
  incluirColunaAtual: boolean
  notasRodape: string
  faixaCelula: ComparativoFaixaCelula
  faixaAgrupamento: ComparativoFaixaAgrupamento
  /** Slide paginado ou todas as páginas empilhadas na tela. */
  visualizacao: ComparativoVisualizacao
  /** IDs de colunas (operadora/plano) ocultas no comparativo. */
  colunasOcultas: string[]
  /** Linhas do quadro ocultas (contribuição, coparticipação, faixas, variação). */
  linhasOcultas: ComparativoLinhaChave[]
  /**
   * Em planos empilhados: não repetir logo/nome do fornecedor nas seções abaixo da primeira.
   * Default: true.
   */
  omitirOperadoraNasSecoesEmpilhadas: boolean
  /**
   * Compacta vidas: remove a linha do quadro e mostra o total na legenda do custo.
   */
  vidasColunaUnica: boolean
  /** Custo médio (per capita) ou custo total do plano na linha de custo. */
  custoPlanoExibicao: ComparativoCustoPlanoExibicao
  /** Horizontal (colunas) ou vertical (planos empilhados) no modelo Contrato atual. */
  contratoOrientacao: ComparativoContratoOrientacao
}

export type PropostaFornecedorState = {
  incluirNoComparativo: boolean
  /** Variantes de cenário (fornecedor atual): base abertura + reajuste + resumo. */
  cenarios: PropostaCenarioVariante[]
  planos: PropostaPlanoLinha[]
}

/**
 * Pacote de comparativo nomeado: config de exibição + propostas lançadas.
 * Ex.: «Comparativo 1» e «Comparativo 2» com valores/cenários diferentes.
 */
export type ComparativoEstudoNomeado = ComparativoEstudoConfig & {
  id: string
  nome: string
  /** Propostas lançadas deste comparativo (chave = fornecedor normalizado). */
  propostas: Record<string, PropostaFornecedorState>
}

/** Como popular propostas ao criar/duplicar um comparativo. */
export type ComparativoCriacaoModo = 'completo' | 'matriz'

export type AguardandoOperadoraFornecedorState = {
  dataRetornoEfetiva: string
  retornoRecebido: boolean
  grupoProducao: string
  comissaoAgenciamento: string
  comissaoVitalicio: string
  classificacaoMercado: MercadoFornecedorClassificacao
  observacoes: string
}

export type AguardandoOperadoraState = {
  fornecedores: Record<string, AguardandoOperadoraFornecedorState>
  quadroMercado: QuadroMercadoVisibilidade
  /** Espelho das propostas do comparativo ativo. */
  propostas: Record<string, PropostaFornecedorState>
  /** Espelho da config do comparativo ativo. */
  comparativoConfig: ComparativoEstudoConfig
  /** Comparativos registrados (cada um com seus lançamentos). */
  comparativosEstudos?: ComparativoEstudoNomeado[]
  comparativoAtivoId?: string
  /**
   * Abas ocultas no viewer da proposta (Proposta enviada / link público).
   * Valores: ids de `PropostaViewerPane` (ex.: grupo_elegivel, comparativo…).
   */
  apresentacaoPanesOcultas?: string[]
}

export function emptyComparativoEstudoConfig(): ComparativoEstudoConfig {
  return {
    /** Mesmo grid do Contrato atual interno (ATUAL × propostas). */
    modoSlide: 'contrato_plano',
    colunasPorSlide: 5,
    incluirColunaAtual: true,
    notasRodape:
      'Estudo sujeito à confirmação de informações adicionais. Operadoras reservam-se o direito de revisar custos.',
    faixaCelula: 'unitario',
    faixaAgrupamento: 'por_plano_equivalente',
    visualizacao: 'pagina_completa',
    colunasOcultas: [],
    linhasOcultas: [],
    omitirOperadoraNasSecoesEmpilhadas: true,
    vidasColunaUnica: false,
    custoPlanoExibicao: 'medio',
    contratoOrientacao: 'horizontal',
  }
}

/** Zera filtros de visibilidade (colunas/linhas) sem alterar o modo de exibição. */
export function clearComparativoFiltrosVisibilidade(
  cfg: ComparativoEstudoConfig
): ComparativoEstudoConfig {
  return {
    ...cfg,
    colunasOcultas: [],
    linhasOcultas: [],
    vidasColunaUnica: false,
  }
}

export function clearAguardandoOperadoraFiltrosVisibilidade(
  ag: AguardandoOperadoraState
): AguardandoOperadoraState {
  const comparativoConfig = clearComparativoFiltrosVisibilidade(ag.comparativoConfig)
  return {
    ...ag,
    comparativoConfig,
    comparativosEstudos: (ag.comparativosEstudos ?? []).map((estudo) => ({
      ...estudo,
      ...clearComparativoFiltrosVisibilidade(configFromNomeado(estudo)),
    })),
  }
}

function newComparativoEstudoId(): string {
  return `ce-${Math.random().toString(36).slice(2, 10)}`
}

export function emptyComparativoEstudoNomeado(nome = 'Comparativo 1'): ComparativoEstudoNomeado {
  return {
    id: newComparativoEstudoId(),
    nome,
    ...emptyComparativoEstudoConfig(),
    propostas: {},
  }
}

function clonePropostas(
  src: Record<string, PropostaFornecedorState>
): Record<string, PropostaFornecedorState> {
  return JSON.parse(JSON.stringify(src ?? {})) as Record<string, PropostaFornecedorState>
}

function stripPlanoToMatriz(p: PropostaPlanoLinha): PropostaPlanoLinha {
  return {
    ...p,
    numeroVidas: '',
    custoPerCapitaBRL: '',
    custosFaixa: emptyCustosFaixa(),
    reembolsoConsulta: '',
    coparticipacaoDetalhe: emptyCoparticipacao(),
    reembolsoDetalhe: emptyReembolsoPlanoDetalhe(),
  }
}

/** Mantém estrutura (fornecedores/planos/cenários) sem valores de custo preenchidos. */
export function stripPropostasToMatriz(
  src: Record<string, PropostaFornecedorState>
): Record<string, PropostaFornecedorState> {
  const out: Record<string, PropostaFornecedorState> = {}
  for (const [key, prop] of Object.entries(src ?? {})) {
    out[key] = {
      incluirNoComparativo: prop.incluirNoComparativo !== false,
      cenarios: (prop.cenarios ?? []).map((c) => ({
        ...c,
        reajustePercent: '0',
        vigenciaMeses: c.vigenciaMeses ?? '',
        resumoLinhas: (c.resumoLinhas ?? []).map((r) => ({ ...r, valor: '' })),
        planos: (c.planos ?? []).map(stripPlanoToMatriz),
      })),
      planos: (prop.planos ?? []).map(stripPlanoToMatriz),
    }
  }
  return out
}

function propostasParaModo(
  src: Record<string, PropostaFornecedorState>,
  modo: ComparativoCriacaoModo
): Record<string, PropostaFornecedorState> {
  return modo === 'completo' ? clonePropostas(src) : stripPropostasToMatriz(src)
}

function configFromNomeado(estudo: ComparativoEstudoNomeado): ComparativoEstudoConfig {
  const { id: _id, nome: _nome, propostas: _propostas, ...cfg } = estudo
  return cfg
}

function withNomeadoConfig(
  estudo: ComparativoEstudoNomeado,
  cfg: ComparativoEstudoConfig
): ComparativoEstudoNomeado {
  return { ...estudo, ...cfg, id: estudo.id, nome: estudo.nome, propostas: estudo.propostas }
}

function normalizeEstudoNomeado(estudo: ComparativoEstudoNomeado): ComparativoEstudoNomeado {
  const cfg = configFromNomeado(estudo)
  return {
    id: estudo.id,
    nome: estudo.nome?.trim() || 'Comparativo',
    ...cfg,
    colunasOcultas: [...(cfg.colunasOcultas ?? [])],
    linhasOcultas: [...(cfg.linhasOcultas ?? [])],
    propostas: clonePropostas(estudo.propostas ?? {}),
  }
}

function mirrorFromAtivo(
  estudos: ComparativoEstudoNomeado[],
  ativoId: string
): {
  comparativosEstudos: ComparativoEstudoNomeado[]
  comparativoAtivoId: string
  comparativoConfig: ComparativoEstudoConfig
  propostas: Record<string, PropostaFornecedorState>
} {
  const ativo = estudos.find((e) => e.id === ativoId) ?? estudos[0]
  return {
    comparativosEstudos: estudos,
    comparativoAtivoId: ativo.id,
    comparativoConfig: configFromNomeado(ativo),
    propostas: clonePropostas(ativo.propostas),
  }
}

/**
 * Garante lista de comparativos + ativo; sincroniza espelho `propostas`/`comparativoConfig`.
 * Migra legado: `comparativoConfig` + `propostas` no root → Comparativo 1.
 */
export function ensureComparativosEstudos(state: AguardandoOperadoraState): {
  comparativosEstudos: ComparativoEstudoNomeado[]
  comparativoAtivoId: string
  comparativoConfig: ComparativoEstudoConfig
  propostas: Record<string, PropostaFornecedorState>
} {
  let estudos = (state.comparativosEstudos ?? []).map(normalizeEstudoNomeado)
  const mirrorPropostas = clonePropostas(state.propostas ?? {})

  if (!estudos.length) {
    const legado = state.comparativoConfig ?? emptyComparativoEstudoConfig()
    estudos = [
      {
        id: newComparativoEstudoId(),
        nome: 'Comparativo 1',
        ...legado,
        colunasOcultas: [...(legado.colunasOcultas ?? [])],
        linhasOcultas: [...(legado.linhasOcultas ?? [])],
        propostas: mirrorPropostas,
      },
    ]
  } else {
    const algumComPropostas = estudos.some((e) => Object.keys(e.propostas).length > 0)
    if (!algumComPropostas && Object.keys(mirrorPropostas).length > 0) {
      let seedId = state.comparativoAtivoId?.trim() || ''
      if (!seedId || !estudos.some((e) => e.id === seedId)) seedId = estudos[0].id
      estudos = estudos.map((e) =>
        e.id === seedId ? { ...e, propostas: mirrorPropostas } : e
      )
    }
  }

  let ativoId = state.comparativoAtivoId?.trim() || ''
  if (!ativoId || !estudos.some((e) => e.id === ativoId)) {
    ativoId = estudos[0].id
  }

  const ativoAtual = estudos.find((e) => e.id === ativoId) ?? estudos[0]
  // Espelho root é a fonte de verdade ao editar; se vier vazio no load (só estudos[]), preserva o ativo.
  const mirrorVazio = Object.keys(mirrorPropostas).length === 0
  const ativoComDados = Object.keys(ativoAtual.propostas).length > 0
  const propostasFlush =
    mirrorVazio && ativoComDados ? ativoAtual.propostas : mirrorPropostas

  estudos = estudos.map((e) =>
    e.id === ativoId ? { ...e, propostas: propostasFlush } : e
  )

  return mirrorFromAtivo(estudos, ativoId)
}

export function patchComparativoAtivoConfig(
  state: AguardandoOperadoraState,
  nextConfig: ComparativoEstudoConfig
): AguardandoOperadoraState {
  const ensured = ensureComparativosEstudos(state)
  const estudos = ensured.comparativosEstudos.map((e) =>
    e.id === ensured.comparativoAtivoId ? withNomeadoConfig(e, nextConfig) : e
  )
  return {
    ...state,
    ...mirrorFromAtivo(estudos, ensured.comparativoAtivoId),
  }
}

export function setComparativoAtivoId(
  state: AguardandoOperadoraState,
  ativoId: string
): AguardandoOperadoraState {
  const ensured = ensureComparativosEstudos(state)
  const hit = ensured.comparativosEstudos.find((e) => e.id === ativoId)
  if (!hit) return { ...state, ...ensured }
  return {
    ...state,
    ...mirrorFromAtivo(ensured.comparativosEstudos, hit.id),
  }
}

export function createComparativoEstudo(
  state: AguardandoOperadoraState,
  nomeOrOpts?: string | { nome?: string; modo?: ComparativoCriacaoModo },
  modoArg?: ComparativoCriacaoModo
): AguardandoOperadoraState {
  const opts =
    typeof nomeOrOpts === 'object' && nomeOrOpts
      ? nomeOrOpts
      : { nome: typeof nomeOrOpts === 'string' ? nomeOrOpts : undefined, modo: modoArg }
  const modo: ComparativoCriacaoModo = opts.modo ?? 'matriz'
  const ensured = ensureComparativosEstudos(state)
  const src =
    ensured.comparativosEstudos.find((e) => e.id === ensured.comparativoAtivoId) ??
    ensured.comparativosEstudos[0]
  const n = ensured.comparativosEstudos.length + 1
  const novo: ComparativoEstudoNomeado = {
    ...emptyComparativoEstudoNomeado(opts.nome?.trim() || `Comparativo ${n}`),
    ...(modo === 'completo' ? configFromNomeado(src) : emptyComparativoEstudoConfig()),
    colunasOcultas: modo === 'completo' ? [...(src.colunasOcultas ?? [])] : [],
    linhasOcultas: modo === 'completo' ? [...(src.linhasOcultas ?? [])] : [],
    propostas: propostasParaModo(src.propostas, modo),
  }
  const estudos = [...ensured.comparativosEstudos, novo]
  return {
    ...state,
    ...mirrorFromAtivo(estudos, novo.id),
  }
}

export function duplicateComparativoEstudo(
  state: AguardandoOperadoraState,
  modo: ComparativoCriacaoModo = 'completo'
): AguardandoOperadoraState {
  const ensured = ensureComparativosEstudos(state)
  const src =
    ensured.comparativosEstudos.find((e) => e.id === ensured.comparativoAtivoId) ??
    ensured.comparativosEstudos[0]
  const copia: ComparativoEstudoNomeado = {
    ...src,
    id: newComparativoEstudoId(),
    nome: `${src.nome.trim() || 'Comparativo'} (cópia)`,
    colunasOcultas: [...(src.colunasOcultas ?? [])],
    linhasOcultas: [...(src.linhasOcultas ?? [])],
    propostas: propostasParaModo(src.propostas, modo),
  }
  return {
    ...state,
    ...mirrorFromAtivo([...ensured.comparativosEstudos, copia], copia.id),
  }
}

export function renameComparativoEstudo(
  state: AguardandoOperadoraState,
  estudoId: string,
  nome: string
): AguardandoOperadoraState {
  const ensured = ensureComparativosEstudos(state)
  const nomeOk = nome.trim() || 'Comparativo'
  const estudos = ensured.comparativosEstudos.map((e) =>
    e.id === estudoId ? { ...e, nome: nomeOk } : e
  )
  return {
    ...state,
    ...mirrorFromAtivo(estudos, ensured.comparativoAtivoId),
  }
}

export function removeComparativoEstudo(
  state: AguardandoOperadoraState,
  estudoId: string
): AguardandoOperadoraState {
  const ensured = ensureComparativosEstudos(state)
  if (ensured.comparativosEstudos.length <= 1) return { ...state, ...ensured }
  const estudos = ensured.comparativosEstudos.filter((e) => e.id !== estudoId)
  const ativoId =
    ensured.comparativoAtivoId === estudoId ? estudos[0].id : ensured.comparativoAtivoId
  return {
    ...state,
    ...mirrorFromAtivo(estudos, ativoId),
  }
}

export function emptyQuadroMercadoVisibilidade(): QuadroMercadoVisibilidade {
  return {
    showFornecedorAtual: true,
    showMercadoConsultado: true,
    showForaPerfilDeclinado: true,
    showNaoApresentada: true,
  }
}

export function emptyPropostaPlanoLinha(): PropostaPlanoLinha {
  return {
    id: `pp-${Math.random().toString(36).slice(2, 9)}`,
    planoReferenciaId: '',
    nomePlano: '',
    tipoCusto: 'per_capita',
    numeroVidas: '',
    custoPerCapitaBRL: '',
    vidasFaixa: emptyVidasFaixa(),
    custosFaixa: emptyCustosFaixa(),
    reembolsoConsulta: '',
    reembolso: '',
    acomodacao: '',
    eventosReembolsaveis: '',
    abrangencia: '',
    contribuicao: '',
    coparticipacao: '',
    coparticipacaoDetalhe: emptyCoparticipacao(),
    reembolsoDetalhe: emptyReembolsoPlanoDetalhe(),
  }
}

export function emptyPropostaFornecedor(): PropostaFornecedorState {
  return { incluirNoComparativo: true, cenarios: [], planos: [emptyPropostaPlanoLinha()] }
}

export function emptyAguardandoOperadoraFornecedor(
  form: CotacaoFormState,
  nome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): AguardandoOperadoraFornecedorState {
  const fin = form.dadosFinanceiros?.estudo
  return {
    dataRetornoEfetiva: '',
    retornoRecebido: false,
    grupoProducao: '',
    comissaoAgenciamento: fin?.comissaoAgenciamento?.trim() ?? '',
    comissaoVitalicio: fin?.comissaoVitalicio?.trim() ?? '',
    classificacaoMercado: defaultClassificacaoFornecedor(nome, form, operadoras, operadorasById),
    observacoes: '',
  }
}

export function ensureAguardandoOperadoraState(
  current: AguardandoOperadoraState | null | undefined,
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  comunicarMercado?: ComunicarMercadoState | null
): AguardandoOperadoraState {
  const nomes = mercadoNomesComFornecedoresAtuais(form, operadoras, operadorasById)
  const comunicar =
    comunicarMercado ??
    ensureComunicarMercadoState(
      parseComunicarMercadoFromKickOff(form.kickOffEstrategia),
      form,
      operadoras,
      operadorasById
    )

  const fornecedores: Record<string, AguardandoOperadoraFornecedorState> = {
    ...(current?.fornecedores ?? {}),
  }
  const propostas: Record<string, PropostaFornecedorState> = {
    ...(current?.propostas ?? {}),
  }

  for (const nome of nomes) {
    const key = normMercadoKey(nome)
    const fromComunicar = comunicar.fornecedores[key]
    const legacyRetorno = fromComunicar?.dataRetornoEfetiva?.trim() ?? ''
    const grupoComunicar = fromComunicar?.grupoProducao?.trim() ?? ''

    if (!fornecedores[key]) {
      fornecedores[key] = {
        ...emptyAguardandoOperadoraFornecedor(form, nome, operadoras, operadorasById),
        grupoProducao: grupoComunicar,
        dataRetornoEfetiva: legacyRetorno,
        retornoRecebido: !!legacyRetorno,
      }
    } else {
      const isAtual = isFornecedorAtualNome(nome, form, operadoras, operadorasById)
      fornecedores[key] = {
        ...fornecedores[key],
        classificacaoMercado: isAtual
          ? 'fornecedor_atual'
          : fornecedores[key].classificacaoMercado ??
            defaultClassificacaoFornecedor(nome, form, operadoras, operadorasById),
        ...( !fornecedores[key].grupoProducao?.trim() && grupoComunicar
          ? { grupoProducao: grupoComunicar }
          : {}),
        ...( !fornecedores[key].dataRetornoEfetiva && legacyRetorno
          ? {
              dataRetornoEfetiva: legacyRetorno,
              retornoRecebido: fornecedores[key].retornoRecebido || !!legacyRetorno,
            }
          : {}),
      }
    }

    if (!propostas[key]) {
      propostas[key] = emptyPropostaFornecedor()
    } else {
      propostas[key] = {
        ...propostas[key],
        cenarios: (propostas[key].cenarios ?? []).map((c) => ({
          ...emptyCenarioVariante(),
          ...c,
          resumoLinhas: (c.resumoLinhas ?? []).map((r) => ({
            ...emptyCenarioResumoLinha(),
            ...r,
          })),
          planos: (c.planos ?? []).map((p) => {
            const base = emptyPropostaPlanoLinha()
            return {
              ...base,
              ...p,
              vidasFaixa: { ...base.vidasFaixa, ...(p.vidasFaixa ?? {}) },
              custosFaixa: { ...base.custosFaixa, ...(p.custosFaixa ?? {}) },
            }
          }),
        })),
        planos: propostas[key].planos.map((p) => {
          const base = emptyPropostaPlanoLinha()
          return {
            ...base,
            ...p,
            vidasFaixa: { ...base.vidasFaixa, ...(p.vidasFaixa ?? {}) },
            custosFaixa: { ...base.custosFaixa, ...(p.custosFaixa ?? {}) },
          }
        }),
      }
    }

    const classificacao = fornecedores[key].classificacaoMercado
    const refs = planosReferenciaAbertura(form, operadoras, operadorasById)
    propostas[key] = ensurePropostaFornecedorAtual(
      propostas[key],
      form,
      nome,
      operadoras,
      operadorasById,
      classificacao
    )
    if (classificacao !== 'fornecedor_atual') {
      propostas[key] = ensurePropostaMercadoEquivalencia(propostas[key], refs)
    }
  }

  const base: AguardandoOperadoraState = {
    fornecedores,
    propostas,
    quadroMercado: current?.quadroMercado ?? emptyQuadroMercadoVisibilidade(),
    comparativoConfig: current?.comparativoConfig ?? emptyComparativoEstudoConfig(),
    comparativosEstudos: current?.comparativosEstudos,
    comparativoAtivoId: current?.comparativoAtivoId,
    apresentacaoPanesOcultas: current?.apresentacaoPanesOcultas,
  }
  return { ...base, ...ensureComparativosEstudos(base) }
}

function parseClassificacao(raw: unknown): MercadoFornecedorClassificacao {
  const v = String(raw ?? '').trim()
  if (
    v === 'fornecedor_atual' ||
    v === 'mercado_consultado' ||
    v === 'fora_perfil_declinado' ||
    v === 'nao_apresentada'
  ) {
    return v
  }
  return 'mercado_consultado'
}

function parseQuadroMercado(raw: unknown): QuadroMercadoVisibilidade {
  const base = emptyQuadroMercadoVisibilidade()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>
  return {
    showFornecedorAtual: o.showFornecedorAtual !== false,
    showMercadoConsultado: o.showMercadoConsultado !== false,
    showForaPerfilDeclinado: o.showForaPerfilDeclinado !== false,
    showNaoApresentada: o.showNaoApresentada !== false,
  }
}

function parseFaixaRecord(raw: unknown, empty: Record<FaixaEtariaKey, string>): Record<FaixaEtariaKey, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...empty }
  const o = raw as Record<string, unknown>
  const next = { ...empty }
  for (const key of Object.keys(empty) as FaixaEtariaKey[]) {
    if (o[key] != null) next[key] = String(o[key])
  }
  return next
}

function parsePropostaPlano(raw: unknown): PropostaPlanoLinha | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const base = emptyPropostaPlanoLinha()
  const tipo = o.tipoCusto === 'per_capita' ? 'per_capita' : 'faixa_etaria'
  const reemb = parseReembolsoPropostaFields(o.reembolso, o.reembolsoConsulta)
  return {
    id: String(o.id ?? base.id),
    planoReferenciaId: String(o.planoReferenciaId ?? o.id ?? base.id),
    nomePlano: String(o.nomePlano ?? ''),
    tipoCusto: tipo,
    numeroVidas: String(o.numeroVidas ?? ''),
    custoPerCapitaBRL: String(o.custoPerCapitaBRL ?? ''),
    vidasFaixa: parseFaixaRecord(o.vidasFaixa, base.vidasFaixa),
    custosFaixa: parseFaixaRecord(o.custosFaixa, base.custosFaixa),
    reembolso: reemb.reembolso,
    reembolsoConsulta: reemb.reembolsoConsulta,
    acomodacao: String(o.acomodacao ?? ''),
    eventosReembolsaveis: String(o.eventosReembolsaveis ?? ''),
    abrangencia: String(o.abrangencia ?? ''),
    contribuicao: String(o.contribuicao ?? ''),
    coparticipacao: String(o.coparticipacao ?? ''),
    coparticipacaoDetalhe: parseCoparticipacaoFromApi(o.coparticipacaoDetalhe),
    reembolsoDetalhe: parseReembolsoPlanoDetalheFromApi(o.reembolsoDetalhe),
  }
}

function parseComparativoConfig(raw: unknown): ComparativoEstudoConfig {
  const base = emptyComparativoEstudoConfig()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>
  const modo = o.modoSlide
  const col = Number(o.colunasPorSlide)
  const faixaCelula = o.faixaCelula
  const faixaAgrupamento = o.faixaAgrupamento
  return {
    modoSlide:
      modo === 'detalhe_plano' || modo === 'unificado'
        ? 'contrato_plano'
        : modo === 'contrato_plano' ||
            modo === 'consolidado' ||
            modo === 'faixa_etaria' ||
            modo === 'planos_empilhados'
          ? modo
          : base.modoSlide,
    colunasPorSlide:
      col === 3 || col === 4 || col === 5 || col === 6 || col === 7 ? col : base.colunasPorSlide,
    incluirColunaAtual: o.incluirColunaAtual !== false,
    notasRodape: String(o.notasRodape ?? base.notasRodape),
    faixaCelula:
      faixaCelula === 'unitario' ||
      faixaCelula === 'unitario_e_subtotal' ||
      faixaCelula === 'subtotal'
        ? faixaCelula
        : base.faixaCelula,
    faixaAgrupamento:
      faixaAgrupamento === 'horizontal' || faixaAgrupamento === 'por_plano_equivalente'
        ? faixaAgrupamento
        : base.faixaAgrupamento,
    visualizacao:
      o.visualizacao === 'slide' || o.visualizacao === 'pagina_completa'
        ? o.visualizacao
        : base.visualizacao,
    colunasOcultas: Array.isArray(o.colunasOcultas)
      ? o.colunasOcultas.map((id) => String(id).trim()).filter(Boolean)
      : base.colunasOcultas,
    linhasOcultas: Array.isArray(o.linhasOcultas)
      ? o.linhasOcultas.filter((chave): chave is ComparativoLinhaChave =>
          COMPARATIVO_LINHA_CHAVES.includes(chave as ComparativoLinhaChave)
        )
      : base.linhasOcultas,
    omitirOperadoraNasSecoesEmpilhadas: o.omitirOperadoraNasSecoesEmpilhadas !== false,
    vidasColunaUnica: o.vidasColunaUnica === true,
    custoPlanoExibicao: o.custoPlanoExibicao === 'total' ? 'total' : 'medio',
    contratoOrientacao:
      o.contratoOrientacao === 'vertical' || o.contratoOrientacao === 'horizontal'
        ? o.contratoOrientacao
        : base.contratoOrientacao,
  }
}

function parsePropostasMap(raw: unknown): Record<string, PropostaFornecedorState> {
  const propostas: Record<string, PropostaFornecedorState> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return propostas
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    propostas[key] = parsePropostaFornecedor(val)
  }
  return propostas
}

function parseComparativoEstudoNomeado(raw: unknown, index: number): ComparativoEstudoNomeado | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const cfg = parseComparativoConfig(o)
  const id = String(o.id ?? '').trim() || newComparativoEstudoId()
  const nome = String(o.nome ?? '').trim() || `Comparativo ${index + 1}`
  return { id, nome, ...cfg, propostas: parsePropostasMap(o.propostas) }
}

function parseComparativosEstudos(raw: unknown): ComparativoEstudoNomeado[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, i) => parseComparativoEstudoNomeado(item, i))
    .filter(Boolean) as ComparativoEstudoNomeado[]
}

function parseCenarioResumoLinha(raw: unknown): PropostaCenarioResumoLinha {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyCenarioResumoLinha()
  const o = raw as Record<string, unknown>
  return {
    id: String(o.id ?? emptyCenarioResumoLinha().id),
    rotulo: String(o.rotulo ?? ''),
    valor: String(o.valor ?? ''),
  }
}

function parseCenarioVariante(raw: unknown): PropostaCenarioVariante {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyCenarioVariante()
  const o = raw as Record<string, unknown>
  const planosRaw = Array.isArray(o.planos) ? o.planos : []
  const resumoRaw = Array.isArray(o.resumoLinhas) ? o.resumoLinhas : []
  const planos = planosRaw.map(parsePropostaPlano).filter(Boolean) as PropostaPlanoLinha[]
  return {
    id: String(o.id ?? emptyCenarioVariante().id),
    titulo: String(o.titulo ?? 'Cenário atual'),
    reajustePercent: String(o.reajustePercent ?? '0'),
    vigenciaMeses: String(o.vigenciaMeses ?? ''),
    resumoLinhas: resumoRaw.map(parseCenarioResumoLinha),
    planos,
  }
}

function parsePropostaFornecedor(raw: unknown): PropostaFornecedorState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyPropostaFornecedor()
  const o = raw as Record<string, unknown>
  const planosRaw = Array.isArray(o.planos) ? o.planos : []
  const cenariosRaw = Array.isArray(o.cenarios) ? o.cenarios : []
  const planos = planosRaw.map(parsePropostaPlano).filter(Boolean) as PropostaPlanoLinha[]
  const cenarios = cenariosRaw.map(parseCenarioVariante)
  return {
    incluirNoComparativo: o.incluirNoComparativo !== false,
    cenarios,
    planos: planos.length ? planos : [emptyPropostaPlanoLinha()],
  }
}

export function parseAguardandoOperadoraFromKickOff(
  estrategia: KickOffEstrategia | null | undefined
): AguardandoOperadoraState | null {
  const raw = (estrategia as { aguardandoOperadora?: unknown } | null | undefined)?.aguardandoOperadora
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const fornRaw = o.fornecedores
  const fornecedores: Record<string, AguardandoOperadoraFornecedorState> = {}
  if (fornRaw && typeof fornRaw === 'object' && !Array.isArray(fornRaw)) {
    for (const [key, val] of Object.entries(fornRaw as Record<string, unknown>)) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue
      const f = val as Record<string, unknown>
      fornecedores[key] = {
        dataRetornoEfetiva: String(f.dataRetornoEfetiva ?? ''),
        retornoRecebido: f.retornoRecebido === true,
        grupoProducao: String(f.grupoProducao ?? ''),
        comissaoAgenciamento: String(f.comissaoAgenciamento ?? ''),
        comissaoVitalicio: String(f.comissaoVitalicio ?? ''),
        classificacaoMercado: parseClassificacao(f.classificacaoMercado),
        observacoes: String(f.observacoes ?? ''),
      }
    }
  }

  const propostas: Record<string, PropostaFornecedorState> = {}
  const propRaw = o.propostas
  if (propRaw && typeof propRaw === 'object' && !Array.isArray(propRaw)) {
    for (const [key, val] of Object.entries(propRaw as Record<string, unknown>)) {
      propostas[key] = parsePropostaFornecedor(val)
    }
  }

  const panesRaw = o.apresentacaoPanesOcultas
  const apresentacaoPanesOcultas = Array.isArray(panesRaw)
    ? panesRaw.map((id) => String(id).trim()).filter(Boolean)
    : undefined

  const parsed: AguardandoOperadoraState = {
    fornecedores,
    propostas,
    quadroMercado: parseQuadroMercado(o.quadroMercado),
    comparativoConfig: parseComparativoConfig(o.comparativoConfig),
    comparativosEstudos: parseComparativosEstudos(o.comparativosEstudos),
    comparativoAtivoId: o.comparativoAtivoId != null ? String(o.comparativoAtivoId) : undefined,
    apresentacaoPanesOcultas,
  }
  return { ...parsed, ...ensureComparativosEstudos(parsed) }
}

export function aguardandoOperadoraIsComplete(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): boolean {
  const nomes = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
  if (!nomes.length) return false
  const state = ensureAguardandoOperadoraState(
    parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
    form,
    operadoras,
    operadorasById
  )
  return nomes.every((nome) => state.fornecedores[normMercadoKey(nome)]?.retornoRecebido === true)
}

export function grupoProducaoExibido(
  ag: AguardandoOperadoraFornecedorState | undefined,
  comunicarGrupo: string | undefined
): string {
  return ag?.grupoProducao?.trim() || comunicarGrupo?.trim() || ''
}

export function comissaoApresentadaResumo(ag: AguardandoOperadoraFornecedorState | undefined): string {
  if (!ag) return '—'
  const parts: string[] = []
  if (ag.comissaoAgenciamento.trim()) parts.push(`Ag. ${ag.comissaoAgenciamento}%`)
  if (ag.comissaoVitalicio.trim()) parts.push(`Vit. ${ag.comissaoVitalicio}%`)
  return parts.length ? parts.join(' · ') : '—'
}

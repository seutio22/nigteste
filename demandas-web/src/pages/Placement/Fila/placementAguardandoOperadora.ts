import type { CotacaoFormState } from './CotacaoFormFields'
import {
  emptyCustosFaixa,
  emptyVidasFaixa,
  type FaixaEtariaKey,
} from './placementCotacaoDetalhes'
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
  acomodacao: string
  eventosReembolsaveis: string
  abrangencia: string
  contribuicao: string
  coparticipacao: string
}

export type ComparativoEstudoModo =
  | 'contrato_plano'
  | 'consolidado'
  | 'detalhe_plano'
  | 'unificado'
  | 'faixa_etaria'

/** Como exibir valores nas linhas de faixa etária. */
export type ComparativoFaixaCelula = 'unitario' | 'unitario_e_subtotal' | 'subtotal'

/** Horizontal (pagina colunas) ou uma seção por plano equivalente (empilhado). */
export type ComparativoFaixaAgrupamento = 'horizontal' | 'por_plano_equivalente'

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
}

export type PropostaFornecedorState = {
  incluirNoComparativo: boolean
  /** Variantes de cenário (fornecedor atual): base abertura + reajuste + resumo. */
  cenarios: PropostaCenarioVariante[]
  planos: PropostaPlanoLinha[]
}

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
  propostas: Record<string, PropostaFornecedorState>
  comparativoConfig: ComparativoEstudoConfig
}

export function emptyComparativoEstudoConfig(): ComparativoEstudoConfig {
  return {
    modoSlide: 'consolidado',
    colunasPorSlide: 5,
    incluirColunaAtual: true,
    notasRodape:
      'Estudo sujeito à confirmação de informações adicionais. Operadoras reservam-se o direito de revisar custos.',
    faixaCelula: 'unitario',
    faixaAgrupamento: 'por_plano_equivalente',
    visualizacao: 'pagina_completa',
    colunasOcultas: [],
    linhasOcultas: [],
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
    acomodacao: '',
    eventosReembolsaveis: '',
    abrangencia: '',
    contribuicao: '',
    coparticipacao: '',
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

  return {
    fornecedores,
    propostas,
    quadroMercado: current?.quadroMercado ?? emptyQuadroMercadoVisibilidade(),
    comparativoConfig: current?.comparativoConfig ?? emptyComparativoEstudoConfig(),
  }
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
  return {
    id: String(o.id ?? base.id),
    planoReferenciaId: String(o.planoReferenciaId ?? o.id ?? base.id),
    nomePlano: String(o.nomePlano ?? ''),
    tipoCusto: tipo,
    numeroVidas: String(o.numeroVidas ?? ''),
    custoPerCapitaBRL: String(o.custoPerCapitaBRL ?? ''),
    vidasFaixa: parseFaixaRecord(o.vidasFaixa, base.vidasFaixa),
    custosFaixa: parseFaixaRecord(o.custosFaixa, base.custosFaixa),
    reembolsoConsulta: String(o.reembolsoConsulta ?? ''),
    acomodacao: String(o.acomodacao ?? ''),
    eventosReembolsaveis: String(o.eventosReembolsaveis ?? ''),
    abrangencia: String(o.abrangencia ?? ''),
    contribuicao: String(o.contribuicao ?? ''),
    coparticipacao: String(o.coparticipacao ?? ''),
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
      modo === 'contrato_plano' ||
      modo === 'consolidado' ||
      modo === 'detalhe_plano' ||
      modo === 'unificado' ||
      modo === 'faixa_etaria'
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
  }
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

  return {
    fornecedores,
    propostas,
    quadroMercado: parseQuadroMercado(o.quadroMercado),
    comparativoConfig: parseComparativoConfig(o.comparativoConfig),
  }
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

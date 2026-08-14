import type { CotacaoFormState } from './CotacaoFormFields'
import {
  formatReembolsoKickOffTexto,
  formatUpgradeDowngradeKickOff,
  mercadoAnalisadoFromSugestao,
  normalizeMercadoAnalisadoNomes,
} from './placementKickOffFormatters'
import { formatMultaRescisaoResumo, formatConvencaoColetivaResumo } from './placementFormularioContrato'
import type { Operadora } from '../../../types/masterData'
import type { ComunicarMercadoState } from './placementComunicarMercado'
import type { AguardandoOperadoraState } from './placementAguardandoOperadora'
import type { ConsolidandoDadosState } from './placementConsolidandoDados'
import type { ValidacaoPropostaState } from './placementValidacaoProposta'

export type KickOffEstrategiaItem = {
  id: string
  rotulo: string
  valor: string
}

export type KickOffEstrategiaSecao = {
  id: string
  titulo: string
  itens: KickOffEstrategiaItem[]
}

export type KickOffEstrategia = {
  secoes: KickOffEstrategiaSecao[]
  mercadoAnalisado: string[]
  notas?: string
  /** Ajustes locais no resumo da abertura (id do campo → texto exibido). */
  resumoEdicoes?: Record<string, string>
  /** Estado da etapa Comunicar mercado (Em cotação). */
  comunicarMercado?: ComunicarMercadoState
  /** Estado da etapa Aguardando operadora. */
  aguardandoOperadora?: AguardandoOperadoraState
  /** Estado da etapa Consolidando dados. */
  consolidandoDados?: ConsolidandoDadosState
  /** Estado da etapa Validação proposta (antes de Proposta enviada). */
  validacaoProposta?: ValidacaoPropostaState
}

export type KickOffAberturaLabels = {
  estipulante?: string
  filial?: string
  grupoEconomico?: string
  produtos?: string
  fornecedoresAtuais?: string
  operadorasSugestao?: string
  operadorasSugestaoNomes?: string[]
  tipoContratacao?: string
  modalidadeContrato?: string
  prazoVigencia?: string
  breakEven?: string
  formularioTipo?: string
  multaRescisao?: string
  convencaoColetiva?: string
  coparticipacao?: string
  reembolso?: string
  upgradeDowngrade?: string
  contribuicao?: string
  comissaoAtual?: string
  projeto?: string
  pedido?: string
  temperatura?: string
  solicitante?: string
  analistaCadastro?: string
  analistaResponsavel?: string
  corretorParceiro?: string
  vigenciaApolice?: string
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function createKickOffItem(rotulo = '', valor = ''): KickOffEstrategiaItem {
  return { id: uid('ki'), rotulo, valor }
}

export function createKickOffSecao(titulo: string, itens: KickOffEstrategiaItem[] = []): KickOffEstrategiaSecao {
  return { id: uid('ks'), titulo, itens }
}

export function emptyKickOffEstrategia(): KickOffEstrategia {
  return { secoes: [], mercadoAnalisado: [], notas: '' }
}

function valorAbertura(v: string | undefined | null): string {
  const s = String(v ?? '').trim()
  return s || ''
}

export const KICK_OFF_PREMISSAS_ROTULOS_OBRIGATORIOS = [
  'Motivo da cotação',
  'Carregamento Comercial desejado',
] as const

export type KickOffEstrategiaPendencia = {
  id: string
  label: string
  done: boolean
}

export function isKickOffSecaoPremissas(secao: KickOffEstrategiaSecao): boolean {
  return secao.titulo.toLowerCase().includes('premissas')
}

export function isKickOffItemObrigatorio(
  secao: KickOffEstrategiaSecao,
  item: KickOffEstrategiaItem
): boolean {
  if (!isKickOffSecaoPremissas(secao)) return false
  const rotulo = item.rotulo.trim().toLowerCase()
  return KICK_OFF_PREMISSAS_ROTULOS_OBRIGATORIOS.some(
    (r) => r.toLowerCase() === rotulo
  )
}

export function buildKickOffEstrategiaPendencias(
  estrategia: KickOffEstrategia | null | undefined
): KickOffEstrategiaPendencia[] {
  if (!estrategia) {
    return [{ id: 'estrategia-iniciar', label: 'Iniciar o preenchimento da estratégia', done: false }]
  }

  const premissas = estrategia.secoes.find(isKickOffSecaoPremissas)
  const out: KickOffEstrategiaPendencia[] = []

  for (const rotulo of KICK_OFF_PREMISSAS_ROTULOS_OBRIGATORIOS) {
    const item = premissas?.itens.find((i) => i.rotulo.trim().toLowerCase() === rotulo.toLowerCase())
    out.push({
      id: `premissa-${rotulo}`,
      label: `${rotulo} (premissas)`,
      done: !!item?.valor.trim(),
    })
  }

  out.push({
    id: 'mercado-analisado',
    label: 'Mercado analisado (ao menos uma operadora)',
    done: estrategia.mercadoAnalisado.length > 0,
  })

  return out
}

/** Modelo inicial: rótulos de referência; conteúdo em branco salvo campos vindos da abertura. */
export function buildDefaultKickOffEstrategia(
  form: CotacaoFormState,
  labels: KickOffAberturaLabels,
  operadoras: Operadora[] = [],
  operadorasById?: Record<string, Operadora>
): KickOffEstrategia {
  const mercado =
    labels.operadorasSugestaoNomes ??
    mercadoAnalisadoFromSugestao(form, operadoras, operadorasById)

  const reembolsoTexto =
    labels.reembolso ??
    formatReembolsoKickOffTexto(form.reembolsoPorPlano, form.planos, form.itens, operadoras)

  const upgradeTexto =
    labels.upgradeDowngrade ??
    formatUpgradeDowngradeKickOff(
      form.upgradeDowngradePorPlano,
      form.planos,
      form.itens,
      operadoras
    )

  return {
    secoes: [
      createKickOffSecao('Premissas para cotação', [
        createKickOffItem('Motivo da cotação', ''),
        createKickOffItem('Carregamento Comercial desejado', ''),
      ]),
      createKickOffSecao('Condições a serem cotadas', [
        createKickOffItem(
          'Orientação',
          'Cotaremos mercado considerando a manutenção das características atuais do contrato, exceto conforme definido abaixo:'
        ),
        createKickOffItem('Tipo de Contratação', valorAbertura(labels.tipoContratacao)),
        createKickOffItem('Modalidade de contrato', valorAbertura(labels.modalidadeContrato)),
        createKickOffItem('Contribuição', ''),
        createKickOffItem('Coparticipação', ''),
        createKickOffItem('Reembolsos', reembolsoTexto === '—' ? '' : reembolsoTexto),
        createKickOffItem('Break even', valorAbertura(labels.breakEven || form.breakEven)),
        createKickOffItem(
          'Multa para rescisão contratual',
          valorAbertura(labels.multaRescisao || formatMultaRescisaoResumo(form))
        ),
        createKickOffItem(
          'Em acordo coletivo',
          valorAbertura(labels.convencaoColetiva || formatConvencaoColetivaResumo(form))
        ),
        createKickOffItem(
          'Upgrade e downgrade',
          upgradeTexto === '—' ? '' : upgradeTexto
        ),
        createKickOffItem('Prazo para novas inclusões e movimentações', ''),
        createKickOffItem('Cenários', ''),
      ]),
    ],
    mercadoAnalisado: [...mercado],
    notas: '',
  }
}

export function parseKickOffEstrategiaFromApi(raw: unknown): KickOffEstrategia {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyKickOffEstrategia()
  }
  const o = raw as Record<string, unknown>
  const secoesRaw = Array.isArray(o.secoes) ? o.secoes : []
  const secoes: KickOffEstrategiaSecao[] = secoesRaw
    .map((sec) => {
      if (!sec || typeof sec !== 'object' || Array.isArray(sec)) return null
      const s = sec as Record<string, unknown>
      const itensRaw = Array.isArray(s.itens) ? s.itens : []
      const itens: KickOffEstrategiaItem[] = itensRaw
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null
          const i = item as Record<string, unknown>
          return {
            id: String(i.id ?? uid('ki')),
            rotulo: String(i.rotulo ?? ''),
            valor: String(i.valor ?? ''),
          }
        })
        .filter(Boolean) as KickOffEstrategiaItem[]
      return {
        id: String(s.id ?? uid('ks')),
        titulo: String(s.titulo ?? ''),
        itens,
      }
    })
    .filter(Boolean) as KickOffEstrategiaSecao[]

  const mercadoAnalisado = Array.isArray(o.mercadoAnalisado)
    ? o.mercadoAnalisado.map((m) => String(m ?? '').trim()).filter(Boolean)
    : []

  const resumoEdicoesRaw = o.resumoEdicoes
  const resumoEdicoes: Record<string, string> | undefined =
    resumoEdicoesRaw && typeof resumoEdicoesRaw === 'object' && !Array.isArray(resumoEdicoesRaw)
      ? Object.fromEntries(
          Object.entries(resumoEdicoesRaw as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v ?? ''),
          ])
        )
      : undefined

  return {
    secoes,
    mercadoAnalisado,
    notas: o.notas != null ? String(o.notas) : '',
    ...(resumoEdicoes && Object.keys(resumoEdicoes).length ? { resumoEdicoes } : {}),
    ...(o.comunicarMercado && typeof o.comunicarMercado === 'object' && !Array.isArray(o.comunicarMercado)
      ? { comunicarMercado: o.comunicarMercado as KickOffEstrategia['comunicarMercado'] }
      : {}),
    ...(o.aguardandoOperadora &&
    typeof o.aguardandoOperadora === 'object' &&
    !Array.isArray(o.aguardandoOperadora)
      ? { aguardandoOperadora: o.aguardandoOperadora as KickOffEstrategia['aguardandoOperadora'] }
      : {}),
    ...(o.consolidandoDados &&
    typeof o.consolidandoDados === 'object' &&
    !Array.isArray(o.consolidandoDados)
      ? { consolidandoDados: o.consolidandoDados as KickOffEstrategia['consolidandoDados'] }
      : {}),
    ...(o.validacaoProposta &&
    typeof o.validacaoProposta === 'object' &&
    !Array.isArray(o.validacaoProposta)
      ? { validacaoProposta: o.validacaoProposta as KickOffEstrategia['validacaoProposta'] }
      : {}),
  }
}

export function kickOffEstrategiaIsComplete(estrategia: KickOffEstrategia | null | undefined): boolean {
  return buildKickOffEstrategiaPendencias(estrategia).every((p) => p.done)
}

export function ensureKickOffEstrategia(
  form: CotacaoFormState,
  raw: unknown,
  labels: KickOffAberturaLabels,
  operadoras: Operadora[] = [],
  operadorasById?: Record<string, Operadora>
): KickOffEstrategia {
  const parsed = parseKickOffEstrategiaFromApi(raw)
  if (parsed.secoes.length > 0 || parsed.mercadoAnalisado.length > 0) {
    return {
      ...parsed,
      mercadoAnalisado: normalizeMercadoAnalisadoNomes(
        parsed.mercadoAnalisado,
        operadoras,
        operadorasById
      ),
    }
  }
  return buildDefaultKickOffEstrategia(form, labels, operadoras, operadorasById)
}

import type { Operadora } from '../../../types/masterData'
import type { PlacementCondicao, PlacementFilial } from '../../../store/placementStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import { computeBeneficiariosResumo, CATEGORIAS_APRESENTACAO } from './placementBeneficiariosResumo'
import { computeLocalidadeResumo } from './placementBeneficiariosLocalidade'
import {
  formatContribuicaoKickOff,
  formatPlanosResumoLinhas,
  normalizeMercadoAnalisadoNomes,
  resolveKickOffAberturaLabels,
  resolveOperadoraNome,
} from './placementKickOffFormatters'
import {
  buildAberturaResumoLinhas,
  resolveResumoLinhaValor,
} from './placementKickOffAberturaResumo'
import type { KickOffAberturaLabels, KickOffEstrategia } from './placementKickOffEstrategia'
import {
  formatMultaRescisaoResumo,
  labelFormularioTipo,
} from './placementFormularioContrato'
import { sumCustoEstimadoPlanosCents } from './placementCotacaoDetalhes'
import { formatCentsToBRL } from './utils'
import { buildComunicarMercadoMdsEmailHtml, sortTopicosForEmail } from './placementComunicarMercadoEmailHtml'

export type ComunicarMercadoSinistralidade = {
  sinistralidadePeriodo: string
  estimativaReajuste: string
  indiceReajusteFinanceiro: string
  justificativaPicos: string
  maioresUsuarios: string
  maioresUsuariosMesAMes: string
  imagemDataUri: string
}

export type ComunicarMercadoConteudoCompartilhado = {
  topicosOverrides: Record<string, string>
  sinistralidade: ComunicarMercadoSinistralidade
  localidades: {
    incluirNoEmail: boolean
    imagemDataUri: string
  }
}

export type ComunicarMercadoFornecedorState = {
  razaoSocial: string
  cnpj: string
  atividadeEconomica: string
  municipioUf: string
  /** Grupo de produção MDS vinculado a este fornecedor (exibido em Aguardando operadora). */
  grupoProducao: string
  enviado: boolean
  destinatariosEmails: string[]
  /** Sobrescritas só do cabeçalho/dados do fornecedor destino. */
  topicosOverrides: Record<string, string>
  dataEnvio: string
  dataPrevisaoRetorno: string
  dataRetornoEfetiva: string
}

export type ComunicarMercadoState = {
  prazoRetorno: string
  conteudoCompartilhado: ComunicarMercadoConteudoCompartilhado
  fornecedores: Record<string, ComunicarMercadoFornecedorState>
}

export type BuildComunicarMercadoInput = {
  form: CotacaoFormState
  fornecedorNome: string
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
  labels: KickOffAberturaLabels
  condicao?: PlacementCondicao | null
  filial?: PlacementFilial | null
  corretorNome?: string
  subfaturas?: { razaoSocial: string; cnpj: string; vidas?: number | null; cidade?: string | null; uf?: string | null }[]
  beneficiarios?: PlacementBeneficiario[]
  analistaResponsavelNome?: string
  comunicarMercado?: ComunicarMercadoState | null
}

export type ComunicarMercadoTopico = {
  id: string
  grupo: string
  rotulo: string
  valor: string
}

/** Tópicos que variam por fornecedor (não entram na réplica do corpo). */
export const TOPICOS_CABECALHO_FORNECEDOR = new Set([
  'forn-razao',
  'forn-cnpj',
  'forn-atividade',
  'forn-municipio',
])

export function emptySinistralidade(): ComunicarMercadoSinistralidade {
  return {
    sinistralidadePeriodo: '',
    estimativaReajuste: '',
    indiceReajusteFinanceiro: '',
    justificativaPicos: '',
    maioresUsuarios: '',
    maioresUsuariosMesAMes: '',
    imagemDataUri: '',
  }
}

export function emptyConteudoCompartilhado(): ComunicarMercadoConteudoCompartilhado {
  return {
    topicosOverrides: {},
    sinistralidade: emptySinistralidade(),
    localidades: { incluirNoEmail: false, imagemDataUri: '' },
  }
}

function normKey(nome: string): string {
  return nome.trim().toLowerCase()
}

function formatCnpj14(value: string | null | undefined): string {
  const d = String(value ?? '').replace(/\D/g, '').slice(0, 14)
  if (d.length !== 14) return String(value ?? '').trim()
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

function formatDateBR(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '—'
  const d = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('pt-BR')
}

function formatPrazoRetornoAssunto(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '—'
  const d = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('pt-BR')
}

function monthNameApolice(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '—'
  const d = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw)
  if (Number.isNaN(d.getTime())) return '—'
  const m = d.toLocaleDateString('pt-BR', { month: 'long' })
  return m.charAt(0).toUpperCase() + m.slice(1)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pushTopico(
  out: ComunicarMercadoTopico[],
  grupo: string,
  id: string,
  rotulo: string,
  valor: string | null | undefined
) {
  const v = String(valor ?? '').trim()
  if (!v) return
  out.push({ id, grupo, rotulo, valor: v })
}

function kickOffSecaoItens(
  estrategia: KickOffEstrategia | null | undefined,
  tituloIncludes: string
): { rotulo: string; valor: string }[] {
  const needle = tituloIncludes.toLowerCase()
  const sec = estrategia?.secoes?.find((s) => s.titulo.toLowerCase().includes(needle))
  if (!sec) return []
  return sec.itens
    .map((i) => ({ rotulo: i.rotulo.trim(), valor: i.valor.trim() }))
    .filter((i) => i.rotulo && i.valor)
}

function resumoValor(
  form: CotacaoFormState,
  labels: KickOffAberturaLabels,
  id: string,
  linhas: ReturnType<typeof buildAberturaResumoLinhas>
): string {
  const linha = linhas.find((l) => l.id === id)
  if (!linha) return '—'
  return resolveResumoLinhaValor(linha, form.kickOffEstrategia?.resumoEdicoes)
}

function formatCorretoraLinha(filial?: PlacementFilial | null): string {
  if (!filial) return '—'
  const cnpj = formatCnpj14(filial.cnpj)
  return [filial.razaoSocial, cnpj].filter(Boolean).join(' - ')
}

function formatCorretagemEstudo(
  form: CotacaoFormState,
  filial?: PlacementFilial | null,
  corretorNome?: string
): string {
  const parts: string[] = []
  const mds = form.dadosFinanceiros.estudo.participacao.mds.trim()
  const cor = form.dadosFinanceiros.estudo.participacao.corretorParceiro.trim()
  if (filial && mds) {
    parts.push(`${mds}% ${filial.razaoSocial}${filial.cnpj ? ` - ${formatCnpj14(filial.cnpj)}` : ''}`)
  }
  if (corretorNome && cor) {
    parts.push(`${cor}% ${corretorNome}`)
  }
  return parts.join(' | ') || '—'
}

function formatSubfaturas(
  subfaturas: BuildComunicarMercadoInput['subfaturas']
): string {
  if (!subfaturas?.length) return '—'
  return subfaturas
    .map((s) => {
      const parts = [s.razaoSocial, formatCnpj14(s.cnpj), s.cidade && s.uf ? `${s.cidade}/${s.uf}` : '']
        .filter(Boolean)
        .join(' · ')
      return parts || '—'
    })
    .join('\n')
}

function formatBeneficiariosBase(rows: PlacementBeneficiario[]): string {
  const r = computeBeneficiariosResumo(rows)
  const agregados = r.categorias.agregados ?? 0
  const lines = [
    `Base de dados com ${r.total} vidas, sendo: ${r.titulares} titulares, ${r.dependentes} dependentes${agregados ? ` e ${String(agregados).padStart(2, '0')} agregados` : ''}:`,
  ]

  for (const cat of CATEGORIAS_APRESENTACAO) {
    if (cat.key === 'demais') continue
    const n = r.categorias[cat.key]
    if (!n) continue
    lines.push(`${cat.label}: ${n} informado(s)`)
  }

  lines.push(
    'Não foram informados: Agregados, Aposentados por Invalidez, Casos Crônicos, Home Care, Expatriados, Filhos inválidos, Filhos adotivos, Liberalidades, PJs, Reclusos, Remidos, Sem vínculo, etc., vidas com perfis diferentes dos que foram listados acima, não considerados para a precificação | Beneficiários com Transtorno do Desenvolvimento Global (TDG) e/ou Transtorno do Espectro Autista (TEA) não foram informados e desta forma não considerados, caso haja, poderão ser solicitadas informações adicionais para implantação, estando sujeito a alteração de valores.'
  )
  return lines.join('\n')
}

function formatLocalidades(rows: PlacementBeneficiario[]): string {
  const loc = computeLocalidadeResumo(rows)
  if (!loc.total) return '—'
  const ufs = new Set(loc.porUf.filter((u) => u.vidas > 0).map((u) => u.uf))
  const lines = [`Localidades: Vidas presentes em ${ufs.size} estados, com maior concentração de vidas em:`]
  for (const m of loc.topMunicipios.slice(0, 5)) {
    lines.push(` - ${m.municipio}/${m.uf} - ${m.vidas} vidas;`)
  }
  if (loc.demaisLocalidades.vidas > 0) {
    lines.push(`Demais localidades - ${loc.demaisLocalidades.vidas} vidas`)
  }
  return lines.join('\n')
}

/** Fornecedores validados no Kick off (mercado analisado). */
export function mercadoFornecedoresFromForm(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): string[] {
  const fromKickOff = normalizeMercadoAnalisadoNomes(
    form.kickOffEstrategia?.mercadoAnalisado ?? [],
    operadoras,
    operadorasById
  )
  if (fromKickOff.length) return fromKickOff
  return normalizeMercadoAnalisadoNomes(
    form.operadorasSugestaoIds.map((id) => resolveOperadoraNome(id, operadoras, operadorasById)),
    operadoras,
    operadorasById
  )
}

export function emptyComunicarMercadoFornecedor(fornecedorNome: string): ComunicarMercadoFornecedorState {
  return {
    razaoSocial: fornecedorNome,
    cnpj: '',
    atividadeEconomica: '',
    municipioUf: '',
    grupoProducao: '',
    enviado: false,
    destinatariosEmails: [],
    topicosOverrides: {},
    dataEnvio: '',
    dataPrevisaoRetorno: '',
    dataRetornoEfetiva: '',
  }
}

export function ensureComunicarMercadoState(
  current: ComunicarMercadoState | null | undefined,
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): ComunicarMercadoState {
  const nomes = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
  const fornecedores: Record<string, ComunicarMercadoFornecedorState> = {
    ...(current?.fornecedores ?? {}),
  }
  for (const nome of nomes) {
    const key = normKey(nome)
    if (!fornecedores[key]) {
      fornecedores[key] = emptyComunicarMercadoFornecedor(nome)
    } else if (!fornecedores[key].razaoSocial.trim()) {
      fornecedores[key] = { ...fornecedores[key], razaoSocial: nome }
    }
  }
  return {
    prazoRetorno: current?.prazoRetorno?.trim() || form.dataLimite?.trim() || '',
    conteudoCompartilhado: current?.conteudoCompartilhado ?? emptyConteudoCompartilhado(),
    fornecedores,
  }
}

function parseSinistralidade(raw: unknown): ComunicarMercadoSinistralidade {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptySinistralidade()
  const o = raw as Record<string, unknown>
  return {
    sinistralidadePeriodo: String(o.sinistralidadePeriodo ?? ''),
    estimativaReajuste: String(o.estimativaReajuste ?? ''),
    indiceReajusteFinanceiro: String(o.indiceReajusteFinanceiro ?? ''),
    justificativaPicos: String(o.justificativaPicos ?? ''),
    maioresUsuarios: String(o.maioresUsuarios ?? ''),
    maioresUsuariosMesAMes: String(o.maioresUsuariosMesAMes ?? ''),
    imagemDataUri: String(o.imagemDataUri ?? ''),
  }
}

function parseConteudoCompartilhado(raw: unknown): ComunicarMercadoConteudoCompartilhado {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyConteudoCompartilhado()
  const o = raw as Record<string, unknown>
  const overridesRaw = o.topicosOverrides
  const topicosOverrides: Record<string, string> =
    overridesRaw && typeof overridesRaw === 'object' && !Array.isArray(overridesRaw)
      ? Object.fromEntries(
          Object.entries(overridesRaw as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
        )
      : {}
  const locRaw = o.localidades
  const localidades =
    locRaw && typeof locRaw === 'object' && !Array.isArray(locRaw)
      ? {
          incluirNoEmail: (locRaw as Record<string, unknown>).incluirNoEmail === true,
          imagemDataUri: String((locRaw as Record<string, unknown>).imagemDataUri ?? ''),
        }
      : { incluirNoEmail: false, imagemDataUri: '' }
  return {
    topicosOverrides,
    sinistralidade: parseSinistralidade(o.sinistralidade),
    localidades,
  }
}

export function parseComunicarMercadoFromKickOff(
  estrategia: KickOffEstrategia | null | undefined
): ComunicarMercadoState | null {
  const raw = (estrategia as { comunicarMercado?: unknown } | null | undefined)?.comunicarMercado
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const fornRaw = o.fornecedores
  const fornecedores: Record<string, ComunicarMercadoFornecedorState> = {}
  if (fornRaw && typeof fornRaw === 'object' && !Array.isArray(fornRaw)) {
    for (const [key, val] of Object.entries(fornRaw as Record<string, unknown>)) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) continue
      const f = val as Record<string, unknown>
      const overridesRaw = f.topicosOverrides
      const topicosOverrides: Record<string, string> =
        overridesRaw && typeof overridesRaw === 'object' && !Array.isArray(overridesRaw)
          ? Object.fromEntries(
              Object.entries(overridesRaw as Record<string, unknown>).map(([k, v]) => [
                k,
                String(v ?? ''),
              ])
            )
          : {}
      fornecedores[key] = {
        razaoSocial: String(f.razaoSocial ?? ''),
        cnpj: String(f.cnpj ?? ''),
        atividadeEconomica: String(f.atividadeEconomica ?? ''),
        municipioUf: String(f.municipioUf ?? ''),
        grupoProducao: String(f.grupoProducao ?? ''),
        enviado: f.enviado === true,
        destinatariosEmails: Array.isArray(f.destinatariosEmails)
          ? f.destinatariosEmails.map((e) => String(e ?? '').trim()).filter(Boolean)
          : [],
        topicosOverrides,
        dataEnvio: String(f.dataEnvio ?? ''),
        dataPrevisaoRetorno: String(f.dataPrevisaoRetorno ?? ''),
        dataRetornoEfetiva: String(f.dataRetornoEfetiva ?? ''),
      }
    }
  }
  return {
    prazoRetorno: String(o.prazoRetorno ?? ''),
    conteudoCompartilhado: parseConteudoCompartilhado(o.conteudoCompartilhado),
    fornecedores,
  }
}

export function buildComunicarMercadoTopicos(input: BuildComunicarMercadoInput): ComunicarMercadoTopico[] {
  const {
    form,
    fornecedorNome,
    labels,
    condicao,
    filial,
    corretorNome,
    subfaturas = [],
    beneficiarios = [],
    comunicarMercado,
  } = input

  const linhas = buildAberturaResumoLinhas({
    form,
    labels,
    operadoras: input.operadoras,
    operadorasById: input.operadorasById,
    subfaturas,
  })

  const fornState =
    comunicarMercado?.fornecedores?.[normKey(fornecedorNome)] ??
    emptyComunicarMercadoFornecedor(fornecedorNome)
  const shared = comunicarMercado?.conteudoCompartilhado ?? emptyConteudoCompartilhado()

  const valorProjetadoCents = sumCustoEstimadoPlanosCents(form.planos)
  const valorProjetado =
    valorProjetadoCents != null ? formatCentsToBRL(valorProjetadoCents) : '—'

  const out: ComunicarMercadoTopico[] = []

  pushTopico(out, 'Fornecedor', 'forn-razao', 'Razão Social', fornState.razaoSocial || fornecedorNome)
  pushTopico(out, 'Fornecedor', 'forn-cnpj', 'CNPJ', fornState.cnpj || '—')
  pushTopico(
    out,
    'Fornecedor',
    'forn-atividade',
    'Atividade econômica principal',
    fornState.atividadeEconomica || '—'
  )
  pushTopico(out, 'Fornecedor', 'forn-municipio', 'Município/UF do CNPJ', fornState.municipioUf || '—')

  pushTopico(out, 'Subfaturas', 'subfaturas', 'Subfaturas', formatSubfaturas(subfaturas))

  pushTopico(out, 'Dados gerais', 'corretora-atual', 'Corretora atual', formatCorretoraLinha(filial))
  pushTopico(
    out,
    'Dados gerais',
    'corretora-solicitante',
    'Corretora solicitante',
    formatCorretoraLinha(filial)
  )
  pushTopico(
    out,
    'Dados gerais',
    'bases-contrato',
    'Bases disponibilizadas do contrato atual',
    'Base de vidas e relatórios anexos'
  )
  pushTopico(out, 'Dados gerais', 'operadora-atual', 'Operadora atual', labels.fornecedoresAtuais)
  pushTopico(out, 'Dados gerais', 'inicio-vigencia', 'Início de vigência', formatDateBR(form.vigenciaApolice))
  pushTopico(
    out,
    'Dados gerais',
    'aniversario-apolice',
    'Aniversário da apólice',
    monthNameApolice(form.vigenciaApolice)
  )
  pushTopico(out, 'Dados gerais', 'prazo-vigencia', 'Prazo de vigência do contrato (em meses)', labels.prazoVigencia)
  pushTopico(
    out,
    'Dados gerais',
    'aviso-previo',
    'Prazo referente ao aviso prévio (em dias)',
    form.multaRescisaoAvisoPrevio.trim() || resumoValor(form, labels, 'multa-rescisao', linhas)
  )
  pushTopico(
    out,
    'Dados gerais',
    'multa-cancelamento',
    'Multa em caso de cancelamento antecipado',
    formatMultaRescisaoResumo(form)
  )
  pushTopico(out, 'Dados gerais', 'valor-projetado', 'Valor a ser projetado', valorProjetado)
  pushTopico(out, 'Dados gerais', 'tipo-contratacao', 'Tipo de contratação', labels.tipoContratacao)
  pushTopico(out, 'Dados gerais', 'modalidade', 'Modalidade de contrato', labels.modalidadeContrato)
  pushTopico(
    out,
    'Dados gerais',
    'contribuicao',
    'Regra de contribuição',
    labels.contribuicao || formatContribuicaoKickOff(form)
  )
  pushTopico(
    out,
    'Dados gerais',
    'convencao',
    'Convenção coletiva',
    labels.convencaoColetiva || resumoValor(form, labels, 'convencao-coletiva', linhas)
  )
  pushTopico(out, 'Dados gerais', 'upgrade-downgrade', 'Upgrade / Downgrade', labels.upgradeDowngrade)
  pushTopico(
    out,
    'Dados gerais',
    'coparticipacao',
    'Coparticipação e reversão',
    labels.coparticipacao || form.coparticipacaoDetalhePorPlanos.trim()
  )
  pushTopico(out, 'Dados gerais', 'reembolso', 'Exemplos de reembolso', labels.reembolso)
  pushTopico(out, 'Dados gerais', 'break-even', 'Break-even', labels.breakEven || form.breakEven)

  const sin = shared.sinistralidade
  pushTopico(
    out,
    'Sinistralidade',
    'sinistralidade-periodo',
    'Sinistralidade da apólice e período avaliado',
    sin.sinistralidadePeriodo
  )
  pushTopico(out, 'Sinistralidade', 'estimativa-reajuste', 'Estimativa de reajuste', sin.estimativaReajuste)
  pushTopico(
    out,
    'Sinistralidade',
    'indice-reajuste',
    'Índice de reajuste financeiro',
    sin.indiceReajusteFinanceiro
  )
  pushTopico(
    out,
    'Sinistralidade',
    'justificativa-picos',
    'Justificativa dos picos',
    sin.justificativaPicos
  )
  pushTopico(out, 'Sinistralidade', 'maiores-usuarios', 'Maiores usuários', sin.maioresUsuarios)
  pushTopico(
    out,
    'Sinistralidade',
    'maiores-usuarios-mes',
    'Maiores usuários mês a mês',
    sin.maioresUsuariosMesAMes
  )

  for (const item of kickOffSecaoItens(form.kickOffEstrategia, 'condições')) {
    const id = `kickoff-cond-${item.rotulo.toLowerCase().replace(/\W+/g, '-')}`
    if (out.some((t) => t.rotulo.toLowerCase() === item.rotulo.toLowerCase())) continue
    pushTopico(out, 'Dados gerais (Kick off)', id, item.rotulo, item.valor)
  }

  const planosTxt = formatPlanosResumoLinhas(form.planos, form.itens, input.operadoras)
  if (planosTxt.length) {
    pushTopico(out, 'Planos atuais', 'planos-atuais', 'Planos atuais', planosTxt.join('\n'))
  }

  if (beneficiarios.length) {
    pushTopico(
      out,
      'Beneficiários',
      'base-vidas',
      'Base de beneficiários',
      formatBeneficiariosBase(beneficiarios)
    )
    pushTopico(out, 'Localidades', 'localidades', 'Localidades', formatLocalidades(beneficiarios))
  }

  for (const item of kickOffSecaoItens(form.kickOffEstrategia, 'premissas')) {
    pushTopico(
      out,
      'Premissas para cotação',
      `kickoff-prem-${item.rotulo.toLowerCase().replace(/\W+/g, '-')}`,
      item.rotulo,
      item.valor
    )
  }

  pushTopico(
    out,
    'Premissas para cotação',
    'corretagem-estudo',
    'Co-corretagem',
    formatCorretagemEstudo(form, filial, corretorNome)
  )
  pushTopico(out, 'Premissas para cotação', 'tipo-contratacao-estudo', 'Tipo de contratação', labels.tipoContratacao)
  pushTopico(out, 'Premissas para cotação', 'modalidade-estudo', 'Modalidade de contrato', labels.modalidadeContrato)
  pushTopico(out, 'Premissas para cotação', 'break-even-estudo', 'Break-even', labels.breakEven || form.breakEven)

  if (condicao?.razaoSocial) {
    pushTopico(out, 'Estipulante', 'estipulante', 'Estipulante', condicao.razaoSocial)
    if (condicao.cnpj) {
      pushTopico(out, 'Estipulante', 'estipulante-cnpj', 'CNPJ estipulante', formatCnpj14(condicao.cnpj))
    }
  }

  return out.map((t) => {
    let valor = t.valor
    if (TOPICOS_CABECALHO_FORNECEDOR.has(t.id)) {
      valor = fornState.topicosOverrides[t.id] ?? valor
    } else if (shared.topicosOverrides[t.id] !== undefined) {
      valor = shared.topicosOverrides[t.id]
    } else if (fornState.topicosOverrides[t.id] !== undefined) {
      valor = fornState.topicosOverrides[t.id]
    }
    return { ...t, valor }
  })
}

export function buildComunicarMercadoSubject(
  input: BuildComunicarMercadoInput & { comunicarMercado: ComunicarMercadoState }
): string {
  const pedido = input.labels.pedido?.trim() || input.labels.projeto?.trim() || 'COTAÇÃO MDS'
  const beneficio = labelFormularioTipo(input.form.formularioTipo).toUpperCase() || 'BENEFÍCIO'
  const fornecedor = input.fornecedorNome.toUpperCase()
  const forn = input.comunicarMercado.fornecedores[normKey(input.fornecedorNome)]
  const prazoRaw =
    forn?.dataPrevisaoRetorno?.trim() ||
    input.comunicarMercado.prazoRetorno?.trim() ||
    input.form.dataLimite?.trim()
  const prazo = formatPrazoRetornoAssunto(prazoRaw)
  return `ENC: ${pedido} | BENEFÍCIO ${beneficio} | ${fornecedor} | PRAZO DE RETORNO: ${prazo}`
}

export function buildComunicarMercadoPlainText(
  input: BuildComunicarMercadoInput & { comunicarMercado: ComunicarMercadoState }
): string {
  const topicos = sortTopicosForEmail(buildComunicarMercadoTopicos(input))
  const fornNome = fornecedorDisplayNome(input)
  const intro = [
    'Prezados, boa tarde.',
    '',
    `Encaminho para conhecimento a estratégia de estudo da ${fornNome}, para a elaboração da proposta comercial. Peço considerar as informações do corpo do e-mail e anexos.`,
    '',
  ]

  const groups: string[] = []
  let current = ''
  for (const t of topicos) {
    if (t.grupo !== current) {
      current = t.grupo
      groups.push('', current + ':', '')
    }
    groups.push(`${t.rotulo}: ${t.valor}`)
  }

  const assinatura = [
    '',
    'Atenciosamente,',
    input.analistaResponsavelNome?.trim() || 'Equipe Placement MDS',
  ]

  return [...intro, ...groups, ...assinatura].join('\n')
}

export function buildComunicarMercadoHtml(
  input: BuildComunicarMercadoInput & { comunicarMercado: ComunicarMercadoState }
): string {
  const topicos = buildComunicarMercadoTopicos(input)
  const shared = input.comunicarMercado.conteudoCompartilhado ?? emptyConteudoCompartilhado()
  const fornNome = fornecedorDisplayNome(input)
  const introHtml = `Prezados, boa tarde.<br/><br/>Encaminho para conhecimento a estratégia de estudo da <strong style="color:#002561;">${escapeHtml(fornNome)}</strong>, para a elaboração da proposta comercial. Peço considerar as informações do corpo do e-mail e anexos.`

  return buildComunicarMercadoMdsEmailHtml({
    assuntoTitulo: buildComunicarMercadoSubject(input),
    fornecedorNome: fornNome,
    introHtml,
    topicos,
    shared,
    analistaNome: input.analistaResponsavelNome?.trim() || 'Equipe Placement MDS',
    ticket: input.form.ticket,
  })
}

export function comunicarMercadoIsComplete(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): boolean {
  const nomes = mercadoFornecedoresFromForm(form, operadoras, operadorasById)
  if (!nomes.length) return false
  const state = ensureComunicarMercadoState(
    parseComunicarMercadoFromKickOff(form.kickOffEstrategia),
    form,
    operadoras,
    operadorasById
  )
  return nomes.every((nome) => state.fornecedores[normKey(nome)]?.enviado === true)
}

export function buildKickOffAberturaLabelsForComunicarMercado(
  form: CotacaoFormState,
  operadoras: Operadora[],
  placement: Parameters<typeof resolveKickOffAberturaLabels>[2],
  extras?: Parameters<typeof resolveKickOffAberturaLabels>[3]
): KickOffAberturaLabels {
  return resolveKickOffAberturaLabels(form, operadoras, placement, extras)
}

function fornecedorDisplayNome(input: BuildComunicarMercadoInput): string {
  const forn = input.comunicarMercado?.fornecedores?.[normKey(input.fornecedorNome)]
  return forn?.razaoSocial?.trim() || input.fornecedorNome
}

/** Copia corpo do e-mail (tópicos + sinistralidade + localidades) para conteúdo compartilhado. */
export function replicarConteudoEmailParaDemais(
  state: ComunicarMercadoState,
  sourceFornecedorNome: string
): ComunicarMercadoState {
  const sourceKey = normKey(sourceFornecedorNome)
  const source = state.fornecedores[sourceKey]
  if (!source) return state

  const sharedOverrides = { ...state.conteudoCompartilhado.topicosOverrides }
  for (const [id, valor] of Object.entries(source.topicosOverrides)) {
    if (TOPICOS_CABECALHO_FORNECEDOR.has(id)) continue
    sharedOverrides[id] = valor
  }
  for (const [id, valor] of Object.entries(state.conteudoCompartilhado.topicosOverrides)) {
    if (!TOPICOS_CABECALHO_FORNECEDOR.has(id)) sharedOverrides[id] = valor
  }

  return {
    ...state,
    conteudoCompartilhado: {
      ...state.conteudoCompartilhado,
      topicosOverrides: sharedOverrides,
    },
  }
}

export function isTopicoCabecalhoFornecedor(topicoId: string): boolean {
  return TOPICOS_CABECALHO_FORNECEDOR.has(topicoId)
}

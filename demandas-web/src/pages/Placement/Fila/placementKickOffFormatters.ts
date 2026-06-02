import type { Operadora } from '../../../types/masterData'
import type { usePlacementStore } from '../../../store/placementStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  formatMultaRescisaoResumo,
  labelFormularioTipo,
  labelSimNaoChoice,
} from './placementFormularioContrato'
import {
  itensToApiPayload,
  type MapeamentoItemForm,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import { COBERTURAS_ESPECIAIS_CATALOGO } from './placementCoberturasEspeciais'
import {
  formatReembolsoMoedaDisplay,
  getReembolsoCell,
  REEMBOLSO_PROCEDIMENTOS_FIXOS,
  type ReembolsoPorPlano,
} from './placementReembolso'
import { buildPlanoSelectOptions, type UpgradeDowngradePorPlano } from './UpgradeDowngradeFields'
import { resolveOperadoraNome } from './placementKickOffFormatters'
import type { KickOffAberturaLabels } from './placementKickOffEstrategia'

type PlacementSlice = Pick<
  ReturnType<typeof usePlacementStore.getState>,
  | 'condicoes'
  | 'prospects'
  | 'filiais'
  | 'tiposContratacao'
  | 'modalidadesContrato'
  | 'prazosVigenciaContrato'
  | 'projetos'
  | 'pedidos'
  | 'temperaturas'
>

function simNaoLabel(v: string): string {
  if (v === 'sim') return 'Sim'
  if (v === 'nao') return 'Não'
  return '—'
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function resolveOperadoraNome(
  idOrName: string,
  operadoras: { id: string; nome: string }[],
  byId?: Record<string, { id: string; nome: string }>
): string {
  const v = String(idOrName ?? '').trim()
  if (!v) return '—'
  const fromMap = byId?.[v]?.nome
  if (fromMap) return fromMap
  const fromList = operadoras.find((o) => o.id === v)?.nome
  if (fromList) return fromList
  if (UUID_RE.test(v)) return 'Operadora não identificada'
  return v
}

export function normalizeMercadoAnalisadoNomes(
  mercado: string[],
  operadoras: { id: string; nome: string }[],
  byId?: Record<string, { id: string; nome: string }>
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of mercado) {
    const nome = resolveOperadoraNome(entry, operadoras, byId)
    if (!nome || nome === '—' || seen.has(nome)) continue
    seen.add(nome)
    out.push(nome)
  }
  return out
}

export function mercadoAnalisadoFromSugestao(
  form: CotacaoFormState,
  operadoras: { id: string; nome: string }[],
  byId?: Record<string, { id: string; nome: string }>
): string[] {
  return normalizeMercadoAnalisadoNomes(
    form.operadorasSugestaoIds.map((id) => resolveOperadoraNome(id, operadoras, byId)),
    operadoras,
    byId
  )
}

export function formatUpgradeDowngradeKickOff(
  ud: UpgradeDowngradePorPlano,
  planos: PlanoCoberturaForm[],
  itens: MapeamentoItemForm[],
  operadoras: Operadora[]
): string {
  const opts = buildPlanoSelectOptions(planos, itens, operadoras)
  const labelPlano = (id: string) => opts.find((o) => o.id === id)?.label ?? id
  const parts: string[] = []

  if (ud.permiteUpgrade !== '') {
    parts.push(`Upgrade: ${simNaoLabel(ud.permiteUpgrade)}`)
    if (ud.permiteUpgrade === 'sim') {
      if (ud.planosIdsUpgrade.length) {
        parts.push(`Planos upgrade: ${ud.planosIdsUpgrade.map(labelPlano).join(', ')}`)
      }
      if (ud.regraUpgrade.trim()) parts.push(`Regra upgrade: ${ud.regraUpgrade.trim()}`)
    }
  }
  if (ud.permiteDowngrade !== '') {
    parts.push(`Downgrade: ${simNaoLabel(ud.permiteDowngrade)}`)
    if (ud.permiteDowngrade === 'sim') {
      if (ud.planosIdsDowngrade.length) {
        parts.push(`Planos downgrade: ${ud.planosIdsDowngrade.map(labelPlano).join(', ')}`)
      }
      if (ud.regraDowngrade.trim()) parts.push(`Regra downgrade: ${ud.regraDowngrade.trim()}`)
    }
  }
  return parts.join('\n') || '—'
}

export function formatReembolsoKickOffTexto(
  reembolso: ReembolsoPorPlano,
  planos: PlanoCoberturaForm[],
  itens: MapeamentoItemForm[],
  operadoras: Operadora[]
): string {
  if (reembolso.necessitaEquiparar === '' && !planos.length) return '—'

  const lines: string[] = []
  if (reembolso.necessitaEquiparar !== '') {
    lines.push(`Equiparar reembolso: ${simNaoLabel(reembolso.necessitaEquiparar)}`)
    if (reembolso.necessitaEquiparar === 'sim' && reembolso.detalheEquiparacao.trim()) {
      lines.push(`Detalhe: ${reembolso.detalheEquiparacao.trim()}`)
    }
  }

  const options = buildPlanoSelectOptions(planos, itens, operadoras)
  const colIds =
    reembolso.planosIds.length > 0
      ? reembolso.planosIds.filter((id) => planos.some((p) => p.id === id))
      : planos.map((p) => p.id)

  if (!colIds.length) return lines.join('\n') || '—'

  const headers = colIds.map((id, idx) => {
    const opt = options.find((o) => o.id === id)
    return opt?.label ?? `Plano ${idx + 1}`
  })

  lines.push(`Procedimento | ${headers.join(' | ')}`)

  const procRows = [
    ...REEMBOLSO_PROCEDIMENTOS_FIXOS.map((p) => ({ key: p.key, label: p.label })),
    ...reembolso.procedimentosCustomizados.map((p) => ({
      key: p.id,
      label: p.nome.trim() || 'Procedimento customizado',
    })),
  ]

  for (const row of procRows) {
    const cells = colIds.map((planoId) => {
      const raw = getReembolsoCell(reembolso.valores, row.key, planoId)
      return raw.trim() ? formatReembolsoMoedaDisplay(raw) || raw : '—'
    })
    if (cells.every((c) => c === '—')) continue
    lines.push(`${row.label} | ${cells.join(' | ')}`)
  }

  for (const planoId of colIds) {
    const pr = reembolso.prazosPorPlano[planoId]
    if (!pr) continue
    const opt = options.find((o) => o.id === planoId)
    const nome = opt?.label ?? planoId
    const prParts: string[] = []
    if (pr.consultaDias.trim()) prParts.push(`consulta ${pr.consultaDias}d`)
    if (pr.procedimentosDias.trim()) prParts.push(`procedimentos ${pr.procedimentosDias}d`)
    if (prParts.length) lines.push(`Prazos (${nome}): ${prParts.join(', ')}`)
  }

  return lines.length ? lines.join('\n') : '—'
}

export function formatContribuicaoKickOff(form: CotacaoFormState): string {
  const p = form.dadosFinanceiros.atual.participacao
  const parts: string[] = []
  if (p.mds.trim()) parts.push(`MDS: ${p.mds}%`)
  if (p.corretorParceiro.trim()) parts.push(`Corretor: ${p.corretorParceiro}%`)
  return parts.join(' · ') || '—'
}

export function formatPlanosResumoLinhas(
  planos: PlanoCoberturaForm[],
  itens: MapeamentoItemForm[],
  operadoras: Operadora[]
): string[] {
  if (!planos.length) return []
  const opts = buildPlanoSelectOptions(planos, itens, operadoras)
  return planos.map((p, idx) => {
    const opt = opts.find((o) => o.id === p.id)
    const nome = p.nomePlano.trim() || opt?.label || `Plano ${idx + 1}`
    const parts = [
      nome,
      p.acomodacao ? `Acomodação: ${p.acomodacao}` : '',
      p.abrangencia ? `Abrangência: ${p.abrangencia}` : '',
      p.elegibilidade ? `Elegibilidade: ${p.elegibilidade}` : '',
      p.numeroVidas ? `Vidas: ${p.numeroVidas}` : '',
    ].filter(Boolean)
    return parts.join(' · ')
  })
}

export function formatCoberturasEspeciaisResumo(form: CotacaoFormState): string[] {
  const out: string[] = []
  for (const cat of COBERTURAS_ESPECIAIS_CATALOGO) {
    const hit = form.coberturasEspeciais.itens.find((i) => i.key === cat.key)
    if (!hit) continue
    const tem =
      hit.possui !== '' || hit.detalhe.trim() || (hit.planosIds?.length ?? 0) > 0
    if (!tem) continue
    const det = [hit.possui !== '' ? simNaoLabel(hit.possui) : '', hit.detalhe.trim()]
      .filter(Boolean)
      .join(' — ')
    out.push(`${cat.titulo}${cat.detalheLabel ? ` (${cat.detalheLabel})` : ''}: ${det || '—'}`)
  }
  return out
}

export function resolveKickOffAberturaLabels(
  form: CotacaoFormState,
  operadoras: { id: string; nome: string }[],
  placement: PlacementSlice,
  extras?: {
    analistaCadastroNome?: string
    analistaResponsavelNome?: string
    corretorNome?: string
  }
): KickOffAberturaLabels {
  const condicao = placement.condicoes.find((c) => c.id === form.condicaoId)
  const prospect = placement.prospects.find((p) => p.id === form.prospectId)
  const filial = placement.filiais.find((f) => f.id === form.filialId)
  const fornecedorNome = (id: string) => resolveOperadoraNome(id, operadoras)
  const opAsOperadora = operadoras as Operadora[]

  const apiItens = itensToApiPayload(form.itens, form.formularioTipo)
  const produtos = apiItens.map((i) => i.produtoNome).filter(Boolean).join(', ')
  const fornecedores = [...new Set(apiItens.map((i) => i.fornecedorId).filter(Boolean))]
    .map(fornecedorNome)
    .join(', ')
  const sugestaoNomes = mercadoAnalisadoFromSugestao(form, operadoras)

  const fin = form.dadosFinanceiros.atual
  const comissaoAtual = [
    fin.comissaoVitalicioContrato.trim()
      ? `Vitalício ${fin.comissaoVitalicioContrato}%`
      : '',
    fin.participacao.mds.trim() ? `MDS ${fin.participacao.mds}%` : '',
    fin.participacao.corretorParceiro.trim()
      ? `Corretor ${fin.participacao.corretorParceiro}%`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    estipulante: condicao?.razaoSocial ?? prospect?.razaoSocial,
    filial: filial?.razaoSocial,
    grupoEconomico: condicao?.grupoEconomico ?? prospect?.grupoEconomico ?? form.grupoEconomico,
    produtos,
    fornecedoresAtuais: fornecedores,
    operadorasSugestao: sugestaoNomes.join(', '),
    operadorasSugestaoNomes: sugestaoNomes,
    tipoContratacao: placement.tiposContratacao.find((t) => t.id === form.tipoContratacaoId)?.nome,
    modalidadeContrato: placement.modalidadesContrato.find((m) => m.id === form.modalidadeContratoId)
      ?.nome,
    prazoVigencia: placement.prazosVigenciaContrato.find((p) => p.id === form.prazoVigenciaContratoId)
      ?.nome,
    breakEven: form.breakEven?.trim() || undefined,
    formularioTipo: labelFormularioTipo(form.formularioTipo) || undefined,
    multaRescisao: formatMultaRescisaoResumo(form) || undefined,
    convencaoColetiva: labelSimNaoChoice(form.possuiConvencaoColetiva) || undefined,
    coparticipacao: form.coparticipacaoDetalhePorPlanos.trim() || undefined,
    comissaoAtual,
    contribuicao: formatContribuicaoKickOff(form),
    reembolso: formatReembolsoKickOffTexto(
      form.reembolsoPorPlano,
      form.planos,
      form.itens,
      opAsOperadora
    ),
    upgradeDowngrade: formatUpgradeDowngradeKickOff(
      form.upgradeDowngradePorPlano,
      form.planos,
      form.itens,
      opAsOperadora
    ),
    projeto: placement.projetos.find((p) => p.id === form.projetoId)?.nome,
    pedido: placement.pedidos.find((p) => p.id === form.pedidoId)?.nome,
    temperatura: placement.temperaturas.find((t) => t.id === form.temperaturaId)?.nome,
    solicitante: form.solicitante,
    analistaCadastro: extras?.analistaCadastroNome,
    analistaResponsavel: extras?.analistaResponsavelNome,
    corretorParceiro: extras?.corretorNome,
    vigenciaApolice: form.vigenciaApolice,
  }
}

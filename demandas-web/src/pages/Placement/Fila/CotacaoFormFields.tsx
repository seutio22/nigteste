import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import BusinessIcon from '@mui/icons-material/Business'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import MapIcon from '@mui/icons-material/Map'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore, type PlacementCondicao, type PlacementNomeCadastro } from '../../../store/placementStore'
import { ProspectFormModal } from '../ProspectFormModal'
import { CondicaoFormModal } from '../CondicaoFormModal'
import { MapeamentoItensSection } from './MapeamentoItensSection'
import { PlanoCoberturasSection } from './PlanoCoberturasSection'
import {
  CoberturasEspeciaisSection,
  EMPTY_COBERTURAS_ESPECIAIS,
} from './CoberturasEspeciaisSection'
import {
  EMPTY_REEMBOLSO_POR_PLANO,
  ReembolsoPlanoSection,
} from './ReembolsoPlanoSection'
import type { CoberturasEspeciais } from './placementCoberturasEspeciais'
import {
  CotacaoFinanceiroSection,
  EMPTY_DADOS_FINANCEIROS,
} from './CotacaoFinanceiroSection'
import type { DadosFinanceirosCotacao } from './placementCotacaoFinanceiro'
import {
  EMPTY_UPGRADE_DOWNGRADE_POR_PLANO,
  UpgradeDowngradeFields,
  type SimNaoChoice,
  type UpgradeDowngradePorPlano,
} from './UpgradeDowngradeFields'
import type { ReembolsoPorPlano } from './placementReembolso'
import { SectionHeader } from './CotacaoFormSections'
import {
  CollapsibleFormSection,
  CotacaoFormNavigationLayout,
  CotacaoFormNavigationProvider,
  listVisibleCotacaoFormSections,
} from './CotacaoFormNavigation'
import { OperadorasSugestaoField } from './OperadorasSugestaoField'
import { SubfaturaModule } from './SubfaturaModule'
import type { SubfaturaDraftItem } from './SubfaturaModule'
import {
  emptyMapeamentoItem,
  reconcilePlanosParaItens,
  resolveClienteIdFromCondicao,
  type MapeamentoItemForm,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import { shouldShowPlanoModuleForCotacao, rowIdsNeedingPlanoForCotacao, type PlacementFormularioTipo } from './placementFormularioContrato'
import { ContratoApoliceExtrasSection } from './ContratoApoliceExtrasSection'
import { onlyDigitsCnpj } from '../../../lib/placementCnpjConsulta'
import { COTACAO_STATUSES, formatCnaeDisplay, getWorkflowStatusDisplayLabel } from './utils'
import { PLACEMENT_STATUS_RASCUNHO } from './placementCotacaoStatus'
import {
  type AberturaSectionKey,
  type CotacaoFormScope,
  showDetalhesBaseSection,
  showDetalhesEmCotacaoSection,
  showMapeamentoSection,
  showObservacoesSection,
  showPlanosCondicoesAbertura,
  showPrazosSection,
  showSubfaturaSection,
} from './placementCotacaoFormScope'
import type { KickOffEstrategia } from './placementKickOffEstrategia'
import { runWhenIdle } from './placementDeferIdle'

/** Compara grupo econômico de forma tolerante (trim, caixa, espaços). */
function grupoEconomicoCompativel(geA: string | null | undefined, geB: string | null | undefined): boolean {
  const norm = (s: string | null | undefined) =>
    String(s ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  const a = norm(geA)
  const b = norm(geB)
  if (!b) return true
  if (!a) return true
  return a === b
}

function formatCnpj14(value: string | null | undefined): string {
  const d = String(value ?? '').replace(/\D/g, '').slice(0, 14)
  if (d.length !== 14) return ''
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

/** Rótulo da condição na lista: CNPJ + CNAE (sem misturar razão social no mesmo campo). */
function labelCondicaoLista(o: PlacementCondicao): string {
  const cnpjFmt = o.cnpj ? formatCnpj14(o.cnpj) : ''
  const cnaeFmt = o.cnae ? `CNAE ${formatCnaeDisplay(o.cnae)}` : ''
  if (cnpjFmt && cnaeFmt) return `${cnpjFmt} · ${cnaeFmt}`
  if (cnpjFmt) return cnpjFmt
  if (cnaeFmt) return cnaeFmt
  return o.razaoSocial || 'Condição'
}

export type ClienteTipo = 'casa' | 'prospect'

export interface CotacaoFormState {
  ticket: string
  status: string
  /** Analista de cadastro (master Analista — abertura do processo). */
  analistaId: string
  /** Analista responsável (Placement → Analista — designado antes de Em cotação). */
  analistaResponsavelId: string
  /** Tipo: 'casa' = cotação com condição Placement (estipulante = razão social da condição); 'prospect' = prospect. */
  clienteTipo: ClienteTipo
  /** Filtro opcional para enxugar a lista de condições (UI). */
  grupoEconomico: string
  /** Opcional — legado; quem vale para o estipulante é a condição vinculada. */
  clienteId: string
  /** Condição Placement (razão social + CNPJ + CNAE) — obrigatória no tipo 'casa'. */
  condicaoId: string
  /** Filial (Dados → Placement → Filial), obrigatória após definir estipulante. */
  filialId: string
  /** Corretor parceiro (Dados → Placement), opcional. */
  corretorParceiroId: string
  /** Projeto (Dados → Placement → Projetos), opcional. */
  projetoId: string
  /** Tipo de pedido/conta (Dados → Placement → Pedido), opcional. */
  pedidoId: string
  /** Solicitante (texto livre). */
  solicitante: string
  /** Temperatura (Dados → Placement), opcional. */
  temperaturaId: string
  prospectId: string
  /** Operadoras sugeridas para consulta na cotação (Dados → Operadoras). */
  operadorasSugestaoIds: string[]
  /** Mapeamento produto × fornecedor atual (operadora). */
  itens: MapeamentoItemForm[]
  /** Planos/coberturas (Saúde/Odontológico) quando aplicável. */
  planos: PlanoCoberturaForm[]
  /** Texto livre quando a coparticipação difere entre planos da cotação. */
  coparticipacaoDetalhePorPlanos: string
  upgradeDowngradePorPlano: UpgradeDowngradePorPlano
  reembolsoPorPlano: ReembolsoPorPlano
  coberturasEspeciais: CoberturasEspeciais
  dadosFinanceiros: DadosFinanceirosCotacao
  dataInicio: string
  dataLimite: string
  descricao: string
  observacoes: string
  /** Vigência da apólice (data). */
  vigenciaApolice: string
  tipoContratacaoId: string
  modalidadeContratoId: string
  prazoVigenciaContratoId: string
  /** Break-even (texto livre). */
  breakEven: string
  /** Tipo de formulário (Saúde, Odontológico, Vida em grupo, Não seguráveis). */
  formularioTipo: PlacementFormularioTipo
  multaRescisaoContratual: SimNaoChoice
  multaRescisaoValor: string
  multaRescisaoRegra: string
  multaRescisaoAvisoPrevio: string
  possuiConvencaoColetiva: SimNaoChoice
  convencaoColetivaDetalhe: string
  /** Subfaturas em rascunho (nova cotação sem `cotacaoId` na API). */
  subfaturasDraft: SubfaturaDraftItem[]
  /** Estratégia alinhada na etapa Kick off. */
  kickOffEstrategia?: KickOffEstrategia | null
}

export const EMPTY_COTACAO_FORM: CotacaoFormState = {
  ticket: '',
  status: 'Aberta',
  analistaId: '',
  analistaResponsavelId: '',
  clienteTipo: 'casa',
  grupoEconomico: '',
  clienteId: '',
  condicaoId: '',
  filialId: '',
  corretorParceiroId: '',
  projetoId: '',
  pedidoId: '',
  solicitante: '',
  temperaturaId: '',
  prospectId: '',
  operadorasSugestaoIds: [],
  itens: [emptyMapeamentoItem()],
  planos: [],
  coparticipacaoDetalhePorPlanos: '',
  upgradeDowngradePorPlano: { ...EMPTY_UPGRADE_DOWNGRADE_POR_PLANO },
  reembolsoPorPlano: { ...EMPTY_REEMBOLSO_POR_PLANO },
  coberturasEspeciais: {
    itens: [...EMPTY_COBERTURAS_ESPECIAIS.itens],
  },
  dadosFinanceiros: {
    atual: {
      ...EMPTY_DADOS_FINANCEIROS.atual,
      participacao: { ...EMPTY_DADOS_FINANCEIROS.atual.participacao },
    },
    estudo: {
      ...EMPTY_DADOS_FINANCEIROS.estudo,
      participacao: { ...EMPTY_DADOS_FINANCEIROS.estudo.participacao },
    },
  },
  dataInicio: new Date().toISOString().split('T')[0],
  dataLimite: '',
  descricao: '',
  observacoes: '',
  vigenciaApolice: '',
  tipoContratacaoId: '',
  modalidadeContratoId: '',
  prazoVigenciaContratoId: '',
  breakEven: '',
  formularioTipo: '',
  multaRescisaoContratual: '',
  multaRescisaoValor: '',
  multaRescisaoRegra: '',
  multaRescisaoAvisoPrevio: '',
  possuiConvencaoColetiva: '',
  convencaoColetivaDetalhe: '',
  subfaturasDraft: [],
  kickOffEstrategia: null,
}

interface Props {
  value: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  errors?: Partial<Record<keyof CotacaoFormState, string>>
  disabled?: boolean
  /** Quando a cotação já existe na API — habilita o módulo Subfatura após «Detalhes da cotação». */
  cotacaoId?: string | null
  /** create: oculta status (definido pelos botões); draft: só rascunho; edit: workflow da fila. */
  formMode?: 'create' | 'draft' | 'edit'
  /** Etapa do workflow — controla campos visíveis (ex.: ocultar estudo na base atual). */
  workflowStageKey?: string
  /** Escopo na página de detalhe: só blocos da etapa atual (`all` = formulário completo, ex. nova cotação). */
  formScope?: CotacaoFormScope
  /** Na aba «Dados da abertura»: exibir só estes blocos (consulta ou edição por seção). */
  aberturaSectionsOnly?: AberturaSectionKey[]
  /** Sem Card externo — o pai renderiza o cabeçalho (ex.: aba dados lançados). */
  embedSections?: boolean
}

function SectionShell({
  embed,
  children,
}: {
  embed?: boolean
  children: React.ReactNode
}) {
  if (embed) return <>{children}</>
  return (
    <Card variant="outlined">
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function CotacaoFormFields({
  value,
  onChange,
  errors,
  disabled,
  cotacaoId,
  formMode = 'edit',
  workflowStageKey = 'base_atual',
  formScope = 'all',
  aberturaSectionsOnly,
  embedSections = false,
}: Props) {
  const workflowForFields =
    formScope === 'dados_abertura' ? 'base_atual' : workflowStageKey
  const { analistas, clientes, operadoras, produtos, isSyncing: masterDataSyncing, syncFromApi: syncMasterData } =
    useMasterDataStore()
  const prospects = usePlacementStore((s) => s.prospects)
  const condicoes = usePlacementStore((s) => s.condicoes)
  const filiais = usePlacementStore((s) => s.filiais)
  const corretoresParceiros = usePlacementStore((s) => s.corretoresParceiros)
  const projetos = usePlacementStore((s) => s.projetos)
  const pedidos = usePlacementStore((s) => s.pedidos)
  const temperaturas = usePlacementStore((s) => s.temperaturas)
  const tiposContratacao = usePlacementStore((s) => s.tiposContratacao)
  const modalidadesContrato = usePlacementStore((s) => s.modalidadesContrato)
  const prazosVigenciaContrato = usePlacementStore((s) => s.prazosVigenciaContrato)
  const filiaisLoading = usePlacementStore((s) => s.isLoading)
  const corretoresLoading = usePlacementStore((s) => s.isLoadingCorretores)
  const projetosPedidosLoading = usePlacementStore((s) => s.isLoadingProjetosPedidos)
  const contratoCatalogosLoading = usePlacementStore((s) => s.isLoadingContratoCatalogos)
  const condicoesLoading = usePlacementStore((s) => s.isLoadingCondicoes)
  const syncProspects = usePlacementStore((s) => s.syncProspects)
  const syncCondicoes = usePlacementStore((s) => s.syncCondicoes)
  const syncFiliais = usePlacementStore((s) => s.syncFiliais)
  const syncCorretoresParceiros = usePlacementStore((s) => s.syncCorretoresParceiros)
  const syncProjetosPedidos = usePlacementStore((s) => s.syncProjetosPedidos)
  const syncPlacementContratoCatalogos = usePlacementStore((s) => s.syncPlacementContratoCatalogos)
  const syncPlanos = usePlacementStore((s) => s.syncPlanos)
  const planosCatalogo = usePlacementStore((s) => s.planos)
  const addProspect = usePlacementStore((s) => s.addProspect)
  const addCondicao = usePlacementStore((s) => s.addCondicao)
  const updateCondicao = usePlacementStore((s) => s.updateCondicao)

  const [openProspectModal, setOpenProspectModal] = useState(false)
  const [openCondicaoModal, setOpenCondicaoModal] = useState(false)
  /** `null` = cadastrar nova; preenchido = editar condição existente (mesmo grupo pode ter vários CNPJs/CNAEs). */
  const [condicaoModalEditing, setCondicaoModalEditing] = useState<PlacementCondicao | null>(null)
  /** Ao criar condição: pré-preencher como estipulante ou como outra empresa do mesmo grupo (CNPJ/razão em branco). */
  const [condicaoModalPreset, setCondicaoModalPreset] = useState<'estipulante' | 'outroEmpresaGrupo'>('estipulante')

  useEffect(() => {
    runWhenIdle(() => {
      syncProspects()
      syncCondicoes()
      syncPlanos()
      syncFiliais(true)
      void syncCorretoresParceiros(true)
      void syncProjetosPedidos(true)
      void syncPlacementContratoCatalogos(true)
      void syncMasterData?.({ entities: ['operadoras', 'produtos'] })
    })
  }, [
    syncProspects,
    syncCondicoes,
    syncPlanos,
    syncFiliais,
    syncCorretoresParceiros,
    syncProjetosPedidos,
    syncPlacementContratoCatalogos,
    syncMasterData,
  ])

  useEffect(() => {
    if (value.clienteTipo !== 'casa' || !value.condicaoId) return
    if (condicoes.some((c) => c.id === value.condicaoId)) return
    syncCondicoes(true)
  }, [value.clienteTipo, value.condicaoId, condicoes, syncCondicoes])

  useEffect(() => {
    if (value.clienteTipo !== 'casa' || (!value.clienteId && !value.condicaoId)) return
    void syncCondicoes(true)
  }, [value.clienteId, value.clienteTipo, value.condicaoId, syncCondicoes])

  function patch(part: Partial<CotacaoFormState>) {
    onChange({ ...value, ...part })
  }

  function patchItens(nextItens: MapeamentoItemForm[]) {
    const show = shouldShowPlanoModuleForCotacao({ ...value, itens: nextItens })
    const ids = rowIdsNeedingPlanoForCotacao({ ...value, itens: nextItens })
    const planosNext = show ? reconcilePlanosParaItens(value.planos, ids) : []
    onChange({ ...value, itens: nextItens, planos: planosNext })
  }

  /** Grupos vindos de Clientes e de Condições Placement (para filtrar sem depender do cadastro Clientes). */
  const grupoOptions = useMemo(() => {
    const set = new Set<string>()
    clientes.forEach((c) => {
      const g = c.grupoEconomico?.trim()
      if (g) set.add(g)
    })
    condicoes.forEach((c) => {
      const g = c.grupoEconomico?.trim()
      if (g) set.add(g)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [clientes, condicoes])

  /** Clientes filtrados pelo grupo econômico escolhido (se houver) — usado só em presets de modal. */
  const clientesFiltrados = useMemo(() => {
    if (!value.grupoEconomico) return clientes
    return clientes.filter((c) => c.grupoEconomico === value.grupoEconomico)
  }, [clientes, value.grupoEconomico])

  const selectedCliente = clientes.find((c) => c.id === value.clienteId) ?? null
  const selectedProspect = prospects.find((p) => p.id === value.prospectId) ?? null
  const selectedCondicao = condicoes.find((c) => c.id === value.condicaoId) ?? null

  const grupoEconomicoEfetivoParaCondicao = useMemo(
    () =>
      value.grupoEconomico?.trim() ||
      selectedCliente?.grupoEconomico?.trim() ||
      selectedCondicao?.grupoEconomico?.trim() ||
      '',
    [value.grupoEconomico, selectedCliente?.grupoEconomico, selectedCondicao?.grupoEconomico]
  )

  const filiaisAtivas = useMemo(() => {
    const ativas = (f: { status?: string }) => {
      const s = String(f.status ?? 'Ativo').toLowerCase()
      return s === 'ativo' || s === 'active' || s === '1'
    }
    return filiais.filter(ativas).sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR'))
  }, [filiais])

  const corretoresOrdenados = useMemo(
    () => [...corretoresParceiros].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [corretoresParceiros]
  )

  const projetosOrdenados = useMemo(
    () => [...projetos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [projetos]
  )

  const pedidosOrdenados = useMemo(
    () => [...pedidos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [pedidos]
  )

  const temperaturasOrdenadas = useMemo(
    () => [...temperaturas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [temperaturas]
  )

  const tiposContratacaoOrdenados = useMemo(
    () => [...tiposContratacao].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [tiposContratacao]
  )
  const modalidadesContratoOrdenadas = useMemo(
    () => [...modalidadesContrato].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [modalidadesContrato]
  )
  const prazosVigenciaOrdenados = useMemo(
    () => [...prazosVigenciaContrato].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [prazosVigenciaContrato]
  )

  const rowIdsPlano = useMemo(
    () => rowIdsNeedingPlanoForCotacao(value),
    [value.formularioTipo, value.itens]
  )
  const planosParaExibir = useMemo(
    () => reconcilePlanosParaItens(value.planos, rowIdsPlano),
    [value.planos, rowIdsPlano]
  )

  useEffect(() => {
    if (!produtos.length) return
    const next = value.itens.map((it) => {
      if (it.produtoId || !it.produtoNome) return it
      const m = produtos.find((p) => p.nome === it.produtoNome)
      if (!m) return it
      return { ...it, produtoId: m.id }
    })
    const unchanged = next.every(
      (it, i) =>
        it.produtoId === value.itens[i]?.produtoId &&
        it.fornecedorId === value.itens[i]?.fornecedorId
    )
    if (unchanged) return
    patch({ itens: next })
  }, [produtos, value.itens])

  useEffect(() => {
    if (!shouldShowPlanoModuleForCotacao(value)) {
      if (value.planos.length > 0) patch({ planos: [] })
      return
    }
    const needed = new Set(rowIdsPlano)
    const orphan = value.planos.some((p) => !needed.has(p.itemRowId))
    const missingRow = rowIdsPlano.some((rowId) => !value.planos.some((p) => p.itemRowId === rowId))
    if (!orphan && !missingRow) return
    patch({ planos: reconcilePlanosParaItens(value.planos, rowIdsPlano) })
  }, [value.itens, value.planos, rowIdsPlano])

  /** Condições: com grupo filtrado restringe ao grupo; sem grupo lista todas. Mantém a condição já vinculada na cotação. */
  const condicoesCompativeis = useMemo(() => {
    const geCli =
      selectedCliente?.grupoEconomico?.trim() ||
      value.grupoEconomico?.trim() ||
      selectedCondicao?.grupoEconomico?.trim() ||
      ''
    const estipulanteCnpj = selectedCliente ? onlyDigitsCnpj(selectedCliente.cnpj ?? '') : ''
    let list: PlacementCondicao[]
    if (!geCli) {
      list = [...condicoes]
    } else {
      list = condicoes.filter((cond) => {
        const condCnpj = cond.cnpj ? onlyDigitsCnpj(cond.cnpj) : ''
        if (estipulanteCnpj.length === 14 && condCnpj === estipulanteCnpj) return true
        return grupoEconomicoCompativel(geCli, cond.grupoEconomico)
      })
    }
    const curId = value.condicaoId
    const cur = curId ? condicoes.find((c) => c.id === curId) : null
    if (cur && !list.some((c) => c.id === cur.id)) {
      list = [...list, cur]
    }
    const dCli = selectedCliente ? onlyDigitsCnpj(selectedCliente.cnpj ?? '') : ''
    const sortKey = (c: PlacementCondicao) =>
      dCli.length === 14 && c.cnpj && onlyDigitsCnpj(c.cnpj) === dCli ? 0 : 1
    return [...list].sort((a, b) => {
      const cmp = sortKey(a) - sortKey(b)
      if (cmp !== 0) return cmp
      return labelCondicaoLista(a).localeCompare(labelCondicaoLista(b), 'pt-BR')
    })
  }, [condicoes, selectedCliente, value.grupoEconomico, value.condicaoId, selectedCondicao?.grupoEconomico])

  const faltaCondicaoPlacement = value.clienteTipo === 'casa' && !selectedCondicao

  /** Auto-preenche o grupo econômico ao escolher um cliente, e limpa a outra ponta ao trocar de tipo. */
  function handleTipoChange(next: ClienteTipo) {
    if (next === value.clienteTipo) return
    patch({
      clienteTipo: next,
      clienteId: next === 'casa' ? value.clienteId : '',
      prospectId: next === 'prospect' ? value.prospectId : '',
      grupoEconomico: next === 'casa' ? value.grupoEconomico : '',
      condicaoId: '',
    })
  }

  async function handleCreateProspect(data: {
    razaoSocial: string
    cnpj: string
    grupoEconomico: string | null
    cnae: string
  }) {
    const created = await addProspect(data)
    patch({ prospectId: created.id })
  }

  async function handleSubmitCondicaoModal(data: {
    grupoEconomico: string | null
    razaoSocial: string
    cnae: string
    cnpj: string | null
  }) {
    if (condicaoModalEditing) {
      const updated = await updateCondicao(condicaoModalEditing.id, data)
      await syncCondicoes(true)
      if (value.condicaoId === condicaoModalEditing.id) {
        const ge = (updated.grupoEconomico ?? '').trim()
        patch({ grupoEconomico: ge || value.grupoEconomico })
      }
    } else {
      const created = await addCondicao(data)
      await syncCondicoes(true)
      const ge = (created.grupoEconomico ?? '').trim()
      patch({
        condicaoId: created.id,
        grupoEconomico: ge || value.grupoEconomico,
        clienteId: resolveClienteIdFromCondicao(created, clientes) || value.clienteId,
      })
    }
    setCondicaoModalEditing(null)
  }

  const navigationEnabled = !embedSections
  const visibleSectionIds = useMemo(
    () => listVisibleCotacaoFormSections(formScope, aberturaSectionsOnly),
    [formScope, aberturaSectionsOnly]
  )
  const formNavigationActive = navigationEnabled && visibleSectionIds.length > 1
  const sectionEmbed = embedSections || formNavigationActive
  const showSectionHeader = !formNavigationActive && !embedSections

  const formBody = (
    <Stack gap={3}>
      {showPrazosSection(formScope, aberturaSectionsOnly) && (
      <CollapsibleFormSection
        id="solicitacao_estudo"
        title="Solicitação de Estudo"
        icon={<CalendarMonthIcon fontSize="small" />}
        navigationEnabled={formNavigationActive}
      >
      <SectionShell embed={sectionEmbed}>
          {showSectionHeader && (
            <SectionHeader
              icon={<CalendarMonthIcon fontSize="small" />}
              title="Solicitação de Estudo"
            />
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Nº da cotação (ticket)"
                fullWidth
                placeholder="Gerado automaticamente"
                value={value.ticket}
                disabled={disabled}
                onChange={(e) => patch({ ticket: e.target.value })}
              />
            </Grid>

            {formMode !== 'create' && (
              <Grid item xs={12} md={4}>
                <TextField
                  label="Status"
                  select
                  fullWidth
                  required
                  value={value.status}
                  disabled={disabled || formMode === 'draft'}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  {formMode === 'draft' ? (
                    <MenuItem value={PLACEMENT_STATUS_RASCUNHO}>{PLACEMENT_STATUS_RASCUNHO}</MenuItem>
                  ) : (
                    COTACAO_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {getWorkflowStatusDisplayLabel(s)}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <Autocomplete
                options={analistas}
                getOptionLabel={(o) => o.nome}
                value={analistas.find((a) => a.id === value.analistaId) ?? null}
                disabled={
                  disabled ||
                  (formMode === 'edit' && formScope !== 'all' && workflowStageKey !== 'base_atual')
                }
                onChange={(_, opt) => patch({ analistaId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderInput={(params) => (
                  <TextField {...params} label="Analista de cadastro" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Data de início"
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={value.dataInicio}
                disabled={disabled}
                onChange={(e) => patch({ dataInicio: e.target.value })}
                error={!!errors?.dataInicio}
                helperText={errors?.dataInicio}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Data limite"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={value.dataLimite}
                disabled={disabled}
                onChange={(e) => patch({ dataLimite: e.target.value })}
                error={!!errors?.dataLimite}
                helperText={errors?.dataLimite}
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Autocomplete
                options={projetosOrdenados}
                loading={projetosPedidosLoading}
                getOptionLabel={(o) => o.nome}
                value={projetosOrdenados.find((p) => p.id === value.projetoId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ projetoId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhum projeto cadastrado. Cadastre em Dados → Placement → Projetos."
                renderInput={(params) => (
                  <TextField {...params} label="Projeto" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Autocomplete
                options={pedidosOrdenados}
                loading={projetosPedidosLoading}
                getOptionLabel={(o) => o.nome}
                value={pedidosOrdenados.find((p) => p.id === value.pedidoId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ pedidoId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhum tipo cadastrado. Cadastre em Dados → Placement → Pedido/conta."
                renderInput={(params) => (
                  <TextField {...params} label="Tipo de pedido/conta" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <TextField
                label="Solicitante"
                fullWidth
                value={value.solicitante}
                disabled={disabled}
                onChange={(e) => patch({ solicitante: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Autocomplete
                options={temperaturasOrdenadas}
                loading={projetosPedidosLoading}
                getOptionLabel={(o) => o.nome}
                value={temperaturasOrdenadas.find((t) => t.id === value.temperaturaId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ temperaturaId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhuma temperatura cadastrada. Cadastre em Dados → Placement → Temperatura."
                renderInput={(params) => (
                  <TextField {...params} label="Temperatura" />
                )}
              />
            </Grid>
          </Grid>
      </SectionShell>
      </CollapsibleFormSection>
      )}

      {showMapeamentoSection(formScope, aberturaSectionsOnly) && (
      <CollapsibleFormSection
        id="mapeamento"
        title="Mapeamento"
        icon={<MapIcon fontSize="small" />}
        navigationEnabled={formNavigationActive}
      >
      <SectionShell embed={sectionEmbed}>
          {showSectionHeader && (
            <SectionHeader
              icon={<MapIcon fontSize="small" />}
              title="Mapeamento"
            />
          )}

          <ToggleButtonGroup
            exclusive
            value={value.clienteTipo}
            onChange={(_, next: ClienteTipo | null) => next && handleTipoChange(next)}
            disabled={disabled}
            sx={{ mb: 2 }}
            size="small"
            color="primary"
          >
            <ToggleButton value="casa">
              <BusinessIcon fontSize="small" sx={{ mr: 0.75 }} />
              Cliente da Carteira
            </ToggleButton>
            <ToggleButton value="prospect">
              <PersonSearchIcon fontSize="small" sx={{ mr: 0.75 }} />
              Prospect
            </ToggleButton>
          </ToggleButtonGroup>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Filial e corretor parceiro
                </Typography>
                <Chip label="Filial obrigatória ao salvar" size="small" color="warning" variant="outlined" />
                <Tooltip title="Atualizar filiais e corretores (Dados → Placement)">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => {
                        void syncFiliais(true)
                        void syncCorretoresParceiros(true)
                      }}
                      disabled={disabled || filiaisLoading || corretoresLoading}
                      aria-label="Recarregar filiais e corretores"
                    >
                      {filiaisLoading || corretoresLoading ? (
                        <CircularProgress size={18} />
                      ) : (
                        <RefreshIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Campos independentes de Cliente da Carteira ou Prospect. Filial: Dados → Placement → Filial. Corretor:
                Dados → Placement → Corretor parceiro.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={filiaisAtivas}
                loading={filiaisLoading}
                getOptionLabel={(f) => `${f.razaoSocial} · CNPJ ${formatCnpj(f.cnpj)}`}
                value={filiaisAtivas.find((f) => f.id === value.filialId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ filialId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhuma filial ativa. Cadastre em Dados → Placement → Filial e use o botão de atualizar."
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filial"
                    required
                    error={!!errors?.filialId}
                    helperText={errors?.filialId}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={corretoresOrdenados}
                loading={corretoresLoading}
                getOptionLabel={(c) => c.nome}
                value={corretoresOrdenados.find((c) => c.id === value.corretorParceiroId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ corretorParceiroId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhum corretor cadastrado. Cadastre em Dados → Placement → Corretor parceiro."
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Corretor parceiro"
                    placeholder="Opcional"
                  />
                )}
              />
            </Grid>

            {value.clienteTipo === 'casa' ? (
              <>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={grupoOptions}
                  value={value.grupoEconomico || null}
                  disabled={disabled}
                  onChange={(_, val) => {
                    const grupo = String(val ?? '')
                    patch({
                      grupoEconomico: grupo,
                      clienteId: '',
                      condicaoId: '',
                    })
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Grupo econômico"
                      placeholder={
                        grupoOptions.length
                          ? 'Selecione um grupo (opcional)'
                          : 'Nenhum grupo cadastrado'
                      }
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Estipulante da operação
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  options={condicoesCompativeis}
                  loading={condicoesLoading}
                  getOptionLabel={(o) => labelCondicaoLista(o)}
                  value={selectedCondicao}
                  disabled={disabled}
                  onChange={(_, opt) => {
                    if (!opt) {
                      patch({ condicaoId: '', clienteId: '' })
                      return
                    }
                    const geCond = (opt.grupoEconomico ?? '').trim()
                    const clienteMatch = resolveClienteIdFromCondicao(opt, clientes)
                    patch({
                      condicaoId: opt.id,
                      grupoEconomico: geCond || value.grupoEconomico,
                      clienteId: clienteMatch || value.clienteId,
                    })
                  }}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="CNPJ/CNAE de Estudo"
                      required
                      placeholder="Busque por CNPJ ou CNAE na lista"
                      error={!!errors?.condicaoId}
                      helperText={errors?.condicaoId}
                    />
                  )}
                />
              </Grid>

              {selectedCondicao && (
                <Grid item xs={12}>
                  <Box
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      px: 2,
                      py: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Razão social do estipulante
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.75 }}>
                      {selectedCondicao.razaoSocial}
                    </Typography>
                    <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap" alignItems="center">
                      {selectedCondicao.cnpj && (
                        <Chip
                          label={formatCnpj14(selectedCondicao.cnpj)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={`CNAE ${formatCnaeDisplay(selectedCondicao.cnae)}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {selectedCondicao.grupoEconomico && (
                        <Chip label={selectedCondicao.grupoEconomico} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </Grid>
              )}

              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setCondicaoModalPreset('estipulante')
                      setCondicaoModalEditing(null)
                      setOpenCondicaoModal(true)
                    }}
                    disabled={disabled}
                    sx={{ minHeight: 44 }}
                  >
                    CADASTRO CNPJ
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => {
                      if (!selectedCondicao) return
                      setCondicaoModalPreset('estipulante')
                      setCondicaoModalEditing(selectedCondicao)
                      setOpenCondicaoModal(true)
                    }}
                    disabled={disabled || !selectedCondicao}
                    sx={{ minHeight: 44 }}
                  >
                    Editar condição
                  </Button>
                  <Tooltip
                    title={
                      grupoEconomicoEfetivoParaCondicao
                        ? 'Cadastro com o grupo preenchido; informe outro CNPJ, razão social e CNAE.'
                        : 'Defina o grupo econômico (filtro) para amarrar a nova condição ao grupo.'
                    }
                  >
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<GroupAddIcon />}
                        onClick={() => {
                          setCondicaoModalPreset('outroEmpresaGrupo')
                          setCondicaoModalEditing(null)
                          setOpenCondicaoModal(true)
                        }}
                        disabled={disabled || !grupoEconomicoEfetivoParaCondicao}
                        sx={{ minHeight: 44 }}
                      >
                        Outro CNPJ do grupo
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Grid>

              {faltaCondicaoPlacement && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    Selecione uma <strong>condição Placement</strong> (obrigatório para salvar). Cadastre ou ajuste em{' '}
                    <strong>Dados → Placement → Condições</strong> ou use «CADASTRO CNPJ».
                  </Alert>
                </Grid>
              )}
            </>
            ) : (
              <>
              <Grid item xs={12} md={8}>
                <Autocomplete
                  options={prospects}
                  getOptionLabel={(o) =>
                    o.grupoEconomico ? `${o.razaoSocial} · ${o.grupoEconomico}` : o.razaoSocial
                  }
                  value={selectedProspect}
                  disabled={disabled}
                  onChange={(_, opt) => patch({ prospectId: opt?.id ?? '' })}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Prospect"
                      required
                      placeholder={
                        prospects.length
                          ? 'Selecione um prospect cadastrado'
                          : 'Nenhum prospect — cadastre o primeiro pelo botão ao lado'
                      }
                      error={!!errors?.prospectId}
                      helperText={errors?.prospectId}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenProspectModal(true)}
                  disabled={disabled}
                  fullWidth
                  sx={{ height: 56 }}
                >
                  Novo prospect
                </Button>
              </Grid>

              {selectedProspect && (
                <>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        p: 1.5,
                        border: '1px dashed',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Prospect selecionado
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {selectedProspect.razaoSocial}
                      </Typography>
                      <Stack direction="row" gap={1} sx={{ mt: 0.5 }}>
                        {selectedProspect.grupoEconomico && (
                          <Chip
                            label={`Grupo: ${selectedProspect.grupoEconomico}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={`CNPJ: ${formatCnpj(selectedProspect.cnpj)}`}
                          size="small"
                          variant="outlined"
                        />
                        {selectedProspect.cnae && (
                          <Chip
                            label={`CNAE: ${formatCnaeDisplay(selectedProspect.cnae)}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                </>
              )}
              </>
            )}

          </Grid>
      </SectionShell>
      </CollapsibleFormSection>
      )}

      {showDetalhesBaseSection(formScope, aberturaSectionsOnly) && (
      <CollapsibleFormSection
        id="condicoes_contratuais"
        title="Condições Contratuais"
        icon={<Typography sx={{ fontWeight: 700 }}>i</Typography>}
        navigationEnabled={formNavigationActive}
      >
      <SectionShell embed={sectionEmbed}>
          {showSectionHeader && (
            <SectionHeader
              icon={<Typography sx={{ fontWeight: 700 }}>i</Typography>}
              title="Condições Contratuais"
            />
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Contrato e apólice
                </Typography>
                <Tooltip title="Atualizar tipos, modalidades e prazos (Dados → Placement)">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => void syncPlacementContratoCatalogos(true)}
                      disabled={disabled || contratoCatalogosLoading}
                      aria-label="Atualizar catálogos de contrato"
                    >
                      {contratoCatalogosLoading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Início de vigência"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={value.vigenciaApolice}
                disabled={disabled}
                onChange={(e) => patch({ vigenciaApolice: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={tiposContratacaoOrdenados}
                loading={contratoCatalogosLoading}
                getOptionLabel={(o: PlacementNomeCadastro) => o.nome}
                value={tiposContratacaoOrdenados.find((o) => o.id === value.tipoContratacaoId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ tipoContratacaoId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhum tipo cadastrado. Cadastre em Dados → Placement → Tipo contratação."
                renderInput={(params) => (
                  <TextField {...params} label="Tipo de contratação" placeholder="Opcional" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={modalidadesContratoOrdenadas}
                loading={contratoCatalogosLoading}
                getOptionLabel={(o: PlacementNomeCadastro) => o.nome}
                value={modalidadesContratoOrdenadas.find((o) => o.id === value.modalidadeContratoId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ modalidadeContratoId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhuma modalidade cadastrada. Cadastre em Dados → Placement → Modalidade contrato."
                renderInput={(params) => (
                  <TextField {...params} label="Modalidade de contrato" placeholder="Opcional" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={prazosVigenciaOrdenados}
                loading={contratoCatalogosLoading}
                getOptionLabel={(o: PlacementNomeCadastro) => o.nome}
                value={prazosVigenciaOrdenados.find((o) => o.id === value.prazoVigenciaContratoId) ?? null}
                disabled={disabled}
                onChange={(_, opt) => patch({ prazoVigenciaContratoId: opt?.id ?? '' })}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                noOptionsText="Nenhuma opção cadastrada. Cadastre em Dados → Placement → Duração contratual."
                renderInput={(params) => (
                  <TextField {...params} label="Duração Contratual" placeholder="Opcional" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Break-even"
                fullWidth
                value={value.breakEven}
                disabled={disabled}
                onChange={(e) => patch({ breakEven: e.target.value })}
                placeholder="Ex.: 80%"
                inputProps={{ maxLength: 12 }}
              />
            </Grid>

            <ContratoApoliceExtrasSection
              value={{
                multaRescisaoContratual: value.multaRescisaoContratual,
                multaRescisaoValor: value.multaRescisaoValor,
                multaRescisaoRegra: value.multaRescisaoRegra,
                multaRescisaoAvisoPrevio: value.multaRescisaoAvisoPrevio,
                possuiConvencaoColetiva: value.possuiConvencaoColetiva,
                convencaoColetivaDetalhe: value.convencaoColetivaDetalhe,
              }}
              disabled={disabled}
              onChange={(part) => patch(part)}
            />

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 1, fontWeight: 600 }}>
                Mapeamento de itens (
                {value.formularioTipo === 'saude' ? 'categoria + fornecedor atual' : 'produto + fornecedor atual'})
              </Typography>
              <MapeamentoItensSection
                itens={value.itens}
                onChangeItens={patchItens}
                produtos={produtos}
                operadoras={operadoras}
                planosCatalogo={planosCatalogo}
                formularioTipo={value.formularioTipo}
                disabled={disabled}
                operadorasLoading={masterDataSyncing && operadoras.length === 0}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            <Grid item xs={12}>
              <CotacaoFinanceiroSection
                value={value.dadosFinanceiros}
                clienteTipo={value.clienteTipo}
                temCorretorParceiro={!!value.corretorParceiroId?.trim()}
                disabled={disabled}
                workflowStageKey={workflowForFields}
                onChange={(next) => patch({ dadosFinanceiros: next })}
              />
            </Grid>

            {shouldShowPlanoModuleForCotacao(value) && (
              <Grid item xs={12}>
                <PlanoCoberturasSection
                  embedded
                  itens={value.itens}
                  operadoras={operadoras}
                  planos={planosParaExibir}
                  onChangePlanos={(next) => patch({ planos: next })}
                  coparticipacaoDetalhePorPlanos={value.coparticipacaoDetalhePorPlanos}
                  onChangeCoparticipacaoDetalhePorPlanos={(next) =>
                    patch({ coparticipacaoDetalhePorPlanos: next })
                  }
                  disabled={disabled}
                  formularioTipo={value.formularioTipo}
                  planosCatalogo={planosCatalogo}
                />
              </Grid>
            )}

            {shouldShowPlanoModuleForCotacao(value) && showPlanosCondicoesAbertura(formScope) && (
              <>
                <Grid item xs={12}>
                  <UpgradeDowngradeFields
                    planos={planosParaExibir}
                    itens={value.itens}
                    operadoras={operadoras}
                    value={value.upgradeDowngradePorPlano}
                    disabled={disabled}
                    onChange={(next) => patch({ upgradeDowngradePorPlano: next })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <ReembolsoPlanoSection
                    planos={planosParaExibir}
                    itens={value.itens}
                    operadoras={operadoras}
                    value={value.reembolsoPorPlano}
                    disabled={disabled}
                    onChange={(next) => patch({ reembolsoPorPlano: next })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <CoberturasEspeciaisSection
                    planos={planosParaExibir}
                    itens={value.itens}
                    operadoras={operadoras}
                    value={value.coberturasEspeciais}
                    disabled={disabled}
                    onChange={(next) => patch({ coberturasEspeciais: next })}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descrição"
                fullWidth
                multiline
                minRows={2}
                value={value.descricao}
                disabled={disabled}
                onChange={(e) => patch({ descricao: e.target.value })}
              />
            </Grid>
          </Grid>
      </SectionShell>
      </CollapsibleFormSection>
      )}

      {showDetalhesEmCotacaoSection(formScope, aberturaSectionsOnly) && (
      <CollapsibleFormSection
        id="cenario_estudo"
        title="Cenário de estudo — Solicitação Mercado"
        icon={<Typography sx={{ fontWeight: 700 }}>i</Typography>}
        navigationEnabled={formNavigationActive}
      >
      {formNavigationActive ? (
          <Grid container spacing={2}>
            {formScope !== 'dados_abertura' && (
              <Grid item xs={12}>
                <CotacaoFinanceiroSection
                  value={value.dadosFinanceiros}
                  clienteTipo={value.clienteTipo}
                  temCorretorParceiro={!!value.corretorParceiroId?.trim()}
                  disabled={disabled}
                  workflowStageKey="em_cotacao"
                  onChange={(next) => patch({ dadosFinanceiros: next })}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <OperadorasSugestaoField
                operadoras={operadoras}
                selectedIds={value.operadorasSugestaoIds}
                disabled={disabled}
                onChange={(operadorasSugestaoIds) => patch({ operadorasSugestaoIds })}
              />
            </Grid>
          </Grid>
      ) : (
      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<Typography sx={{ fontWeight: 700 }}>i</Typography>}
            title="Cenário de estudo — Solicitação Mercado"
          />

          <Grid container spacing={2}>
            {formScope !== 'dados_abertura' && (
              <Grid item xs={12}>
                <CotacaoFinanceiroSection
                  value={value.dadosFinanceiros}
                  clienteTipo={value.clienteTipo}
                  temCorretorParceiro={!!value.corretorParceiroId?.trim()}
                  disabled={disabled}
                  workflowStageKey="em_cotacao"
                  onChange={(next) => patch({ dadosFinanceiros: next })}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <OperadorasSugestaoField
                operadoras={operadoras}
                selectedIds={value.operadorasSugestaoIds}
                disabled={disabled}
                onChange={(operadorasSugestaoIds) => patch({ operadorasSugestaoIds })}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      )}
      </CollapsibleFormSection>
      )}

      {showSubfaturaSection(formScope, aberturaSectionsOnly) && (
      <CollapsibleFormSection
        id="subfaturas"
        title="Subfaturas"
        navigationEnabled={formNavigationActive}
      >
      <SubfaturaModule
        cotacaoId={cotacaoId ?? null}
        draftItems={value.subfaturasDraft}
        onDraftItemsChange={(subfaturasDraft) => patch({ subfaturasDraft })}
        disabled={disabled}
        embedded={embedSections || formNavigationActive}
      />
      </CollapsibleFormSection>
      )}

      {showObservacoesSection(formScope, aberturaSectionsOnly) && (
      <CollapsibleFormSection
        id="observacoes"
        title="Observações"
        navigationEnabled={formNavigationActive}
      >
      <SectionShell embed={sectionEmbed}>
          {showSectionHeader && (
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Observações
            </Typography>
          )}
          <TextField
            label="Observações"
            fullWidth
            multiline
            minRows={3}
            value={value.observacoes}
            disabled={disabled}
            onChange={(e) => patch({ observacoes: e.target.value })}
            placeholder="Opcional"
          />
      </SectionShell>
      </CollapsibleFormSection>
      )}

      <ProspectFormModal
        open={openProspectModal}
        onClose={() => setOpenProspectModal(false)}
        editingItem={null}
        suggestGrupoEconomico={false}
        onSubmit={handleCreateProspect}
      />

      <CondicaoFormModal
        open={openCondicaoModal}
        onClose={() => {
          setOpenCondicaoModal(false)
          setCondicaoModalEditing(null)
          setCondicaoModalPreset('estipulante')
        }}
        editingItem={condicaoModalEditing}
        defaultGrupoEconomico={
          condicaoModalPreset === 'outroEmpresaGrupo'
            ? grupoEconomicoEfetivoParaCondicao || null
            : (selectedCondicao?.grupoEconomico ??
                selectedCliente?.grupoEconomico ??
                grupoEconomicoEfetivoParaCondicao) || null
        }
        defaultRazaoSocial={
          condicaoModalPreset === 'outroEmpresaGrupo'
            ? null
            : selectedCondicao?.razaoSocial ?? selectedCliente?.nome ?? null
        }
        defaultCnpj={
          condicaoModalPreset === 'outroEmpresaGrupo' ? null : selectedCondicao?.cnpj ?? selectedCliente?.cnpj ?? null
        }
        onSubmit={handleSubmitCondicaoModal}
      />
    </Stack>
  )

  if (!formNavigationActive) {
    return formBody
  }

  return (
    <CotacaoFormNavigationProvider sectionIds={visibleSectionIds}>
      <CotacaoFormNavigationLayout>{formBody}</CotacaoFormNavigationLayout>
    </CotacaoFormNavigationProvider>
  )
}

function formatCnpj(value: string): string {
  const d = (value || '').replace(/\D+/g, '').slice(0, 14)
  if (d.length !== 14) return value || ''
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

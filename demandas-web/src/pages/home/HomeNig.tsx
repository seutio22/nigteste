import React, { useEffect, useMemo, useState, memo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useDemandStore } from '../../store/demandStore'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useValidationStore } from '../../store/validationStore'
import { useReajusteStore } from '../../store/reajusteStore'
import { useManutencaoStore } from '../../store/manutencaoStore'
import { useReportStore } from '../../store/reportStore'
import { useMaillingStore } from '../../store/maillingStore'
import { useProjectStore } from '../../store/projectStore'
import {
  isItemConcluido,
  isItemAbertoParaPendenciasUsuario,
  isItemPendente,
  isItemConcluidoProducao
} from '../../types/dashboardIndicators'
import {
  getDataReferenciaConclusao,
  getItemDateForPage,
  parseDateForFilter,
  matchesByIdOrName
} from '../../utils/dashboardFilters'
import { 
  Plus, 
  CheckCircle, 
  TrendingUp, 
  BarChart3, 
  FileText, 
  Mail, 
  Settings,
  Bell,
  Clock,
  Star,
  Wrench,
  Inbox,
  ArrowRight,
  ChevronRight,
  LayoutDashboard,
  LayoutGrid,
  FolderOpen,
  Zap,
  Loader2,
  type LucideIcon
} from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { getDismissedAlertIds } from '../../utils/dismissedAlerts'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import { getUserPermissions, checkPermission } from '../../utils/defaultPermissions'
import type { SystemPermissions, ModulePermission } from '../../types/permissions'
import type { Project } from '../../types/project'
import type { MaillingContact } from '../../types/mailling'
import { getUserDepartmentDisplay } from '../../utils/userDepartmentDisplay'

const normalizeTextHome = (value?: string) => (value || '').trim().toLowerCase()

/** Catálogo de atalhos; exige `view` no módulo e a ação específica (ex.: `create` para "Nova …"). */
const QUICK_ACTION_DEFS: Array<{
  id: string
  title: string
  subtitle: string
  path: string
  icon: LucideIcon
  module: keyof SystemPermissions
  action: keyof ModulePermission
}> = [
  { id: 'nova-demanda', title: 'Nova demanda', subtitle: 'Registrar solicitação', path: '/cadastro/nova', icon: Plus, module: 'cadastro', action: 'create' },
  { id: 'novo-atendimento', title: 'Novo atendimento', subtitle: 'Abrir chamado', path: '/atendimento/nova', icon: FileText, module: 'atendimento', action: 'create' },
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Indicadores e visão geral', path: '/dashboard', icon: LayoutDashboard, module: 'dashboard', action: 'view' },
  { id: 'kanban', title: 'Kanban', subtitle: 'Quadro de trabalho', path: '/kanban', icon: LayoutGrid, module: 'kanban', action: 'view' },
  { id: 'validacao', title: 'Validações', subtitle: 'Fila e aprovações', path: '/validacao', icon: CheckCircle, module: 'validacao', action: 'view' },
  { id: 'manutencao', title: 'Manutenções', subtitle: 'Chamados de manutenção', path: '/manutencao', icon: Wrench, module: 'manutencao', action: 'view' },
  { id: 'reajuste', title: 'Reajustes', subtitle: 'Lançamentos e preços', path: '/reajuste', icon: TrendingUp, module: 'reajuste', action: 'view' },
  { id: 'analytics', title: 'Analytics', subtitle: 'Relatórios analíticos', path: '/analytics', icon: BarChart3, module: 'analytics', action: 'view' },
  { id: 'mailling', title: 'Mailling', subtitle: 'Contatos e disparos', path: '/mailling', icon: Mail, module: 'mailling', action: 'view' },
  { id: 'projetos', title: 'Projetos', subtitle: 'Gestão de projetos', path: '/projetos', icon: FolderOpen, module: 'projetos', action: 'view' },
  /** Só com permissão de ver usuários — a rota é /admin/usuarios (não confundir com configurações). */
  { id: 'admin', title: 'Administração', subtitle: 'Usuários e permissões', path: '/admin/usuarios', icon: Settings, module: 'usuarios', action: 'view' }
]

export default function HomeNigPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const areasById = useMasterDataStore((s) => s.areasById)
  const demandStore = useDemandStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const manutencaoStore = useManutencaoStore()
  const reportStore = useReportStore()
  const masterDataStore = useMasterDataStore()
  const maillingStore = useMaillingStore()
  const projectStore = useProjectStore()
  const { notifications, dismissedKeys } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(true)

  /** Referências estáveis — evita re-disparar o sync da Home quando `items` dos stores mudam. */
  const syncMasterDataFn = useMasterDataStore((s) => s.syncFromApi)
  const syncDemandFn = useDemandStore((s) => s.syncFromApi)
  const syncAtendimentoFn = useAtendimentoStore((s) => s.syncFromApi)
  const syncValidationFn = useValidationStore((s) => s.syncFromApi)
  const syncReajusteFn = useReajusteStore((s) => s.syncFromApi)
  const syncManutencaoFn = useManutencaoStore((s) => s.syncFromApi)
  const syncReportFn = useReportStore((s) => s.syncFromApi)
  const syncMaillingFn = useMaillingStore((s) => s.syncFromApi)
  const syncProjectFn = useProjectStore((s) => s.syncFromApi)

  const userPerms = useMemo(
    () => getUserPermissions(user?.permissions, user?.role || ''),
    [user?.permissions, user?.role]
  )
  const isAdminUser = (user?.role || '').toLowerCase() === 'admin'

  /** Vínculo ao usuário: ids + nome do analista (igual ao uso nas listas de cadastro). */
  const isOwnedByUser = useCallback((item: any, userId?: string | null, userName?: string | null) => {
    if (!userId) return false
    if (item.userId === userId) return true
    if (item.analistaId === userId) return true
    if ((item as any).responsavelAnalista === userId) return true
    // Alguns módulos usam `responsavelAnalista` como NOME (string) e não como id.
    const nomeUser = (userName || '').toString().trim()
    if (nomeUser && typeof (item as any).responsavelAnalista === 'string') {
      const ra = String((item as any).responsavelAnalista || '').trim()
      if (ra && ra.toLowerCase() === nomeUser.toLowerCase()) return true
    }
    if (item.analistaObj?.id === userId) return true
    // Alguns endpoints retornam `analista` como objeto (ex.: { id, nome }).
    if (item.analista && typeof item.analista === 'object') {
      if (item.analista.id === userId) return true
      const nomeAnalista = (item.analista.nome || item.analista.name || '').toString().trim()
      if (nomeAnalista && nomeUser && nomeAnalista.toLowerCase() === nomeUser.toLowerCase()) return true
    }
    const nome = userName?.trim()
    if (nome && item.analista && String(item.analista).trim().toLowerCase() === nome.toLowerCase()) return true
    return false
  }, [])

  /** Mesmo critério do Dashboard: analista vinculado ao cadastro (email/nome). */
  const restrictAnalistaFilter =
    user?.role === 'gerente' || user?.role === 'analista' || Boolean(user?.viewOwnDataOnly)

  const linkedAnalistaId = useMemo(() => {
    if (!restrictAnalistaFilter || !user) return ''
    const analistas = masterDataStore.analistas
    if (!analistas?.length) return ''
    const emailNorm = (user.email || '').trim().toLowerCase()
    const nameNorm = normalizeTextHome(user.name || '')
    const found = analistas.find((a) => {
      const aEmail = (a.email || '').trim().toLowerCase()
      const aNome = (a.nome || '').trim()
      if (emailNorm && aEmail && aEmail === emailNorm) return true
      if (nameNorm && aNome && normalizeTextHome(aNome) === nameNorm) return true
      if (nameNorm && aNome && normalizeTextHome(aNome).includes(nameNorm)) return true
      if (nameNorm && aNome && nameNorm.includes(normalizeTextHome(aNome))) return true
      return false
    })
    return found?.id ?? ''
  }, [restrictAnalistaFilter, user?.id, user?.email, user?.name, masterDataStore.analistas])

  const getAnalistaValueForProducao = useCallback((page: string, item: any) => {
    if (page === 'reajustes') return item.responsavelAnalista
    if (page === 'manutencoes') return item.analistaId || item.analista
    if (page === 'validacoes') {
      return (
        item.analistaId ||
        item.analistaObj?.id ||
        (typeof item.analista === 'object' ? item.analista?.id : item.analista)
      )
    }
    return item.analistaId || item.analista
  }, [])

  /** Data de conclusão no dia/semana civil local (evita YYYY-MM-DD virar “dia anterior” em UTC). */
  const isProducaoDateInHomePeriod = useCallback((iso: string | undefined, period: 'hoje' | 'semana') => {
    if (!iso) return false
    const itemDate = parseDateForFilter(iso)
    if (!itemDate || isNaN(itemDate.getTime())) return false
    const now = new Date()
    if (period === 'hoje') {
      return (
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getDate() === now.getDate()
      )
    }
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const ws = new Date(now.getFullYear(), now.getMonth(), diff)
    ws.setHours(0, 0, 0, 0)
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    we.setHours(23, 59, 59, 999)
    const t = itemDate.getTime()
    return t >= ws.getTime() && t <= we.getTime()
  }, [])

  const itemContaParaProducaoUsuario = useCallback(
    (page: string, item: any) => {
      if (isOwnedByUser(item, user?.id, user?.name)) return true
      if (linkedAnalistaId && masterDataStore.analistas?.length) {
        return matchesByIdOrName(
          getAnalistaValueForProducao(page, item),
          linkedAnalistaId,
          masterDataStore.analistas
        )
      }
      return false
    },
    [user?.id, user?.name, isOwnedByUser, linkedAnalistaId, masterDataStore.analistas, getAnalistaValueForProducao]
  )

  /** Itens que entram nos totais da Home para não-admin (dono / analista vinculado ao login). */
  const itemVinculadoAoResumo = useCallback(
    (page: string, item: any) => {
      if (isOwnedByUser(item, user?.id, user?.name)) return true
      if (linkedAnalistaId && masterDataStore.analistas?.length) {
        return matchesByIdOrName(
          getAnalistaValueForProducao(page, item),
          linkedAnalistaId,
          masterDataStore.analistas
        )
      }
      return false
    },
    [user?.id, user?.name, isOwnedByUser, linkedAnalistaId, masterDataStore.analistas, getAnalistaValueForProducao]
  )

  const projetoVinculadoAoUsuario = useCallback(
    (p: Project) => {
      if (!user?.id) return false
      const uid = user.id
      if (p.ownerId === uid || p.managerId === uid) return true
      if (p.isOwner || p.isManager || p.isMember) return true
      if (Array.isArray(p.team) && p.team.includes(uid)) return true
      if (p.manager === uid) return true
      return false
    },
    [user?.id]
  )

  // Caixa de entrada: notificações visíveis (respeitando dispensados) para resumo na Home
  const inboxSummary = useMemo(() => {
    const contentKey = (n: { titulo?: string; mensagem?: string; dataCriacao?: string }) =>
      `content:${(n.titulo ?? '').trim().slice(0, 200)}|${(n.mensagem ?? '').trim().slice(0, 500)}|${(n.dataCriacao ?? '').trim().slice(0, 19)}`
    const dismissedIdsSet = new Set(getDismissedAlertIds().map((id) => String(id).trim()).filter(Boolean))
    const now = new Date()
    const visible = notifications
      .filter((n) => !n.snoozedUntil || new Date(n.snoozedUntil) <= now)
      .filter((n) => {
        const alertaId = n.dados?.alertaId != null ? String(n.dados.alertaId).trim() : ''
        if (alertaId && dismissedIdsSet.has(alertaId)) return false
        const key = n.dados?.alertaId ?? n.dados?.dedupeKey
        if (key && dismissedKeys?.includes(key)) return false
        if (dismissedKeys?.includes(contentKey(n))) return false
        return true
      })
    const unread = visible.filter((n) => !n.lida).length
    const preview = visible.slice(0, 2)
    return { total: visible.length, unread, preview }
  }, [notifications, dismissedKeys])

  const formatTimeAgo = useCallback((dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes} min`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }, [])

  const [periodHome, setPeriodHome] = useState<'hoje' | 'semana'>('hoje')

  /** Mesma regra do Dashboard: max(data fim operacional, updatedAt), com fallback em createdAt. */
  const getDataProducao = (page: string, item: any): string | undefined =>
    getDataReferenciaConclusao(page, item)

  /**
   * Produção do usuário no período: chamados concluídos (produção) com data de encerramento no intervalo.
   * "Hoje" / "Esta semana" passam a refletir o que você efetivamente concluiu, não criação nem só pendências abertas.
   */
  const producaoUsuarioNoPeriodo = useMemo(() => {
    if (isLoading || !user?.id) return 0

    let n = 0
    const countIf = (page: string, item: any) => {
      if (!itemContaParaProducaoUsuario(page, item)) return
      if (!isItemConcluidoProducao(page, item)) return
      const d = getDataProducao(page, item)
      const refOk = d ? isProducaoDateInHomePeriod(d, periodHome) : false
      if (refOk) {
        n++
        return
      }
      if (periodHome === 'hoje') {
        const created = getItemDateForPage(page, item)
        if (created && isProducaoDateInHomePeriod(created, 'hoje')) n++
      }
    }

    demandStore.items.forEach((d) => countIf('demandas', d))
    atendimentoStore.items.forEach((a) => countIf('atendimentos', a))
    validationStore.items.forEach((v) => countIf('validacoes', v))
    manutencaoStore.items.forEach((m) => countIf('manutencoes', m))
    reajusteStore.items.forEach((r) => countIf('reajustes', r))
    reportStore.items.forEach((rel) => countIf('analytics', rel))
    return n
  }, [
    isLoading,
    periodHome,
    demandStore.items,
    atendimentoStore.items,
    validationStore.items,
    manutencaoStore.items,
    reajusteStore.items,
    reportStore.items,
    itemContaParaProducaoUsuario,
    isProducaoDateInHomePeriod,
    user?.id
  ])

  // Lista de pendências do usuário para exportação
  const pendingByUser = useMemo(() => {
    if (!user?.id || isLoading) return []
    const rows: { tipo: string; id: string; ticket: string; titulo: string; status: string; criadoEm?: string }[] = []

    demandStore.items.forEach((d: any) => {
      if (isOwnedByUser(d, user.id, user.name) && isItemAbertoParaPendenciasUsuario('demandas', d)) {
        rows.push({
          tipo: 'Cadastro',
          id: d.id,
          ticket: String(d.ticket || '').trim(),
          titulo: d.descricao || '',
          status: String(d.status || ''),
          criadoEm: d.createdAt || d.dataInicio
        })
      }
    })
    atendimentoStore.items.forEach((a: any) => {
      if (isOwnedByUser(a, user.id, user.name) && isItemAbertoParaPendenciasUsuario('atendimentos', a)) {
        rows.push({
          tipo: 'Atendimento',
          id: a.id,
          ticket: String(a.ticket || '').trim(),
          titulo: a.titulo || '',
          status: String(a.status || ''),
          criadoEm: a.createdAt || a.dataAbertura
        })
      }
    })
    validationStore.items.forEach((v: any) => {
      if (isOwnedByUser(v, user.id, user.name) && isItemAbertoParaPendenciasUsuario('validacoes', v)) {
        rows.push({
          tipo: 'Validação',
          id: v.id,
          ticket: String(v.ticket || '').trim(),
          titulo: v.observacoes || '',
          status: String(v.status || ''),
          criadoEm: v.createdAt
        })
      }
    })
    manutencaoStore.items.forEach((m: any) => {
      if (isOwnedByUser(m, user.id, user.name) && isItemAbertoParaPendenciasUsuario('manutencoes', m)) {
        rows.push({
          tipo: 'Manutenção',
          id: m.id,
          ticket: String(m.ticket || '').trim(),
          titulo: m.descricao || '',
          status: String(m.status || ''),
          criadoEm: m.createdAt || m.dataInicio
        })
      }
    })
    reajusteStore.items.forEach((r: any) => {
      if (isOwnedByUser(r, user.id, user.name) && isItemAbertoParaPendenciasUsuario('reajustes', r)) {
        rows.push({
          tipo: 'Reajuste',
          id: r.id,
          ticket: String(r.ticket || '').trim(),
          titulo: r.motivo || '',
          status: r.aprovado ? 'Aprovado' : String(r.status || ''),
          criadoEm: r.createdAt || r.dataInicio
        })
      }
    })
    reportStore.items.forEach((rel: any) => {
      if (isOwnedByUser(rel, user.id, user.name) && isItemAbertoParaPendenciasUsuario('analytics', rel)) {
        rows.push({
          tipo: 'Analytics',
          id: rel.id,
          ticket: String(rel.ticket || rel.numeroTicket || '').trim(),
          titulo: rel.titulo || '',
          status: String(rel.status || ''),
          criadoEm: rel.dataCriacao || rel.createdAt
        })
      }
    })

    return rows
  }, [user?.id, user?.name, isLoading, demandStore.items, atendimentoStore.items, validationStore.items, manutencaoStore.items, reajusteStore.items, reportStore.items, isOwnedByUser])

  /** Lista alinhada ao card "Suas pendências": só itens em aberto do usuário, mais recentes primeiro */
  const atividadesPendentesUsuario = useMemo(() => {
    if (!user?.id || isLoading) return []
    const toPath = (tipo: string, id: string): string | undefined => {
      switch (tipo) {
        case 'Cadastro':
          return `/cadastro/${id}`
        case 'Atendimento':
          return `/atendimento/${id}`
        case 'Validação':
          return `/validacao/${id}`
        case 'Manutenção':
          return `/manutencao/${id}`
        case 'Reajuste':
          return `/reajuste/${id}`
        case 'Analytics':
          return `/analytics/${id}`
        default:
          return undefined
      }
    }
    return [...pendingByUser]
      .sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime())
      .slice(0, 8)
      .map((r) => ({
        id: `${r.tipo}-${r.id}`,
        title: r.titulo || r.ticket || '(Sem título)',
        time: r.criadoEm ? new Date(r.criadoEm).toLocaleString('pt-BR') : '',
        type: r.tipo,
        status: 'warning',
        linkPath: toPath(r.tipo, r.id)
      }))
  }, [pendingByUser, user?.id, isLoading])

  /**
   * Sincroniza só módulos que o usuário pode ver — menos chamadas à API e tempo total menor.
   * Master data sempre (analistas/áreas para vínculo e departamento).
   */
  const collectHomeSyncTasks = useCallback(
    (force: boolean): Promise<unknown>[] => {
      const tasks: Promise<unknown>[] = []
      if (syncMasterDataFn) tasks.push(syncMasterDataFn({ force }).catch(() => {}))
      if (checkPermission(userPerms, 'cadastro', 'view'))
        tasks.push(syncDemandFn(force).catch(() => {}))
      if (checkPermission(userPerms, 'atendimento', 'view'))
        tasks.push(syncAtendimentoFn(force).catch(() => {}))
      if (checkPermission(userPerms, 'validacao', 'view'))
        tasks.push(syncValidationFn(force ? { force: true } : {}).catch(() => {}))
      if (checkPermission(userPerms, 'reajuste', 'view'))
        tasks.push(syncReajusteFn(force).catch(() => {}))
      if (checkPermission(userPerms, 'manutencao', 'view'))
        tasks.push(syncManutencaoFn(force).catch(() => {}))
      if (checkPermission(userPerms, 'analytics', 'view'))
        tasks.push(syncReportFn(force).catch(() => {}))
      if (checkPermission(userPerms, 'mailling', 'view'))
        tasks.push(syncMaillingFn().catch(() => {}))
      if (checkPermission(userPerms, 'projetos', 'view'))
        tasks.push(syncProjectFn(force).catch(() => {}))
      return tasks
    },
    [
      userPerms,
      syncMasterDataFn,
      syncDemandFn,
      syncAtendimentoFn,
      syncValidationFn,
      syncReajusteFn,
      syncManutencaoFn,
      syncReportFn,
      syncMaillingFn,
      syncProjectFn
    ]
  )

  // Sincronizar dados ao abrir a Home (stores têm throttle interno ~2 min para não sobrecarregar a API)
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        await Promise.allSettled(collectHomeSyncTasks(false))
      } catch (error) {
        console.error('❌ Home: Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.id, collectHomeSyncTasks])

  const refreshHomeData = useCallback(() => {
    if (!user?.id) return
    Promise.allSettled(collectHomeSyncTasks(false)).catch(() => {})
  }, [user?.id, collectHomeSyncTasks])

  /** Ignora throttle de 2 min — atualiza “Sua produção” ao voltar à aba/página. */
  const refreshHomeDataForce = useCallback(() => {
    if (!user?.id) return
    Promise.allSettled(collectHomeSyncTasks(true)).catch(() => {})
  }, [user?.id, collectHomeSyncTasks])

  const prevPathForHomeRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!user?.id) return
    const p = location.pathname
    if (p !== '/') {
      prevPathForHomeRef.current = p
      return
    }
    if (prevPathForHomeRef.current !== undefined && prevPathForHomeRef.current !== '/') {
      refreshHomeDataForce()
    }
    prevPathForHomeRef.current = '/'
  }, [location.pathname, user?.id, refreshHomeDataForce])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshHomeDataForce()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshHomeDataForce])

  // Estatísticas: admin vê o volume global; demais usuários só o que está vinculado a eles (dono / analista).
  const statsDemandas = useMemo(() => {
    if (isLoading) return { total: 0, pendentes: 0, emAndamento: 0, concluidas: 0 }
    if (!checkPermission(userPerms, 'cadastro', 'view')) return { total: 0, pendentes: 0, emAndamento: 0, concluidas: 0 }
    const raw = (demandStore?.items && Array.isArray(demandStore.items)) ? demandStore.items : []
    const demandasArray = isAdminUser ? raw : raw.filter((d) => itemVinculadoAoResumo('demandas', d))
    const concluidas = demandasArray.filter(d => isItemConcluido('demandas', d)).length
    const pendentes = demandasArray.filter(d => isItemPendente('demandas', d)).length
    return {
      total: demandasArray.length,
      pendentes,
      emAndamento: demandasArray.filter(d => ['Em andamento', 'Em Andamento'].includes(String(d.status || ''))).length,
      concluidas
    }
  }, [isLoading, demandStore?.items, isAdminUser, itemVinculadoAoResumo, userPerms])

  const statsAtendimentos = useMemo(() => {
    if (isLoading) return { total: 0, abertos: 0, resolvidos: 0 }
    if (!checkPermission(userPerms, 'atendimento', 'view')) return { total: 0, abertos: 0, resolvidos: 0 }
    const raw = (atendimentoStore?.items && Array.isArray(atendimentoStore.items)) ? atendimentoStore.items : []
    const atendimentosArray = isAdminUser ? raw : raw.filter((a) => itemVinculadoAoResumo('atendimentos', a))
    const resolvidos = atendimentosArray.filter(a => isItemConcluido('atendimentos', a)).length
    const abertos = atendimentosArray.filter(a => isItemPendente('atendimentos', a)).length
    return {
      total: atendimentosArray.length,
      abertos,
      resolvidos
    }
  }, [isLoading, atendimentoStore?.items, isAdminUser, itemVinculadoAoResumo, userPerms])

  const statsValidacoes = useMemo(() => {
    if (isLoading) return { total: 0, pendentes: 0, aprovadas: 0 }
    if (!checkPermission(userPerms, 'validacao', 'view')) return { total: 0, pendentes: 0, aprovadas: 0 }
    const raw = (validationStore?.items && Array.isArray(validationStore.items)) ? validationStore.items : []
    const validacoesArray = isAdminUser ? raw : raw.filter((v) => itemVinculadoAoResumo('validacoes', v))
    const aprovadas = validacoesArray.filter(v => isItemConcluido('validacoes', v)).length
    const pendentes = validacoesArray.filter(v => isItemPendente('validacoes', v)).length
    return {
      total: validacoesArray.length,
      pendentes,
      aprovadas
    }
  }, [isLoading, validationStore?.items, isAdminUser, itemVinculadoAoResumo, userPerms])

  const statsReajustes = useMemo(() => {
    if (isLoading) return { total: 0, pendentes: 0, aprovados: 0 }
    if (!checkPermission(userPerms, 'reajuste', 'view')) return { total: 0, pendentes: 0, aprovados: 0 }
    const raw = (reajusteStore?.items && Array.isArray(reajusteStore.items)) ? reajusteStore.items : []
    const reajustesArray = isAdminUser ? raw : raw.filter((r) => itemVinculadoAoResumo('reajustes', r))
    const aprovados = reajustesArray.filter(r => isItemConcluido('reajustes', r)).length
    const pendentes = reajustesArray.filter(r => isItemPendente('reajustes', r)).length
    return {
      total: reajustesArray.length,
      pendentes,
      aprovados
    }
  }, [isLoading, reajusteStore?.items, isAdminUser, itemVinculadoAoResumo, userPerms])

  const statsManutencoes = useMemo(() => {
    if (isLoading) return { total: 0, pendentes: 0, emAndamento: 0, concluidas: 0 }
    if (!checkPermission(userPerms, 'manutencao', 'view')) return { total: 0, pendentes: 0, emAndamento: 0, concluidas: 0 }
    const raw = (manutencaoStore?.items && Array.isArray(manutencaoStore.items)) ? manutencaoStore.items : []
    const manutencoesArray = isAdminUser ? raw : raw.filter((m) => itemVinculadoAoResumo('manutencoes', m))
    const concluidas = manutencoesArray.filter(m => isItemConcluido('manutencoes', m)).length
    const pendentes = manutencoesArray.filter(m => isItemPendente('manutencoes', m)).length
    return {
      total: manutencoesArray.length,
      pendentes,
      emAndamento: manutencoesArray.filter(m => ['Em andamento', 'Em Andamento'].includes(String(m.status || ''))).length,
      concluidas
    }
  }, [isLoading, manutencaoStore?.items, isAdminUser, itemVinculadoAoResumo, userPerms])

  const statsAnalytics = useMemo(() => {
    if (isLoading) return { total: 0, pendentes: 0, emAndamento: 0, concluidos: 0 }
    if (!checkPermission(userPerms, 'analytics', 'view')) return { total: 0, pendentes: 0, emAndamento: 0, concluidos: 0 }
    const raw = (reportStore?.items && Array.isArray(reportStore.items)) ? reportStore.items : []
    const relatoriosArray = isAdminUser ? raw : raw.filter((r) => itemVinculadoAoResumo('analytics', r))
    const concluidos = relatoriosArray.filter(r => isItemConcluido('analytics', r)).length
    const pendentes = relatoriosArray.filter(r => isItemPendente('analytics', r)).length
    return {
      total: relatoriosArray.length,
      pendentes,
      emAndamento: relatoriosArray.filter(r => ['Em andamento', 'em_andamento', 'EM ANDAMENTO'].includes(String(r.status || ''))).length,
      concluidos
    }
  }, [isLoading, reportStore?.items, isAdminUser, itemVinculadoAoResumo, userPerms])

  const statsMailling = useMemo(() => {
    if (isLoading) return { total: 0, ativos: 0 }
    if (!checkPermission(userPerms, 'mailling', 'view')) return { total: 0, ativos: 0 }
    const contactsArray = (maillingStore?.contacts && Array.isArray(maillingStore.contacts)) ? maillingStore.contacts : []
    // Contatos não têm vínculo por usuário no modelo local — não-admin não acumula volume global aqui.
    const base = isAdminUser ? contactsArray : []
    return {
      total: base.length,
      ativos: base.filter((m) => {
        const st = (m as MaillingContact & { status?: string }).status
        return st === 'Ativo' || st == null || st === ''
      }).length
    }
  }, [isLoading, maillingStore?.contacts, isAdminUser, userPerms])

  const statsProjetos = useMemo(() => {
    if (isLoading) return { total: 0, concluidos: 0 }
    if (!checkPermission(userPerms, 'projetos', 'view')) return { total: 0, concluidos: 0 }
    const raw = (projectStore?.projects && Array.isArray(projectStore.projects)) ? projectStore.projects : []
    const projetosArray = isAdminUser ? raw : raw.filter((p) => projetoVinculadoAoUsuario(p))
    return {
      total: projetosArray.length,
      concluidos: projetosArray.filter(p => {
        const status = p.status || (p as any).timeline?.status || 'Em Andamento'
        return status === 'Concluído' || status === 'concluido' || status === 'Finalizado'
      }).length
    }
  }, [isLoading, projectStore?.projects, isAdminUser, projetoVinculadoAoUsuario, userPerms])

  // Combinar todas as estatísticas
  const stats = useMemo(() => ({
    demandas: statsDemandas,
    atendimentos: statsAtendimentos,
    validacoes: statsValidacoes,
    reajustes: statsReajustes,
    manutencoes: statsManutencoes,
    analytics: statsAnalytics,
    mailling: statsMailling,
    projetos: statsProjetos
  }), [statsDemandas, statsAtendimentos, statsValidacoes, statsReajustes, statsManutencoes, statsAnalytics, statsMailling, statsProjetos])

  const totalAtividades = useMemo(() =>
    stats.demandas.total + stats.atendimentos.total + stats.validacoes.total +
    stats.reajustes.total + stats.manutencoes.total + stats.analytics.total +
    stats.mailling.total + stats.projetos.total
  , [stats])
  const totalConcluidas = useMemo(() =>
    stats.demandas.concluidas + stats.atendimentos.resolvidos + stats.validacoes.aprovadas +
    stats.reajustes.aprovados + stats.manutencoes.concluidas + stats.analytics.concluidos +
    stats.mailling.ativos + stats.projetos.concluidos
  , [stats])
  const taxaConclusao = totalAtividades > 0 ? Math.round((totalConcluidas / totalAtividades) * 100) : 0
  /** Pendências em aberto vinculadas ao usuário (mesma base do CSV e da lista) */
  const pendenciasDoUsuario = pendingByUser.length

  /** Linhas do panorama: só módulos com permissão de visualização; totais já respeitam escopo (admin = tudo). */
  const panoramaOperacional = useMemo(() => {
    const rows: Array<{
      id: string
      label: string
      hint: string
      path: string
      perm: keyof SystemPermissions
      total: number
      open: number
      done: number
    }> = [
      {
        id: 'demandas',
        label: 'Demandas',
        hint: 'Cadastro de solicitações',
        path: '/cadastro',
        perm: 'cadastro',
        total: stats.demandas.total,
        open: stats.demandas.pendentes,
        done: stats.demandas.concluidas
      },
      {
        id: 'atendimentos',
        label: 'Atendimentos',
        hint: 'Chamados e suporte',
        path: '/atendimento',
        perm: 'atendimento',
        total: stats.atendimentos.total,
        open: stats.atendimentos.abertos,
        done: stats.atendimentos.resolvidos
      },
      {
        id: 'validacoes',
        label: 'Validações',
        hint: 'Aprovações e conferência',
        path: '/validacao',
        perm: 'validacao',
        total: stats.validacoes.total,
        open: stats.validacoes.pendentes,
        done: stats.validacoes.aprovadas
      },
      {
        id: 'reajustes',
        label: 'Reajustes',
        hint: 'Lançamentos e valores',
        path: '/reajuste',
        perm: 'reajuste',
        total: stats.reajustes.total,
        open: stats.reajustes.pendentes,
        done: stats.reajustes.aprovados
      },
      {
        id: 'manutencoes',
        label: 'Manutenções',
        hint: 'Correções e ajustes',
        path: '/manutencao',
        perm: 'manutencao',
        total: stats.manutencoes.total,
        open: stats.manutencoes.pendentes + stats.manutencoes.emAndamento,
        done: stats.manutencoes.concluidas
      },
      {
        id: 'analytics',
        label: 'Analytics',
        hint: 'Relatórios analíticos',
        path: '/analytics',
        perm: 'analytics',
        total: stats.analytics.total,
        open: stats.analytics.pendentes + stats.analytics.emAndamento,
        done: stats.analytics.concluidos
      }
    ]
    return rows.filter((r) => checkPermission(userPerms, r.perm, 'view')).map(({ perm: _p, ...rest }) => rest)
  }, [stats, userPerms])

  const handleExportPendencias = useCallback(() => {
    if (!pendingByUser.length) return
    const header = ['Tipo', 'Número do Ticket', 'ID', 'Título', 'Status', 'Criado em']
    const lines = pendingByUser.map((r) => [
      r.tipo,
      r.ticket || '',
      r.id,
      (r.titulo || '').replace(/"/g, '""'),
      r.status || '',
      r.criadoEm || ''
    ])
    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${c}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pendencias-${(user?.name || 'usuario').replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [pendingByUser, user?.name])

  /** Atalhos: exige `view` no módulo; ações “Nova …” exigem também `create`. */
  const quickActions = useMemo(() => {
    if (!user?.id) return []
    const perms = getUserPermissions(user.permissions, user.role)
    return QUICK_ACTION_DEFS.filter((a) => {
      if (a.id === 'admin') {
        return checkPermission(perms, 'usuarios', 'view')
      }
      if (!checkPermission(perms, a.module, 'view')) return false
      if (a.action !== 'view' && !checkPermission(perms, a.module, a.action)) return false
      return true
    })
  }, [user])

  // 🚀 MELHORIA FASE 2A: Funções memoizadas - 30-50% menos processamento
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-[#00A649]" />
      case 'warning':
        return <Clock className="w-4 h-4 text-[#E5B800]" />
      case 'info':
        return <FileText className="w-4 h-4 text-[#004F75]" />
      default:
        return <Star className="w-4 h-4 text-apoio-400" />
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-light text-success-dark'
      case 'warning':
        return 'bg-warning-light text-[#1a1a1a]'
      case 'info':
        return 'bg-info-light text-info-dark'
      default:
        return 'bg-apoio-100 text-apoio-500'
    }
  }, [])

  const ActivityCard = memo(function ActivityCard({
    activity,
    getStatusIcon,
    getStatusColor,
    onOpen
  }: {
    activity: { id: string; title: string; time: string; type: string; status: string; linkPath?: string }
    getStatusIcon: (status: string) => JSX.Element
    getStatusColor: (status: string) => string
    onOpen: (path: string) => void
  }) {
    return (
      <div className="flex items-center gap-3 p-3 bg-apoio-50 rounded-lg hover:bg-apoio-100 transition-colors">
        {getStatusIcon(activity.status)}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#050032] truncate">{activity.title}</p>
          <p className="text-sm text-apoio-400">{activity.time}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(activity.status)}`}>
          {activity.type}
        </span>
        {activity.linkPath && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(activity.linkPath!) }}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            Abrir
          </button>
        )}
      </div>
    )
  })

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-apoio-50 via-primary-50 to-primary-100"
      aria-busy={isLoading}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero: saudação + data/hora apenas */}
        <div className="bg-gradient-to-r from-[#002561] via-[#009FDF] to-[#050032] text-white p-6 sm:p-8 rounded-3xl mb-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-geometria mb-2">
                Olá, {user?.name || 'Usuário'}! 👋
              </h1>
              <p className="text-lg sm:text-xl text-white/90 font-light font-geometria mb-2 max-w-3xl">
                Gestão estratégica: demandas, atendimentos, validações e produção em um só lugar.
              </p>
              <p className="text-lg sm:text-xl text-white/90 font-light font-geometria">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
                {' · '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <span className="inline-block mt-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                {getUserDepartmentDisplay(user ?? undefined, areasById)}
              </span>
              {isLoading && (
                <div
                  className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90 font-geometria backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" aria-hidden />
                  <span>Carregando indicadores e filas…</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seletor de período (Hoje / Esta semana) */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-[#050032] font-geometria">Resumo:</span>
          <button
            type="button"
            onClick={() => setPeriodHome('hoje')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors font-geometria ${periodHome === 'hoje' ? 'bg-primary-600 text-white' : 'bg-white border border-apoio-200 text-apoio-600 hover:border-primary-300'}`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setPeriodHome('semana')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors font-geometria ${periodHome === 'semana' ? 'bg-primary-600 text-white' : 'bg-white border border-apoio-200 text-apoio-600 hover:border-primary-300'}`}
          >
            Esta semana
          </button>
          <span className="text-xs text-apoio-500 max-w-xl">
            Ajusta a <strong className="text-apoio-600">sua produção</strong> (chamados concluídos no período) e o rodapé. Suas pendências e a lista ao lado refletem sempre sua fila em aberto.
          </span>
        </div>

        {/* KPIs principais: Total, Taxa, Pendências, Seu dia */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-apoio-100 bg-white p-5 shadow-sm animate-pulse"
                  aria-hidden
                >
                  <div className="h-8 w-16 sm:w-20 bg-apoio-100 rounded-lg mb-3" />
                  <div className="h-4 w-28 sm:w-36 bg-apoio-50 rounded" />
                  <div className="mt-2 h-3 w-24 bg-apoio-50/80 rounded hidden sm:block" />
                </div>
              ))}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-left bg-white rounded-2xl p-5 shadow-sm border border-apoio-100 hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold text-primary-600 font-geometria">{formatIntegerPtBR(totalAtividades)}</div>
                <div className="text-sm font-medium text-[#050032] font-geometria">
                  {isAdminUser ? 'Total de Atividades' : 'Suas atividades'}
                </div>
                {!isAdminUser && (
                  <div className="text-xs text-apoio-500 mt-1 font-geometria">Vinculadas a você nos módulos permitidos</div>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-left bg-white rounded-2xl p-5 shadow-sm border border-apoio-100 hover:shadow-md hover:border-success-dark transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold text-[#00A649] font-geometria">{formatIntegerPtBR(taxaConclusao)}%</div>
                <div className="text-sm font-medium text-[#050032] font-geometria">Taxa de Conclusão</div>
              </button>
              <button
                type="button"
                onClick={() => navigate('/cadastro')}
                className="text-left bg-white rounded-2xl p-5 shadow-sm border border-apoio-100 hover:shadow-md hover:border-warning-dark transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] font-geometria">{formatIntegerPtBR(pendenciasDoUsuario)}</div>
                <div className="text-sm font-medium text-[#050032] font-geometria">Suas pendências</div>
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-left bg-white rounded-2xl p-5 shadow-sm border border-apoio-100 hover:shadow-md hover:border-info transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold text-[#004F75] font-geometria">{formatIntegerPtBR(producaoUsuarioNoPeriodo)}</div>
                <div className="text-sm font-medium text-[#050032] font-geometria">
                  {periodHome === 'hoje' ? 'Sua produção (hoje)' : 'Sua produção (semana)'}
                </div>
              </button>
            </>
          )}
        </div>

        {/* Caixa de entrada - resumo e acesso */}
        <div
          onClick={() => navigate('/notificacoes')}
          className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-apoio-100 cursor-pointer transition-all duration-300 hover:shadow-md hover:border-primary-200 group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <Inbox className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#050032] font-geometria mb-1">
                  Caixa de entrada
                </h2>
                <p className="text-sm text-apoio-500 font-geometria">
                  {inboxSummary.unread > 0
                    ? `${formatIntegerPtBR(inboxSummary.unread)} não lida${inboxSummary.unread > 1 ? 's' : ''}`
                    : inboxSummary.total > 0
                      ? 'Todas lidas'
                      : 'Nenhuma notificação'}
                  {inboxSummary.total > 0 && ` • ${formatIntegerPtBR(inboxSummary.total)} no total`}
                </p>
              </div>
            </div>
            {inboxSummary.preview.length > 0 && (
              <div className="flex-1 min-w-0 sm:max-w-md space-y-2">
                {inboxSummary.preview.map((n) => (
                  <div key={n.id} className="flex items-center gap-2 text-left">
                    <span className="flex-1 truncate text-sm text-[#050032] font-geometria">
                      {n.titulo || '(Sem assunto)'}
                    </span>
                    <span className="text-xs text-apoio-500 font-geometria flex-shrink-0">
                      {formatTimeAgo(n.dataCriacao)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-primary-600 font-medium font-geometria group-hover:text-primary-700">
              Ver todas
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Atalhos (dinâmicos por permissão, visual sóbrio) */}
        <div className="mb-8 rounded-2xl border border-apoio-100 bg-white/90 p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#050032] font-geometria flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#050032]/[0.06] text-[#004F75]">
                  <Zap className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                Atalhos
              </h2>
              <p className="mt-1 text-sm text-apoio-500">
                Acesso direto ao que você pode usar — sem ruído, sem atalhos bloqueados.
              </p>
            </div>
            {quickActions.length > 0 && (
              <span className="text-xs font-medium text-apoio-400 tabular-nums">
                {quickActions.length} {quickActions.length === 1 ? 'opção' : 'opções'}
              </span>
            )}
          </div>
          {quickActions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-apoio-200 bg-apoio-50/50 px-4 py-6 text-center text-sm text-apoio-500">
              Nenhum atalho disponível para o seu perfil de acesso.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => navigate(action.path)}
                    className="group flex items-center gap-3 rounded-xl border border-apoio-100 bg-white px-4 py-3.5 text-left transition-all duration-200 hover:border-[#004F75]/30 hover:bg-[#004F75]/[0.03] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004F75]/25"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#050032]/[0.06] text-[#004F75] transition-colors group-hover:bg-[#004F75]/10">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight text-[#050032] font-geometria">{action.title}</span>
                      <span className="mt-0.5 block text-xs text-apoio-500">{action.subtitle}</span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 flex-shrink-0 text-apoio-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#004F75]"
                      aria-hidden
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panorama operacional: fluxo único, leitura em lista + barra de ritmo */}
        <section className="mb-8 rounded-2xl border border-apoio-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-apoio-100 bg-gradient-to-r from-[#050032]/[0.03] to-transparent px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#050032] font-geometria flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#004F75]" strokeWidth={1.75} aria-hidden />
                  Panorama operacional
                </h2>
                <p className="text-sm text-apoio-500 mt-0.5 max-w-2xl">
                  {isAdminUser
                    ? 'Cada linha mostra o volume global do módulo: total, em aberto e encerrado. Toque para abrir a lista.'
                    : 'Apenas módulos que você pode ver, com volume vinculado a você (dono ou analista vinculado ao seu login). Toque para abrir a lista.'}
                </p>
              </div>
            </div>
          </div>
          <ul className="divide-y divide-apoio-100">
            {isLoading
              ? Array.from({ length: 6 }, (_, i) => (
                  <li key={`panorama-skel-${i}`} className="px-4 py-4 sm:px-6 animate-pulse" aria-hidden>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-36 max-w-full rounded bg-apoio-100" />
                        <div className="h-3 w-52 max-w-full rounded bg-apoio-50" />
                      </div>
                      <div className="flex flex-wrap gap-4 sm:gap-6">
                        <div className="h-12 w-14 rounded bg-apoio-100" />
                        <div className="h-12 w-14 rounded bg-apoio-100" />
                        <div className="h-12 w-14 rounded bg-apoio-100" />
                      </div>
                      <div className="flex items-center gap-3 sm:w-40 sm:flex-shrink-0">
                        <div className="h-2 flex-1 rounded-full bg-apoio-100 sm:max-w-[7rem]" />
                        <div className="h-5 w-5 rounded bg-apoio-50" />
                      </div>
                    </div>
                  </li>
                ))
              : panoramaOperacional.map((row) => {
                  const pct =
                    row.total > 0 ? Math.min(100, Math.round((row.done / row.total) * 100)) : 0
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => navigate(row.path)}
                        className="group flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-[#004F75]/[0.04] sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-[#050032] font-geometria">{row.label}</span>
                          <span className="mt-0.5 block text-xs text-apoio-500">{row.hint}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                          <div className="tabular-nums">
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-apoio-400">Total</span>
                            <span className="text-base font-semibold text-[#050032] font-geometria">
                              {formatIntegerPtBR(row.total)}
                            </span>
                          </div>
                          <div className="tabular-nums">
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-apoio-400">Em aberto</span>
                            <span className="text-base font-semibold text-[#004F75] font-geometria">
                              {formatIntegerPtBR(row.open)}
                            </span>
                          </div>
                          <div className="tabular-nums">
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-apoio-400">Encerrados</span>
                            <span className="text-base font-semibold text-apoio-600 font-geometria">
                              {formatIntegerPtBR(row.done)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:w-40 sm:flex-shrink-0">
                          <div
                            className="h-2 flex-1 overflow-hidden rounded-full bg-apoio-100 sm:max-w-[7rem]"
                            title={`${pct}% encerrados sobre o total`}
                          >
                            <div
                              className="h-full rounded-full bg-[#004F75] transition-all duration-500 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <ChevronRight
                            className="h-5 w-5 flex-shrink-0 text-apoio-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#004F75]"
                            aria-hidden
                          />
                        </div>
                      </button>
                    </li>
                  )
                })}
          </ul>
        </section>

        {/* Sua fila: largura total, abaixo do panorama */}
        <section className="mb-8 rounded-2xl border border-apoio-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#050032] font-geometria flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#009FDF]/10 text-[#009FDF]">
                  <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                Prioridades na sua fila
              </h3>
              <p className="mt-1 text-sm text-apoio-500 max-w-2xl">
                {isLoading ? (
                  <span className="inline-block min-h-[1.25rem] w-full max-w-md rounded bg-apoio-100 animate-pulse" aria-hidden />
                ) : (
                  <>
                    Itens com você como analista ou responsável, ainda não concluídos nem cancelados.{' '}
                    <span className="font-semibold text-[#004F75]">{formatIntegerPtBR(pendingByUser.length)}</span> em
                    aberto.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPendencias}
              disabled={isLoading || !pendingByUser.length}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-apoio-200 bg-white px-4 py-2.5 text-sm font-medium text-[#050032] font-geometria transition-colors hover:border-[#004F75]/40 hover:bg-[#004F75]/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4 text-apoio-500" />
              Exportar CSV
            </button>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-2" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div key={`fila-skel-${i}`} className="flex items-center gap-3 rounded-lg bg-apoio-50 p-3 animate-pulse">
                    <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-apoio-200" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 rounded bg-apoio-100" style={{ width: `${72 + i * 5}%` }} />
                      <div className="h-3 w-28 rounded bg-apoio-50" />
                    </div>
                    <div className="h-8 w-14 flex-shrink-0 rounded-lg bg-apoio-100" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {atividadesPendentesUsuario.length === 0 && (
                  <p className="rounded-xl border border-dashed border-apoio-200 bg-apoio-50/40 px-4 py-8 text-center text-sm text-apoio-500">
                    Nada pendente com você no momento — ótimo ritmo.
                  </p>
                )}
                {atividadesPendentesUsuario.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    onOpen={navigate}
                  />
                ))}
              </>
            )}
          </div>
        </section>

        {/* Rodapé dinâmico */}
        <div className="mt-8 rounded-2xl p-6 text-center border font-geometria border-apoio-200 bg-white/80">
          {isLoading ? (
            <div className="mx-auto flex max-w-lg flex-col items-center gap-2" aria-hidden>
              <div className="h-5 w-full max-w-md rounded bg-apoio-100 animate-pulse" />
              <div className="h-4 w-3/4 max-w-sm rounded bg-apoio-50 animate-pulse" />
            </div>
          ) : pendenciasDoUsuario > 0 ? (
            <>
              <p className="text-[#050032] font-medium">
                Você tem <span className="text-primary-600 font-semibold">{formatIntegerPtBR(pendenciasDoUsuario)}</span>{' '}
                pendência{pendenciasDoUsuario > 1 ? 's' : ''} em aberto na sua fila
                {periodHome === 'semana' && (
                  <span className="text-apoio-600"> • Produção na semana: {formatIntegerPtBR(producaoUsuarioNoPeriodo)} concluído(s)</span>
                )}
                .
              </p>
              <p className="text-sm text-apoio-500 mt-1">Use os atalhos acima ou o menu lateral para abrir os módulos.</p>
            </>
          ) : (
            <>
              <p className="text-success-dark font-medium">Nenhuma pendência em aberto na sua fila.</p>
              <p className="text-sm text-apoio-500 mt-1">
                {periodHome === 'hoje'
                  ? `Produção hoje: ${formatIntegerPtBR(producaoUsuarioNoPeriodo)} concluído(s). Use o Dashboard para o resumo completo.`
                  : `Produção na semana: ${formatIntegerPtBR(producaoUsuarioNoPeriodo)} concluído(s). Use o Dashboard para o resumo completo.`}
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

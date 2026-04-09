import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Mail,
  BarChart3,
  FileText,
  Inbox,
  ArrowRight,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useProjectStore } from '../../store/projectStore'
import { useMaillingStore } from '../../store/maillingStore'
import { useNotificationStore } from '../../store/notificationStore'
import { getUserPermissions, checkPermission } from '../../utils/defaultPermissions'
import { getUserDepartmentDisplay } from '../../utils/userDepartmentDisplay'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import { getDismissedAlertIds } from '../../utils/dismissedAlerts'
import type { SystemPermissions, ModulePermission } from '../../types/permissions'
import type { Project } from '../../types/project'

export type HomeNonOperationalVariant = 'placement' | 'no_department'

const ALT_QUICK_ACTIONS: Array<{
  id: string
  title: string
  subtitle: string
  path: string
  icon: LucideIcon
  module: keyof SystemPermissions
  action: keyof ModulePermission
}> = [
  {
    id: 'projetos',
    title: 'Projetos',
    subtitle: 'Cronogramas e equipes',
    path: '/projetos',
    icon: FolderOpen,
    module: 'projetos',
    action: 'view'
  },
  {
    id: 'mailling',
    title: 'Mailling',
    subtitle: 'Contatos e campanhas',
    path: '/mailling',
    icon: Mail,
    module: 'mailling',
    action: 'view'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Relatórios analíticos',
    path: '/analytics',
    icon: BarChart3,
    module: 'analytics',
    action: 'view'
  },
  {
    id: 'cadastro',
    title: 'Cadastro',
    subtitle: 'Demandas e solicitações',
    path: '/cadastro',
    icon: FileText,
    module: 'cadastro',
    action: 'view'
  }
]

/** Dashboard operacional NIG: disponível só fora de Placement nesta home alternativa. */
const DASHBOARD_QUICK_ACTION: (typeof ALT_QUICK_ACTIONS)[number] = {
  id: 'dashboard',
  title: 'Dashboard',
  subtitle: 'Indicadores e visão geral',
  path: '/dashboard',
  icon: LayoutDashboard,
  module: 'dashboard',
  action: 'view'
}

export default function HomeNonOperationalPage({ variant }: { variant: HomeNonOperationalVariant }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const areasById = useMasterDataStore((s) => s.areasById)
  const masterDataStore = useMasterDataStore()
  const projectStore = useProjectStore()
  const maillingStore = useMaillingStore()
  const { notifications, dismissedKeys } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(true)

  const isAdminUser = (user?.role || '').toLowerCase() === 'admin'

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

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    const load = async () => {
      setIsLoading(true)
      try {
        const masterSync = masterDataStore.syncFromApi
        await Promise.allSettled([
          masterSync ? masterSync({ force: false }) : Promise.resolve(),
          projectStore.syncFromApi().catch(() => {}),
          maillingStore.syncFromApi().catch(() => {})
        ])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.id, masterDataStore.syncFromApi, projectStore.syncFromApi, maillingStore.syncFromApi])

  const userPerms = useMemo(
    () => getUserPermissions(user?.permissions, user?.role || ''),
    [user?.permissions, user?.role]
  )

  const quickActions = useMemo(() => {
    if (!user?.id) return []
    const base =
      variant === 'placement' ? ALT_QUICK_ACTIONS : [DASHBOARD_QUICK_ACTION, ...ALT_QUICK_ACTIONS]
    return base.filter((a) => {
      if (!checkPermission(userPerms, a.module, 'view')) return false
      if (a.action !== 'view' && !checkPermission(userPerms, a.module, a.action)) return false
      return true
    })
  }, [user?.id, userPerms, variant])

  const projetoCount = useMemo(() => {
    const raw = Array.isArray(projectStore.projects) ? projectStore.projects : []
    if (isAdminUser) return raw.length
    return raw.filter((p) => projetoVinculadoAoUsuario(p)).length
  }, [projectStore.projects, isAdminUser, projetoVinculadoAoUsuario])

  const maillingCount = useMemo(() => {
    if (!checkPermission(userPerms, 'mailling', 'view')) return 0
    const c = maillingStore.contacts
    if (!Array.isArray(c)) return 0
    return isAdminUser ? c.length : 0
  }, [maillingStore.contacts, isAdminUser, userPerms])

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-apoio-50 via-primary-50 to-primary-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-apoio-500">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-apoio-50 via-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero: mesmo padrão visual da Home NIG */}
        <div className="bg-gradient-to-r from-[#002561] via-[#009FDF] to-[#050032] text-white p-6 sm:p-8 rounded-3xl mb-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-geometria mb-2">
                Olá, {user?.name || 'Usuário'}! 👋
              </h1>
              {variant === 'placement' && (
                <p className="text-lg sm:text-xl text-white/90 font-light font-geometria mb-2 max-w-3xl">
                  Visão focada em projetos, relacionamento e ferramentas de apoio. Use os atalhos para o fluxo do seu
                  time.
                </p>
              )}
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
            </div>
          </div>
        </div>

        {variant === 'placement' && (
          <div className="mb-6 rounded-2xl border border-apoio-100 bg-white p-4 sm:p-5 shadow-sm text-sm text-apoio-600 font-geometria">
            <p>
              <strong className="font-semibold text-[#050032]">Placement:</strong> o painel de indicadores específico do
              time ainda está em construção; o dashboard operacional NIG permanece oculto nesta home até a versão
              Placement ficar pronta.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            type="button"
            onClick={() => navigate('/projetos')}
            className="text-left rounded-2xl border border-apoio-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
          >
            <div className="text-2xl sm:text-3xl font-bold text-primary-600 font-geometria">
              {formatIntegerPtBR(projetoCount)}
            </div>
            <div className="text-sm font-medium text-[#050032] font-geometria">
              {isAdminUser ? 'Projetos (global)' : 'Seus projetos'}
            </div>
          </button>
          {checkPermission(userPerms, 'mailling', 'view') && isAdminUser && (
            <button
              type="button"
              onClick={() => navigate('/mailling')}
              className="text-left rounded-2xl border border-apoio-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="text-2xl sm:text-3xl font-bold text-[#004F75] font-geometria">
                {formatIntegerPtBR(maillingCount)}
              </div>
              <div className="text-sm font-medium text-[#050032] font-geometria">Contatos (Mailling)</div>
            </button>
          )}
          {checkPermission(userPerms, 'analytics', 'view') && (
            <button
              type="button"
              onClick={() => navigate('/analytics')}
              className="text-left rounded-2xl border border-apoio-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="text-sm font-medium text-[#050032] font-geometria">Analytics</div>
              <div className="text-xs text-apoio-500 mt-1">Relatórios analíticos</div>
            </button>
          )}
        </div>

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
                <h2 className="text-xl font-semibold text-[#050032] font-geometria mb-1">Caixa de entrada</h2>
                <p className="text-sm text-apoio-500 font-geometria">
                  {inboxSummary.unread > 0
                    ? `${formatIntegerPtBR(inboxSummary.unread)} não lida${inboxSummary.unread > 1 ? 's' : ''}`
                    : inboxSummary.total > 0
                      ? 'Todas lidas'
                      : 'Nenhuma notificação'}
                  {inboxSummary.total > 0 && ` · ${formatIntegerPtBR(inboxSummary.total)} no total`}
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
                    <span className="text-xs text-apoio-500 flex-shrink-0">
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
                      <span className="block text-sm font-semibold leading-tight text-[#050032] font-geometria">
                        {action.title}
                      </span>
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

        {variant === 'no_department' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
            <strong className="font-semibold">Dica:</strong> com o departamento correto vinculado, você passará a ver a
            home operacional completa (fila NIG, panorama e produção).
            {checkPermission(userPerms, 'usuarios', 'view') ? (
              <>
                {' '}
                Peça ao administrador em{' '}
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => navigate('/admin/usuarios')}
                >
                  Usuários
                </button>
                .
              </>
            ) : (
              <> Peça ao administrador para vincular sua área no cadastro de usuários.</>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

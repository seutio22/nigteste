import { useEffect, useMemo, useState } from 'react'
import { useSidebar } from '../contexts/SidebarContext'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { getUserPermissions, checkPermission } from '../utils/defaultPermissions'
import { getUserDepartmentDisplay } from '../utils/userDepartmentDisplay'
import {
  Home,
  FileText,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Grid3X3,
  Database,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Megaphone,
  FolderOpen,
  Wrench,
  Layers,
  Briefcase,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

type MenuModule =
  | 'home'
  | 'dashboard'
  | 'cadastro'
  | 'manutencao'
  | 'atendimento'
  | 'comunicados'
  | 'projetos'
  | 'validacao'
  | 'reajuste'
  | 'analytics'
  | 'mailling'
  | 'kanban'
  | 'dados'
  | 'usuarios'

type MenuLink = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
  module: MenuModule
}

/** Rotas do módulo operacional NIG (ordem do submenu) */
const nigMenuItems: MenuLink[] = [
  { icon: FileText, label: 'Cadastro', path: '/cadastro', module: 'cadastro' },
  { icon: Wrench, label: 'Manutenção', path: '/manutencao', module: 'manutencao' },
  { icon: FileText, label: 'Atendimento', path: '/atendimento', module: 'atendimento' },
  { icon: CheckCircle, label: 'Validação', path: '/validacao', module: 'validacao' },
  { icon: TrendingUp, label: 'Reajuste', path: '/reajuste', module: 'reajuste' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', module: 'analytics' },
]

const topMenuItems: MenuLink[] = [
  { icon: Home, label: 'Home', path: '/', module: 'home' },
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard', module: 'dashboard' },
]

/** Módulo Administrativo */
const administrativoMenuItems: MenuLink[] = [
  { icon: Database, label: 'Dados', path: '/dados', module: 'dados' },
  { icon: Users, label: 'Usuários', path: '/admin/usuarios', module: 'usuarios' },
]

const toolsMenuItems: MenuLink[] = [
  { icon: Megaphone, label: 'Comunicados', path: '/comunicados', module: 'comunicados' },
  { icon: FolderOpen, label: 'Projetos', path: '/projetos', module: 'projetos' },
  { icon: Mail, label: 'Mailling', path: '/mailling', module: 'mailling' },
  { icon: Grid3X3, label: 'Kanban', path: '/kanban', module: 'kanban' },
]

const NIG_PATH_PREFIXES = [
  '/cadastro',
  '/manutencao',
  '/atendimento',
  '/validacao',
  '/reajuste',
  '/analytics',
] as const

function pathMatchesNig(pathname: string) {
  return NIG_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function pathMatchesAdministrativo(pathname: string) {
  if (pathname === '/dados' || pathname.startsWith('/dados/')) return true
  if (pathname === '/admin/usuarios' || pathname.startsWith('/admin/usuarios/')) return true
  return false
}

function filterByPermission(items: MenuLink[], user: { permissions?: string | null; role: string } | null) {
  if (!user) return []
  const userPermissions = getUserPermissions(user.permissions, user.role)
  return items.filter((item) => checkPermission(userPermissions, item.module as any, 'view'))
}

export function Sidebar() {
  const { isCollapsed, toggleSidebar, isMobile } = useSidebar()
  const { user } = useAuthStore()
  const areasById = useMasterDataStore((s) => s.areasById)
  const { pathname } = useLocation()
  /** NIG e Administrativo começam fechados; o usuário clica no título para expandir o submenu */
  const [nigOpen, setNigOpen] = useState(false)
  const [administrativoOpen, setAdministrativoOpen] = useState(false)

  const filteredTop = useMemo(() => filterByPermission(topMenuItems, user), [user])
  const filteredNig = useMemo(() => filterByPermission(nigMenuItems, user), [user])
  const filteredAdministrativo = useMemo(
    () => filterByPermission(administrativoMenuItems, user),
    [user]
  )
  const filteredTools = useMemo(() => filterByPermission(toolsMenuItems, user), [user])

  const isNigRoute = pathMatchesNig(pathname)
  const isAdministrativoRoute = pathMatchesAdministrativo(pathname)

  useEffect(() => {
    if (isNigRoute) setNigOpen(true)
  }, [isNigRoute])

  useEffect(() => {
    if (isAdministrativoRoute) setAdministrativoOpen(true)
  }, [isAdministrativoRoute])

  const renderLink = (item: MenuLink, options?: { nested?: boolean }) => {
    const nested = options?.nested ?? false
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          `sidebar-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-2' : ''} ${
            nested ? 'pl-3 ml-1 border-l border-white/15 rounded-l-none' : ''
          }`
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-medium truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
    )
  }

  return (
    <>
      {/* Overlay para mobile quando menu está aberto */}
      {isMobile && !isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggleSidebar}
          className="sidebar-mobile-overlay fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}
      
      <motion.div
        initial={{ x: isMobile ? -280 : 0 }}
        animate={{ x: 0 }}
        className={`fixed left-0 top-0 h-full bg-gradient-dark text-white z-50 transition-all duration-300 ease-in-out ${
          isMobile 
            ? (isCollapsed ? 'w-16' : 'w-80') // Mobile: 16 ou 320px
            : (isCollapsed ? 'w-16' : 'w-70') // Desktop: 16 ou 280px
        }`}
      >
      {/* Header da Sidebar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="font-bold text-lg text-white font-geometria">Nexus</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Ordem: Home → Dashboard → NIG → demais itens → Administrativo (sempre por último) */}
      <nav className="sidebar-nav flex-1 mt-6 px-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        <div className="space-y-1">
          {filteredTop.map((item) => renderLink(item))}

          {filteredNig.length > 0 && (
            <div className="pt-0.5">
              {isCollapsed ? (
                <>
                  <div className="mx-1 my-2 h-px bg-white/15" aria-hidden />
                  {filteredNig.map((item) => renderLink(item, { nested: false }))}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setNigOpen((o) => !o)}
                    className={`sidebar-item w-full justify-between gap-1 ${
                      isNigRoute ? 'bg-white/10' : ''
                    }`}
                    aria-expanded={nigOpen}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Layers className="w-5 h-5 flex-shrink-0 text-sky-200/90" />
                      <span className="font-semibold tracking-wide truncate">NIG</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                        nigOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {nigOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 mt-1 pb-1">
                          {filteredNig.map((item) => renderLink(item, { nested: true }))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}

          {filteredTools.length > 0 && (
            <div
              className={`space-y-1 ${
                filteredNig.length > 0 ? 'pt-2 mt-1 border-t border-white/10' : 'pt-0.5'
              }`}
            >
              {filteredTools.map((item) => renderLink(item))}
            </div>
          )}

          {filteredAdministrativo.length > 0 && (
            <div
              className={`${
                filteredNig.length > 0 || filteredTools.length > 0
                  ? 'pt-2 mt-1 border-t border-white/10'
                  : 'pt-0.5'
              }`}
            >
              {isCollapsed ? (
                <>
                  <div className="mx-1 my-2 h-px bg-white/15" aria-hidden />
                  {filteredAdministrativo.map((item) => renderLink(item, { nested: false }))}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAdministrativoOpen((o) => !o)}
                    className={`sidebar-item w-full justify-between gap-1 ${
                      isAdministrativoRoute ? 'bg-white/10' : ''
                    }`}
                    aria-expanded={administrativoOpen}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Briefcase className="w-5 h-5 flex-shrink-0 text-amber-200/90" />
                      <span className="font-semibold tracking-wide truncate">Administrativo</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                        administrativoOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {administrativoOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 mt-1 pb-1">
                          {filteredAdministrativo.map((item) => renderLink(item, { nested: true }))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer da Sidebar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              key="user-info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-3"
            >
              {/* Versão do Sistema */}
              <div className="text-center">
                <div className="inline-flex items-center px-2 py-1 bg-white/10 rounded-full">
                  <span className="text-xs font-medium text-white/80">v0.8.4</span>
                </div>
              </div>
              
              {/* Informações do Usuário */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">U</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-white/60">{getUserDepartmentDisplay(user ?? undefined, areasById)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </motion.div>
    </>
  )
}

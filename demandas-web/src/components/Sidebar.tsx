import { useSidebar } from '../contexts/SidebarContext'
import { useAuthStore } from '../store/authStore'
import { canAccessModule } from '../types/permissions'
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
  Menu,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  FolderOpen,
  Wrench,
  // Trash2 removido - ícone não mais usado
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const menuItems = [
  { icon: Home, label: 'Home', path: '/', module: 'home' },
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard', module: 'dashboard' },
  { icon: FileText, label: 'Cadastro', path: '/cadastro', module: 'cadastro' },
  { icon: Wrench, label: 'Manutenção', path: '/manutencao', module: 'manutencao' },
  { icon: FileText, label: 'Atendimento', path: '/atendimento', module: 'atendimento' },
  { icon: Megaphone, label: 'Comunicados', path: '/comunicados', module: 'comunicados' },
  { icon: FolderOpen, label: 'Projetos', path: '/projetos', module: 'projetos' },
  { icon: CheckCircle, label: 'Validação', path: '/validacao', module: 'validacao' },
  { icon: TrendingUp, label: 'Reajuste', path: '/reajuste', module: 'reajuste' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics', module: 'analytics' },
  { icon: Mail, label: 'Mailling', path: '/mailling', module: 'mailling' },
  { icon: Grid3X3, label: 'Kanban', path: '/kanban', module: 'kanban' },
  { icon: Database, label: 'Dados', path: '/dados', module: 'dados' },
  // Item de menu 'Limpeza' removido - funcionalidade de limpeza de duplicatas removida
  { icon: Users, label: 'Usuários', path: '/admin/usuarios', module: 'usuarios' },
]

export function Sidebar() {
  const { isCollapsed, toggleSidebar, isMobile } = useSidebar()
  const { user } = useAuthStore()

  // Filtrar itens do menu baseado nas permissões do usuário
  const filteredMenuItems = menuItems.filter(item => {
    // Se não tem módulo definido (como home), sempre mostrar
    if (!item.module) return true
    
    // Verificar se o usuário tem permissão para acessar o módulo
    return canAccessModule(user?.permissions, item.module as any)
  })

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
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-bold text-lg text-white" style={{ fontFamily: 'Geometria, sans-serif' }}>Dynamic</span>
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

      {/* Menu Items */}
      <nav className="sidebar-nav flex-1 mt-6 px-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        <div className="space-y-1">
          {filteredMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''} ${
                  isCollapsed ? 'justify-center px-2' : ''
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
          ))}
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
                  <span className="text-xs font-medium text-white/80">v0.5.9</span>
                </div>
              </div>
              
              {/* Informações do Usuário */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">U</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-white/60">{user?.role || 'Usuário'}</p>
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

import { SidebarTrigger } from './SidebarTrigger'
import { NotificationDropdown } from './NotificationDropdown'
import { SettingsDropdown } from './SettingsDropdown'
import { Search, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

export function Header() {
  const { user } = useAuthStore()

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white border-b border-neutral-200 px-6 py-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notificações */}
          <NotificationDropdown />

          {/* Perfil do usuário (agora abre as configurações) */}
          <SettingsDropdown />
        </div>
      </div>
    </motion.header>
  )
}

import { SidebarTrigger } from './SidebarTrigger'
import { NotificationDropdown } from './NotificationDropdown'
import { SettingsDropdown } from './SettingsDropdown'
import { motion } from 'framer-motion'

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white border-b border-neutral-200 px-6 py-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
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

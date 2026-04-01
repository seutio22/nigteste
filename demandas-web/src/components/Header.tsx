import { SidebarTrigger } from './SidebarTrigger'
import { NotificationDropdown } from './NotificationDropdown'
import { SettingsDropdown } from './SettingsDropdown'
import { motion } from 'framer-motion'

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white dark:bg-[#151b26] border-b border-neutral-200 dark:border-neutral-700/80 px-6 py-4 shadow-sm transition-colors duration-300"
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

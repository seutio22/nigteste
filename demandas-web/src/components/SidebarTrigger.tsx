import { useSidebar } from '../contexts/SidebarContext'
import { Menu } from 'lucide-react'
import { motion } from 'framer-motion'

export function SidebarTrigger() {
  const { toggleSidebar } = useSidebar()

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleSidebar}
      className="p-2 hover:bg-primary-100 rounded-lg transition-colors duration-200 lg:hidden"
    >
      <Menu className="w-6 h-6 text-primary-600" />
    </motion.button>
  )
}

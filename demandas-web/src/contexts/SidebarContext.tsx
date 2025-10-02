import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void
  isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detectar se é mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint do Tailwind
      setIsMobile(mobile)
      
      // Em mobile, iniciar com menu fechado
      if (mobile && !isCollapsed) {
        setIsCollapsed(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [isCollapsed])

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)
  const collapseSidebar = () => setIsCollapsed(true)
  const expandSidebar = () => setIsCollapsed(false)

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      toggleSidebar,
      collapseSidebar,
      expandSidebar,
      isMobile
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

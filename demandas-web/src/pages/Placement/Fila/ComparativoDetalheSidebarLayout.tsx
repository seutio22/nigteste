import React from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'

type Props = {
  sidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
  toolbar?: React.ReactNode
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function ComparativoDetalheSidebarLayout({
  sidebarOpen,
  onSidebarOpenChange,
  toolbar,
  sidebar,
  children,
}: Props) {
  return (
    <Box sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      <Box
        sx={{
          width: sidebarOpen ? { xs: '100%', md: 320 } : 0,
          flexShrink: 0,
          overflow: 'auto',
          borderRight: sidebarOpen ? 1 : 0,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: 'width 0.2s ease',
          display: { xs: sidebarOpen ? 'block' : 'none', md: sidebarOpen ? 'block' : 'none' },
          p: sidebarOpen ? 2 : 0,
        }}
      >
        {sidebarOpen ? sidebar : null}
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'auto',
          p: { xs: 1, md: 1.25 },
          bgcolor: 'grey.50',
          position: 'relative',
        }}
      >
        <Tooltip title={sidebarOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'}>
          <IconButton
            size="small"
            color={sidebarOpen ? 'primary' : 'default'}
            onClick={() => onSidebarOpenChange(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'}
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 5,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <ViewSidebarOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {toolbar ? (
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 5 }}>{toolbar}</Box>
        ) : null}
        {children}
      </Box>
    </Box>
  )
}

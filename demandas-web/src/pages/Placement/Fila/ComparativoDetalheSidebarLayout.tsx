import React from 'react'
import { Box, IconButton, Paper, Tooltip } from '@mui/material'
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined'

type Props = {
  sidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
  toolbar: React.ReactNode
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Paper
        elevation={0}
        sx={{
          flexShrink: 0,
          px: 2,
          py: 1.25,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, minWidth: 0, flex: 1 }}>
            <Tooltip title={sidebarOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'}>
              <IconButton
                size="small"
                color={sidebarOpen ? 'primary' : 'default'}
                onClick={() => onSidebarOpenChange(!sidebarOpen)}
                aria-label={sidebarOpen ? 'Ocultar painel lateral' : 'Mostrar painel lateral'}
                sx={{ mt: 0.25 }}
              >
                <ViewSidebarOutlinedIcon />
              </IconButton>
            </Tooltip>
            {toolbar}
          </Box>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            width: sidebarOpen ? { xs: '100%', md: 320 } : 0,
            flexShrink: 0,
            overflow: 'auto',
            borderRight: sidebarOpen ? 1 : 0,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            transition: 'width 0.2s ease',
            display: { xs: sidebarOpen ? 'block' : 'none', md: 'block' },
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
            p: { xs: 1.5, md: 2.5 },
            bgcolor: 'grey.50',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}

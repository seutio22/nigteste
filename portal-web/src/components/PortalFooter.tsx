import { Box, Link, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function PortalFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" color="text.secondary" component="div" sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/ajuda" color="inherit" sx={{ mr: 2 }}>
          Ajuda
        </Link>
        <Link component={RouterLink} to="/areas" color="inherit" sx={{ mr: 2 }}>
          Áreas e tipos
        </Link>
        <span>Portal do colaborador</span>
      </Typography>
    </Box>
  )
}

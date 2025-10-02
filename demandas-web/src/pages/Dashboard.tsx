import React from 'react'
import { Box, Paper, Typography } from '@mui/material'

export default function DashboardPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1">
          Dashboard simplificado para teste.
        </Typography>
      </Paper>
    </Box>
  )
}
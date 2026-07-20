import React from 'react'
import { Box, Card, CardContent, Paper, Stack, Typography } from '@mui/material'

export const validacaoFormField = { size: 'medium' as const, margin: 'none' as const, fullWidth: true }

export const validacaoCardSx = {
  mb: 2.5,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'rgba(15, 23, 42, 0.07)',
  bgcolor: '#fff',
  boxShadow: '0 2px 16px -6px rgba(15, 23, 42, 0.1)',
  overflow: 'hidden',
} as const

export function ValidacaoSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
      <Box
        sx={{
          width: 4,
          height: 24,
          borderRadius: 999,
          bgcolor: 'primary.main',
          boxShadow: '0 0 0 3px rgba(0,159,223,0.12)',
        }}
      />
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary', fontSize: '1rem' }}
      >
        {children}
      </Typography>
    </Box>
  )
}

export function ValidacaoFormCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card elevation={0} sx={validacaoCardSx}>
      <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
        <ValidacaoSectionTitle>{title}</ValidacaoSectionTitle>
        {children}
      </CardContent>
    </Card>
  )
}

export function ValidacaoFormShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 0, sm: 3 },
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'rgba(15, 23, 42, 0.06)',
        boxShadow: '0 12px 40px -16px rgba(15, 23, 42, 0.18)',
        width: '100%',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 2.25,
          background: 'linear-gradient(125deg, #009FDF 0%, #0077b3 55%, #005a87 100%)',
          color: 'common.white',
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.92, maxWidth: 560 }}>
              {subtitle}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Box
        sx={{
          p: { xs: 2.25, sm: 3 },
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'background.default' : '#f4f7fb'),
        }}
      >
        {children}
      </Box>
    </Paper>
  )
}

import { Box, Card, CardContent, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export const formField = {
  size: 'medium' as const,
  margin: 'none' as const,
  fullWidth: true,
  variant: 'outlined' as const,
}

export const cardSx = {
  mb: 2.5,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'rgba(15, 23, 42, 0.07)',
  bgcolor: '#fff',
  boxShadow: '0 2px 16px -6px rgba(15, 23, 42, 0.1)',
  overflow: 'hidden',
} as const

export function SectionTitle({ children }: { children: ReactNode }) {
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

export function ReajusteFormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card elevation={0} sx={cardSx}>
      <CardContent sx={{ py: 3, px: { xs: 2.25, sm: 3 }, '&:last-child': { pb: 3 } }}>
        <SectionTitle>{title}</SectionTitle>
        {children}
      </CardContent>
    </Card>
  )
}

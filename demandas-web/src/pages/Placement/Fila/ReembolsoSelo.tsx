import React from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import {
  reembolsoSimNaoLabel,
  temReembolsoFromValor,
  type ReembolsoSimNao,
} from './placementReembolsoConsulta'

type Props = {
  valor: string | undefined | null
  temReembolso?: boolean
  fontSize?: number
}

export function resolveReembolsoSelo(
  valor: string | undefined | null,
  temReembolso?: boolean
): { label: ReembolsoSimNao; tem: boolean } {
  const label = reembolsoSimNaoLabel(valor)
  const tem = temReembolso ?? temReembolsoFromValor(valor)
  return { label, tem }
}

export function ReembolsoSelo({ valor, temReembolso, fontSize = 10 }: Props) {
  const { label, tem } = resolveReembolsoSelo(valor, temReembolso)

  if (label === '—') {
    return (
      <Typography sx={{ fontSize, fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>
        —
      </Typography>
    )
  }

  const bg = tem ? '#E8F4FC' : '#f1f5f9'
  const border = tem ? '#009FDF' : '#cbd5e1'
  const color = tem ? '#004F75' : '#64748b'

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        px: 0.75,
        py: 0.25,
        borderRadius: 99,
        bgcolor: bg,
        border: `1px solid ${border}`,
        maxWidth: '100%',
      }}
    >
      {tem ? (
        <CheckCircleIcon sx={{ fontSize: fontSize + 4, color: '#009FDF' }} />
      ) : (
        <CancelIcon sx={{ fontSize: fontSize + 4, color: '#94a3b8' }} />
      )}
      <Typography
        sx={{
          fontSize,
          fontWeight: 700,
          color,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

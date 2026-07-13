import React from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import {
  coparticipacaoSimNaoLabel,
  temCoparticipacaoFromValor,
  type CoparticipacaoSimNao,
} from './placementContratoAtual'

type Props = {
  valor: string | undefined | null
  temCoparticipacao?: boolean
  fontSize?: number
}

export function resolveCoparticipacaoSelo(
  valor: string | undefined | null,
  temCoparticipacao?: boolean
): { label: CoparticipacaoSimNao; tem: boolean } {
  const label = coparticipacaoSimNaoLabel(valor)
  const tem = temCoparticipacao ?? temCoparticipacaoFromValor(valor)
  return { label, tem }
}

export function CoparticipacaoSelo({ valor, temCoparticipacao, fontSize = 10 }: Props) {
  const { label, tem } = resolveCoparticipacaoSelo(valor, temCoparticipacao)

  if (label === '—') {
    return (
      <Typography sx={{ fontSize, fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>
        —
      </Typography>
    )
  }

  const bg = tem ? '#E8F8F2' : '#f1f5f9'
  const border = tem ? '#3DAA86' : '#cbd5e1'
  const color = tem ? '#1F7A5C' : '#64748b'

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
        <CheckCircleIcon sx={{ fontSize: fontSize + 4, color: '#3DAA86' }} />
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

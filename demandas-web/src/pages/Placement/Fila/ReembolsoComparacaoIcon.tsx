import React from 'react'
import { Box } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import type { ComparacaoReembolsoVsAtual } from './placementComparativoReembolso'

const COR_ACIMA = '#1b8a5a'
const COR_ABAIXO = '#c62828'
const COR_IGUAL = '#009FDF'

type Props = {
  comparacao: ComparacaoReembolsoVsAtual | null | undefined
  size?: number
}

function IconChip({
  color,
  title,
  size,
  children,
}: {
  color: string
  title: string
  size: number
  children: React.ReactNode
}) {
  const box = Math.max(18, size + 4)
  return (
    <Box
      component="span"
      title={title}
      sx={{
        width: box,
        height: box,
        borderRadius: '50%',
        bgcolor: `${color}16`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      {children}
    </Box>
  )
}

export function ReembolsoComparacaoIcon({ comparacao, size = 14 }: Props) {
  if (!comparacao) return null

  if (comparacao === 'acima') {
    return (
      <IconChip color={COR_ACIMA} title="Maior que o cenário atual" size={size}>
        <TrendingUpIcon sx={{ fontSize: size, color: COR_ACIMA }} />
      </IconChip>
    )
  }
  if (comparacao === 'abaixo') {
    return (
      <IconChip color={COR_ABAIXO} title="Menor que o cenário atual" size={size}>
        <TrendingDownIcon sx={{ fontSize: size, color: COR_ABAIXO }} />
      </IconChip>
    )
  }
  return (
    <IconChip color={COR_IGUAL} title="Igual ao cenário atual" size={size}>
      <Box
        component="span"
        sx={{
          fontSize: Math.max(10, size - 1),
          fontWeight: 800,
          color: COR_IGUAL,
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
      >
        =
      </Box>
    </IconChip>
  )
}

export function ReembolsoComparacaoLegenda({ fontSize = 8 }: { fontSize?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ReembolsoComparacaoIcon comparacao="acima" size={fontSize + 4} />
        <span>maior que o atual</span>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ReembolsoComparacaoIcon comparacao="abaixo" size={fontSize + 4} />
        <span>menor que o atual</span>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ReembolsoComparacaoIcon comparacao="igual" size={fontSize + 4} />
        <span>igual ao atual</span>
      </span>
    </span>
  )
}

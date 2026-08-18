import React from 'react'
import { Box, Typography } from '@mui/material'
import { formatCelulaPlanoLabel, type DiferencialCelulaCotacao } from './placementConsolidandoDados'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'

const FONT = SLIDE_FONT
const MUTED = SLIDE_COLORS.muted
const PRIMARY = SLIDE_COLORS.primary

type Props = {
  celulas: DiferencialCelulaCotacao[] | undefined
  tabColor?: string
  variant?: 'table' | 'infografico'
}

export function DiferencialCelulaContent({ celulas, tabColor, variant = 'table' }: Props) {
  if (!celulas?.length) {
    return (
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: variant === 'infografico' ? 9 : 10,
          fontWeight: 600,
          color: MUTED,
          textAlign: variant === 'infografico' ? 'center' : 'left',
        }}
      >
        —
      </Typography>
    )
  }

  const accent = tabColor ?? SLIDE_COLORS.infoLight

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: variant === 'infografico' ? 0.55 : 0.4,
        width: '100%',
        alignItems: variant === 'infografico' ? 'center' : 'stretch',
      }}
    >
      {celulas.map((c) => {
        const plano = formatCelulaPlanoLabel(c)
        const texto = c.texto.trim()
        if (!texto) return null
        return (
          <Box
            key={c.id}
            sx={{
              width: '100%',
              px: variant === 'infografico' ? 1 : 0.5,
              py: variant === 'infografico' ? 0.5 : 0.35,
              borderRadius: variant === 'infografico' ? 1.5 : 1,
              bgcolor: variant === 'infografico' ? `${accent}12` : 'transparent',
              border: variant === 'infografico' ? `1px solid ${accent}55` : 'none',
              boxSizing: 'border-box',
            }}
          >
            <Typography
              sx={{
                fontFamily: FONT,
                fontSize: variant === 'infografico' ? 9 : 10,
                fontWeight: 500,
                color: PRIMARY,
                lineHeight: 1.35,
                textAlign: variant === 'infografico' ? 'center' : 'left',
                wordBreak: 'break-word',
              }}
            >
              {plano ? (
                <>
                  <Box component="span" sx={{ fontWeight: 800 }}>
                    {plano}:
                  </Box>{' '}
                  {texto}
                </>
              ) : (
                texto
              )}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

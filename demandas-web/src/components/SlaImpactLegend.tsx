import { Box, Chip, Stack, Typography } from '@mui/material'
import { SLA_IMPACTO_LEGEND } from '../pages/slaImpact'

type SlaImpactLegendProps = {
  /** Exibe título "Legenda de impacto" acima dos chips */
  showTitle?: boolean
  size?: 'small' | 'medium'
}

export function SlaImpactLegend({ showTitle = true, size = 'small' }: SlaImpactLegendProps) {
  return (
    <Box>
      {showTitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          Legenda de impacto
        </Typography>
      ) : null}
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        {SLA_IMPACTO_LEGEND.map((item) => (
          <Chip
            key={item.value}
            size={size}
            label={item.label}
            color={item.color}
            variant="outlined"
          />
        ))}
      </Stack>
    </Box>
  )
}

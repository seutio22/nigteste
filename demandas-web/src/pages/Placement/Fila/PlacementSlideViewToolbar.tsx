import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined'
import type { PlacementSlideViewMode } from './placementSlidesCatalog'

type Props = {
  value: PlacementSlideViewMode
  onChange: (next: PlacementSlideViewMode) => void
  disabled?: boolean
}

export function PlacementSlideViewToolbar({ value, onChange, disabled }: Props) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={1}
      sx={{
        px: { xs: 1.5, md: 2 },
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        Modo de exibição desta sessão
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={value}
        disabled={disabled}
        onChange={(_, next: PlacementSlideViewMode | null) => next && onChange(next)}
      >
        <ToggleButton value="compacto">
          <SlideshowIcon sx={{ fontSize: 18, mr: 0.75 }} />
          Slide compacto
        </ToggleButton>
        <ToggleButton value="detalhado">
          <ViewAgendaOutlinedIcon sx={{ fontSize: 18, mr: 0.75 }} />
          Detalhado
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  )
}

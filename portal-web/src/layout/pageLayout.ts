import type { SxProps, Theme } from '@mui/material/styles'

/** Recuo e ritmo vertical alinhados à carteira de seguros (`ApolicePage`). */
export const pageShellSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  px: { xs: 1.5, sm: 2, md: 2.5, lg: 3 },
  py: { xs: 2, sm: 2.5, md: 3 },
}

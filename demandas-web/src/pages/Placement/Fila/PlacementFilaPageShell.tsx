import { Box } from '@mui/material'

type Props = {
  children: React.ReactNode
}

/** Layout da fila Placement: usa toda a largura útil, alinhado ao menu lateral. */
export function PlacementFilaPageShell({ children }: Props) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        mx: 0,
        py: { xs: 0.5, md: 1 },
        px: 0,
      }}
    >
      {children}
    </Box>
  )
}

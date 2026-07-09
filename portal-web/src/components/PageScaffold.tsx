import { Box, type BoxProps } from '@mui/material'
import { pageShellSx } from '../layout/pageLayout'

/** Conteúdo principal com a mesma largura útil e margens que a carteira de seguros. */
export default function PageScaffold({ children, sx, ...rest }: BoxProps) {
  return (
    <Box sx={[pageShellSx, ...(sx ? (Array.isArray(sx) ? sx : [sx]) : [])]} {...rest}>
      {children}
    </Box>
  )
}

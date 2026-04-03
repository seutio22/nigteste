import { Link as RouterLink } from 'react-router-dom'
import { Button, Container, Typography } from '@mui/material'

export default function NotFoundPage() {
  return (
    <Container sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Página não encontrada
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        O endereço não existe neste portal.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Voltar ao início
      </Button>
    </Container>
  )
}

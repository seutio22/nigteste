import { Link as RouterLink } from 'react-router-dom'
import { Button, Typography } from '@mui/material'
import PageScaffold from '../components/PageScaffold'

export default function NotFoundPage() {
  return (
    <PageScaffold sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Página não encontrada
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        O endereço não existe neste portal.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Voltar ao início
      </Button>
    </PageScaffold>
  )
}

import { Box, Button, Container, Paper, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleLabel: Record<string, string> = {
  COLLABORATOR: 'Colaborador',
  REQUESTER_MANAGER: 'Gestor (equipe)',
  PORTAL_OPERATOR: 'Operador (fila)',
  PORTAL_ADMIN: 'Administrador do portal',
}

export default function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Minha conta
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Nome
        </Typography>
        <Typography sx={{ mb: 2 }}>{user?.name}</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          E-mail
        </Typography>
        <Typography sx={{ mb: 2 }}>{user?.email}</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Perfil
        </Typography>
        <Typography sx={{ mb: 3 }}>{roleLabel[user?.role || ''] || user?.role || '—'}</Typography>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => {
            logout()
            navigate('/entrar')
          }}
        >
          Sair da conta
        </Button>
      </Paper>
    </Container>
  )
}

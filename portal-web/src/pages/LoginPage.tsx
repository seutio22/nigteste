import { useState, useLayoutEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useLayoutEffect(() => {
    document.title = 'Portal do colaborador — Entrar'
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const msg = await login(email, password)
    setBusy(false)
    if (msg) setErr(msg)
    else navigate('/')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'grey.50',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 3,
        px: 2,
      }}
    >
      <Container maxWidth="sm" sx={{ py: 0, width: '100%' }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 32px rgba(5,0,50,0.08)' }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Portal do colaborador
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Entrar na sua conta (e-mail e palavra-passe do <strong>portal</strong> — não use credenciais de outros sistemas).
        </Typography>
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <Box component="form" onSubmit={onSubmit}>
          <TextField
            fullWidth
            label="E-mail"
            type="email"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <TextField
            fullWidth
            label="Senha"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={busy}
            sx={{ mt: 3, py: 1.5 }}
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
        </Box>
        <Typography sx={{ mt: 2 }} variant="body2">
          Não tem conta?{' '}
          <Link component={RouterLink} to="/cadastro">
            Cadastre-se
          </Link>
        </Typography>
        <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
          Depois de entrar, use o menu <strong>Ajuda</strong> para orientações sobre solicitações e protocolos.
        </Typography>
      </Paper>
      </Container>
    </Box>
  )
}

import { useState } from 'react'
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

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) {
      setErr('Senha deve ter pelo menos 8 caracteres.')
      return
    }
    setBusy(true)
    const msg = await register(name, email, password)
    setBusy(false)
    if (msg) setErr(msg)
    else navigate('/')
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 32px rgba(5,0,50,0.08)' }}>
        <Typography variant="h5" gutterBottom>
          Criar conta
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Cadastro exclusivo do portal. Não utiliza o mesmo banco de usuários do Nexus.
        </Typography>
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <Box component="form" onSubmit={onSubmit}>
          <TextField
            fullWidth
            label="Nome"
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
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
            label="Senha (mín. 8 caracteres)"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={busy}
            sx={{ mt: 3, py: 1.5 }}
          >
            {busy ? 'Criando…' : 'Cadastrar'}
          </Button>
        </Box>
        <Typography sx={{ mt: 2 }} variant="body2">
          Já tem conta?{' '}
          <Link component={RouterLink} to="/entrar">
            Entrar
          </Link>
        </Typography>
      </Paper>
    </Container>
  )
}

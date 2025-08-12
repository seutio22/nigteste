import { Box, Button, Container, Paper, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    try {
      const data = await api.post('/auth/login', { email, password })
      useAuthStore.getState().setAuth(data.token, data.user)
      navigate('/')
    } catch (err: any) {
      alert(err?.message || 'Falha ao entrar')
    }
  }

  return (
    <Container maxWidth="sm" sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <Paper sx={{ p: 4, width: '100%' }}>
        <Typography variant="h5" gutterBottom>Entrar</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Senha" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="contained">Entrar</Button>
        </Box>
      </Paper>
    </Container>
  )
}



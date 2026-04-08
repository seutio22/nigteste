import React, { useState } from 'react'
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  TextField, 
  Button,
  InputAdornment,
  IconButton,
  Alert,
  Fade
} from '@mui/material'
import { 
  Email, 
  Lock, 
  Visibility, 
  VisibilityOff
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.local'
import { useAuthStore } from '../store/authStore'
import { notifyMonitoringLogin } from '../lib/monitoringClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [requirePasswordChange, setRequirePasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function finalizeLogin(data: any) {
    console.log('✅ Login bem-sucedido para:', data.user.name)
    
    // 2. Salvar o token PRIMEIRO para que as próximas requisições funcionem
    useAuthStore.getState().setAuth(data.token, data.user)
    console.log('✅ Token salvo no authStore')
    
    // 3. Buscar permissões atualizadas do usuário no banco de dados
    console.log('🔍 Buscando permissões do usuário no banco de dados...')
    
    try {
      // Agora a requisição terá o token disponível
      const userData = await api.get(`/users/${data.user.id}`)
      
      if (userData) {
        console.log('✅ Permissões carregadas do banco de dados')
        console.log('📋 Permissões:', userData.permissions)
        
        // Parse das permissões
        let permissions = null
        if (userData.permissions) {
          try {
            permissions = typeof userData.permissions === 'string' 
              ? JSON.parse(userData.permissions) 
              : userData.permissions
            console.log('✅ Permissões parseadas com sucesso')
            console.log('🔐 Permissão DELETE para CADASTRO:', permissions.cadastro?.delete)
          } catch (e) {
            console.error('❌ Erro ao parsear permissões:', e)
          }
        }
        
        // 4. Atualizar o authStore com permissões e vínculo de departamento (GET /users/:id é a fonte de verdade)
          useAuthStore.getState().setAuth(data.token, {
            ...data.user,
            permissions: permissions,
            passwordUpdatedAt: userData.passwordUpdatedAt ?? data.user.passwordUpdatedAt,
            departmentId:
              userData.departmentId !== undefined && userData.departmentId !== null
                ? userData.departmentId
                : data.user.departmentId,
            department:
              userData.department !== undefined ? userData.department : data.user.department
          })
        
        console.log('✅ AuthStore atualizado com permissões do banco de dados')
      } else {
        console.warn('⚠️  Não foi possível carregar permissões do usuário')
      }
    } catch (permError) {
      console.error('❌ Erro ao buscar permissões:', permError)
      console.warn('⚠️  Continuando com permissões do login')
    }

    const { token: tok, user: u } = useAuthStore.getState()
    if (tok && u?.id) notifyMonitoringLogin(tok, u.id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    
    setIsLoading(true)
    setError('')
    
    try {
      if (requirePasswordChange) {
        if (!newPassword || !confirmNewPassword) {
          setError('Informe a nova senha e a confirmação')
          setIsLoading(false)
          return
        }
        
        if (newPassword.length < 6) {
          setError('A nova senha deve ter pelo menos 6 caracteres')
          setIsLoading(false)
          return
        }
        
        if (newPassword !== confirmNewPassword) {
          setError('As senhas não coincidem')
          setIsLoading(false)
          return
        }
        
        await api.changePassword({
          email,
          currentPassword: password,
          newPassword
        })
        
        const data = await api.login({ email, password: newPassword })
        setPassword(newPassword)
        await finalizeLogin(data)
        setRequirePasswordChange(false)
        setNewPassword('')
        setConfirmNewPassword('')
        navigate('/')
        return
      }

      // 1. Fazer login
      const data = await api.login({ email, password })
      await finalizeLogin(data)
      navigate('/')
    } catch (err: unknown) {
      let errorMessage = 'Falha ao entrar. Verifique suas credenciais e tente novamente.'
      let requiresPasswordChange = false

      if (err && typeof err === 'object') {
        const anyErr = err as any

        if (anyErr?.responseText) {
          try {
            const parsed = JSON.parse(anyErr.responseText)
            if (parsed?.message) {
              errorMessage = parsed.message
            }
            if (parsed?.code === 'PASSWORD_EXPIRED' || parsed?.requirePasswordChange) {
              requiresPasswordChange = true
            }
          } catch (parseError) {
            // resposta não era JSON válido, manter mensagem padrão
            console.warn('Não foi possível interpretar resposta de erro do login:', parseError)
          }
        } else if (err instanceof Error && err.message) {
          errorMessage = err.message
        }
      }

      if (requiresPasswordChange) {
        setRequirePasswordChange(true)
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: 'url(/capa_NIG.png)',
        backgroundSize: 'auto 100%', // altura 100%, largura proporcional – sem estourar
        backgroundPosition: 'left center', // imagem colada à esquerda
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#fff', // à direita da imagem fica só branco, sem cortes laterais
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Container principal: fundo à esquerda (capa), formulário à direita */}
      <Container maxWidth="lg" sx={{ maxWidth: '100%', px: { xs: 2, md: 4 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 4,
            alignItems: 'center',
            minHeight: { md: '80vh' }
          }}
        >
          {/* Lado esquerdo - apenas a capa (fundo já exibido pela Box pai) */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, minHeight: 1 }} />

          {/* Lado direito - Formulário */}
          <Box
            sx={{
              zIndex: 1
            }}
          >
            <Paper
              elevation={24}
              sx={{
                p: 4,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                transform: 'translateY(0)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 35px 60px -15px rgba(0, 0, 0, 0.3)'
                }
              }}
            >
              {/* Header do formulário */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: '#050032',
                    mb: 1
                  }}
                >
                  Bem-vindo de volta
                </Typography>
                
                <Typography
                  variant="body1"
                  sx={{
                    color: '#A3B5BC',
                    fontSize: '1.1rem',
                    fontWeight: 300
                  }}
                >
                  Faça login para acessar sua conta
                </Typography>
              </Box>

              {/* Formulário */}
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 3 }}>
                {/* Campo de email */}
                <TextField
                  label="E-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: '#009FDF' }} />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#009FDF',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#009FDF',
                      }
                    }
                  }}
                />

                {/* Campo de senha */}
                <TextField
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: '#009FDF' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#009FDF',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#009FDF',
                      }
                    }
                  }}
                />

                {requirePasswordChange && (
                  <>
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      Sua senha expirou. Defina uma nova senha para continuar.
                    </Alert>
                    <TextField
                      label="Nova senha"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#009FDF' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                            >
                              {showNewPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: '#009FDF',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#009FDF',
                          }
                        }
                      }}
                    />
                    <TextField
                      label="Confirmar nova senha"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ color: '#009FDF' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                              edge="end"
                            >
                              {showConfirmNewPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: '#009FDF',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#009FDF',
                          }
                        }
                      }}
                    />
                  </>
                )}

                {/* Mensagem de erro */}
                {error && (
                  <Fade in={!!error}>
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                      {error}
                    </Alert>
                  </Fade>
                )}

                {/* Botão de login */}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #002561 0%, #009FDF 100%)',
                    boxShadow: '0 10px 25px rgba(0, 37, 97, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #001a42 0%, #009FDF 100%)',
                      boxShadow: '0 15px 35px rgba(0, 159, 223, 0.4)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      background: '#DCDFE3',
                      boxShadow: 'none',
                      transform: 'none'
                    }
                  }}
                >
                  {isLoading ? (requirePasswordChange ? 'Alterando...' : 'Entrando...') : (requirePasswordChange ? 'Alterar senha' : 'Entrar')}
                </Button>

              </Box>
            </Paper>
          </Box>
        </Box>
    </Container>

      {/* Animações CSS */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          
          @keyframes techGlow {
            0% { 
              textShadow: 0 2px 4px rgba(0, 159, 223, 0.3),
                         0 0 10px rgba(0, 159, 223, 0.2),
                         0 0 20px rgba(0, 37, 97, 0.1);
            }
            100% { 
              textShadow: 0 2px 4px rgba(0, 159, 223, 0.5),
                         0 0 15px rgba(0, 159, 223, 0.4),
                         0 0 30px rgba(0, 37, 97, 0.2);
            }
          }
          
          @keyframes techPulse {
            0%, 100% { 
              opacity: 0.4;
              transform: scale(1);
            }
            50% { 
              opacity: 0.7;
              transform: scale(1.02);
            }
          }
          
          @keyframes techShine {
            0% { 
              transform: translateX(-100%);
              opacity: 0;
            }
            50% { 
              opacity: 1;
            }
            100% { 
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
    </Box>
  )
}



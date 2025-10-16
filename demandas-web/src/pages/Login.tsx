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

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // 1. Fazer login
      const data = await api.login({ email, password })
      
      console.log('✅ Login bem-sucedido para:', data.user.name)
      
      // 2. Buscar permissões atualizadas do usuário no banco de dados
      console.log('🔍 Buscando permissões do usuário no banco de dados...')
      
      try {
        // Usar a API centralizada em vez de URL hardcoded
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
          
          // 3. Atualizar o authStore com as permissões do banco
          useAuthStore.getState().setAuth(data.token, {
            ...data.user,
            permissions: permissions
          })
          
          console.log('✅ AuthStore atualizado com permissões do banco de dados')
        } else {
          console.warn('⚠️  Não foi possível carregar permissões, usando dados do login')
          useAuthStore.getState().setAuth(data.token, data.user)
        }
      } catch (permError) {
        console.error('❌ Erro ao buscar permissões:', permError)
        console.warn('⚠️  Continuando com dados do login')
        useAuthStore.getState().setAuth(data.token, data.user)
      }
      
      navigate('/')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao entrar';
      setError(errorMessage);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 25%, #cbd5e0 50%, #a0aec0 75%, #718096 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Elementos decorativos de fundo - estilo MDS */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          left: '-20%',
          width: '140%',
          height: '140%',
          background: 'radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
          animation: 'float 25s ease-in-out infinite'
        }}
      />
      
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '15%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 20s ease-in-out infinite reverse'
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 18s ease-in-out infinite'
        }}
      />

      {/* Padrão de pontos sutis */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.15) 1px, transparent 0)
          `,
          backgroundSize: '20px 20px',
          opacity: 0.3
        }}
      />

      {/* Container principal */}
      <Container maxWidth="md">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 4,
            alignItems: 'center'
          }}
        >
          {/* Lado esquerdo - Informações */}
          <Box
            sx={{
              color: '#1e293b',
              textAlign: { xs: 'center', md: 'left' },
              zIndex: 1
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                mb: 2,
                color: '#1e293b',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Plataforma de Demandas
            </Typography>
            
          </Box>

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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    mb: 3
                  }}
                >
                  <Box
                    sx={{
                      width: '70px',
                      height: '70px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <span 
                      style={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        fontSize: '28px',
                        fontFamily: 'Geometria, sans-serif'
                      }}
                    >
                      D
                    </span>
                  </Box>
                  
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      fontFamily: 'Geometria, sans-serif',
                      fontSize: '2.5rem',
                      letterSpacing: '-0.03em',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #7c3aed 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                      position: 'relative',
                      animation: 'techGlow 3s ease-in-out infinite alternate',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-2px',
                        left: '-2px',
                        right: '-2px',
                        bottom: '-2px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #7c3aed 100%)',
                        borderRadius: '12px',
                        padding: '2px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        opacity: 0.4,
                        animation: 'techPulse 2s ease-in-out infinite'
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                        borderRadius: '8px',
                        animation: 'techShine 2.5s ease-in-out infinite'
                      }
                    }}
                  >
                    Dynamic
                  </Typography>
                </Box>
                
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: '#2d3748',
                    mb: 1
                  }}
                >
                  Bem-vindo de volta
                </Typography>
                
                <Typography
                  variant="body1"
                  sx={{
                    color: '#718096',
                    fontSize: '1.1rem'
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
                        <Email sx={{ color: '#3b82f6' }} />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#3b82f6',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
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
                        <Lock sx={{ color: '#3b82f6' }} />
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
                        borderColor: '#3b82f6',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                      }
                    }
                  }}
                />

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
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                    boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      boxShadow: '0 15px 35px rgba(59, 130, 246, 0.4)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      background: '#cbd5e0',
                      boxShadow: 'none',
                      transform: 'none'
                    }
                  }}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>

                {/* Links adicionais */}
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#718096',
                      '& a': {
                        color: '#3b82f6',
                        textDecoration: 'none',
                        fontWeight: 600,
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }
                    }}
                  >
                    Esqueceu sua senha? <a href="#">Clique aqui</a>
                  </Typography>
                </Box>
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
              textShadow: 0 2px 4px rgba(59, 130, 246, 0.3),
                         0 0 10px rgba(59, 130, 246, 0.2),
                         0 0 20px rgba(59, 130, 246, 0.1);
            }
            100% { 
              textShadow: 0 2px 4px rgba(59, 130, 246, 0.5),
                         0 0 15px rgba(59, 130, 246, 0.4),
                         0 0 30px rgba(59, 130, 246, 0.2);
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



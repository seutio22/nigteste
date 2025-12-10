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

// Componente de Logo - tenta carregar o arquivo real, mostra placeholder apenas se falhar
const LogoComponent = () => {
  const [logoError, setLogoError] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)

  const handleError = () => {
    if (retryCount < 2) {
      // Tentar novamente com timestamp para forçar reload
      setRetryCount(prev => prev + 1)
      const img = document.querySelector('img[alt="Dynamic Tecnologia"]') as HTMLImageElement
      if (img) {
        img.src = `/dynamic-logo.png?t=${Date.now()}&retry=${retryCount + 1}`
      }
    } else {
      // Após 2 tentativas, mostrar placeholder
      console.warn('⚠️ Logo não encontrado após múltiplas tentativas, usando placeholder')
      setLogoError(true)
    }
  }

  return (
    <Box
      sx={{
        width: { xs: '220px', md: '260px' },
        height: { xs: '70px', md: '80px' },
        mx: 'auto',
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {!logoError ? (
        <Box
          component="img"
          src="/dynamic-logo.png"
          alt="Dynamic Tecnologia"
          onError={handleError}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 15px 35px rgba(37,99,235,0.35))',
            display: 'block'
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#3b82f6',
            borderRadius: 2,
            filter: 'drop-shadow(0 15px 35px rgba(37,99,235,0.35))'
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: 'white',
              fontWeight: 700,
              letterSpacing: 1
            }}
          >
            DYNAMIC
          </Typography>
        </Box>
      )}
    </Box>
  )
}

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
          
          // 4. Atualizar o authStore com as permissões do banco
          useAuthStore.getState().setAuth(data.token, {
            ...data.user,
            permissions: permissions
          })
          
          console.log('✅ AuthStore atualizado com permissões do banco de dados')
        } else {
          console.warn('⚠️  Não foi possível carregar permissões do usuário')
        }
      } catch (permError) {
        console.error('❌ Erro ao buscar permissões:', permError)
        console.warn('⚠️  Continuando com permissões do login')
      }
      
      navigate('/')
    } catch (err: unknown) {
      let errorMessage = 'Falha ao entrar. Verifique suas credenciais e tente novamente.'

      if (err && typeof err === 'object') {
        const anyErr = err as any

        if (anyErr?.responseText) {
          try {
            const parsed = JSON.parse(anyErr.responseText)
            if (parsed?.message) {
              errorMessage = parsed.message
            }
          } catch (parseError) {
            // resposta não era JSON válido, manter mensagem padrão
            console.warn('Não foi possível interpretar resposta de erro do login:', parseError)
          }
        } else if (err instanceof Error && err.message) {
          errorMessage = err.message
        }
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
                <LogoComponent />
                
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



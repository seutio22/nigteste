import React, { useState } from 'react'
import {
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Box,
  Chip,
  Divider,
  Fade,
  Slide
} from '@mui/material'
import {
  Send,
  Delete,
  Message,
  Person,
  AdminPanelSettings,
  MoreVert
} from '@mui/icons-material'
import { useComunicadoStore } from '../store/comunicadoStore'
import { useAuthStore } from '../store/authStore'

interface Comentario {
  id: string
  autor: string
  autorId: string
  autorRole?: string
  conteudo: string
  dataCriacao: string
  status: string
}

interface ComentariosSectionProps {
  comunicadoId: string
  comentarios: Comentario[]
}

export function ComentariosSection({ comunicadoId, comentarios }: ComentariosSectionProps) {
  const [novoComentario, setNovoComentario] = useState('')
  const [isEnviando, setIsEnviando] = useState(false)
  const comunicadoStore = useComunicadoStore()
  const { user } = useAuthStore()

  const handleEnviarComentario = async () => {
    if (!novoComentario.trim() || !user) return

    setIsEnviando(true)
    try {
      await comunicadoStore.addComentario(comunicadoId, {
        autor: user.name,
        autorId: user.id,
        autorRole: user.role,
        conteudo: novoComentario.trim()
      })
      setNovoComentario('')
    } catch (error) {
      console.error('Erro ao enviar comentário:', error)
    } finally {
      setIsEnviando(false)
    }
  }

  const handleRemoverComentario = async (comentarioId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este comentário?')) return

    try {
      await comunicadoStore.removeComentario(comunicadoId, comentarioId)
    } catch (error) {
      console.error('Erro ao remover comentário:', error)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'agora mesmo'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min atrás`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`
    return `${Math.floor(diffInSeconds / 86400)}d atrás`
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return '#FCDA4F'
      case 'manager': return '#8b5cf6'
      case 'user': return '#00A649'
      default: return '#6b7280'
    }
  }

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <AdminPanelSettings sx={{ fontSize: 14 }} />
      default: return <Person sx={{ fontSize: 14 }} />
    }
  }

  return (
    <Paper 
      className="p-8 shadow-xl border-0"
      sx={{
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Header */}
      <Box className="flex items-center gap-3 mb-6">
        <Box 
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          sx={{
            background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
            boxShadow: '0 8px 32px rgba(5, 0, 50, 0.3)'
          }}
        >
          <Message className="text-white" />
        </Box>
        <Box>
          <Typography variant="h5" className="font-bold text-slate-800">
            Comentários
          </Typography>
          <Typography variant="body2" className="text-slate-500">
            {comentarios.length} comentário{comentarios.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      {/* Input de Novo Comentário */}
      {user && (
        <Fade in={true} timeout={600}>
          <Box className="mb-8">
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Adicione um comentário..."
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              variant="outlined"
              disabled={isEnviando}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  '&:hover': {
                    border: '1px solid rgba(5, 0, 50, 0.3)',
                  },
                  '&.Mui-focused': {
                    border: '2px solid #050032',
                    boxShadow: '0 0 0 3px rgba(5, 0, 50, 0.1)',
                  }
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.95rem',
                  lineHeight: 1.5
                }
              }}
            />
            <Box className="flex justify-end mt-3">
              <Button
                variant="contained"
                onClick={handleEnviarComentario}
                disabled={!novoComentario.trim() || isEnviando}
                startIcon={<Send />}
                sx={{
                  borderRadius: '12px',
                  px: 3,
                  py: 1,
                  background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
                  boxShadow: '0 4px 20px rgba(5, 0, 50, 0.4)',
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    boxShadow: '0 6px 25px rgba(5, 0, 50, 0.5)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8'
                  }
                }}
              >
                {isEnviando ? 'Enviando...' : 'Enviar Comentário'}
              </Button>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Lista de Comentários */}
      <Box className="space-y-4">
        {comentarios.length === 0 ? (
          <Fade in={true} timeout={800}>
            <Box className="text-center py-12">
              <Box 
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                sx={{
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  border: '2px dashed #cbd5e1'
                }}
              >
                <Message className="text-slate-400" sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h6" className="text-slate-500 mb-2">
                Nenhum comentário ainda
              </Typography>
              <Typography variant="body2" className="text-slate-400">
                Seja o primeiro a comentar neste comunicado!
              </Typography>
            </Box>
          </Fade>
        ) : (
          comentarios.map((comentario, index) => (
            <Slide 
              key={comentario.id} 
              in={true} 
              timeout={400 + (index * 100)}
              direction="up"
            >
              <Box
                className="p-6 rounded-2xl border-0"
                sx={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <Box className="flex items-start justify-between mb-4">
                  <Box className="flex items-center gap-3">
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}
                    >
                      {comentario.autor[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Box className="flex items-center gap-2 mb-1">
                        <Typography variant="subtitle2" className="font-semibold text-slate-800">
                          {comentario.autor}
                        </Typography>
                        {comentario.autorRole && (
                          <Chip
                            icon={getRoleIcon(comentario.autorRole)}
                            label={comentario.autorRole}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: getRoleColor(comentario.autorRole),
                              color: 'white',
                              '& .MuiChip-icon': {
                                color: 'white'
                              }
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" className="text-slate-500">
                        {getTimeAgo(comentario.dataCriacao)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {(user?.role === 'admin' || user?.id === comentario.autorId) && (
                    <IconButton
                      onClick={() => handleRemoverComentario(comentario.id)}
                      size="small"
                      sx={{
                        color: '#DA3832',
                        '&:hover': {
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Box>

                <Typography 
                  variant="body1" 
                  className="text-slate-700 leading-relaxed"
                  sx={{ lineHeight: 1.6 }}
                >
                  {comentario.conteudo}
                </Typography>
              </Box>
            </Slide>
          ))
        )}
      </Box>
    </Paper>
  )
}

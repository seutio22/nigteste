import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  Button, 
  Typography, 
  Paper,
  Chip,
  TextField,
  Avatar,
  IconButton,
  Divider,
  Box,
  Container,
  Fade,
  Skeleton,
  Alert
} from '@mui/material'
import { 
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Visibility,
  Schedule,
  Person,
  Tag,
  Share,
  Bookmark,
  BookmarkBorder,
  TrendingUp,
  TrendingDown,
  Star,
  StarBorder,
  Delete
} from '@mui/icons-material'
import { useComunicadoStore } from '../../store/comunicadoStore'
import { useAuthStore } from '../../store/authStore'
import { ComentariosSection } from '../../components/ComentariosSection'
import { RichTextEditor } from '../../components/RichTextEditor'

export default function ComunicadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const comunicadoStore = useComunicadoStore()
  const { user } = useAuthStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [showNotification, setShowNotification] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // Estado para controlar salvamento

  const comunicado = comunicadoStore.items.find(item => item.id === id)

  // Verificar se deve abrir em modo de edição baseado na URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    // Verificar se está em modo de edição
    if (searchParams.get('edit') === 'true') {
      // As permissões são controladas pelo painel de usuário, não por código
      setIsEditing(true)
    }
  }, [location.search, user?.role, navigate, id])

  // Buscar comunicado quando o ID mudar
  useEffect(() => {
    if (id) {
      comunicadoStore.fetchComunicado(id)
    }
  }, [id, comunicadoStore])

  // Definir editContent quando o comunicado estiver disponível
  useEffect(() => {
    if (comunicado && !isEditing) {
      setEditContent(comunicado.conteudo)
    }
  }, [comunicado, isEditing])

  // Função para mostrar notificações
  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message)
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 3000)
  }

  // Função para salvar alterações
  const handleSaveEdit = async () => {
    if (isSaving) return // Evitar múltiplas chamadas
    
    setIsSaving(true)
    
    try {
      // Verificar se há mudanças
      if (!comunicado || editContent === comunicado.conteudo) {
        showNotificationMessage('Nenhuma alteração detectada')
        setIsEditing(false)
        return
      }

      // Salvar via store
      await comunicadoStore.update(comunicado.id, { conteudo: editContent })
      
      // Recarregar dados do backend
      await comunicadoStore.fetchComunicado(comunicado.id)
      
      // Sair do modo de edição
      setIsEditing(false)
      
      // Mostrar sucesso
      showNotificationMessage('Alterações salvas com sucesso!')
      
    } catch (error) {
      console.error('Erro ao salvar:', error)
      showNotificationMessage('Erro ao salvar alterações!')
    } finally {
      setIsSaving(false)
    }
  }

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setEditContent(comunicado?.conteudo || '')
    setIsEditing(false)
    showNotificationMessage('Edição cancelada')
  }



  // Função para publicar rascunho
  const handlePublicarRascunho = async () => {
    if (!comunicado) {
      showNotificationMessage('Comunicado não encontrado')
      return
    }

    if (window.confirm('Tem certeza que deseja publicar este rascunho? Ele ficará visível para todos os usuários.')) {
      try {
        await comunicadoStore.publicarRascunho(comunicado.id)
        showNotificationMessage('Rascunho publicado com sucesso!')
        // Recarregar dados para atualizar o status
        await comunicadoStore.fetchComunicado(comunicado.id)
      } catch (error) {
        console.error('Erro ao publicar rascunho:', error)
        showNotificationMessage('Erro ao publicar rascunho!')
      }
    }
  }

  // Função para excluir comunicado
  const handleDeleteComunicado = async () => {
    if (!comunicado || !user || user.role !== 'admin') {
      showNotificationMessage('Apenas administradores podem excluir comunicados')
      return
    }

    if (window.confirm('Tem certeza que deseja excluir este comunicado? Esta ação não pode ser desfeita.')) {
      try {
        await comunicadoStore.remove(comunicado.id)
        showNotificationMessage('Comunicado excluído com sucesso!')
        // Redirecionar para a lista de comunicados
        window.location.href = '/comunicados'
      } catch (error) {
        console.error('Erro ao excluir comunicado:', error)
        showNotificationMessage('Erro ao excluir comunicado!')
      }
    }
  }

  // Registrar visualização quando o comunicado for carregado
  useEffect(() => {
    if (comunicado && user) {
      // Verificar se o usuário já visualizou este comunicado
      const jaVisualizou = comunicado.visualizacoes?.some(v => v.usuarioId === user.id)
      
      if (!jaVisualizou) {
        // Usar setTimeout para evitar chamadas síncronas que podem causar loop
        const timeoutId = setTimeout(() => {
          comunicadoStore.registrarVisualizacao(comunicado.id, {
            id: user.id,
            name: user.name,
            role: user.role
          })
        }, 100)
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [comunicado?.id, user?.id]) // Remover comunicadoStore das dependências para evitar loop

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta': return 'bg-gradient-to-r from-red-500 to-pink-500'
      case 'Média': return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      case 'Baixa': return 'bg-gradient-to-r from-green-500 to-emerald-500'
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500'
    }
  }

  const getPriorityIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta': return <TrendingUp className="w-4 h-4" />
      case 'Média': return <TrendingDown className="w-4 h-4" />
      case 'Baixa': return <TrendingDown className="w-4 h-4" />
      default: return <TrendingDown className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'Informativo': return '📢'
      case 'Urgente': return '🚨'
      case 'Manutenção': return '🔧'
      case 'Atualização': return '🔄'
      case 'Anúncio': return '📢'
      default: return '📄'
    }
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const created = new Date(date)
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Agora mesmo'
    if (diffInHours < 24) return `${diffInHours}h atrás`
    if (diffInHours < 48) return 'Ontem'
    return created.toLocaleDateString('pt-BR')
  }

  if (!comunicado) {
    return (
      <Container maxWidth="xl" className="py-8">
        <div className="space-y-6">
          <Skeleton variant="rectangular" height={60} />
          <Skeleton variant="rectangular" height={400} />
          <Skeleton variant="rectangular" height={200} />
        </div>
      </Container>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Notificação */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50">
          <Alert 
            severity="info" 
            onClose={() => setShowNotification(false)}
            className="shadow-lg"
          >
            {notificationMessage}
          </Alert>
        </div>
      )}

      {/* Header Principal */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <Container maxWidth="xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/comunicados')}
                  className="text-gray-600 hover:bg-gray-50"
                  sx={{ borderRadius: '8px' }}
                >
                  Voltar
                </Button>
                
                <div>
                  <div className="flex items-center gap-2">
                    <Typography variant="h5" className="font-semibold text-gray-900">
                      {comunicado.titulo}
                    </Typography>
                    {!comunicado.publicado && (
                      <Chip 
                        label="Rascunho" 
                        size="small" 
                        className="bg-yellow-100 text-yellow-800"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </div>
                  <Typography variant="body2" className="text-gray-500">
                    Comunicado
                  </Typography>
                </div>
              </div>
              
              {/* Botões de ação */}
              <div className="flex items-center gap-2">
                {/* Botão Publicar Rascunho - só aparece se for rascunho */}
                {comunicado && !comunicado.publicado && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handlePublicarRascunho}
                    startIcon={<Visibility />}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    sx={{ borderRadius: '8px' }}
                  >
                    Publicar Rascunho
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setIsEditing(true)}
                  startIcon={<Edit />}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  sx={{ borderRadius: '8px' }}
                >
                  Editar
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDeleteComunicado}
                  startIcon={<Delete />}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  sx={{ borderRadius: '8px' }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Conteúdo Principal */}
      <Container maxWidth="xl" className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Principal - Conteúdo */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card Principal do Comunicado */}
            <Paper 
              className="overflow-hidden shadow-sm border border-gray-200"
              sx={{ borderRadius: '12px' }}
            >
              {/* Header do Card */}
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Chip
                      label={comunicado.categoria}
                      size="small"
                      className="bg-blue-100 text-blue-800"
                      sx={{ borderRadius: '6px' }}
                    />
                    <Chip
                      label={comunicado.prioridade}
                      size="small"
                      className={`${
                        comunicado.prioridade === 'Alta' ? 'bg-red-100 text-red-800' :
                        comunicado.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}
                      sx={{ borderRadius: '6px' }}
                    />
                    <Chip
                      label={comunicado.publicado ? 'Publicado' : 'Rascunho'}
                      size="small"
                      className={`${
                        comunicado.publicado 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                      sx={{ borderRadius: '6px' }}
                    />
                  </div>
                </div>

                {/* Meta Informações */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Person className="w-4 h-4" />
                    <span>{comunicado.autor || 'Usuário'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Schedule className="w-4 h-4" />
                    <span>{getTimeAgo(comunicado.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Visibility className="w-4 h-4" />
                    <span>{comunicado.visualizacoes?.length || 0} visualizações</span>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                {isEditing ? (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <RichTextEditor
                      key={`editor-${comunicado?.id}-${isEditing}`}
                      content={editContent}
                      onChange={(content) => {
                        setEditContent(content)
                      }}
                      placeholder="Edite o conteúdo do comunicado aqui..."
                    />
                  </div>
                ) : (
                  <div
                    className="comunicado-content text-gray-700 leading-relaxed"
                    style={{
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                    dangerouslySetInnerHTML={{ __html: comunicado.conteudo }}
                  />
                )}

                {isEditing && (
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={handleCancelEdit} 
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      sx={{ borderRadius: '8px' }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={handleSaveEdit} 
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700"
                      sx={{ borderRadius: '8px' }}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Tags */}
              {(() => {
                try {
                  const tags = typeof comunicado.tags === 'string' ? JSON.parse(comunicado.tags || '[]') : comunicado.tags || [];
                  if (tags && Array.isArray(tags) && tags.length > 0) {
                    return (
                      <div className="px-8 pb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="w-4 h-4 text-slate-400" />
                          <Typography variant="subtitle2" className="font-semibold text-slate-600">
                            Tags:
                          </Typography>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              variant="outlined"
                              className="text-xs bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all duration-300 cursor-pointer"
                              sx={{ borderRadius: '8px' }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                } catch (error) {
                  console.warn('Erro ao processar tags do comunicado:', error);
                  return null;
                }
              })()}
            </Paper>

            {/* Seção de Comentários */}
            <ComentariosSection 
              comunicadoId={comunicado.id}
              comentarios={comunicado.comentarios || []}
            />
          </div>

          {/* Sidebar - Informações e Estatísticas */}
          <div className="space-y-6">
            
            {/* Informações do Comunicado */}
            <Paper 
              className="p-6 shadow-lg border-0"
              sx={{
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}
            >
              <Typography variant="h6" className="mb-4 font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-indigo-600">📋</span>
                Informações do Comunicado
              </Typography>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                  <Typography variant="caption" className="text-slate-500 font-medium uppercase tracking-wide">
                    Categoria
                  </Typography>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl">{getCategoryIcon(comunicado.categoria)}</span>
                    <Typography variant="body1" className="font-semibold text-slate-700">
                      {comunicado.categoria}
                    </Typography>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                  <Typography variant="caption" className="text-slate-500 font-medium uppercase tracking-wide">
                    Prioridade
                  </Typography>
                  <div className="flex items-center gap-2 mt-1">
                    {getPriorityIcon(comunicado.prioridade)}
                    <Typography variant="body1" className="font-semibold text-slate-700">
                      {comunicado.prioridade}
                    </Typography>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                  <Typography variant="caption" className="text-slate-500 font-medium uppercase tracking-wide">
                    Status
                  </Typography>
                  <Chip
                    label={comunicado.publicado ? 'Publicado' : 'Rascunho'}
                    size="small"
                    className={`${
                      comunicado.publicado 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0' 
                        : 'bg-gradient-to-r from-slate-500 to-gray-500 text-white border-0'
                    } font-semibold shadow-md mt-1`}
                    sx={{ borderRadius: '8px' }}
                  />
                </div>

                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                  <Typography variant="caption" className="text-slate-500 font-medium uppercase tracking-wide">
                    Data de Criação
                  </Typography>
                  <Typography variant="body1" className="font-semibold text-slate-700 mt-1">
                    {new Date(comunicado.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </div>

                {comunicado.dataExpiracao && (
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                    <Typography variant="caption" className="text-slate-500 font-medium uppercase tracking-wide">
                      Data de Expiração
                    </Typography>
                    <Typography variant="body1" className="font-semibold text-slate-700 mt-1">
                      {new Date(comunicado.dataExpiracao).toLocaleDateString('pt-BR')}
                    </Typography>
                  </div>
                )}
              </div>
            </Paper>

            {/* Estatísticas */}
            <Paper 
              className="p-6 shadow-lg border-0"
              sx={{
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}
            >
              <Typography variant="h6" className="mb-4 font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-purple-600">📊</span>
                Estatísticas
              </Typography>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <Visibility className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Typography variant="body2" className="text-slate-600">
                          Visualizações
                        </Typography>
                        <Typography variant="h4" className="font-bold text-blue-600">
                          {comunicado.visualizacoes?.length || 0}
                        </Typography>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </Paper>

            {/* Visualizações dos Usuários */}
            {comunicado.visualizacoes && comunicado.visualizacoes.length > 0 && (
              <Paper 
                className="p-6 shadow-lg border-0"
                sx={{
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }}
              >
                <Typography variant="h6" className="mb-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="text-cyan-600">👥</span>
                  Usuários que Visualizaram
                </Typography>
                
                <div className="space-y-3">
                  {comunicado.visualizacoes.slice(-5).reverse().map((visualizacao, index) => (
                    <div key={visualizacao.id || index} className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-3 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar 
                            className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold"
                          >
                            {visualizacao.usuarioNome?.[0] || 'U'}
                          </Avatar>
                          <div>
                            <Typography variant="body2" className="font-semibold text-slate-700">
                              {visualizacao.usuarioNome || 'Usuário'}
                            </Typography>
                            <Typography variant="caption" className="text-slate-500">
                              {visualizacao.usuarioRole || 'Usuário'}
                            </Typography>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Typography variant="caption" className="text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {new Date(visualizacao.dataVisualizacao).toLocaleDateString('pt-BR')}
                          </Typography>
                          <Typography variant="caption" className="block text-slate-400 mt-1">
                            {new Date(visualizacao.dataVisualizacao).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {comunicado.visualizacoes.length > 5 && (
                    <div className="text-center pt-2">
                      <Typography variant="caption" className="text-slate-500">
                        +{comunicado.visualizacoes.length - 5} outras visualizações
                      </Typography>
                    </div>
                  )}
                </div>
              </Paper>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}

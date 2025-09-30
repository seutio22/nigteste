import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  FormControlLabel, 
  Paper,
  Typography,
  Box,
  Alert
} from '@mui/material'
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Tag,
  Warning,
  Info,
  Event,
  Build
} from '@mui/icons-material'
import { useComunicadoStore } from '../../store/comunicadoStore'
import { useAuthStore } from '../../store/authStore'
import { RichTextEditor } from '../../components/RichTextEditor'

export default function ComunicadoNewPage() {
  const navigate = useNavigate()
  const comunicadoStore = useComunicadoStore()
  const { user } = useAuthStore()
  
  
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    categoria: 'Informativo' as const,
    prioridade: 'Média' as const,
    dataExpiracao: '',
    tags: [] as string[]
  })
  
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório'
    }
    
    if (!formData.conteudo.trim()) {
      newErrors.conteudo = 'Conteúdo é obrigatório'
    }
    
    if (formData.titulo.length > 100) {
      newErrors.titulo = 'Título deve ter no máximo 100 caracteres'
    }
    
    // Verificar apenas o texto puro (sem HTML) para validação de tamanho
    const textContent = formData.conteudo.replace(/<[^>]*>/g, '')
    if (textContent.length > 5000) {
      newErrors.conteudo = 'Conteúdo deve ter no máximo 5000 caracteres de texto'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const comunicadoData = {
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        categoria: formData.categoria as 'Urgente' | 'Informativo' | 'Evento' | 'Manutenção',
        prioridade: formData.prioridade as 'Alta' | 'Média' | 'Baixa',
        autor: user?.name || 'Usuário Anônimo',
        autorId: user?.id || 'anonymous-user',
        publicado: false,
        dataExpiracao: formData.dataExpiracao || undefined,
        tags: formData.tags,
        dataPublicacao: undefined
      }
      
      const novoComunicado = await comunicadoStore.add(comunicadoData)
      
      // Redirecionar baseado na ação
      if (false) { // This will be set to true when publishing
        navigate('/comunicados')
      } else if (novoComunicado) {
        navigate(`/comunicados/${novoComunicado.id}`)
      } else {
        navigate('/comunicados')
      }
    } catch (error) {
      console.error('Erro ao criar comunicado:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitPublicar = async () => {
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const comunicadoData = {
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        categoria: formData.categoria as 'Urgente' | 'Informativo' | 'Evento' | 'Manutenção',
        prioridade: formData.prioridade as 'Alta' | 'Média' | 'Baixa',
        autor: user?.name || 'Usuário Anônimo',
        autorId: user?.id || 'anonymous-user',
        publicado: true,
        dataExpiracao: formData.dataExpiracao || undefined,
        tags: formData.tags,
        dataPublicacao: new Date().toISOString()
      }
      
      const novoComunicado = await comunicadoStore.add(comunicadoData)
      
      if (novoComunicado) {
        navigate('/comunicados')
      } else {
        navigate('/comunicados')
      }
    } catch (error) {
      console.error('Erro ao publicar comunicado:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitRascunho = async () => {
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const comunicadoData = {
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        categoria: formData.categoria as 'Urgente' | 'Informativo' | 'Evento' | 'Manutenção',
        prioridade: formData.prioridade as 'Alta' | 'Média' | 'Baixa',
        autor: user?.name || 'Usuário Anônimo',
        autorId: user?.id || 'anonymous-user',
        publicado: false,
        dataExpiracao: formData.dataExpiracao || undefined,
        tags: formData.tags,
        dataPublicacao: undefined
      }
      
      const novoComunicado = await comunicadoStore.add(comunicadoData)
      
      if (novoComunicado) {
        navigate(`/comunicados/${novoComunicado.id}`)
      } else {
        navigate('/comunicados')
      }
    } catch (error) {
      console.error('Erro ao criar comunicado:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria) {
      case 'Urgente': return <Warning className="text-red-500" />
      case 'Informativo': return <Info className="text-blue-500" />
      case 'Evento': return <Event className="text-green-500" />
      case 'Manutenção': return <Build className="text-orange-500" />
      default: return <Info className="text-blue-500" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate('/comunicados')}
          startIcon={<ArrowLeft />}
          variant="outlined"
          className="text-gray-600"
        >
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Comunicado</h1>
          <p className="text-gray-600 mt-1">Crie um novo comunicado para a equipe</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Formulário */}
        <div className="lg:col-span-2 space-y-6">
          <Paper className="p-6">
            <Typography variant="h6" className="mb-4 flex items-center gap-2">
              {getCategoriaIcon(formData.categoria)}
              Informações do Comunicado
            </Typography>
            
            <div className="space-y-4">
              {/* Título */}
              <TextField
                fullWidth
                label="Título"
                value={formData.titulo}
                onChange={(e) => handleInputChange('titulo', e.target.value)}
                error={!!errors.titulo}
                helperText={errors.titulo || `${formData.titulo.length}/100 caracteres`}
                placeholder="Digite o título do comunicado..."
                inputProps={{ maxLength: 100 }}
              />
              
              {/* Categoria e Prioridade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormControl fullWidth>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={formData.categoria}
                    onChange={(e) => handleInputChange('categoria', e.target.value)}
                    label="Categoria"
                  >
                    <MenuItem value="Urgente">Urgente</MenuItem>
                    <MenuItem value="Informativo">Informativo</MenuItem>
                    <MenuItem value="Evento">Evento</MenuItem>
                    <MenuItem value="Manutenção">Manutenção</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={formData.prioridade}
                    onChange={(e) => handleInputChange('prioridade', e.target.value)}
                    label="Prioridade"
                  >
                    <MenuItem value="Alta">Alta</MenuItem>
                    <MenuItem value="Média">Média</MenuItem>
                    <MenuItem value="Baixa">Baixa</MenuItem>
                  </Select>
                </FormControl>
              </div>
              
                             {/* Conteúdo */}
               <div>
                 <Typography variant="subtitle2" className="mb-2">
                   Conteúdo do Comunicado
                 </Typography>
                 <RichTextEditor
                   content={formData.conteudo}
                   onChange={(content) => handleInputChange('conteudo', content)}
                   placeholder="Digite o conteúdo do comunicado aqui... Use as ferramentas da barra acima para formatar o texto, inserir imagens, links e muito mais!"
                 />
                 {errors.conteudo && (
                   <Typography variant="caption" color="error" className="mt-1 block">
                     {errors.conteudo}
                   </Typography>
                 )}
                 <Typography variant="caption" color="textSecondary" className="mt-1 block">
                   {formData.conteudo.replace(/<[^>]*>/g, '').length}/5000 caracteres
                 </Typography>
               </div>
              
              {/* Tags */}
              <div>
                <Typography variant="subtitle2" className="mb-2">
                  Tags
                </Typography>
                <div className="flex gap-2 mb-2">
                  <TextField
                    size="small"
                    placeholder="Adicionar tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddTag}
                    startIcon={<Tag />}
                    disabled={!newTag.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </div>
              </div>
            </div>
          </Paper>
        </div>
        
        {/* Coluna Lateral - Configurações */}
        <div className="space-y-6">
          {/* Configurações de Publicação */}
          <Paper className="p-6">
            <Typography variant="h6" className="mb-6">
              Configurações
            </Typography>
            
            <div className="space-y-6">
              {/* Data de Expiração */}
              <div>
                <TextField
                  fullWidth
                  label="Data de Expiração (opcional)"
                  type="datetime-local"
                  value={formData.dataExpiracao}
                  onChange={(e) => handleInputChange('dataExpiracao', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="O comunicado será automaticamente arquivado após esta data"
                  sx={{
                    '& .MuiFormHelperText-root': {
                      marginTop: 1,
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </div>
            </div>
          </Paper>
          
          {/* Ações */}
          <Paper className="p-6">
            <Typography variant="h6" className="mb-4">
              Ações
            </Typography>
            
            <div className="space-y-3">
              <Button
                fullWidth
                variant="contained"
                startIcon={<Send />}
                onClick={() => handleSubmitPublicar()}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                Publicar Agora
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Save />}
                onClick={() => handleSubmitRascunho()}
                disabled={isSubmitting}
              >
                Salvar como Rascunho
              </Button>
            </div>
          </Paper>
          
          {/* Dicas */}
          <Paper className="p-6 bg-blue-50 border border-blue-200">
            <Typography variant="h6" className="mb-2 text-blue-800">
              💡 Dicas
            </Typography>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use títulos claros e objetivos</li>
              <li>• Organize o conteúdo em parágrafos</li>
              <li>• Adicione tags relevantes</li>
              <li>• Defina a prioridade adequada</li>
              <li>• Use categorias para organização</li>
            </ul>
          </Paper>
        </div>
      </div>
    </div>
  )
}

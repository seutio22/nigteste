import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Chip, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, IconButton, Tooltip, Card, CardContent, Divider, Paper } from '@mui/material'
import { Copy, Mail, Users, CheckCircle, X, Settings, Send } from 'lucide-react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useMaillingStore } from '../store/maillingStore'

interface EmailComunicacaoModalProps {
  open: boolean
  onClose: () => void
  manutencao: any
}

export function EmailComunicacaoModal({ open, onClose, manutencao }: EmailComunicacaoModalProps) {
  const [destinatarios, setDestinatarios] = useState<string[]>([])
  const [emailsSelecionados, setEmailsSelecionados] = useState<string[]>([])
  const [emailCompleto, setEmailCompleto] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [copiadoEmail, setCopiadoEmail] = useState(false)
  
  const md = useMasterDataStore()
  const maillingStore = useMaillingStore()

  // Carregar dados do Mailling quando o modal abrir
  useEffect(() => {
    if (open && maillingStore.contacts.length === 0) {
      maillingStore.syncFromApi?.()
    }
  }, [open])

  // Gerar e-mail baseado na manutenção
  useEffect(() => {
    if (manutencao && md.clientes.length > 0 && md.operadoras.length > 0 && md.produtos.length > 0) {
      const cliente = md.clientes.find(c => c.id === manutencao.clienteId)
      const operadora = md.operadoras.find(o => o.id === manutencao.operadoraId)
      const produto = md.produtos.find(p => p.id === manutencao.produtoId)
      const sistema = md.sistemas.find(s => s.id === manutencao.sistemaId)
      const tipoServico = md.tiposCadastro.find(t => t.id === manutencao.tipoServicoId)
      const tipo = md.padrao.find(t => t.id === manutencao.tipoId)

      const contrato = manutencao.contratoId ? 
        md.contratos.find(c => c.id === manutencao.contratoId) : null

      const email = `Prezados, bom dia.

Informamos que o contrato abaixo referente ao cliente ${cliente?.nome || 'N/A'} sofreu alteração, sendo:

┌─────────┬─────────────────┬─────────┬─────────────┬─────────────┬─────────────┬─────────────────────────────────────┐
│Contrato │   Operadora     │ Produto │ Atualização │   Subtipo   │    Tipo     │           Descrição                  │
├─────────┼─────────────────┼─────────┼─────────────┼─────────────┼─────────────┼─────────────────────────────────────┤
│${(contrato?.codigo || contrato?.numero || manutencao.ticket || 'N/A').toString().padEnd(9)}│${(operadora?.nome || 'N/A').padEnd(17)}│${(produto?.nome || 'N/A').padEnd(9)}│${(tipoServico?.nome || 'N/A').padEnd(13)}│${(tipo?.nome || 'N/A').padEnd(13)}│${(sistema?.nome || 'N/A').padEnd(13)}│${(manutencao.descricao || 'Alteração realizada').padEnd(37)}│
└─────────┴─────────────────┴─────────┴─────────────┴─────────────┴─────────────┴─────────────────────────────────────┘

O Edge e Move encontram-se atualizados. Solicitamos replicar esta informação com a sua equipe.

Abs,
NIG - Núcleo de Informações Gerenciais`

      setEmailCompleto(email)
    }
  }, [manutencao, md.clientes, md.operadoras, md.produtos, md.sistemas, md.tiposCadastro, md.padrao, md.contratos])

  // Filtrar contatos do Mailling baseado na manutenção
  useEffect(() => {
    if (manutencao && maillingStore.contacts.length > 0) {
      let contatosFiltrados = maillingStore.contacts

      // Filtrar por área se disponível
      if (manutencao.areaId) {
        contatosFiltrados = contatosFiltrados.filter(contato => 
          contato.area === manutencao.areaId
        )
      }

      // Filtrar por grupos relacionados ao cliente
      if (manutencao.clienteId) {
        const cliente = md.clientes.find(c => c.id === manutencao.clienteId)
        if (cliente?.grupoEconomico) {
          contatosFiltrados = contatosFiltrados.filter(contato => 
            contato.grupos?.some((grupoId: string) => 
              md.grupos.find(g => g.id === grupoId)?.nome === cliente.grupoEconomico
            )
          )
        }
      }

      // Extrair e-mails únicos
      const emails = contatosFiltrados
        .map(contato => contato.email)
        .filter((email, index, self) => email && self.indexOf(email) === index)
        .slice(0, 20) // Limitar a 20 e-mails

      setDestinatarios(emails)
    }
  }, [manutencao, maillingStore.contacts, md.clientes, md.grupos])

  const handleCopyDestinatarios = async () => {
    const emailsTexto = emailsSelecionados.join('; ')
    try {
      await navigator.clipboard.writeText(emailsTexto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar destinatários:', err)
    }
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailCompleto)
      setCopiadoEmail(true)
      setTimeout(() => setCopiadoEmail(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar e-mail:', err)
    }
  }

  const handleSelectAll = () => {
    if (emailsSelecionados.length === destinatarios.length) {
      setEmailsSelecionados([])
    } else {
      setEmailsSelecionados([...destinatarios])
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: '700px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      }}
    >
      {/* Header com gradiente */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 3,
          borderRadius: '16px 16px 0 0'
        }}
      >
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-3">
            <Box 
              sx={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Mail className="w-6 h-6" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                Comunicar Alteração de Manutenção
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Envie notificações por e-mail para as equipes responsáveis
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={onClose}
            sx={{ 
              color: 'white',
              background: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { background: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <X className="w-5 h-5" />
          </IconButton>
        </Box>
      </Box>
      
      <DialogContent sx={{ p: 0 }}>
        {/* Informações da Manutenção */}
        <Box sx={{ p: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box className="flex items-center gap-3 mb-3">
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: '8px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Settings className="w-5 h-5 text-white" />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    Manutenção: {manutencao?.ticket || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Cliente: {md.clientes.find(c => c.id === manutencao?.clienteId)?.nome || 'N/A'} | 
                    Sistema: {md.sistemas.find(s => s.id === manutencao?.sistemaId)?.nome || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Seleção de Destinatários */}
        <Box sx={{ p: 3 }}>
          <Box className="flex items-center justify-between mb-4">
            <Box className="flex items-center gap-2">
              <Box 
                sx={{ 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '8px',
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Users className="w-5 h-5 text-white" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Destinatários ({emailsSelecionados.length} selecionados)
              </Typography>
            </Box>
            <Button 
              size="small" 
              onClick={handleSelectAll}
              variant="outlined"
              sx={{ 
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                borderColor: '#d1d5db',
                color: '#374151',
                '&:hover': {
                  borderColor: '#9ca3af',
                  background: '#f9fafb'
                }
              }}
            >
              {emailsSelecionados.length === destinatarios.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          </Box>
          
          <FormControl fullWidth>
            <InputLabel sx={{ color: '#6b7280' }}>E-mails do Mailling</InputLabel>
            <Select
              multiple
              value={emailsSelecionados}
              onChange={(e) => setEmailsSelecionados(e.target.value as string[])}
              input={<OutlinedInput 
                label="E-mails do Mailling" 
                sx={{ 
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9ca3af'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3b82f6',
                    borderWidth: '2px'
                  }
                }}
              />}
              renderValue={(selected) => (
                <Box className="flex flex-wrap gap-1">
                  {selected.map((email) => (
                    <Chip 
                      key={email} 
                      label={email} 
                      size="small" 
                      sx={{ 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        fontWeight: 500,
                        '& .MuiChip-deleteIcon': {
                          color: 'white'
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            >
              {destinatarios.map((email) => (
                <MenuItem key={email} value={email} sx={{ borderRadius: '8px', mx: 1, my: 0.5 }}>
                  <Checkbox 
                    checked={emailsSelecionados.indexOf(email) > -1} 
                    sx={{ 
                      color: '#3b82f6',
                      '&.Mui-checked': { color: '#1d4ed8' }
                    }}
                  />
                  <ListItemText primary={email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box className="mt-3">
            <Button
              startIcon={copiado ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyDestinatarios}
              variant="outlined"
              size="small"
              color={copiado ? "success" : "primary"}
              sx={{ 
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                px: 3
              }}
            >
              {copiado ? 'Copiado!' : 'Copiar Destinatários'}
            </Button>
          </Box>
        </Box>

        {/* Preview do E-mail */}
        <Box sx={{ p: 3, background: '#f8fafc' }}>
          <Box className="flex items-center gap-2 mb-4">
            <Box 
              sx={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '8px',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send className="w-5 h-5 text-white" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Preview do E-mail
            </Typography>
          </Box>
          
          <Paper 
            sx={{ 
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
          >
            <Box sx={{ p: 3, background: 'white' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: '#374151'
                }}
              >
                {emailCompleto}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ 
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 500,
            px: 3,
            py: 1.5,
            borderColor: '#d1d5db',
            color: '#374151',
            '&:hover': {
              borderColor: '#9ca3af',
              background: '#f9fafb'
            }
          }}
        >
          Fechar
        </Button>
        <Button
          startIcon={copiadoEmail ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          onClick={handleCopyEmail}
          variant="contained"
          color={copiadoEmail ? "success" : "primary"}
          sx={{ 
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 500,
            px: 4,
            py: 1.5,
            background: copiadoEmail 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            '&:hover': {
              background: copiadoEmail 
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
            }
          }}
        >
          {copiadoEmail ? 'E-mail Copiado!' : 'Copiar E-mail Completo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

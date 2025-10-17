import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Chip, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, IconButton, Tooltip } from '@mui/material'
import { Copy, Mail, Users, CheckCircle } from 'lucide-react'
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
    if (open && maillingStore.items.length === 0) {
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
    if (manutencao && maillingStore.items.length > 0) {
      let contatosFiltrados = maillingStore.items

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
  }, [manutencao, maillingStore.items, md.clientes, md.grupos])

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
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-blue-600" />
        <span>📧 Comunicar Alteração de Manutenção</span>
      </DialogTitle>
      
      <DialogContent className="space-y-6">
        {/* Informações da Manutenção */}
        <Box className="bg-blue-50 p-4 rounded-lg">
          <Typography variant="h6" className="text-blue-800 mb-2">
            Manutenção: {manutencao?.ticket || 'N/A'}
          </Typography>
          <Typography variant="body2" className="text-blue-700">
            Cliente: {md.clientes.find(c => c.id === manutencao?.clienteId)?.nome || 'N/A'} | 
            Sistema: {md.sistemas.find(s => s.id === manutencao?.sistemaId)?.nome || 'N/A'}
          </Typography>
        </Box>

        {/* Seleção de Destinatários */}
        <Box>
          <div className="flex items-center justify-between mb-3">
            <Typography variant="h6" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Destinatários ({emailsSelecionados.length} selecionados)
            </Typography>
            <Button 
              size="small" 
              onClick={handleSelectAll}
              variant="outlined"
            >
              {emailsSelecionados.length === destinatarios.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          </div>
          
          <FormControl fullWidth>
            <InputLabel>E-mails do Mailling</InputLabel>
            <Select
              multiple
              value={emailsSelecionados}
              onChange={(e) => setEmailsSelecionados(e.target.value as string[])}
              input={<OutlinedInput label="E-mails do Mailling" />}
              renderValue={(selected) => (
                <Box className="flex flex-wrap gap-1">
                  {selected.map((email) => (
                    <Chip key={email} label={email} size="small" />
                  ))}
                </Box>
              )}
            >
              {destinatarios.map((email) => (
                <MenuItem key={email} value={email}>
                  <Checkbox checked={emailsSelecionados.indexOf(email) > -1} />
                  <ListItemText primary={email} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <div className="mt-2">
            <Button
              startIcon={copiado ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyDestinatarios}
              variant="outlined"
              size="small"
              color={copiado ? "success" : "primary"}
            >
              {copiado ? 'Copiado!' : 'Copiar Destinatários'}
            </Button>
          </div>
        </Box>

        {/* Preview do E-mail */}
        <Box>
          <Typography variant="h6" className="mb-3">
            📝 Preview do E-mail
          </Typography>
          <TextField
            multiline
            rows={15}
            fullWidth
            value={emailCompleto}
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { 
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.4
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions className="p-4 bg-gray-50">
        <Button onClick={onClose} variant="outlined">
          Fechar
        </Button>
        <Button
          startIcon={copiadoEmail ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          onClick={handleCopyEmail}
          variant="contained"
          color={copiadoEmail ? "success" : "primary"}
        >
          {copiadoEmail ? 'E-mail Copiado!' : 'Copiar E-mail Completo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

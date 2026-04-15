import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  TextField,
  Typography,
  ListItemText
} from '@mui/material'
import { Copy, Mail, Users, X, CheckCircle } from 'lucide-react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useMaillingStore } from '../store/maillingStore'
import type { Demand } from '../types/demand'

type Props = {
  open: boolean
  onClose: () => void
  demanda: Demand
}

const NIG_SIGNATURE = 'NIG - Núcleo de Inteligência e Governança'

const escapeHtml = (value?: string | null) =>
  (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sanitizeText = (value?: string | null) => escapeHtml(value).replace(/\s+/g, ' ').trim()

export function EmailComunicacaoCadastroEdgeModal({ open, onClose, demanda }: Props) {
  const md = useMasterDataStore()
  const maillingStore = useMaillingStore()

  const [carregandoMailling, setCarregandoMailling] = useState(false)
  const [destinatarios, setDestinatarios] = useState<string[]>([])
  const [emailsSelecionados, setEmailsSelecionados] = useState<string[]>([])
  const [copiadoEmail, setCopiadoEmail] = useState(false)

  // Blocos editáveis (EDGE)
  const [titulo, setTitulo] = useState('Seja bem vinda(o) ao Edge!')
  const [subtitulo, setSubtitulo] = useState('Comunicado Automático - Sistema Edge')
  const [saudacao, setSaudacao] = useState('Prezados,')
  const [introducao, setIntroducao] = useState(
    'Seja bem vinda(o) ao Edge! Abaixo seguem as informações iniciais do chamado e os próximos passos.'
  )
  const [orientacoes, setOrientacoes] = useState(
    'Caso precise de apoio, responda a este comunicado internamente e acione a equipe responsável.'
  )

  const info = useMemo(() => {
    const contrato = demanda?.contratoId ? md.contratos.find((c) => c.id === demanda.contratoId) : null
    const operadora = md.operadoras.find((o) => o.id === (demanda as any)?.operadoraId)
    const produto = md.produtos.find((p) => p.id === (demanda as any)?.produtoId)
    const sistema = md.sistemas.find((s) => s.id === (demanda as any)?.sistemaId)
    const tipoServico = md.tiposServico.find((t) => t.id === (demanda as any)?.tipoServicoId)
    const tipoDemanda = md.tiposDemanda.find((t) => t.id === (demanda as any)?.tipoId)
    return {
      ticket: sanitizeText((demanda as any)?.ticket || 'N/A'),
      cliente: sanitizeText(md.clientes.find((c) => c.id === (demanda as any)?.clienteId)?.nome || 'N/A'),
      contrato: sanitizeText(contrato?.codigo || contrato?.numero || (demanda as any)?.ticket || 'N/A'),
      operadora: sanitizeText(operadora?.nome || 'N/A'),
      produto: sanitizeText(produto?.nome || 'N/A'),
      servico: sanitizeText(tipoServico?.nome || 'N/A'),
      tipo: sanitizeText(tipoDemanda?.nome || 'N/A'),
      sistema: sanitizeText(sistema?.nome || 'N/A'),
      descricao: escapeHtml(((demanda as any)?.descricao || '').toString()).replace(/\r?\n/g, '<br />'),
      timestamp: sanitizeText(new Date().toLocaleString())
    }
  }, [demanda, md.clientes, md.contratos, md.operadoras, md.produtos, md.sistemas, md.tiposServico, md.tiposDemanda])

  const buildHtml = () => {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>${sanitizeText(titulo)} - ${info.ticket}</title></head>
<body style="font-family: Arial, sans-serif; color: #050032; margin:0; background:#f8fafc;">
  <div style="max-width: 820px; margin: 0 auto; padding: 24px;">
    <div style="background: linear-gradient(135deg, #050032 0%, #002561 60%, #009FDF 100%); color:#fff; padding: 26px 32px; border-radius: 14px 14px 0 0;">
      <p style="margin:0 0 8px 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity:0.85;">${sanitizeText(subtitulo)}</p>
      <p style="margin:0; font-size: 26px; font-weight: 800;">${escapeHtml(titulo)}</p>
    </div>
    <div style="background:#fff; border:1px solid #DCDFE3; border-top:0; border-radius: 0 0 14px 14px; overflow:hidden;">
      <div style="padding: 26px 28px;">
        <p style="margin:0; font-size: 15px;"><strong>${sanitizeText(saudacao)}</strong></p>
        <p style="margin: 14px 0 0 0; font-size: 13px; color:#A3B5BC;">Ticket: <strong style="color:#002561;">${info.ticket}</strong> • Gerado em ${info.timestamp}</p>
        <p style="margin: 14px 0 0 0; font-size: 14px; color:#002561;">${escapeHtml(introducao)}</p>

        <div style="margin: 18px 0; background:#f7fafc; border-left: 4px solid #009FDF; padding: 16px 18px; border-radius: 0 12px 12px 0;">
          <p style="margin:0; font-size: 14px; color:#002561;">Cliente: <strong>${info.cliente}</strong></p>
        </div>

        <div style="margin: 8px 0 16px 0;">
          <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color:#050032;">Dados do chamado</p>
          <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow:hidden; border: 1px solid #DCDFE3;">
            <thead>
              <tr style="background:#050032; color:#fff;">
                <th style="padding: 12px 10px; text-align:left; font-size: 12px; letter-spacing: .5px;">Contrato</th>
                <th style="padding: 12px 10px; text-align:left; font-size: 12px; letter-spacing: .5px;">Operadora</th>
                <th style="padding: 12px 10px; text-align:left; font-size: 12px; letter-spacing: .5px;">Produto</th>
                <th style="padding: 12px 10px; text-align:left; font-size: 12px; letter-spacing: .5px;">Serviço</th>
                <th style="padding: 12px 10px; text-align:left; font-size: 12px; letter-spacing: .5px;">Tipo</th>
                <th style="padding: 12px 10px; text-align:left; font-size: 12px; letter-spacing: .5px;">Sistema</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#ffffff;">
                <td style="padding: 12px 10px; border-bottom: 1px solid #DCDFE3; font-weight: 700; color:#009FDF; font-size: 13px;">${info.contrato}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #DCDFE3; color:#050032; font-size: 13px;">${info.operadora}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #DCDFE3; background:#DCDFE3; color:#002561; font-weight: 600; font-size: 13px;">${info.produto}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #DCDFE3; background:#DCDFE3; color:#002561; font-weight: 600; font-size: 13px;">${info.servico}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #DCDFE3; background:#DCDFE3; color:#002561; font-weight: 600; font-size: 13px;">${info.tipo}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #DCDFE3; background:#DCDFE3; color:#002561; font-weight: 600; font-size: 13px;">${info.sistema}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin: 14px 0; background:#f8fafc; border:1px solid #DCDFE3; border-radius: 10px; padding: 16px;">
          <p style="margin:0 0 10px 0; font-size: 14px; font-weight: 700; color:#050032;">Descrição</p>
          <div style="font-size: 13px; line-height: 1.6; color:#002561;">${info.descricao || '-'}</div>
        </div>

        <div style="margin-top: 12px; background:#f8fafc; border:1px solid #DCDFE3; border-radius: 10px; padding: 16px;">
          <p style="margin:0; font-size: 13px; line-height: 1.6; color:#002561;">${escapeHtml(orientacoes)}</p>
        </div>

        <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed #DCDFE3;">
          <p style="margin:0; font-size: 13px; color:#A3B5BC;">Atenciosamente,</p>
          <p style="margin: 6px 0 0 0; font-size: 15px; font-weight: 700; color:#050032;">${NIG_SIGNATURE}</p>
          <p style="margin: 6px 0 0 0; font-size: 11px; color:#A3B5BC;">Mensagem gerada automaticamente.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  // carregar/filtrar mailling ao abrir
  useEffect(() => {
    if (!open) return
    setCarregandoMailling(true)
    maillingStore.syncFromApi?.()
      .catch(() => {})
      .finally(() => setCarregandoMailling(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const contacts = maillingStore.contacts || []
    const emails = contacts
      .map((c: any) => c.email)
      .filter((e: any) => typeof e === 'string' && e.trim())
    const unique = [...new Set(emails)].slice(0, 50)
    setDestinatarios(unique)
    setEmailsSelecionados(unique.slice(0, 5))
  }, [open, maillingStore.contacts])

  const handleCopyOutlook = async () => {
    try {
      const htmlContent = buildHtml()
      if (navigator.clipboard && 'write' in navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = htmlContent
        const plainText = tempDiv.innerText
        const clipboardItem = new (window as any).ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        })
        await (navigator.clipboard as any).write([clipboardItem])
      } else {
        await navigator.clipboard.writeText(buildHtml())
      }
      setCopiadoEmail(true)
      setTimeout(() => setCopiadoEmail(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar e-mail:', error)
      alert('Erro ao copiar o e-mail. Tente novamente.')
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
          minHeight: '720px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
          color: 'white',
          p: 3,
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              p: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Mail className="w-6 h-6" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25 }}>
              Comunicar (EDGE)
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Template pronto e blocos editáveis
            </Typography>
          </Box>
        </Box>
        <Button
          onClick={onClose}
          sx={{
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            '&:hover': { background: 'rgba(255, 255, 255, 0.2)' }
          }}
        >
          <X className="w-5 h-5" />
        </Button>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #DCDFE3 100%)' }}>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                Ticket: {(demanda as any)?.ticket || 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Cliente: {md.clientes.find((c) => c.id === (demanda as any)?.clienteId)?.nome || 'N/A'} • Sistema:{' '}
                {md.sistemas.find((s) => s.id === (demanda as any)?.sistemaId)?.nome || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #00A649 0%, #008c3a 100%)',
                  borderRadius: '8px',
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Users className="w-5 h-5 text-white" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Destinatários ({emailsSelecionados.length})
              </Typography>
            </Box>
          </Box>

          <FormControl fullWidth>
            <InputLabel sx={{ color: '#6b7a80' }}>
              {carregandoMailling ? 'Carregando e-mails...' : 'E-mails do Mailling'}
            </InputLabel>
            <Select
              multiple
              value={emailsSelecionados}
              onChange={(e) => setEmailsSelecionados(e.target.value as string[])}
              disabled={carregandoMailling}
              input={
                <OutlinedInput
                  label={carregandoMailling ? 'Carregando e-mails...' : 'E-mails do Mailling'}
                  sx={{
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9ca3af' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#009FDF', borderWidth: '2px' }
                  }}
                />
              }
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((email) => (
                    <Chip
                      key={email}
                      label={email}
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #002561 0%, #009FDF 100%)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  ))}
                </Box>
              )}
            >
              {destinatarios.length === 0 && !carregandoMailling ? (
                <MenuItem disabled>
                  <ListItemText primary="Nenhum e-mail encontrado" secondary="Verifique o mailling" />
                </MenuItem>
              ) : (
                destinatarios.map((email) => (
                  <MenuItem key={email} value={email} sx={{ borderRadius: '8px', mx: 1, my: 0.5 }}>
                    <Checkbox checked={emailsSelecionados.indexOf(email) > -1} sx={{ color: '#009FDF', '&.Mui-checked': { color: '#009FDF' } }} />
                    <ListItemText primary={email} />
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ p: 3, background: '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Blocos (editável)
            </Typography>
            <Button
              startIcon={copiadoEmail ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyOutlook}
              variant="contained"
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2.5 }}
            >
              {copiadoEmail ? 'Copiado!' : 'Copiar e-mail (Outlook)'}
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField value={titulo} onChange={(e) => setTitulo(e.target.value)} label="Título" fullWidth />
            <TextField value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} label="Subtítulo" fullWidth />
            <TextField value={saudacao} onChange={(e) => setSaudacao(e.target.value)} label="Saudação" fullWidth />
            <TextField value={(demanda as any)?.ticket || ''} label="Ticket (referência)" fullWidth disabled />
          </Box>
          <TextField value={introducao} onChange={(e) => setIntroducao(e.target.value)} label="Introdução" fullWidth multiline rows={3} sx={{ mb: 2 }} />
          <TextField value={orientacoes} onChange={(e) => setOrientacoes(e.target.value)} label="Orientações" fullWidth multiline rows={3} />

          <Divider sx={{ my: 2 }} />
          <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #DCDFE3' }}>
            <Box sx={{ maxHeight: 420, overflow: 'auto', background: 'white' }} dangerouslySetInnerHTML={{ __html: buildHtml() }} />
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, background: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 3 }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}


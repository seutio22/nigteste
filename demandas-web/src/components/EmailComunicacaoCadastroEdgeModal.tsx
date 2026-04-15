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
  ListItemText,
  Alert,
  Collapse
} from '@mui/material'
import { ChevronDown, ChevronRight, Copy, Mail, Users, X, CheckCircle } from 'lucide-react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useMaillingStore } from '../store/maillingStore'
import type { Demand } from '../types/demand'
import { buildEmlForOutlook } from '../utils/buildEmlForOutlook'
import { copyRichHtmlToClipboard } from '../utils/copyRichHtmlClipboard'

type Props = {
  open: boolean
  onClose: () => void
  demanda: Demand
}

/** Modelos de comunicado na página Cadastro — apenas Edge implementado. */
export type ModeloComunicadoCadastro = 'edge' | 'moveLocal' | 'move'

const MODELOS: { id: ModeloComunicadoCadastro; label: string; disponivel: boolean }[] = [
  { id: 'edge', label: 'Edge', disponivel: true },
  { id: 'moveLocal', label: 'Move Local', disponivel: false },
  { id: 'move', label: 'MOVE', disponivel: false }
]

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

function buildHtmlEdge(nomeDestinatario: string): string {
  const nome =
    nomeDestinatario.trim() !== '' ? escapeHtml(nomeDestinatario.trim()) : '<span style="color:#64748b;font-style:italic;">(Nome)</span>'

  /* Tabelas + estilos inline: Outlook; Arial em cada bloco evita Times New Roman. Cores alinhadas à identidade Nexus (#050032, #002561, #009FDF). */
  const ff = 'font-family:Arial,Helvetica,sans-serif'
  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Boas-vindas ao Edge</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;${ff};color:#1e293b;background-color:#e8eef4;-webkit-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${ff};background-color:#e8eef4;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="720" style="max-width:720px;width:100%;${ff};border-collapse:collapse;box-shadow:0 4px 24px rgba(5,0,50,0.08);">
          <tr>
            <td bgcolor="#002561" style="${ff};background-color:#002561;background-image:linear-gradient(135deg,#050032 0%,#002561 55%,#0078b8 100%);color:#ffffff;padding:26px 32px;border-radius:16px 16px 0 0;border:1px solid #001a4a;border-bottom:0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;line-height:1.5;color:#bae6fd;${ff};">Comunicado — Sistema Edge</p>
              <p style="margin:12px 0 0 0;font-size:24px;font-weight:800;line-height:1.25;${ff};color:#ffffff;">Bem-vinda(o) ao Edge</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="${ff};background-color:#ffffff;border:1px solid #cbd5e1;border-top:0;padding:0;border-radius:0 0 16px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;${ff};">
                <tr>
                  <td style="padding:36px 36px 40px 36px;font-size:15px;line-height:1.75;color:#334155;${ff};">
                    <p style="margin:0 0 20px 0;font-size:17px;color:#0f172a;${ff};"><strong style="color:#002561;">${nome}</strong>, seja bem-vinda(o) ao Edge! 🤗</p>
                    <p style="margin:0 0 40px 0;${ff};color:#475569;">Isso mesmo, a criação do seu acesso no Edge foi concluída com sucesso, e seu perfil já se encontra parametrizado de acordo com a sua necessidade. Use sem moderação!</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;${ff};margin:0 0 36px 0;background-color:#f1f5f9;border-left:4px solid #009FDF;">
                      <tr>
                        <td style="padding:24px 24px 26px 24px;${ff};">
                          <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;letter-spacing:0.02em;color:#009FDF;${ff};">Primeiro acesso</p>
                          <p style="margin:0;${ff};color:#334155;">De acordo com nossos conhecimentos, você deve ter recebido um e-mail encaminhado pela ferramenta solicitando o cadastro da senha, correto? 👀 Este e-mail se expira em 5 minutos, e após este prazo é necessário acessar o link 👉 <a href="#" style="color:#009FDF;font-weight:bold;text-decoration:underline;">EDGE</a> 👈, e clicar em &quot;Esqueceu a senha?&quot;, informar o seu e-mail e clicar em &quot;Recuperar&quot;. Aguarde o recebimento de um novo e-mail que será enviado pela ferramenta e siga o passo-a-passo deste.</p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;${ff};margin:0 0 36px 0;background-color:#f8fafc;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                      <tr>
                        <td style="padding:24px 24px 26px 24px;${ff};">
                          <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;letter-spacing:0.02em;color:#002561;${ff};">Time NIG</p>
                          <p style="margin:0 0 18px 0;${ff};color:#334155;">Não sabe onde nos encontrar? 🧐 é fácil, fácil, toda a nossa equipe está disponível para atendimento através do Flow e Teams. Vem conhecer nosso time:</p>
                          <p style="margin:0 0 10px 0;font-weight:600;color:#002561;${ff};">Karina Passeti / Paula Petrovic / Emyli Almeida / Raiane Silva / Cristina Monteiro / Camilla Silveira / Mike Martins</p>
                          <p style="margin:0;font-size:13px;color:#64748b;${ff};">Responsáveis pela manutenção dos cadastros do Edge e suporte ao sistema.</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px 0;${ff};color:#334155;"><strong style="color:#002561;">Denison Silva</strong></p>
                    <p style="margin:0 0 32px 0;font-size:14px;${ff};color:#64748b;">Gerência.</p>

                    <p style="margin:0 0 14px 0;${ff};color:#334155;">Possui dúvidas, sugestões ou solicitações? Vem falar com a gente.</p>
                    <p style="margin:0 0 40px 0;${ff};color:#334155;">Basta abrir um FLOW para nós, catálogo: <strong style="color:#009FDF;">NIG</strong>.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-top:8px;border-top:1px solid #e2e8f0;${ff};">
                      <tr>
                        <td bgcolor="#f8fafc" style="padding:28px 0 12px 0;background-color:#f8fafc;">
                          <p style="margin:0 0 10px 0;font-size:12px;color:#94a3b8;${ff};">Atenciosamente,</p>
                          <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#050032;${ff};">${NIG_SIGNATURE}</p>
                          <p style="margin:0;font-size:11px;color:#cbd5e1;${ff};">Mensagem gerada automaticamente.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildHtmlPlaceholder(modelo: ModeloComunicadoCadastro): string {
  const label = MODELOS.find((m) => m.id === modelo)?.label ?? modelo
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; padding: 24px; color: #475569;">
  <p style="font-size: 16px;"><strong>${escapeHtml(label)}</strong></p>
  <p>O modelo de comunicado <strong>${escapeHtml(label)}</strong> será disponibilizado em breve nesta tela.</p>
</body></html>`
}

export function EmailComunicacaoCadastroEdgeModal({ open, onClose, demanda }: Props) {
  const md = useMasterDataStore()
  const maillingStore = useMaillingStore()

  const [modeloComunicacao, setModeloComunicacao] = useState<ModeloComunicadoCadastro>('edge')
  const [carregandoMailling, setCarregandoMailling] = useState(false)
  const [destinatarios, setDestinatarios] = useState<string[]>([])
  const [emailsSelecionados, setEmailsSelecionados] = useState<string[]>([])
  const [copiadoEmail, setCopiadoEmail] = useState(false)
  const [nomeDestinatario, setNomeDestinatario] = useState('')
  /** Destinatários (mailling) pouco usados — secção recolhida por defeito */
  const [destinatariosExpandido, setDestinatariosExpandido] = useState(false)

  const modeloAtivo = MODELOS.find((m) => m.id === modeloComunicacao)
  const edgeDisponivel = modeloAtivo?.disponivel === true

  const infoCard = useMemo(() => {
    return {
      ticket: sanitizeText((demanda as any)?.ticket || 'N/A'),
      cliente: sanitizeText(md.clientes.find((c) => c.id === (demanda as any)?.clienteId)?.nome || 'N/A'),
      sistema: sanitizeText(md.sistemas.find((s) => s.id === (demanda as any)?.sistemaId)?.nome || 'N/A')
    }
  }, [demanda, md.clientes, md.sistemas])

  const buildHtml = () => {
    if (modeloComunicacao === 'edge') return buildHtmlEdge(nomeDestinatario)
    return buildHtmlPlaceholder(modeloComunicacao)
  }

  useEffect(() => {
    if (!open) return
    setModeloComunicacao('edge')
    setCopiadoEmail(false)
    const solId = demanda?.solicitante
    const nomeSol =
      (solId && md.solicitantesById?.[solId as string]?.nome) ||
      md.solicitantes.find((s) => s.id === solId || s.nome === solId)?.nome ||
      ''
    setNomeDestinatario(nomeSol)
    setDestinatariosExpandido(false)
    setEmailsSelecionados([])
  }, [open, demanda, md.solicitantes, md.solicitantesById])

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
  }, [open, maillingStore.contacts])

  const handleCopyOutlook = async () => {
    if (!edgeDisponivel) return
    try {
      await copyRichHtmlToClipboard(buildHtml())
      setCopiadoEmail(true)
      setTimeout(() => setCopiadoEmail(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar e-mail:', error)
      alert('Erro ao copiar o e-mail. Tente novamente.')
    }
  }

  /** Ficheiro .eml: corpo só em HTML (igual à pré-visualização) para o Outlook não cair em texto plano. */
  const handleDownloadEml = () => {
    if (!edgeDisponivel) return
    const ticket = String((demanda as any)?.ticket ?? 'comunicado').replace(/[^\w.\-]+/g, '_')
    const html = buildHtml()
    const subject = `Comunicado Edge — ${infoCard.ticket}`
    const eml = buildEmlForOutlook({
      html,
      subject,
      toAddresses: emailsSelecionados.length > 0 ? emailsSelecionados : undefined
    })
    const blob = new Blob([new TextEncoder().encode(eml)], { type: 'message/rfc822' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comunicado-edge-${ticket}.eml`
    a.rel = 'noopener'
    a.click()
    URL.revokeObjectURL(url)
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
              Comunicar
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Escolha o modelo de comunicado e copie o e-mail para o Outlook
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
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748b', mb: 1.5 }}>
                Modelo de comunicado
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="modelo-comunicado-label">Selecione o modelo</InputLabel>
                <Select
                  labelId="modelo-comunicado-label"
                  label="Selecione o modelo"
                  value={modeloComunicacao}
                  onChange={(e) => setModeloComunicacao(e.target.value as ModeloComunicadoCadastro)}
                  sx={{ borderRadius: '12px' }}
                >
                  {MODELOS.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      <ListItemText
                        primary={m.label}
                        secondary={m.disponivel ? 'Disponível' : 'Em breve nesta tela'}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!edgeDisponivel && (
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                  O modelo <strong>{modeloAtivo?.label}</strong> ainda não está disponível. Em breve poderá gerar e copiar o comunicado aqui.
                </Alert>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                Ticket: {infoCard.ticket}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Cliente: {infoCard.cliente} • Sistema: {infoCard.sistema}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50'
          }}
        >
          <Button
            type="button"
            onClick={() => setDestinatariosExpandido((v) => !v)}
            size="small"
            variant="text"
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              minWidth: 0,
              px: 0.5,
              '&:hover': { bgcolor: 'action.hover' }
            }}
            startIcon={
              destinatariosExpandido ? (
                <ChevronDown className="w-4 h-4" strokeWidth={2} />
              ) : (
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              )
            }
          >
            {destinatariosExpandido ? 'Ocultar destinatários' : 'Mostrar destinatários'}
            {!destinatariosExpandido && emailsSelecionados.length > 0 && (
              <Typography component="span" variant="caption" sx={{ ml: 0.75, color: 'text.disabled' }}>
                ({emailsSelecionados.length})
              </Typography>
            )}
          </Button>
          {!destinatariosExpandido && (
            <Typography variant="caption" sx={{ display: 'block', pl: 0.5, mt: 0.25, color: 'text.disabled', maxWidth: 520 }}>
              Opcional — e-mails do mailling (pouco uso no momento)
            </Typography>
          )}

          <Collapse in={destinatariosExpandido}>
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Users size={16} strokeWidth={2} color="#64748b" />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Destinatários ({emailsSelecionados.length})
                </Typography>
              </Box>
              <FormControl fullWidth size="small">
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
                        borderRadius: '10px',
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
                        <Checkbox checked={emailsSelecionados.indexOf(email) > -1} size="small" sx={{ color: '#009FDF', '&.Mui-checked': { color: '#009FDF' } }} />
                        <ListItemText primary={email} />
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>
          </Collapse>
        </Box>

        <Box sx={{ p: 3, background: '#f8fafc' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Pré-visualização do e-mail
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Button
                startIcon={copiadoEmail ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={handleCopyOutlook}
                variant="contained"
                disabled={!edgeDisponivel}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2.5 }}
              >
                {copiadoEmail ? 'Copiado!' : 'Copiar e-mail (Outlook)'}
              </Button>
              <Button
                type="button"
                startIcon={<Mail className="w-4 h-4" />}
                onClick={handleDownloadEml}
                variant="outlined"
                disabled={!edgeDisponivel}
                color="primary"
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2, borderWidth: 2 }}
              >
                Baixar .eml (Outlook)
              </Button>
            </Box>
          </Box>

          {edgeDisponivel && (
            <TextField
              value={nomeDestinatario}
              onChange={(e) => setNomeDestinatario(e.target.value)}
              label="Nome do destinatário"
              placeholder="Ex.: nome que aparece em «(Nome), seja bem-vinda(o)…»"
              fullWidth
              sx={{ mb: 2 }}
              helperText="Se ficar em branco, a pré-visualização mostra «(Nome)» como lembrete."
            />
          )}

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

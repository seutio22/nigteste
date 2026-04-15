import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Chip, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, IconButton, Tooltip, Card, CardContent, Divider, Paper } from '@mui/material'
import { Copy, Mail, Users, CheckCircle, X, Settings, Send, Edit3, Eye, Code } from 'lucide-react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useMaillingStore } from '../store/maillingStore'
import { RichTextEditor } from './RichTextEditor'
import { PrimaryActionButton } from './PrimaryActionButton'

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
  const [previewAtualizado, setPreviewAtualizado] = useState(0)
  const [carregandoMailling, setCarregandoMailling] = useState(false)
  const [editandoDescricao, setEditandoDescricao] = useState(false)
  const [descricaoEditavel, setDescricaoEditavel] = useState('')
  const [emailOutlook, setEmailOutlook] = useState('')
  const [modoEdicao, setModoEdicao] = useState<'visualizar' | 'editar'>('visualizar')
  const [emailEditado, setEmailEditado] = useState('')
  const [conteudoEditavel, setConteudoEditavel] = useState('')
  
  // Estados para editor de blocos
  const [blocoCabecalho, setBlocoCabecalho] = useState('🔔 Alteração Cadastral')
  const [blocoSubtitulo, setBlocoSubtitulo] = useState('Notificação Automática - Sistema NIG')
  const [blocoSaudacao, setBlocoSaudacao] = useState('Prezados,')
  const [blocoInformacao, setBlocoInformacao] = useState('Informamos que o cliente sofreu alteração, sendo:')
  const [blocoDescricao, setBlocoDescricao] = useState('Alteração realizada')
  const [blocoConclusao, setBlocoConclusao] = useState('O Edge e Move encontram-se atualizados. Solicitamos replicar esta informação com a sua equipe.')
  
  // Estados para dados da tabela (múltiplas linhas)
  const [linhasTabela, setLinhasTabela] = useState([
    {
      id: 1,
      contrato: '',
      operadora: '',
      produto: '',
      atualizacao: '',
      subtipo: '',
      tipo: ''
    }
  ])
  
  const escapeHtml = (value?: string | null) =>
    (value ?? '')
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const sanitizeText = (value?: string | null) =>
    escapeHtml(value)
      .replace(/\s+/g, ' ')
      .trim()

  const getComunicadoInfo = () => {
    const cliente = md.clientes.find(c => c.id === manutencao?.clienteId)
    const operadora = md.operadoras.find(o => o.id === manutencao?.operadoraId)
    const produto = md.produtos.find(p => p.id === manutencao?.produtoId)
    const sistema = md.sistemas.find(s => s.id === manutencao?.sistemaId)
    const tipoServico = md.tiposCadastro.find(t => t.id === manutencao?.tipoServicoId)
    const tipo = md.padrao.find(t => t.id === manutencao?.tipoId)
    const contrato = manutencao?.contratoId ? md.contratos.find(c => c.id === manutencao.contratoId) : null

    // Verificar se a primeira linha da tabela tem dados preenchidos
    const primeiraLinhaPreenchida = linhasTabela.length > 0 && 
      (linhasTabela[0].contrato || linhasTabela[0].operadora || linhasTabela[0].produto || 
       linhasTabela[0].atualizacao || linhasTabela[0].subtipo || linhasTabela[0].tipo)
    
    // Se a tabela não tem dados preenchidos, usar dados da manutenção
    const linhas = (primeiraLinhaPreenchida ? linhasTabela : [{
      contrato: contrato?.codigo || contrato?.numero || manutencao?.ticket || '',
      operadora: operadora?.nome || '',
      produto: produto?.nome || '',
      atualizacao: tipoServico?.nome || '',
      subtipo: tipo?.nome || '',
      tipo: sistema?.nome || ''
    }]).map((linha) => ({
      contrato: sanitizeText(linha.contrato || contrato?.codigo || contrato?.numero || manutencao?.ticket || 'N/A'),
      operadora: sanitizeText(linha.operadora || operadora?.nome || 'N/A'),
      produto: sanitizeText(linha.produto || produto?.nome || 'N/A'),
      atualizacao: sanitizeText(linha.atualizacao || tipoServico?.nome || 'N/A'),
      subtipo: sanitizeText(linha.subtipo || tipo?.nome || 'N/A'),
      tipo: sanitizeText(linha.tipo || sistema?.nome || 'N/A')
    }))

    const descricaoOriginal = (descricaoEditavel ?? manutencao?.descricao ?? 'Alteração realizada').toString()
    const descricaoHtml = escapeHtml(descricaoOriginal).replace(/\r?\n/g, '<br />')

    return {
      titulo: sanitizeText(blocoCabecalho || 'Notificação de Alteração'),
      subtitulo: sanitizeText(blocoSubtitulo || 'Notificação Automática - Sistema NIG'),
      saudacao: sanitizeText(blocoSaudacao || 'Prezados,'),
      informacao: sanitizeText(blocoInformacao || 'Informamos que o cliente sofreu alteração, sendo:'),
      cliente: sanitizeText(cliente?.nome || 'N/A'),
      operadora: sanitizeText(operadora?.nome || 'N/A'),
      produto: sanitizeText(produto?.nome || 'N/A'),
      sistema: sanitizeText(sistema?.nome || 'N/A'),
      linhas,
      descricaoHtml,
      conclusao: sanitizeText(blocoConclusao || 'O Edge e Move encontram-se atualizados. Solicitamos replicar esta informação com a sua equipe.'),
      ticket: sanitizeText(manutencao?.ticket || 'N/A'),
      timestamp: sanitizeText(new Date().toLocaleString())
    }
  }

  const renderComunicadoHtml = (
    info: ReturnType<typeof getComunicadoInfo>,
    options?: { bodyMargin?: string; containerPadding?: string }
  ) => {
    const margin = options?.bodyMargin ?? '0';
    const padding = options?.containerPadding ?? '24px';

      const rowsHtml = info.linhas.map((linha, index) => {
      const isEven = index % 2 === 0
      const rowBg = isEven ? '#ffffff' : '#f8fafc'
      return `
        <tr style="background: ${rowBg};">
          <td style="padding: 14px 12px; border-bottom: 1px solid #DCDFE3; font-weight: 600; color: #009FDF; font-size: 13px;">${linha.contrato}</td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #DCDFE3; color: #050032; font-size: 13px;">${linha.operadora}</td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #DCDFE3; background: #e0f2fe; color: #002561; font-weight: 600; font-size: 13px;">${linha.produto}</td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #DCDFE3; background: #FBF4D4; color: #C9A227; font-weight: 700; font-size: 13px;">${linha.atualizacao}</td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #DCDFE3; background: #eef2ff; color: #002561; font-weight: 600; font-size: 13px;">${linha.subtipo}</td>
          <td style="padding: 14px 12px; border-bottom: 1px solid #DCDFE3; background: #e6f7ed; color: #00A649; font-weight: 700; font-size: 13px;">${linha.tipo}</td>
        </tr>`
    }).join('')

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Comunicado - ${info.ticket}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; margin: ${margin}; background: #f1f5f9;">
  <div style="max-width: 780px; margin: 0 auto; padding: ${padding};">
    <div style="background: linear-gradient(135deg, #1a1c2d 0%, #262b44 100%); color: #ffffff; padding: 26px 32px; border-radius: 14px 14px 0 0; box-shadow: 0 15px 30px -15px rgba(15, 23, 42, 0.5);">
      <p style="margin: 0 0 8px 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.75;">Notificação Automática - Sistema NIG</p>
      <p style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">🔔 ${info.titulo}</p>
    </div>

    <p style="margin: 12px 0;">&nbsp;</p>

    <div style="background: #ffffff; border-radius: 14px; box-shadow: 0 12px 25px -18px rgba(15, 23, 42, 0.5); overflow: hidden;">
      <div style="padding: 30px;">
        <div style="font-size: 15px; color: #1f2937;">
          <strong>${info.saudacao}</strong>
        </div>

        <p style="margin: 12px 0;">&nbsp;</p>

        <div style="background: #f7fafc; border-left: 4px solid #3182ce; padding: 18px 22px; border-radius: 0 12px 12px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 500; color: #1e3a8a;">📋 ${info.informacao} <strong>${info.cliente}</strong></p>
          <div style="display: flex; flex-wrap: wrap; gap: 12px;">
            <span style="background: #e0f2fe; color: #009FDF; padding: 6px 12px; border-radius: 999px; font-size: 12px;">Operadora: <strong>${info.operadora}</strong></span>
            <span style="background: #ede9fe; color: #5b21b6; padding: 6px 12px; border-radius: 999px; font-size: 12px;">Produto: <strong>${info.produto}</strong></span>
            <span style="background: #dcfce7; color: #047857; padding: 6px 12px; border-radius: 999px; font-size: 12px;">Sistema: <strong>${info.sistema}</strong></span>
          </div>
        </div>

        <p style="margin: 14px 0;">&nbsp;</p>

        <div style="margin-bottom: 12px;">
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">Resumo da alteração</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px -18px rgba(15, 23, 42, 0.4);">
          <thead>
            <tr>
              <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 13px; background: #1f2937; color: #ffffff;">Contrato</th>
              <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 13px; background: #1f2937; color: #ffffff;">Operadora</th>
              <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 13px; background: #1f2937; color: #ffffff;">Produto</th>
              <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 13px; background: #1f2937; color: #ffffff;">Atualização</th>
              <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 13px; background: #1f2937; color: #ffffff;">Subtipo</th>
              <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 13px; background: #1f2937; color: #ffffff;">Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <p style="margin: 16px 0;">&nbsp;</p>

        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f172a;">Descrição</p>
          <div style="background: #f8fafc; border: 1px solid #DCDFE3; border-radius: 10px; padding: 18px; font-size: 13px; line-height: 1.6; color: #6b7a80;">${info.descricaoHtml || '-'}</div>
        </div>

        <p style="margin: 16px 0;">&nbsp;</p>

        <div style="background: #e6f7ed; border: 1px solid #00A649; border-radius: 12px; padding: 18px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #047857;">✅ ${info.conclusao}</p>
        </div>

        <p style="margin: 16px 0;">&nbsp;</p>

        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7a80;">Atenciosamente,</p>
          <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">NIG - Núcleo de Inteligência e Governança</p>
          <p style="margin: 0; font-size: 11px; color: #6b7a80;">Mensagem gerada automaticamente pelo sistema NIG.</p>
        </div>

        <p style="margin: 14px 0;">&nbsp;</p>

        <div style="padding-top: 12px; border-top: 1px dashed #cbd5f5;">
          <p style="margin: 0; font-size: 11px; color: #6b7a80;">Ticket: ${info.ticket} • Gerado em ${info.timestamp}</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  const buildEmailHtml = () => {
    const info = getComunicadoInfo()
    return renderComunicadoHtml(info, { bodyMargin: '0', containerPadding: '24px' })
  }

  function showDownloadFeedback(message = '✅ Arquivo Word salvo!') {
    const feedback = document.createElement('div')
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #00A649;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `
    feedback.textContent = message
    document.body.appendChild(feedback)

    setTimeout(() => {
      document.body.removeChild(feedback)
    }, 3000)
  }

  // Funções para gerenciar linhas da tabela
  const adicionarLinhaTabela = () => {
    const novaId = Math.max(...linhasTabela.map(l => l.id)) + 1
    setLinhasTabela([...linhasTabela, {
      id: novaId,
      contrato: '',
      operadora: '',
      produto: '',
      atualizacao: '',
      subtipo: '',
      tipo: ''
    }])
    setPreviewAtualizado(prev => prev + 1) // Forçar atualização do preview
  }

  const removerLinhaTabela = (id: number) => {
    if (linhasTabela.length > 1) {
      setLinhasTabela(linhasTabela.filter(linha => linha.id !== id))
      setPreviewAtualizado(prev => prev + 1) // Forçar atualização do preview
    }
  }

  const atualizarLinhaTabela = (id: number, campo: string, valor: string) => {
    setLinhasTabela(linhasTabela.map(linha => 
      linha.id === id ? { ...linha, [campo]: valor } : linha
    ))
    setPreviewAtualizado(prev => prev + 1) // Forçar atualização do preview
  }

  const md = useMasterDataStore()
  const maillingStore = useMaillingStore()

  // Função para extrair conteúdo editável do HTML
  const extrairConteudoEditavel = (html: string) => {
    // Extrair apenas o texto principal, removendo HTML complexo
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // Buscar o conteúdo principal
    const contentDiv = tempDiv.querySelector('.content')
    if (contentDiv) {
      // Extrair apenas o texto das seções principais
      const greeting = contentDiv.querySelector('.greeting')?.textContent || ''
      const infoBox = contentDiv.querySelector('.info-box')?.textContent || ''
      const description = contentDiv.querySelector('.description-content')?.textContent || ''
      const conclusion = contentDiv.querySelector('.conclusion')?.textContent || ''
      
      return `${greeting}\n\n${infoBox}\n\n${description}\n\n${conclusion}`.trim()
    }
    
    return tempDiv.textContent || ''
  }

  // Função para gerar HTML com blocos editáveis
  const gerarHTMLComBlocos = () => {
    const cliente = md.clientes.find(c => c.id === manutencao?.clienteId)
    const operadora = md.operadoras.find(o => o.id === manutencao?.operadoraId)
    const produto = md.produtos.find(p => p.id === manutencao?.produtoId)
    const sistema = md.sistemas.find(s => s.id === manutencao?.sistemaId)
    const tipoServico = md.tiposCadastro.find(t => t.id === manutencao?.tipoServicoId)
    const tipo = md.padrao.find(t => t.id === manutencao?.tipoId)
    const contrato = manutencao?.contratoId ? 
      md.contratos.find(c => c.id === manutencao.contratoId) : null

    // Verificar se a primeira linha da tabela tem dados preenchidos
    const primeiraLinhaPreenchida = linhasTabela.length > 0 && 
      (linhasTabela[0].contrato || linhasTabela[0].operadora || linhasTabela[0].produto || 
       linhasTabela[0].atualizacao || linhasTabela[0].subtipo || linhasTabela[0].tipo)
    
    // Se não tem dados preenchidos, usar dados da manutenção
    const linhasParaRenderizar = primeiraLinhaPreenchida ? linhasTabela : [{
      id: 1,
      contrato: contrato?.codigo || contrato?.numero || manutencao?.ticket || '',
      operadora: operadora?.nome || '',
      produto: produto?.nome || '',
      atualizacao: tipoServico?.nome || '',
      subtipo: tipo?.nome || '',
      tipo: sistema?.nome || ''
    }]

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Alteração de Contrato - ${manutencao?.ticket || 'N/A'}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${blocoCabecalho}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${blocoSubtitulo}</p>
        </div>
        
        <!-- Content -->
        <div class="content" style="padding: 30px;">
            <div style="font-size: 16px; margin-bottom: 20px; color: #050032;">
                <strong>${blocoSaudacao}</strong>
            </div>
            
            <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 500; color: #050032;">
                    📋 ${blocoInformacao.replace('o cliente', `<strong>${cliente?.nome || 'N/A'}</strong>`)}
                </p>
            </div>
            
            <!-- Table -->
            <div style="margin: 25px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #050032; color: white;">
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Contrato</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Operadora</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Produto</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Atualização</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Subtipo</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasParaRenderizar.map((linha, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
                            <td style="padding: 15px 12px; border-bottom: 1px solid #DCDFE3; font-weight: 600; color: #2b6cb0; font-size: 15px;">${linha.contrato || contrato?.codigo || contrato?.numero || manutencao?.ticket || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #DCDFE3; font-weight: 500; color: #050032;">${linha.operadora || operadora?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #DCDFE3; background: #e6fffa; color: #234e52; font-weight: 500;">${linha.produto || produto?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #DCDFE3; background: #fef5e7; color: #7c2d12; font-weight: 500;">${linha.atualizacao || tipoServico?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #DCDFE3; background: #f3e8ff; color: #581c87; font-weight: 500;">${linha.subtipo || tipo?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #DCDFE3; background: #e6f7ed; color: #064e3b; font-weight: 500;">${linha.tipo || sistema?.nome || 'N/A'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Description -->
            <div style="background: #f8fafc; border: 1px solid #DCDFE3; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #050032; font-size: 16px; font-weight: 600;">📝 Descrição da Alteração</h3>
                <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; min-height: 60px;">
                    <p style="margin: 0; line-height: 1.6; color: #002561; font-size: 14px; white-space: pre-wrap;">${descricaoEditavel || manutencao?.descricao || 'Alteração realizada'}</p>
                </div>
            </div>
            
            <!-- Conclusion -->
            <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; color: #22543d; font-weight: 500;">
                    ✅ <strong>${blocoConclusao}</strong>
                </p>
            </div>
            
            <!-- Signature -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #DCDFE3;">
                <p style="margin: 5px 0; color: #002561;">Atenciosamente,</p>
                <p style="margin: 5px 0; font-weight: 600; color: #050032; font-size: 16px;">NIG - Núcleo de Inteligência e Governança</p>
                <p style="margin: 5px 0; color: #002561;">
                    <span style="display: inline-block; background: #050032; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">Sistema Automatizado</span>
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px; text-align: center; color: #6b7a80; font-size: 12px;">
            <p style="margin: 0;">Esta é uma mensagem automática do sistema NIG. Por favor, não responda a este e-mail.</p>
        </div>
    </div>
</body>
</html>`
  }

  // Carregar dados do Mailling e inicializar tabela quando o modal abrir
  useEffect(() => {
    if (open && manutencao) {
      console.log('🔄 Modal aberto, carregando dados do mailling...')
      
      // Aguardar dados mestres estarem carregados antes de inicializar tabela
      const dadosMestresCarregados = md.clientes.length > 0 && md.operadoras.length > 0 && 
        md.produtos.length > 0 && md.sistemas.length > 0 && md.tiposCadastro.length > 0 && 
        md.padrao.length > 0 && md.contratos.length > 0
      
      if (!dadosMestresCarregados) {
        console.log('⏳ Aguardando dados mestres carregarem...')
        // Sincronizar dados mestres se necessário
        md.syncFromApi?.()
        return
      }
      
      // Carregar dados existentes na primeira linha da tabela
      const cliente = md.clientes.find(c => c.id === manutencao?.clienteId)
      const operadora = md.operadoras.find(o => o.id === manutencao?.operadoraId)
      const produto = md.produtos.find(p => p.id === manutencao?.produtoId)
      const sistema = md.sistemas.find(s => s.id === manutencao?.sistemaId)
      const tipoServico = md.tiposCadastro.find(t => t.id === manutencao?.tipoServicoId)
      const tipo = md.padrao.find(t => t.id === manutencao?.tipoId)
      const contrato = manutencao?.contratoId ? 
        md.contratos.find(c => c.id === manutencao.contratoId) : null

      console.log('📊 Inicializando tabela com dados da manutenção:', {
        contrato: contrato?.codigo || contrato?.numero || manutencao?.ticket,
        operadora: operadora?.nome,
        produto: produto?.nome,
        atualizacao: tipoServico?.nome,
        subtipo: tipo?.nome,
        tipo: sistema?.nome
      })

      // Atualizar primeira linha com dados existentes
      setLinhasTabela([{
        id: 1,
        contrato: contrato?.codigo || contrato?.numero || manutencao?.ticket || '',
        operadora: operadora?.nome || '',
        produto: produto?.nome || '',
        atualizacao: tipoServico?.nome || '',
        subtipo: tipo?.nome || '',
        tipo: sistema?.nome || ''
      }])
      
      // Inicializar descrição editável com a descrição da manutenção
      if (!descricaoEditavel && manutencao?.descricao) {
        setDescricaoEditavel(manutencao.descricao)
      }
      console.log('📊 Contatos atuais no store:', maillingStore.contacts.length)
      console.log('📊 Contatos no localStorage:', localStorage.getItem('mailling-v1') ? JSON.parse(localStorage.getItem('mailling-v1')!).length : 0)
      
      setCarregandoMailling(true)
      
      // Testar API diretamente primeiro
      const testApi = async () => {
        try {
          console.log('🧪 Testando API diretamente...')
          const { api } = await import('../lib/api')
          const response = await api.get('/mailling')
          console.log('🧪 Resposta da API:', response)
          console.log('🧪 Quantidade de contatos da API:', response.length)
        } catch (error) {
          console.error('❌ Erro na API:', error)
        }
      }
      
      testApi().then(() => {
        // Depois tentar sincronizar
        maillingStore.syncFromApi?.().then(() => {
          console.log('✅ SyncFromApi concluído, contatos agora:', maillingStore.contacts.length)
          setCarregandoMailling(false)
        }).catch((error) => {
          console.error('❌ Erro no syncFromApi:', error)
          setCarregandoMailling(false)
        })
      })
    }
  }, [open, manutencao, md.clientes.length, md.operadoras.length, md.produtos.length, md.sistemas.length, md.tiposCadastro.length, md.padrao.length, md.contratos.length, descricaoEditavel])

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

      // Inicializar descrição editável se ainda não foi definida
      if (!descricaoEditavel) {
        setDescricaoEditavel(manutencao.descricao || 'Alteração realizada')
      }

      const email = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alteração de Contrato - ${manutencao?.ticket || 'N/A'}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #1a1a2e 75%, #16213e 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(0, 159, 223, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
            pointer-events: none;
        }
        .header::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: 
                linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.02) 50%, transparent 70%),
                linear-gradient(-45deg, transparent 30%, rgba(255, 255, 255, 0.01) 50%, transparent 70%);
            animation: shimmer 8s ease-in-out infinite;
            pointer-events: none;
        }
        @keyframes shimmer {
            0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 2;
            letter-spacing: 1px;
        }
        .header p {
            margin: 12px 0 0 0;
            opacity: 0.85;
            font-size: 15px;
            font-weight: 400;
            position: relative;
            z-index: 2;
            letter-spacing: 0.5px;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #050032;
        }
        .info-box {
            background: #f7fafc;
            border-left: 4px solid #4299e1;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .info-box p {
            margin: 0;
            font-weight: 500;
            color: #050032;
        }
        .table-container {
            margin: 25px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        th {
            background: linear-gradient(135deg, #050032 0%, #002561 100%);
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        td {
            padding: 15px 12px;
            border-bottom: 1px solid #DCDFE3;
            vertical-align: top;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        tr:hover {
            background-color: #edf2f7;
        }
        .contract-cell {
            font-weight: 600;
            color: #2b6cb0;
            font-size: 15px;
        }
        .operator-cell {
            font-weight: 500;
            color: #050032;
        }
        .product-cell {
            background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
            color: #234e52;
            font-weight: 500;
        }
        .update-cell {
            background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
            color: #7c2d12;
            font-weight: 500;
        }
        .subtype-cell {
            background: linear-gradient(135deg, #f3e8ff 0%, #d8b4fe 100%);
            color: #581c87;
            font-weight: 500;
        }
        .type-cell {
            background: linear-gradient(135deg, #e6f7ed 0%, #a7f3d0 100%);
            color: #064e3b;
            font-weight: 500;
        }
        .description-section {
            background: #f8fafc;
            border: 1px solid #DCDFE3;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .description-content {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 15px;
            min-height: 60px;
        }
        .conclusion {
            background: #f0fff4;
            border: 1px solid #9ae6b4;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .conclusion p {
            margin: 0;
            color: #22543d;
            font-weight: 500;
        }
        .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #DCDFE3;
        }
        .signature p {
            margin: 5px 0;
            color: #002561;
        }
        .signature .company {
            font-weight: 600;
            color: #050032;
            font-size: 16px;
        }
        .footer {
            background: #f7fafc;
            padding: 20px;
            text-align: center;
            color: #6b7a80;
            font-size: 12px;
        }
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, #050032 0%, #009FDF 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🔔 Alteração Cadastral</h1>
            <p>Notificação Automática - Sistema NIG</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                <strong>Prezados,</strong>
            </div>
            
            <div class="info-box">
                <p>📋 Informamos que o cliente <strong>${cliente?.nome || 'N/A'}</strong> sofreu alteração, sendo:</p>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Contrato</th>
                            <th>Operadora</th>
                            <th>Produto</th>
                            <th>Atualização</th>
                            <th>Subtipo</th>
                            <th>Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="contract-cell">${contrato?.codigo || contrato?.numero || manutencao.ticket || 'N/A'}</td>
                            <td class="operator-cell">${operadora?.nome || 'N/A'}</td>
                            <td class="product-cell">${produto?.nome || 'N/A'}</td>
                            <td class="update-cell">${tipoServico?.nome || 'N/A'}</td>
                            <td class="subtype-cell">${tipo?.nome || 'N/A'}</td>
                            <td class="type-cell">${sistema?.nome || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="description-section">
                <h3 style="margin: 0 0 15px 0; color: #050032; font-size: 16px; font-weight: 600;">📝 Descrição da Alteração</h3>
                <div class="description-content">
                    <p style="margin: 0; line-height: 1.6; color: #002561; font-size: 14px; white-space: pre-wrap;">${descricaoEditavel || manutencao.descricao || 'Alteração realizada'}</p>
                </div>
            </div>
            
            <div class="conclusion">
                <p>✅ <strong>O Edge e Move encontram-se atualizados.</strong> Solicitamos replicar esta informação com a sua equipe.</p>
            </div>
            
            <div class="signature">
                <p>Atenciosamente,</p>
                <p class="company">NIG - Núcleo de Inteligência e Governança</p>
                <p><span class="badge">Sistema Automatizado</span></p>
            </div>
        </div>
        
        <div class="footer">
            <p>Esta é uma mensagem automática do sistema NIG. Por favor, não responda a este e-mail.</p>
        </div>
    </div>
</body>
</html>`

      // Gerar HTML completo para visualização e cópia
      const emailHtml = buildEmailHtml()
      setEmailCompleto(emailHtml)
      
      // Versão compatível com Outlook (usa o mesmo layout simplificado)
      setEmailOutlook(emailHtml)
      setEmailEditado(emailHtml)
      setConteudoEditavel(extrairConteudoEditavel(emailHtml))
    }
  }, [manutencao, md.clientes, md.operadoras, md.produtos, md.sistemas, md.tiposCadastro, md.padrao, md.contratos, descricaoEditavel])

  // Filtrar contatos do Mailling baseado na manutenção
  useEffect(() => {
    console.log('🔍 Filtrando contatos do mailling...')
    console.log('📊 Manutenção:', manutencao)
    console.log('📊 Contatos disponíveis:', maillingStore.contacts.length)
    console.log('📊 Clientes disponíveis:', md.clientes.length)
    
    if (manutencao && maillingStore.contacts.length > 0) {
      let contatosFiltrados = maillingStore.contacts
      console.log('📊 Contatos antes do filtro:', contatosFiltrados.length)

      // Filtrar por área se disponível
      if (manutencao.areaId) {
        contatosFiltrados = contatosFiltrados.filter(contato => 
          contato.area === manutencao.areaId
        )
        console.log('📊 Após filtro por área:', contatosFiltrados.length)
      }

      // Filtrar por grupos relacionados ao cliente
      if (manutencao.clienteId) {
        const cliente = md.clientes.find(c => c.id === manutencao.clienteId)
        console.log('📊 Cliente encontrado:', cliente)
        if (cliente?.grupoEconomico) {
          contatosFiltrados = contatosFiltrados.filter(contato => 
            contato.grupos?.some((grupoId: string) => 
              md.grupos.find(g => g.id === grupoId)?.nome === cliente.grupoEconomico
            )
          )
          console.log('📊 Após filtro por grupo:', contatosFiltrados.length)
        }
      }

      // Extrair e-mails únicos
      const emails = contatosFiltrados
        .map(contato => contato.email)
        .filter((email, index, self) => email && self.indexOf(email) === index)
        .slice(0, 20) // Limitar a 20 e-mails

      console.log('📧 E-mails filtrados:', emails)
      setDestinatarios(emails)
    } else if (manutencao && maillingStore.contacts.length === 0) {
      console.log('⚠️ Nenhum contato de mailling disponível')
      setDestinatarios([])
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


  const handleCopyOutlook = async () => {
    try {
      const htmlContent = buildEmailHtml()
      if (navigator.clipboard && 'write' in navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = htmlContent
        const plainText = tempDiv.innerText
        const clipboardItem = new window.ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        })
        await navigator.clipboard.write([clipboardItem])
      } else {
        await navigator.clipboard.writeText(htmlContent)
      }
      setCopiadoEmail(true)
      setTimeout(() => setCopiadoEmail(false), 2000)
      showDownloadFeedback('📋 HTML copiado com formatação!')
    } catch (error) {
      console.error('Erro ao copiar e-mail Outlook:', error)
      alert('Erro ao copiar o e-mail. Tente novamente.')
    }
  }

  const handleSalvarAlteracoes = () => {
    // Forçar atualização do preview
    setPreviewAtualizado(prev => prev + 1)
    
    const feedback = document.createElement('div')
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #009FDF;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `
    feedback.textContent = '✅ Preview atualizado com sucesso!'
    document.body.appendChild(feedback)
    
    setTimeout(() => {
      document.body.removeChild(feedback)
    }, 3000)
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
          background: 'linear-gradient(135deg, #050032 0%, #009FDF 100%)',
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
        <Box sx={{ p: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #DCDFE3 100%)' }}>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box className="flex items-center gap-3 mb-3">
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, #002561 0%, #009FDF 100%)',
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
                color: '#6b7a80',
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
            <InputLabel sx={{ color: '#6b7a80' }}>
              {carregandoMailling ? 'Carregando e-mails...' : 'E-mails do Mailling'}
            </InputLabel>
            <Select
              multiple
              value={emailsSelecionados}
              onChange={(e) => setEmailsSelecionados(e.target.value as string[])}
              disabled={carregandoMailling}
              input={<OutlinedInput 
                label={carregandoMailling ? 'Carregando e-mails...' : 'E-mails do Mailling'} 
                sx={{ 
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9ca3af'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#009FDF',
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
                        background: 'linear-gradient(135deg, #002561 0%, #009FDF 100%)',
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
              {destinatarios.length === 0 && !carregandoMailling ? (
                <MenuItem disabled>
                  <ListItemText 
                    primary="Nenhum e-mail encontrado" 
                    secondary="Verifique se há contatos cadastrados no mailling"
                  />
                </MenuItem>
              ) : (
                destinatarios.map((email) => (
                  <MenuItem key={email} value={email} sx={{ borderRadius: '8px', mx: 1, my: 0.5 }}>
                    <Checkbox 
                      checked={emailsSelecionados.indexOf(email) > -1} 
                      sx={{ 
                        color: '#009FDF',
                        '&.Mui-checked': { color: '#009FDF' }
                      }}
                    />
                    <ListItemText primary={email} />
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          
          <Box className="mt-3 flex gap-2">
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
            
            {destinatarios.length === 0 && !carregandoMailling && (
              <Button
                onClick={() => {
                  console.log('🔄 Forçando recarregamento do mailling...')
                  setCarregandoMailling(true)
                  maillingStore.syncFromApi?.().then(() => {
                    console.log('✅ Recarregamento concluído, contatos:', maillingStore.contacts.length)
                    setCarregandoMailling(false)
                  }).catch((error) => {
                    console.error('❌ Erro no recarregamento:', error)
                    setCarregandoMailling(false)
                  })
                }}
                variant="outlined"
                size="small"
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  borderColor: '#E5B800',
                  color: '#E5B800',
                  '&:hover': {
                    borderColor: '#C9A227',
                    background: '#FBF4D4'
                  }
                }}
              >
                🔄 Recarregar
              </Button>
            )}
          </Box>
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 2, p: 2, background: '#f3f4f6', borderRadius: '8px', fontSize: '12px' }}>
              <Typography variant="caption" display="block">
                <strong>Debug Info:</strong>
              </Typography>
              <Typography variant="caption" display="block">
                Contatos no store: {maillingStore.contacts.length}
              </Typography>
              <Typography variant="caption" display="block">
                E-mails filtrados: {destinatarios.length}
              </Typography>
              <Typography variant="caption" display="block">
                Manutenção área: {manutencao?.areaId || 'N/A'}
              </Typography>
              <Typography variant="caption" display="block">
                Cliente: {manutencao?.clienteId || 'N/A'}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Preview do E-mail */}
        <Box sx={{ p: 3, background: '#f8fafc' }}>
            <Box className="flex items-center justify-between mb-4">
              <Box className="flex items-center gap-2">
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, #E5B800 0%, #C9A227 100%)',
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
                  {modoEdicao === 'editar' ? 'Editor de E-mail' : 'Preview do E-mail'}
                </Typography>
              </Box>
              
              <Box className="flex gap-2">
                <Button
                  onClick={() => setEditandoDescricao(!editandoDescricao)}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                    borderColor: '#6b7a80',
                    color: '#6b7a80',
                    '&:hover': {
                      borderColor: '#4b5563',
                      background: '#f9fafb'
                    }
                  }}
                >
                  {editandoDescricao ? '✅ Salvar' : '✏️ Editar Descrição'}
                </Button>
                
                <Button
                  onClick={() => setModoEdicao(modoEdicao === 'visualizar' ? 'editar' : 'visualizar')}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                    borderColor: modoEdicao === 'editar' ? '#00A649' : '#009FDF',
                    color: modoEdicao === 'editar' ? '#00A649' : '#009FDF',
                    '&:hover': {
                      borderColor: modoEdicao === 'editar' ? '#008c3a' : '#009FDF',
                      background: modoEdicao === 'editar' ? '#f0fdf4' : '#eff6ff'
                    }
                  }}
                >
                  {modoEdicao === 'editar' ? (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      Visualizar
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-1" />
                      Editar E-mail
                    </>
                  )}
                </Button>
              </Box>
            </Box>
          
          {editandoDescricao && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#6b7a80' }}>
                Editar descrição da alteração:
              </Typography>
              <TextField
                multiline
                rows={6}
                fullWidth
                value={descricaoEditavel}
                onChange={(e) => setDescricaoEditavel(e.target.value)}
                placeholder="Digite a descrição da alteração..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#009FDF',
                      borderWidth: '2px'
                    }
                  }
                }}
              />
            </Box>
          )}
          
          <Paper 
            sx={{ 
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #DCDFE3'
            }}
          >
            <Box 
              sx={{ 
                p: 0,
                background: 'white',
                maxHeight: modoEdicao === 'editar' ? '700px' : '400px',
                overflow: 'auto'
              }}
            >
              {modoEdicao === 'editar' ? (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>
                      ✏️ Editor de Blocos - Edite cada seção do e-mail
                    </Typography>
                    <PrimaryActionButton
                      onClick={handleSalvarAlteracoes}
                      startIcon={<span>💾</span>}
                      sx={{ borderRadius: '6px', px: 2, py: 1 }}
                    >
                      Salvar Alterações
                    </PrimaryActionButton>
                  </Box>
                  

                  {/* Blocos da Tabela */}
                  <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #DCDFE3' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ color: '#1e293b', fontWeight: 600 }}>
                        📊 Dados da Tabela Técnica
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={adicionarLinhaTabela}
                        startIcon={<span>➕</span>}
                        sx={{
                          borderRadius: '6px',
                          textTransform: 'none',
                          fontSize: '12px',
                          fontWeight: 500
                        }}
                      >
                        Adicionar Linha
                      </Button>
                    </Box>
                    
                    {linhasTabela.map((linha, index) => (
                      <Box key={linha.id} sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: '6px', border: '1px solid #DCDFE3' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#6b7a80', fontWeight: 500 }}>
                            Linha {index + 1}
                          </Typography>
                          {linhasTabela.length > 1 && (
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => removerLinhaTabela(linha.id)}
                              sx={{
                                minWidth: 'auto',
                                p: 0.5,
                                color: '#DA3832',
                                '&:hover': { backgroundColor: '#fef2f2' }
                              }}
                            >
                              🗑️
                            </Button>
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          {/* Contrato */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#6b7a80', fontWeight: 600 }}>
                              📄 Contrato
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              value={linha.contrato}
                              onChange={(e) => atualizarLinhaTabela(linha.id, 'contrato', e.target.value)}
                              placeholder="Código/Número do contrato"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '6px',
                                  '& fieldset': { borderColor: '#d1d5db' },
                                  '&:hover fieldset': { borderColor: '#9ca3af' },
                                  '&.Mui-focused fieldset': { borderColor: '#009FDF', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Operadora */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#6b7a80', fontWeight: 600 }}>
                              🏢 Operadora
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              value={linha.operadora}
                              onChange={(e) => atualizarLinhaTabela(linha.id, 'operadora', e.target.value)}
                              placeholder="Nome da operadora"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '6px',
                                  '& fieldset': { borderColor: '#d1d5db' },
                                  '&:hover fieldset': { borderColor: '#9ca3af' },
                                  '&.Mui-focused fieldset': { borderColor: '#009FDF', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Produto */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#6b7a80', fontWeight: 600 }}>
                              📦 Produto
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              value={linha.produto}
                              onChange={(e) => atualizarLinhaTabela(linha.id, 'produto', e.target.value)}
                              placeholder="Nome do produto"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '6px',
                                  '& fieldset': { borderColor: '#d1d5db' },
                                  '&:hover fieldset': { borderColor: '#9ca3af' },
                                  '&.Mui-focused fieldset': { borderColor: '#009FDF', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Atualização */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#6b7a80', fontWeight: 600 }}>
                              🔄 Atualização
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              value={linha.atualizacao}
                              onChange={(e) => atualizarLinhaTabela(linha.id, 'atualizacao', e.target.value)}
                              placeholder="Tipo de atualização"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '6px',
                                  '& fieldset': { borderColor: '#d1d5db' },
                                  '&:hover fieldset': { borderColor: '#9ca3af' },
                                  '&.Mui-focused fieldset': { borderColor: '#009FDF', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Subtipo */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#6b7a80', fontWeight: 600 }}>
                              🏷️ Subtipo
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              value={linha.subtipo}
                              onChange={(e) => atualizarLinhaTabela(linha.id, 'subtipo', e.target.value)}
                              placeholder="Subtipo da alteração"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '6px',
                                  '& fieldset': { borderColor: '#d1d5db' },
                                  '&:hover fieldset': { borderColor: '#9ca3af' },
                                  '&.Mui-focused fieldset': { borderColor: '#009FDF', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Tipo */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#6b7a80', fontWeight: 600 }}>
                              ⚙️ Tipo
                            </Typography>
                            <TextField
                              fullWidth
                              size="small"
                              value={linha.tipo}
                              onChange={(e) => atualizarLinhaTabela(linha.id, 'tipo', e.target.value)}
                              placeholder="Tipo do sistema"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '6px',
                                  '& fieldset': { borderColor: '#d1d5db' },
                                  '&:hover fieldset': { borderColor: '#9ca3af' },
                                  '&.Mui-focused fieldset': { borderColor: '#009FDF', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Bloco Descrição */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#6b7a80', fontWeight: 600 }}>
                      📝 Descrição da Alteração
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={blocoDescricao}
                      onChange={(e) => setBlocoDescricao(e.target.value)}
                      placeholder="Descreva detalhadamente a alteração realizada..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          '& fieldset': { borderColor: '#d1d5db' },
                          '&:hover fieldset': { borderColor: '#9ca3af' },
                          '&.Mui-focused fieldset': { borderColor: '#009FDF', borderWidth: '2px' }
                        }
                      }}
                    />
                  </Box>


                  <Box sx={{ mt: 3, p: 2, backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
                    <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 500 }}>
                      💡 <strong>Dica:</strong> Os dados da manutenção são carregados automaticamente na primeira linha. 
                      Use "Adicionar Linha" para incluir novos dados técnicos. O preview é atualizado automaticamente em tempo real.
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box
                  key={previewAtualizado}
                  sx={{
                    '& *': {
                      fontFamily: 'inherit !important'
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: gerarHTMLComBlocos() }}
                />
              )}
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
            color: '#6b7a80',
            '&:hover': {
              borderColor: '#9ca3af',
              background: '#f9fafb'
            }
          }}
        >
          Fechar
        </Button>
        <Box className="flex gap-2 flex-wrap">
          <Button
            startIcon={copiadoEmail ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopyOutlook}
            variant="contained"
            color={copiadoEmail ? "success" : "primary"}
            sx={{
              borderRadius: '8px',
              fontWeight: 500,
              px: 3,
              py: 1.5
            }}
          >
            {copiadoEmail ? 'Copiado!' : 'Copiar e-mail (Outlook)'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

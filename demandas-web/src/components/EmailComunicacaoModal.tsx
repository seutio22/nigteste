import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Chip, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, IconButton, Tooltip, Card, CardContent, Divider, Paper } from '@mui/material'
import { Copy, Mail, Users, CheckCircle, X, Settings, Send, Image as ImageIcon, Download, Edit3, Eye, Code, FileText } from 'lucide-react'
import { useMasterDataStore } from '../store/masterDataStore'
import { useMaillingStore } from '../store/maillingStore'
import { RichTextEditor } from './RichTextEditor'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ShadingType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

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
  const [salvandoArquivo, setSalvandoArquivo] = useState(false)
  const [previewAtualizado, setPreviewAtualizado] = useState(0)
  const [carregandoMailling, setCarregandoMailling] = useState(false)
  const [gerandoImagem, setGerandoImagem] = useState(false)
  const [gerandoWord, setGerandoWord] = useState(false)
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
            <div style="font-size: 16px; margin-bottom: 20px; color: #2d3748;">
                <strong>${blocoSaudacao}</strong>
            </div>
            
            <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 500; color: #2d3748;">
                    📋 ${blocoInformacao.replace('o cliente', `<strong>${cliente?.nome || 'N/A'}</strong>`)}
                </p>
            </div>
            
            <!-- Table -->
            <div style="margin: 25px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #2d3748; color: white;">
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Contrato</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Operadora</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Produto</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Atualização</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Subtipo</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela.map((linha, index) => `
                        <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2b6cb0; font-size: 15px;">${linha.contrato || contrato?.codigo || contrato?.numero || manutencao?.ticket || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #2d3748;">${linha.operadora || operadora?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #e6fffa; color: #234e52; font-weight: 500;">${linha.produto || produto?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #fef5e7; color: #7c2d12; font-weight: 500;">${linha.atualizacao || tipoServico?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #f3e8ff; color: #581c87; font-weight: 500;">${linha.subtipo || tipo?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #ecfdf5; color: #064e3b; font-weight: 500;">${linha.tipo || sistema?.nome || 'N/A'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Description -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 16px; font-weight: 600;">📝 Descrição da Alteração</h3>
                <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; min-height: 60px;">
                    <p style="margin: 0; line-height: 1.6; color: #4a5568; font-size: 14px; white-space: pre-wrap;">${blocoDescricao}</p>
                </div>
            </div>
            
            <!-- Conclusion -->
            <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; color: #22543d; font-weight: 500;">
                    ✅ <strong>${blocoConclusao}</strong>
                </p>
            </div>
            
            <!-- Signature -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                <p style="margin: 5px 0; color: #4a5568;">Atenciosamente,</p>
                <p style="margin: 5px 0; font-weight: 600; color: #2d3748; font-size: 16px;">NIG - Núcleo de Informações Gerenciais</p>
                <p style="margin: 5px 0; color: #4a5568;">
                    <span style="display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">Sistema Automatizado</span>
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 12px;">
            <p style="margin: 0;">Esta é uma mensagem automática do sistema NIG. Por favor, não responda a este e-mail.</p>
        </div>
    </div>
</body>
</html>`
  }

  // Carregar dados do Mailling e inicializar tabela quando o modal abrir
  useEffect(() => {
    if (open) {
      console.log('🔄 Modal aberto, carregando dados do mailling...')
      
      // Carregar dados existentes na primeira linha da tabela
      const cliente = md.clientes.find(c => c.id === manutencao?.clienteId)
      const operadora = md.operadoras.find(o => o.id === manutencao?.operadoraId)
      const produto = md.produtos.find(p => p.id === manutencao?.produtoId)
      const sistema = md.sistemas.find(s => s.id === manutencao?.sistemaId)
      const tipoServico = md.tiposCadastro.find(t => t.id === manutencao?.tipoServicoId)
      const tipo = md.padrao.find(t => t.id === manutencao?.tipoId)
      const contrato = manutencao?.contratoId ? 
        md.contratos.find(c => c.id === manutencao.contratoId) : null

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
                radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
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
            color: #2d3748;
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
            color: #2d3748;
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
            background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
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
            border-bottom: 1px solid #e2e8f0;
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
            color: #2d3748;
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
            background: linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%);
            color: #064e3b;
            font-weight: 500;
        }
        .description-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
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
            border-top: 2px solid #e2e8f0;
        }
        .signature p {
            margin: 5px 0;
            color: #4a5568;
        }
        .signature .company {
            font-weight: 600;
            color: #2d3748;
            font-size: 16px;
        }
        .footer {
            background: #f7fafc;
            padding: 20px;
            text-align: center;
            color: #718096;
            font-size: 12px;
        }
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 16px; font-weight: 600;">📝 Descrição da Alteração</h3>
                <div class="description-content">
                    <p style="margin: 0; line-height: 1.6; color: #4a5568; font-size: 14px; white-space: pre-wrap;">${descricaoEditavel || manutencao.descricao || 'Alteração realizada'}</p>
                </div>
            </div>
            
            <div class="conclusion">
                <p>✅ <strong>O Edge e Move encontram-se atualizados.</strong> Solicitamos replicar esta informação com a sua equipe.</p>
            </div>
            
            <div class="signature">
                <p>Atenciosamente,</p>
                <p class="company">NIG - Núcleo de Informações Gerenciais</p>
                <p><span class="badge">Sistema Automatizado</span></p>
            </div>
        </div>
        
        <div class="footer">
            <p>Esta é uma mensagem automática do sistema NIG. Por favor, não responda a este e-mail.</p>
        </div>
    </div>
</body>
</html>`

      setEmailCompleto(email)
      
      // Gerar versão Outlook-friendly (HTML simples, compatível)
      const emailOutlookCompatible = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Alteração de Contrato - ${manutencao?.ticket || 'N/A'}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🔔 Alteração Cadastral</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Notificação Automática - Sistema NIG</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <div style="font-size: 16px; margin-bottom: 20px; color: #2d3748;">
                <strong>Prezados,</strong>
            </div>
            
            <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 500; color: #2d3748;">
                    📋 Informamos que o cliente <strong>${cliente?.nome || 'N/A'}</strong> sofreu alteração, sendo:
                </p>
            </div>
            
            <!-- Table -->
            <div style="margin: 25px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background: #2d3748; color: white;">
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Contrato</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Operadora</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Produto</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Atualização</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Subtipo</th>
                            <th style="padding: 15px 12px; text-align: left; font-weight: 600; font-size: 13px;">Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2b6cb0; font-size: 15px;">${contrato?.codigo || contrato?.numero || manutencao.ticket || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #2d3748;">${operadora?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #e6fffa; color: #234e52; font-weight: 500;">${produto?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #fef5e7; color: #7c2d12; font-weight: 500;">${tipoServico?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #f3e8ff; color: #581c87; font-weight: 500;">${tipo?.nome || 'N/A'}</td>
                            <td style="padding: 15px 12px; border-bottom: 1px solid #e2e8f0; background: #ecfdf5; color: #064e3b; font-weight: 500;">${sistema?.nome || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Description -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 16px; font-weight: 600;">📝 Descrição da Alteração</h3>
                <div style="background: white; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; min-height: 60px;">
                    <p style="margin: 0; line-height: 1.6; color: #4a5568; font-size: 14px; white-space: pre-wrap;">${descricaoEditavel || manutencao.descricao || 'Alteração realizada'}</p>
                </div>
            </div>
            
            <!-- Conclusion -->
            <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; color: #22543d; font-weight: 500;">
                    ✅ <strong>O Edge e Move encontram-se atualizados.</strong> Solicitamos replicar esta informação com a sua equipe.
                </p>
            </div>
            
            <!-- Signature -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                <p style="margin: 5px 0; color: #4a5568;">Atenciosamente,</p>
                <p style="margin: 5px 0; font-weight: 600; color: #2d3748; font-size: 16px;">NIG - Núcleo de Informações Gerenciais</p>
                <p style="margin: 5px 0; color: #4a5568;">
                    <span style="display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">Sistema Automatizado</span>
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px; text-align: center; color: #718096; font-size: 12px;">
            <p style="margin: 0;">Esta é uma mensagem automática do sistema NIG. Por favor, não responda a este e-mail.</p>
        </div>
    </div>
</body>
</html>`
      
      setEmailOutlook(emailOutlookCompatible)
      setEmailEditado(emailOutlookCompatible)
      setConteudoEditavel(extrairConteudoEditavel(emailOutlookCompatible))
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
      const emailParaCopiar = gerarHTMLComBlocos()
      await navigator.clipboard.writeText(emailParaCopiar)
      setCopiadoEmail(true)
      setTimeout(() => setCopiadoEmail(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar e-mail Outlook:', err)
    }
  }

  const handleSalvarAlteracoes = () => {
    // Forçar atualização do preview
    setPreviewAtualizado(prev => prev + 1)
    
    // Feedback visual
    const feedback = document.createElement('div')
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
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

  const handleSalvarArquivo = async () => {
    try {
      setSalvandoArquivo(true)
      const emailParaSalvar = gerarHTMLComBlocos()
      
      // Criar nome do arquivo com timestamp e ticket
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const ticket = manutencao?.ticket || 'N/A'
      const nomeArquivo = `email-comunicacao-${ticket}-${timestamp}.html`
      
      // Criar blob e fazer download
      const blob = new Blob([emailParaSalvar], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      
      setSalvandoArquivo(false)
      
      // Mostrar feedback de sucesso
      const feedback = document.createElement('div')
      feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `
      feedback.textContent = `✅ Arquivo salvo: ${nomeArquivo}`
      document.body.appendChild(feedback)
      
      setTimeout(() => {
        document.body.removeChild(feedback)
      }, 3000)
      
    } catch (err) {
      console.error('Erro ao salvar arquivo:', err)
      setSalvandoArquivo(false)
    }
  }

  const handleSelectAll = () => {
    if (emailsSelecionados.length === destinatarios.length) {
      setEmailsSelecionados([])
    } else {
      setEmailsSelecionados([...destinatarios])
    }
  }

  const handleGerarImagem = async () => {
    setGerandoImagem(true)
    
    try {
      // Criar um elemento temporário com o HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = emailCompleto
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '800px'
      tempDiv.style.background = 'white'
      document.body.appendChild(tempDiv)

      // Usar html2canvas para gerar a imagem
      const { default: html2canvas } = await import('html2canvas')
      
      const canvas = await html2canvas(tempDiv, {
        width: 800,
        height: tempDiv.scrollHeight,
        scale: 2, // Maior resolução
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      })

      // Converter para blob e fazer download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `email-manutencao-${manutencao?.ticket || 'N/A'}-${new Date().toISOString().split('T')[0]}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      }, 'image/png')

      // Remover elemento temporário
      document.body.removeChild(tempDiv)
      
    } catch (error) {
      console.error('Erro ao gerar imagem:', error)
      alert('Erro ao gerar imagem. Tente novamente.')
    } finally {
      setGerandoImagem(false)
    }
  }

  const handleGerarWord = async () => {
    setGerandoWord(true)
    
    try {
      const cliente = md.clientes.find(c => c.id === manutencao?.clienteId)
      const operadora = md.operadoras.find(o => o.id === manutencao?.operadoraId)
      const produto = md.produtos.find(p => p.id === manutencao?.produtoId)
      const sistema = md.sistemas.find(s => s.id === manutencao?.sistemaId)
      const tipoServico = md.tiposCadastro.find(t => t.id === manutencao?.tipoServicoId)
      const tipo = md.padrao.find(t => t.id === manutencao?.tipoId)
      const contrato = manutencao?.contratoId ? 
        md.contratos.find(c => c.id === manutencao.contratoId) : null

      // Criar tabela com os dados e cores de fundo
      const tableRows = linhasTabela.map((linha, index) => {
        const isEven = index % 2 === 0
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: linha.contrato || contrato?.codigo || contrato?.numero || manutencao?.ticket || 'N/A',
                  bold: true,
                  color: "2B6CB0",
                  size: 30 // 15pt
                })],
                alignment: AlignmentType.LEFT
              })],
              width: { size: 16.6, type: WidthType.PERCENTAGE },
              shading: { fill: isEven ? "F8F9FA" : "FFFFFF", type: ShadingType.SOLID }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: linha.operadora || operadora?.nome || 'N/A',
                  color: "2D3748",
                  size: 28 // 14pt
                })],
                alignment: AlignmentType.LEFT
              })],
              width: { size: 16.6, type: WidthType.PERCENTAGE },
              shading: { fill: isEven ? "F8F9FA" : "FFFFFF", type: ShadingType.SOLID }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: linha.produto || produto?.nome || 'N/A',
                  color: "234E52",
                  size: 28 // 14pt
                })],
                alignment: AlignmentType.LEFT
              })],
              width: { size: 16.6, type: WidthType.PERCENTAGE },
              shading: { fill: isEven ? "E6FFFA" : "B2F5EA", type: ShadingType.SOLID }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: linha.atualizacao || tipoServico?.nome || 'N/A',
                  color: "7C2D12",
                  size: 28 // 14pt
                })],
                alignment: AlignmentType.LEFT
              })],
              width: { size: 16.6, type: WidthType.PERCENTAGE },
              shading: { fill: isEven ? "FEF5E7" : "FED7AA", type: ShadingType.SOLID }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: linha.subtipo || tipo?.nome || 'N/A',
                  color: "581C87",
                  size: 28 // 14pt
                })],
                alignment: AlignmentType.LEFT
              })],
              width: { size: 16.6, type: WidthType.PERCENTAGE },
              shading: { fill: isEven ? "F3E8FF" : "D8B4FE", type: ShadingType.SOLID }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: linha.tipo || sistema?.nome || 'N/A',
                  color: "064E3B",
                  size: 28 // 14pt
                })],
                alignment: AlignmentType.LEFT
              })],
              width: { size: 16.6, type: WidthType.PERCENTAGE },
              shading: { fill: isEven ? "ECFDF5" : "A7F3D0", type: ShadingType.SOLID }
            })
          ]
        })
      })

      // Criar documento Word com design profissional
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440, // 2.54cm
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: [
            // Cabeçalho com fundo escuro
            new Paragraph({
              children: [
                new TextRun({
                  text: blocoCabecalho,
                  bold: true,
                  size: 36, // 18pt
                  color: "FFFFFF"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              shading: {
                fill: "1A1A2E",
                type: ShadingType.SOLID
              },
              indent: { left: -1440, right: -1440 },
              border: {
                top: { style: BorderStyle.SINGLE, size: 0, color: "1A1A2E" },
                bottom: { style: BorderStyle.SINGLE, size: 0, color: "1A1A2E" },
                left: { style: BorderStyle.SINGLE, size: 0, color: "1A1A2E" },
                right: { style: BorderStyle.SINGLE, size: 0, color: "1A1A2E" }
              }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: blocoSubtitulo,
                  size: 26, // 13pt
                  color: "FFFFFF"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 480 },
              shading: {
                fill: "1A1A2E",
                type: ShadingType.SOLID
              },
              indent: { left: -1440, right: -1440 }
            }),
            
            // Espaço após cabeçalho
            new Paragraph({
              children: [],
              spacing: { after: 360 }
            }),
            
            // Saudação
            new Paragraph({
              children: [
                new TextRun({
                  text: blocoSaudacao,
                  bold: true,
                  size: 32 // 16pt
                })
              ],
              spacing: { after: 360 }
            }),
            
            // Informação destacada
            new Paragraph({
              children: [
                new TextRun({
                  text: "📋 Informamos que o cliente ",
                  size: 28 // 14pt
                }),
                new TextRun({
                  text: cliente?.nome || 'N/A',
                  bold: true,
                  size: 28,
                  color: "1E40AF"
                }),
                new TextRun({
                  text: " sofreu alteração, sendo:",
                  size: 28
                })
              ],
              spacing: { before: 240, after: 360 },
              shading: {
                fill: "F7FAFC",
                type: ShadingType.SOLID
              },
              indent: { left: 480 },
              border: {
                left: { style: BorderStyle.SINGLE, size: 16, color: "4299E1" }
              }
            }),
            
            // Tabela com bordas e formatação
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" }
              },
              rows: [
                // Cabeçalho da tabela com fundo escuro
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Contrato", bold: true, color: "FFFFFF", size: 26 })]
                      })],
                      shading: { fill: "2D3748", type: ShadingType.SOLID },
                      width: { size: 16.6, type: WidthType.PERCENTAGE },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 }
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Operadora", bold: true, color: "FFFFFF", size: 26 })]
                      })],
                      shading: { fill: "2D3748", type: ShadingType.SOLID },
                      width: { size: 16.6, type: WidthType.PERCENTAGE },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 }
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Produto", bold: true, color: "FFFFFF", size: 26 })]
                      })],
                      shading: { fill: "2D3748", type: ShadingType.SOLID },
                      width: { size: 16.6, type: WidthType.PERCENTAGE },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 }
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Atualização", bold: true, color: "FFFFFF", size: 26 })]
                      })],
                      shading: { fill: "2D3748", type: ShadingType.SOLID },
                      width: { size: 16.6, type: WidthType.PERCENTAGE },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 }
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Subtipo", bold: true, color: "FFFFFF", size: 26 })]
                      })],
                      shading: { fill: "2D3748", type: ShadingType.SOLID },
                      width: { size: 16.6, type: WidthType.PERCENTAGE },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 }
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: "Tipo", bold: true, color: "FFFFFF", size: 26 })]
                      })],
                      shading: { fill: "2D3748", type: ShadingType.SOLID },
                      width: { size: 16.6, type: WidthType.PERCENTAGE },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 }
                    })
                  ]
                }),
                ...tableRows
              ]
            }),
            
            // Descrição com fundo destacado
            new Paragraph({
              children: [
                new TextRun({
                  text: "📝 Descrição da Alteração",
                  bold: true,
                  size: 30 // 15pt
                })
              ],
              spacing: { before: 480, after: 240 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: blocoDescricao || manutencao?.descricao || 'Alteração realizada',
                  size: 28 // 14pt
                })
              ],
              spacing: { after: 480 },
              shading: {
                fill: "FFFFFF",
                type: ShadingType.SOLID
              },
              indent: { left: 240 },
              border: {
                top: { style: BorderStyle.SINGLE, size: 2, color: "D1D5DB" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "D1D5DB" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "D1D5DB" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "D1D5DB" }
              }
            }),
            
            // Conclusão com fundo verde claro
            new Paragraph({
              children: [
                new TextRun({
                  text: "✅ ",
                  size: 28
                }),
                new TextRun({
                  text: blocoConclusao,
                  bold: true,
                  size: 28, // 14pt
                  color: "22543D"
                })
              ],
              spacing: { before: 360, after: 480 },
              shading: {
                fill: "F0FFF4",
                type: ShadingType.SOLID
              },
              indent: { left: 240 },
              border: {
                top: { style: BorderStyle.SINGLE, size: 2, color: "9AE6B4" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "9AE6B4" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "9AE6B4" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "9AE6B4" }
              }
            }),
            
            // Linha divisória antes da assinatura
            new Paragraph({
              children: [],
              border: {
                bottom: { style: BorderStyle.DOUBLE, size: 6, color: "E2E8F0" }
              },
              spacing: { before: 720, after: 360 }
            }),
            
            // Assinatura
            new Paragraph({
              children: [
                new TextRun({
                  text: "Atenciosamente,",
                  size: 28 // 14pt
                })
              ],
              spacing: { after: 240 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "NIG - Núcleo de Informações Gerenciais",
                  bold: true,
                  size: 32, // 16pt
                  color: "1E293B"
                })
              ],
              spacing: { after: 240 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Sistema Automatizado",
                  size: 22, // 11pt
                  italics: true,
                  color: "667EEA"
                })
              ],
              spacing: { after: 480 }
            }),
            
            // Rodapé
            new Paragraph({
              children: [
                new TextRun({
                  text: "Esta é uma mensagem automática do sistema NIG. Por favor, não responda a este e-mail.",
                  size: 22, // 11pt
                  color: "718096"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 480 }
            })
          ]
        }]
      })

      // Gerar e fazer download do arquivo
      const blob = await Packer.toBlob(doc)
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const ticket = manutencao?.ticket || 'N/A'
      const nomeArquivo = `email-comunicacao-${ticket}-${timestamp}.docx`
      
      saveAs(blob, nomeArquivo)
      
      // Feedback visual
      const feedback = document.createElement('div')
      feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `
      feedback.textContent = `✅ Arquivo Word salvo: ${nomeArquivo}`
      document.body.appendChild(feedback)
      
      setTimeout(() => {
        document.body.removeChild(feedback)
      }, 3000)
      
    } catch (error) {
      console.error('Erro ao gerar Word:', error)
      alert('Erro ao gerar arquivo Word. Tente novamente.')
    } finally {
      setGerandoWord(false)
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
            <InputLabel sx={{ color: '#6b7280' }}>
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
                        color: '#3b82f6',
                        '&.Mui-checked': { color: '#1d4ed8' }
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
                  borderColor: '#f59e0b',
                  color: '#f59e0b',
                  '&:hover': {
                    borderColor: '#d97706',
                    background: '#fef3c7'
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
                    borderColor: '#6b7280',
                    color: '#6b7280',
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
                    borderColor: modoEdicao === 'editar' ? '#10b981' : '#3b82f6',
                    color: modoEdicao === 'editar' ? '#10b981' : '#3b82f6',
                    '&:hover': {
                      borderColor: modoEdicao === 'editar' ? '#059669' : '#1d4ed8',
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
              <Typography variant="body2" sx={{ mb: 1, color: '#6b7280' }}>
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
                      borderColor: '#3b82f6',
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
              border: '1px solid #e2e8f0'
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
                    <Button
                      variant="contained"
                      onClick={handleSalvarAlteracoes}
                      startIcon={<span>💾</span>}
                      sx={{
                        borderRadius: '6px',
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 2,
                        py: 1,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        }
                      }}
                    >
                      Salvar Alterações
                    </Button>
                  </Box>
                  

                  {/* Blocos da Tabela */}
                  <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
                      <Box key={linha.id} sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
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
                                color: '#ef4444',
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
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
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
                                  '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Operadora */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
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
                                  '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Produto */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
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
                                  '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Atualização */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
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
                                  '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Subtipo */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
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
                                  '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
                                }
                              }}
                            />
                          </Box>

                          {/* Tipo */}
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
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
                                  '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
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
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#374151', fontWeight: 600 }}>
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
                          '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '2px' }
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
            color: '#374151',
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
            startIcon={gerandoImagem ? <ImageIcon className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            onClick={handleGerarImagem}
            disabled={gerandoImagem}
            variant="outlined"
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              py: 1.5,
              borderColor: '#8b5cf6',
              color: '#8b5cf6',
              '&:hover': {
                borderColor: '#7c3aed',
                background: '#f3f4f6'
              },
              '&:disabled': {
                opacity: 0.6
              }
            }}
          >
            {gerandoImagem ? 'Gerando...' : '🖼️ Gerar Imagem'}
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSalvarArquivo}
            disabled={salvandoArquivo}
            startIcon={salvandoArquivo ? <span>⏳</span> : <span>💾</span>}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              px: 4,
              py: 1.5,
              background: salvandoArquivo 
                ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              '&:hover': {
                background: salvandoArquivo 
                  ? 'linear-gradient(135deg, #4b5563 0%, #374151 100%)'
                  : 'linear-gradient(135deg, #047857 0%, #065f46 100%)'
              }
            }}
          >
            {salvandoArquivo ? 'Salvando...' : '💾 Salvar Arquivo HTML'}
          </Button>
          
          <Button
            startIcon={copiadoEmail ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopyOutlook}
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
                : 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)',
              '&:hover': {
                background: copiadoEmail 
                  ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                  : 'linear-gradient(135deg, #106ebe 0%, #005a9e 100%)'
              }
            }}
          >
            {copiadoEmail ? 'E-mail Copiado!' : '📧 Copiar para Outlook'}
          </Button>
          
          <Button
            startIcon={gerandoWord ? <span>⏳</span> : <FileText className="w-4 h-4" />}
            onClick={handleGerarWord}
            disabled={gerandoWord}
            variant="contained"
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              px: 4,
              py: 1.5,
              background: gerandoWord 
                ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              '&:hover': {
                background: gerandoWord 
                  ? 'linear-gradient(135deg, #4b5563 0%, #374151 100%)'
                  : 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)'
              },
              '&:disabled': {
                opacity: 0.6
              }
            }}
          >
            {gerandoWord ? 'Gerando...' : '📄 Download Word'}
          </Button>
          
        </Box>
      </DialogActions>
    </Dialog>
  )
}

import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'

interface UploadModalProps {
  open: boolean
  onClose: () => void
  title: string
  entityType: 'dados' | 'demandas' | 'padrao' | 'validacao' | 'reajuste' | 'mailling' | 'analytics'
  onUpload: (file: File) => Promise<void>
}

interface TemplateInfo {
  name: string
  description: string
  fields: string[]
  downloadUrl: string
}

const templates: Record<string, TemplateInfo> = {
  demandas: {
    name: 'Modelo de Cadastros',
    description: 'Template para importação de demandas com todos os campos necessários',
    fields: [
      'Status (obrigatório)',
      'Tipo de Serviço (obrigatório)',
      'Tipo de Demanda (obrigatório)',
      'Descrição',
      'Analista responsável',
      'Data de início',
      'Data de finalização',
      'Nº Ticket',
      'Solicitante',
      'Área',
      'Cliente',
      'Contrato',
      'Operadora',
      'Produto',
      'Sistema',
      'Análise quantitativa',
      'Qtde de retornos',
      'Qualidade (0-3 com descrições)',
      'QTD CLIENTES VINCULADOS - EDGE',
      'USUÁRIOS EMPRESA - MOVE',
      'Observações'
    ],
    downloadUrl: '/templates/cadastros-template.xlsx'
  },
  validacao: {
    name: 'Modelo de Validação',
    description: 'Template para importação de validações com todas as colunas necessárias',
    fields: ['Ticket', 'Descrição', 'Status', 'Solicitante', 'Analista', 'Área', 'Tipo', 'Data Início', 'Data Final', 'Total'],
    downloadUrl: '/templates/validacao-template.xlsx'
  },
  reajuste: {
    name: 'Modelo de Reajuste',
    description: 'Template para importação de reajustes com todas as colunas necessárias',
    fields: ['Mês', 'Ano', 'Filial', 'Operadora', 'Analista', 'Cliente', 'Contrato', 'Produto', 'Total'],
    downloadUrl: '/templates/reajuste-template.xlsx'
  },
  dados: {
    name: 'Modelo de Dados Mestres',
    description: 'Template para importação de dados mestres com todas as abas necessárias',
    fields: [
      'Clientes: Nome, Grupo Econômico',
      'Contratos: Grupo Econômico, Código, Status',
      'Operadoras: Nome',
      'Produtos: Nome',
      'Sistemas: Nome',
      'Analistas: Nome, Email',
      'Áreas: Nome',
      'Tipos: Nome',
      'Tipos Cadastro: Nome, Descrição',
      'Serviços: Nome, Descrição',
      'Solicitantes: Nome',
      'Relatórios: Nome, Descrição',
      'Modelos: Nome, Descrição',
      'Padrão: Nome',
      'Áreas Mailling: Nome',
      'Cargos Mailling: Nome',
      'Filiais Mailling: Nome',
      'Configurações: Chave, Valor, Tipo, Categoria, Ativo'
    ],
    downloadUrl: '/templates/dados-mestres-template.xlsx'
  },
  mailling: {
    name: 'Modelo de Mailling',
    description: 'Template para importação de contatos de mailling com todas as colunas necessárias',
    fields: [
      'Nome (obrigatório)',
      'E-mail (obrigatório)',
      'Cargo',
      'Área',
      'Filiais (separadas por vírgula - ex: São Paulo, Rio de Janeiro)',
      'Superior',
      'Posição E-mail (PARA, CÓPIA ou CÓPIA OCULTA)',
      'Grupos (separados por vírgula - ex: Vendas, Marketing, TI)',
      'Cancelamento (Sim ou Não)',
      'Alteração Contratual (Sim ou Não)',
      'Alteração Dados Cliente (Sim ou Não)',
      'Alteração Serviços (Sim ou Não)',
      'Alteração Remuneração (Sim ou Não)',
      'Curadoria Portal RH (Sim ou Não)',
      'Documentação Contratual (Sim ou Não)'
    ],
    downloadUrl: '/templates/mailling-template.xlsx'
  },
  analytics: {
    name: 'Modelo de Relatórios',
    description: 'Template para importação de relatórios com todas as colunas necessárias',
    fields: ['Título', 'Tipo', 'Status', 'Prioridade', 'Analista', 'Área', 'Cliente', 'Contrato', 'Data de Entrega', 'Descrição'],
    downloadUrl: '/templates/analytics-template.xlsx'
  },
  padrao: {
    name: 'Modelo de Demandas Padrão',
    description: 'Template para importação de demandas padrão com campos: nome e tipo de serviço. Dados serão salvos no endpoint /padrao.',
    fields: ['Nome', 'Tipo de Serviço'],
    downloadUrl: '/templates/padrao-template.xlsx'
  },
  manutencoes: {
    name: 'Modelo de Manutenções',
    description: 'Template para importação de manutenções com todas as colunas necessárias',
    fields: [
      'Status (obrigatório)',
      'Cliente (obrigatório)',
      'Contrato (obrigatório)',
      'Tipo de Serviço (obrigatório)',
      'Tipo de manutenção (obrigatório)',
      'Analista responsável',
      'Data de início',
      'Data de finalização',
      'Nº Ticket',
      'Solicitante',
      'Área solicitante',
      'Operadora',
      'Produto',
      'Sistema principal',
      'Descrição da manutenção',
      'Qtde de retornos',
      'Qualidade (0-3 com descrições)',
      'Total',
      'Observações'
    ],
    downloadUrl: '/templates/manutencoes-template.xlsx'
  }
}

export function UploadModal({ open, onClose, title, entityType, onUpload }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const template = templates[entityType] || {
    name: 'Template não encontrado',
    description: 'Template não disponível para este tipo de entidade',
    fields: [],
    downloadUrl: '#'
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadStatus('idle')
      setErrorMessage('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')

    try {
      await onUpload(selectedFile)
      setUploadStatus('success')
      setTimeout(() => {
        onClose()
        setSelectedFile(null)
        setUploadStatus('idle')
      }, 2000)
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Erro durante o upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    try {
      // Gerar template dinamicamente baseado no tipo de entidade
      const workbook = XLSX.utils.book_new()
      
      // Dados de exemplo para templates (apenas para download)
      const demandasData = [
        { 
          status: 'Aberta',
          tipoServico: 'CADASTRO',
          tipo: 'ACESSO OPERADORA',
          descricao: 'Exemplo de descrição',
          analista: 'Nome do Analista',
          dataInicio: '2024-01-01',
          dataFinal: '2024-01-31',
          ticket: 'TKT-001',
          solicitante: 'Nome do Solicitante',
          area: 'Área',
          cliente: 'Nome do Cliente',
          contrato: 'CTR-001',
          operadora: 'Nome da Operadora',
          produto: 'Nome do Produto',
          sistema: 'Nome do Sistema',
          analiseQuantitativa: 5,
          qtdRetornos: 2,
          qualidade: '2',
          qtdClientesVinculados: 10,
          usuariosEmpresa: 25,
          observacoes: 'Observações'
        }
      ]
      
      switch (entityType) {
        case 'dados':
          // Template para dados mestres (apenas exemplos para download)
          const clientesData = [
            { nome: 'Nome do Cliente', grupoEconomico: 'Grupo Econômico' }
          ]
          
          const contratosData = [
            { codigo: 'CTR-001', grupoEconomico: 'Grupo Econômico', status: 'Ativo' }
          ]
          
          const operadorasData = [
            { nome: 'Nome da Operadora' }
          ]
          
          const produtosData = [
            { nome: 'Nome do Produto' }
          ]
          
          const sistemasData = [
            { nome: 'Nome do Sistema' }
          ]
          
          const analistasData = [
            { nome: 'Nome do Analista', email: 'email@empresa.com' }
          ]
          
          const areasData = [
            { nome: 'Nome da Área' }
          ]
          
          const tiposData = [
            { nome: 'Tipo de Demanda' }
          ]
          
          const servicosData = [
            { nome: 'CADASTRO', descricao: 'Descrição do serviço' }
          ]
          
          const areasMaillingData = [
            { nome: 'Nome da Área Mailling' }
          ]
          
          const cargosMaillingData = [
            { nome: 'Nome do Cargo Mailling' }
          ]
          
          const filiaisMaillingData = [
            { nome: 'Nome da Filial Mailling' }
          ]
          
          const tiposCadastroData = [
            { nome: 'Nome do Tipo Cadastro', descricao: 'Descrição do tipo' }
          ]
          
          const padraoDataDados = [
            { nome: 'ACESSO OPERADORA' }
          ]
          
          const solicitantesData = [
            { nome: 'Nome do Solicitante' }
          ]
          
          const relatoriosData = [
            { nome: 'Nome do Relatório', descricao: 'Descrição do relatório' }
          ]
          
          const modelosData = [
            { nome: 'Nome do Modelo', descricao: 'Descrição do modelo' }
          ]
          
          const configuracoesData = [
            { chave: 'chave_config', valor: 'valor_config', tipo: 'string', categoria: 'geral', ativo: true }
          ]
          
          // Criar abas para cada categoria
          const clientesSheet = XLSX.utils.json_to_sheet(clientesData)
          const contratosSheet = XLSX.utils.json_to_sheet(contratosData)
          const operadorasSheet = XLSX.utils.json_to_sheet(operadorasData)
          const produtosSheet = XLSX.utils.json_to_sheet(produtosData)
          const sistemasSheet = XLSX.utils.json_to_sheet(sistemasData)
          const analistasSheet = XLSX.utils.json_to_sheet(analistasData)
          const areasSheet = XLSX.utils.json_to_sheet(areasData)
          const tiposSheet = XLSX.utils.json_to_sheet(tiposData)
          const servicosSheet = XLSX.utils.json_to_sheet(servicosData)
          const areasMaillingSheet = XLSX.utils.json_to_sheet(areasMaillingData)
          const cargosMaillingSheet = XLSX.utils.json_to_sheet(cargosMaillingData)
          const filiaisMaillingSheet = XLSX.utils.json_to_sheet(filiaisMaillingData)
          const tiposCadastroSheet = XLSX.utils.json_to_sheet(tiposCadastroData)
          const padraoSheetDados = XLSX.utils.json_to_sheet(padraoDataDados)
          const solicitantesSheet = XLSX.utils.json_to_sheet(solicitantesData)
          const relatoriosSheet = XLSX.utils.json_to_sheet(relatoriosData)
          const modelosSheet = XLSX.utils.json_to_sheet(modelosData)
          const configuracoesSheet = XLSX.utils.json_to_sheet(configuracoesData)
          
          // Adicionar abas ao workbook na ordem correta conforme página de Dados
          // Primeira linha - Dados principais
          XLSX.utils.book_append_sheet(workbook, clientesSheet, 'Clientes')
          XLSX.utils.book_append_sheet(workbook, contratosSheet, 'Contratos')
          XLSX.utils.book_append_sheet(workbook, operadorasSheet, 'Operadoras')
          XLSX.utils.book_append_sheet(workbook, produtosSheet, 'Produtos')
          XLSX.utils.book_append_sheet(workbook, sistemasSheet, 'Sistemas')
          XLSX.utils.book_append_sheet(workbook, analistasSheet, 'Analistas')
          XLSX.utils.book_append_sheet(workbook, areasSheet, 'Areas')
          XLSX.utils.book_append_sheet(workbook, tiposSheet, 'Tipos')
          XLSX.utils.book_append_sheet(workbook, tiposCadastroSheet, 'TiposCadastro')
          XLSX.utils.book_append_sheet(workbook, servicosSheet, 'Servicos')
          XLSX.utils.book_append_sheet(workbook, solicitantesSheet, 'Solicitantes')
          XLSX.utils.book_append_sheet(workbook, relatoriosSheet, 'Relatorios')
          XLSX.utils.book_append_sheet(workbook, modelosSheet, 'Modelos')
          XLSX.utils.book_append_sheet(workbook, padraoSheetDados, 'Padrao')
          
          // Segunda linha - Dados Mailling
          XLSX.utils.book_append_sheet(workbook, areasMaillingSheet, 'AreasMailling')
          XLSX.utils.book_append_sheet(workbook, cargosMaillingSheet, 'CargosMailling')
          XLSX.utils.book_append_sheet(workbook, filiaisMaillingSheet, 'FiliaisMailling')
          
          // Terceira linha - Configurações
          XLSX.utils.book_append_sheet(workbook, configuracoesSheet, 'Configuracoes')
          break
          
        case 'demandas':
          // Template para demandas
          const demandasSheet = XLSX.utils.json_to_sheet(demandasData)
          XLSX.utils.book_append_sheet(workbook, demandasSheet, 'Demandas')
          break
          
        case 'manutencoes':
          // Template para manutenções
          const manutencoesData = [
            {
              status: 'Aberta',
              cliente: 'Nome do Cliente',
              contrato: 'CTR-001',
              operadora: 'Nome da Operadora',
              produto: 'Nome do Produto',
              tipoServico: 'MANUTENCAO',
              analista: 'Nome do Analista',
              dataInicio: '2024-01-01',
              dataFinal: '2024-01-31',
              ticket: 'TKT-001',
              solicitante: 'Nome do Solicitante',
              area: 'Nome da Área',
              tipo: 'Tipo de Manutenção',
              descricao: 'Descrição da manutenção',
              sistema: 'Nome do Sistema',
              qtdRetornos: 1,
              qualidade: '2',
              total: 5,
              observacoes: 'Observações'
            }
          ]
          const manutencoesSheet = XLSX.utils.json_to_sheet(manutencoesData)
          XLSX.utils.book_append_sheet(workbook, manutencoesSheet, 'Manutencoes')
          break
          
        case 'padrao':
          // Template para padrões (simples)
          const padraoData = [
            {
              nome: 'ACESSO OPERADORA'
            },
            {
              nome: 'CONFIGURAÇÃO SISTEMA'
            }
          ]
          const padraoSheet = XLSX.utils.json_to_sheet(padraoData)
          XLSX.utils.book_append_sheet(workbook, padraoSheet, 'Padrao')
          break
          
        case 'validacao':
          // Template para validações
          const validacoesData = [
            {
              analista: 'João Silva',
              data: '2024-01-01',
              tipo: 'Validação A',
              status: 'Pendente',
              observacoes: 'Observações da validação'
            }
          ]
          
          const validacoesSheet = XLSX.utils.json_to_sheet(validacoesData)
          XLSX.utils.book_append_sheet(workbook, validacoesSheet, 'Validações')
          break
          
        case 'reajuste':
          // Template para reajustes
          const reajustesData = [
            {
              mes: 'Janeiro',
              ano: '2024',
              filial: 'São Paulo',
              operadora: 'Operadora A',
              analista: 'João Silva',
              cliente: 'Cliente A',
              contrato: 'CTR-001',
              produto: 'Produto A',
              total: 1000.00
            }
          ]
          
          const reajustesSheet = XLSX.utils.json_to_sheet(reajustesData)
          XLSX.utils.book_append_sheet(workbook, reajustesSheet, 'Reajustes')
          break
          
        case 'mailling':
          // Template para mailling
          const maillingData = [
            {
              nome: 'João Silva',
              email: 'joao@empresa.com',
              cargo: 'Analista',
              area: 'Suporte',
              filiais: 'São Paulo, Rio de Janeiro',
              superior: 'Maria Santos',
              posicaoEmail: 'PARA',
              grupos: 'Vendas, Marketing, TI',
              cancelamento: 'Sim',
              alteracaoContratual: 'Sim',
              alteracaoDadosCliente: 'Sim',
              alteracaoServicos: 'Sim',
              alteracaoRemuneracao: 'Sim',
              curadoriaPortalRH: 'Não',
              documentacaoContratual: 'Sim'
            },
            {
              nome: 'Maria Santos',
              email: 'maria@empresa.com',
              cargo: 'Gerente',
              area: 'Comercial',
              filiais: 'São Paulo',
              superior: 'Pedro Costa',
              posicaoEmail: 'CÓPIA',
              grupos: 'Diretoria, Gestão',
              cancelamento: 'Não',
              alteracaoContratual: 'Sim',
              alteracaoDadosCliente: 'Não',
              alteracaoServicos: 'Sim',
              alteracaoRemuneracao: 'Sim',
              curadoriaPortalRH: 'Sim',
              documentacaoContratual: 'Sim'
            }
          ]
          
          const maillingSheet = XLSX.utils.json_to_sheet(maillingData)
          XLSX.utils.book_append_sheet(workbook, maillingSheet, 'Mailling')
          break
          
        case 'analytics':
          // Template para analytics
          const analyticsData = [
            {
              titulo: 'Relatório Mensal',
              tipo: 'Mensal',
              status: 'Em Andamento',
              prioridade: 'Alta',
              analista: 'João Silva',
              area: 'Suporte',
              cliente: 'Cliente A',
              contrato: 'CTR-001',
              dataEntrega: '2024-01-31',
              descricao: 'Descrição do relatório'
            }
          ]
          
          const analyticsSheet = XLSX.utils.json_to_sheet(analyticsData)
          XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics')
          break
          
        default:
          throw new Error('Tipo de entidade não suportado')
      }
      
      // Gerar arquivo e fazer download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${entityType}-template.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Limpar URL
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Erro ao gerar template:', error)
      // Fallback para download simples
      const link = document.createElement('a')
      link.href = template.downloadUrl
      link.download = `${entityType}-template.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null)
      setUploadStatus('idle')
      setErrorMessage('')
      onClose()
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={handleClose} disabled={isUploading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          {/* Coluna Esquerda - Upload */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Upload de Arquivo
            </Typography>
            
            <Paper 
              sx={{ 
                p: 3, 
                border: '2px dashed', 
                borderColor: selectedFile ? 'primary.main' : 'grey.300',
                backgroundColor: selectedFile ? 'primary.50' : 'grey.50',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.50'
                }
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              
              {selectedFile ? (
                <Box>
                  <Typography variant="h6" color="primary">
                    Arquivo Selecionado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Clique para selecionar arquivo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Suporta arquivos Excel (.xlsx, .xls) e CSV
                  </Typography>
                </Box>
              )}
            </Paper>

            {selectedFile && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={isUploading}
                  fullWidth
                  startIcon={<UploadIcon />}
                >
                  {isUploading ? 'Fazendo Upload...' : 'Fazer Upload'}
                </Button>
              </Box>
            )}

            {isUploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  Processando arquivo...
                </Typography>
              </Box>
            )}

            {uploadStatus === 'success' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Upload realizado com sucesso! Os dados foram importados.
                </Typography>
              </Alert>
            )}

            {uploadStatus === 'error' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {errorMessage}
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Coluna Direita - Template */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Modelo de Layout
            </Typography>
            
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="subtitle1" gutterBottom>
                {template.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {template.description}
              </Typography>

              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                fullWidth
                sx={{ mb: 2 }}
              >
                Baixar Template
              </Button>

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Colunas do Template:
              </Typography>
              
              <List dense>
                {template.fields.map((field, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <FileIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={field}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Dica:</strong> Use o template como base para formatar seus dados corretamente antes do upload.
              </Typography>
            </Alert>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isUploading}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}


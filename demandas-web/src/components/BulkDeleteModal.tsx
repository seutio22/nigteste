import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Delete as DeleteIcon,
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Download as DownloadIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'

interface BulkDeleteModalProps {
  open: boolean
  onClose: () => void
  onBulkDelete: (column: string, records: any[]) => Promise<void>
  masterData: any
}

interface DeleteRecord {
  id: string
  data: any
  exists: boolean
  reason?: string
}

const columnOptions = [
  { value: 'clientes', label: 'Clientes', fields: ['nome', 'grupoEconomico'] },
  { value: 'contratos', label: 'Contratos', fields: ['codigo', 'grupoEconomico', 'status'] },
  { value: 'operadoras', label: 'Operadoras', fields: ['nome'] },
  { value: 'produtos', label: 'Produtos', fields: ['nome'] },
  { value: 'sistemas', label: 'Sistemas', fields: ['nome'] },
  { value: 'analistas', label: 'Analistas', fields: ['nome', 'email'] },
  { value: 'areas', label: 'Áreas', fields: ['nome'] },
  { value: 'tipos', label: 'Tipos', fields: ['nome'] },
  { value: 'tipos-cadastro', label: 'Tipos-Cadastro', fields: ['nome', 'descricao'] },
  { value: 'servicos', label: 'Serviços', fields: ['nome', 'descricao'] },
  { value: 'solicitantes', label: 'Solicitantes', fields: ['nome'] },
  { value: 'relatorios', label: 'Relatórios', fields: ['nome', 'descricao'] },
  { value: 'modelos', label: 'Modelos', fields: ['nome', 'descricao'] },
  { value: 'padrao', label: 'Padrão', fields: ['nome'] }
]

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  open,
  onClose,
  onBulkDelete,
  masterData
}) => {
  const [selectedColumn, setSelectedColumn] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [recordsToDelete, setRecordsToDelete] = useState<DeleteRecord[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const selectedColumnConfig = useMemo(() => 
    columnOptions.find(opt => opt.value === selectedColumn),
    [selectedColumn]
  )

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setRecordsToDelete([])
      setValidationErrors([])
    }
  }

  const processFile = async () => {
    if (!file || !selectedColumn) return

    setIsProcessing(true)
    setProcessingStep('Lendo arquivo...')

    try {
      // Ler arquivo Excel
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      setProcessingStep('Processando dados...')

      // Encontrar a aba correta
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes(selectedColumn.toLowerCase())
      ) || workbook.SheetNames[0]

      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        throw new Error('Arquivo vazio ou sem dados')
      }

      setProcessingStep('Validando registros...')

      // Converter para objetos com limpeza de headers
      const headers = jsonData[0] as string[]
      const items = jsonData.slice(1).map((row: any[], rowIndex) => {
        const item: any = {}
        
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined) {
            const cleanHeader = header?.toString().toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            const value = row[index]
            
            // Mapear campos baseado na coluna selecionada
            if (selectedColumn === 'clientes') {
              if (cleanHeader === 'nome') item.nome = value
              else if (cleanHeader === 'grupoeconomico' || cleanHeader === 'grupoeconomico') item.grupoEconomico = value
            } else if (selectedColumn === 'contratos') {
              if (cleanHeader === 'codigo') item.codigo = value
              else if (cleanHeader === 'grupoeconomico' || cleanHeader === 'grupoeconomico') item.grupoEconomico = value
              else if (cleanHeader === 'status') item.status = value
            } else if (selectedColumn === 'operadoras' || selectedColumn === 'produtos' || selectedColumn === 'sistemas' || selectedColumn === 'areas' || selectedColumn === 'solicitantes') {
              if (cleanHeader === 'nome') item.nome = value
            } else if (selectedColumn === 'analistas') {
              if (cleanHeader === 'nome') item.nome = value
              else if (cleanHeader === 'email') item.email = value
            } else if (selectedColumn === 'tipos' || selectedColumn === 'servicos' || selectedColumn === 'relatorios' || selectedColumn === 'modelos' || selectedColumn === 'padrao') {
              if (cleanHeader === 'nome') item.nome = value
              else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') item.descricao = value
            } else if (selectedColumn === 'tipos-cadastro') {
              if (cleanHeader === 'nome') item.nome = value
              else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') item.descricao = value
            }
          }
        })
        
        return item
      }).filter(item => Object.keys(item).length > 0)

      setProcessingStep('Verificando existência...')

      // Validar se os registros existem
      const existingRecords = getExistingRecords(selectedColumn)
      const validatedRecords: DeleteRecord[] = items.map(item => {
        const exists = checkRecordExists(selectedColumn, item, existingRecords)
        return {
          id: crypto.randomUUID(),
          data: item,
          exists,
          reason: exists ? undefined : 'Registro não encontrado'
        }
      })

      const validRecords = validatedRecords.filter(r => r.exists)
      const invalidRecords = validatedRecords.filter(r => !r.exists)

      setRecordsToDelete(validatedRecords)
      setValidationErrors(invalidRecords.map(r => r.reason || 'Erro desconhecido'))

      setProcessingStep('')

    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      setValidationErrors([error instanceof Error ? error.message : 'Erro desconhecido'])
    } finally {
      setIsProcessing(false)
    }
  }

  const getExistingRecords = (column: string) => {
    switch (column) {
      case 'clientes': return masterData.clientes || []
      case 'contratos': return masterData.contratos || []
      case 'operadoras': return masterData.operadoras || []
      case 'produtos': return masterData.produtos || []
      case 'sistemas': return masterData.sistemas || []
      case 'analistas': return masterData.analistas || []
      case 'areas': return masterData.areas || []
      case 'tipos': return masterData.tiposDemanda || []
      case 'tipos-cadastro': return masterData.tiposCadastro || []
      case 'servicos': return masterData.tiposServico || []
      case 'solicitantes': return masterData.solicitantes || []
      case 'relatorios': return masterData.relatorios || []
      case 'modelos': return masterData.modelos || []
      case 'padrao': return masterData.padrao || []
      default: return []
    }
  }

  const checkRecordExists = (column: string, item: any, existingRecords: any[]) => {
    return existingRecords.some(existing => {
      if (column === 'clientes') {
        return existing.nome === item.nome && existing.grupoEconomico === item.grupoEconomico
      } else if (column === 'contratos') {
        return existing.codigo === item.codigo && existing.grupoEconomico === item.grupoEconomico && existing.status === item.status
      } else if (column === 'operadoras' || column === 'produtos' || column === 'sistemas' || column === 'areas' || column === 'solicitantes') {
        return existing.nome === item.nome
      } else if (column === 'analistas') {
        return existing.nome === item.nome && existing.email === item.email
      } else if (column === 'tipos' || column === 'servicos' || column === 'relatorios' || column === 'modelos' || column === 'padrao') {
        return existing.nome === item.nome
      } else if (column === 'tipos-cadastro') {
        return existing.nome === item.nome
      }
      return false
    })
  }

  const handleBulkDelete = async () => {
    if (!selectedColumn || recordsToDelete.length === 0) return

    const validRecords = recordsToDelete.filter(r => r.exists)
    if (validRecords.length === 0) return

    try {
      await onBulkDelete(selectedColumn, validRecords.map(r => r.data))
      onClose()
    } catch (error) {
      console.error('Erro ao excluir registros:', error)
    }
  }

  const handleDownloadTemplate = () => {
    if (!selectedColumnConfig) return

    const templateData = generateTemplateData(selectedColumn, selectedColumnConfig.fields)
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedColumnConfig.label)
    
    XLSX.writeFile(workbook, `template-exclusao-${selectedColumn}.xlsx`)
  }

  const generateTemplateData = (column: string, fields: string[]) => {
    const examples: any = {}
    
    fields.forEach(field => {
      if (field === 'nome') {
        examples[field] = 'Exemplo de Nome'
      } else if (field === 'grupoEconomico') {
        examples[field] = 'Exemplo de Grupo Econômico'
      } else if (field === 'codigo') {
        examples[field] = 'EX-001'
      } else if (field === 'status') {
        examples[field] = 'Ativo'
      } else if (field === 'email') {
        examples[field] = 'exemplo@empresa.com'
      } else if (field === 'descricao') {
        examples[field] = 'Exemplo de Descrição'
      } else {
        examples[field] = `Exemplo de ${field}`
      }
    })

    return [examples]
  }

  const handleClose = () => {
    setSelectedColumn('')
    setFile(null)
    setRecordsToDelete([])
    setValidationErrors([])
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          <Typography variant="h6">
            Exclusão em Massa
          </Typography>
        </Box>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Selecione a coluna e faça upload de um arquivo Excel com os registros que deseja excluir.
          Use o mesmo formato dos campos de cada entidade.
        </Typography>

        {/* Seleção de Coluna */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Selecionar Coluna para Exclusão</InputLabel>
            <Select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              disabled={isProcessing}
            >
              {columnOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Upload de Arquivo */}
        {selectedColumn && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Upload de Arquivo
            </Typography>
            
            <Paper 
              sx={{ 
                p: 3, 
                border: '2px dashed', 
                borderColor: file ? 'primary.main' : 'grey.300',
                backgroundColor: file ? 'primary.50' : 'grey.50',
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
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              
              {file ? (
                <Box>
                  <Typography variant="h6" color="primary">
                    Arquivo Selecionado
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Clique para selecionar arquivo
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Suporta arquivos Excel (.xlsx, .xls)
                  </Typography>
                </Box>
              )}
            </Paper>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                disabled={!selectedColumn}
              >
                Baixar Template
              </Button>
              
              {file && (
                <Button
                  variant="contained"
                  onClick={processFile}
                  disabled={isProcessing}
                  startIcon={<UploadIcon />}
                >
                  {isProcessing ? 'Processando...' : 'Processar Arquivo'}
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* Status de Processamento */}
        {isProcessing && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {processingStep}
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* Erros de Validação */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Erros encontrados:
            </Typography>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Preview dos Registros */}
        {recordsToDelete.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Registros para Exclusão
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${recordsToDelete.filter(r => r.exists).length} Válidos`}
                color="success"
                variant="outlined"
              />
              <Chip
                icon={<ErrorIcon />}
                label={`${recordsToDelete.filter(r => !r.exists).length} Inválidos`}
                color="error"
                variant="outlined"
              />
            </Stack>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Dados</TableCell>
                    <TableCell>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recordsToDelete.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip
                          label={record.exists ? 'Válido' : 'Inválido'}
                          color={record.exists ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {JSON.stringify(record.data, null, 2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {record.reason || 'Pronto para exclusão'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isProcessing}>
          Cancelar
        </Button>
        {recordsToDelete.length > 0 && recordsToDelete.some(r => r.exists) && (
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDelete}
            disabled={isProcessing}
            startIcon={<DeleteIcon />}
          >
            Excluir {recordsToDelete.filter(r => r.exists).length} Registros
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

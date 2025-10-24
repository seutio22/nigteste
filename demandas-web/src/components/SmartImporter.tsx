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
  IconButton,
  Tooltip,
  Stack,
  Divider
} from '@mui/material'
import {
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AutoFixHigh as AutoFixHighIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'
import { SmartValidationEngine } from '../lib/smartValidationEngine'
import { DataCorrectionModal } from './DataCorrectionModal'
import type { 
  SmartImporterProps, 
  ImportResult, 
  ImportItem, 
  SmartImporterConfig 
} from '../types/smartImporter'

export const SmartImporter: React.FC<SmartImporterProps> = ({
  open,
  onClose,
  onImport,
  config,
  masterData
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [processingStep, setProcessingStep] = useState('')

  const validationEngine = useMemo(() => 
    new SmartValidationEngine(config, masterData), 
    [config, masterData]
  )

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setImportResult(null)
    }
  }

  const processFile = async () => {
    if (!file) return

    setIsProcessing(true)
    setProcessingStep('Lendo arquivo...')

    try {
      // Ler arquivo Excel
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      setProcessingStep('Processando dados...')

      // Encontrar a aba correta
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes(config.entityType.toLowerCase())
      ) || workbook.SheetNames[0]

      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        throw new Error('Arquivo vazio ou sem dados')
      }

      setProcessingStep('Validando dados...')

      // Converter para objetos com limpeza de headers (igual ao upload normal)
      const headers = jsonData[0] as string[]
      console.log('🔍 SMART IMPORTER: Headers encontrados:', headers)
      console.log('🔍 SMART IMPORTER: Config entityType:', config.entityType)
      console.log('🔍 SMART IMPORTER: Config entityType lowercase:', config.entityType.toLowerCase())
      
      const items = jsonData.slice(1).map((row: any[], rowIndex) => {
        const item: any = {}
        console.log(`🔍 SMART IMPORTER: Processando linha ${rowIndex + 1}:`, row)
        console.log(`🔍 SMART IMPORTER: Headers para linha ${rowIndex + 1}:`, headers)
        
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined) {
            // Limpar header igual ao upload normal
            const cleanHeader = header?.toString().toLowerCase().trim().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            const value = row[index]
            console.log(`🔍 SMART IMPORTER: Header "${header}" -> limpo: "${cleanHeader}" (índice ${index}) = valor "${value}"`)
            
            // Mapear campos baseado no tipo de entidade
            console.log(`🔍 SMART IMPORTER: Tipo de entidade: "${config.entityType.toLowerCase()}"`)
            console.log(`🔍 SMART IMPORTER: Verificando condição validação: ${config.entityType.toLowerCase().includes('validação')} || ${config.entityType.toLowerCase().includes('validacao')}`)
            if (config.entityType.toLowerCase().includes('manutenções') || config.entityType.toLowerCase().includes('manutencoes')) {
              // Mapeamento específico para manutenções
              if (cleanHeader === 'status') {
                item.status = value
              } else if (cleanHeader === 'tiposervico' || cleanHeader === 'tiposerviço' || cleanHeader === 'tiposervicoid' || cleanHeader === 'tiposervicold') {
                item.tipoServico = value
              } else if (cleanHeader === 'tipo') {
                item.tipo = value
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
              } else if (cleanHeader === 'analista') {
                item.analista = value
              } else if (cleanHeader === 'datainicio' || cleanHeader === 'datainicial') {
                item.dataInicio = value
              } else if (cleanHeader === 'datafinal' || cleanHeader === 'datafinalizacao' || cleanHeader === 'datafinalização') {
                item.dataFinal = value
              } else if (cleanHeader === 'ticket') {
                item.ticket = value
              } else if (cleanHeader === 'solicitante') {
                item.solicitante = value
              } else if (cleanHeader === 'area' || cleanHeader === 'área') {
                item.area = value
              } else if (cleanHeader === 'cliente') {
                item.cliente = value
              } else if (cleanHeader === 'contrato') {
                item.contrato = value
              } else if (cleanHeader === 'operadora') {
                item.operadora = value
              } else if (cleanHeader === 'produto') {
                item.produto = value
              } else if (cleanHeader === 'sistema') {
                item.sistema = value
              } else if (cleanHeader === 'observacoes' || cleanHeader === 'observações' || cleanHeader === 'observacao' || cleanHeader === 'observação') {
                item.observacoes = value
              } else if (cleanHeader === 'qtdretornos' || cleanHeader === 'quantidaderetornos') {
                item.qtdRetornos = value
              } else if (cleanHeader === 'qualidade') {
                item.qualidade = value
              } else if (cleanHeader === 'qtdclientesvinculados' || cleanHeader === 'clientesvinculados') {
                item.qtdClientesVinculados = value
              } else if (cleanHeader === 'usuariosempresa' || cleanHeader === 'usuarios' || cleanHeader === 'usuários') {
                item.usuariosEmpresa = value
              }
            } else if (config.entityType.toLowerCase().includes('cliente')) {
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'nome') {
                item.nome = value
              } else if (cleanHeader === 'grupoeconomico' || cleanHeader === 'grupoeconomico') {
                item.grupoEconomico = value
              }
            } else if (config.entityType.toLowerCase().includes('contrato')) {
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'codigo') {
                item.codigo = value
              } else if (cleanHeader === 'grupoeconomico' || cleanHeader === 'grupoeconomico') {
                item.grupoEconomico = value
              } else if (cleanHeader === 'status') {
                item.status = value
              }
            } else if (config.entityType.toLowerCase().includes('analista')) {
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'nome') {
                item.nome = value
              } else if (cleanHeader === 'email') {
                item.email = value
              }
            } else if (config.entityType.toLowerCase().includes('áreas mailling') || config.entityType.toLowerCase().includes('areas mailling')) {
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'nome') {
                item.nome = value
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
              } else if (cleanHeader === 'ativo') {
                item.ativo = value === 'true' || value === true || value === 'sim' || value === 'Sim'
              }
            } else if (config.entityType.toLowerCase().includes('cargos mailling') || config.entityType.toLowerCase().includes('cargosmailling')) {
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'nome') {
                item.nome = value
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
              } else if (cleanHeader === 'ativo') {
                item.ativo = value === 'true' || value === true || value === 'sim' || value === 'Sim'
              }
            } else if (config.entityType.toLowerCase().includes('filiais mailling') || config.entityType.toLowerCase().includes('filiaismailling')) {
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'nome') {
                item.nome = value
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
              } else if (cleanHeader === 'ativo') {
                item.ativo = value === 'true' || value === true || value === 'sim' || value === 'Sim'
              }
            } else if (config.entityType.toLowerCase().includes('mailling')) {
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'nome') {
                item.nome = value
              } else if (cleanHeader === 'email') {
                item.email = value
              } else if (cleanHeader === 'cargo') {
                item.cargo = value
              } else if (cleanHeader === 'area' || cleanHeader === 'área') {
                item.area = value
              } else if (cleanHeader === 'filiais' || cleanHeader === 'filial') {
                // Suporta tanto filiais (novo) quanto filial (antigo) para compatibilidade
                item.filiais = value ? (Array.isArray(value) ? value : [value]) : []
              } else if (cleanHeader === 'grupos' || cleanHeader === 'grupo') {
                // Suporta tanto grupos (novo) quanto grupo (antigo) para compatibilidade
                item.grupos = value ? (Array.isArray(value) ? value : [value]) : []
              } else if (cleanHeader === 'superior') {
                item.superior = value
              } else if (cleanHeader === 'posicaoemail' || cleanHeader === 'posiçãoemail') {
                item.posicaoEmail = value
              } else if (cleanHeader === 'cancelamento') {
                // Normalizar valores sim/não
                const normalizedValue = String(value || '').toLowerCase().trim()
                const resultado = (normalizedValue === 'sim' || normalizedValue === 's' || normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === '1' || normalizedValue === 'true') ? 'sim' : 'nao'
                console.log(`🔍 NORMALIZAÇÃO: Cancelamento "${value}" -> "${normalizedValue}" -> "${resultado}"`)
                item.cancelamento = resultado
              } else if (cleanHeader === 'alteracaocontratual' || cleanHeader === 'alteraçãocontratual') {
                const normalizedValue = String(value || '').toLowerCase().trim()
                const resultado = (normalizedValue === 'sim' || normalizedValue === 's' || normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === '1' || normalizedValue === 'true') ? 'sim' : 'nao'
                console.log(`🔍 NORMALIZAÇÃO: Alteração Contratual "${value}" -> "${resultado}"`)
                item.alteracaoContratual = resultado
              } else if (cleanHeader === 'alteracaodadoscliente' || cleanHeader === 'alteraçãodadoscliente') {
                const normalizedValue = String(value || '').toLowerCase().trim()
                const resultado = (normalizedValue === 'sim' || normalizedValue === 's' || normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === '1' || normalizedValue === 'true') ? 'sim' : 'nao'
                console.log(`🔍 NORMALIZAÇÃO: Alteração Dados Cliente "${value}" -> "${resultado}"`)
                item.alteracaoDadosCliente = resultado
              } else if (cleanHeader === 'alteracaoservicos' || cleanHeader === 'alteraçõeserviços') {
                const normalizedValue = String(value || '').toLowerCase().trim()
                const resultado = (normalizedValue === 'sim' || normalizedValue === 's' || normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === '1' || normalizedValue === 'true') ? 'sim' : 'nao'
                console.log(`🔍 NORMALIZAÇÃO: Alteração Serviços "${value}" -> "${resultado}"`)
                item.alteracaoServicos = resultado
              } else if (cleanHeader === 'alteracaoremuneracao' || cleanHeader === 'alteraçãoremuneração') {
                const normalizedValue = String(value || '').toLowerCase().trim()
                const resultado = (normalizedValue === 'sim' || normalizedValue === 's' || normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === '1' || normalizedValue === 'true') ? 'sim' : 'nao'
                console.log(`🔍 NORMALIZAÇÃO: Alteração Remuneração "${value}" -> "${resultado}"`)
                item.alteracaoRemuneracao = resultado
              } else if (cleanHeader === 'curadoriaportalrh') {
                const normalizedValue = String(value || '').toLowerCase().trim()
                const resultado = (normalizedValue === 'sim' || normalizedValue === 's' || normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === '1' || normalizedValue === 'true') ? 'sim' : 'nao'
                console.log(`🔍 NORMALIZAÇÃO: Curadoria Portal RH "${value}" -> "${resultado}"`)
                item.curadoriaPortalRh = resultado
              } else if (cleanHeader === 'documentacaocontratual' || cleanHeader === 'documentaçãocontratual') {
                const normalizedValue = String(value || '').toLowerCase().trim()
                const resultado = (normalizedValue === 'sim' || normalizedValue === 's' || normalizedValue === 'yes' || normalizedValue === 'y' || normalizedValue === '1' || normalizedValue === 'true') ? 'sim' : 'nao'
                console.log(`🔍 NORMALIZAÇÃO: Documentação Contratual "${value}" -> "${resultado}"`)
                item.documentacaoContratual = resultado
              }
            } else if (config.entityType.toLowerCase().includes('validação') || config.entityType.toLowerCase().includes('validacao') || config.entityType.toLowerCase().includes('validações')) {
              // Mapeamento específico para validações
              console.log(`🔍 SMART IMPORTER: Mapeando validação - header: "${cleanHeader}", value: "${value}"`)
              if (cleanHeader === 'id' && value) {
                item.id = value
                console.log(`🔍 SMART IMPORTER: Mapeado id: ${value}`)
              } else if (cleanHeader === 'status') {
                item.status = value
                console.log(`🔍 SMART IMPORTER: Mapeado status: ${value}`)
              } else if (cleanHeader === 'analista') {
                item.analista = value
                console.log(`🔍 SMART IMPORTER: Mapeado analista: ${value}`)
              } else if (cleanHeader === 'datainicio' || cleanHeader === 'datainicial') {
                item.dataInicio = value
                console.log(`🔍 SMART IMPORTER: Mapeado dataInicio: ${value}`)
              } else if (cleanHeader === 'datafinal' || cleanHeader === 'datafinalizacao' || cleanHeader === 'datafinalização') {
                item.dataFinal = value
                console.log(`🔍 SMART IMPORTER: Mapeado dataFinal: ${value}`)
              } else if (cleanHeader === 'tipo') {
                item.tipo = value
                console.log(`🔍 SMART IMPORTER: Mapeado tipo: ${value}`)
              } else if (cleanHeader === 'ticket') {
                item.ticket = value
                console.log(`🔍 SMART IMPORTER: Mapeado ticket: ${value}`)
              } else if (cleanHeader === 'solicitante') {
                item.solicitante = value
                console.log(`🔍 SMART IMPORTER: Mapeado solicitante: ${value}`)
              } else if (cleanHeader === 'demanda') {
                item.demanda = value
                console.log(`🔍 SMART IMPORTER: Mapeado demanda: ${value}`)
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
                console.log(`🔍 SMART IMPORTER: Mapeado descricao: ${value}`)
              } else if (cleanHeader === 'total') {
                item.total = value
                console.log(`🔍 SMART IMPORTER: Mapeado total: ${value}`)
              } else if (cleanHeader === 'cliente') {
                item.cliente = value
                console.log(`🔍 SMART IMPORTER: Mapeado cliente: ${value}`)
              } else if (cleanHeader === 'contrato') {
                item.contrato = value
                console.log(`🔍 SMART IMPORTER: Mapeado contrato: ${value}`)
              } else if (cleanHeader === 'operadora') {
                item.operadora = value
                console.log(`🔍 SMART IMPORTER: Mapeado operadora: ${value}`)
              } else if (cleanHeader === 'produto') {
                item.produto = value
                console.log(`🔍 SMART IMPORTER: Mapeado produto: ${value}`)
              } else if (cleanHeader === 'vigencia' || cleanHeader === 'vigência') {
                item.vigencia = value
                console.log(`🔍 SMART IMPORTER: Mapeado vigencia: ${value}`)
              } else if (cleanHeader === 'qtdretornos' || cleanHeader === 'quantidaderetornos') {
                item.qtdRetornos = value
                console.log(`🔍 SMART IMPORTER: Mapeado qtdRetornos: ${value}`)
              } else if (cleanHeader === 'qualidade') {
                item.qualidade = value
                console.log(`🔍 SMART IMPORTER: Mapeado qualidade: ${value}`)
              } else if (cleanHeader === 'estruturaedge' || cleanHeader === 'estrutura_edge') {
                item.estruturaEdge = value
                console.log(`🔍 SMART IMPORTER: Mapeado estruturaEdge: ${value}`)
              } else if (cleanHeader === 'estruturamove' || cleanHeader === 'estrutura_move') {
                item.estruturaMove = value
                console.log(`🔍 SMART IMPORTER: Mapeado estruturaMove: ${value}`)
              } else if (cleanHeader === 'formalizacao' || cleanHeader === 'formalização') {
                item.formalizacao = value
                console.log(`🔍 SMART IMPORTER: Mapeado formalizacao: ${value}`)
              } else if (cleanHeader === 'itenspendentes' || cleanHeader === 'itens_pendentes') {
                item.itensPendentes = value
                console.log(`🔍 SMART IMPORTER: Mapeado itensPendentes: ${value}`)
              } else if (cleanHeader === 'itensconcluidos' || cleanHeader === 'itens_concluidos') {
                item.itensConcluidos = value
                console.log(`🔍 SMART IMPORTER: Mapeado itensConcluidos: ${value}`)
              } else {
                console.log(`🔍 SMART IMPORTER: Header não mapeado para validação: "${cleanHeader}" = "${value}"`)
              }
            } else if (config.entityType.toLowerCase().includes('demanda')) {
              // Mapeamento específico para demandas
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'status') {
                item.status = value
              } else if (cleanHeader === 'tiposervico' || cleanHeader === 'tiposerviço' || cleanHeader === 'tiposervicoid' || cleanHeader === 'tiposervicold') {
                item.tipoServico = value
              } else if (cleanHeader === 'tipo') {
                item.tipo = value
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
              } else if (cleanHeader === 'analista') {
                item.analista = value
              } else if (cleanHeader === 'datainicio' || cleanHeader === 'datainicial') {
                item.dataInicio = value
              } else if (cleanHeader === 'datafinal' || cleanHeader === 'datafinalizacao' || cleanHeader === 'datafinalização') {
                item.dataFinal = value
              } else if (cleanHeader === 'ticket') {
                item.ticket = value
              } else if (cleanHeader === 'solicitante') {
                item.solicitante = value
              } else if (cleanHeader === 'area' || cleanHeader === 'área') {
                item.area = value
              } else if (cleanHeader === 'cliente') {
                item.cliente = value
              } else if (cleanHeader === 'contrato') {
                item.contrato = value
              } else if (cleanHeader === 'operadora') {
                item.operadora = value
              } else if (cleanHeader === 'produto') {
                item.produto = value
              } else if (cleanHeader === 'sistema') {
                item.sistema = value
              } else if (cleanHeader === 'analisequantitativa' || cleanHeader === 'análisequantitativa' || cleanHeader === 'analisequant') {
                item.analiseQuantitativa = value
              } else if (cleanHeader === 'qtdretornos' || cleanHeader === 'quantidaderetornos') {
                item.qtdRetornos = value
              } else if (cleanHeader === 'qualidade') {
                item.qualidade = value
              } else if (cleanHeader === 'qtdclientesvinculados' || cleanHeader === 'clientesvinculados') {
                item.qtdClientesVinculados = value
              } else if (cleanHeader === 'usuariosempresa' || cleanHeader === 'usuarios' || cleanHeader === 'usuários') {
                item.usuariosEmpresa = value
              } else if (cleanHeader === 'observacoes' || cleanHeader === 'observações' || cleanHeader === 'observacao' || cleanHeader === 'observação') {
                item.observacoes = value
              }
            } else {
              // Para outras entidades, usar mapeamento genérico
              if (cleanHeader === 'id' && value) {
                item.id = value
              } else if (cleanHeader === 'nome') {
                item.nome = value
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
              } else if (cleanHeader === 'ativo') {
                item.ativo = value === 'true' || value === true || value === 'sim' || value === 'Sim'
              } else if (cleanHeader === 'email') {
                item.email = value
              }
            }
          }
        })
        
        console.log(`🔍 SMART IMPORTER: Item processado:`, item)
        console.log(`🔍 SMART IMPORTER: Chaves do item:`, Object.keys(item))
        console.log(`🔍 SMART IMPORTER: Valores do item:`, Object.values(item))
        return item
      }).filter(item => {
        // Ser menos restritivo - apenas filtrar itens completamente vazios
        // ou que não tenham pelo menos um campo preenchido
        const hasAnyValue = Object.values(item).some(value => 
          value !== undefined && value !== null && value !== ''
        )
        const hasAnyKey = Object.keys(item).length > 0
        const shouldKeep = hasAnyKey && hasAnyValue
        
        console.log(`🔍 SMART IMPORTER: Item tem chaves: ${hasAnyKey}, tem valores: ${hasAnyValue}, deve manter: ${shouldKeep}`)
        
        if (!shouldKeep) {
          console.log(`🔍 SMART IMPORTER: Removendo item vazio:`, item)
        }
        
        return shouldKeep
      })
      
      console.log(`🔍 SMART IMPORTER: Total de itens processados:`, items.length)
      console.log(`🔍 SMART IMPORTER: Todos os itens processados:`, items)
      console.log(`🔍 SMART IMPORTER: Linhas originais do Excel:`, jsonData.length - 1)
      console.log(`🔍 SMART IMPORTER: Diferença entre linhas Excel e itens processados:`, (jsonData.length - 1) - items.length)

      setProcessingStep('Aplicando validações...')

      // Validar dados
      const result = validationEngine.processItems(items)

      console.log('🔍 SMART IMPORTER: Resultado da validação:', {
        valid: result.valid.length,
        invalid: result.invalid.length,
        duplicates: result.duplicates.length
      })

      setImportResult(result)
      setProcessingStep('')

      // Sempre mostrar resultado da validação antes de importar
      console.log('✅ SMART IMPORTER: Mostrando resultado da validação')
      // Não importar automaticamente - deixar o usuário decidir

    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      setProcessingStep('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCorrectionConfirm = (correctedItems: ImportItem[]) => {
    if (!importResult) return

    // Atualizar resultado com itens corrigidos
    const updatedResult: ImportResult = {
      ...importResult,
      valid: [...importResult.valid, ...correctedItems],
      invalid: importResult.invalid.filter(item => 
        !correctedItems.some(corrected => corrected.id === item.id)
      ),
      validCount: importResult.valid.length + correctedItems.length,
      invalidCount: importResult.invalid.length - correctedItems.length
    }

    setImportResult(updatedResult)
    setShowCorrectionModal(false)
    onImport(updatedResult)
    onClose()
  }

  const handleDownloadTemplate = () => {
    // Gerar template baseado na configuração com exemplos realistas
    const allFields = [...config.requiredFields, ...config.optionalFields]
    
    console.log('🔍 TEMPLATE DEBUG: entityType:', config.entityType)
    console.log('🔍 TEMPLATE DEBUG: entityType lowercase:', config.entityType.toLowerCase())
    console.log('🔍 TEMPLATE DEBUG: includes tipos de cadastro:', config.entityType.toLowerCase().includes('tipos de cadastro'))
    console.log('🔍 TEMPLATE DEBUG: includes tipos-cadastro:', config.entityType.toLowerCase().includes('tipos-cadastro'))
    console.log('🔍 TEMPLATE DEBUG: includes cadastro:', config.entityType.toLowerCase().includes('cadastro'))
    
    // Exemplos específicos por tipo de entidade
    let templateData: any[] = []
    
    if (config.entityType.toLowerCase().includes('cliente')) {
      templateData = [
        { 
          nome: 'Empresa ABC Ltda', 
          grupoEconomico: 'Grupo ABC' 
        },
        { 
          nome: 'Comércio XYZ S.A.', 
          grupoEconomico: 'Grupo XYZ' 
        }
      ]
    } else if (config.entityType.toLowerCase().includes('contrato')) {
      templateData = [
        { 
          codigo: 'CTR-001', 
          grupoEconomico: 'Grupo ABC', 
          status: 'Ativo' 
        },
        { 
          codigo: 'CTR-002', 
          grupoEconomico: 'Grupo XYZ', 
          status: 'Inativo' 
        }
      ]
    } else if (config.entityType.toLowerCase().includes('analista')) {
      templateData = [
        { 
          nome: 'João Silva', 
          email: 'joao.silva@empresa.com' 
        },
        { 
          nome: 'Maria Santos', 
          email: 'maria.santos@empresa.com' 
        }
      ]
    } else if (config.entityType.toLowerCase().includes('áreas mailling') || config.entityType.toLowerCase().includes('areas mailling')) {
      templateData = [
        { 
          nome: 'Vendas', 
          descricao: 'Área responsável pelas vendas',
          ativo: 'true'
        },
        { 
          nome: 'Marketing', 
          descricao: 'Área responsável pelo marketing',
          ativo: 'true'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('cargos mailling') || config.entityType.toLowerCase().includes('cargosmailling')) {
      templateData = [
        { 
          nome: 'Gerente', 
          descricao: 'Cargo de gerência',
          ativo: 'true'
        },
        { 
          nome: 'Analista', 
          descricao: 'Cargo de analista',
          ativo: 'true'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('filiais mailling') || config.entityType.toLowerCase().includes('filiaismailling')) {
      templateData = [
        { 
          nome: 'São Paulo', 
          descricao: 'Filial de São Paulo',
          ativo: 'true'
        },
        { 
          nome: 'Rio de Janeiro', 
          descricao: 'Filial do Rio de Janeiro',
          ativo: 'true'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('mailling')) {
      templateData = [
        { 
          nome: 'João Silva', 
          email: 'joao.silva@empresa.com',
          cargo: 'Gerente',
          area: 'Vendas',
          filiais: 'São Paulo',
          superior: 'Maria Santos',
          posicaoEmail: 'PARA',
          grupos: 'Grupo 1',
          cancelamento: 'nao',
          alteracaoContratual: 'sim',
          alteracaoDadosCliente: 'nao',
          alteracaoServicos: 'sim',
          alteracaoRemuneracao: 'nao',
          curadoriaPortalRh: 'nao',
          documentacaoContratual: 'sim'
        },
        { 
          nome: 'Maria Santos', 
          email: 'maria.santos@empresa.com',
          cargo: 'Analista',
          area: 'Marketing',
          filiais: 'Rio de Janeiro',
          superior: 'Pedro Costa',
          posicaoEmail: 'CÓPIA',
          grupos: 'Grupo 2',
          cancelamento: 'sim',
          alteracaoContratual: 'nao',
          alteracaoDadosCliente: 'sim',
          alteracaoServicos: 'nao',
          alteracaoRemuneracao: 'sim',
          curadoriaPortalRh: 'sim',
          documentacaoContratual: 'nao'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('tipos de demanda') || config.entityType.toLowerCase().includes('tipos')) {
      templateData = [
        { 
          nome: 'Cadastro de Cliente',
          descricao: 'Tipo de demanda para cadastro de novos clientes',
          ativo: 'true'
        },
        { 
          nome: 'Manutenção de Sistema',
          descricao: 'Tipo de demanda para manutenção de sistemas existentes',
          ativo: 'true'
        },
        { 
          nome: 'Relatório Personalizado',
          descricao: 'Tipo de demanda para criação de relatórios personalizados',
          ativo: 'false'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('tipos de cadastro') || config.entityType.toLowerCase().includes('tipos-cadastro') || config.entityType.toLowerCase().includes('cadastro')) {
      templateData = [
        { 
          nome: 'Pessoa Física',
          descricao: 'Tipo de cadastro para pessoa física',
          ativo: 'true'
        },
        { 
          nome: 'Pessoa Jurídica',
          descricao: 'Tipo de cadastro para pessoa jurídica',
          ativo: 'true'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('serviços') || config.entityType.toLowerCase().includes('servicos')) {
      templateData = [
        { 
          nome: 'CAD',
          descricao: 'Serviço de cadastro',
          ativo: 'true'
        },
        { 
          nome: 'MAN',
          descricao: 'Serviço de manutenção',
          ativo: 'true'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('padrão') || config.entityType.toLowerCase().includes('padrao')) {
      templateData = [
        { 
          nome: 'ACESSO OPERADORA',
          descricao: 'Padrão para acesso à operadora',
          ativo: 'true'
        },
        { 
          nome: 'CONFIGURAÇÃO SISTEMA',
          descricao: 'Padrão para configuração do sistema',
          ativo: 'true'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('manutenções') || config.entityType.toLowerCase().includes('manutencoes')) {
      templateData = [
        { 
          status: 'Aberta',
          tipoServico: 'CAD',
          tipo: 'Pessoa Física',
          descricao: 'Manutenção preventiva do sistema de cadastro',
          analista: 'João Silva',
          dataInicio: '2024-01-15',
          dataFinal: '2024-01-20',
          ticket: 'MAN-2024-001',
          solicitante: 'Maria Santos',
          area: 'Vendas',
          cliente: 'Empresa ABC Ltda',
          contrato: 'CTR-001',
          operadora: 'Operadora XYZ',
          produto: 'Produto Premium',
          sistema: 'Sistema Principal',
          observacoes: 'Manutenção preventiva mensal',
          qtdRetornos: 0,
          qualidade: '1',
          qtdClientesVinculados: 50
        },
        { 
          status: 'Em andamento',
          tipoServico: 'MAN',
          tipo: 'Pessoa Jurídica',
          descricao: 'Correção de bugs no módulo de relatórios',
          analista: 'Pedro Costa',
          dataInicio: '2024-01-20',
          dataFinal: '2024-01-25',
          ticket: 'MAN-2024-002',
          solicitante: 'Ana Oliveira',
          area: 'TI',
          cliente: 'Comércio XYZ S.A.',
          contrato: 'CTR-002',
          operadora: 'Operadora ABC',
          produto: 'Produto Standard',
          sistema: 'Sistema Secundário',
          observacoes: 'Correção urgente solicitada pelo cliente',
          qtdRetornos: 1,
          qualidade: '2',
          qtdClientesVinculados: 25
        }
      ]
    } else if (config.entityType.toLowerCase().includes('demanda')) {
      templateData = [
        { 
          status: 'Aberta',
          tipoServicoId: 'CAD',
          tipo: 'Cadastro de Cliente',
          descricao: 'Implementação de novo sistema de cadastro de clientes',
          analista: 'João Silva',
          dataInicio: '2024-01-15',
          dataFinal: '2024-02-15',
          ticket: 'DEM-2024-001',
          solicitante: 'Maria Santos',
          area: 'Vendas',
          cliente: 'Empresa ABC Ltda',
          contrato: 'CTR-001',
          operadora: 'Operadora XYZ',
          produto: 'Produto Premium',
          sistema: 'Sistema Principal',
          analiseQuantitativa: 100,
          qtdRetornos: 2,
          qualidade: '2',
          qtdClientesVinculados: 50,
          usuariosEmpresa: 200,
          observacoes: 'Demanda de alta prioridade para implementação no Q1'
        },
        { 
          status: 'Em andamento',
          tipoServicoId: 'MAN',
          tipo: 'Manutenção de Sistema',
          descricao: 'Correção de bugs no módulo de relatórios',
          analista: 'Pedro Costa',
          dataInicio: '2024-01-20',
          dataFinal: '2024-01-30',
          ticket: 'DEM-2024-002',
          solicitante: 'Ana Oliveira',
          area: 'TI',
          cliente: 'Comércio XYZ S.A.',
          contrato: 'CTR-002',
          operadora: 'Operadora ABC',
          produto: 'Produto Standard',
          sistema: 'Sistema Secundário',
          analiseQuantitativa: 50,
          qtdRetornos: 1,
          qualidade: '3',
          qtdClientesVinculados: 25,
          usuariosEmpresa: 100,
          observacoes: 'Correção urgente solicitada pelo cliente'
        }
      ]
    } else if (config.entityType.toLowerCase().includes('validação') || config.entityType.toLowerCase().includes('validacao')) {
      templateData = [
        { 
          status: 'Aberta',
          analista: 'João Silva',
          dataInicio: '2024-01-15',
          dataFinal: '2024-01-20',
          tipo: 'Total',
          ticket: 'VAL-2024-001',
          solicitante: 'Maria Santos',
          demanda: 'DEM-2024-001',
          descricao: 'Validação de estrutura EDGE para novo cliente',
          cliente: 'Empresa ABC Ltda',
          contrato: 'CTR-001',
          operadora: 'Operadora XYZ',
          produto: 'Produto Premium',
          vigencia: '2024-12-31',
          qtdRetornos: 0,
          qualidade: '3',
          total: 15,
          estruturaEdge: '1-CODIGO_CONTRATO,1-CNPJ',
          estruturaMove: '0',
          formalizacao: '0',
          itensPendentes: 0,
          itensConcluidos: 5
        },
        { 
          status: 'Em andamento',
          analista: 'Pedro Costa',
          dataInicio: '2024-01-20',
          dataFinal: '2024-01-25',
          tipo: 'SUB',
          ticket: 'VAL-2024-002',
          solicitante: 'Ana Oliveira',
          demanda: 'DEM-2024-002',
          descricao: 'Validação de estrutura MOVE para alteração contratual',
          cliente: 'Comércio XYZ S.A.',
          contrato: 'CTR-002',
          operadora: 'Operadora ABC',
          produto: 'Produto Standard',
          vigencia: '2024-06-30',
          qtdRetornos: 1,
          qualidade: '2',
          total: 8,
          estruturaEdge: '0',
          estruturaMove: '1-VIGENCIA,1-ASSOCIACAO_MOVE',
          formalizacao: '1',
          itensPendentes: 2,
          itensConcluidos: 3
        },
        { 
          status: 'Concluída',
          analista: 'Maria Santos',
          dataInicio: '2024-01-10',
          dataFinal: '2024-01-15',
          tipo: 'Total',
          ticket: 'VAL-2024-003',
          solicitante: 'Carlos Lima',
          demanda: 'DEM-2024-003',
          descricao: 'Validação completa de estrutura EDGE e MOVE',
          cliente: 'Indústria DEF Ltda',
          contrato: 'CTR-003',
          operadora: 'Operadora DEF',
          produto: 'Produto Avançado',
          vigencia: '2024-03-31',
          qtdRetornos: 0,
          qualidade: '3',
          total: 25,
          estruturaEdge: '1-CODIGO_CONTRATO,1-CNPJ,1-VIGENCIA',
          estruturaMove: '1-CODIGO_CONTRATO,1-RAZAO_SOCIAL',
          formalizacao: '0',
          itensPendentes: 0,
          itensConcluidos: 8
        }
      ]
    } else {
      // Template genérico para outras entidades
      templateData = [allFields.reduce((acc, field) => {
        if (field === 'nome') {
          acc[field] = 'Exemplo de Nome'
        } else if (field === 'descricao' || field === 'descrição') {
          acc[field] = 'Exemplo de Descrição'
        } else if (field === 'email') {
          acc[field] = 'exemplo@empresa.com'
        } else if (field === 'ativo') {
          acc[field] = 'true'
        } else {
          acc[field] = `Exemplo de ${field}`
        }
        return acc
      }, {} as any)]
    }

    console.log('🔍 SMART IMPORTER: Gerando template para:', config.entityType)
    console.log('🔍 SMART IMPORTER: Campos incluídos:', allFields)
    console.log('🔍 SMART IMPORTER: Template data:', templateData)

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, config.entityType)
    
    XLSX.writeFile(workbook, `template-${config.entityType}.xlsx`)
  }

  const renderProcessingStatus = () => {
    if (!isProcessing) return null

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {processingStep}
        </Typography>
        <LinearProgress />
      </Box>
    )
  }

  const renderImportResult = () => {
    if (!importResult) return null

    const { valid, invalid, duplicates, totalRows, validCount, invalidCount, duplicateCount } = importResult

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Resultado da Validação
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`${validCount} Válidos`}
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<ErrorIcon />}
            label={`${invalidCount} Inválidos`}
            color="error"
            variant="outlined"
          />
          <Chip
            icon={<WarningIcon />}
            label={`${duplicateCount} Duplicatas`}
            color="warning"
            variant="outlined"
          />
        </Stack>

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Quantidade</TableCell>
                <TableCell>Percentual</TableCell>
                <TableCell>Descrição</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Chip label="Válidos" color="success" size="small" />
                </TableCell>
                <TableCell>{validCount}</TableCell>
                <TableCell>{((validCount / totalRows) * 100).toFixed(1)}%</TableCell>
                <TableCell>Prontos para importação</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Chip label="Inválidos" color="error" size="small" />
                </TableCell>
                <TableCell>{invalidCount}</TableCell>
                <TableCell>{((invalidCount / totalRows) * 100).toFixed(1)}%</TableCell>
                <TableCell>Precisam de correção</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Chip label="Duplicatas" color="warning" size="small" />
                </TableCell>
                <TableCell>{duplicateCount}</TableCell>
                <TableCell>{((duplicateCount / totalRows) * 100).toFixed(1)}%</TableCell>
                <TableCell>Serão ignorados</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {invalidCount > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {invalidCount} itens precisam de correção. 
              Você pode <strong>corrigir os dados</strong> ou <strong>importar apenas os {validCount} itens válidos</strong>.
            </Typography>
          </Alert>
        )}

        {duplicateCount > 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            <Typography variant="body2">
              {duplicateCount} itens duplicados serão ignorados durante a importação.
            </Typography>
          </Alert>
        )}
      </Box>
    )
  }

  const renderActionButtons = () => {
    if (isProcessing) {
      return (
        <Button disabled startIcon={<RefreshIcon />}>
          Processando...
        </Button>
      )
    }

    if (!file) {
      return (
        <Button onClick={onClose}>
          Cancelar
        </Button>
      )
    }

    if (!importResult) {
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={processFile}
            startIcon={<UploadIcon />}
          >
            Processar Arquivo
          </Button>
        </Box>
      )
    }

    const { invalidCount, duplicateCount, validCount } = importResult

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setFile(null)
            setImportResult(null)
          }}
          startIcon={<RefreshIcon />}
        >
          Novo Arquivo
        </Button>
        {invalidCount > 0 ? (
          <>
            <Button
              variant="outlined"
              onClick={() => setShowCorrectionModal(true)}
              startIcon={<AutoFixHighIcon />}
            >
              Corrigir Dados
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                // Importar apenas itens válidos (ignorar inválidos e duplicatas)
                const validOnlyResult: ImportResult = {
                  ...importResult,
                  invalid: [],
                  duplicates: [],
                  invalidCount: 0,
                  duplicateCount: 0
                }
                onImport(validOnlyResult)
                onClose()
              }}
              startIcon={<CheckCircleIcon />}
              disabled={validCount === 0}
            >
              Importar {validCount} Válidos
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            onClick={() => {
              onImport(importResult)
              onClose()
            }}
            startIcon={<CheckCircleIcon />}
          >
            Importar Dados
          </Button>
        )}
      </Box>
    )
  }

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { minHeight: '500px' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon color="primary" />
            <Typography variant="h6">
              Importador Inteligente - {config.entityType}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione um arquivo Excel para importar dados com validação inteligente e correção automática de inconsistências.
          </Typography>

          {!file && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ mr: 2 }}
              >
                Selecionar Arquivo
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                />
              </Button>
              <Button
                variant="text"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
              >
                Baixar Template
              </Button>
            </Box>
          )}

          {file && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Arquivo selecionado: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </Typography>
            </Alert>
          )}

          {renderProcessingStatus()}
          {renderImportResult()}
        </DialogContent>

        <DialogActions>
          {renderActionButtons()}
        </DialogActions>
      </Dialog>

      <DataCorrectionModal
        open={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        onConfirm={handleCorrectionConfirm}
        invalidItems={importResult?.invalid || []}
        duplicateItems={importResult?.duplicates || []}
        masterData={masterData}
        entityType={config.entityType}
      />
    </>
  )
}

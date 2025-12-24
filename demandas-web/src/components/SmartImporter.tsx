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
  const [progress, setProgress] = useState(0)
  const [processedItems, setProcessedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isCancelled, setIsCancelled] = useState(false)

  const validationEngine = useMemo(() => 
    new SmartValidationEngine(config, masterData), 
    [config, masterData]
  )

  // Atualizar tempo decorrido durante o processamento
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isProcessing && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isProcessing, startTime])

  // Detectar quando o modal é fechado durante o processamento
  React.useEffect(() => {
    if (!open && isProcessing) {
      console.log('⚠️ SMART IMPORTER: Modal fechado durante processamento!')
      setIsCancelled(true)
      
      // Mostrar aviso para o usuário
      alert('⚠️ ATENÇÃO: A importação foi interrompida porque você fechou o modal ou mudou de página.\n\nA importação pode continuar em background, mas você não verá mais o progresso.\n\nRecomendamos aguardar a conclusão antes de navegar para outras páginas.')
    }
  }, [open, isProcessing])

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
    setIsCancelled(false)
    setStartTime(Date.now())
    setElapsedTime(0)
    setProgress(0)
    setProcessedItems(0)
    setTotalItems(0)
    setProcessingStep('Lendo arquivo...')

    try {
      // Ler arquivo Excel
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      setProcessingStep('Processando dados...')

      // Encontrar a aba correta
      // Para Analytics, procurar por "relatório", "relatorio" ou "analytics"
      const entityTypeLower = config.entityType.toLowerCase()
      const searchTerms = entityTypeLower.includes('relatório') || entityTypeLower.includes('relatorio') || entityTypeLower.includes('analytics')
        ? ['relatório', 'relatorio', 'analytics', 'report']
        : [entityTypeLower]
      
      const sheetName = workbook.SheetNames.find(name => {
        const nameLower = name.toLowerCase()
        return searchTerms.some(term => nameLower.includes(term))
      }) || workbook.SheetNames[0]
      
      console.log('🔍 SMART IMPORTER: Abas disponíveis:', workbook.SheetNames)
      console.log('🔍 SMART IMPORTER: Aba selecionada:', sheetName)
      console.log('🔍 SMART IMPORTER: Termos de busca:', searchTerms)

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
      
      const rawItems = jsonData.slice(1)
      setTotalItems(rawItems.length)
      
      const items = rawItems.map((row: any[], rowIndex) => {
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
              } else if (cleanHeader === 'total' || cleanHeader === 'qtdclientesvinculados' || cleanHeader === 'clientesvinculados') {
                // Manutenção: campo renomeado para total (compatível com cabeçalhos antigos)
                item.total = value
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
              } else if (cleanHeader === 'total' || cleanHeader === 'qtdclientesvinculados' || cleanHeader === 'clientesvinculados') {
                // Demanda: manter compatibilidade, mas mapear também para total quando aplicável
                item.total = value
              } else if (cleanHeader === 'usuariosempresa' || cleanHeader === 'usuarios' || cleanHeader === 'usuários') {
                item.usuariosEmpresa = value
              } else if (cleanHeader === 'observacoes' || cleanHeader === 'observações' || cleanHeader === 'observacao' || cleanHeader === 'observação') {
                item.observacoes = value
              }
            } else if (config.entityType.toLowerCase().includes('relatório') || config.entityType.toLowerCase().includes('relatorio') || config.entityType.toLowerCase().includes('analytics')) {
              // Mapeamento específico para relatórios/analytics
              console.log(`🔍 SMART IMPORTER: Mapeando relatório - header: "${cleanHeader}", value: "${value}"`)
              if (cleanHeader === 'id' && value) {
                item.id = value
                console.log(`🔍 SMART IMPORTER: Mapeado id: ${value}`)
              } else if (cleanHeader === 'titulo' || cleanHeader === 'título') {
                item.titulo = value
                console.log(`🔍 SMART IMPORTER: Mapeado titulo: ${value}`)
              } else if (cleanHeader === 'descricao' || cleanHeader === 'descrição') {
                item.descricao = value
                console.log(`🔍 SMART IMPORTER: Mapeado descricao: ${value}`)
              } else if (cleanHeader === 'ticket') {
                item.ticket = value
                console.log(`🔍 SMART IMPORTER: Mapeado ticket: ${value}`)
              } else if (cleanHeader === 'total') {
                item.total = value
                console.log(`🔍 SMART IMPORTER: Mapeado total: ${value}`)
              } else if (cleanHeader === 'tipo') {
                item.tipo = value
                console.log(`🔍 SMART IMPORTER: Mapeado tipo: ${value}`)
              } else if (cleanHeader === 'status') {
                item.status = value
                console.log(`🔍 SMART IMPORTER: Mapeado status: ${value}`)
              } else if (cleanHeader === 'analista' || cleanHeader === 'analistaid' || cleanHeader === 'analistald') {
                item.analista = value
                console.log(`🔍 SMART IMPORTER: Mapeado analista: ${value}`)
              } else if (cleanHeader === 'area' || cleanHeader === 'área' || cleanHeader === 'areaid' || cleanHeader === 'áreaid') {
                item.area = value
                console.log(`🔍 SMART IMPORTER: Mapeado area: ${value}`)
              } else if (cleanHeader === 'cliente' || cleanHeader === 'clienteid' || cleanHeader === 'clienteld') {
                item.cliente = value
                console.log(`🔍 SMART IMPORTER: Mapeado cliente: ${value}`)
              } else if (cleanHeader === 'contrato' || cleanHeader === 'contratoid' || cleanHeader === 'contratold') {
                item.contrato = value
                console.log(`🔍 SMART IMPORTER: Mapeado contrato: ${value}`)
              } else if (cleanHeader === 'datainicio' || cleanHeader === 'datainicial' || cleanHeader === 'datainício' || cleanHeader === 'datainícial') {
                item.dataInicio = value
                console.log(`🔍 SMART IMPORTER: Mapeado dataInicio: ${value}`)
              } else if (cleanHeader === 'datafinalizacao' || cleanHeader === 'datafinalização' || cleanHeader === 'datafinal' || cleanHeader === 'datafinal') {
                item.dataFinalizacao = value
                console.log(`🔍 SMART IMPORTER: Mapeado dataFinalizacao: ${value}`)
              } else if (cleanHeader === 'dataentrega' || cleanHeader === 'dataentregaprevista' || cleanHeader === 'dataentrega_prevista') {
                item.dataEntrega = value
                console.log(`🔍 SMART IMPORTER: Mapeado dataEntrega: ${value}`)
              } else if (cleanHeader === 'prioridade' || cleanHeader === 'prioridad') {
                item.prioridade = value
                console.log(`🔍 SMART IMPORTER: Mapeado prioridade: ${value}`)
              } else if (cleanHeader === 'solicitante') {
                item.solicitante = value
                console.log(`🔍 SMART IMPORTER: Mapeado solicitante: ${value}`)
              } else if (cleanHeader === 'solicitacao' || cleanHeader === 'solicitação') {
                item.solicitacao = value
                console.log(`🔍 SMART IMPORTER: Mapeado solicitacao: ${value}`)
              } else if (cleanHeader === 'tiposolicitacao' || cleanHeader === 'tiposolicitação') {
                item.tipoSolicitacao = value
                console.log(`🔍 SMART IMPORTER: Mapeado tipoSolicitacao: ${value}`)
              } else if (cleanHeader === 'tiposervico' || cleanHeader === 'tiposerviço' || cleanHeader === 'tiposervicoid' || cleanHeader === 'tiposervicold') {
                item.tipoServico = value
                console.log(`🔍 SMART IMPORTER: Mapeado tipoServico: ${value}`)
              } else if (cleanHeader === 'observacoes' || cleanHeader === 'observações' || cleanHeader === 'observacao' || cleanHeader === 'observação') {
                item.observacoes = value
                console.log(`🔍 SMART IMPORTER: Mapeado observacoes: ${value}`)
              } else {
                console.log(`🔍 SMART IMPORTER: Header não mapeado para relatório: "${cleanHeader}" = "${value}"`)
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
        
        // Verificar se foi cancelado
        if (isCancelled) {
          console.log('⚠️ SMART IMPORTER: Processamento cancelado pelo usuário')
          throw new Error('Processamento cancelado pelo usuário')
        }
        
        // Atualizar progresso
        setProcessedItems(rowIndex + 1)
        setProgress(Math.round(((rowIndex + 1) / rawItems.length) * 100))
        
        // Pequeno delay para tornar o progresso visível
        if ((rowIndex + 1) % 10 === 0) {
          setTimeout(() => {}, 50)
        }
        
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
      
      // Verificar se foi cancelado antes da validação
      if (isCancelled) {
        console.log('⚠️ SMART IMPORTER: Processamento cancelado antes da validação')
        throw new Error('Processamento cancelado pelo usuário')
      }
      
      // Pequeno delay para mostrar o progresso
      setTimeout(() => {}, 100)

      // Converter nomes em IDs para campos relacionados e mapear para nomes corretos do backend
      const itemsWithIds = items.map(item => {
        const convertedItem = { ...item }
        
        // Converter analista (nome -> ID) e mapear para analistaId
        if (item.analista && typeof item.analista === 'string') {
          console.log(`🔍 SMART IMPORTER: Tentando converter analista "${item.analista}"`)
          console.log(`🔍 SMART IMPORTER: Analistas disponíveis:`, masterData.analistas?.map((a: any) => a.nome))
          
          const analista = masterData.analistas?.find((a: any) => 
            a.nome.toLowerCase().trim() === item.analista.toLowerCase().trim()
          )
          
          if (analista) {
            convertedItem.analistaId = analista.id
            console.log(`✅ SMART IMPORTER: Convertido analista "${item.analista}" -> ID: ${analista.id}`)
          } else {
            console.log(`❌ SMART IMPORTER: Analista "${item.analista}" não encontrado`)
            console.log(`🔍 SMART IMPORTER: Busca exata falhou, tentando busca parcial...`)
            
            // Tentar busca parcial (case-insensitive, com espaços)
            const analistaParcial = masterData.analistas?.find((a: any) => 
              a.nome.toLowerCase().includes(item.analista.toLowerCase().trim()) ||
              item.analista.toLowerCase().trim().includes(a.nome.toLowerCase())
            )
            
            if (analistaParcial) {
              convertedItem.analistaId = analistaParcial.id
              console.log(`✅ SMART IMPORTER: Encontrado analista por busca parcial "${item.analista}" -> "${analistaParcial.nome}" (ID: ${analistaParcial.id})`)
            } else {
              console.log(`❌ SMART IMPORTER: Analista "${item.analista}" não encontrado nem por busca parcial`)
              // Manter o valor original para que a validação possa sugerir correções
              convertedItem.analistaId = item.analista
            }
          }
        }
        
        // Converter cliente (nome -> ID) e mapear para clienteId
        if (item.cliente && typeof item.cliente === 'string') {
          console.log(`🔍 SMART IMPORTER: Tentando converter cliente "${item.cliente}"`)
          
          const cliente = masterData.clientes?.find((c: any) => 
            c.nome.toLowerCase().trim() === item.cliente.toLowerCase().trim()
          )
          
          if (cliente) {
            convertedItem.clienteId = cliente.id
            console.log(`✅ SMART IMPORTER: Convertido cliente "${item.cliente}" -> ID: ${cliente.id}`)
          } else {
            console.log(`❌ SMART IMPORTER: Cliente "${item.cliente}" não encontrado`)
            
            // Tentar busca parcial
            const clienteParcial = masterData.clientes?.find((c: any) => 
              c.nome.toLowerCase().includes(item.cliente.toLowerCase().trim()) ||
              item.cliente.toLowerCase().trim().includes(c.nome.toLowerCase())
            )
            
            if (clienteParcial) {
              convertedItem.clienteId = clienteParcial.id
              console.log(`✅ SMART IMPORTER: Encontrado cliente por busca parcial "${item.cliente}" -> "${clienteParcial.nome}" (ID: ${clienteParcial.id})`)
            } else {
              console.log(`❌ SMART IMPORTER: Cliente "${item.cliente}" não encontrado nem por busca parcial`)
              convertedItem.clienteId = item.cliente
            }
          }
        }
        
        // Converter operadora (nome -> ID) e mapear para operadoraId
        if (item.operadora && typeof item.operadora === 'string') {
          console.log(`🔍 SMART IMPORTER: Tentando converter operadora "${item.operadora}"`)
          
          const operadora = masterData.operadoras?.find((o: any) => 
            o.nome.toLowerCase().trim() === item.operadora.toLowerCase().trim()
          )
          
          if (operadora) {
            convertedItem.operadoraId = operadora.id
            console.log(`✅ SMART IMPORTER: Convertido operadora "${item.operadora}" -> ID: ${operadora.id}`)
          } else {
            console.log(`❌ SMART IMPORTER: Operadora "${item.operadora}" não encontrada`)
            
            // Tentar busca parcial
            const operadoraParcial = masterData.operadoras?.find((o: any) => 
              o.nome.toLowerCase().includes(item.operadora.toLowerCase().trim()) ||
              item.operadora.toLowerCase().trim().includes(o.nome.toLowerCase())
            )
            
            if (operadoraParcial) {
              convertedItem.operadoraId = operadoraParcial.id
              console.log(`✅ SMART IMPORTER: Encontrada operadora por busca parcial "${item.operadora}" -> "${operadoraParcial.nome}" (ID: ${operadoraParcial.id})`)
            } else {
              console.log(`❌ SMART IMPORTER: Operadora "${item.operadora}" não encontrada nem por busca parcial`)
              convertedItem.operadoraId = item.operadora
            }
          }
        }
        
        // Converter produto (nome -> ID) e mapear para produtoId
        if (item.produto && typeof item.produto === 'string') {
          console.log(`🔍 SMART IMPORTER: Tentando converter produto "${item.produto}"`)
          
          const produto = masterData.produtos?.find((p: any) => 
            p.nome.toLowerCase().trim() === item.produto.toLowerCase().trim()
          )
          
          if (produto) {
            convertedItem.produtoId = produto.id
            console.log(`✅ SMART IMPORTER: Convertido produto "${item.produto}" -> ID: ${produto.id}`)
          } else {
            console.log(`❌ SMART IMPORTER: Produto "${item.produto}" não encontrado`)
            
            // Tentar busca parcial
            const produtoParcial = masterData.produtos?.find((p: any) => 
              p.nome.toLowerCase().includes(item.produto.toLowerCase().trim()) ||
              item.produto.toLowerCase().trim().includes(p.nome.toLowerCase())
            )
            
            if (produtoParcial) {
              convertedItem.produtoId = produtoParcial.id
              console.log(`✅ SMART IMPORTER: Encontrado produto por busca parcial "${item.produto}" -> "${produtoParcial.nome}" (ID: ${produtoParcial.id})`)
            } else {
              console.log(`❌ SMART IMPORTER: Produto "${item.produto}" não encontrado nem por busca parcial`)
              convertedItem.produtoId = item.produto
            }
          }
        }

        // Converter contrato (código -> ID) e mapear para contratoId
        if (item.contrato && typeof item.contrato === 'string') {
          console.log(`🔍 SMART IMPORTER: Tentando converter contrato "${item.contrato}"`)
          
          const contrato = masterData.contratos?.find((c: any) => 
            String(c.codigo || c.numero || '').toLowerCase().trim() === item.contrato.toLowerCase().trim()
          )
          
          if (contrato) {
            convertedItem.contratoId = contrato.id
            console.log(`✅ SMART IMPORTER: Convertido contrato "${item.contrato}" -> ID: ${contrato.id}`)
          } else {
            console.log(`❌ SMART IMPORTER: Contrato "${item.contrato}" não encontrado`)
            
            // Tentar busca parcial
            const contratoParcial = masterData.contratos?.find((c: any) => {
              const contractIdentifier = String(c.codigo || c.numero || '').toLowerCase().trim();
              const searchName = item.contrato.toLowerCase().trim();
              return contractIdentifier.includes(searchName) || searchName.includes(contractIdentifier);
            });
            
            if (contratoParcial) {
              convertedItem.contratoId = contratoParcial.id
              console.log(`✅ SMART IMPORTER: Encontrado contrato por busca parcial "${item.contrato}" -> "${contratoParcial.codigo || contratoParcial.numero}" (ID: ${contratoParcial.id})`)
            } else {
              console.log(`❌ SMART IMPORTER: Contrato "${item.contrato}" não encontrado nem por busca parcial`)
              convertedItem.contratoId = item.contrato
            }
          }
        }
        
        return convertedItem
      })

      // Validar dados
      const result = validationEngine.processItems(itemsWithIds)

      console.log('🔍 SMART IMPORTER: Resultado da validação:', {
        valid: result.valid.length,
        invalid: result.invalid.length,
        duplicates: result.duplicates.length
      })

      // Garantir que o progresso seja 100% antes de finalizar
      setProgress(100)
      setProcessedItems(totalItems)
      
      // Delay maior para mostrar o progresso completo
      setTimeout(() => {
        setImportResult(result)
        setProcessingStep('')
        
        // Sempre mostrar resultado da validação antes de importar
        console.log('✅ SMART IMPORTER: Mostrando resultado da validação')
        // Não importar automaticamente - deixar o usuário decidir
      }, 1000)

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

  const handleDownloadDuplicates = () => {
    if (!importResult || importResult.duplicates.length === 0) return

    const worksheet = XLSX.utils.json_to_sheet(
      importResult.duplicates.map(item => item.data)
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Duplicados')
    
    const fileName = `duplicados-${config.entityType}-${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const handleDownloadInvalid = () => {
    if (!importResult || importResult.invalid.length === 0) return

    const worksheet = XLSX.utils.json_to_sheet(
      importResult.invalid.map(item => ({
        ...item.data,
        erros: item.validation.errors.map(e => e.message).join('; ')
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Itens para Correção')
    
    const fileName = `itens-para-correcao-${config.entityType}-${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
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
          // Campos opcionais (podem ser deixados em branco):
          cliente: 'Empresa ABC Ltda',
          contrato: 'CTR-001',
          operadora: 'Operadora XYZ',
          produto: 'Produto Premium',
          sistema: 'Sistema Principal',
          observacoes: 'Manutenção preventiva mensal',
          qtdRetornos: 0,
          qualidade: '1',
          total: 50
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
          // Campos opcionais (podem ser deixados em branco):
          cliente: 'Comércio XYZ S.A.',
          contrato: 'CTR-002',
          operadora: 'Operadora ABC',
          produto: 'Produto Standard',
          sistema: 'Sistema Secundário',
          observacoes: 'Correção urgente solicitada pelo cliente',
          qtdRetornos: 1,
          qualidade: '2',
          total: 25
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

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    }

    const estimatedTimeRemaining = processedItems > 0 && elapsedTime > 0 
      ? Math.round((elapsedTime / processedItems) * (totalItems - processedItems))
      : 0

    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {processingStep}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {processedItems} de {totalItems} itens ({progress}%)
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mb: 1, height: 8, borderRadius: 4 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            ⏱️ Tempo decorrido: {formatTime(elapsedTime)}
          </Typography>
          {estimatedTimeRemaining > 0 && (
            <Typography variant="caption" color="text.secondary">
              ⏳ Tempo restante: ~{formatTime(estimatedTimeRemaining)}
            </Typography>
          )}
        </Box>
      </Box>
    )
  }

  const renderImportResult = () => {
    if (!importResult) {
      console.log('🔍 SMART IMPORTER: importResult é null')
      return null
    }

    const { valid, invalid, duplicates, totalRows, validCount, invalidCount, duplicateCount } = importResult

    console.log('🔍 SMART IMPORTER: Resultado da validação:', {
      validCount,
      invalidCount,
      duplicateCount,
      invalidLength: invalid?.length,
      duplicatesLength: duplicates?.length
    })

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
          <Alert 
            severity="warning" 
            sx={{ mt: 2 }}
            action={
              <Button
                size="small"
                onClick={handleDownloadInvalid}
                startIcon={<DownloadIcon />}
                sx={{ color: 'warning.main', fontWeight: 500 }}
              >
                Baixar ({invalidCount})
              </Button>
            }
          >
            <Typography variant="body2">
              {invalidCount} itens precisam de correção. 
              Você pode <strong>corrigir os dados</strong> ou <strong>importar apenas os {validCount} itens válidos</strong>.
            </Typography>
          </Alert>
        )}

        {duplicateCount > 0 && (
          <Alert 
            severity="info" 
            sx={{ mt: 1 }}
            action={
              <Button
                size="small"
                onClick={handleDownloadDuplicates}
                startIcon={<DownloadIcon />}
                sx={{ color: 'info.main', fontWeight: 500 }}
              >
                Baixar ({duplicateCount})
              </Button>
            }
          >
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
            disabled={isProcessing}
          >
            {isProcessing ? 'Processando...' : 'Processar Arquivo'}
          </Button>
          {isProcessing && (
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => {
                setIsCancelled(true)
                setIsProcessing(false)
                setProcessingStep('')
              }}
            >
              Cancelar Processamento
            </Button>
          )}
        </Box>
      )
    }

    const { invalidCount, duplicateCount, validCount } = importResult

    console.log('🔍 SMART IMPORTER ACTION BUTTONS: Contadores:', {
      validCount,
      invalidCount,
      duplicateCount,
      totalRows: importResult.totalRows
    })

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
        {invalidCount > 0 && (
          <Button
            variant="outlined"
            onClick={() => setShowCorrectionModal(true)}
            startIcon={<AutoFixHighIcon />}
          >
            Corrigir Dados
          </Button>
        )}
        {validCount > 0 && (
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
          >
            Importar {validCount} Válidos
          </Button>
        )}
        {validCount === 0 && invalidCount === 0 && duplicateCount === 0 && (
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

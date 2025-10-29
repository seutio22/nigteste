import type { 
  ValidationRule, 
  ValidationResult, 
  ValidationError, 
  ImportItem, 
  ImportResult,
  SmartImporterConfig,
  CorrectionSuggestion
} from '../types/smartImporter'

export class SmartValidationEngine {
  private config: SmartImporterConfig
  private masterData: any

  constructor(config: SmartImporterConfig, masterData: any) {
    this.config = config
    this.masterData = masterData
  }

  /**
   * Valida um item individual
   */
  validateItem(item: any, originalRow: number): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    // Aplicar regras de validação
    for (const rule of this.config.validationRules) {
      const fieldValue = item[rule.field]
      const validation = this.validateField(fieldValue, item, rule)
      
      if (!validation.isValid) {
        const error: ValidationError = {
          field: rule.field,
          message: validation.message || rule.message,
          type: rule.type,
          severity: 'error',
          suggestion: validation.suggestion
        }
        
        if (rule.type === 'required') {
          errors.push(error)
        } else {
          warnings.push(error)
        }
      }
    }

    // Verificar campos obrigatórios com validação mais rigorosa
    for (const field of this.config.requiredFields) {
      const value = item[field]
      const isEmpty = !value || 
                     value === '' || 
                     value === null || 
                     value === undefined ||
                     (typeof value === 'string' && value.trim() === '')
      
      if (isEmpty) {
        console.log(`❌ VALIDAÇÃO OBRIGATÓRIA: Campo "${field}" está vazio ou inválido: "${value}"`)
        errors.push({
          field,
          message: `Campo ${field} é obrigatório`,
          type: 'required',
          severity: 'error'
        })
      } else {
        console.log(`✅ VALIDAÇÃO OBRIGATÓRIA: Campo "${field}" preenchido: "${value}"`)
      }
    }

    // Verificar referências com validação mais rigorosa
    for (const refField of this.config.referenceFields) {
      const fieldValue = item[refField.field]
      
      // Se o campo é obrigatório, validar mesmo se estiver vazio
      const isRequiredField = this.config.requiredFields.includes(refField.field)
      
      if (fieldValue || isRequiredField) {
        console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Validando campo "${refField.field}" com valor: "${fieldValue}"`)
        const reference = this.validateReference(fieldValue, refField)
        if (!reference.isValid) {
          console.log(`❌ VALIDAÇÃO REFERÊNCIA: Campo "${refField.field}" falhou na validação: ${reference.message}`)
          errors.push({
            field: refField.field,
            message: reference.message,
            type: 'reference',
            severity: 'error',
            suggestion: reference.suggestion,
            suggestedValue: reference.suggestedValue
          })
        } else {
          console.log(`✅ VALIDAÇÃO REFERÊNCIA: Campo "${refField.field}" passou na validação`)
        }
      } else {
        console.log(`⏭️ VALIDAÇÃO REFERÊNCIA: Campo "${refField.field}" vazio e não obrigatório, pulando validação`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Valida um campo específico
   */
  private validateField(value: any, item: any, rule: ValidationRule): { isValid: boolean; message?: string; suggestion?: string } {
    if (rule.type === 'required') {
      return {
        isValid: value !== null && value !== undefined && value !== '',
        message: `Campo ${rule.field} é obrigatório`
      }
    }

    if (rule.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return {
        isValid: !value || emailRegex.test(value),
        message: `Email inválido: ${value}`,
        suggestion: this.suggestEmailCorrection(value)
      }
    }

    if (rule.type === 'date') {
      const parsedDate = this.parseDate(value)
      return {
        isValid: !value || parsedDate.isValid,
        message: `Data inválida: ${value}`,
        suggestion: this.suggestDateCorrection(value)
      }
    }

    if (rule.type === 'number') {
      return {
        isValid: !value || !isNaN(Number(value)),
        message: `Número inválido: ${value}`,
        suggestion: this.suggestNumberCorrection(value)
      }
    }

    if (rule.type === 'status') {
      // Status válidos para manutenções
      const validStatuses = [
        'Aberta', 'Em andamento', 'Aguardando validação', 'Com erros', 
        'Em reajuste', 'Concluída', 'Cancelada', 'CONCLUIDO', 'EM ANDAMENTO',
        'AGUARDANDO VALIDACAO', 'COM ERROS', 'EM REAJUSTE', 'CANCELADA'
      ]
      return {
        isValid: !value || validStatuses.includes(value),
        message: `Status inválido: ${value}. Valores aceitos: ${validStatuses.slice(0, 7).join(', ')}`,
        suggestion: this.suggestStatusCorrection(value, validStatuses)
      }
    }

    if (rule.type === 'custom' && rule.validator) {
      return {
        isValid: rule.validator(value, item),
        message: rule.message,
        suggestion: rule.suggestion ? rule.suggestion(value, item) : undefined
      }
    }

    return { isValid: true }
  }

  /**
   * Valida referências (IDs que devem existir em outras tabelas)
   */
  private validateReference(value: any, refField: any): { isValid: boolean; message?: string; suggestion?: string; suggestedValue?: any } {
    const referenceData = this.masterData[refField.referenceStore] || []
    
    console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Campo "${refField.field}", Valor recebido: "${value}"`)
    console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Store "${refField.referenceStore}" tem ${referenceData.length} registros`)
    console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Primeiros registros:`, referenceData.slice(0, 3).map((r: any) => ({ id: r.id, nome: r[refField.displayField] })))
    
    // Se o valor estiver vazio, verificar se é campo obrigatório
    if (!value || String(value).trim() === '') {
      // Verificar se este campo está na lista de campos obrigatórios
      const isRequiredField = this.config.requiredFields.includes(refField.field)
      if (isRequiredField) {
        console.log(`❌ VALIDAÇÃO REFERÊNCIA: Campo obrigatório "${refField.field}" está vazio`)
        return { 
          isValid: false, 
          message: `Campo ${refField.field} é obrigatório e não pode estar vazio` 
        }
      } else {
        console.log(`✅ VALIDAÇÃO REFERÊNCIA: Campo opcional "${refField.field}" vazio, considerando válido`)
        return { isValid: true }
      }
    }
    
    // Converter valor para string e normalizar
    const stringValue = String(value || '').trim()
    
    // Verificar se existe por ID (comparação exata)
    const existsById = referenceData.some((item: any) => item[refField.valueField] === stringValue)
    
    if (existsById) {
      console.log(`✅ VALIDAÇÃO REFERÊNCIA: Encontrado por ID exato`)
      return { isValid: true }
    }
    
    // Verificar se existe por nome (case insensitive e ignorando acentos)
    const normalizeString = (str: string) => {
      return str.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, ' ') // Normaliza espaços
        .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    }
    
    const existsByName = referenceData.find((item: any) => {
      const itemName = normalizeString(String(item[refField.displayField] || ''))
      const searchName = normalizeString(stringValue)
      console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Comparando "${itemName}" com "${searchName}"`)
      return itemName === searchName
    })
    
    if (existsByName) {
      console.log(`✅ VALIDAÇÃO REFERÊNCIA: Encontrado por nome (normalizado): "${existsByName[refField.displayField]}"`)
      return { isValid: true }
    }

    // NOVO: Buscar por correspondência parcial (contém)
    const existsByPartialMatch = referenceData.find((item: any) => {
      const itemName = normalizeString(String(item[refField.displayField] || ''))
      const searchName = normalizeString(stringValue)
      
      // Verificar se um contém o outro (mais tolerante)
      const containsMatch = itemName.includes(searchName) || searchName.includes(itemName)
      
      if (containsMatch) {
        console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Correspondência parcial encontrada: "${item[refField.displayField]}" contém "${stringValue}"`)
      }
      
      return containsMatch
    })
    
    if (existsByPartialMatch) {
      console.log(`✅ VALIDAÇÃO REFERÊNCIA: Encontrado por correspondência parcial: "${existsByPartialMatch[refField.displayField]}"`)
      return { isValid: true }
    }

    // NOVO: Buscar por palavras-chave (qualquer palavra em comum)
    const existsByKeywords = referenceData.find((item: any) => {
      const itemName = normalizeString(String(item[refField.displayField] || ''))
      const searchName = normalizeString(stringValue)
      
      // Dividir em palavras e verificar se alguma palavra está presente
      const searchWords = searchName.split(' ').filter(word => word.length > 2) // Ignorar palavras muito pequenas
      const itemWords = itemName.split(' ').filter(word => word.length > 2)
      
      const hasCommonWord = searchWords.some(searchWord => 
        itemWords.some(itemWord => 
          itemWord.includes(searchWord) || searchWord.includes(itemWord)
        )
      )
      
      if (hasCommonWord) {
        console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Correspondência por palavra-chave encontrada: "${item[refField.displayField]}"`)
      }
      
      return hasCommonWord
    })
    
    if (existsByKeywords) {
      console.log(`✅ VALIDAÇÃO REFERÊNCIA: Encontrado por palavra-chave: "${existsByKeywords[refField.displayField]}"`)
      return { isValid: true }
    }

    // ESPECIAL: Para campo cliente, buscar também por grupo econômico
    if (refField.field === 'cliente' && refField.referenceStore === 'clientes') {
      console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Buscando cliente por grupo econômico também...`)
      
      const existsByGrupoEconomico = referenceData.find((item: any) => {
        const grupoEconomico = normalizeString(String(item.grupoEconomico || ''))
        const searchName = normalizeString(stringValue)
        
        // Buscar correspondências exatas, parciais e por palavras-chave no grupo econômico
        const exactMatch = grupoEconomico === searchName
        const partialMatch = grupoEconomico.includes(searchName) || searchName.includes(grupoEconomico)
        
        // Buscar por palavras-chave no grupo econômico
        const searchWords = searchName.split(' ').filter(word => word.length > 2)
        const grupoWords = grupoEconomico.split(' ').filter(word => word.length > 2)
        
        const keywordMatch = searchWords.some(searchWord => 
          grupoWords.some(grupoWord => 
            grupoWord.includes(searchWord) || searchWord.includes(grupoWord)
          )
        )
        
        const found = exactMatch || partialMatch || keywordMatch
        
        if (found) {
          console.log(`🔍 VALIDAÇÃO REFERÊNCIA: Cliente encontrado por grupo econômico: "${item.nome}" (Grupo: "${item.grupoEconomico}")`)
        }
        
        return found
      })
      
      if (existsByGrupoEconomico) {
        console.log(`✅ VALIDAÇÃO REFERÊNCIA: Cliente encontrado por grupo econômico: "${existsByGrupoEconomico.nome}"`)
        return { isValid: true }
      }
    }

    // Se não encontrou, buscar sugestão similar
    console.log(`⚠️ VALIDAÇÃO REFERÊNCIA: Não encontrado, buscando similar...`)
    const suggestion = this.findSimilarReference(stringValue, referenceData, refField)
    
    if (suggestion) {
      console.log(`💡 VALIDAÇÃO REFERÊNCIA: Sugestão encontrada: "${suggestion[refField.displayField]}"`)
    } else {
      console.log(`❌ VALIDAÇÃO REFERÊNCIA: Nenhuma sugestão similar encontrada`)
    }
    
    // Para campos opcionais, ser mais tolerante
    const isOptionalField = !this.config.requiredFields.includes(refField.field)
    
    if (isOptionalField) {
      console.log(`⚠️ VALIDAÇÃO REFERÊNCIA: Campo opcional "${refField.field}" não encontrado, mas aceitando como válido`)
      return { 
        isValid: true,
        message: `Referência não encontrada: ${value} (aceito como campo opcional)`,
        suggestion: suggestion ? `Sugestão: ${suggestion[refField.displayField]}` : undefined
      }
    }
    
    return {
      isValid: false,
      message: `Referência não encontrada: ${value}`,
      suggestion: suggestion ? `Sugestão: ${suggestion[refField.displayField]}` : undefined,
      suggestedValue: suggestion ? suggestion[refField.displayField] : undefined
    }
  }

  /**
   * Encontra referência similar usando busca fuzzy
   */
  private findSimilarReference(value: any, referenceData: any[], refField: any): any | null {
    if (!value || !referenceData.length) return null

    // Converter para string se não for
    const stringValue = String(value)
    const searchValue = stringValue.toLowerCase().trim()
    let bestMatch = null
    let bestScore = 0

    for (const item of referenceData) {
      const displayValue = String(item[refField.displayField] || '').toLowerCase().trim()
      const score = this.calculateSimilarity(searchValue, displayValue)
      
      if (score > bestScore && score > 0.6) { // 60% de similaridade mínima
        bestScore = score
        bestMatch = item
      }
    }

    return bestMatch
  }

  /**
   * Calcula similaridade entre duas strings (algoritmo de Levenshtein simplificado)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (!str1 || !str2) return 0

    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1

    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Sugestões de correção
   */
  private suggestEmailCorrection(email: any): string | undefined {
    if (!email) return undefined
    
    // Converter para string se não for
    const stringEmail = String(email)
    
    // Correções comuns
    const corrections: { [key: string]: string } = {
      'gmail.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.coom': 'gmail.com',
      'hotmail.com': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'outlook.com': 'outlook.com',
      'outlook.co': 'outlook.com'
    }

    const domain = stringEmail.split('@')[1]?.toLowerCase()
    if (domain && corrections[domain]) {
      return stringEmail.replace(domain, corrections[domain])
    }

    return undefined
  }

  /**
   * Converte diferentes formatos de data para objeto Date válido
   */
  private parseDate(value: any): { isValid: boolean; date?: Date } {
    if (!value) return { isValid: true }

    const stringValue = String(value).trim()

    // 1. Números seriais do Excel (como 45904, 45905, 45898)
    if (/^\d{5,6}$/.test(stringValue)) {
      const serialNumber = parseInt(stringValue)
      if (serialNumber >= 1 && serialNumber <= 2958465) { // Range válido do Excel
        // Excel conta dias desde 1900-01-01 (mas tem bug do ano bissexto 1900)
        const excelEpoch = new Date(1900, 0, 1)
        const days = serialNumber - 2 // -2 para corrigir bug do Excel
        const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
        
        if (!isNaN(date.getTime())) {
          return { isValid: true, date }
        }
      }
    }

    // 2. Formatos de string comuns
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/,   // DD-MM-YYYY
      /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // D/M/YYYY
    ]

    for (const format of formats) {
      const match = stringValue.match(format)
      if (match) {
        const [, part1, part2, part3] = match
        // Assumir DD/MM/YYYY para formatos brasileiros
        const date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1))
        if (!isNaN(date.getTime())) {
          return { isValid: true, date }
        }
      }
    }

    // 3. Tentar parse direto do JavaScript
    const directDate = new Date(value)
    if (!isNaN(directDate.getTime())) {
      return { isValid: true, date: directDate }
    }

    return { isValid: false }
  }

  private suggestDateCorrection(date: any): string | undefined {
    if (!date) return undefined

    const parsedDate = this.parseDate(date)
    if (parsedDate.isValid && parsedDate.date) {
      // Retornar data no formato YYYY-MM-DD
      return parsedDate.date.toISOString().split('T')[0]
    }

    // Converter para string se não for
    const stringDate = String(date)

    // Tentar formatos comuns
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/,   // DD-MM-YYYY
    ]

    for (const format of formats) {
      const match = stringDate.match(format)
      if (match) {
        const [, part1, part2, part3] = match
        return `${part3}-${part2}-${part1}` // Padrão YYYY-MM-DD
      }
    }

    return undefined
  }

  private suggestNumberCorrection(value: any): string | undefined {
    if (!value) return undefined

    // Converter para string se não for
    const stringValue = String(value)
    
    // Remover caracteres não numéricos exceto ponto e vírgula
    const cleaned = stringValue.replace(/[^\d.,]/g, '')
    
    // Converter vírgula para ponto
    const normalized = cleaned.replace(',', '.')
    
    if (!isNaN(Number(normalized))) {
      return normalized
    }

    return undefined
  }

  private suggestStatusCorrection(value: any, validStatuses: string[]): string | undefined {
    if (!value) return undefined

    // Converter para string se não for
    const stringValue = String(value)
    const valueLower = stringValue.toLowerCase()
    
    for (const status of validStatuses) {
      if (status.toLowerCase().includes(valueLower) || valueLower.includes(status.toLowerCase())) {
        return status
      }
    }

    return undefined
  }

  /**
   * Obtém dados existentes para verificação de duplicatas
   */
  private getExistingDataForEntity(): any[] {
    const entityType = this.config.entityType.toLowerCase()
    
    // Mapear tipo de entidade para o campo correspondente no masterData
    if (entityType.includes('cliente')) {
      return this.masterData.clientes || []
    } else if (entityType.includes('contrato')) {
      return this.masterData.contratos || []
    } else if (entityType.includes('operadora')) {
      return this.masterData.operadoras || []
    } else if (entityType.includes('produto')) {
      return this.masterData.produtos || []
    } else if (entityType.includes('sistema')) {
      return this.masterData.sistemas || []
    } else if (entityType.includes('analista')) {
      return this.masterData.analistas || []
    } else if (entityType.includes('solicitante')) {
      return this.masterData.solicitantes || []
    } else if (entityType.includes('área') || entityType.includes('area')) {
      return this.masterData.areas || []
    } else if (entityType.includes('relatório') || entityType.includes('relatorio')) {
      return this.masterData.relatorios || []
    } else if (entityType.includes('modelo')) {
      return this.masterData.modelos || []
    } else if (entityType.includes('áreas mailling') || entityType.includes('areas mailling')) {
      return this.masterData.areasMailling || []
    } else if (entityType.includes('cargos mailling') || entityType.includes('cargosmailling')) {
      return this.masterData.cargosMailling || []
    } else if (entityType.includes('filiais mailling') || entityType.includes('filiaismailling')) {
      return this.masterData.filiaisMailling || []
    }
    
    return []
  }

  /**
   * Processa uma lista de itens e retorna resultado completo
   */
  processItems(items: any[]): ImportResult {
    const valid: ImportItem[] = []
    const invalid: ImportItem[] = []
    const duplicates: ImportItem[] = []
    const allWarnings: ValidationError[] = []

    // Verificar duplicatas primeiro
    const seen = new Set<string>()
    const duplicateKeys = new Set<string>()
    
    // Adicionar chaves dos dados existentes no banco de dados ao conjunto
    const existingData = this.getExistingDataForEntity()
    console.log(`🔍 DUPLICATA: Dados existentes no banco: ${existingData.length} registros`)
    
    existingData.forEach((existingItem: any) => {
      const existingKey = this.config.duplicateCheckFields
        .map(field => String(existingItem[field] || '').trim().toUpperCase())
        .join('|')
      
      if (existingKey && existingKey !== '' && existingKey !== '|') {
        seen.add(existingKey)
      }
    })
    
    console.log(`🔍 DUPLICATA: Total de chaves existentes no banco: ${seen.size}`)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Criar chave de duplicata baseada nos campos configurados (UPPERCASE para comparação case-insensitive)
      const duplicateKey = this.config.duplicateCheckFields
        .map(field => String(item[field] || '').trim().toUpperCase())
        .join('|')
      
      // CORREÇÃO: Ignorar se a chave estiver vazia (todos os campos vazios)
      // Isso previne marcar linhas sem ticket como duplicadas
      if (!duplicateKey || duplicateKey === '' || duplicateKey === '|') {
        console.log(`🔍 DUPLICATA: Linha ${i + 2} - Campos de verificação vazios, ignorando verificação de duplicata`)
        continue
      }

      if (seen.has(duplicateKey)) {
        console.log(`⚠️ DUPLICATA: Linha ${i + 2} - Duplicata encontrada com chave: "${duplicateKey}"`)
        duplicateKeys.add(duplicateKey)
      } else {
        console.log(`✅ DUPLICATA: Linha ${i + 2} - Chave única: "${duplicateKey}"`)
        seen.add(duplicateKey)
      }
    }

    // Processar cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Criar chave de duplicata (UPPERCASE para comparação case-insensitive)
      const duplicateKey = this.config.duplicateCheckFields
        .map(field => String(item[field] || '').trim().toUpperCase())
        .join('|')

      // CORREÇÃO: Apenas marcar como duplicado se a chave não estiver vazia
      const isDuplicate = duplicateKey && duplicateKey !== '' && duplicateKey !== '|' && duplicateKeys.has(duplicateKey)
      
      if (isDuplicate) {
        console.log(`🔴 DUPLICATA DETECTADA: Linha ${i + 2}, Chave: "${duplicateKey}"`)
        
        // Criar mensagem detalhada mostrando os campos que formam a duplicata
        const duplicateFieldsText = this.config.duplicateCheckFields
          .map(field => `${field}: "${item[field] || ''}"`)
          .join(', ')
        
        duplicates.push({
          id: crypto.randomUUID(),
          data: item,
          originalRow: i + 2, // +2 porque a primeira linha é header
          validation: {
            isValid: false,
            errors: [{
              field: 'duplicate',
              message: `Item duplicado (${duplicateFieldsText})`,
              type: 'duplicate',
              severity: 'error'
            }],
            warnings: [],
            suggestions: []
          }
        })
        continue
      }

      const validation = this.validateItem(item, i + 2)
      const importItem: ImportItem = {
        id: crypto.randomUUID(),
        data: item,
        originalRow: i + 2,
        validation
      }

      allWarnings.push(...validation.warnings)

      if (validation.isValid) {
        valid.push(importItem)
      } else {
        invalid.push(importItem)
      }
    }

    return {
      valid,
      invalid,
      duplicates,
      totalRows: items.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      duplicateCount: duplicates.length,
      warnings: allWarnings
    }
  }

  /**
   * Gera sugestões de correção para um item
   */
  generateCorrectionSuggestions(item: ImportItem): CorrectionSuggestion[] {
    const suggestions: CorrectionSuggestion[] = []

    for (const error of item.validation.errors) {
      if (error.suggestedValue) {
        suggestions.push({
          field: error.field,
          originalValue: item.data[error.field],
          suggestedValue: error.suggestedValue,
          confidence: 0.8,
          reason: error.suggestion || 'Correção automática sugerida'
        })
      }
    }

    return suggestions
  }
}

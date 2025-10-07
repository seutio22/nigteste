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

    // Verificar campos obrigatórios
    for (const field of this.config.requiredFields) {
      if (!item[field] || item[field] === '') {
        errors.push({
          field,
          message: `Campo ${field} é obrigatório`,
          type: 'required',
          severity: 'error'
        })
      }
    }

    // Verificar referências
    for (const refField of this.config.referenceFields) {
      const fieldValue = item[refField.field]
      if (fieldValue) {
        const reference = this.validateReference(fieldValue, refField)
        if (!reference.isValid) {
          errors.push({
            field: refField.field,
            message: reference.message,
            type: 'reference',
            severity: 'error',
            suggestion: reference.suggestion,
            suggestedValue: reference.suggestedValue
          })
        }
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
      const date = new Date(value)
      return {
        isValid: !value || !isNaN(date.getTime()),
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
      const validStatuses = ['Ativo', 'Inativo', 'Pendente', 'Concluído']
      return {
        isValid: !value || validStatuses.includes(value),
        message: `Status inválido: ${value}. Valores aceitos: ${validStatuses.join(', ')}`,
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
    
    // Converter valor para string e normalizar
    const stringValue = String(value || '').trim()
    
    // Verificar se existe por ID (comparação exata)
    const existsById = referenceData.some((item: any) => item[refField.valueField] === stringValue)
    
    if (existsById) {
      console.log(`✅ VALIDAÇÃO REFERÊNCIA: Encontrado por ID exato`)
      return { isValid: true }
    }
    
    // Verificar se existe por nome (case insensitive)
    const existsByName = referenceData.find((item: any) => {
      const itemName = String(item[refField.displayField] || '').toLowerCase().trim()
      const searchName = stringValue.toLowerCase().trim()
      return itemName === searchName
    })
    
    if (existsByName) {
      console.log(`✅ VALIDAÇÃO REFERÊNCIA: Encontrado por nome (case insensitive): "${existsByName[refField.displayField]}"`)
      return { isValid: true }
    }

    // Se não encontrou, buscar sugestão similar
    console.log(`⚠️ VALIDAÇÃO REFERÊNCIA: Não encontrado, buscando similar...`)
    const suggestion = this.findSimilarReference(stringValue, referenceData, refField)
    
    if (suggestion) {
      console.log(`💡 VALIDAÇÃO REFERÊNCIA: Sugestão encontrada: "${suggestion[refField.displayField]}"`)
    } else {
      console.log(`❌ VALIDAÇÃO REFERÊNCIA: Nenhuma sugestão similar encontrada`)
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

  private suggestDateCorrection(date: any): string | undefined {
    if (!date) return undefined

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

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const duplicateKey = this.config.duplicateCheckFields
        .map(field => item[field])
        .join('|')

      if (seen.has(duplicateKey)) {
        duplicateKeys.add(duplicateKey)
      } else {
        seen.add(duplicateKey)
      }
    }

    // Processar cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const duplicateKey = this.config.duplicateCheckFields
        .map(field => item[field])
        .join('|')

      const isDuplicate = duplicateKeys.has(duplicateKey) && seen.has(duplicateKey)
      
      if (isDuplicate) {
        duplicates.push({
          id: crypto.randomUUID(),
          data: item,
          originalRow: i + 2, // +2 porque a primeira linha é header
          validation: {
            isValid: false,
            errors: [{
              field: 'duplicate',
              message: 'Item duplicado',
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

export interface ValidationError {
  field: string
  message: string
  type:
    | 'required'
    | 'format'
    | 'reference'
    | 'duplicate'
    | 'custom'
    | 'email'
    | 'date'
    | 'number'
    | 'status'
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
  suggestedValue?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
}

export type ImportMode = 'insert' | 'update' | 'upsert'

export interface ImportItem {
  id: string
  data: any
  originalRow: number
  validation: ValidationResult
  isCorrected?: boolean
  correctedData?: any
  /** Ação na importação (quando a entidade suporta upsert) */
  importAction?: 'insert' | 'update'
  /** ID do registro existente (modos update/upsert) */
  existingId?: string
}

export interface ImportResult {
  valid: ImportItem[]
  invalid: ImportItem[]
  duplicates: ImportItem[]
  /** Linhas ignoradas (ex.: e-mail não encontrado no modo "atualizar") */
  skipped?: ImportItem[]
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  skippedCount?: number
  insertCount?: number
  updateCount?: number
  importMode?: ImportMode
  warnings: ValidationError[]
}

export interface SmartImporterConfig {
  entityType: string
  requiredFields: string[]
  optionalFields: string[]
  validationRules: ValidationRule[]
  duplicateCheckFields: string[]
  referenceFields: ReferenceField[]
  /** Modos disponíveis; padrão = só inclusão */
  importModes?: ImportMode[]
}

export interface ValidationRule {
  field: string
  type: 'required' | 'email' | 'date' | 'number' | 'status' | 'reference' | 'custom'
  message: string
  validator?: (value: any, item: any) => boolean
  suggestion?: (value: any, item: any) => string
  /** Ex.: `{ min: 0 }` para validação numérica */
  options?: { min?: number; max?: number }
}

export interface ReferenceField {
  field: string
  referenceType: string
  referenceStore: string
  displayField: string
  valueField: string
  /** Vários IDs separados (ex.: filiais vinculadas) */
  isMultiple?: boolean
}

export interface CorrectionSuggestion {
  field: string
  originalValue: any
  suggestedValue: any
  confidence: number
  reason: string
}

export interface SmartImporterProps {
  open: boolean
  onClose: () => void
  onImport: (result: ImportResult) => void
  config: SmartImporterConfig
  masterData: any
}

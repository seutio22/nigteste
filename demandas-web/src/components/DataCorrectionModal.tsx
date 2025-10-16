import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Stack
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AutoFixHigh as AutoFixHighIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import type { ImportItem, ValidationError, CorrectionSuggestion } from '../types/smartImporter'

interface DataCorrectionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (correctedItems: ImportItem[]) => void
  invalidItems: ImportItem[]
  duplicateItems: ImportItem[]
  masterData: any
  entityType: string
}

export const DataCorrectionModal: React.FC<DataCorrectionModalProps> = ({
  open,
  onClose,
  onConfirm,
  invalidItems,
  duplicateItems,
  masterData,
  entityType
}) => {
  const [activeStep, setActiveStep] = useState(0)
  const [correctedItems, setCorrectedItems] = useState<ImportItem[]>([])
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [currentItem, setCurrentItem] = useState<ImportItem | null>(null)
  const [correctionData, setCorrectionData] = useState<any>({})

  useEffect(() => {
    console.log('🔍 DataCorrectionModal useEffect:', {
      open,
      invalidItems: invalidItems.length,
      duplicateItems: duplicateItems.length
    })
    
    if (open) {
      console.log('✅ DataCorrectionModal: Abrindo modal de correção')
      setActiveStep(0)
      setCurrentItemIndex(0)
      setCorrectedItems([])
      if (invalidItems.length > 0) {
        setCurrentItem(invalidItems[0])
        setCorrectionData({ ...invalidItems[0].data })
      }
    }
  }, [open, invalidItems, duplicateItems])

  const steps = [
    'Revisar Inconsistências',
    'Corrigir Dados',
    'Confirmar Importação'
  ]

  const getErrorIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <ErrorIcon color="error" />
      case 'warning': return <WarningIcon color="warning" />
      case 'info': return <InfoIcon color="info" />
      default: return <InfoIcon />
    }
  }

  const getErrorColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'error'
      case 'warning': return 'warning'
      case 'info': return 'info'
      default: return 'default'
    }
  }

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1)
    }
  }

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const handleApplySuggestion = (field: string, suggestedValue: any) => {
    setCorrectionData(prev => ({
      ...prev,
      [field]: suggestedValue
    }))
  }

  const handleFieldChange = (field: string, value: any) => {
    setCorrectionData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveCorrection = () => {
    if (currentItem) {
      const correctedItem: ImportItem = {
        ...currentItem,
        data: correctionData,
        isCorrected: true,
        correctedData: correctionData
      }
      
      setCorrectedItems(prev => [...prev, correctedItem])
      
      // Próximo item
      const nextIndex = currentItemIndex + 1
      if (nextIndex < invalidItems.length) {
        setCurrentItemIndex(nextIndex)
        setCurrentItem(invalidItems[nextIndex])
        setCorrectionData({ ...invalidItems[nextIndex].data })
      } else {
        handleNext()
      }
    }
  }

  const handleSkipItem = () => {
    const nextIndex = currentItemIndex + 1
    if (nextIndex < invalidItems.length) {
      setCurrentItemIndex(nextIndex)
      setCurrentItem(invalidItems[nextIndex])
      setCorrectionData({ ...invalidItems[nextIndex].data })
    } else {
      handleNext()
    }
  }

  const handleConfirmImport = () => {
    const allCorrectedItems = [...correctedItems, ...invalidItems.filter(item => 
      !correctedItems.some(corrected => corrected.id === item.id)
    )]
    onConfirm(allCorrectedItems)
  }

  const renderErrorDetails = (errors: ValidationError[]) => {
    return (
      <Box sx={{ mt: 2 }}>
        {errors.map((error, index) => (
          <Alert 
            key={index} 
            severity={error.severity as any} 
            sx={{ mb: 1 }}
            icon={getErrorIcon(error.severity)}
          >
            <Typography variant="body2">
              <strong>{error.field}:</strong> {error.message}
            </Typography>
            {error.suggestion && (
              <Typography variant="caption" color="text.secondary">
                💡 {error.suggestion}
              </Typography>
            )}
          </Alert>
        ))}
      </Box>
    )
  }

  const renderCorrectionForm = () => {
    if (!currentItem) return null

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Corrigindo Item {currentItemIndex + 1} de {invalidItems.length}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Linha {currentItem.originalRow} do arquivo
        </Typography>

        {/* Erros encontrados */}
        {renderErrorDetails(currentItem.validation.errors)}

        {/* Formulário de correção */}
        <Box sx={{ mt: 3 }}>
          {Object.keys(correctionData).map(field => {
            const error = currentItem.validation.errors.find(e => e.field === field)
            const hasSuggestion = error?.suggestedValue !== undefined

            return (
              <Box key={field} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label={field}
                  value={correctionData[field] || ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  error={!!error}
                  helperText={error?.message}
                  sx={{ mb: 1 }}
                />
                
                {hasSuggestion && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`Sugestão: ${error.suggestedValue}`}
                      color="primary"
                      size="small"
                      icon={<AutoFixHighIcon />}
                      onClick={() => handleApplySuggestion(field, error.suggestedValue)}
                      clickable
                    />
                    <Typography variant="caption" color="text.secondary">
                      {error.suggestion}
                    </Typography>
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleSaveCorrection}
            startIcon={<CheckCircleIcon />}
          >
            Salvar Correção
          </Button>
          <Button
            variant="outlined"
            onClick={handleSkipItem}
          >
            Pular Item
          </Button>
        </Box>
      </Box>
    )
  }

  const renderSummary = () => {
    const totalItems = invalidItems.length + duplicateItems.length
    const correctedCount = correctedItems.length
    const remainingCount = invalidItems.length - correctedCount

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Resumo da Correção
        </Typography>

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Quantidade</TableCell>
                <TableCell>Descrição</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Chip label="Corrigidos" color="success" size="small" />
                </TableCell>
                <TableCell>{correctedCount}</TableCell>
                <TableCell>Itens corrigidos com sucesso</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Chip label="Pendentes" color="warning" size="small" />
                </TableCell>
                <TableCell>{remainingCount}</TableCell>
                <TableCell>Itens que precisam de correção</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Chip label="Duplicatas" color="error" size="small" />
                </TableCell>
                <TableCell>{duplicateItems.length}</TableCell>
                <TableCell>Itens duplicados (serão ignorados)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {duplicateItems.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Itens Duplicados (serão ignorados):
            </Typography>
            {duplicateItems.slice(0, 5).map((item, index) => (
              <Chip
                key={index}
                label={`Linha ${item.originalRow}`}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
            {duplicateItems.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                ... e mais {duplicateItems.length - 5} itens
              </Typography>
            )}
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHighIcon color="primary" />
          <Typography variant="h6">
            Correção de Dados - {entityType}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel>Revisar Inconsistências</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Foram encontradas inconsistências nos dados. Revise os erros encontrados:
              </Typography>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    Itens com Erros ({invalidItems.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {invalidItems.slice(0, 10).map((item, index) => (
                    <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="subtitle2">
                        Linha {item.originalRow}
                      </Typography>
                      {renderErrorDetails(item.validation.errors)}
                    </Box>
                  ))}
                  {invalidItems.length > 10 && (
                    <Typography variant="caption" color="text.secondary">
                      ... e mais {invalidItems.length - 10} itens
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {duplicateItems.length > 0 && (
                <Accordion sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      Itens Duplicados ({duplicateItems.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      Estes itens serão ignorados durante a importação.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={invalidItems.length === 0}
                >
                  Iniciar Correção
                </Button>
              </Box>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Corrigir Dados</StepLabel>
            <StepContent>
              {renderCorrectionForm()}
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Confirmar Importação</StepLabel>
            <StepContent>
              {renderSummary()}
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleConfirmImport}
                  startIcon={<CheckCircleIcon />}
                >
                  Confirmar Importação
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            Voltar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

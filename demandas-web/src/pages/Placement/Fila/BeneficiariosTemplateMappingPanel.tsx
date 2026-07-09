import React, { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TableChartIcon from '@mui/icons-material/TableChart'
import SyncIcon from '@mui/icons-material/Sync'
import HistoryIcon from '@mui/icons-material/History'
import type {
  BeneficiariosFieldHeaderMap,
  BeneficiariosSpreadsheetAudit,
  BeneficiarioUploadRow,
} from './placementBeneficiarios'
import { formatBeneficiariosSpreadsheetAuditMessage, spreadsheetAuditHasIssues } from './placementBeneficiarios'
import {
  formatBeneficiariosMappingSavedAt,
  type BeneficiariosMappingSnapshot,
} from './placementBeneficiariosMappingStore'

type Props = {
  audit: BeneficiariosSpreadsheetAudit
  sheetHeaders: string[]
  fieldHeaderMap: BeneficiariosFieldHeaderMap
  onFieldHeaderChange: (field: keyof BeneficiarioUploadRow, header: string | null) => void
  onApplyMapping: () => void
  applying?: boolean
  disabled?: boolean
  pendingImport?: boolean
  savedSnapshot?: BeneficiariosMappingSnapshot | null
  hasActiveSheet?: boolean
  onClearSavedMapping?: () => void
}

function statusLabel(row: BeneficiariosSpreadsheetAudit['columnMappings'][number]): string {
  if (row.status === 'ok' && row.manual) return 'Mapeada manualmente'
  if (row.status === 'ok') return 'Reconhecida'
  if (row.status === 'required_missing') return 'Essencial — ausente'
  return 'Ausente no arquivo'
}

function statusColor(
  status: BeneficiariosSpreadsheetAudit['columnMappings'][number]['status']
): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'ok') return 'success'
  if (status === 'required_missing') return 'error'
  return 'warning'
}

export function BeneficiariosTemplateMappingPanel({
  audit,
  sheetHeaders,
  fieldHeaderMap,
  onFieldHeaderChange,
  onApplyMapping,
  applying,
  disabled,
  pendingImport,
  savedSnapshot,
  hasActiveSheet = true,
  onClearSavedMapping,
}: Props) {
  const [open, setOpen] = useState(true)
  const hasIssues = spreadsheetAuditHasIssues(audit)
  const mappedCount = audit.columnMappings.filter((m) => m.uploadedHeader).length
  const missingRequired = audit.missingRequiredHeaders.length
  const readOnly = !hasActiveSheet
  const showingSavedHistory = readOnly && Boolean(savedSnapshot?.savedAt)

  return (
    <Alert
      severity={pendingImport ? 'info' : showingSavedHistory ? 'success' : hasIssues ? 'warning' : 'success'}
      icon={<TableChartIcon fontSize="inherit" />}
      sx={{ mb: 2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Mapeamento planilha → modelo
          </Typography>
          {showingSavedHistory && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75, mb: 0.25 }}>
              <Chip
                size="small"
                icon={<HistoryIcon sx={{ fontSize: 16 }} />}
                label={`Último import: ${formatBeneficiariosMappingSavedAt(savedSnapshot!.savedAt)}`}
                variant="outlined"
              />
              {savedSnapshot?.lastFileName && (
                <Chip size="small" label={savedSnapshot.lastFileName} variant="outlined" />
              )}
              {savedSnapshot?.lastImportedCount != null && (
                <Chip
                  size="small"
                  label={`${savedSnapshot.lastImportedCount} vida(s) importada(s)`}
                  variant="outlined"
                />
              )}
            </Stack>
          )}
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {pendingImport
              ? 'Selecione, para cada coluna do modelo, qual cabeçalho da sua planilha corresponde ao dado. Depois clique em «Importar com este mapeamento» para importar.'
              : showingSavedHistory
                ? 'Histórico do último mapeamento utilizado nesta cotação. No próximo upload, colunas com os mesmos cabeçalhos serão reaplicadas automaticamente.'
                : `${mappedCount} de ${audit.columnMappings.length} colunas do modelo estão mapeadas.`}
            {!pendingImport &&
              !showingSavedHistory &&
              (hasIssues
                ? ` ${formatBeneficiariosSpreadsheetAuditMessage(audit)}`
                : ' Estrutura compatível com o template.')}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Recolher' : 'Expandir'}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box
          sx={{
            mt: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <Table size="small" sx={{ '& td, & th': { py: 0.75, px: 1.5, fontSize: 12 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 700 }}>Coluna do modelo</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 90 }}>Obrigatória</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Coluna na sua planilha</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {audit.columnMappings.map((row) => (
                <TableRow key={row.templateLabel} hover>
                  <TableCell>{row.templateLabel}</TableCell>
                  <TableCell>{row.required ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth disabled={disabled || applying || readOnly}>
                      <Select
                        displayEmpty
                        value={fieldHeaderMap[row.field] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          onFieldHeaderChange(row.field, value === '' ? null : String(value))
                        }}
                        sx={{ fontSize: 12, bgcolor: 'background.paper' }}
                      >
                        <MenuItem value="">
                          <em>— Não mapear —</em>
                        </MenuItem>
                        {sheetHeaders.map((header) => (
                          <MenuItem key={header} value={header}>
                            {header}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusLabel(row)}
                      color={statusColor(row.status)}
                      variant={row.status === 'ok' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {audit.unrecognizedHeaders.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
              Colunas da planilha ainda sem uso no modelo
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {audit.unrecognizedHeaders.map((h) => (
                <Chip key={h} size="small" label={h} variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          {!readOnly && (
            <Button
              variant="contained"
              size="small"
              startIcon={applying ? undefined : <SyncIcon />}
              disabled={disabled || applying || mappedCount === 0 || missingRequired > 0}
              onClick={onApplyMapping}
            >
              {applying ? 'Aplicando…' : pendingImport ? 'Importar com este mapeamento' : 'Aplicar mapeamento'}
            </Button>
          )}
          {showingSavedHistory && onClearSavedMapping && (
            <Button
              variant="outlined"
              size="small"
              color="inherit"
              disabled={disabled || applying}
              onClick={onClearSavedMapping}
            >
              Limpar mapeamento salvo
            </Button>
          )}
          {!readOnly && missingRequired > 0 && (
            <Typography variant="caption" color="error" sx={{ alignSelf: 'center' }}>
              Mapeie as colunas essenciais antes de importar: {audit.missingRequiredHeaders.join(', ')}.
            </Typography>
          )}
        </Stack>
      </Collapse>
    </Alert>
  )
}

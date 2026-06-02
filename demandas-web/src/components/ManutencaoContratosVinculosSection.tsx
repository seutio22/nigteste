import React from 'react'
import type { AutocompleteRenderInputParams } from '@mui/material'
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import type { Operadora } from '../types/masterData'
import { fixEncoding } from '../utils/encodingFix'
import { VinculoValueChip } from './VinculoValueChip'
import {
  emptyContratoVinculoRow,
  parseContratosVinculos,
  type ContratoVinculoRow,
  type ManutencaoContratoVinculo,
} from '../utils/manutencaoContratos'

type ContratoOpt = {
  id: string
  codigo?: string | null
  numero?: string | null
  grupoEconomico?: string | null
}

const defaultField = { size: 'medium' as const, margin: 'none' as const, fullWidth: true, variant: 'outlined' as const }

type Props = {
  rows: ContratoVinculoRow[]
  onChange: (rows: ContratoVinculoRow[]) => void
  contratos: ContratoOpt[]
  operadoras: Operadora[]
  produtos: { id: string; nome: string }[]
  clienteSelected: boolean
  disabled?: boolean
  textFieldProps?: Partial<typeof defaultField>
}

function chipAutocompleteInput(
  params: AutocompleteRenderInputParams,
  opts: {
    selectedLabel: string
    onClear: () => void
    placeholder: string
    label?: string
    field: typeof defaultField
    disabled?: boolean
  }
) {
  const { selectedLabel, onClear, placeholder, label, field, disabled } = opts
  const hasChip = !!selectedLabel

  return (
    <TextField
      {...params}
      label={label}
      placeholder={hasChip ? undefined : placeholder}
      {...field}
      InputProps={{
        ...params.InputProps,
        startAdornment: hasChip ? (
          <>
            <VinculoValueChip label={selectedLabel} onDelete={onClear} disabled={disabled} />
            {params.InputProps.startAdornment}
          </>
        ) : (
          params.InputProps.startAdornment
        ),
      }}
      inputProps={{
        ...params.inputProps,
        value: hasChip ? '' : params.inputProps.value,
        style: hasChip
          ? {
              ...(params.inputProps.style as React.CSSProperties),
              opacity: 0,
              width: 4,
              minWidth: 4,
              padding: 0,
            }
          : params.inputProps.style,
      }}
    />
  )
}

export function ManutencaoContratosVinculosSection({
  rows,
  onChange,
  contratos,
  operadoras,
  produtos,
  clienteSelected,
  disabled,
  textFieldProps,
}: Props) {
  const field = { ...defaultField, ...textFieldProps }

  const patchRow = (rowId: string, part: Partial<ContratoVinculoRow>) => {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...part } : r)))
  }

  const addRow = () => onChange([...rows, emptyContratoVinculoRow()])

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) {
      onChange([emptyContratoVinculoRow()])
      return
    }
    onChange(rows.filter((r) => r.rowId !== rowId))
  }

  const replicateFirst = () => {
    const first = rows[0]
    if (!first?.contratoId) return
    onChange(
      rows.map((r, idx) =>
        idx === 0 ? r : { ...r, operadoraId: first.operadoraId, produtoId: first.produtoId }
      )
    )
  }

  const contratoLabel = (c: ContratoOpt) => fixEncoding(c.codigo || c.numero || c.id)

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
          Informe contrato, operadora e produto por linha (usado no e-mail de comunicação).
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          disabled={disabled || rows.length < 2 || !rows[0]?.contratoId}
          onClick={replicateFirst}
          sx={{ textTransform: 'none' }}
        >
          Replicar operadora/produto da 1ª linha
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          disabled={disabled || !clienteSelected}
          onClick={addRow}
          sx={{ textTransform: 'none' }}
        >
          Adicionar contrato
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="medium">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8125rem' }}>Contrato</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8125rem' }}>Operadora</TableCell>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8125rem' }}>Produto</TableCell>
              <TableCell width={52} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const contratoOpt = contratos.find((c) => c.id === row.contratoId) ?? null
              const opOpt = operadoras.find((o) => o.id === row.operadoraId) ?? null
              const produtoNome = row.produtoId
                ? fixEncoding(produtos.find((p) => p.id === row.produtoId)?.nome || '')
                : ''

              return (
                <TableRow key={row.rowId} hover>
                  <TableCell sx={{ minWidth: 200, verticalAlign: 'middle', py: 1.5 }}>
                    <Autocomplete
                      disabled={disabled || !clienteSelected}
                      options={contratos}
                      getOptionLabel={contratoLabel}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      value={contratoOpt}
                      disableClearable={!!contratoOpt}
                      onChange={(_, v) => patchRow(row.rowId, { contratoId: v?.id ?? '' })}
                      noOptionsText={clienteSelected ? 'Nenhum contrato encontrado' : 'Selecione o cliente primeiro'}
                      renderInput={(params) =>
                        chipAutocompleteInput(params, {
                          selectedLabel: contratoOpt ? contratoLabel(contratoOpt) : '',
                          onClear: () => patchRow(row.rowId, { contratoId: '' }),
                          placeholder: clienteSelected ? 'Digite para buscar...' : 'Selecione o cliente',
                          field,
                          disabled: disabled || !clienteSelected,
                        })
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                          <Typography variant="body1" fontWeight="medium">
                            {contratoLabel(option)}
                          </Typography>
                          {option.grupoEconomico && (
                            <Typography variant="caption" color="text.secondary">
                              Grupo: {fixEncoding(option.grupoEconomico)}
                            </Typography>
                          )}
                        </Box>
                      )}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 180, verticalAlign: 'middle', py: 1.5 }}>
                    <Autocomplete
                      disabled={disabled}
                      options={operadoras}
                      getOptionLabel={(o) => fixEncoding(o.nome || '')}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      value={opOpt}
                      disableClearable={!!opOpt}
                      onChange={(_, v) => patchRow(row.rowId, { operadoraId: v?.id ?? '' })}
                      noOptionsText="Nenhuma operadora encontrada"
                      renderInput={(params) =>
                        chipAutocompleteInput(params, {
                          selectedLabel: opOpt ? fixEncoding(opOpt.nome || '') : '',
                          onClear: () => patchRow(row.rowId, { operadoraId: '' }),
                          placeholder: 'Digite para buscar...',
                          field,
                          disabled,
                        })
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                          <Typography variant="body1" fontWeight="medium">
                            {fixEncoding(option.nome)}
                          </Typography>
                        </Box>
                      )}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 160, verticalAlign: 'middle', py: 1.5 }}>
                    <TextField
                      select
                      disabled={disabled}
                      value={row.produtoId || ''}
                      onChange={(e) => patchRow(row.rowId, { produtoId: e.target.value })}
                      {...field}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) => {
                          if (!selected) {
                            return (
                              <Typography variant="body2" color="text.secondary" sx={{ py: 0.25 }}>
                                Selecione...
                              </Typography>
                            )
                          }
                          return (
                            <VinculoValueChip
                              label={produtoNome}
                              onDelete={() => patchRow(row.rowId, { produtoId: '' })}
                              disabled={disabled}
                            />
                          )
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Selecione...</em>
                      </MenuItem>
                      {produtos.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {fixEncoding(p.nome)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'middle', py: 1.5 }}>
                    <Tooltip title="Remover linha">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={disabled}
                          onClick={() => removeRow(row.rowId)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

type ResumoProps = {
  item: {
    contratosVinculos?: unknown
    contratosIds?: unknown
    contratoId?: string | null
    operadoraId?: string | null
    produtoId?: string | null
  }
  contratos: ContratoOpt[]
  operadoras: { id: string; nome: string }[]
  produtos: { id: string; nome: string }[]
}

export function ManutencaoContratosVinculosResumo({ item, contratos, operadoras, produtos }: ResumoProps) {
  const vinculos = parseContratosVinculos(item.contratosVinculos, {
    contratosIds: item.contratosIds,
    contratoId: item.contratoId,
    operadoraId: item.operadoraId,
    produtoId: item.produtoId,
  })

  if (!vinculos.length) return <span>—</span>

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}>
      {vinculos.map((v) => (
        <VinculoResumoChips
          key={v.contratoId + (v.operadoraId || '') + (v.produtoId || '')}
          v={v}
          contratos={contratos}
          operadoras={operadoras}
          produtos={produtos}
        />
      ))}
    </Box>
  )
}

function VinculoResumoChips({
  v,
  contratos,
  operadoras,
  produtos,
}: {
  v: ManutencaoContratoVinculo
  contratos: ContratoOpt[]
  operadoras: { id: string; nome: string }[]
  produtos: { id: string; nome: string }[]
}) {
  const c = contratos.find((x) => x.id === v.contratoId)
  const op = operadoras.find((o) => o.id === v.operadoraId)
  const pr = produtos.find((p) => p.id === v.produtoId)
  const chips: string[] = []
  chips.push(fixEncoding(c?.codigo || c?.numero || v.contratoId))
  if (op?.nome) chips.push(fixEncoding(op.nome))
  if (pr?.nome) chips.push(fixEncoding(pr.nome))

  return (
    <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5 }}>
      {chips.map((label) => (
        <VinculoValueChip key={label} label={label} />
      ))}
    </Box>
  )
}

export {
  emptyContratoVinculoRow,
  newContratoVinculoRowId,
  vinculosToRows,
  rowsToVinculos,
  parseContratosVinculos,
} from '../utils/manutencaoContratos'

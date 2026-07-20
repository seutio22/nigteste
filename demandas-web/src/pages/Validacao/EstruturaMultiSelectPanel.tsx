import React from 'react'
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  ESTRUTURA_SEM_ERROS_CODE,
  type EstruturaOption,
  countEstruturaSelections,
  getEstruturaOptionLabel,
  getEstruturaQuantity,
  isEstruturaSelected,
  normalizeEstruturaArray,
  toggleEstruturaSelection,
  updateEstruturaQuantity,
} from './validacaoEstruturaOptions'

type Props = {
  title: string
  options: EstruturaOption[]
  value: string[]
  onChange: (next: string[]) => void
}

export function EstruturaMultiSelectPanel({ title, options, value, onChange }: Props) {
  const normalizedValue = normalizeEstruturaArray(value, options)
  const selectedCount = countEstruturaSelections(normalizedValue, options)
  const selectedEntries = options.filter(
    (option) => option.code !== ESTRUTURA_SEM_ERROS_CODE && isEstruturaSelected(normalizedValue, option.code, options)
  )

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Selecione os itens à esquerda e informe a quantidade de cada um na tabela ao lado.
        {selectedCount > 0 ? ` ${selectedCount} item(ns) selecionado(s).` : ''}
      </Typography>

      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid item xs={12} md={5}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              maxHeight: 320,
              overflowY: 'auto',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {options.map((option) => (
                <FormControlLabel
                  key={option.code}
                  control={
                    <Checkbox
                      size="small"
                      checked={isEstruturaSelected(normalizedValue, option.code, options)}
                      onChange={(e) =>
                        onChange(toggleEstruturaSelection(normalizedValue, option.code, e.target.checked, options))
                      }
                      sx={{ p: 0.75 }}
                    />
                  }
                  label={getEstruturaOptionLabel(option)}
                  sx={{
                    alignItems: 'center',
                    mx: 0,
                    px: 0.5,
                    py: 0.35,
                    minHeight: 36,
                    gap: 0.25,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.875rem',
                      lineHeight: 1.45,
                    },
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }} align="right">
                    Quantidade
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum item selecionado para quantificar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedEntries.map((option) => (
                    <TableRow key={option.code}>
                      <TableCell>{option.label}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          inputProps={{ min: 1, step: 1 }}
                          value={getEstruturaQuantity(normalizedValue, option.code, options)}
                          onChange={(e) => {
                            const qty = Number(e.target.value)
                            onChange(
                              updateEstruturaQuantity(
                                normalizedValue,
                                option.code,
                                Number.isFinite(qty) ? qty : 1,
                                options
                              )
                            )
                          }}
                          sx={{ width: 96 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

import React, { useMemo } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
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
import type { Operadora } from '../../../types/masterData'
import type { MapeamentoItemForm, PlanoCoberturaForm } from './placementCotacaoDetalhes'
import {
  EMPTY_REEMBOLSO_POR_PLANO,
  formatReembolsoMoedaDisplay,
  getReembolsoCell,
  newReembolsoProcedimentoId,
  pruneReembolsoPrazos,
  pruneReembolsoValores,
  REEMBOLSO_PROCEDIMENTOS_FIXOS,
  sanitizeReembolsoDias,
  sanitizeReembolsoMoedaInput,
  setReembolsoCell,
  emptyReembolsoPrazosPlano,
  type ReembolsoPorPlano,
  type ReembolsoProcedimentoCustom,
} from './placementReembolso'
import { buildPlanoSelectOptions } from './UpgradeDowngradeFields'

const HEADER_BG = '#1e3a5f'
const MAX_PROCEDIMENTOS_CUSTOM = 12

type Props = {
  planos: PlanoCoberturaForm[]
  itens: MapeamentoItemForm[]
  operadoras: Operadora[]
  value: ReembolsoPorPlano
  disabled?: boolean
  onChange: (next: ReembolsoPorPlano) => void
}

function ReembolsoMoedaField({
  value,
  disabled,
  onChange,
  'aria-label': ariaLabel,
}: {
  value: string
  disabled?: boolean
  onChange: (v: string) => void
  'aria-label'?: string
}) {
  return (
    <TextField
      size="small"
      fullWidth
      disabled={disabled}
      value={value}
      onBlur={() => {
        const formatted = formatReembolsoMoedaDisplay(value)
        if (formatted !== value) onChange(formatted)
      }}
      onChange={(e) => onChange(sanitizeReembolsoMoedaInput(e.target.value))}
      placeholder="0,00"
      inputProps={{
        style: { textAlign: 'center', fontSize: '0.8rem' },
        'aria-label': ariaLabel,
        inputMode: 'decimal',
      }}
    />
  )
}

export function ReembolsoPlanoSection({
  planos,
  itens,
  operadoras,
  value,
  disabled,
  onChange,
}: Props) {
  const options = useMemo(
    () => buildPlanoSelectOptions(planos, itens, operadoras),
    [planos, itens, operadoras]
  )

  const validIds = useMemo(() => new Set(planos.map((p) => p.id)), [planos])

  const synced = useMemo(() => {
    const planosIds = value.planosIds.filter((id) => validIds.has(id))
    const custom = value.procedimentosCustomizados.filter((p) => p.id)
    const valores = pruneReembolsoValores(value.valores, validIds, custom)
    const prazosPorPlano = pruneReembolsoPrazos(value.prazosPorPlano, new Set(planosIds))
    if (
      planosIds.length === value.planosIds.length &&
      custom.length === value.procedimentosCustomizados.length
    ) {
      return { ...value, planosIds, procedimentosCustomizados: custom, valores, prazosPorPlano }
    }
    return { ...value, planosIds, procedimentosCustomizados: custom, valores, prazosPorPlano }
  }, [value, validIds])

  React.useEffect(() => {
    if (synced.planosIds.length !== value.planosIds.length) onChange(synced)
  }, [synced.planosIds.length, value.planosIds.length, synced, onChange])

  const patch = (part: Partial<ReembolsoPorPlano>) => onChange({ ...synced, ...part })

  const selectedOptions = options.filter((o) => synced.planosIds.includes(o.id))

  const columnMeta = useMemo(() => {
    return synced.planosIds.map((id, idx) => {
      const opt = options.find((o) => o.id === id)
      return {
        id,
        header: `PLANO ${String(idx + 1).padStart(2, '0')}`,
        subheader: opt?.label ?? id,
        group: opt?.groupLabel ?? '',
      }
    })
  }, [synced.planosIds, options])

  const tableRows = useMemo(
    () => [
      ...REEMBOLSO_PROCEDIMENTOS_FIXOS.map((p) => ({
        key: p.key,
        label: p.label,
        custom: false as const,
      })),
      ...synced.procedimentosCustomizados.map((p) => ({
        key: p.id,
        label: p.nome,
        custom: true as const,
        proc: p,
      })),
    ],
    [synced.procedimentosCustomizados]
  )

  const addProcedimento = () => {
    if (synced.procedimentosCustomizados.length >= MAX_PROCEDIMENTOS_CUSTOM) return
    const id = newReembolsoProcedimentoId()
    const nextCustom: ReembolsoProcedimentoCustom[] = [
      ...synced.procedimentosCustomizados,
      { id, nome: '' },
    ]
    patch({
      procedimentosCustomizados: nextCustom,
      valores: { ...synced.valores, [id]: {} },
    })
  }

  const updateProcedimentoNome = (id: string, nome: string) => {
    patch({
      procedimentosCustomizados: synced.procedimentosCustomizados.map((p) =>
        p.id === id ? { ...p, nome } : p
      ),
    })
  }

  const removeProcedimento = (id: string) => {
    const nextCustom = synced.procedimentosCustomizados.filter((p) => p.id !== id)
    const { [id]: _removed, ...restValores } = synced.valores
    patch({
      procedimentosCustomizados: nextCustom,
      valores: pruneReembolsoValores(restValores, validIds, nextCustom),
    })
  }

  const patchPrazo = (
    planoId: string,
    field: 'consultaDias' | 'procedimentosDias',
    raw: string
  ) => {
    const cur = synced.prazosPorPlano[planoId] ?? emptyReembolsoPrazosPlano()
    patch({
      prazosPorPlano: {
        ...synced.prazosPorPlano,
        [planoId]: { ...cur, [field]: sanitizeReembolsoDias(raw) },
      },
    })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
        Informar reembolso atual
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Será necessário equiparar?
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }} disabled={disabled}>
          <TextField
            select
            size="small"
            value={synced.necessitaEquiparar}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value as ReembolsoPorPlano['necessitaEquiparar']
              patch({
                necessitaEquiparar: next,
                ...(next !== 'sim' ? { detalheEquiparacao: '' } : {}),
              })
            }}
            label="Equiparar"
          >
            <MenuItem value="">Selecione</MenuItem>
            <MenuItem value="sim">Sim</MenuItem>
            <MenuItem value="nao">Não</MenuItem>
          </TextField>
        </FormControl>
      </Box>

      {synced.necessitaEquiparar === 'sim' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Detalhar quais planos e procedimentos necessitam de equiparação.
        </Alert>
      )}

      {synced.necessitaEquiparar === 'sim' && (
        <TextField
          label="Detalhe da equiparação (planos e procedimentos)"
          fullWidth
          multiline
          minRows={2}
          size="small"
          sx={{ mb: 2 }}
          value={synced.detalheEquiparacao}
          disabled={disabled}
          onChange={(e) => patch({ detalheEquiparacao: e.target.value })}
          placeholder="Ex.: equiparar consultas e exames simples nos planos X e Y..."
        />
      )}

      <Autocomplete
        multiple
        disabled={disabled || options.length === 0}
        options={options}
        groupBy={(opt) => opt.groupLabel}
        getOptionLabel={(opt) => opt.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={selectedOptions}
        onChange={(_, newValue) => {
          const ids = newValue.map((v) => v.id)
          const idSet = new Set(ids)
          const valores = pruneReembolsoValores(synced.valores, idSet, synced.procedimentosCustomizados)
          const prazosPorPlano = pruneReembolsoPrazos(synced.prazosPorPlano, idSet)
          patch({ planosIds: ids, valores, prazosPorPlano })
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Planos na tabela de reembolso"
            placeholder={
              options.length ? 'Selecione os planos (produto · fornecedor)' : 'Cadastre planos acima'
            }
          />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((opt, index) => (
            <Chip
              {...getTagProps({ index })}
              key={opt.id}
              size="small"
              label={`${opt.groupLabel}: ${opt.label}`}
            />
          ))
        }
        sx={{ mb: 2 }}
      />

      {columnMeta.length > 0 ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Valores de reembolso por procedimento
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={
                disabled || synced.procedimentosCustomizados.length >= MAX_PROCEDIMENTOS_CUSTOM
              }
              onClick={addProcedimento}
            >
              Adicionar procedimento
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      bgcolor: HEADER_BG,
                      color: '#fff',
                      fontWeight: 700,
                      minWidth: 240,
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                    }}
                  >
                    PROCEDIMENTOS
                  </TableCell>
                  {columnMeta.map((col) => (
                    <TableCell
                      key={col.id}
                      align="center"
                      sx={{
                        bgcolor: HEADER_BG,
                        color: '#fff',
                        minWidth: 130,
                        verticalAlign: 'bottom',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {col.header}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', opacity: 0.9, lineHeight: 1.2 }}
                      >
                        {col.subheader}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', opacity: 0.75, fontSize: '0.65rem' }}
                      >
                        {col.group}
                      </Typography>
                    </TableCell>
                  ))}
                  <TableCell sx={{ bgcolor: HEADER_BG, width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row, rowIdx) => (
                  <TableRow
                    key={row.key}
                    sx={{ bgcolor: rowIdx % 2 === 0 ? 'grey.100' : 'background.paper' }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: row.custom ? 400 : 600,
                        fontSize: '0.75rem',
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        bgcolor: rowIdx % 2 === 0 ? 'grey.100' : 'background.paper',
                        p: row.custom ? 0.5 : 1,
                      }}
                    >
                      {row.custom ? (
                        <TextField
                          size="small"
                          fullWidth
                          disabled={disabled}
                          value={row.proc.nome}
                          onChange={(e) => updateProcedimentoNome(row.proc.id, e.target.value)}
                          placeholder="Nome do procedimento"
                          inputProps={{ style: { fontSize: '0.75rem', fontWeight: 600 } }}
                        />
                      ) : (
                        row.label
                      )}
                    </TableCell>
                    {columnMeta.map((col) => (
                      <TableCell key={col.id} align="center" sx={{ p: 0.5, verticalAlign: 'top' }}>
                        <ReembolsoMoedaField
                          disabled={disabled}
                          value={getReembolsoCell(synced.valores, row.key, col.id)}
                          onChange={(v) =>
                            patch({
                              valores: setReembolsoCell(synced.valores, row.key, col.id, v),
                            })
                          }
                          aria-label={`${row.custom ? row.proc.nome || 'Procedimento' : row.label} ${col.header}`}
                        />
                      </TableCell>
                    ))}
                    <TableCell sx={{ p: 0.25 }}>
                      {row.custom && (
                        <Tooltip title="Remover procedimento">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={disabled}
                              onClick={() => removeProcedimento(row.proc.id)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Prazo de pagamento do reembolso (em dias)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Prazo para consultas e para demais procedimentos, por plano selecionado.
            </Typography>
            <Grid container spacing={2}>
              {columnMeta.map((col) => {
                const prazo = synced.prazosPorPlano[col.id] ?? emptyReembolsoPrazosPlano()
                return (
                  <Grid item xs={12} md={6} lg={4} key={col.id}>
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                        {col.header} — {col.subheader}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        {col.group}
                      </Typography>
                      <TextField
                        label="Prazo reemb. consulta (dias)"
                        size="small"
                        fullWidth
                        disabled={disabled}
                        value={prazo.consultaDias}
                        onChange={(e) => patchPrazo(col.id, 'consultaDias', e.target.value)}
                        inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        label="Prazo reemb. procedimentos (dias)"
                        size="small"
                        fullWidth
                        disabled={disabled}
                        value={prazo.procedimentosDias}
                        onChange={(e) => patchPrazo(col.id, 'procedimentosDias', e.target.value)}
                        inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                      />
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Paper>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Selecione ao menos um plano para exibir a tabela de valores e os prazos de reembolso.
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
        Valores e prazos são opcionais. Use vírgula nos valores monetários (ex.: 150,00 ou
        1.234,56).
      </Typography>
    </Paper>
  )
}

export { EMPTY_REEMBOLSO_POR_PLANO }

import React, { useMemo } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { Operadora } from '../../../types/masterData'
import type { MapeamentoItemForm, PlanoCoberturaForm } from './placementCotacaoDetalhes'
import {
  EMPTY_COBERTURAS_ESPECIAIS,
  newCoberturaEspecialId,
  pruneCoberturasEspeciaisItens,
  type CoberturaEspecialItem,
  type CoberturasEspeciais,
} from './placementCoberturasEspeciais'
import { buildPlanoSelectOptions, type SimNaoChoice } from './UpgradeDowngradeFields'

const MAX_CUSTOM = 15

type Props = {
  planos: PlanoCoberturaForm[]
  itens: MapeamentoItemForm[]
  operadoras: Operadora[]
  value: CoberturasEspeciais
  disabled?: boolean
  onChange: (next: CoberturasEspeciais) => void
}

function CoberturaEspecialRow({
  item,
  options,
  disabled,
  onChange,
  onRemove,
}: {
  item: CoberturaEspecialItem
  options: ReturnType<typeof buildPlanoSelectOptions>
  disabled?: boolean
  onChange: (next: CoberturaEspecialItem) => void
  onRemove?: () => void
}) {
  const selected = options.filter((o) => item.planosIds.includes(o.id))
  const isCustom = !item.catalogKey
  const detalheFieldLabel =
    item.detalheLabel.trim() || 'Informações adicionais (opcional)'

  const setPossui = (possui: SimNaoChoice) => {
    onChange({
      ...item,
      possui,
      ...(possui !== 'sim' ? { planosIds: [], detalhe: '' } : {}),
    })
  }

  return (
    <Box sx={{ py: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          {isCustom ? (
            <TextField
              label="Cobertura"
              size="small"
              fullWidth
              disabled={disabled}
              value={item.titulo}
              onChange={(e) => onChange({ ...item, titulo: e.target.value })}
              sx={{ mb: 1 }}
            />
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.titulo}
            </Typography>
          )}
          {!isCustom && item.detalheLabel && (
            <Typography variant="caption" color="text.secondary" display="block">
              {item.detalheLabel}
            </Typography>
          )}
          {isCustom && (
            <TextField
              label="Pergunta ao marcar Sim"
              size="small"
              fullWidth
              disabled={disabled}
              value={item.detalheLabel}
              onChange={(e) => onChange({ ...item, detalheLabel: e.target.value })}
              placeholder="Ex.: Qual período? / Especificar..."
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        {onRemove && (
          <Tooltip title="Remover cobertura">
            <span>
              <IconButton size="small" color="error" disabled={disabled} onClick={onRemove}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      <RadioGroup
        row
        value={item.possui}
        onChange={(e) => setPossui(e.target.value as SimNaoChoice)}
        sx={{ mt: 1 }}
      >
        <FormControlLabel
          value="sim"
          control={<Radio size="small" disabled={disabled} />}
          label="Sim"
        />
        <FormControlLabel
          value="nao"
          control={<Radio size="small" disabled={disabled} />}
          label="Não"
        />
      </RadioGroup>

      <Collapse in={item.possui === 'sim'}>
        <Box sx={{ mt: 1.5, pl: { xs: 0, sm: 1 }, borderLeft: { sm: '3px solid' }, borderColor: 'primary.light' }}>
          <Autocomplete
            multiple
            disabled={disabled || options.length === 0}
            options={options}
            groupBy={(opt) => opt.groupLabel}
            getOptionLabel={(opt) => opt.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selected}
            onChange={(_, newValue) =>
              onChange({ ...item, planosIds: newValue.map((v) => v.id) })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Planos vinculados"
                placeholder={
                  options.length ? 'Selecione os planos' : 'Cadastre planos acima primeiro'
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
          />
          <TextField
            label={detalheFieldLabel}
            fullWidth
            multiline
            minRows={2}
            size="small"
            sx={{ mt: 1.5 }}
            disabled={disabled}
            value={item.detalhe}
            onChange={(e) => onChange({ ...item, detalhe: e.target.value })}
          />
        </Box>
      </Collapse>
    </Box>
  )
}

export function CoberturasEspeciaisSection({
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

  const synced = useMemo(
    () => ({ itens: pruneCoberturasEspeciaisItens(value.itens, validIds) }),
    [value.itens, validIds]
  )

  const planosSig = synced.itens.map((i) => i.planosIds.join(',')).join('|')
  const valuePlanoSig = value.itens.map((i) => i.planosIds.join(',')).join('|')

  React.useEffect(() => {
    if (planosSig !== valuePlanoSig) onChange(synced)
  }, [planosSig, valuePlanoSig, synced, onChange])

  const patchItem = (id: string, next: CoberturaEspecialItem) => {
    onChange({
      itens: synced.itens.map((i) => (i.id === id ? next : i)),
    })
  }

  const catalogItens = synced.itens.filter((i) => i.catalogKey)
  const customItens = synced.itens.filter((i) => !i.catalogKey)
  const customCount = customItens.length

  const addCustom = () => {
    if (customCount >= MAX_CUSTOM) return
    onChange({
      itens: [
        ...synced.itens,
        {
          id: newCoberturaEspecialId(),
          catalogKey: null,
          titulo: '',
          detalheLabel: '',
          possui: '',
          planosIds: [],
          detalhe: '',
        },
      ],
    })
  }

  const removeCustom = (id: string) => {
    onChange({ itens: synced.itens.filter((i) => i.id !== id) })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Coberturas especiais
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={disabled || customCount >= MAX_CUSTOM}
          onClick={addCustom}
        >
          Adicionar cobertura
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Para cada item, informe Sim ou Não. Se Sim, vincule os planos e responda à pergunta
        complementar.
      </Typography>

      {catalogItens.map((item, idx) => (
        <React.Fragment key={item.id}>
          {idx > 0 && <Divider />}
          <CoberturaEspecialRow
            item={item}
            options={options}
            disabled={disabled}
            onChange={(next) => patchItem(item.id, next)}
          />
        </React.Fragment>
      ))}

      {customItens.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Coberturas adicionais
          </Typography>
          {customItens.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <Divider />}
              <CoberturaEspecialRow
                item={item}
                options={options}
                disabled={disabled}
                onChange={(next) => patchItem(item.id, next)}
                onRemove={() => removeCustom(item.id)}
              />
            </React.Fragment>
          ))}
        </>
      )}
    </Paper>
  )
}

export { EMPTY_COBERTURAS_ESPECIAIS }

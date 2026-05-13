import React from 'react'
import {
  Autocomplete,
  Grid,
  MenuItem,
  TextField,
  Chip,
  Stack,
  InputAdornment,
} from '@mui/material'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { COTACAO_STATUSES, formatCentsToBRL, parseBRLToCents } from './utils'

export interface CotacaoFormState {
  ticket: string
  status: string
  analistaId: string
  clienteId: string
  ramo: string
  operadorasIds: string[]
  vidas: string
  valorEstimadoBRL: string
  dataInicio: string
  dataLimite: string
  descricao: string
  observacoes: string
}

export const EMPTY_COTACAO_FORM: CotacaoFormState = {
  ticket: '',
  status: 'Aberta',
  analistaId: '',
  clienteId: '',
  ramo: '',
  operadorasIds: [],
  vidas: '',
  valorEstimadoBRL: '',
  dataInicio: new Date().toISOString().split('T')[0],
  dataLimite: '',
  descricao: '',
  observacoes: '',
}

interface Props {
  value: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  errors?: Partial<Record<keyof CotacaoFormState, string>>
  disabled?: boolean
}

export function CotacaoFormFields({ value, onChange, errors, disabled }: Props) {
  const { analistas, clientes, operadoras, produtos } = useMasterDataStore()

  function patch(part: Partial<CotacaoFormState>) {
    onChange({ ...value, ...part })
  }

  /**
   * Ramo / Produto é uma string livre no backend, mas o cadastro deve vir
   * da tabela de produtos (Dados → NIG → Produtos). Resolvemos o produto
   * selecionado pelo nome para preservar dados antigos / cotações importadas.
   */
  const selectedProduto = produtos.find((p) => p.nome === value.ramo) ?? null

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <TextField
          label="Nº da cotação (ticket)"
          fullWidth
          placeholder="Gerado automaticamente"
          value={value.ticket}
          disabled={disabled}
          onChange={(e) => patch({ ticket: e.target.value })}
          helperText="Deixe em branco para gerar automaticamente"
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          label="Status"
          select
          fullWidth
          required
          value={value.status}
          disabled={disabled}
          onChange={(e) => patch({ status: e.target.value })}
        >
          {COTACAO_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
        <Autocomplete
          options={analistas}
          getOptionLabel={(o) => o.nome}
          value={analistas.find((a) => a.id === value.analistaId) ?? null}
          disabled={disabled}
          onChange={(_, opt) => patch({ analistaId: opt?.id ?? '' })}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          renderInput={(params) => (
            <TextField {...params} label="Analista responsável" />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Autocomplete
          options={clientes}
          getOptionLabel={(o) => o.nome}
          value={clientes.find((c) => c.id === value.clienteId) ?? null}
          disabled={disabled}
          onChange={(_, opt) => patch({ clienteId: opt?.id ?? '' })}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Estipulante / Cliente"
              error={!!errors?.clienteId}
              helperText={errors?.clienteId}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Autocomplete
          options={produtos}
          getOptionLabel={(o) => (typeof o === 'string' ? o : o.nome)}
          value={selectedProduto}
          disabled={disabled}
          onChange={(_, opt) => patch({ ramo: opt && typeof opt !== 'string' ? opt.nome : '' })}
          isOptionEqualToValue={(opt, val) =>
            typeof opt !== 'string' && typeof val !== 'string' && opt.id === val.id
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Ramo / Produto"
              placeholder={produtos.length ? 'Selecione um produto' : 'Cadastre produtos em Dados → NIG → Produtos'}
              helperText={
                value.ramo && !selectedProduto
                  ? `Valor atual “${value.ramo}” não está mais no cadastro de Produtos`
                  : undefined
              }
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Autocomplete
          multiple
          options={operadoras}
          getOptionLabel={(o) => o.nome}
          value={operadoras.filter((o) => value.operadorasIds.includes(o.id))}
          disabled={disabled}
          onChange={(_, opts) => patch({ operadorasIds: opts.map((o) => o.id) })}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          renderTags={(values, getTagProps) =>
            values.map((opt, idx) => (
              <Chip
                size="small"
                label={opt.nome}
                {...getTagProps({ index: idx })}
                key={opt.id}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Operadoras cotadas"
              placeholder="Selecione uma ou mais operadoras"
            />
          )}
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <TextField
          label="Vidas / Itens"
          type="number"
          fullWidth
          inputProps={{ min: 0 }}
          value={value.vidas}
          disabled={disabled}
          onChange={(e) => patch({ vidas: e.target.value })}
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <TextField
          label="Valor estimado"
          fullWidth
          value={value.valorEstimadoBRL}
          disabled={disabled}
          onChange={(e) => patch({ valorEstimadoBRL: e.target.value })}
          onBlur={() => {
            const cents = parseBRLToCents(value.valorEstimadoBRL)
            if (cents != null) patch({ valorEstimadoBRL: formatCentsToBRL(cents) })
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
          }}
          placeholder="0,00"
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <TextField
          label="Data de início"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={value.dataInicio}
          disabled={disabled}
          onChange={(e) => patch({ dataInicio: e.target.value })}
        />
      </Grid>

      <Grid item xs={6} md={3}>
        <TextField
          label="Data limite"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={value.dataLimite}
          disabled={disabled}
          onChange={(e) => patch({ dataLimite: e.target.value })}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Descrição"
          fullWidth
          multiline
          minRows={2}
          value={value.descricao}
          disabled={disabled}
          onChange={(e) => patch({ descricao: e.target.value })}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Observações"
          fullWidth
          multiline
          minRows={2}
          value={value.observacoes}
          disabled={disabled}
          onChange={(e) => patch({ observacoes: e.target.value })}
        />
      </Grid>

      <Grid item xs={12}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {value.operadorasIds.map((id) => {
            const op = operadoras.find((o) => o.id === id)
            if (!op) return null
            return <Chip key={id} label={op.nome} size="small" variant="outlined" />
          })}
        </Stack>
      </Grid>
    </Grid>
  )
}

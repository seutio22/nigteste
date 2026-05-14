import React, { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BusinessIcon from '@mui/icons-material/Business'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import MapIcon from '@mui/icons-material/Map'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore } from '../../../store/placementStore'
import { ProspectFormModal } from '../ProspectFormModal'
import { COTACAO_STATUSES, formatCentsToBRL, parseBRLToCents } from './utils'

export type ClienteTipo = 'casa' | 'prospect'

export interface CotacaoFormState {
  ticket: string
  status: string
  analistaId: string
  /** Tipo de cliente: 'casa' = cliente da casa (FK Cliente) | 'prospect' = PlacementProspect. */
  clienteTipo: ClienteTipo
  /** Filtro auxiliar para encontrar o cliente da casa pelo grupo econômico (UI only). */
  grupoEconomico: string
  clienteId: string
  prospectId: string
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
  clienteTipo: 'casa',
  grupoEconomico: '',
  clienteId: '',
  prospectId: '',
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

/** Cabeçalho de cada módulo do formulário (Mapeamento, Detalhes, etc.). */
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <Stack direction="row" gap={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
    </Stack>
  )
}

export function CotacaoFormFields({ value, onChange, errors, disabled }: Props) {
  const { analistas, clientes, operadoras, produtos } = useMasterDataStore()
  const prospects = usePlacementStore((s) => s.prospects)
  const syncProspects = usePlacementStore((s) => s.syncProspects)
  const addProspect = usePlacementStore((s) => s.addProspect)

  const [openProspectModal, setOpenProspectModal] = useState(false)

  useEffect(() => {
    syncProspects()
  }, [syncProspects])

  function patch(part: Partial<CotacaoFormState>) {
    onChange({ ...value, ...part })
  }

  /** Lista de grupos econômicos extraída dos clientes da casa (somente para o tipo 'casa'). */
  const grupoOptions = useMemo(() => {
    const set = new Set<string>()
    clientes.forEach((c) => c.grupoEconomico && set.add(c.grupoEconomico))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [clientes])

  /** Clientes filtrados pelo grupo econômico escolhido (se houver). */
  const clientesFiltrados = useMemo(() => {
    if (!value.grupoEconomico) return clientes
    return clientes.filter((c) => c.grupoEconomico === value.grupoEconomico)
  }, [clientes, value.grupoEconomico])

  const selectedCliente = clientes.find((c) => c.id === value.clienteId) ?? null
  const selectedProspect = prospects.find((p) => p.id === value.prospectId) ?? null
  const selectedProduto = produtos.find((p) => p.nome === value.ramo) ?? null

  /** Auto-preenche o grupo econômico ao escolher um cliente, e limpa a outra ponta ao trocar de tipo. */
  function handleTipoChange(next: ClienteTipo) {
    if (next === value.clienteTipo) return
    patch({
      clienteTipo: next,
      clienteId: next === 'casa' ? value.clienteId : '',
      prospectId: next === 'prospect' ? value.prospectId : '',
      grupoEconomico: next === 'casa' ? value.grupoEconomico : '',
    })
  }

  async function handleCreateProspect(data: {
    razaoSocial: string
    cnpj: string
    grupoEconomico: string | null
  }) {
    const created = await addProspect(data)
    patch({ prospectId: created.id })
  }

  return (
    <Stack gap={3}>
      {/* ===================== Módulo 1: Mapeamento ===================== */}
      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<MapIcon fontSize="small" />}
            title="Mapeamento"
            description="Identifique a oportunidade: cliente da casa ou prospect (cliente novo)."
          />

          <ToggleButtonGroup
            exclusive
            value={value.clienteTipo}
            onChange={(_, next: ClienteTipo | null) => next && handleTipoChange(next)}
            disabled={disabled}
            sx={{ mb: 2 }}
            size="small"
            color="primary"
          >
            <ToggleButton value="casa">
              <BusinessIcon fontSize="small" sx={{ mr: 0.75 }} />
              Cliente da casa
            </ToggleButton>
            <ToggleButton value="prospect">
              <PersonSearchIcon fontSize="small" sx={{ mr: 0.75 }} />
              Prospect
            </ToggleButton>
          </ToggleButtonGroup>

          {value.clienteTipo === 'casa' ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={grupoOptions}
                  value={value.grupoEconomico || null}
                  disabled={disabled}
                  onChange={(_, val) => {
                    const grupo = String(val ?? '')
                    // Se o cliente atual não pertence ao novo grupo, limpa o cliente.
                    const stillValid =
                      !value.clienteId ||
                      clientes.find(
                        (c) => c.id === value.clienteId && (!grupo || c.grupoEconomico === grupo)
                      )
                    patch({
                      grupoEconomico: grupo,
                      clienteId: stillValid ? value.clienteId : '',
                    })
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Grupo econômico"
                      placeholder={
                        grupoOptions.length
                          ? 'Selecione um grupo (opcional)'
                          : 'Nenhum grupo cadastrado'
                      }
                      helperText="Filtra a lista de clientes abaixo."
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={clientesFiltrados}
                  getOptionLabel={(o) => o.nome}
                  value={selectedCliente}
                  disabled={disabled}
                  onChange={(_, opt) =>
                    patch({
                      clienteId: opt?.id ?? '',
                      grupoEconomico: opt?.grupoEconomico ?? value.grupoEconomico,
                    })
                  }
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cliente (estipulante)"
                      required
                      error={!!errors?.clienteId}
                      helperText={errors?.clienteId || 'Selecione um cliente da casa.'}
                    />
                  )}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Autocomplete
                  options={prospects}
                  getOptionLabel={(o) =>
                    o.grupoEconomico ? `${o.razaoSocial} · ${o.grupoEconomico}` : o.razaoSocial
                  }
                  value={selectedProspect}
                  disabled={disabled}
                  onChange={(_, opt) => patch({ prospectId: opt?.id ?? '' })}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Prospect"
                      required
                      placeholder={
                        prospects.length
                          ? 'Selecione um prospect cadastrado'
                          : 'Nenhum prospect — cadastre o primeiro pelo botão ao lado'
                      }
                      error={!!errors?.prospectId}
                      helperText={
                        errors?.prospectId ||
                        'Base alimentada em Dados → Placement → Prospect.'
                      }
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenProspectModal(true)}
                  disabled={disabled}
                  fullWidth
                  sx={{ height: 56 }}
                >
                  Novo prospect
                </Button>
              </Grid>

              {selectedProspect && (
                <Grid item xs={12}>
                  <Box
                    sx={{
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      p: 1.5,
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Prospect selecionado
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {selectedProspect.razaoSocial}
                    </Typography>
                    <Stack direction="row" gap={1} sx={{ mt: 0.5 }}>
                      {selectedProspect.grupoEconomico && (
                        <Chip
                          label={`Grupo: ${selectedProspect.grupoEconomico}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={`CNPJ: ${formatCnpj(selectedProspect.cnpj)}`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* ===================== Módulo 2: Detalhes da cotação ===================== */}
      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<Typography sx={{ fontWeight: 700 }}>i</Typography>}
            title="Detalhes da cotação"
            description="Informações básicas, ramo/produto, operadoras envolvidas e prazos."
          />

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
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
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
                options={produtos}
                getOptionLabel={(o) => (typeof o === 'string' ? o : o.nome)}
                value={selectedProduto}
                disabled={disabled}
                onChange={(_, opt) =>
                  patch({ ramo: opt && typeof opt !== 'string' ? opt.nome : '' })
                }
                isOptionEqualToValue={(opt, val) =>
                  typeof opt !== 'string' && typeof val !== 'string' && opt.id === val.id
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ramo / Produto"
                    placeholder={
                      produtos.length
                        ? 'Selecione um produto'
                        : 'Cadastre produtos em Dados → NIG → Produtos'
                    }
                    helperText={
                      value.ramo && !selectedProduto
                        ? `Valor atual “${value.ramo}” não está mais no cadastro de Produtos`
                        : undefined
                    }
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={operadoras}
                getOptionLabel={(o) => o.nome}
                value={operadoras.filter((o) => value.operadorasIds.includes(o.id))}
                disabled={disabled}
                onChange={(_, opts) =>
                  patch({ operadorasIds: opts.map((o) => o.id) })
                }
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
              <Divider sx={{ my: 0.5 }} />
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
          </Grid>
        </CardContent>
      </Card>

      <ProspectFormModal
        open={openProspectModal}
        onClose={() => setOpenProspectModal(false)}
        editingItem={null}
        onSubmit={handleCreateProspect}
      />
    </Stack>
  )
}

function formatCnpj(value: string): string {
  const d = (value || '').replace(/\D+/g, '').slice(0, 14)
  if (d.length !== 14) return value || ''
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

import React, { useMemo } from 'react'
import {
  Autocomplete,
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import type { Operadora } from '../../../types/masterData'
import type { MapeamentoItemForm, PlanoCoberturaForm } from './placementCotacaoDetalhes'

export type SimNaoChoice = '' | 'sim' | 'nao'

export type UpgradeDowngradePorPlano = {
  permiteUpgrade: SimNaoChoice
  planosIdsUpgrade: string[]
  regraUpgrade: string
  permiteDowngrade: SimNaoChoice
  planosIdsDowngrade: string[]
  regraDowngrade: string
}

export const EMPTY_UPGRADE_DOWNGRADE_POR_PLANO: UpgradeDowngradePorPlano = {
  permiteUpgrade: '',
  planosIdsUpgrade: [],
  regraUpgrade: '',
  permiteDowngrade: '',
  planosIdsDowngrade: [],
  regraDowngrade: '',
}

export type PlanoSelectOption = {
  id: string
  label: string
  groupLabel: string
}

export function buildPlanoSelectOptions(
  planos: PlanoCoberturaForm[],
  itens: MapeamentoItemForm[],
  operadoras: Operadora[]
): PlanoSelectOption[] {
  return planos.map((p) => {
    const item = itens.find((i) => i.id === p.itemRowId)
    const forn = operadoras.find((o) => o.id === item?.fornecedorId)?.nome ?? 'Fornecedor'
    const produto = item?.produtoNome ?? 'Produto'
    const nome = p.nomePlano.trim() || 'Plano sem nome'
    const acom = p.acomodacao ? ` · ${p.acomodacao}` : ''
    return {
      id: p.id,
      label: `${nome}${acom}`,
      groupLabel: `${produto} · ${forn}`,
    }
  })
}

function pruneIds(ids: string[], valid: Set<string>) {
  return ids.filter((id) => valid.has(id))
}

type Props = {
  planos: PlanoCoberturaForm[]
  itens: MapeamentoItemForm[]
  operadoras: Operadora[]
  value: UpgradeDowngradePorPlano
  disabled?: boolean
  onChange: (next: UpgradeDowngradePorPlano) => void
}

function BlocoPlanoSimNao({
  kind,
  titulo,
  pergunta,
  permite,
  planosIds,
  regra,
  options,
  disabled,
  onChange,
}: {
  kind: 'upgrade' | 'downgrade'
  titulo: string
  pergunta: string
  permite: SimNaoChoice
  planosIds: string[]
  regra: string
  options: PlanoSelectOption[]
  disabled?: boolean
  onChange: (part: Partial<UpgradeDowngradePorPlano>) => void
}) {
  const selected = options.filter((o) => planosIds.includes(o.id))

  const setPermite = (next: SimNaoChoice) => {
    if (kind === 'upgrade') {
      onChange({
        permiteUpgrade: next,
        ...(next !== 'sim' ? { planosIdsUpgrade: [], regraUpgrade: '' } : {}),
      })
    } else {
      onChange({
        permiteDowngrade: next,
        ...(next !== 'sim' ? { planosIdsDowngrade: [], regraDowngrade: '' } : {}),
      })
    }
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {titulo}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {pergunta}
      </Typography>
      <RadioGroup
        row
        value={permite}
        onChange={(e) => setPermite(e.target.value as SimNaoChoice)}
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

      {permite === 'sim' && (
        <Box sx={{ mt: 2 }}>
          <Autocomplete
            multiple
            disabled={disabled || options.length === 0}
            options={options}
            groupBy={(opt) => opt.groupLabel}
            getOptionLabel={(opt) => opt.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selected}
            onChange={(_, newValue) => {
              const ids = newValue.map((v) => v.id)
              onChange(
                kind === 'upgrade' ? { planosIdsUpgrade: ids } : { planosIdsDowngrade: ids }
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Planos com esta condição"
                placeholder={
                  options.length
                    ? 'Selecione um ou mais planos'
                    : 'Cadastre planos acima primeiro'
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
            label={`Regra de ${titulo.toLowerCase()}`}
            fullWidth
            multiline
            minRows={2}
            size="small"
            sx={{ mt: 1.5 }}
            value={regra}
            disabled={disabled}
            onChange={(e) =>
              onChange(
                kind === 'upgrade'
                  ? { regraUpgrade: e.target.value }
                  : { regraDowngrade: e.target.value }
              )
            }
            placeholder="Descreva a regra para os planos selecionados."
          />
        </Box>
      )}
    </Box>
  )
}

export function UpgradeDowngradeFields({
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
    const planosIdsUpgrade = pruneIds(value.planosIdsUpgrade, validIds)
    const planosIdsDowngrade = pruneIds(value.planosIdsDowngrade, validIds)
    if (
      planosIdsUpgrade.length === value.planosIdsUpgrade.length &&
      planosIdsDowngrade.length === value.planosIdsDowngrade.length
    ) {
      return value
    }
    return { ...value, planosIdsUpgrade, planosIdsDowngrade }
  }, [value, validIds])

  React.useEffect(() => {
    const pruned =
      synced.planosIdsUpgrade.length !== value.planosIdsUpgrade.length ||
      synced.planosIdsDowngrade.length !== value.planosIdsDowngrade.length
    if (pruned) onChange(synced)
  }, [
    synced.planosIdsUpgrade.length,
    synced.planosIdsDowngrade.length,
    value.planosIdsUpgrade.length,
    value.planosIdsDowngrade.length,
    synced,
    onChange,
  ])

  const patch = (part: Partial<UpgradeDowngradePorPlano>) =>
    onChange({ ...synced, ...part })

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Upgrade e downgrade por plano
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Indique se há upgrade ou downgrade e selecione em quais planos (por produto e fornecedor) a
        regra se aplica.
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <BlocoPlanoSimNao
            kind="upgrade"
            titulo="Upgrade"
            pergunta="Existe condição de upgrade para algum plano?"
            permite={synced.permiteUpgrade}
            planosIds={synced.planosIdsUpgrade}
            regra={synced.regraUpgrade}
            options={options}
            disabled={disabled}
            onChange={patch}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Divider sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }} />
          <BlocoPlanoSimNao
            kind="downgrade"
            titulo="Downgrade"
            pergunta="Existe condição de downgrade para algum plano?"
            permite={synced.permiteDowngrade}
            planosIds={synced.planosIdsDowngrade}
            regra={synced.regraDowngrade}
            options={options}
            disabled={disabled}
            onChange={patch}
          />
        </Grid>
      </Grid>
    </Paper>
  )
}

export function upgradeDowngradePorPlanoFromApi(
  raw: unknown,
  planos: PlanoCoberturaForm[],
  cotacaoLegado?: {
    permiteUpgrade?: unknown
    regraUpgrade?: unknown
    permiteDowngrade?: unknown
    regraDowngrade?: unknown
    permiteUpgradeDowngrade?: unknown
    regraUpgradeDowngrade?: unknown
  }
): UpgradeDowngradePorPlano {
  const base = { ...EMPTY_UPGRADE_DOWNGRADE_POR_PLANO }
  const valid = new Set(planos.map((p) => p.id))

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const pu = o.permiteUpgrade
    const pd = o.permiteDowngrade
    base.permiteUpgrade =
      pu === true || pu === 'sim' ? 'sim' : pu === false || pu === 'nao' ? 'nao' : ''
    base.permiteDowngrade =
      pd === true || pd === 'sim' ? 'sim' : pd === false || pd === 'nao' ? 'nao' : ''
    if (Array.isArray(o.planosIdsUpgrade)) {
      base.planosIdsUpgrade = o.planosIdsUpgrade.map(String).filter((id) => valid.has(id))
    }
    if (Array.isArray(o.planosIdsDowngrade)) {
      base.planosIdsDowngrade = o.planosIdsDowngrade.map(String).filter((id) => valid.has(id))
    }
    base.regraUpgrade = o.regraUpgrade != null ? String(o.regraUpgrade) : ''
    base.regraDowngrade = o.regraDowngrade != null ? String(o.regraDowngrade) : ''
    if (base.planosIdsUpgrade.length && !base.permiteUpgrade) base.permiteUpgrade = 'sim'
    if (base.planosIdsDowngrade.length && !base.permiteDowngrade) base.permiteDowngrade = 'sim'
    return base
  }

  if (cotacaoLegado) {
    const simNao = (v: unknown): SimNaoChoice =>
      v === true ? 'sim' : v === false ? 'nao' : ''
    let pu = simNao(cotacaoLegado.permiteUpgrade)
    let pd = simNao(cotacaoLegado.permiteDowngrade)
    let regraU = cotacaoLegado.regraUpgrade != null ? String(cotacaoLegado.regraUpgrade) : ''
    let regraD = cotacaoLegado.regraDowngrade != null ? String(cotacaoLegado.regraDowngrade) : ''
    if (!pu && !pd && cotacaoLegado.permiteUpgradeDowngrade !== undefined) {
      const leg = simNao(cotacaoLegado.permiteUpgradeDowngrade)
      pu = leg
      pd = leg
      const rl =
        cotacaoLegado.regraUpgradeDowngrade != null
          ? String(cotacaoLegado.regraUpgradeDowngrade)
          : ''
      if (!regraU) regraU = rl
      if (!regraD) regraD = rl
    }
    if (pu === 'sim' && planos.length) {
      base.permiteUpgrade = 'sim'
      base.planosIdsUpgrade = planos.map((p) => p.id)
      base.regraUpgrade = regraU
    } else if (pu === 'nao') base.permiteUpgrade = 'nao'
    if (pd === 'sim' && planos.length) {
      base.permiteDowngrade = 'sim'
      base.planosIdsDowngrade = planos.map((p) => p.id)
      base.regraDowngrade = regraD
    } else if (pd === 'nao') base.permiteDowngrade = 'nao'
  }

  return base
}

import React, { useMemo } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined'
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined'
import type {
  ComparativoContratoOrientacao,
  ComparativoEstudoConfig,
} from './placementAguardandoOperadora'
import {
  COMPARATIVO_LINHA_CHAVES,
  COMPARATIVO_LINHA_HINTS,
  COMPARATIVO_LINHA_LABELS,
  type ColunaVisibilidadeItem,
  type ComparativoLinhaChave,
} from './placementComparativoVisibilidade'

type Props = {
  colunas: ColunaVisibilidadeItem[]
  config: ComparativoEstudoConfig
  disabled?: boolean
  onChange: (next: ComparativoEstudoConfig) => void
  /** Exibe Horizontal/Vertical no topo do painel (modelo Contrato atual). */
  showOrientacao?: boolean
  orientacao?: ComparativoContratoOrientacao
  /** Oculta a seção de fornecedores/planos (ex.: Contrato atual sem mercado). */
  hideColunasSection?: boolean
}

function groupByOperadora(itens: ColunaVisibilidadeItem[]) {
  const map = new Map<string, ColunaVisibilidadeItem[]>()
  for (const c of itens) {
    const key = c.operadora.trim() || '—'
    const list = map.get(key) ?? []
    list.push(c)
    map.set(key, list)
  }
  return Array.from(map.entries())
}

export function ComparativoPropostasVisibilidadePanel({
  colunas,
  config,
  disabled,
  onChange,
  showOrientacao = false,
  orientacao = 'horizontal',
  hideColunasSection = false,
}: Props) {
  const ocultas = useMemo(() => new Set(config.colunasOcultas ?? []), [config.colunasOcultas])
  const linhasOcultas = useMemo(() => new Set(config.linhasOcultas ?? []), [config.linhasOcultas])

  const porGrupo = useMemo(() => {
    const map = new Map<string, ColunaVisibilidadeItem[]>()
    for (const c of colunas) {
      const list = map.get(c.grupo) ?? []
      list.push(c)
      map.set(c.grupo, list)
    }
    return Array.from(map.entries())
  }, [colunas])

  const visiveisCount = colunas.filter((c) => !ocultas.has(c.id)).length
  /** Linha de custo médio/total só existe no quadro quando faixas etárias estão ocultas. */
  const faixasEtariasVisiveis = !linhasOcultas.has('faixas_etarias')
  const modoSoFaixaEtaria = config.modoSlide === 'faixa_etaria'
  const custoPlanoDisponivel = !faixasEtariasVisiveis && !modoSoFaixaEtaria
  const custoPlanoHint = modoSoFaixaEtaria
    ? 'No modo Faixa etária o quadro usa custos por faixa / per capita.'
    : faixasEtariasVisiveis
      ? 'Desligue «Faixas etárias» acima para escolher custo médio ou total do plano.'
      : 'Custo médio = per capita; custo total = fatura daquele plano.'

  function toggleColuna(id: string) {
    const item = colunas.find((c) => c.id === id)
    const next = new Set(config.colunasOcultas ?? [])
    if (next.has(id)) {
      next.delete(id)
    } else {
      // Não permite ocultar o último plano do Contrato atual (referência do comparativo).
      if (item?.grupo === 'Contrato atual') {
        const atuais = colunas.filter((c) => c.grupo === 'Contrato atual')
        const aindaVisiveis = atuais.filter((c) => c.id !== id && !next.has(c.id))
        if (aindaVisiveis.length === 0) return
      }
      next.add(id)
    }
    onChange({ ...config, colunasOcultas: Array.from(next) })
  }

  function toggleFornecedor(itens: ColunaVisibilidadeItem[]) {
    const ids = itens.map((c) => c.id)
    const allHidden = ids.every((id) => ocultas.has(id))
    const next = new Set(config.colunasOcultas ?? [])
    if (allHidden) {
      ids.forEach((id) => next.delete(id))
    } else {
      const isAtual = itens.some((c) => c.grupo === 'Contrato atual')
      if (isAtual) {
        // Ocultar fornecedor atual inteiro remove a referência — bloqueia.
        return
      }
      ids.forEach((id) => next.add(id))
    }
    onChange({ ...config, colunasOcultas: Array.from(next) })
  }

  function toggleLinha(chave: ComparativoLinhaChave) {
    const next = new Set(config.linhasOcultas ?? [])
    if (next.has(chave)) next.delete(chave)
    else next.add(chave)
    onChange({ ...config, linhasOcultas: Array.from(next) as ComparativoLinhaChave[] })
  }

  function mostrarTodasColunas() {
    onChange({ ...config, colunasOcultas: [] })
  }

  function ocultarMercado() {
    const ids = colunas.filter((c) => c.grupo !== 'Contrato atual').map((c) => c.id)
    onChange({ ...config, colunasOcultas: ids })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
      {showOrientacao && (
        <>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}
          >
            Orientação
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, mb: 1 }}>
            Horizontal = planos lado a lado. Vertical = um bloco por plano, propostas naquele plano, scroll contínuo.
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            fullWidth
            value={orientacao}
            disabled={disabled}
            onChange={(_, v: ComparativoContratoOrientacao | null) => {
              if (!v) return
              onChange({
                ...config,
                contratoOrientacao: v,
              })
            }}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="horizontal" sx={{ textTransform: 'none', gap: 0.75 }}>
              <ViewWeekOutlinedIcon sx={{ fontSize: 18 }} />
              Horizontal
            </ToggleButton>
            <ToggleButton value="vertical" sx={{ textTransform: 'none', gap: 0.75 }}>
              <ViewAgendaOutlinedIcon sx={{ fontSize: 18 }} />
              Vertical
            </ToggleButton>
          </ToggleButtonGroup>
          <Divider sx={{ mb: 2 }} />
        </>
      )}

      {!hideColunasSection && colunas.length > 0 && (
        <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Itens visíveis no comparativo
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {visiveisCount} de {colunas.length} coluna(s) exibida(s)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" disabled={disabled} onClick={mostrarTodasColunas}>
            Mostrar todas
          </Button>
          <Button size="small" variant="outlined" disabled={disabled} onClick={ocultarMercado}>
            Só contrato atual
          </Button>
        </Stack>
      </Stack>

      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
        Fornecedores e planos
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, mb: 1 }}>
        Clique no fornecedor para ocultar/mostrar a coluna inteira; use o plano para ajuste fino.
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {porGrupo.map(([grupo, itens]) => (
          <Box key={grupo}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: 'primary.main' }}>
              {grupo}
            </Typography>
            <Stack spacing={1.25}>
              {groupByOperadora(itens).map(([operadora, planos]) => {
                const allHidden = planos.every((c) => ocultas.has(c.id))
                const someHidden = planos.some((c) => ocultas.has(c.id))
                return (
                  <Box key={`${grupo}-${operadora}`}>
                    <Chip
                      label={operadora}
                      size="small"
                      clickable={!disabled}
                      onClick={() => !disabled && toggleFornecedor(planos)}
                      icon={
                        allHidden ? (
                          <VisibilityOffOutlinedIcon />
                        ) : (
                          <BusinessOutlinedIcon />
                        )
                      }
                      color={allHidden ? 'default' : 'secondary'}
                      variant={allHidden ? 'outlined' : someHidden ? 'outlined' : 'filled'}
                      sx={{
                        mb: 0.75,
                        fontWeight: 800,
                        opacity: allHidden ? 0.65 : 1,
                        maxWidth: '100%',
                      }}
                    />
                    <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ pl: 0.5 }}>
                      {planos.map((c) => {
                        const hidden = ocultas.has(c.id)
                        return (
                          <Chip
                            key={c.id}
                            label={c.planoLabel || c.label}
                            size="small"
                            clickable={!disabled}
                            onClick={() => !disabled && toggleColuna(c.id)}
                            icon={hidden ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                            color={hidden ? 'default' : 'primary'}
                            variant={hidden ? 'outlined' : 'filled'}
                            sx={{ opacity: hidden ? 0.65 : 1 }}
                          />
                        )
                      })}
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 1.5 }} />
        </>
      )}

      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
        Linhas do quadro
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }} alignItems="center">
        {COMPARATIVO_LINHA_CHAVES.map((chave) => (
          <FormControlLabel
            key={chave}
            control={
              <Switch
                size="small"
                checked={!linhasOcultas.has(chave)}
                disabled={disabled}
                onChange={() => toggleLinha(chave)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: linhasOcultas.has(chave) ? 400 : 600 }}>
                  {COMPARATIVO_LINHA_LABELS[chave]}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 280 }}>
                  {COMPARATIVO_LINHA_HINTS[chave]}
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', mr: 1 }}
          />
        ))}
        <Box sx={{ minWidth: 220 }}>
          <FormControl size="small" fullWidth disabled={disabled || !custoPlanoDisponivel}>
            <InputLabel>Custo do plano</InputLabel>
            <Select
              label="Custo do plano"
              value={config.custoPlanoExibicao === 'total' ? 'total' : 'medio'}
              onChange={(e) =>
                onChange({
                  ...config,
                  custoPlanoExibicao: e.target.value === 'total' ? 'total' : 'medio',
                })
              }
            >
              <MenuItem value="medio">Custo médio</MenuItem>
              <MenuItem value="total">Custo total do plano</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, maxWidth: 280 }}>
            {custoPlanoHint}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
        Layout do quadro
      </Typography>
      <Stack sx={{ mt: 1 }} gap={0.5}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={config.vidasColunaUnica === true}
              disabled={disabled}
              onChange={(e) => onChange({ ...config, vidasColunaUnica: e.target.checked })}
            />
          }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Compactar vidas
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Remove a linha de vidas e mostra o número junto da linha de custo (menos linhas).
                </Typography>
              </Box>
            }
        />
        {config.modoSlide === 'planos_empilhados' && !hideColunasSection && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.omitirOperadoraNasSecoesEmpilhadas !== false}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...config, omitirOperadoraNasSecoesEmpilhadas: e.target.checked })
                }
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Não repetir nome do fornecedor
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Nos planos empilhados, logo/nome só na primeira seção.
                </Typography>
              </Box>
            }
          />
        )}
      </Stack>
    </Paper>
  )
}

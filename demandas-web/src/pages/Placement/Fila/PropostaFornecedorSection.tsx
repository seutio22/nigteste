import React from 'react'
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { CoparticipacaoSimNaoField } from './CoparticipacaoSimNaoField'
import { CoparticipacaoPlanoBlock } from './CoparticipacaoPlanoBlock'
import { ReembolsoPlanoBlock } from './ReembolsoPlanoBlock'
import { cloneCoparticipacao, emptyCoparticipacao } from './placementCoparticipacao'
import { cloneReembolsoPlanoDetalhe, emptyReembolsoPlanoDetalhe } from './placementReembolso'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  FAIXAS_ETARIAS,
  emptyCustosFaixa,
  emptyVidasFaixa,
} from './placementCotacaoDetalhes'
import { sanitizeSignedPercentInput } from './placementCotacaoFinanceiro'
import {
  parseVidasCount,
  sxCampoValorPorVidas,
  sxCardFaixaPorVidas,
} from './placementCampoValorVidasHighlight'
import {
  emptyPropostaPlanoLinha,
  ensureComparativosEstudos,
  type AguardandoOperadoraState,
  type PropostaCenarioVariante,
  type PropostaFornecedorState,
} from './placementAguardandoOperadora'
import {
  buildCenarioFromAbertura,
  cenarioPlanosAjustados,
  duplicateCenarioVariante,
  emptyCenarioResumoLinha,
  emptyCenarioVariante,
  ensurePropostaCenariosMercado,
  refreshCenarioPlanosFromAbertura,
} from './placementPropostaCenarioAtual'
import {
  alinharPropostaPorEquivalencia,
  labelPlanoReferencia,
  planosReferenciaAbertura,
  propostaPatchFromReferencia,
} from './placementPropostaEquivalencia'
import { formatCentsToBRL, parseBRLToCents } from './utils'
import type { Operadora } from '../../../types/masterData'
import { PlacementDraftTextField } from './PlacementDraftTextField'

type Props = {
  fornecedorNome: string
  proposta: PropostaFornecedorState
  form: CotacaoFormState
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
  isFornecedorAtual?: boolean
  disabled?: boolean
  onChange: (
    next:
      | PropostaFornecedorState
      | ((prev: PropostaFornecedorState) => PropostaFornecedorState)
  ) => void
}

function totalMensalPreview(planos: PropostaFornecedorState['planos']): string {
  let total = 0
  let any = false
  for (const p of planos) {
    if (p.tipoCusto === 'per_capita') {
      const v = Number(p.numeroVidas) || 0
      const unit = parseBRLToCents(p.custoPerCapitaBRL)
      if (v > 0 && unit != null) {
        total += unit * v
        any = true
      }
    } else {
      for (const fx of FAIXAS_ETARIAS) {
        const v = Number(p.vidasFaixa[fx.key]) || 0
        const unit = parseBRLToCents(p.custosFaixa[fx.key])
        if (v > 0 && unit != null) {
          total += unit * v
          any = true
        }
      }
    }
  }
  return any ? formatCentsToBRL(total) : '—'
}

const CenarioAtualEditor = React.memo(function CenarioAtualEditor({
  cenarios,
  form,
  fornecedorNome,
  operadoras,
  operadorasById,
  disabled,
  onChange,
}: {
  cenarios: PropostaCenarioVariante[]
  form: CotacaoFormState
  fornecedorNome: string
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
  disabled?: boolean
  onChange: (next: PropostaCenarioVariante[]) => void
}) {
  function patchCenario(index: number, part: Partial<PropostaCenarioVariante>) {
    onChange(cenarios.map((c, i) => (i === index ? { ...c, ...part } : c)))
  }

  function patchResumo(cIdx: number, rIdx: number, part: Partial<PropostaCenarioVariante['resumoLinhas'][number]>) {
    const c = cenarios[cIdx]
    patchCenario(cIdx, {
      resumoLinhas: c.resumoLinhas.map((r, i) => (i === rIdx ? { ...r, ...part } : r)),
    })
  }

  return (
    <Stack gap={2}>
      {cenarios.map((cenario, cIdx) => {
        const planosAjustados = cenarioPlanosAjustados(cenario)
        return (
          <Paper key={cenario.id} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Cenário {cIdx + 1}
              </Typography>
              <Stack direction="row" gap={0.5}>
                <Button
                  size="small"
                  startIcon={<RefreshIcon />}
                  disabled={disabled}
                  onClick={() =>
                    patchCenario(cIdx, refreshCenarioPlanosFromAbertura(cenario, form, fornecedorNome, operadoras, operadorasById))
                  }
                >
                  Recarregar abertura
                </Button>
                {cenarios.length > 1 && (
                  <IconButton size="small" disabled={disabled} onClick={() => onChange(cenarios.filter((_, i) => i !== cIdx))}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Stack>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={5}>
                <PlacementDraftTextField
                  label="Título do cenário"
                  fullWidth
                  size="small"
                  value={cenario.titulo}
                  disabled={disabled}
                  onCommit={(v) => patchCenario(cIdx, { titulo: v })}
                  placeholder="Ex.: Cenário atual · 12 meses · 10% desconto"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <PlacementDraftTextField
                  label="Reajuste / desconto (%)"
                  fullWidth
                  size="small"
                  value={cenario.reajustePercent}
                  disabled={disabled}
                  transform={sanitizeSignedPercentInput}
                  onCommit={(v) => patchCenario(cIdx, { reajustePercent: v })}
                  placeholder="Ex.: -10 ou 15"
                  helperText="Negativo = desconto · positivo = reajuste"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <PlacementDraftTextField
                  label="Vigência (meses)"
                  fullWidth
                  size="small"
                  value={cenario.vigenciaMeses}
                  disabled={disabled}
                  transform={(v) => v.replace(/\D/g, '')}
                  onCommit={(v) => patchCenario(cIdx, { vigenciaMeses: v })}
                  placeholder="Ex.: 12"
                />
              </Grid>
            </Grid>

            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              Resumo do cenário
            </Typography>
            <Paper variant="outlined" sx={{ mb: 2, overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: '35%' }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor / descrição</TableCell>
                    <TableCell width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cenario.resumoLinhas.map((linha, rIdx) => (
                    <TableRow key={linha.id}>
                      <TableCell>
                        <PlacementDraftTextField
                          fullWidth
                          size="small"
                          variant="standard"
                          value={linha.rotulo}
                          disabled={disabled}
                          onCommit={(v) => patchResumo(cIdx, rIdx, { rotulo: v })}
                          placeholder="Rótulo"
                        />
                      </TableCell>
                      <TableCell>
                        <PlacementDraftTextField
                          fullWidth
                          size="small"
                          variant="standard"
                          value={linha.valor}
                          disabled={disabled}
                          onCommit={(v) => patchResumo(cIdx, rIdx, { valor: v })}
                          placeholder="Texto livre"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          disabled={disabled || cenario.resumoLinhas.length <= 1}
                          onClick={() =>
                            patchCenario(cIdx, {
                              resumoLinhas: cenario.resumoLinhas.filter((_, i) => i !== rIdx),
                            })
                          }
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ p: 1 }}>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={disabled}
                  onClick={() =>
                    patchCenario(cIdx, {
                      resumoLinhas: [...cenario.resumoLinhas, emptyCenarioResumoLinha()],
                    })
                  }
                >
                  Linha no resumo
                </Button>
              </Box>
            </Paper>

            <Alert severity="info" sx={{ mb: 0 }}>
              {cenario.planos.length} plano(s) da abertura · custo mensal estimado (com variáveis):{' '}
              <strong>{totalMensalPreview(planosAjustados)}</strong>
            </Alert>

            {planosAjustados.length > 0 && (
              <Paper variant="outlined" sx={{ mt: 2, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Plano (contrato)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Vidas</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Custo mensal est.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Acomodação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {planosAjustados.map((plano) => (
                      <TableRow key={plano.id}>
                        <TableCell>{plano.nomePlano || '—'}</TableCell>
                        <TableCell>
                          {plano.tipoCusto === 'per_capita'
                            ? plano.numeroVidas || '—'
                            : FAIXAS_ETARIAS.reduce(
                                (s, fx) => s + (Number(plano.vidasFaixa[fx.key]) || 0),
                                0
                              ) || '—'}
                        </TableCell>
                        <TableCell>{totalMensalPreview([plano])}</TableCell>
                        <TableCell>{plano.acomodacao || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Paper>
        )
      })}

      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={() => onChange([...cenarios, buildCenarioFromAbertura(form, fornecedorNome, operadoras, operadorasById, `Cenário ${cenarios.length + 1}`)])}
        >
          Adicionar cenário
        </Button>
        {cenarios.length > 0 && (
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            disabled={disabled}
            onClick={() => {
              const src = cenarios[cenarios.length - 1]
              onChange([
                ...cenarios,
                {
                  ...src,
                  id: emptyCenarioVariante().id,
                  titulo: `${src.titulo} (cópia)`,
                  resumoLinhas: src.resumoLinhas.map((r) => ({ ...r, id: emptyCenarioResumoLinha().id })),
                  planos: src.planos.map((p) => ({ ...p, id: emptyPropostaPlanoLinha().id })),
                },
              ])
            }}
          >
            Duplicar último cenário
          </Button>
        )}
      </Stack>
    </Stack>
  )
})

const PropostaMercadoEditor = React.memo(function PropostaMercadoEditor({
  proposta,
  form,
  operadoras,
  operadorasById,
  disabled,
  onChange,
}: {
  proposta: PropostaFornecedorState
  form: CotacaoFormState
  operadoras: Operadora[]
  operadorasById?: Record<string, Operadora>
  disabled?: boolean
  onChange: (
    next:
      | PropostaFornecedorState
      | ((prev: PropostaFornecedorState) => PropostaFornecedorState)
  ) => void
}) {
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)
  const cenarios = ensurePropostaCenariosMercado(proposta)

  function commitCenarios(
    updater: (cenarios: PropostaCenarioVariante[]) => PropostaCenarioVariante[]
  ) {
    onChange((prev) => {
      const nextCenarios = updater(ensurePropostaCenariosMercado(prev))
      return {
        ...prev,
        cenarios: nextCenarios,
        planos: nextCenarios[0]?.planos?.length
          ? nextCenarios[0].planos
          : [emptyPropostaPlanoLinha()],
      }
    })
  }

  function patchCenario(cIdx: number, part: Partial<PropostaCenarioVariante>) {
    commitCenarios((list) => list.map((c, i) => (i === cIdx ? { ...c, ...part } : c)))
  }

  function patchPlano(
    cIdx: number,
    index: number,
    part: Partial<PropostaFornecedorState['planos'][number]>
  ) {
    commitCenarios((list) =>
      list.map((c, i) =>
        i === cIdx
          ? { ...c, planos: c.planos.map((p, pi) => (pi === index ? { ...p, ...part } : p)) }
          : c
      )
    )
  }

  function patchFaixa(
    cIdx: number,
    index: number,
    key: keyof PropostaFornecedorState['planos'][number]['vidasFaixa'],
    field: 'vidasFaixa' | 'custosFaixa',
    value: string
  ) {
    commitCenarios((list) =>
      list.map((c, i) =>
        i === cIdx
          ? {
              ...c,
              planos: c.planos.map((p, pi) =>
                pi === index ? { ...p, [field]: { ...p[field], [key]: value } } : p
              ),
            }
          : c
      )
    )
  }

  function addPlano(cIdx: number) {
    commitCenarios((list) =>
      list.map((c, i) =>
        i === cIdx ? { ...c, planos: [...c.planos, emptyPropostaPlanoLinha()] } : c
      )
    )
  }

  function removePlano(cIdx: number, index: number) {
    commitCenarios((list) =>
      list.map((c, i) => {
        if (i !== cIdx) return c
        const planos = c.planos.filter((_, pi) => pi !== index)
        return { ...c, planos: planos.length ? planos : [emptyPropostaPlanoLinha()] }
      })
    )
  }

  return (
    <Stack gap={2}>
      <Alert severity="info">
        Use <strong>Adicionar cenário</strong> quando a operadora enviar mais de uma proposta (ex.: Cenário 1 e
        Cenário 2). Cada cenário × plano vira coluna no comparativo, ao lado do fornecedor atual.
      </Alert>

      {referencias.length > 0 && (
        <Alert severity="info" action={
          <Button
            size="small"
            color="inherit"
            disabled={disabled}
            onClick={() =>
              onChange((prev) => {
                const aligned = alinharPropostaPorEquivalencia(
                  {
                    ...prev,
                    planos: ensurePropostaCenariosMercado(prev)[0]?.planos ?? prev.planos,
                  },
                  referencias
                )
                const base = ensurePropostaCenariosMercado(prev)
                const nextCenarios = base.map((c, i) =>
                  i === 0 ? { ...c, planos: aligned.planos } : c
                )
                return {
                  ...aligned,
                  cenarios: nextCenarios,
                  planos: nextCenarios[0]?.planos ?? aligned.planos,
                }
              })
            }
          >
            Alinhar por equivalência
          </Button>
        }>
          Vincule cada plano da proposta ao plano equivalente do contrato. O comparativo agrupa colunas por essa
          referência.
        </Alert>
      )}

      {cenarios.map((cenario, cIdx) => (
        <Paper key={cenario.id} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Cenário {cIdx + 1}
            </Typography>
            {cenarios.length > 1 && (
              <IconButton
                size="small"
                disabled={disabled}
                aria-label="Remover cenário"
                onClick={() => commitCenarios((list) => list.filter((_, i) => i !== cIdx))}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={5}>
              <PlacementDraftTextField
                label="Título do cenário"
                fullWidth
                size="small"
                value={cenario.titulo}
                disabled={disabled}
                onCommit={(v) => patchCenario(cIdx, { titulo: v })}
                placeholder="Ex.: Cenário 1 · coparticipação / Cenário 2 · sem copart"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <PlacementDraftTextField
                label="Reajuste / desconto (%)"
                fullWidth
                size="small"
                value={cenario.reajustePercent}
                disabled={disabled}
                transform={sanitizeSignedPercentInput}
                onCommit={(v) => patchCenario(cIdx, { reajustePercent: v })}
                placeholder="Ex.: -10 ou 15"
                helperText="Opcional · aplica sobre os custos no comparativo"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <PlacementDraftTextField
                label="Vigência (meses)"
                fullWidth
                size="small"
                value={cenario.vigenciaMeses}
                disabled={disabled}
                transform={(v) => v.replace(/\D/g, '')}
                onCommit={(v) => patchCenario(cIdx, { vigenciaMeses: v })}
                placeholder="Ex.: 12"
              />
            </Grid>
          </Grid>

          {cenario.planos.map((plano, index) => (
        <Box key={plano.id}>
          {index > 0 && <Divider sx={{ mb: 2 }} />}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {referencias.length
                ? `Oferta ${index + 1} · equivale a: ${labelPlanoReferencia(plano.planoReferenciaId, referencias)}`
                : `Plano ${index + 1}`}
            </Typography>
            {cenario.planos.length > 1 && (
              <IconButton size="small" disabled={disabled} onClick={() => removePlano(cIdx, index)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
          <Grid container spacing={2}>
            {referencias.length > 0 && (
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Equivale ao plano do contrato"
                  fullWidth
                  size="small"
                  SelectProps={{ native: true }}
                  value={plano.planoReferenciaId || ''}
                  disabled={disabled}
                  onChange={(e) => {
                    const refId = e.target.value
                    const ref = referencias.find((r) => r.id === refId)
                    patchPlano(cIdx, index,
                      ref
                        ? propostaPatchFromReferencia(ref, form.planos)
                        : { planoReferenciaId: refId }
                    )
                  }}
                >
                  <option value="">— Selecione —</option>
                  {referencias.map((ref) => (
                    <option key={ref.id} value={ref.id}>
                      {ref.label} ({ref.operadoraNome})
                    </option>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <PlacementDraftTextField
                label="Nome do plano"
                fullWidth
                size="small"
                value={plano.nomePlano}
                disabled={disabled}
                onCommit={(v) => patchPlano(cIdx, index, { nomePlano: v })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Tipo de custo"
                fullWidth
                size="small"
                SelectProps={{ native: true }}
                value={plano.tipoCusto}
                disabled={disabled}
                onChange={(e) =>
                  patchPlano(cIdx, index, {
                    tipoCusto: e.target.value as 'per_capita' | 'faixa_etaria',
                    vidasFaixa: plano.vidasFaixa ?? emptyVidasFaixa(),
                    custosFaixa: plano.custosFaixa ?? emptyCustosFaixa(),
                  })
                }
              >
                <option value="faixa_etaria">Faixa etária</option>
                <option value="per_capita">Per capita</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Acomodação"
                fullWidth
                size="small"
                SelectProps={{ native: true }}
                value={plano.acomodacao}
                disabled={disabled}
                onChange={(e) => patchPlano(cIdx, index, { acomodacao: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="Apartamento">Apartamento</option>
                <option value="Enfermaria">Enfermaria</option>
              </TextField>
            </Grid>

            {plano.tipoCusto === 'per_capita' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.4 }}>
                    Dados financeiros
                  </Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <PlacementDraftTextField
                    label="Nº vidas"
                    fullWidth
                    size="small"
                    value={plano.numeroVidas}
                    disabled={disabled}
                    transform={(v) => v.replace(/\D/g, '')}
                    onCommit={(v) => patchPlano(cIdx, index, { numeroVidas: v })}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <PlacementDraftTextField
                    label="Custo per capita (R$)"
                    fullWidth
                    size="small"
                    value={plano.custoPerCapitaBRL}
                    disabled={disabled || parseVidasCount(plano.numeroVidas) === 0}
                    onCommit={(v) => patchPlano(cIdx, index, { custoPerCapitaBRL: v })}
                    sx={sxCampoValorPorVidas(
                      parseVidasCount(plano.numeroVidas) > 0,
                      !!plano.custoPerCapitaBRL.trim()
                    )}
                  />
                </Grid>
              </>
            )}

            {plano.tipoCusto === 'faixa_etaria' && (
              <Grid item xs={12}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.4, display: 'block', mb: 0.5 }}>
                  Dados financeiros — faixa etária
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Faixas com vidas em destaque (amarelo = falta valor · verde = preenchido). Sem vidas, R$/vida bloqueado.
                </Typography>
                <Grid container spacing={1}>
                  {FAIXAS_ETARIAS.map((fx) => {
                    const vidasStr = plano.vidasFaixa?.[fx.key] ?? ''
                    const custoStr = plano.custosFaixa?.[fx.key] ?? ''
                    const temVidas = parseVidasCount(vidasStr) > 0
                    const temValor = !!custoStr.trim()
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={fx.key}>
                        <Paper variant="outlined" sx={sxCardFaixaPorVidas(temVidas, temValor)}>
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
                            {fx.label}
                          </Typography>
                          <Stack direction="row" gap={0.5} sx={{ mt: 0.5 }}>
                            <PlacementDraftTextField
                              label="Vidas"
                              size="small"
                              value={vidasStr}
                              disabled={disabled}
                              transform={(v) => v.replace(/\D/g, '')}
                              onCommit={(v) => patchFaixa(cIdx, index, fx.key, 'vidasFaixa', v)}
                              sx={{ flex: 1 }}
                            />
                            <PlacementDraftTextField
                              label="R$/vida"
                              size="small"
                              value={custoStr}
                              disabled={disabled || !temVidas}
                              onCommit={(v) => patchFaixa(cIdx, index, fx.key, 'custosFaixa', v)}
                              sx={{ flex: 1, ...sxCampoValorPorVidas(temVidas, temValor) }}
                            />
                          </Stack>
                        </Paper>
                      </Grid>
                    )
                  })}
                </Grid>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.4 }}>
                Coparticipação
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <CoparticipacaoSimNaoField
                value={plano.coparticipacao}
                disabled={disabled}
                onChange={(coparticipacao) => {
                  const patch: Partial<typeof plano> = { coparticipacao }
                  if (coparticipacao === 'Sim') {
                    const base = plano.coparticipacaoDetalhe ?? emptyCoparticipacao()
                    patch.coparticipacaoDetalhe = { ...cloneCoparticipacao(base), possui: true }
                  } else if (coparticipacao === 'Não') {
                    patch.coparticipacaoDetalhe = emptyCoparticipacao()
                  }
                  patchPlano(cIdx, index, patch)
                }}
              />
            </Grid>
            {plano.coparticipacao === 'Sim' && (
              <Grid item xs={12}>
                <CoparticipacaoPlanoBlock
                  coparticipacao={plano.coparticipacaoDetalhe ?? emptyCoparticipacao()}
                  disabled={disabled}
                  onChange={(coparticipacaoDetalhe) =>
                    patchPlano(cIdx, index, {
                      coparticipacaoDetalhe,
                      coparticipacao: coparticipacaoDetalhe.possui ? 'Sim' : 'Não',
                    })
                  }
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 0.4 }}>
                Reembolso
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <CoparticipacaoSimNaoField
                label="Reembolso consulta"
                value={plano.reembolso}
                disabled={disabled}
                onChange={(reembolso) => {
                  const patch: Partial<typeof plano> = { reembolso }
                  if (reembolso === 'Não') {
                    patch.reembolsoConsulta = ''
                    patch.reembolsoDetalhe = emptyReembolsoPlanoDetalhe()
                  } else if (reembolso === 'Sim') {
                    const base = plano.reembolsoDetalhe ?? emptyReembolsoPlanoDetalhe()
                    const det = cloneReembolsoPlanoDetalhe(base)
                    if (plano.reembolsoConsulta.trim() && !det.valores.consultas?.trim()) {
                      det.valores = { ...det.valores, consultas: plano.reembolsoConsulta.trim() }
                    }
                    patch.reembolsoDetalhe = det
                  }
                  patchPlano(cIdx, index, patch)
                }}
              />
            </Grid>
            {plano.reembolso === 'Sim' && (
              <Grid item xs={12}>
                <ReembolsoPlanoBlock
                  detalhe={plano.reembolsoDetalhe ?? emptyReembolsoPlanoDetalhe()}
                  disabled={disabled}
                  onChange={(reembolsoDetalhe) => {
                    const patch: Partial<typeof plano> = { reembolsoDetalhe }
                    const consulta = reembolsoDetalhe.valores.consultas?.trim()
                    patch.reembolsoConsulta = consulta ?? ''
                    patchPlano(cIdx, index, patch)
                  }}
                />
              </Grid>
            )}
          </Grid>
        </Box>
      ))}
          <Button
            startIcon={<AddIcon />}
            size="small"
            disabled={disabled}
            onClick={() => addPlano(cIdx)}
            sx={{ mt: 1 }}
          >
            Adicionar plano neste cenário
          </Button>
        </Paper>
      ))}

      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={() =>
            commitCenarios((list) => [
              ...list,
              {
                ...emptyCenarioVariante(`Cenário ${list.length + 1}`),
                reajustePercent: '',
                planos: [emptyPropostaPlanoLinha()],
              },
            ])
          }
        >
          Adicionar cenário
        </Button>
        {cenarios.length > 0 && (
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            disabled={disabled}
            onClick={() =>
              commitCenarios((list) => [...list, duplicateCenarioVariante(list[list.length - 1])])
            }
          >
            Duplicar último cenário
          </Button>
        )}
        {cenarios.length === 1 && cenarios[0].planos.length > 1 && (
          <Button
            size="small"
            disabled={disabled}
            onClick={() =>
              commitCenarios((list) => {
                const planos = list[0]?.planos ?? []
                return planos.map((p, i) => ({
                  ...emptyCenarioVariante(`Cenário ${i + 1}`),
                  reajustePercent: list[0]?.reajustePercent ?? '',
                  vigenciaMeses: list[0]?.vigenciaMeses ?? '',
                  resumoLinhas: [],
                  planos: [{ ...p }],
                }))
              })
            }
          >
            Separar cada plano em um cenário
          </Button>
        )}
      </Stack>
    </Stack>
  )
})

export const PropostaFornecedorSection = React.memo(function PropostaFornecedorSection({
  fornecedorNome,
  proposta,
  form,
  operadoras,
  operadorasById,
  isFornecedorAtual,
  disabled,
  onChange,
}: Props) {
  const cenarios = proposta.cenarios ?? []

  const descricao = isFornecedorAtual
    ? 'Cenários carregados da abertura do formulário. Ajuste reajuste/desconto, vigência e o resumo editável; cada cenário × plano vira coluna no comparativo (layout Contrato Atual).'
    : 'Cadastre um ou mais cenários de proposta (ex.: AMIL Cenário 1 e Cenário 2). Cada cenário × plano aparece como coluna no comparativo, comparado ao fornecedor atual.'

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <RequestQuoteIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Proposta apresentada — {fornecedorNome}
          {isFornecedorAtual ? ' (fornecedor atual)' : ''}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {descricao}
      </Typography>

      {isFornecedorAtual && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Planos e custos base vêm dos dados lançados na abertura (Contrato e apólice). Use «Recarregar abertura» se
          alterar o formulário inicial.
        </Alert>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={proposta.incluirNoComparativo}
            disabled={disabled}
            onChange={(e) => onChange((prev) => ({ ...prev, incluirNoComparativo: e.target.checked }))}
          />
        }
        label="Incluir no comparativo de propostas"
        sx={{ mb: 2 }}
      />

      {isFornecedorAtual ? (
        <CenarioAtualEditor
          cenarios={cenarios}
          form={form}
          fornecedorNome={fornecedorNome}
          operadoras={operadoras}
          operadorasById={operadorasById}
          disabled={disabled}
          onChange={(next) =>
            onChange((prev) => ({
              ...prev,
              cenarios: next,
              planos: next[0]?.planos ?? prev.planos,
            }))
          }
        />
      ) : (
        <PropostaMercadoEditor
          proposta={proposta}
          form={form}
          operadoras={operadoras}
          operadorasById={operadorasById}
          disabled={disabled}
          onChange={onChange}
        />
      )}
    </Paper>
  )
})

export function patchAguardandoProposta(
  state: AguardandoOperadoraState,
  fornKey: string,
  proposta: PropostaFornecedorState
): AguardandoOperadoraState {
  const next: AguardandoOperadoraState = {
    ...state,
    propostas: { ...state.propostas, [fornKey]: proposta },
  }
  return { ...next, ...ensureComparativosEstudos(next) }
}

/**
 * Hot path de digitação: atualiza só o fornecedor e o espelho do estudo ativo,
 * sem deep clone / ensureComparativosEstudos completo.
 * Se a estrutura de estudos ainda não existir, cai no path completo.
 */
export function patchAguardandoPropostaHot(
  state: AguardandoOperadoraState,
  fornKey: string,
  proposta: PropostaFornecedorState
): AguardandoOperadoraState {
  const estudos = state.comparativosEstudos
  const ativoId = state.comparativoAtivoId?.trim()
  if (!estudos?.length || !ativoId || !estudos.some((e) => e.id === ativoId)) {
    return patchAguardandoProposta(state, fornKey, proposta)
  }

  const propostas = { ...state.propostas, [fornKey]: proposta }
  const comparativosEstudos = estudos.map((e) =>
    e.id === ativoId
      ? { ...e, propostas: { ...e.propostas, [fornKey]: proposta } }
      : e
  )
  return {
    ...state,
    propostas,
    comparativosEstudos,
    comparativoAtivoId: ativoId,
  }
}

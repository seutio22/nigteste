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
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  FAIXAS_ETARIAS,
  emptyCustosFaixa,
  emptyVidasFaixa,
} from './placementCotacaoDetalhes'
import { sanitizeSignedPercentInput } from './placementCotacaoFinanceiro'
import {
  emptyPropostaPlanoLinha,
  type AguardandoOperadoraState,
  type PropostaCenarioVariante,
  type PropostaFornecedorState,
} from './placementAguardandoOperadora'
import {
  applyReajusteToPlanos,
  buildCenarioFromAbertura,
  cenarioPlanosAjustados,
  emptyCenarioResumoLinha,
  emptyCenarioVariante,
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

function CenarioAtualEditor({
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
                <TextField
                  label="Reajuste / desconto (%)"
                  fullWidth
                  size="small"
                  value={cenario.reajustePercent}
                  disabled={disabled}
                  onChange={(e) => patchCenario(cIdx, { reajustePercent: sanitizeSignedPercentInput(e.target.value) })}
                  placeholder="Ex.: -10 ou 15"
                  helperText="Negativo = desconto · positivo = reajuste"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Vigência (meses)"
                  fullWidth
                  size="small"
                  value={cenario.vigenciaMeses}
                  disabled={disabled}
                  onChange={(e) => patchCenario(cIdx, { vigenciaMeses: e.target.value.replace(/\D/g, '') })}
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
}

function PropostaMercadoEditor({
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
  onChange: (next: PropostaFornecedorState) => void
}) {
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)

  function patchPlano(index: number, part: Partial<PropostaFornecedorState['planos'][number]>) {
    onChange((prev) => ({
      ...prev,
      planos: prev.planos.map((p, i) => (i === index ? { ...p, ...part } : p)),
    }))
  }

  function patchFaixa(
    index: number,
    key: keyof PropostaFornecedorState['planos'][number]['vidasFaixa'],
    field: 'vidasFaixa' | 'custosFaixa',
    value: string
  ) {
    onChange((prev) => ({
      ...prev,
      planos: prev.planos.map((p, i) =>
        i === index ? { ...p, [field]: { ...p[field], [key]: value } } : p
      ),
    }))
  }

  function addPlano() {
    onChange((prev) => ({ ...prev, planos: [...prev.planos, emptyPropostaPlanoLinha()] }))
  }

  function removePlano(index: number) {
    onChange((prev) => {
      const planos = prev.planos.filter((_, i) => i !== index)
      return { ...prev, planos: planos.length ? planos : [emptyPropostaPlanoLinha()] }
    })
  }

  return (
    <Stack gap={2}>
      {referencias.length > 0 && (
        <Alert severity="info" action={
          <Button
            size="small"
            color="inherit"
            disabled={disabled}
            onClick={() => onChange((prev) => alinharPropostaPorEquivalencia(prev, referencias))}
          >
            Alinhar por equivalência
          </Button>
        }>
          Vincule cada plano da proposta ao plano equivalente do contrato. O comparativo agrupa colunas por essa
          referência.
        </Alert>
      )}

      {proposta.planos.map((plano, index) => (
        <Box key={plano.id}>
          {index > 0 && <Divider sx={{ mb: 2 }} />}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {referencias.length
                ? `Oferta ${index + 1} · equivale a: ${labelPlanoReferencia(plano.planoReferenciaId, referencias)}`
                : `Plano ${index + 1}`}
            </Typography>
            {proposta.planos.length > 1 && (
              <IconButton size="small" disabled={disabled} onClick={() => removePlano(index)}>
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
                    patchPlano(
                      index,
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
              <TextField
                label="Nome do plano"
                fullWidth
                size="small"
                value={plano.nomePlano}
                disabled={disabled}
                onChange={(e) => patchPlano(index, { nomePlano: e.target.value })}
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
                  patchPlano(index, {
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
            {plano.tipoCusto === 'per_capita' && (
              <>
                <Grid item xs={6} md={2}>
                  <TextField
                    label="Nº vidas"
                    fullWidth
                    size="small"
                    value={plano.numeroVidas}
                    disabled={disabled}
                    onChange={(e) => patchPlano(index, { numeroVidas: e.target.value.replace(/\D/g, '') })}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Custo per capita (R$)"
                    fullWidth
                    size="small"
                    value={plano.custoPerCapitaBRL}
                    disabled={disabled}
                    onChange={(e) => patchPlano(index, { custoPerCapitaBRL: e.target.value })}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={3}>
              <TextField
                label="Reembolso consulta"
                fullWidth
                size="small"
                value={plano.reembolsoConsulta}
                disabled={disabled}
                onChange={(e) => patchPlano(index, { reembolsoConsulta: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Acomodação"
                fullWidth
                size="small"
                value={plano.acomodacao}
                disabled={disabled}
                onChange={(e) => patchPlano(index, { acomodacao: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Coparticipação"
                fullWidth
                size="small"
                value={plano.coparticipacao}
                disabled={disabled}
                onChange={(e) => patchPlano(index, { coparticipacao: e.target.value })}
              />
            </Grid>
          </Grid>
          {plano.tipoCusto === 'faixa_etaria' && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={1}>
                {FAIXAS_ETARIAS.map((fx) => (
                  <Grid item xs={12} sm={6} md={4} key={fx.key}>
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
                        {fx.label}
                      </Typography>
                      <Stack direction="row" gap={0.5} sx={{ mt: 0.5 }}>
                        <TextField
                          label="Vidas"
                          size="small"
                          value={plano.vidasFaixa?.[fx.key] ?? ''}
                          disabled={disabled}
                          onChange={(e) => patchFaixa(index, fx.key, 'vidasFaixa', e.target.value.replace(/\D/g, ''))}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="R$/vida"
                          size="small"
                          value={plano.custosFaixa?.[fx.key] ?? ''}
                          disabled={disabled}
                          onChange={(e) => patchFaixa(index, fx.key, 'custosFaixa', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      ))}
      <Button startIcon={<AddIcon />} size="small" disabled={disabled} onClick={addPlano}>
        Adicionar plano
      </Button>
    </Stack>
  )
}

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
    : 'Cadastre a oferta por plano e indique a equivalência com os planos do contrato para alinhar as colunas no comparativo.'

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
  return {
    ...state,
    propostas: { ...state.propostas, [fornKey]: proposta },
  }
}

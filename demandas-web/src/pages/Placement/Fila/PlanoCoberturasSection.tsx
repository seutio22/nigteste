import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
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
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import type { Operadora } from '../../../types/masterData'
import type { PlacementPlano } from '../../../store/placementStore'
import { usePlacementStore } from '../../../store/placementStore'
import { SnackNotification } from '../../../components/SnackNotification'
import {
  custoEstimadoPlanoCents,
  subtotalFaixaCents,
  emptyPlanoCobertura,
  FAIXAS_ETARIAS,
  rowIdsNeedingPlano,
  type MapeamentoItemForm,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import { formatCentsToBRL } from './utils'
import { emptyCoparticipacao, cloneCoparticipacao, type CoparticipacaoForm } from './placementCoparticipacao'
import { SectionHeader } from './CotacaoFormSections'
import { CoparticipacaoPlanoBlock } from './CoparticipacaoPlanoBlock'
import { FaixaEtariaUploadBar } from './FaixaEtariaUploadBar'
import type { FaixaEtariaUploadResult } from './placementFaixaEtariaUpload'
import { PlanoNomeCatalogField } from './PlanoNomeCatalogField'
import { rowIdsNeedingPlanoForCotacao } from './placementFormularioContrato'
import { parseAcomodacaoFromCatalog } from './placementPlanos'
import {
  parseVidasCount,
  sxCampoValorPorVidas,
  sxTableRowFaixaPorVidas,
} from './placementCampoValorVidasHighlight'

interface Props {
  itens: MapeamentoItemForm[]
  operadoras: Operadora[]
  planos: PlanoCoberturaForm[]
  onChangePlanos: (next: PlanoCoberturaForm[]) => void
  coparticipacaoDetalhePorPlanos?: string
  onChangeCoparticipacaoDetalhePorPlanos?: (next: string) => void
  disabled?: boolean
  embedded?: boolean
  formularioTipo?: string
  planosCatalogo?: PlacementPlano[]
}

export function PlanoCoberturasSection({
  itens,
  operadoras,
  planos,
  onChangePlanos,
  coparticipacaoDetalhePorPlanos = '',
  onChangeCoparticipacaoDetalhePorPlanos,
  disabled,
  embedded = false,
  formularioTipo,
  planosCatalogo = [],
}: Props) {
  const addPlanoCatalogo = usePlacementStore((s) => s.addPlano)
  const syncPlanosCatalogo = usePlacementStore((s) => s.syncPlanos)
  const [savingCatalogId, setSavingCatalogId] = useState<string | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  } | null>(null)
  const [copartReplicarSourcePlanoId, setCopartReplicarSourcePlanoId] = useState<string | null>(null)
  const [copartReplicarTemplate, setCopartReplicarTemplate] = useState<CoparticipacaoForm | null>(null)

  const neededRowIds = useMemo(() => {
    if (formularioTipo) {
      return rowIdsNeedingPlanoForCotacao({ formularioTipo, itens })
    }
    return rowIdsNeedingPlano(itens)
  }, [itens, formularioTipo])
  const usaCatalogoSaude = formularioTipo === 'saude'

  function planosDaLinha(rowId: string) {
    return planos.filter((p) => p.itemRowId === rowId)
  }

  function patchPlanoById(planoId: string, part: Partial<PlanoCoberturaForm>) {
    onChangePlanos(planos.map((p) => (p.id === planoId ? { ...p, ...part } : p)))
  }

  function patchFaixa(planoId: string, key: string, val: string) {
    const p = planos.find((x) => x.id === planoId)
    if (!p) return
    patchPlanoById(planoId, {
      custosFaixa: { ...p.custosFaixa, [key]: val } as PlanoCoberturaForm['custosFaixa'],
    })
  }

  function patchVidasFaixa(planoId: string, key: string, val: string) {
    const p = planos.find((x) => x.id === planoId)
    if (!p) return
    patchPlanoById(planoId, {
      vidasFaixa: { ...p.vidasFaixa, [key]: val } as PlanoCoberturaForm['vidasFaixa'],
    })
  }

  function applyFaixaUpload(planoId: string, result: FaixaEtariaUploadResult) {
    const p = planos.find((x) => x.id === planoId)
    if (!p) return
    patchPlanoById(planoId, {
      vidasFaixa: { ...p.vidasFaixa, ...result.vidasFaixa },
      custosFaixa: { ...p.custosFaixa, ...result.custosFaixa },
    })
  }

  function clearCopartReplicar(planoId?: string) {
    if (planoId && copartReplicarSourcePlanoId !== planoId) return
    setCopartReplicarSourcePlanoId(null)
    setCopartReplicarTemplate(null)
  }

  function handleCopartChange(planoId: string, copart: CoparticipacaoForm) {
    patchPlanoById(planoId, { coparticipacao: copart })
    if (copartReplicarSourcePlanoId === planoId) {
      if (copart.possui) {
        setCopartReplicarTemplate(cloneCoparticipacao(copart))
      } else {
        clearCopartReplicar(planoId)
      }
    }
  }

  function handleReplicarCopartChange(
    planoId: string,
    copart: CoparticipacaoForm,
    enabled: boolean
  ) {
    if (enabled && copart.possui) {
      setCopartReplicarSourcePlanoId(planoId)
      setCopartReplicarTemplate(cloneCoparticipacao(copart))
      return
    }
    clearCopartReplicar(planoId)
  }

  function addPlano(rowId: string) {
    const novo = emptyPlanoCobertura(rowId)
    if (copartReplicarTemplate?.possui) {
      novo.coparticipacao = cloneCoparticipacao(copartReplicarTemplate)
    }
    onChangePlanos([...planos, novo])
  }

  function removePlano(planoId: string) {
    const alvo = planos.find((p) => p.id === planoId)
    if (!alvo) return
    const naLinha = planosDaLinha(alvo.itemRowId)
    if (naLinha.length <= 1) return
    clearCopartReplicar(planoId)
    onChangePlanos(planos.filter((p) => p.id !== planoId))
  }

  async function savePlanoToCatalog(
    planoId: string,
    payload: {
      operadoraId: string
      categoria: string
      plano: string
      acomodacao: string | null
      abrangencia: string | null
    }
  ) {
    setSavingCatalogId(planoId)
    try {
      const created = await addPlanoCatalogo(payload)
      await syncPlanosCatalogo(true)
      patchPlanoById(planoId, {
        placementPlanoCatalogId: created.id,
        nomePlano: created.plano,
        abrangencia: created.abrangencia?.trim() ?? payload.abrangencia ?? '',
        acomodacao: parseAcomodacaoFromCatalog(created.acomodacao) || planos.find((p) => p.id === planoId)?.acomodacao || '',
      })
      setSnack({ open: true, message: 'Plano salvo em Dados → Placement → Planos.', severity: 'success' })
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao salvar plano na base.',
        severity: 'error',
      })
    } finally {
      setSavingCatalogId(null)
    }
  }

  const body = (
    <>
      <SectionHeader
        icon={<LocalHospitalIcon fontSize="small" />}
        title="Plano / Coberturas"
        description={
          usaCatalogoSaude
            ? 'Por fornecedor e categoria do mapeamento, selecione o plano na base (Dados → Placement → Planos) ou informe manualmente nome, acomodação e abrangência.'
            : 'Para Saúde ou Odontológico, com dois produtos ou dois fornecedores: cadastre um ou mais planos por combinação produto + fornecedor. Vidas e custos ficam em cada plano.'
        }
      />

      <Stack gap={2.5}>
        {neededRowIds.map((rowId) => {
          const item = itens.find((i) => i.id === rowId)
          const fornNome =
            operadoras.find((o) => o.id === item?.fornecedorId)?.nome ?? 'Fornecedor'
          const tituloLinha = usaCatalogoSaude
            ? [item?.categoria, fornNome].filter(Boolean).join(' · ')
            : [item?.produtoNome, fornNome].filter(Boolean).join(' · ')
          const lista = planosDaLinha(rowId)
          const useCatalogField =
            usaCatalogoSaude && !!item?.fornecedorId && !!item?.categoria?.trim()

          return (
            <Paper key={rowId} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                gap={1}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {usaCatalogoSaude ? 'Contrato (categoria + fornecedor)' : 'Contrato (produto + fornecedor)'}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {tituloLinha}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addPlano(rowId)}
                  disabled={disabled}
                >
                  Adicionar plano
                </Button>
              </Stack>

              <Stack gap={2}>
                {lista.map((plano, idx) => (
                  <Card key={plano.id} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 1.5 }}
                      >
                        <Typography variant="subtitle2" color="primary">
                          Plano {idx + 1} de {lista.length}
                        </Typography>
                        <IconButton
                          size="small"
                          aria-label="Remover plano"
                          color="error"
                          disabled={disabled || lista.length <= 1}
                          onClick={() => removePlano(plano.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          {useCatalogField && item ? (
                            <PlanoNomeCatalogField
                              plano={plano}
                              operadoraId={item.fornecedorId}
                              categoria={item.categoria}
                              planosCatalogo={planosCatalogo}
                              disabled={disabled}
                              savingCatalog={savingCatalogId === plano.id}
                              onChange={(part) => patchPlanoById(plano.id, part)}
                              onSaveToCatalog={(payload) => savePlanoToCatalog(plano.id, payload)}
                            />
                          ) : (
                            <TextField
                              label="Nome do plano"
                              fullWidth
                              required
                              size="small"
                              value={plano.nomePlano}
                              disabled={disabled}
                              onChange={(e) =>
                                patchPlanoById(plano.id, { nomePlano: e.target.value })
                              }
                            />
                          )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Acomodação"
                            select
                            fullWidth
                            required
                            size="small"
                            value={plano.acomodacao}
                            disabled={disabled}
                            onChange={(e) =>
                              patchPlanoById(plano.id, {
                                acomodacao: e.target.value as PlanoCoberturaForm['acomodacao'],
                              })
                            }
                          >
                            <MenuItem value="">Selecione</MenuItem>
                            <MenuItem value="Apartamento">Apartamento</MenuItem>
                            <MenuItem value="Enfermaria">Enfermaria</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Abrangência"
                            fullWidth
                            size="small"
                            value={plano.abrangencia}
                            disabled={disabled}
                            onChange={(e) =>
                              patchPlanoById(plano.id, { abrangencia: e.target.value })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Elegibilidade"
                            fullWidth
                            size="small"
                            value={plano.elegibilidade}
                            disabled={disabled}
                            onChange={(e) =>
                              patchPlanoById(plano.id, { elegibilidade: e.target.value })
                            }
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <FormControl disabled={disabled} size="small">
                            <FormLabel>Custo</FormLabel>
                            <RadioGroup
                              row
                              value={plano.tipoCusto}
                              onChange={(e) => {
                                const tipo = e.target.value as PlanoCoberturaForm['tipoCusto']
                                patchPlanoById(plano.id, {
                                  tipoCusto: tipo,
                                  ...(tipo === 'faixa_etaria' ? { numeroVidas: '' } : {}),
                                })
                              }}
                            >
                              <FormControlLabel
                                value="per_capita"
                                control={<Radio size="small" />}
                                label="Per capita"
                              />
                              <FormControlLabel
                                value="faixa_etaria"
                                control={<Radio size="small" />}
                                label="Faixa etária"
                              />
                            </RadioGroup>
                          </FormControl>
                        </Grid>

                        {plano.tipoCusto === 'per_capita' && (
                          <>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Número de vidas"
                                type="number"
                                fullWidth
                                size="small"
                                inputProps={{ min: 0 }}
                                value={plano.numeroVidas}
                                disabled={disabled}
                                onChange={(e) =>
                                  patchPlanoById(plano.id, { numeroVidas: e.target.value })
                                }
                                placeholder="0"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                label="Custo per capita (R$)"
                                fullWidth
                                size="small"
                                value={plano.custoPerCapitaBRL}
                                disabled={disabled || parseVidasCount(plano.numeroVidas) === 0}
                                onChange={(e) =>
                                  patchPlanoById(plano.id, { custoPerCapitaBRL: e.target.value })
                                }
                                placeholder="0,00"
                                sx={sxCampoValorPorVidas(
                                  parseVidasCount(plano.numeroVidas) > 0,
                                  !!plano.custoPerCapitaBRL.trim()
                                )}
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Box
                                sx={{
                                  px: 2,
                                  py: 1.25,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="caption" color="text.secondary">
                                  Custo estimado do plano
                                </Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  {formatCentsToBRL(custoEstimadoPlanoCents(plano))}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  vidas × custo per capita
                                </Typography>
                              </Box>
                            </Grid>
                          </>
                        )}

                        {plano.tipoCusto === 'faixa_etaria' && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                              Vidas e custo por faixa etária
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              Faixas com vidas em destaque (amarelo = falta valor · verde = preenchido). Sem vidas, o
                              custo fica bloqueado.
                            </Typography>
                            <FaixaEtariaUploadBar
                              disabled={disabled}
                              onImported={(result) => applyFaixaUpload(plano.id, result)}
                            />
                            <Table size="small" sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Faixa</TableCell>
                                  <TableCell width="22%">Vidas</TableCell>
                                  <TableCell width="28%">Custo (R$/vida)</TableCell>
                                  <TableCell width="28%">Subtotal</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {FAIXAS_ETARIAS.map((fx) => {
                                  const vidasStr = plano.vidasFaixa[fx.key] ?? ''
                                  const custoStr = plano.custosFaixa[fx.key] ?? ''
                                  const temVidas = parseVidasCount(vidasStr) > 0
                                  const temValor = !!custoStr.trim()
                                  const sub = formatCentsToBRL(
                                    subtotalFaixaCents(vidasStr, custoStr)
                                  )
                                  return (
                                    <TableRow
                                      key={fx.key}
                                      sx={sxTableRowFaixaPorVidas(temVidas, temValor)}
                                    >
                                      <TableCell>{fx.label}</TableCell>
                                      <TableCell>
                                        <TextField
                                          size="small"
                                          fullWidth
                                          type="number"
                                          inputProps={{ min: 0 }}
                                          value={vidasStr}
                                          disabled={disabled}
                                          onChange={(e) =>
                                            patchVidasFaixa(plano.id, fx.key, e.target.value)
                                          }
                                          placeholder="0"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <TextField
                                          size="small"
                                          fullWidth
                                          value={custoStr}
                                          disabled={disabled || !temVidas}
                                          onChange={(e) =>
                                            patchFaixa(plano.id, fx.key, e.target.value)
                                          }
                                          placeholder="0,00"
                                          sx={sxCampoValorPorVidas(temVidas, temValor)}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {sub}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                            <Box
                              sx={{
                                mt: 1.5,
                                px: 2,
                                py: 1,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                Custo estimado do plano (soma das faixas)
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {formatCentsToBRL(custoEstimadoPlanoCents(plano))}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        <Grid item xs={12}>
                          <CoparticipacaoPlanoBlock
                            coparticipacao={plano.coparticipacao ?? emptyCoparticipacao()}
                            disabled={disabled}
                            onChange={(copart) => handleCopartChange(plano.id, copart)}
                            replicarParaOutrosPlanos={copartReplicarSourcePlanoId === plano.id}
                            onReplicarParaOutrosPlanosChange={(enabled) =>
                              handleReplicarCopartChange(
                                plano.id,
                                plano.coparticipacao ?? emptyCoparticipacao(),
                                enabled
                              )
                            }
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Paper>
          )
        })}
      </Stack>

      {onChangeCoparticipacaoDetalhePorPlanos && (
        <TextField
          label="Caso a coparticipação seja diferente por planos, por favor detalhar no campo abaixo:"
          fullWidth
          multiline
          minRows={3}
          size="small"
          sx={{ mt: 2 }}
          value={coparticipacaoDetalhePorPlanos}
          disabled={disabled}
          onChange={(e) => onChangeCoparticipacaoDetalhePorPlanos(e.target.value)}
          placeholder="Descreva as diferenças de coparticipação entre os planos..."
        />
      )}
    </>
  )

  const snackNode = snack ? (
    <SnackNotification
      open={snack.open}
      message={snack.message}
      severity={snack.severity}
      onClose={() => setSnack(null)}
    />
  ) : null

  if (embedded) {
    return (
      <Box sx={{ mt: 1, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        {body}
        {snackNode}
      </Box>
    )
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent>{body}</CardContent>
      </Card>
      {snackNode}
    </>
  )
}

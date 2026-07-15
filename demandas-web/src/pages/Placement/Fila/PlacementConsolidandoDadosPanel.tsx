import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementStore } from '../../../store/placementStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  classificacaoPermitePropostaValores,
  ensureAguardandoOperadoraState,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
import {
  ensureComunicarMercadoState,
  parseComunicarMercadoFromKickOff,
} from './placementComunicarMercado'
import { DIFERENCIAL_ITENS } from './placementDiferenciaisCatalogo'
import {
  buildDiferenciaisMasterUpsertItems,
  buildSavePreviewRows,
  buildDiferencialPlanoOpcoes,
  emptyDiferencialCelula,
  ensureConsolidandoDadosState,
  fornecedorColunaId,
  matchDiferencialPlanoOpcao,
  mergeDiferenciaisColuna,
  parseConsolidandoDadosFromKickOff,
  patchDiferencialCelulas,
  previewImportDiferenciaisFromMaster,
  type ConsolidandoDadosState,
  type DiferencialCelulaCotacao,
  type DiferencialPlanoOpcao,
  type DiferencialPreviewRow,
} from './placementConsolidandoDados'
import { DiferenciaisCatalogoPreviewDialog } from './DiferenciaisCatalogoPreviewDialog'
import { patchKickOffInForm } from './placementPatchKickOff'
import { usePlacementKickOffAutosave } from './usePlacementKickOffAutosave'
import { mercadoNomesComFornecedoresAtuais, normMercadoKey } from './placementMercadoQuadro'
import { ComparativoDiferenciaisDashboard } from './ComparativoDiferenciaisDashboard'
import { PlacementDraftTextField } from './PlacementDraftTextField'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  disabled?: boolean
  embedded?: boolean
}

type CatalogDialogMode = 'import' | 'save'

function getEditableCelulas(
  celulas: DiferencialCelulaCotacao[],
  pendingIds: Record<string, string>,
  pendingKey: string
): DiferencialCelulaCotacao[] {
  if (celulas.length) return celulas
  if (!pendingIds[pendingKey]) {
    pendingIds[pendingKey] = emptyDiferencialCelula().id
  }
  return [
    {
      id: pendingIds[pendingKey],
      placementPlanoId: '',
      planoLabel: '',
      texto: '',
    },
  ]
}

function resolveOperadoraId(
  nome: string,
  operadoras: { id: string; nome: string }[],
  operadorasById?: Record<string, { id: string; nome: string }>
): string {
  const key = normMercadoKey(nome)
  const hit = operadoras.find((o) => normMercadoKey(o.nome) === key)
  if (hit) return hit.id
  if (operadorasById) {
    for (const o of Object.values(operadorasById)) {
      if (normMercadoKey(o.nome) === key) return o.id
    }
  }
  return ''
}

export const PlacementConsolidandoDadosPanel = React.memo(function PlacementConsolidandoDadosPanel({
  cotacaoId,
  form,
  onChange,
  onPersisted,
  disabled,
  embedded = false,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const {
    diferenciais: masterDiferenciais,
    planos,
    syncDiferenciais,
    syncPlanos,
    upsertDiferenciaisBatch,
  } = usePlacementStore()

  const [subTab, setSubTab] = useState<'lancamento' | 'comparativo'>('lancamento')
  const [fornecedorAtivo, setFornecedorAtivo] = useState('')
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false)
  const [catalogDialogMode, setCatalogDialogMode] = useState<CatalogDialogMode>('import')
  const [previewRows, setPreviewRows] = useState<DiferencialPreviewRow[]>([])
  const [previewSkipped, setPreviewSkipped] = useState(0)
  const [pendingImport, setPendingImport] = useState<Record<string, DiferencialCelulaCotacao[]> | null>(
    null
  )
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [snackMsg, setSnackMsg] = useState<string | null>(null)
  const pendingCellIdsRef = React.useRef<Record<string, string>>({})

  useEffect(() => {
    void syncDiferenciais(true)
    void syncPlanos(true)
  }, [syncDiferenciais, syncPlanos])

  const fornecedores = useMemo(
    () => mercadoNomesComFornecedoresAtuais(form, operadoras, operadorasById),
    [form, operadoras, operadorasById]
  )

  const aguardandoOperadora = useMemo(
    () =>
      ensureAguardandoOperadoraState(
        parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
        form,
        operadoras,
        operadorasById,
        ensureComunicarMercadoState(
          parseComunicarMercadoFromKickOff(form.kickOffEstrategia),
          form,
          operadoras,
          operadorasById
        )
      ),
    [form, operadoras, operadorasById]
  )

  const consolidando = useMemo(
    () =>
      ensureConsolidandoDadosState(parseConsolidandoDadosFromKickOff(form.kickOffEstrategia)),
    [form.kickOffEstrategia]
  )

  const fornecedoresVisiveis = useMemo(() => {
    return fornecedores.filter((nome) => {
      const key = normMercadoKey(nome)
      const ag = aguardandoOperadora.fornecedores[key]
      const proposta = aguardandoOperadora.propostas[key]
      if (!proposta?.incluirNoComparativo) return false
      if (ag && !classificacaoPermitePropostaValores(ag.classificacaoMercado)) return false
      return true
    })
  }, [fornecedores, aguardandoOperadora])

  useEffect(() => {
    if (!fornecedorAtivo && fornecedoresVisiveis.length) {
      setFornecedorAtivo(fornecedoresVisiveis[0])
    }
  }, [fornecedorAtivo, fornecedoresVisiveis])

  const fornecedoresRef = React.useRef(fornecedores)
  fornecedoresRef.current = fornecedores

  const { scheduleSave, saveState } = usePlacementKickOffAutosave({
    cotacaoId,
    onPersisted,
  })

  const applyConsolidando = useCallback(
    (nextCd: ConsolidandoDadosState, immediate?: boolean) => {
      const nextForm = patchKickOffInForm(
        form,
        { consolidandoDados: nextCd },
        fornecedoresRef.current
      )
      onChange(nextForm)
      scheduleSave(nextForm.kickOffEstrategia!, immediate)
    },
    [form, onChange, scheduleSave]
  )

  const resolveOperadoraIdCb = useCallback(
    (nome: string) => resolveOperadoraId(nome, operadoras, operadorasById),
    [operadoras, operadorasById]
  )

  const colunaId = fornecedorAtivo ? fornecedorColunaId(fornecedorAtivo) : ''
  const operadoraId = fornecedorAtivo
    ? resolveOperadoraId(fornecedorAtivo, operadoras, operadorasById)
    : ''

  const propostaPlanos = colunaId ? aguardandoOperadora.propostas[colunaId]?.planos : undefined

  const catalogPlanosFornecedor = useMemo(
    () => (operadoraId ? planos.filter((p) => p.operadoraId === operadoraId) : []),
    [planos, operadoraId]
  )

  const planoOpcoes = useMemo(
    () =>
      fornecedorAtivo && operadoraId
        ? buildDiferencialPlanoOpcoes({
            form,
            fornecedorAtivo,
            colunaId,
            operadoraId,
            fornecedoresVisiveis,
            aguardandoOperadora,
            placementPlanos: planos,
            operadoras,
            operadorasById,
          })
        : [],
    [
      form,
      fornecedorAtivo,
      colunaId,
      operadoraId,
      fornecedoresVisiveis,
      aguardandoOperadora,
      planos,
      operadoras,
      operadorasById,
    ]
  )

  const openImportPreview = () => {
    if (!operadoraId) return
    const { imported, rows } = previewImportDiferenciaisFromMaster({
      operadoraId,
      masterDiferenciais,
      placementPlanos: planos,
      propostaPlanos,
    })
    setCatalogDialogMode('import')
    setPreviewRows(rows)
    setPreviewSkipped(0)
    setPendingImport(imported)
    setCatalogDialogOpen(true)
  }

  const openSavePreview = () => {
    const { items, skipped } = buildDiferenciaisMasterUpsertItems(consolidando, {
      fornecedores,
      resolveOperadoraId: resolveOperadoraIdCb,
      placementPlanos: planos,
      propostasByColuna: aguardandoOperadora.propostas,
    })
    const allRows = buildSavePreviewRows(items, planos)
    const rowsForFornecedor = fornecedorAtivo
      ? allRows.filter((row) => {
          const planoIds = new Set(catalogPlanosFornecedor.map((p) => p.id))
          const match = items.find(
            (i) =>
              i.operadoraId === operadoraId &&
              i.itemKey === row.itemKey &&
              i.texto === row.texto &&
              planoIds.has(i.placementPlanoId)
          )
          return !!match
        })
      : allRows
    setCatalogDialogMode('save')
    setPreviewRows(rowsForFornecedor)
    setPreviewSkipped(skipped)
    setPendingImport(null)
    setCatalogDialogOpen(true)
  }

  const handleCatalogConfirm = async () => {
    setCatalogLoading(true)
    try {
      if (catalogDialogMode === 'import') {
        if (!colunaId || !pendingImport) return
        applyConsolidando(mergeDiferenciaisColuna(consolidando, colunaId, pendingImport, true), true)
        setSnackMsg(`${previewRows.length} diferencial(is) importado(s) para esta cotação.`)
      } else {
        const { items } = buildDiferenciaisMasterUpsertItems(consolidando, {
          fornecedores,
          resolveOperadoraId: resolveOperadoraIdCb,
          placementPlanos: planos,
          propostasByColuna: aguardandoOperadora.propostas,
        })
        const toSave = fornecedorAtivo
          ? items.filter((i) => i.operadoraId === operadoraId)
          : items
        if (!toSave.length) return
        const result = await upsertDiferenciaisBatch(toSave)
        setSnackMsg(`${result.synced} registro(s) cadastrado(s) em Dados → Diferenciais.`)
      }
      setCatalogDialogOpen(false)
    } catch {
      setSnackMsg('Não foi possível concluir a operação. Tente novamente.')
    } finally {
      setCatalogLoading(false)
    }
  }

  const updateCelulas = (itemKey: string, celulas: DiferencialCelulaCotacao[]) => {
    if (colunaId) {
      delete pendingCellIdsRef.current[`${colunaId}:${itemKey}`]
    }
    applyConsolidando(patchDiferencialCelulas(consolidando, itemKey, colunaId, celulas))
  }

  const addPlanoRow = (itemKey: string, stored: DiferencialCelulaCotacao[]) => {
    const pendingKey = `${colunaId}:${itemKey}`
    const base = getEditableCelulas(stored, pendingCellIdsRef.current, pendingKey)
    updateCelulas(itemKey, [...base, emptyDiferencialCelula()])
  }

  const updateResumo = (field: 'resumoCoberturas' | 'condicoesContratuais', value: string) => {
    applyConsolidando({ ...consolidando, [field]: value })
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1.5}
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Consolidando dados
        </Typography>
        {saveState === 'saving' && (
          <Typography variant="caption" color="text.secondary">
            Salvando…
          </Typography>
        )}
      </Stack>

      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 2 }}>
        <Tab value="lancamento" label="Lançamento" />
        <Tab
          value="comparativo"
          icon={<SlideshowIcon fontSize="small" />}
          iconPosition="start"
          label="Comparativo diferenciais"
        />
      </Tabs>

      {subTab === 'comparativo' ? (
        <ComparativoDiferenciaisDashboard
          cotacaoId={cotacaoId}
          form={form}
          onChange={onChange}
          onPersisted={onPersisted}
          embedded={!embedded}
          onNavigateToLancamento={() => setSubTab('lancamento')}
        />
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              gap={1.5}
              sx={{ mb: fornecedorAtivo ? 1.5 : 0 }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                  Fornecedor
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {fornecedoresVisiveis.map((nome) => (
                    <Chip
                      key={nome}
                      label={nome}
                      color={fornecedorAtivo === nome ? 'primary' : 'default'}
                      variant={fornecedorAtivo === nome ? 'filled' : 'outlined'}
                      onClick={() => setFornecedorAtivo(nome)}
                      disabled={disabled}
                    />
                  ))}
                </Stack>
              </Box>
              {fornecedorAtivo && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SearchIcon />}
                    onClick={openImportPreview}
                    disabled={disabled || !operadoraId}
                  >
                    Consultar catálogo
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SaveAltIcon />}
                    onClick={openSavePreview}
                    disabled={disabled}
                  >
                    Cadastrar no catálogo
                  </Button>
                </Stack>
              )}
            </Stack>
            {!fornecedoresVisiveis.length && (
              <Alert severity="info">
                Cadastre propostas na etapa Aguardando operadora para habilitar os fornecedores.
              </Alert>
            )}
          </Paper>

          {fornecedorAtivo && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, width: '22%' }}>Diferencial</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '24%' }}>Plano</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                    <TableCell sx={{ width: 72 }} align="center">
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DIFERENCIAL_ITENS.map((item) => {
                    const stored = consolidando.diferenciais[item.key]?.[colunaId] ?? []
                    const pendingKey = `${colunaId}:${item.key}`
                    const rows = getEditableCelulas(stored, pendingCellIdsRef.current, pendingKey)
                    return rows.map((celula, idx) => (
                      <TableRow key={`${item.key}-${celula.id}`} hover>
                        <TableCell
                          sx={{
                            verticalAlign: 'top',
                            fontWeight: idx === 0 ? 700 : 400,
                            color: idx === 0 ? 'text.primary' : 'text.secondary',
                            fontSize: idx === 0 ? '0.875rem' : '0.75rem',
                          }}
                        >
                          {idx === 0 ? item.label : ''}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'top' }}>
                          <Autocomplete<DiferencialPlanoOpcao, false, false, true>
                            size="small"
                            freeSolo
                            options={planoOpcoes}
                            groupBy={(opt) => (typeof opt === 'string' ? '' : opt.grupo)}
                            getOptionLabel={(opt) =>
                              typeof opt === 'string' ? opt : opt.planoLabel
                            }
                            isOptionEqualToValue={(a, b) =>
                              typeof a !== 'string' &&
                              typeof b !== 'string' &&
                              a.key === b.key
                            }
                            value={matchDiferencialPlanoOpcao(celula, planoOpcoes) ?? celula.planoLabel}
                            onChange={(_, plano) => {
                              const base = getEditableCelulas(
                                stored,
                                pendingCellIdsRef.current,
                                pendingKey
                              )
                              const label =
                                typeof plano === 'string'
                                  ? plano
                                  : plano?.planoLabel ?? ''
                              const placementPlanoId =
                                typeof plano === 'string'
                                  ? ''
                                  : plano?.placementPlanoId ?? ''
                              const next = base.map((c, i) =>
                                i === idx
                                  ? {
                                      ...c,
                                      placementPlanoId,
                                      planoLabel: label,
                                      fromMaster: false,
                                    }
                                  : c
                              )
                              updateCelulas(item.key, next)
                            }}
                            onInputChange={(_, value, reason) => {
                              if (reason !== 'input') return
                              const base = getEditableCelulas(
                                stored,
                                pendingCellIdsRef.current,
                                pendingKey
                              )
                              const next = base.map((c, i) =>
                                i === idx
                                  ? {
                                      ...c,
                                      planoLabel: value,
                                      placementPlanoId: '',
                                      fromMaster: false,
                                    }
                                  : c
                              )
                              updateCelulas(item.key, next)
                            }}
                            disabled={disabled || !operadoraId}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Selecione ou digite o plano"
                                helperText="Entrada, propostas do comparativo ou catálogo"
                                FormHelperTextProps={{ sx: { mx: 0, mt: 0.5 } }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'top' }}>
                          <PlacementDraftTextField
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={8}
                            size="small"
                            placeholder="Descreva o diferencial…"
                            value={celula.texto}
                            onCommit={(texto) => {
                              const base = getEditableCelulas(
                                stored,
                                pendingCellIdsRef.current,
                                pendingKey
                              )
                              const next = base.map((c, i) =>
                                i === idx ? { ...c, texto, fromMaster: false } : c
                              )
                              updateCelulas(item.key, next)
                            }}
                            disabled={disabled}
                            commitDelayMs={450}
                          />
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'top' }} align="center">
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            <IconButton
                              size="small"
                              color="error"
                              aria-label="Remover linha"
                              disabled={disabled || rows.length <= 1}
                              onClick={() => {
                                const base = getEditableCelulas(
                                  stored,
                                  pendingCellIdsRef.current,
                                  pendingKey
                                )
                                updateCelulas(
                                  item.key,
                                  base.filter((_, i) => i !== idx)
                                )
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                            {idx === rows.length - 1 && (
                              <IconButton
                                size="small"
                                color="primary"
                                aria-label="Adicionar plano"
                                disabled={disabled}
                                onClick={() => addPlanoRow(item.key, stored)}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Resumo de coberturas
          </Typography>
          <PlacementDraftTextField
            fullWidth
            multiline
            minRows={4}
            value={consolidando.resumoCoberturas}
            onCommit={(v) => updateResumo('resumoCoberturas', v)}
            disabled={disabled}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Condições contratuais
          </Typography>
          <PlacementDraftTextField
            fullWidth
            multiline
            minRows={4}
            value={consolidando.condicoesContratuais}
            onCommit={(v) => updateResumo('condicoesContratuais', v)}
            disabled={disabled}
          />
        </>
      )}

      <DiferenciaisCatalogoPreviewDialog
        open={catalogDialogOpen}
        mode={catalogDialogMode}
        fornecedorNome={fornecedorAtivo || 'Todos os fornecedores'}
        rows={previewRows}
        skippedCount={previewSkipped}
        loading={catalogLoading}
        onClose={() => setCatalogDialogOpen(false)}
        onConfirm={() => void handleCatalogConfirm()}
      />

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={5000}
        onClose={() => setSnackMsg(null)}
        message={snackMsg ?? ''}
      />
    </Box>
  )
})

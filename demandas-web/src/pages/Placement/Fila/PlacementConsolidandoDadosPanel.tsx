import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
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
import { CONDICAO_CONTRATUAL_ITENS } from './placementCondicoesContratuaisCatalogo'
import { INDICADOR_OPERADORA_ITENS } from './placementIndicadoresOperadorasCatalogo'
import {
  buildDiferenciaisMasterUpsertItems,
  buildSavePreviewRows,
  buildDiferencialPlanoOpcoes,
  buildCondicoesMasterUpsertItems,
  buildSaveCondicoesPreviewRows,
  buildIndicadoresMasterUpsertItems,
  buildSaveIndicadoresPreviewRows,
  emptyDiferencialCelula,
  ensureConsolidandoDadosState,
  fornecedorColunaId,
  matchDiferencialPlanoOpcao,
  mergeDiferenciaisColuna,
  mergeCondicoesColuna,
  mergeIndicadoresColuna,
  parseConsolidandoDadosFromKickOff,
  patchCondicaoCelulas,
  patchDiferencialCelulas,
  patchIndicadorCelulas,
  previewImportDiferenciaisFromMaster,
  previewImportCondicoesFromMaster,
  previewImportIndicadoresFromMaster,
  isConsolidandoItemOculto,
  toggleConsolidandoItemOculto,
  type ConsolidandoDadosState,
  type DiferencialCelulaCotacao,
  type DiferencialPlanoOpcao,
  type DiferencialPreviewRow,
} from './placementConsolidandoDados'
import { DiferenciaisCatalogoPreviewDialog } from './DiferenciaisCatalogoPreviewDialog'
import { patchKickOffInForm } from './placementPatchKickOff'
import { flushAllRegisteredPlacementDrafts } from './placementFlushRegistry'
import { usePlacementKickOffAutosave } from './usePlacementKickOffAutosave'
import { mercadoNomesComFornecedoresAtuais, normMercadoKey } from './placementMercadoQuadro'
import { ComparativoDiferenciaisDashboard } from './ComparativoDiferenciaisDashboard'
import { PlacementDraftTextField } from './PlacementDraftTextField'
import {
  parseValidacaoPropostaFromKickOff,
  validacaoPropostaItensComAjuste,
} from './placementValidacaoProposta'

type Props = {
  cotacaoId: string
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  onPersisted?: (apiCotacao: unknown) => void
  disabled?: boolean
  embedded?: boolean
  /** Aba inicial ao montar (tela cheia Diferenciais / Condições / Indicadores). */
  initialSubTab?: 'diferenciais' | 'condicoes' | 'indicadores' | 'comparativo'
  /** No comparativo, exibe só esta seção (útil na tela cheia). */
  focusSecao?: 'diferenciais' | 'condicoes' | 'indicadores'
}

type CatalogDialogMode = 'import' | 'save'
type CatalogTarget = 'diferenciais' | 'condicoes' | 'indicadores'

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
  initialSubTab = 'diferenciais',
  focusSecao,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const {
    diferenciais: masterDiferenciais,
    condicoesContratuais: masterCondicoes,
    indicadoresOperadoras: masterIndicadores,
    planos,
    syncDiferenciais,
    syncCondicoesContratuais,
    syncIndicadoresOperadoras,
    syncPlanos,
    upsertDiferenciaisBatch,
    upsertCondicoesContratuaisBatch,
    upsertIndicadoresOperadorasBatch,
  } = usePlacementStore()

  const [subTab, setSubTab] = useState<'diferenciais' | 'condicoes' | 'indicadores' | 'comparativo'>(
    initialSubTab
  )
  const [fornecedorAtivo, setFornecedorAtivo] = useState('')
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false)
  const [catalogDialogMode, setCatalogDialogMode] = useState<CatalogDialogMode>('import')
  const [catalogTarget, setCatalogTarget] = useState<CatalogTarget>('diferenciais')
  const [previewRows, setPreviewRows] = useState<DiferencialPreviewRow[]>([])
  const [previewSkipped, setPreviewSkipped] = useState(0)
  const [pendingImport, setPendingImport] = useState<Record<string, DiferencialCelulaCotacao[]> | null>(
    null
  )
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [snackMsg, setSnackMsg] = useState<string | null>(null)
  const pendingCellIdsRef = React.useRef<Record<string, string>>({})
  const pendingCondicaoCellIdsRef = React.useRef<Record<string, string>>({})
  const pendingIndicadorCellIdsRef = React.useRef<Record<string, string>>({})

  useEffect(() => {
    void syncDiferenciais(true)
    void syncCondicoesContratuais(true)
    void syncIndicadoresOperadoras(true)
    void syncPlanos(true)
  }, [syncDiferenciais, syncCondicoesContratuais, syncIndicadoresOperadoras, syncPlanos])

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

  const fornecedoresRef = useRef(fornecedores)
  fornecedoresRef.current = fornecedores

  const formRef = useRef(form)
  formRef.current = form

  const { scheduleSave, saveState, flushPendingSave } = usePlacementKickOffAutosave({
    cotacaoId,
    onPersisted,
  })

  const applyConsolidando = useCallback(
    (
      patcher: (current: ConsolidandoDadosState) => ConsolidandoDadosState,
      immediate?: boolean
    ) => {
      const current = ensureConsolidandoDadosState(
        parseConsolidandoDadosFromKickOff(formRef.current.kickOffEstrategia)
      )
      const nextCd = patcher(current)
      const nextForm = patchKickOffInForm(
        formRef.current,
        { consolidandoDados: nextCd },
        fornecedoresRef.current
      )
      formRef.current = nextForm
      onChange(nextForm)
      scheduleSave(nextForm.kickOffEstrategia!, immediate)
    },
    [onChange, scheduleSave]
  )

  // Garante flush ao sair da tela/etapa (debounce não pode perder edição).
  useEffect(
    () => () => {
      void flushPendingSave()
    },
    [flushPendingSave]
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
    if (subTab === 'condicoes') {
      const { imported, rows } = previewImportCondicoesFromMaster({
        operadoraId,
        masterCondicoes,
        placementPlanos: planos,
        propostaPlanos,
      })
      setCatalogTarget('condicoes')
      setCatalogDialogMode('import')
      setPreviewRows(rows)
      setPreviewSkipped(0)
      setPendingImport(imported)
      setCatalogDialogOpen(true)
      return
    }
    if (subTab === 'indicadores') {
      const { imported, rows } = previewImportIndicadoresFromMaster({
        operadoraId,
        masterIndicadores,
      })
      setCatalogTarget('indicadores')
      setCatalogDialogMode('import')
      setPreviewRows(rows)
      setPreviewSkipped(0)
      setPendingImport(imported)
      setCatalogDialogOpen(true)
      return
    }
    const { imported, rows } = previewImportDiferenciaisFromMaster({
      operadoraId,
      masterDiferenciais,
      placementPlanos: planos,
      propostaPlanos,
    })
    setCatalogTarget('diferenciais')
    setCatalogDialogMode('import')
    setPreviewRows(rows)
    setPreviewSkipped(0)
    setPendingImport(imported)
    setCatalogDialogOpen(true)
  }

  const openSavePreview = () => {
    if (subTab === 'condicoes') {
      const { items, skipped } = buildCondicoesMasterUpsertItems(consolidando, {
        fornecedores,
        resolveOperadoraId: resolveOperadoraIdCb,
        placementPlanos: planos,
        propostasByColuna: aguardandoOperadora.propostas,
      })
      const rows = buildSaveCondicoesPreviewRows(
        fornecedorAtivo ? items.filter((i) => i.operadoraId === operadoraId) : items,
        planos
      )
      setCatalogTarget('condicoes')
      setCatalogDialogMode('save')
      setPreviewRows(rows)
      setPreviewSkipped(skipped)
      setPendingImport(null)
      setCatalogDialogOpen(true)
      return
    }
    if (subTab === 'indicadores') {
      const { items, skipped } = buildIndicadoresMasterUpsertItems(consolidando, {
        fornecedores,
        resolveOperadoraId: resolveOperadoraIdCb,
      })
      const rows = buildSaveIndicadoresPreviewRows(
        fornecedorAtivo ? items.filter((i) => i.operadoraId === operadoraId) : items
      )
      setCatalogTarget('indicadores')
      setCatalogDialogMode('save')
      setPreviewRows(rows)
      setPreviewSkipped(skipped)
      setPendingImport(null)
      setCatalogDialogOpen(true)
      return
    }
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
    setCatalogTarget('diferenciais')
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
        if (catalogTarget === 'condicoes') {
          applyConsolidando(
            (cd) => mergeCondicoesColuna(cd, colunaId, pendingImport, true),
            true
          )
          setSnackMsg(`${previewRows.length} condição(ões) importada(s) para esta cotação.`)
        } else if (catalogTarget === 'indicadores') {
          applyConsolidando(
            (cd) => mergeIndicadoresColuna(cd, colunaId, pendingImport, true),
            true
          )
          setSnackMsg(`${previewRows.length} indicador(es) importado(s) para esta cotação.`)
        } else {
          applyConsolidando(
            (cd) => mergeDiferenciaisColuna(cd, colunaId, pendingImport, true),
            true
          )
          setSnackMsg(`${previewRows.length} diferencial(is) importado(s) para esta cotação.`)
        }
      } else if (catalogTarget === 'condicoes') {
        const { items } = buildCondicoesMasterUpsertItems(consolidando, {
          fornecedores,
          resolveOperadoraId: resolveOperadoraIdCb,
          placementPlanos: planos,
          propostasByColuna: aguardandoOperadora.propostas,
        })
        const toSave = fornecedorAtivo
          ? items.filter((i) => i.operadoraId === operadoraId)
          : items
        if (!toSave.length) return
        const result = await upsertCondicoesContratuaisBatch(toSave)
        setSnackMsg(`${result.synced} registro(s) cadastrado(s) em Dados → Condições contratuais.`)
      } else if (catalogTarget === 'indicadores') {
        const { items } = buildIndicadoresMasterUpsertItems(consolidando, {
          fornecedores,
          resolveOperadoraId: resolveOperadoraIdCb,
        })
        const toSave = fornecedorAtivo
          ? items.filter((i) => i.operadoraId === operadoraId)
          : items
        if (!toSave.length) return
        const result = await upsertIndicadoresOperadorasBatch(toSave)
        setSnackMsg(`${result.synced} registro(s) cadastrado(s) em Dados → Indicadores operadoras.`)
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

  const updateCelulas = (
    itemKey: string,
    mutate: (base: DiferencialCelulaCotacao[]) => DiferencialCelulaCotacao[]
  ) => {
    if (!colunaId) return
    const pendingKey = `${colunaId}:${itemKey}`
    applyConsolidando((cd) => {
      const stored = cd.diferenciais[itemKey]?.[colunaId] ?? []
      const base = getEditableCelulas(stored, pendingCellIdsRef.current, pendingKey)
      const next = mutate(base)
      delete pendingCellIdsRef.current[pendingKey]
      return patchDiferencialCelulas(cd, itemKey, colunaId, next)
    })
  }

  const updateCondicaoCelulas = (
    itemKey: string,
    mutate: (base: DiferencialCelulaCotacao[]) => DiferencialCelulaCotacao[]
  ) => {
    if (!colunaId) return
    const pendingKey = `${colunaId}:${itemKey}`
    applyConsolidando((cd) => {
      const stored = cd.condicoes[itemKey]?.[colunaId] ?? []
      const base = getEditableCelulas(stored, pendingCondicaoCellIdsRef.current, pendingKey)
      const next = mutate(base)
      delete pendingCondicaoCellIdsRef.current[pendingKey]
      return patchCondicaoCelulas(cd, itemKey, colunaId, next)
    })
  }

  const updateIndicadorCelulas = (
    itemKey: string,
    mutate: (base: DiferencialCelulaCotacao[]) => DiferencialCelulaCotacao[]
  ) => {
    if (!colunaId) return
    const pendingKey = `${colunaId}:${itemKey}`
    applyConsolidando((cd) => {
      const stored = cd.indicadores[itemKey]?.[colunaId] ?? []
      const base = getEditableCelulas(stored, pendingIndicadorCellIdsRef.current, pendingKey)
      const next = mutate(base)
      delete pendingIndicadorCellIdsRef.current[pendingKey]
      return patchIndicadorCelulas(cd, itemKey, colunaId, next)
    })
  }

  const addPlanoRow = (itemKey: string) => {
    updateCelulas(itemKey, (base) => [...base, emptyDiferencialCelula()])
  }

  const addCondicaoPlanoRow = (itemKey: string) => {
    updateCondicaoCelulas(itemKey, (base) => [...base, emptyDiferencialCelula()])
  }

  const addIndicadorRow = (itemKey: string) => {
    updateIndicadorCelulas(itemKey, (base) => [...base, emptyDiferencialCelula()])
  }

  const updateResumo = (field: 'resumoCoberturas' | 'condicoesContratuais', value: string) => {
    applyConsolidando((cd) => ({ ...cd, [field]: value }))
  }

  const toggleItemNaProposta = (
    secao: 'diferenciais' | 'condicoes' | 'indicadores',
    itemKey: string
  ) => {
    applyConsolidando((cd) => toggleConsolidandoItemOculto(cd, secao, itemKey), true)
  }

  const goToSubTab = (next: typeof subTab) => {
    if (next === 'comparativo') {
      flushAllRegisteredPlacementDrafts()
      void flushPendingSave()
    }
    setSubTab(next)
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

      {(() => {
        const ajustes = validacaoPropostaItensComAjuste(
          parseValidacaoPropostaFromKickOff(form.kickOffEstrategia)
        )
        if (!ajustes.length) return null
        return (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Ajustes solicitados na Validação do consolidado
            </Typography>
            <Stack component="ul" sx={{ m: 0, pl: 2 }}>
              {ajustes.map((a) => (
                <Typography key={a.id} component="li" variant="body2">
                  <strong>{a.label}:</strong> {a.comentario || '—'}
                </Typography>
              ))}
            </Stack>
          </Alert>
        )
      })()}

      <Tabs value={subTab} onChange={(_, v) => goToSubTab(v)} sx={{ mb: 2 }}>
        <Tab value="diferenciais" label="Diferenciais" />
        <Tab value="condicoes" label="Condições contratuais" />
        <Tab value="indicadores" label="Indicadores operadoras" />
        <Tab
          value="comparativo"
          icon={<SlideshowIcon fontSize="small" />}
          iconPosition="start"
          label="Comparativo"
        />
      </Tabs>

      {subTab === 'comparativo' ? (
        <ComparativoDiferenciaisDashboard
          cotacaoId={cotacaoId}
          form={form}
          onChange={onChange}
          onPersisted={onPersisted}
          embedded={!embedded}
          secaoFiltro={focusSecao}
          onNavigateToLancamento={() =>
            setSubTab(
              focusSecao === 'condicoes'
                ? 'condicoes'
                : focusSecao === 'indicadores'
                  ? 'indicadores'
                  : 'diferenciais'
            )
          }
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
              {fornecedorAtivo &&
                (subTab === 'diferenciais' ||
                  subTab === 'condicoes' ||
                  subTab === 'indicadores') && (
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

          {fornecedorAtivo && subTab === 'diferenciais' && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
                Use o ícone de olho para ocultar um item na proposta/comparativo. Itens ocultos continuam
                editáveis aqui.
              </Alert>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, width: 56 }} align="center">
                      Proposta
                    </TableCell>
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
                    const oculto = isConsolidandoItemOculto(consolidando, 'diferenciais', item.key)
                    return rows.map((celula, idx) => (
                      <TableRow
                        key={`${item.key}-${celula.id}`}
                        hover
                        sx={oculto ? { opacity: 0.55, bgcolor: 'action.hover' } : undefined}
                      >
                        <TableCell sx={{ verticalAlign: 'top' }} align="center">
                          {idx === 0 ? (
                            <Tooltip
                              title={
                                oculto
                                  ? 'Oculto na proposta — clique para exibir'
                                  : 'Visível na proposta — clique para ocultar'
                              }
                            >
                              <IconButton
                                size="small"
                                color={oculto ? 'default' : 'primary'}
                                aria-label={oculto ? 'Exibir na proposta' : 'Ocultar na proposta'}
                                disabled={disabled}
                                onClick={() => toggleItemNaProposta('diferenciais', item.key)}
                              >
                                {oculto ? (
                                  <VisibilityOffIcon fontSize="small" />
                                ) : (
                                  <VisibilityIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </TableCell>
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
                              const label =
                                typeof plano === 'string'
                                  ? plano
                                  : plano?.planoLabel ?? ''
                              const placementPlanoId =
                                typeof plano === 'string'
                                  ? ''
                                  : plano?.placementPlanoId ?? ''
                              updateCelulas(item.key, (base) =>
                                base.map((c, i) =>
                                  i === idx
                                    ? {
                                        ...c,
                                        placementPlanoId,
                                        planoLabel: label,
                                        fromMaster: false,
                                      }
                                    : c
                                )
                              )
                            }}
                            onInputChange={(_, value, reason) => {
                              if (reason !== 'input') return
                              updateCelulas(item.key, (base) =>
                                base.map((c, i) =>
                                  i === idx
                                    ? {
                                        ...c,
                                        planoLabel: value,
                                        placementPlanoId: '',
                                        fromMaster: false,
                                      }
                                    : c
                                )
                              )
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
                              updateCelulas(item.key, (base) =>
                                base.map((c, i) =>
                                  i === idx ? { ...c, texto, fromMaster: false } : c
                                )
                              )
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
                                updateCelulas(item.key, (base) =>
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
                                onClick={() => addPlanoRow(item.key)}
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

          {fornecedorAtivo && subTab === 'condicoes' && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
                Use o ícone de olho para ocultar uma condição na proposta/comparativo.
              </Alert>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, width: 56 }} align="center">
                      Proposta
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '26%' }}>Condição</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '22%' }}>
                      Plano
                      <Typography component="span" variant="caption" color="text.secondary" display="block">
                        Opcional — em branco = geral do fornecedor
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                    <TableCell sx={{ width: 72 }} align="center">
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {CONDICAO_CONTRATUAL_ITENS.map((item) => {
                    const stored = consolidando.condicoes[item.key]?.[colunaId] ?? []
                    const pendingKey = `${colunaId}:${item.key}`
                    const rows = getEditableCelulas(
                      stored,
                      pendingCondicaoCellIdsRef.current,
                      pendingKey
                    )
                    const oculto = isConsolidandoItemOculto(consolidando, 'condicoes', item.key)
                    return rows.map((celula, idx) => (
                      <TableRow
                        key={`${item.key}-${celula.id}`}
                        hover
                        sx={oculto ? { opacity: 0.55, bgcolor: 'action.hover' } : undefined}
                      >
                        <TableCell sx={{ verticalAlign: 'top' }} align="center">
                          {idx === 0 ? (
                            <Tooltip
                              title={
                                oculto
                                  ? 'Oculto na proposta — clique para exibir'
                                  : 'Visível na proposta — clique para ocultar'
                              }
                            >
                              <IconButton
                                size="small"
                                color={oculto ? 'default' : 'primary'}
                                aria-label={oculto ? 'Exibir na proposta' : 'Ocultar na proposta'}
                                disabled={disabled}
                                onClick={() => toggleItemNaProposta('condicoes', item.key)}
                              >
                                {oculto ? (
                                  <VisibilityOffIcon fontSize="small" />
                                ) : (
                                  <VisibilityIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </TableCell>
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
                              const label =
                                typeof plano === 'string' ? plano : plano?.planoLabel ?? ''
                              const placementPlanoId =
                                typeof plano === 'string' ? '' : plano?.placementPlanoId ?? ''
                              updateCondicaoCelulas(item.key, (base) =>
                                base.map((c, i) =>
                                  i === idx
                                    ? {
                                        ...c,
                                        placementPlanoId,
                                        planoLabel: label,
                                        fromMaster: false,
                                      }
                                    : c
                                )
                              )
                            }}
                            onInputChange={(_, value, reason) => {
                              if (reason !== 'input') return
                              updateCondicaoCelulas(item.key, (base) =>
                                base.map((c, i) =>
                                  i === idx
                                    ? {
                                        ...c,
                                        planoLabel: value,
                                        placementPlanoId: '',
                                        fromMaster: false,
                                      }
                                    : c
                                )
                              )
                            }}
                            disabled={disabled || !operadoraId}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Geral ou por plano"
                                helperText="Deixe vazio para vigorar em todo o fornecedor"
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
                            placeholder="Descreva a condição…"
                            value={celula.texto}
                            onCommit={(texto) => {
                              updateCondicaoCelulas(item.key, (base) =>
                                base.map((c, i) =>
                                  i === idx ? { ...c, texto, fromMaster: false } : c
                                )
                              )
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
                                updateCondicaoCelulas(item.key, (base) =>
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
                                aria-label="Adicionar variação por plano"
                                disabled={disabled}
                                onClick={() => addCondicaoPlanoRow(item.key)}
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

          {fornecedorAtivo && subTab === 'indicadores' && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
                Use o ícone de olho para ocultar um indicador na proposta/comparativo.
              </Alert>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, width: 56 }} align="center">
                      Proposta
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '32%' }}>Indicador</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Valor/Descrição</TableCell>
                    <TableCell sx={{ width: 72 }} align="center">
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {INDICADOR_OPERADORA_ITENS.map((item) => {
                    const stored = consolidando.indicadores[item.key]?.[colunaId] ?? []
                    const pendingKey = `${colunaId}:${item.key}`
                    const rows = getEditableCelulas(
                      stored,
                      pendingIndicadorCellIdsRef.current,
                      pendingKey
                    )
                    const oculto = isConsolidandoItemOculto(consolidando, 'indicadores', item.key)
                    return rows.map((celula, idx) => (
                      <TableRow
                        key={`${item.key}-${celula.id}`}
                        hover
                        sx={oculto ? { opacity: 0.55, bgcolor: 'action.hover' } : undefined}
                      >
                        <TableCell sx={{ verticalAlign: 'top' }} align="center">
                          {idx === 0 ? (
                            <Tooltip
                              title={
                                oculto
                                  ? 'Oculto na proposta — clique para exibir'
                                  : 'Visível na proposta — clique para ocultar'
                              }
                            >
                              <IconButton
                                size="small"
                                color={oculto ? 'default' : 'primary'}
                                aria-label={oculto ? 'Exibir na proposta' : 'Ocultar na proposta'}
                                disabled={disabled}
                                onClick={() => toggleItemNaProposta('indicadores', item.key)}
                              >
                                {oculto ? (
                                  <VisibilityOffIcon fontSize="small" />
                                ) : (
                                  <VisibilityIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </TableCell>
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
                          <PlacementDraftTextField
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={8}
                            size="small"
                            placeholder="Informe o valor ou descrição do indicador…"
                            value={celula.texto}
                            onCommit={(texto) => {
                              updateIndicadorCelulas(item.key, (base) =>
                                base.map((c, i) =>
                                  i === idx ? { ...c, texto, fromMaster: false } : c
                                )
                              )
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
                                updateIndicadorCelulas(item.key, (base) =>
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
                                aria-label="Adicionar linha"
                                disabled={disabled}
                                onClick={() => addIndicadorRow(item.key)}
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

          {subTab === 'diferenciais' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Resumo de coberturas (opcional)
              </Typography>
              <PlacementDraftTextField
                fullWidth
                multiline
                minRows={4}
                placeholder="Texto livre opcional para a proposta…"
                value={consolidando.resumoCoberturas}
                onCommit={(v) => updateResumo('resumoCoberturas', v)}
                disabled={disabled}
              />
            </>
          )}

          {subTab === 'condicoes' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Observações (alternativa se a matriz estiver vazia)
              </Typography>
              <PlacementDraftTextField
                fullWidth
                multiline
                minRows={3}
                placeholder="Notas livres — obrigatórias só se a matriz de condições não tiver texto…"
                value={consolidando.condicoesContratuais}
                onCommit={(v) => updateResumo('condicoesContratuais', v)}
                disabled={disabled}
              />
            </>
          )}
        </>
      )}

      <DiferenciaisCatalogoPreviewDialog
        open={catalogDialogOpen}
        mode={catalogDialogMode}
        catalogLabel={
          catalogTarget === 'condicoes'
            ? 'Condições contratuais'
            : catalogTarget === 'indicadores'
              ? 'Indicadores operadoras'
              : 'Diferenciais'
        }
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

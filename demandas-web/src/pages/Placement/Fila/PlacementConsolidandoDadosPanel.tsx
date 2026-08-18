import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import SaveIcon from '@mui/icons-material/Save'
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
import { listDiferencialItens } from './placementDiferenciaisCatalogo'
import { CONDICAO_CONTRATUAL_ITENS } from './placementCondicoesContratuaisCatalogo'
import { INDICADOR_OPERADORA_ITENS } from './placementIndicadoresOperadorasCatalogo'
import {
  addCustomDiferencialItem,
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
  removeCustomDiferencialItem,
  replicarDiferencialParaColunas,
  replicarCondicaoParaColunas,
  diferencialCelulasTemConteudo,
  isConsolidandoItemOculto,
  toggleConsolidandoItemOculto,
  type ConsolidandoDadosState,
  type DiferencialCelulaCotacao,
  type DiferencialPreviewRow,
} from './placementConsolidandoDados'
import { DiferencialPlanoMultiSelect } from './DiferencialPlanoMultiSelect'
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
  const [addDiffOpen, setAddDiffOpen] = useState(false)
  const [addDiffLabel, setAddDiffLabel] = useState('')
  const [addDiffError, setAddDiffError] = useState('')
  const [replicarItem, setReplicarItem] = useState<{
    key: string
    label: string
    secao: 'diferenciais' | 'condicoes'
  } | null>(null)
  const [replicarTargets, setReplicarTargets] = useState<string[]>([])
  const [replicarOnlyEmpty, setReplicarOnlyEmpty] = useState(false)

  useEffect(() => {
    if (
      initialSubTab === 'diferenciais' ||
      initialSubTab === 'condicoes' ||
      initialSubTab === 'indicadores'
    ) {
      setSubTab(initialSubTab)
    }
  }, [initialSubTab])

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

  const diferencialItens = useMemo(
    () => listDiferencialItens(consolidando.itensExtras?.diferenciais),
    [consolidando.itensExtras]
  )

  const outrosFornecedores = useMemo(
    () => fornecedoresVisiveis.filter((nome) => nome !== fornecedorAtivo),
    [fornecedoresVisiveis, fornecedorAtivo]
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

  const openReplicar = (
    item: { key: string; label: string },
    secao: 'diferenciais' | 'condicoes'
  ) => {
    setReplicarItem({ ...item, secao })
    setReplicarTargets(outrosFornecedores)
    setReplicarOnlyEmpty(false)
  }

  const confirmReplicar = () => {
    if (!replicarItem || !colunaId) return
    const destinos = replicarTargets.map((nome) => fornecedorColunaId(nome)).filter(Boolean)
    applyConsolidando((cd) => {
      if (replicarItem.secao === 'condicoes') {
        return replicarCondicaoParaColunas(cd, replicarItem.key, colunaId, destinos, {
          onlyEmpty: replicarOnlyEmpty,
        })
      }
      return replicarDiferencialParaColunas(cd, replicarItem.key, colunaId, destinos, {
        onlyEmpty: replicarOnlyEmpty,
      })
    }, true)
    const n = destinos.filter((id) => id !== colunaId).length
    setSnackMsg(
      n === 1
        ? `${replicarItem.label} replicado para 1 fornecedor.`
        : `${replicarItem.label} replicado para ${n} fornecedores.`
    )
    setReplicarItem(null)
  }

  const confirmAddDiferencial = () => {
    const current = ensureConsolidandoDadosState(
      parseConsolidandoDadosFromKickOff(formRef.current.kickOffEstrategia)
    )
    const result = addCustomDiferencialItem(current, addDiffLabel)
    if (!result.ok) {
      setAddDiffError(result.error)
      return
    }
    applyConsolidando(() => result.state, true)
    setAddDiffOpen(false)
    setAddDiffLabel('')
    setAddDiffError('')
    setSnackMsg(
      'Diferencial adicionado. Preencha a descrição e, se quiser, replique para os outros fornecedores.'
    )
  }

  const removeDiferencialCustom = (itemKey: string, label: string) => {
    if (!window.confirm(`Remover o diferencial "${label}" desta cotação?`)) return
    applyConsolidando((cd) => removeCustomDiferencialItem(cd, itemKey), true)
  }

  const goToSubTab = (next: typeof subTab) => {
    if (next === 'comparativo') {
      flushAllRegisteredPlacementDrafts()
      void flushPendingSave()
    }
    setSubTab(next)
  }

  const handleSalvarConteudo = async () => {
    flushAllRegisteredPlacementDrafts()
    await flushPendingSave()
    setSnackMsg('Conteúdo salvo.')
  }

  const salvarConteudoBar = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
      {saveState === 'saving' && (
        <Typography variant="caption" color="text.secondary">
          Salvando…
        </Typography>
      )}
      {saveState === 'saved' && (
        <Typography variant="caption" color="success.main">
          Salvo
        </Typography>
      )}
      {saveState === 'error' && (
        <Typography variant="caption" color="error">
          Erro ao salvar
        </Typography>
      )}
      <Button
        size="small"
        variant="contained"
        startIcon={<SaveIcon />}
        disabled={disabled || saveState === 'saving'}
        onClick={() => void handleSalvarConteudo()}
      >
        {saveState === 'saving' ? 'Salvando…' : 'Salvar conteúdo'}
      </Button>
    </Stack>
  )

  return (
    <Box sx={{ minHeight: 0 }}>
      {!embedded && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
          gap={1}
          sx={{ mb: 1, alignContent: 'flex-start' }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ mr: 1, whiteSpace: 'nowrap' }}>
            Consolidando dados
          </Typography>
          <Tabs
            value={subTab}
            onChange={(_, v) => goToSubTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              height: 36,
              flex: '1 1 auto',
              minWidth: 0,
              '& .MuiTabs-scroller': { height: 36 },
              '& .MuiTab-root': {
                minHeight: 36,
                py: 0.5,
                px: 1.25,
                textTransform: 'none',
                fontWeight: 700,
              },
              '& .MuiTab-iconWrapper': { mb: '0 !important', mr: 0.5 },
            }}
          >
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
          {salvarConteudoBar}
        </Stack>
      )}

      {(() => {
        const ajustes = validacaoPropostaItensComAjuste(
          parseValidacaoPropostaFromKickOff(form.kickOffEstrategia)
        )
        if (!ajustes.length) return null
        return (
          <Alert severity="warning" sx={{ mb: 1, py: 0.5 }}>
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
          <Paper variant="outlined" sx={{ px: 1.5, py: 1, mb: 1.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              gap={1}
            >
              <Box>
                <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>
                    Fornecedor
                  </Typography>
                  {fornecedoresVisiveis.map((nome) => (
                    <Chip
                      key={nome}
                      size="small"
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
              <Alert severity="info" sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider', py: 0.5 }}>
                Olho oculta na proposta. Copiar replica para outros fornecedores.
              </Alert>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700, width: 56 }} align="center">
                      Proposta
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '22%' }}>Diferencial</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '24%' }}>
                      Plano
                      <Typography component="span" variant="caption" color="text.secondary" display="block">
                        Um ou mais planos com a mesma descrição
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                    <TableCell sx={{ width: 132 }} align="center">
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {diferencialItens.map((item) => {
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
                          <DiferencialPlanoMultiSelect
                            celula={celula}
                            options={planoOpcoes}
                            disabled={disabled || !operadoraId}
                            placeholder="Selecione um ou mais planos"
                            helperText="A descrição vale para todos os planos marcados"
                            onChange={(next) => {
                              updateCelulas(item.key, (base) =>
                                base.map((c, i) => (i === idx ? next : c))
                              )
                            }}
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
                            {idx === 0 && (
                              <Tooltip title="Replicar este diferencial para outros fornecedores">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    aria-label="Replicar para outros fornecedores"
                                    disabled={
                                      disabled ||
                                      outrosFornecedores.length === 0 ||
                                      !diferencialCelulasTemConteudo(rows)
                                    }
                                    onClick={() => openReplicar(item, 'diferenciais')}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
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
                            {idx === 0 && item.custom && (
                              <Tooltip title="Remover este diferencial da cotação">
                                <IconButton
                                  size="small"
                                  color="error"
                                  aria-label="Remover diferencial"
                                  disabled={disabled}
                                  onClick={() => removeDiferencialCustom(item.key, item.label)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
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

          {fornecedorAtivo && subTab === 'diferenciais' && (
            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={disabled}
                onClick={() => {
                  setAddDiffLabel('')
                  setAddDiffError('')
                  setAddDiffOpen(true)
                }}
              >
                Adicionar diferencial
              </Button>
            </Box>
          )}

          {fornecedorAtivo && subTab === 'condicoes' && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider', py: 0.5 }}>
                Olho oculta a condição na proposta. Copiar replica para outros fornecedores.
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
                        Opcional — vazio = geral; vários = mesma condição
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                    <TableCell sx={{ width: 132 }} align="center">
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
                          <DiferencialPlanoMultiSelect
                            celula={celula}
                            options={planoOpcoes}
                            disabled={disabled || !operadoraId}
                            placeholder="Geral ou um/mais planos"
                            helperText="Vazio = todo o fornecedor; vários planos compartilham a descrição"
                            onChange={(next) => {
                              updateCondicaoCelulas(item.key, (base) =>
                                base.map((c, i) => (i === idx ? next : c))
                              )
                            }}
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
                            {idx === 0 && (
                              <Tooltip title="Replicar esta condição para outros fornecedores">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    aria-label="Replicar para outros fornecedores"
                                    disabled={
                                      disabled ||
                                      outrosFornecedores.length === 0 ||
                                      !diferencialCelulasTemConteudo(rows)
                                    }
                                    onClick={() => openReplicar(item, 'condicoes')}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
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
              <Alert severity="info" sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider', py: 0.5 }}>
                Olho oculta o indicador na proposta.
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

          {embedded && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2.5, mb: 1 }}>
              {salvarConteudoBar}
            </Stack>
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

      <Dialog open={addDiffOpen} onClose={() => setAddDiffOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar diferencial</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            O item entra nesta cotação para todos os fornecedores. Depois de preencher, use copiar
            para replicar a mesma resposta.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nome do diferencial"
            placeholder="Ex.: REEMBOLSO INTERNACIONAL"
            value={addDiffLabel}
            onChange={(e) => {
              setAddDiffLabel(e.target.value)
              if (addDiffError) setAddDiffError('')
            }}
            error={Boolean(addDiffError)}
            helperText={addDiffError || 'Use um nome curto, no mesmo estilo dos itens da lista.'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmAddDiferencial()
              }
            }}
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDiffOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmAddDiferencial} disabled={!addDiffLabel.trim()}>
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(replicarItem)}
        onClose={() => setReplicarItem(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Replicar {replicarItem?.label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Copia plano e descrição de <strong>{fornecedorAtivo}</strong> para os fornecedores
            selecionados.
          </Typography>
          <Stack>
            {outrosFornecedores.map((nome) => (
              <FormControlLabel
                key={nome}
                control={
                  <Checkbox
                    checked={replicarTargets.includes(nome)}
                    onChange={(e) => {
                      setReplicarTargets((curr) =>
                        e.target.checked ? [...curr, nome] : curr.filter((n) => n !== nome)
                      )
                    }}
                  />
                }
                label={nome}
              />
            ))}
          </Stack>
          {!outrosFornecedores.length && (
            <Alert severity="info">Não há outro fornecedor no comparativo para receber a cópia.</Alert>
          )}
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={replicarOnlyEmpty}
                onChange={(e) => setReplicarOnlyEmpty(e.target.checked)}
              />
            }
            label="Só preencher destino vazio (não substituir o que já foi lançado)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplicarItem(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={confirmReplicar}
            disabled={!replicarTargets.length}
          >
            Replicar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={5000}
        onClose={() => setSnackMsg(null)}
        message={snackMsg ?? ''}
      />
    </Box>
  )
})

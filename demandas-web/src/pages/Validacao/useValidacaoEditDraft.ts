import { useState, useEffect } from 'react'
import { useValidationStore } from '../../store/validationStore'
import { relationId, validateContratoParaCliente } from '../../utils/validationRelations'
import { filterContratosDoCliente } from '../../utils/manutencaoContratos'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import { ValidationEntry } from '../../types/validation'
import {
  ESTRUTURA_EDGE_OPTIONS,
  ESTRUTURA_MOVE_OPTIONS,
  calcTotalFromEstrutura,
  countEstruturaSelections,
  normalizeEstruturaArray,
} from './validacaoEstruturaOptions'
import {
  inferItensConcluidosDetalhe,
  parseItensConcluidosDetalhe,
  sumItensConcluidosDetalhe,
} from './validacaoItensConcluidos'
import {
  formatValidacaoTimelineValue,
  getValidacaoTimelineFieldLabel,
  getValidacaoTrackedFields,
} from './validacaoTimelineFormat'

export type ValidacaoFormMode = 'legacy' | 'novo'

const normalizeArrayField = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function buildNormalizedDraft(validation: ValidationEntry, formMode: ValidacaoFormMode) {
  const clienteNorm = relationId(validation.cliente, validation.clienteId) || undefined
  const contratoNorm = relationId(validation.contrato, validation.contratoId) || undefined
  const operadoraNorm = relationId(validation.operadora, validation.operadoraId) || undefined
  const produtoNorm = relationId(validation.produto, validation.produtoId) || undefined

  const base = {
    ...validation,
    tipo: validation.tipo || '',
    cliente: clienteNorm,
    clienteId: clienteNorm,
    contrato: contratoNorm,
    contratoId: contratoNorm,
    operadora: operadoraNorm,
    operadoraId: operadoraNorm,
    produto: produtoNorm,
    produtoId: produtoNorm,
    analista:
      validation.analista != null && typeof validation.analista === 'object'
        ? (validation.analista as { id: string }).id
        : validation.analista || '',
    solicitante:
      validation.solicitante != null && typeof validation.solicitante === 'object'
        ? (validation.solicitante as { id: string }).id
        : validation.solicitante || '',
    estruturaEdge: normalizeEstruturaArray(
      normalizeArrayField(validation.estruturaEdge),
      ESTRUTURA_EDGE_OPTIONS
    ),
    estruturaMove: normalizeEstruturaArray(
      normalizeArrayField(validation.estruturaMove),
      ESTRUTURA_MOVE_OPTIONS
    ),
  }

  if (formMode === 'novo') {
    return {
      ...base,
      itensConcluidosDetalhe: inferItensConcluidosDetalhe(
        validation.itensConcluidos,
        validation.itensConcluidosDetalhe,
        validation.tipo
      ),
    }
  }

  return base
}

export type ValidacaoEditDraftReturn = ReturnType<typeof useValidacaoEditDraft>

export function useValidacaoEditDraft(validation: ValidationEntry, formMode: ValidacaoFormMode) {
  const md = useMasterDataStore()
  const store = useValidationStore()

  const [draft, setDraft] = useState(() =>
    buildNormalizedDraft(validation, formMode)
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const clienteIdNormalized =
    draft.cliente != null && typeof draft.cliente === 'object'
      ? (draft.cliente as { id: string }).id
      : draft.cliente

  const clienteSelecionadoData = clienteIdNormalized
    ? md.clientes.find((cliente) => cliente.id === clienteIdNormalized)
    : null

  const contratosDoCliente = clienteIdNormalized
    ? filterContratosDoCliente(
        md.contratos,
        clienteIdNormalized,
        clienteSelecionadoData?.grupoEconomico || null
      )
    : []

  const produtosFiltrados = draft.operadora
    ? md.produtos.filter((p) => p.operadoraId === draft.operadora || !p.operadoraId)
    : md.produtos

  const analistaResponsavelNome = (() => {
    const a = draft.analista ?? validation.analista
    if (a == null) return '-'
    if (typeof a === 'string') {
      return md.analistas.find((x) => x.id === a)?.nome || a || '-'
    }
    if (typeof a === 'object' && a !== null) {
      return (a as { nome?: string }).nome || '-'
    }
    return '-'
  })()

  useEffect(() => {
    setDraft(buildNormalizedDraft(validation, formMode))
  }, [
    validation.id,
    validation.tipo,
    validation.contrato,
    validation.contratoId,
    validation.cliente,
    validation.clienteId,
    validation.operadora,
    validation.operadoraId,
    validation.produto,
    validation.produtoId,
    validation.analista,
    validation.estruturaEdge,
    validation.estruturaMove,
    validation.itensConcluidos,
    validation.itensConcluidosDetalhe,
    formMode,
  ])

  const totalCalculado =
    calcTotalFromEstrutura(draft.estruturaEdge) + calcTotalFromEstrutura(draft.estruturaMove)
  const edgeSelections = countEstruturaSelections(draft.estruturaEdge, ESTRUTURA_EDGE_OPTIONS)
  const moveSelections = countEstruturaSelections(draft.estruturaMove, ESTRUTURA_MOVE_OPTIONS)

  const changedKeys = ((): string[] => {
    const keys = getValidacaoTrackedFields(formMode)

    const changed = keys.filter((k) => {
      let validationValue: unknown
      switch (k) {
        case 'analista':
          validationValue = validation.analista
          break
        case 'dataInicio':
          validationValue = validation.dataInicio
          break
        case 'dataFinal':
          validationValue = validation.dataFinal
          break
        case 'status':
          validationValue = validation.status
          break
        case 'ticket':
          validationValue = validation.ticket
          break
        case 'solicitante':
          validationValue = validation.solicitante
          break
        case 'demanda':
          validationValue = validation.demanda
          break
        case 'tipo':
          validationValue = validation.tipo
          break
        case 'descricao':
          validationValue = validation.descricao
          break
        case 'observacoes':
          validationValue = validation.observacoes
          break
        case 'cliente':
          validationValue = validation.cliente
          break
        case 'contrato':
          validationValue = relationId(validation.contrato, validation.contratoId)
          break
        case 'operadora':
          validationValue = validation.operadora
          break
        case 'produto':
          validationValue = validation.produto
          break
        case 'vigencia':
          validationValue = validation.vigencia
          break
        case 'qtdRetornos':
          validationValue = validation.qtdRetornos
          break
        case 'qualidade':
          validationValue = validation.qualidade
          break
        case 'estruturaEdge':
          validationValue = validation.estruturaEdge
          break
        case 'estruturaMove':
          validationValue = validation.estruturaMove
          break
        case 'formalizacao':
          validationValue = validation.formalizacao
          break
        case 'itensPendentes':
          validationValue = validation.itensPendentes
          break
        case 'total':
          validationValue = validation.total ?? 0
          break
        case 'itensConcluidosDetalhe':
          validationValue = inferItensConcluidosDetalhe(
            validation.itensConcluidos,
            validation.itensConcluidosDetalhe,
            validation.tipo
          )
          break
        case 'itensConcluidos':
          validationValue = validation.itensConcluidos
          break
        default:
          validationValue = undefined
      }

      let draftValue: unknown
      switch (k) {
        case 'analista':
          draftValue = draft.analista
          break
        case 'dataInicio':
          draftValue = draft.dataInicio
          break
        case 'dataFinal':
          draftValue = draft.dataFinal
          break
        case 'status':
          draftValue = draft.status
          break
        case 'ticket':
          draftValue = draft.ticket
          break
        case 'solicitante':
          draftValue = draft.solicitante
          break
        case 'demanda':
          draftValue = draft.demanda
          break
        case 'tipo':
          draftValue = draft.tipo
          break
        case 'descricao':
          draftValue = draft.descricao
          break
        case 'observacoes':
          draftValue = draft.observacoes
          break
        case 'cliente':
          draftValue = draft.cliente
          break
        case 'contrato':
          draftValue = draft.contrato
          break
        case 'operadora':
          draftValue = draft.operadora
          break
        case 'produto':
          draftValue = draft.produto
          break
        case 'vigencia':
          draftValue = draft.vigencia
          break
        case 'qtdRetornos':
          draftValue = draft.qtdRetornos
          break
        case 'qualidade':
          draftValue = draft.qualidade
          break
        case 'estruturaEdge':
          draftValue = draft.estruturaEdge
          break
        case 'estruturaMove':
          draftValue = draft.estruturaMove
          break
        case 'formalizacao':
          draftValue = draft.formalizacao
          break
        case 'itensPendentes':
          draftValue = draft.itensPendentes
          break
        case 'total':
          draftValue = totalCalculado
          break
        case 'itensConcluidosDetalhe':
          draftValue = draft.itensConcluidosDetalhe
          break
        case 'itensConcluidos':
          draftValue = draft.itensConcluidos
          break
        default:
          draftValue = undefined
      }

      if (k === 'estruturaEdge' || k === 'estruturaMove') {
        const valArray = Array.isArray(validationValue) ? validationValue : []
        const draftArray = Array.isArray(draftValue) ? draftValue : []
        return JSON.stringify([...valArray].sort()) !== JSON.stringify([...draftArray].sort())
      }

      if (k === 'itensConcluidosDetalhe') {
        return (
          JSON.stringify(parseItensConcluidosDetalhe(validationValue)) !==
          JSON.stringify(parseItensConcluidosDetalhe(draftValue))
        )
      }

      if (k === 'total') {
        return Number(validationValue ?? 0) !== Number(draftValue ?? 0)
      }

      const normalizeValue = (value: unknown): string => {
        if (value === null || value === undefined || value === '') return ''
        if (typeof value === 'object' && value !== null && 'id' in value) {
          return String((value as { id: string }).id).trim()
        }
        return String(value).trim()
      }

      const normalizedValidation = normalizeValue(validationValue)
      const normalizedDraft = normalizeValue(draftValue)

      return normalizedValidation !== normalizedDraft
    })

    return changed
  })()

  useEffect(() => {
    if (
      draft.estruturaEdge !== validation.estruturaEdge ||
      draft.estruturaMove !== validation.estruturaMove
    ) {
      setDraft((prev) => ({ ...prev, total: totalCalculado }))
    }
  }, [draft.estruturaEdge, draft.estruturaMove])

  async function applySave() {
    if (isSaving) return
    try {
      setIsSaving(true)
      const { user: currentUser } = useAuthStore.getState()
      console.log('🔍 ValidationDetailPage: Usuário atual:', currentUser)

      if (!currentUser) {
        console.error('❌ ValidationDetailPage: Usuário não encontrado!')
        return
      }

      if (!currentUser.name) {
        console.error('❌ ValidationDetailPage: Nome do usuário não encontrado!')
        return
      }

      console.log('🔍 Campos detectados como alterados:', changedKeys)
      console.log('🔍 Draft atual:', draft)
      console.log('🔍 Validation original:', validation)

      if (changedKeys.length === 0) {
        console.log('⚠️ Nenhuma alteração detectada, não salvando')
        setConfirmOpen(false)
        return
      }

      const contratoErr = validateContratoParaCliente(
        typeof draft.contrato === 'string'
          ? draft.contrato
          : relationId(draft.contrato, validation.contratoId),
        clienteIdNormalized,
        contratosDoCliente,
        md.contratos
      )
      if (contratoErr) {
        alert(contratoErr)
        setConfirmOpen(false)
        return
      }

      const dataToSave =
        formMode === 'novo'
          ? {
              ...draft,
              total: totalCalculado,
              itensConcluidosDetalhe: draft.itensConcluidosDetalhe,
              itensConcluidos: sumItensConcluidosDetalhe(draft.itensConcluidosDetalhe),
              cliente: relationId(draft.cliente) || undefined,
              clienteId: relationId(draft.cliente) || undefined,
              contrato: relationId(draft.contrato) || undefined,
              contratoId: relationId(draft.contrato) || undefined,
              operadora: relationId(draft.operadora) || undefined,
              operadoraId: relationId(draft.operadora) || undefined,
              produto: relationId(draft.produto) || undefined,
              produtoId: relationId(draft.produto) || undefined,
            }
          : {
              ...draft,
              total: totalCalculado,
              itensConcluidos: draft.itensConcluidos,
              cliente: relationId(draft.cliente) || undefined,
              clienteId: relationId(draft.cliente) || undefined,
              contrato: relationId(draft.contrato) || undefined,
              contratoId: relationId(draft.contrato) || undefined,
              operadora: relationId(draft.operadora) || undefined,
              operadoraId: relationId(draft.operadora) || undefined,
              produto: relationId(draft.produto) || undefined,
              produtoId: relationId(draft.produto) || undefined,
            }

      console.log('🔍 Dados que serão salvos:', dataToSave)

      await store.upsert(dataToSave as ValidationEntry)

      setConfirmOpen(false)

      void Promise.all(
        changedKeys.map((k) => {
          const draftForTimeline =
            k === 'total' ? { ...draft, total: totalCalculado } : draft
          const from = formatValidacaoTimelineValue(k, validation, md)
          const to = formatValidacaoTimelineValue(k, draftForTimeline, md)

          if (k === 'status') {
            return store.log({
              validationId: validation.id,
              type: 'status_change' as const,
              field: 'status',
              from,
              to,
              user: currentUser?.name,
            })
          }

          return store.log({
            validationId: validation.id,
            type: 'field_change' as const,
            field: k,
            from,
            to,
            user: currentUser?.name,
          })
        })
      )
    } catch (error: unknown) {
      console.error('❌ Erro ao salvar validação:', error)
      const reason =
        typeof (error as { message?: string })?.message === 'string' &&
        (error as { message: string }).message.trim()
          ? (error as { message: string }).message.trim()
          : 'Erro desconhecido'

      const changedLabels = (Array.isArray(changedKeys) ? changedKeys : [])
        .map((key) => getValidacaoTimelineFieldLabel(key))
        .filter(Boolean)

      const fieldsPart =
        changedLabels.length > 0 ? ` Campos não salvos: ${changedLabels.join(', ')}.` : ''

      alert(`Falha ao salvar — nenhuma alteração foi aplicada.${fieldsPart} Motivo: ${reason}`)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    draft,
    setDraft,
    changedKeys,
    totalCalculado,
    edgeSelections,
    moveSelections,
    confirmOpen,
    setConfirmOpen,
    isSaving,
    applySave,
    clienteIdNormalized,
    contratosDoCliente,
    produtosFiltrados,
    analistaResponsavelNome,
    md,
  }
}

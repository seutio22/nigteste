import React, { useMemo, useState } from 'react'
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material'
import type { CotacaoFormState } from './CotacaoFormFields'
import { CotacaoFormFields } from './CotacaoFormFields'
import { CotacaoDadosLancadosView } from './CotacaoDadosLancadosView'
import { PlacementEmCotacaoPanel } from './PlacementEmCotacaoPanel'
import { PlacementKickOffPanel } from './PlacementKickOffPanel'
import { PlacementAguardandoOperadoraPanel } from './PlacementAguardandoOperadoraPanel'
import { formScopeForWorkflow } from './placementCotacaoFormScope'
import { getWorkflowStageMeta, type WorkflowStageKey } from './placementCotacaoWorkflow'
import { isRascunhoStatus } from './placementCotacaoStatus'

export type DetailTabId = 'etapa_atual' | 'dados_lancados'

type Props = {
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  cotacaoId: string
  workflowStageKey: WorkflowStageKey | string
  disabled?: boolean
  emCotacaoSubetapa: string
  onEmCotacaoSubetapaChange: (key: string) => void
  onBeneficiariosTotalChange: (n: number) => void
  onAberturaEditingChange?: (editing: boolean) => void
  analistaCadastroNome?: string
  analistaResponsavelNome?: string
  onPersisted?: (apiCotacao: unknown) => void
}

export function PlacementCotacaoDetailTabs({
  form,
  onChange,
  cotacaoId,
  workflowStageKey,
  disabled,
  emCotacaoSubetapa,
  onEmCotacaoSubetapaChange,
  onBeneficiariosTotalChange,
  onAberturaEditingChange,
  analistaCadastroNome,
  analistaResponsavelNome,
  onPersisted,
}: Props) {
  const isDraft = isRascunhoStatus(form.status)
  const formScope = formScopeForWorkflow(workflowStageKey, isDraft)

  const tabList = useMemo(() => {
    if (isDraft) return [{ id: 'etapa_atual' as DetailTabId, label: 'Rascunho' }]
    const stageLabel = getWorkflowStageMeta(form.status)?.label ?? 'Etapa atual'
    if (workflowStageKey === 'base_atual') {
      return [{ id: 'etapa_atual' as DetailTabId, label: `Etapa: ${stageLabel}` }]
    }
    return [
      { id: 'etapa_atual' as DetailTabId, label: `Etapa: ${stageLabel}` },
      { id: 'dados_lancados' as DetailTabId, label: 'Dados da abertura' },
    ]
  }, [isDraft, form.status, workflowStageKey])

  const [tab, setTab] = useState<DetailTabId>('etapa_atual')

  const showDadosLancados =
    !isDraft && workflowStageKey !== 'base_atual' && tab === 'dados_lancados'

  return (
    <Box>
      {tabList.length > 1 && (
        <Tabs
          value={tab}
          onChange={(_, v: DetailTabId) => setTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {tabList.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} />
          ))}
        </Tabs>
      )}

      {tab === 'etapa_atual' && (
        <StackEtapaAtual
          form={form}
          onChange={onChange}
          cotacaoId={cotacaoId}
          workflowStageKey={workflowStageKey}
          formScope={formScope}
          disabled={disabled}
          isDraft={isDraft}
          emCotacaoSubetapa={emCotacaoSubetapa}
          onEmCotacaoSubetapaChange={onEmCotacaoSubetapaChange}
          onBeneficiariosTotalChange={onBeneficiariosTotalChange}
          analistaCadastroNome={analistaCadastroNome}
          analistaResponsavelNome={analistaResponsavelNome}
          onPersisted={onPersisted}
        />
      )}

      {showDadosLancados && (
        <CotacaoDadosLancadosView
          value={form}
          onChange={onChange}
          cotacaoId={cotacaoId}
          disabled={disabled}
          title="Dados registrados na abertura do processo"
          onEditingChange={onAberturaEditingChange}
        />
      )}
    </Box>
  )
}

function StackEtapaAtual({
  form,
  onChange,
  cotacaoId,
  workflowStageKey,
  formScope,
  disabled,
  isDraft,
  emCotacaoSubetapa,
  onEmCotacaoSubetapaChange,
  onBeneficiariosTotalChange,
  analistaCadastroNome,
  analistaResponsavelNome,
  onPersisted,
}: {
  form: CotacaoFormState
  onChange: (next: CotacaoFormState) => void
  cotacaoId: string
  workflowStageKey: string
  formScope: ReturnType<typeof formScopeForWorkflow>
  disabled?: boolean
  isDraft: boolean
  emCotacaoSubetapa: string
  onEmCotacaoSubetapaChange: (key: string) => void
  onBeneficiariosTotalChange: (n: number) => void
  analistaCadastroNome?: string
  analistaResponsavelNome?: string
  onPersisted?: (apiCotacao: unknown) => void
}) {
  return (
    <>
      {workflowStageKey === 'kick_off' && !isDraft && (
        <PlacementKickOffPanel
          form={form}
          onChange={onChange}
          cotacaoId={cotacaoId}
          analistaCadastroNome={analistaCadastroNome}
          analistaResponsavelNome={analistaResponsavelNome}
          disabled={disabled}
        />
      )}

      {workflowStageKey === 'em_cotacao' && !isDraft && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <PlacementEmCotacaoPanel
            cotacaoId={cotacaoId}
            form={form}
            subetapaInicial={emCotacaoSubetapa}
            disabled={disabled}
            onChange={onChange}
            analistaResponsavelNome={analistaResponsavelNome}
            onSubetapaChange={onEmCotacaoSubetapaChange}
            onBeneficiariosTotalChange={onBeneficiariosTotalChange}
            onPersisted={onPersisted}
          />
        </Paper>
      )}

      {workflowStageKey === 'aguardando_operadora' && !isDraft && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <PlacementAguardandoOperadoraPanel
            cotacaoId={cotacaoId}
            form={form}
            onChange={onChange}
            onPersisted={onPersisted}
            disabled={disabled}
          />
        </Paper>
      )}

      {workflowStageKey !== 'kick_off' && (
        <>
          {workflowStageKey === 'em_cotacao' && !isDraft && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Preencha apenas os campos desta etapa. O que foi informado na abertura está na aba «Dados
              da abertura».
            </Typography>
          )}

          <CotacaoFormFields
            value={form}
            onChange={onChange}
            disabled={disabled}
            cotacaoId={cotacaoId}
            formMode={isDraft ? 'draft' : 'edit'}
            workflowStageKey={workflowStageKey}
            formScope={formScope}
          />
        </>
      )}
    </>
  )
}

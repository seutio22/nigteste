import React, { useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import type { PlacementCronogramaAtividade } from '../../store/placementStore'
import {
  buildCronogramaTree,
  cronogramaItemNumber,
  groupAtividadesTemplatePorEtapa,
  normalizeIsoDate,
  slaReferenciaLabel,
  type PlacementCronogramaEtapaView,
  type PlacementCronogramaInstancia,
  type PlacementCronogramaItemView,
  type PlacementCronogramaLinha,
  type PlacementCronogramaTarefaView,
} from './Fila/placementCronograma'
import {
  CRONOGRAMA_STATUS_MANUAL_OPTIONS,
  cronogramaStatusColor,
  cronogramaStatusLabel,
  normalizeCronogramaStatus,
  resolveEffectiveCronogramaStatus,
  validateCronogramaStatusPatch,
  type PlacementCronogramaStatus,
} from './Fila/placementCronogramaStatus'

type BaseProps = {
  loading?: boolean
  defaultExpandedFirst?: boolean
}

type TemplateProps = BaseProps & {
  mode: 'template'
  atividades: PlacementCronogramaAtividade[]
  onEdit?: (row: PlacementCronogramaAtividade) => void
  onDelete?: (row: PlacementCronogramaAtividade) => void
}

type InstanceProps = BaseProps & {
  mode: 'instance'
  atividades: PlacementCronogramaAtividade[]
  instancia: PlacementCronogramaInstancia
  participantes?: Array<{ id: string; nome: string; email?: string | null }>
  currentEtapaKey?: string
  onPatchLinha?: (atividadeId: string, patch: Partial<PlacementCronogramaLinha>) => void
  onValidationError?: (message: string) => void
  onRemoveAtividade?: (atividadeId: string) => void
  onAddTarefa?: (etapaKey: string, parentId?: string | null) => void
}

export type PlacementCronogramaGroupedViewProps = TemplateProps | InstanceProps

function findAtividade(
  atividades: PlacementCronogramaAtividade[],
  id: string
): PlacementCronogramaAtividade | undefined {
  return atividades.find((a) => a.id === id || `${a.id}::sub` === id)
}

function EtapaHeader({
  grupo,
  showProgress,
  isCurrent,
}: {
  grupo: PlacementCronogramaEtapaView
  showProgress?: boolean
  isCurrent?: boolean
}) {
  const progress =
    showProgress && grupo.total > 0 ? Math.round((grupo.concluidas / grupo.total) * 100) : null

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {grupo.etapaIndex + 1}. {grupo.etapaLabel}
          </Typography>
          {isCurrent ? (
            <Chip size="small" label="Etapa atual" color="primary" sx={{ fontWeight: 700 }} />
          ) : null}
          {!showProgress ? (
            <Typography variant="caption" color="text.secondary">
              {grupo.tasks.length} tarefa(s)
            </Typography>
          ) : null}
        </Stack>
      </Box>
      {progress != null ? (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 140 }}>
          <Typography variant="caption" fontWeight={700}>
            {progress}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
        </Stack>
      ) : null}
    </Box>
  )
}

function InstanceDateField({
  value,
  onChange,
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
}) {
  return (
    <TextField
      type="date"
      size="small"
      value={value ?? ''}
      onChange={(e) => onChange(normalizeIsoDate(e.target.value))}
      InputLabelProps={{ shrink: true }}
      fullWidth
    />
  )
}

function InstanceStatusSelect({
  storedStatus,
  effectiveStatus,
  onChange,
}: {
  storedStatus: PlacementCronogramaStatus
  effectiveStatus: PlacementCronogramaStatus
  onChange: (v: PlacementCronogramaStatus) => void
}) {
  const isAutoOverdue = effectiveStatus === 'overdue'
  const selectValue = storedStatus === 'overdue' ? 'in_progress' : storedStatus

  return (
    <Stack spacing={0.5}>
      <FormControl size="small" fullWidth>
        <Select
          value={selectValue}
          onChange={(e) => onChange(normalizeCronogramaStatus(e.target.value))}
          renderValue={() => (
            <Chip
              size="small"
              label={cronogramaStatusLabel(effectiveStatus)}
              color={cronogramaStatusColor(effectiveStatus)}
            />
          )}
        >
          {CRONOGRAMA_STATUS_MANUAL_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {isAutoOverdue ? (
        <Typography variant="caption" color="error">
          Em atraso (automático)
        </Typography>
      ) : null}
    </Stack>
  )
}

function renderInstanceItemRow(
  item: PlacementCronogramaItemView,
  numero: string,
  isSubtarefa: boolean,
  participantes: Array<{ id: string; nome: string }>,
  onPatchLinha?: (atividadeId: string, patch: Partial<PlacementCronogramaLinha>) => void,
  onValidationError?: (message: string) => void,
  onRemoveAtividade?: (atividadeId: string) => void,
  onAddSubtarefa?: (parentId: string) => void
) {
  const storedStatus = normalizeCronogramaStatus(item.status)
  const effectiveStatus = resolveEffectiveCronogramaStatus({
    status: storedStatus,
    dataPrevista: item.dataPrevistaEfetiva,
    dataConclusao: item.dataConclusaoEfetiva,
  })

  function applyPatch(patch: Partial<PlacementCronogramaLinha>) {
    const merged = {
      status: patch.status ?? storedStatus,
      dataConclusao: patch.dataConclusao !== undefined ? patch.dataConclusao : item.dataConclusaoEfetiva,
    }
    const validation = validateCronogramaStatusPatch(merged)
    if (!validation.ok) {
      onValidationError?.(validation.message)
      return
    }
    onPatchLinha?.(item.id, patch)
  }

  const options = participantes.map((p) => p.nome)

  return (
    <TableRow
      key={item.id}
      sx={{
        bgcolor: isSubtarefa ? '#f8f9fa' : '#fff',
        ...(isSubtarefa ? { borderLeft: '4px solid #e3f2fd' } : {}),
        ...(effectiveStatus === 'completed' ? { opacity: 0.85 } : {}),
        ...(effectiveStatus === 'overdue' ? { bgcolor: isSubtarefa ? '#fff3f3' : '#fffafa' } : {}),
      }}
    >
      <TableCell>
        <Typography variant="body2" fontWeight="bold" color={isSubtarefa ? 'info.main' : 'primary'}>
          {numero}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight={isSubtarefa ? 600 : 700}>
          {item.nome}
        </Typography>
      </TableCell>
      <TableCell>
        <Autocomplete
          size="small"
          freeSolo
          options={options}
          value={item.responsavel ?? ''}
          onChange={(_, v) => applyPatch({ responsavel: typeof v === 'string' ? v.trim() || null : null })}
          onInputChange={(_, v) => applyPatch({ responsavel: v.trim() || null })}
          renderInput={(params) => <TextField {...params} placeholder="Responsável" />}
        />
      </TableCell>
      <TableCell>
        <InstanceDateField value={item.dataInicioEfetiva} onChange={(v) => applyPatch({ dataInicio: v })} />
      </TableCell>
      <TableCell>
        <InstanceDateField
          value={item.dataPrevistaEfetiva}
          onChange={(v) => applyPatch({ dataPrevista: v, dataEntrega: v })}
        />
      </TableCell>
      <TableCell>
        <InstanceDateField
          value={item.dataConclusaoEfetiva}
          onChange={(v) =>
            applyPatch({
              dataConclusao: v,
              ...(v ? { status: 'completed', concluida: true } : {}),
            })
          }
        />
      </TableCell>
      <TableCell>
        <InstanceStatusSelect
          storedStatus={storedStatus}
          effectiveStatus={effectiveStatus}
          onChange={(v) => applyPatch({ status: v, concluida: v === 'completed' })}
        />
      </TableCell>
      <TableCell align="center">
        <Stack direction="row" spacing={0.25} justifyContent="center">
          {!isSubtarefa && onAddSubtarefa ? (
            <IconButton
              size="small"
              aria-label="Adicionar subtarefa"
              onClick={() => onAddSubtarefa(item.id)}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          ) : null}
          {onRemoveAtividade ? (
            <IconButton
              size="small"
              color="error"
              aria-label="Remover tarefa"
              onClick={() => {
                if (
                  window.confirm(
                    `Remover "${item.nome}" deste cronograma?\n\nO modelo em Dados não será alterado.`
                  )
                ) {
                  onRemoveAtividade(item.id)
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </TableCell>
    </TableRow>
  )
}

function renderTemplateTaskRow(
  task: PlacementCronogramaTarefaView,
  atividades: PlacementCronogramaAtividade[],
  etapaIndex: number,
  taskIndex: number,
  onEdit?: (row: PlacementCronogramaAtividade) => void,
  onDelete?: (row: PlacementCronogramaAtividade) => void
) {
  const row = findAtividade(atividades, task.id)
  return (
    <React.Fragment key={task.id}>
      <TableRow sx={{ bgcolor: '#fff' }}>
        <TableCell>
          <Typography variant="body2" fontWeight="bold" color="primary">
            {cronogramaItemNumber(etapaIndex, taskIndex)}
          </Typography>
        </TableCell>
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" fontWeight={700}>
              {task.nome}
            </Typography>
            {row?.complementar ? <Chip size="small" label="Complementar" variant="outlined" /> : null}
          </Stack>
        </TableCell>
        <TableCell>{task.responsavelPadrao ?? '—'}</TableCell>
        <TableCell>{task.slaDias != null ? `${task.slaDias} dia(s)` : '—'}</TableCell>
        <TableCell>{slaReferenciaLabel(task.slaReferencia)}</TableCell>
        <TableCell>
          <Chip
            size="small"
            label={task.ativo !== false ? 'Sim' : 'Não'}
            color={task.ativo !== false ? 'success' : 'default'}
            variant="outlined"
          />
        </TableCell>
        <TableCell align="center">
          {row ? (
            <Stack direction="row" spacing={0.5} justifyContent="center">
              <IconButton size="small" aria-label="Editar" onClick={() => onEdit?.(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" aria-label="Excluir" onClick={() => onDelete?.(row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : null}
        </TableCell>
      </TableRow>
      {task.subtasks.map((sub, subIndex) => {
        const subRow = findAtividade(atividades, sub.id)
        return (
          <TableRow key={sub.id} sx={{ bgcolor: '#f8f9fa', borderLeft: '4px solid #e3f2fd' }}>
            <TableCell>
              <Typography variant="caption" fontWeight="bold" color="info.main">
                {cronogramaItemNumber(etapaIndex, taskIndex, subIndex)}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2" fontWeight={600}>
                {sub.nome}
              </Typography>
            </TableCell>
            <TableCell>{sub.responsavelPadrao ?? task.responsavelPadrao ?? '—'}</TableCell>
            <TableCell>{sub.slaDias != null ? `${sub.slaDias} dia(s)` : '—'}</TableCell>
            <TableCell>{slaReferenciaLabel(sub.slaReferencia)}</TableCell>
            <TableCell>
              <Chip
                size="small"
                label={sub.ativo !== false ? 'Sim' : 'Não'}
                color={sub.ativo !== false ? 'success' : 'default'}
                variant="outlined"
              />
            </TableCell>
            <TableCell align="center">
              {subRow ? (
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  <IconButton size="small" aria-label="Editar" onClick={() => onEdit?.(subRow)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Excluir" onClick={() => onDelete?.(subRow)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ) : null}
            </TableCell>
          </TableRow>
        )
      })}
    </React.Fragment>
  )
}

export function PlacementCronogramaGroupedView(props: PlacementCronogramaGroupedViewProps) {
  const grupos = useMemo(() => {
    if (props.mode === 'template') {
      return groupAtividadesTemplatePorEtapa(props.atividades)
    }
    return buildCronogramaTree(props.atividades, props.instancia)
  }, [props])

  const currentEtapaKey = props.mode === 'instance' ? props.currentEtapaKey : undefined

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (currentEtapaKey) return { [currentEtapaKey]: true }
    return {}
  })

  if (props.loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Carregando cronograma…
      </Typography>
    )
  }

  if (grupos.length === 0) {
    return null
  }

  const isInstance = props.mode === 'instance'
  const participantes = isInstance ? (props.participantes ?? props.instancia.participantes ?? []) : []

  return (
    <Stack spacing={1.5}>
      {grupos.map((grupo, grupoIdx) => {
        const isCurrent = currentEtapaKey === grupo.etapaKey
        const isExpanded =
          expanded[grupo.etapaKey] ??
          isCurrent ??
          (props.defaultExpandedFirst !== false && grupoIdx === 0)

        return (
          <Accordion
            key={grupo.etapaKey}
            expanded={Boolean(isExpanded)}
            onChange={(_, open) => setExpanded((prev) => ({ ...prev, [grupo.etapaKey]: open }))}
            disableGutters
            sx={{
              border: 1,
              borderColor: isCurrent ? 'primary.main' : 'divider',
              borderRadius: 1,
              ...(isCurrent ? { boxShadow: '0 0 0 1px rgba(25,118,210,0.25)' } : {}),
              '&:before': { display: 'none' },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <EtapaHeader grupo={grupo} showProgress={isInstance} isCurrent={isCurrent} />
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: { xs: 1, md: 2 }, pb: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 700, width: 56 }}>Nº</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>Tarefa</TableCell>
                      {isInstance ? (
                        <>
                          <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Responsável</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 150 }}>Início</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 150 }}>Previsão</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 150 }}>Conclusão</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 140 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 88 }} align="center">
                            Ações
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Responsável padrão</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 110 }}>Prazo entrega</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 130 }}>Ref. prazo</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 72 }}>Ativo</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 88 }} align="center">
                            Ações
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grupo.tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isInstance ? 8 : 7}>
                          <Typography variant="body2" color="text.secondary">
                            {isInstance
                              ? 'Nenhuma tarefa nesta etapa. Adicione uma tarefa específica desta cotação.'
                              : 'Nenhuma tarefa parametrizada nesta etapa. Importe o modelo ou cadastre em Dados → Placement → Cronograma.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      grupo.tasks.map((task, taskIndex) =>
                        isInstance ? (
                          <React.Fragment key={task.id}>
                            {renderInstanceItemRow(
                              task,
                              cronogramaItemNumber(grupo.etapaIndex, taskIndex),
                              false,
                              participantes,
                              props.onPatchLinha,
                              props.onValidationError,
                              props.onRemoveAtividade,
                              props.onAddTarefa
                                ? (parentId) => props.onAddTarefa!(grupo.etapaKey, parentId)
                                : undefined
                            )}
                            {task.subtasks.map((sub, subIndex) =>
                              renderInstanceItemRow(
                                sub,
                                cronogramaItemNumber(grupo.etapaIndex, taskIndex, subIndex),
                                true,
                                participantes,
                                props.onPatchLinha,
                                props.onValidationError,
                                props.onRemoveAtividade
                              )
                            )}
                          </React.Fragment>
                        ) : (
                          renderTemplateTaskRow(
                            task,
                            props.atividades,
                            grupo.etapaIndex,
                            taskIndex,
                            props.onEdit,
                            props.onDelete
                          )
                        )
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {isInstance && props.onAddTarefa ? (
                <Box sx={{ mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => props.onAddTarefa!(grupo.etapaKey)}
                  >
                    Adicionar tarefa
                  </Button>
                </Box>
              ) : null}
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Stack>
  )
}

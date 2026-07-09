import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SaveIcon from '@mui/icons-material/Save'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import {
  createProjectTemplate,
  deleteProjectTemplate,
  listProjectTemplates,
  type ProjectTemplate,
} from '../lib/projectTemplateApi'
import {
  downloadProjectTimelineTemplateXlsx,
  parseProjectTimelineFile,
  summarizeTimeline,
  type ProjectTimelineShape,
} from '../utils/projectTimelineSpreadsheet'
import { duplicateProjectTimelineReset } from '../utils/duplicateProjectTimeline'

export type ProjectTemplatesDialogMode = 'manage' | 'pick' | 'save'

type Props = {
  open: boolean
  onClose: () => void
  mode?: ProjectTemplatesDialogMode
  /** Cronograma do projeto atual — usado no modo save */
  projectTimeline?: unknown
  /** Ao escolher template ou importar Excel no modo pick */
  onApplyTimeline?: (timeline: ProjectTimelineShape) => void
  /** Após salvar template com sucesso */
  onSaved?: () => void
}

export default function ProjectTemplatesDialog({
  open,
  onClose,
  mode = 'manage',
  projectTimeline,
  onApplyTimeline,
  onSaved,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState(0)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [parsedTimeline, setParsedTimeline] = useState<ProjectTimelineShape | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importFileName, setImportFileName] = useState('')

  const timelineToSave = useMemo(() => {
    if (mode === 'save' && projectTimeline) {
      return duplicateProjectTimelineReset(projectTimeline) as ProjectTimelineShape
    }
    return parsedTimeline
  }, [mode, projectTimeline, parsedTimeline])

  const previewSummary = useMemo(
    () => (timelineToSave ? summarizeTimeline(timelineToSave) : null),
    [timelineToSave]
  )

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listProjectTemplates()
      setTemplates(rows)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar templates'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setError('')
    setParseErrors([])
    if (mode === 'save') {
      setTab(1)
      setParsedTimeline(null)
    } else if (mode === 'pick') {
      setTab(0)
    } else {
      setTab(0)
    }
    loadTemplates()
  }, [open, mode, loadTemplates])

  const handleFile = async (file: File) => {
    setError('')
    setParseErrors([])
    setImportFileName(file.name)
    try {
      const result = await parseProjectTimelineFile(file)
      setParseErrors(result.errors)
      if (result.timeline.phases.length) {
        setParsedTimeline(duplicateProjectTimelineReset(result.timeline) as ProjectTimelineShape)
        setTab(1)
      } else if (!result.errors.length) {
        setParseErrors(['Nenhuma etapa encontrada no arquivo.'])
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao ler o Excel')
    }
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError('Informe o nome do template.')
      return
    }
    if (!timelineToSave?.phases?.length) {
      setError('O template precisa ter ao menos uma etapa.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createProjectTemplate({
        name: templateName.trim(),
        description: templateDescription.trim(),
        timeline: timelineToSave,
      })
      setTemplateName('')
      setTemplateDescription('')
      setParsedTimeline(null)
      setImportFileName('')
      await loadTemplates()
      onSaved?.()
      setTab(0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar template')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = (timeline: unknown) => {
    const reset = duplicateProjectTimelineReset(timeline) as ProjectTimelineShape
    onApplyTimeline?.(reset)
    onClose()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este template?')) return
    setLoading(true)
    try {
      await deleteProjectTemplate(id)
      await loadTemplates()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir')
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'save'
      ? 'Salvar template de projeto'
      : mode === 'pick'
        ? 'Usar template ou importar Excel'
        : 'Templates de projeto'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {title}
        <IconButton onClick={onClose} aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {mode !== 'save' ? (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Templates salvos" />
            <Tab label="Importar Excel" />
            {mode === 'manage' ? <Tab label="Novo template" /> : null}
          </Tabs>
        ) : null}

        {/* Tab 0 — lista */}
        {tab === 0 && mode !== 'save' ? (
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => downloadProjectTimelineTemplateXlsx()}
              >
                Baixar modelo Excel
              </Button>
            </Stack>
            {loading && !templates.length ? (
              <Typography color="text.secondary">Carregando...</Typography>
            ) : null}
            {!loading && templates.length === 0 ? (
              <Alert severity="info">
                Nenhum template salvo ainda. Importe um Excel ou salve a partir de um projeto existente.
              </Alert>
            ) : (
              <List dense>
                {templates.map((t) => {
                  const sum = summarizeTimeline(t.timeline as ProjectTimelineShape)
                  return (
                    <ListItem key={t.id} divider>
                      <ListItemText
                        primary={t.name}
                        secondary={
                          <>
                            {t.description || 'Sem descrição'}
                            <br />
                            {sum.phases} etapas · {sum.tasks} tarefas · {sum.subtasks} subtarefas
                            {t.isGlobal ? (
                              <>
                                {' '}
                                <Chip size="small" label="Global" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                              </>
                            ) : null}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1}>
                          {mode === 'pick' ? (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircleOutlineIcon />}
                              onClick={() => handleApply(t.timeline)}
                            >
                              Usar
                            </Button>
                          ) : null}
                          <IconButton edge="end" aria-label="Excluir" onClick={() => handleDelete(t.id)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Stack>
                      </ListItemSecondaryAction>
                    </ListItem>
                  )
                })}
              </List>
            )}
          </Box>
        ) : null}

        {/* Tab 1 — importar excel */}
        {tab === 1 && mode !== 'save' ? (
          <Box>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Faça upload de um arquivo .xlsx com as colunas <strong>Fase</strong>, <strong>Tarefa</strong> e{' '}
                <strong>Subtarefa</strong> (modelo disponível acima) ou o formato exportado com{' '}
                <strong>Nível</strong> + <strong>Descrição</strong>.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadProjectTimelineTemplateXlsx()}>
                  Baixar modelo
                </Button>
                <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()}>
                  Enviar Excel
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleFile(f)
                    e.target.value = ''
                  }}
                />
              </Stack>
              {importFileName ? (
                <Typography variant="caption" color="text.secondary">
                  Arquivo: {importFileName}
                </Typography>
              ) : null}
              {parseErrors.map((msg) => (
                <Alert key={msg} severity="warning">
                  {msg}
                </Alert>
              ))}
              {previewSummary ? (
                <Alert severity="success">
                  Prévia: {previewSummary.phases} etapas, {previewSummary.tasks} tarefas, {previewSummary.subtasks}{' '}
                  subtarefas
                </Alert>
              ) : null}
              {mode === 'pick' && parsedTimeline ? (
                <Button variant="contained" onClick={() => handleApply(parsedTimeline)}>
                  Aplicar cronograma importado
                </Button>
              ) : null}
            </Stack>
          </Box>
        ) : null}

        {/* Tab 2 / save mode — criar template */}
        {(tab === 2 && mode === 'manage') || mode === 'save' ? (
          <Box>
            <Stack spacing={2}>
              {mode === 'save' ? (
                <Alert severity="info">
                  O cronograma atual do projeto será salvo como template (datas e responsáveis serão zerados no template).
                </Alert>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Importe um Excel na aba anterior ou cole a estrutura a partir de um projeto. Depois informe o nome e salve.
                </Typography>
              )}
              <TextField
                label="Nome do template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Descrição (opcional)"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              {previewSummary ? (
                <Typography variant="body2">
                  Conteúdo: {previewSummary.phases} etapas · {previewSummary.tasks} tarefas ·{' '}
                  {previewSummary.subtasks} subtarefas
                </Typography>
              ) : (
                <Alert severity="warning">Nenhum cronograma carregado para salvar.</Alert>
              )}
            </Stack>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        {((tab === 2 && mode === 'manage') || mode === 'save') && (
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSaveTemplate()}
            disabled={loading || !timelineToSave?.phases?.length || !templateName.trim()}
          >
            Salvar template
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'
import {
  applyConditionalRules,
  parseFormRules,
  parseFormSettings,
  type ConditionRule,
  isFieldAnswerEmpty,
  parseFormMeta,
  parseFormSchema,
  parseRepeatGroupRows,
  parseRepeatValues,
  toAnswerPayload,
} from '../lib/formSchema'
import { parseAttachmentRefString } from '../lib/uploadAttachment'
import DynamicFormFields from '../components/DynamicFormFields'
import NewRequestCatalog from '../components/NewRequestCatalog'
import { injectFormBlocks } from '../lib/formInjection'

type TypeRow = {
  id: string
  slug: string
  name: string
  formSchema?: unknown
}

type AreaRow = {
  id: string
  slug: string
  name: string
  types: TypeRow[]
}

export default function NewCasePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const preArea = searchParams.get('areaId') || ''
  const preType = searchParams.get('typeId') || ''
  const catalogOnly = !preArea || !preType

  const [areas, setAreas] = useState<AreaRow[]>([])
  const [areaId, setAreaId] = useState(preArea)
  const [typeId, setTypeId] = useState(preType)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dynValues, setDynValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (catalogOnly) return
    void (async () => {
      const a = await api<{ areas: AreaRow[] }>('/areas')
      if (a.ok && a.data?.areas) {
        setAreas(a.data.areas)
        if (preArea && a.data.areas.some((x) => x.id === preArea)) {
          setAreaId(preArea)
        }
      }
    })()
  }, [preArea, preType, catalogOnly])

  useEffect(() => {
    if (catalogOnly) return
    if (!areaId) {
      setTypeId('')
      return
    }
    const ar = areas.find((x) => x.id === areaId)
    if (!ar?.types.some((t) => t.id === typeId)) {
      setTypeId(preType && ar?.types.some((t) => t.id === preType) ? preType : '')
    }
  }, [areaId, areas, preType, typeId, catalogOnly])

  const types = useMemo(() => areas.find((a) => a.id === areaId)?.types ?? [], [areas, areaId])
  const selectedType = useMemo(() => types.find((t) => t.id === typeId), [types, typeId])
  const selectedArea = useMemo(() => areas.find((a) => a.id === areaId), [areas, areaId])
  const effectiveSchema = useMemo(() => {
    const base = (selectedType?.formSchema && typeof selectedType.formSchema === 'object'
      ? (selectedType.formSchema as Record<string, unknown>)
      : {}) as any
    return injectFormBlocks(selectedType?.slug, base)
  }, [selectedType])
  const dynamicFields = useMemo(() => parseFormSchema(effectiveSchema), [effectiveSchema])
  const formMeta = useMemo(() => parseFormMeta(effectiveSchema), [effectiveSchema])
  const formRules = useMemo<ConditionRule[]>(() => parseFormRules(effectiveSchema), [effectiveSchema])
  const formSettings = useMemo(() => parseFormSettings(effectiveSchema), [effectiveSchema])

  useEffect(() => {
    setDynValues({})
  }, [typeId])

  function setDyn(key: string, value: string) {
    setDynValues((prev) => ({ ...prev, [key]: value }))
  }

  function validateDynamic(): string | null {
    const { requiredByKey, visibleByKey } = applyConditionalRules(dynamicFields, formRules, dynValues)
    // 1) valida grupos repetíveis (group_only)
    const groupKeys = Array.from(
      new Set(dynamicFields.map((f) => (f.repeatGroupKey ?? '').trim()).filter(Boolean))
    )
    for (const gk of groupKeys) {
      const cols = dynamicFields.filter((f) => (f.repeatGroupKey ?? '').trim() === gk)
      if (cols.length === 0) continue
      if (visibleByKey[gk] === false) continue
      const raw = dynValues[gk] ?? ''
      const rows = parseRepeatGroupRows(raw)
      for (const col of cols) {
        if (visibleByKey[col.key] === false) continue
        if (!requiredByKey[col.key]) continue
        const anyFilled = rows.some((r) => !isFieldAnswerEmpty(col, r[col.key] ?? ''))
        if (!anyFilled) return `Preencha o campo: ${col.label}`
      }
    }

    // 2) valida campos fora de grupos
    for (const f of dynamicFields) {
      if (!requiredByKey[f.key]) continue
      if (f.type === 'section' || f.type === 'subtitle') continue
      if ((f.repeatGroupKey ?? '').trim()) continue
      if (visibleByKey[f.key] === false) continue
      if (f.type === 'file') {
        const att = parseAttachmentRefString(dynValues[f.key] ?? '')
        if (!att?.key) return `Anexe o arquivo: ${f.label}`
        continue
      }
      const v = dynValues[f.key] ?? ''
      if (f.type === 'checkbox') {
        if (v !== 'true') return `Marque o campo: ${f.label}`
        continue
      }
      if (f.repeatable) {
        const parts = parseRepeatValues(v)
        const anyFilled = parts.some((p) => !isFieldAnswerEmpty(f, p))
        if (!anyFilled) return `Preencha o campo: ${f.label}`
        continue
      }
      if (isFieldAnswerEmpty(f, v)) {
        return `Preencha o campo: ${f.label}`
      }
    }
    return null
  }

  async function submit(willSubmit: boolean) {
    setErr(null)
    if (!areaId || !typeId) {
      setErr('Selecione área e tipo no passo anterior.')
      return
    }
    const dErr = validateDynamic()
    if (dErr) {
      setErr(dErr)
      return
    }
    const needDescription =
      formMeta.showDescription && dynamicFields.length === 0 && willSubmit && !description.trim()
    if (needDescription) {
      setErr('Preencha a descrição do pedido ou configure campos no tipo.')
      return
    }

    const { visibleByKey } = applyConditionalRules(dynamicFields, formRules, dynValues)
    const answers: Record<string, unknown> = {}
    // 1) grupos (group_only)
    const groupKeys = Array.from(
      new Set(dynamicFields.map((f) => (f.repeatGroupKey ?? '').trim()).filter(Boolean))
    )
    for (const gk of groupKeys) {
      const cols = dynamicFields.filter((f) => (f.repeatGroupKey ?? '').trim() === gk)
      if (cols.length === 0) continue
      if (visibleByKey[gk] === false) continue
      const raw = dynValues[gk] ?? ''
      const rows = parseRepeatGroupRows(raw)
      answers[gk] = rows.map((r) => {
        const obj: Record<string, unknown> = {}
        for (const col of cols) {
          if (visibleByKey[col.key] === false) continue
          const payload = toAnswerPayload(col, r[col.key] ?? '')
          if (payload !== undefined) obj[col.key] = payload
        }
        return obj
      })
    }

    // 2) campos fora do grupo
    for (const f of dynamicFields) {
      if (f.type === 'section' || f.type === 'subtitle') continue
      if ((f.repeatGroupKey ?? '').trim()) continue
      if (visibleByKey[f.key] === false) continue
      const raw = dynValues[f.key] ?? ''
      if (f.type === 'file') {
        const att = parseAttachmentRefString(raw)
        if (att) answers[f.key] = att
        continue
      }
      if (f.repeatable) {
        const parts = parseRepeatValues(raw)
        answers[f.key] = parts.map((p) => toAnswerPayload(f, p)).filter((x) => x !== undefined)
        continue
      }
      const payload = toAnswerPayload(f, raw)
      if (payload !== undefined) answers[f.key] = payload
    }
    if (formMeta.showDescription && description.trim()) answers.observacoes = description.trim()

    setBusy(true)
    const res = await api<{ case: { id: string } }>('/cases', {
      method: 'POST',
      body: JSON.stringify({
        areaId,
        requestTypeId: typeId,
        title: formMeta.showTitle && title.trim() ? title.trim() : undefined,
        answers: Object.keys(answers).length ? answers : undefined,
        submit: willSubmit,
      }),
    })
    setBusy(false)
    if (!res.ok || !res.data?.case) {
      setErr(res.error || 'Não foi possível criar a solicitação.')
      return
    }
    navigate(`/solicitacoes/${res.data.case.id}`)
  }

  if (catalogOnly) {
    return (
      <NewRequestCatalog
        onPick={(a, t) => {
          setSearchParams({ areaId: a, typeId: t })
        }}
      />
    )
  }

  const invalidCatalogSelection =
    areas.length > 0 &&
    (!selectedArea || !selectedType || selectedArea.id !== preArea || selectedType.id !== preType)

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 3,
        px: { xs: 2, md: 3 },
      }}
    >
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Nova solicitação
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Preencha os campos do tipo <strong>{selectedType?.name ?? '—'}</strong>. O administrador define quais blocos
        aparecem (título, descrição, campos).
      </Typography>

      {areas.length === 0 ? (
        <Alert severity="info">
          Nenhuma área disponível. Peça ao administrador para configurar áreas no portal ou rode o seed da API.
        </Alert>
      ) : invalidCatalogSelection ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Área ou tipo não encontrados.{' '}
          <Button size="small" onClick={() => setSearchParams({})}>
            Voltar à escolha
          </Button>
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          {selectedArea && selectedType && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Área
              </Typography>
              <Typography fontWeight={600}>{selectedArea.name}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1.5 }}>
                Tipo
              </Typography>
              <Typography fontWeight={600}>{selectedType.name}</Typography>
            </Box>
          )}

          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}

          {formMeta.showTitle && (
            <TextField
              fullWidth
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 200 }}
              helperText="Ativado pelo administrador para este tipo."
            />
          )}

          <DynamicFormFields
            fields={dynamicFields}
            values={dynValues}
            onChange={setDyn}
            disabled={busy}
            rules={formRules}
            clearOnHide={formSettings.clearOnHide}
            onFileUploadError={setErr}
            onFileUploadSuccess={() => setErr(null)}
          />

          {formMeta.showDescription && (
            <TextField
              fullWidth
              multiline
              minRows={3}
              label={dynamicFields.length ? 'Observações adicionais (opcional)' : 'Descrição / assunto do pedido'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                dynamicFields.length
                  ? 'Detalhes extra além dos campos acima'
                  : 'Descreva o que precisa com o máximo de detalhes possível.'
              }
              sx={{ mb: 3, mt: dynamicFields.length ? 2 : 0 }}
              helperText={dynamicFields.length ? undefined : 'Ativado pelo administrador para este tipo.'}
            />
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" disabled={busy} onClick={() => void submit(false)}>
              Salvar rascunho
            </Button>
            <Button variant="contained" disabled={busy} onClick={() => void submit(true)}>
              Enviar solicitação
            </Button>
            <Button disabled={busy} onClick={() => setSearchParams({})}>
              Voltar à escolha de tipo
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  )
}

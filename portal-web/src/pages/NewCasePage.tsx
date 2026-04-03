import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'
import { parseFormSchema } from '../lib/formSchema'
import DynamicFormFields from '../components/DynamicFormFields'

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
  const [searchParams] = useSearchParams()
  const preArea = searchParams.get('areaId') || ''
  const preType = searchParams.get('typeId') || ''

  const [areas, setAreas] = useState<AreaRow[]>([])
  const [areaId, setAreaId] = useState(preArea)
  const [typeId, setTypeId] = useState(preType)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dynValues, setDynValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const a = await api<{ areas: AreaRow[] }>('/areas')
      if (a.ok && a.data?.areas) {
        setAreas(a.data.areas)
        if (preArea && a.data.areas.some((x) => x.id === preArea)) {
          setAreaId(preArea)
        } else if (a.data.areas.length === 1) {
          setAreaId(a.data.areas[0].id)
        }
      }
    })()
  }, [preArea])

  useEffect(() => {
    if (!areaId) {
      setTypeId('')
      return
    }
    const ar = areas.find((x) => x.id === areaId)
    if (!ar?.types.some((t) => t.id === typeId)) {
      setTypeId(preType && ar?.types.some((t) => t.id === preType) ? preType : '')
    }
  }, [areaId, areas, preType, typeId])

  const types = useMemo(() => areas.find((a) => a.id === areaId)?.types ?? [], [areas, areaId])
  const selectedType = useMemo(() => types.find((t) => t.id === typeId), [types, typeId])
  const dynamicFields = useMemo(() => parseFormSchema(selectedType?.formSchema), [selectedType])

  useEffect(() => {
    setDynValues({})
  }, [typeId])

  function setDyn(key: string, value: string) {
    setDynValues((prev) => ({ ...prev, [key]: value }))
  }

  function validateDynamic(): string | null {
    for (const f of dynamicFields) {
      if (f.required && !(dynValues[f.key] || '').trim()) {
        return `Preencha o campo: ${f.label}`
      }
    }
    return null
  }

  async function submit(willSubmit: boolean) {
    setErr(null)
    if (!areaId || !typeId) {
      setErr('Selecione área e tipo de solicitação.')
      return
    }
    const dErr = validateDynamic()
    if (dErr) {
      setErr(dErr)
      return
    }
    if (dynamicFields.length === 0 && willSubmit && !description.trim()) {
      setErr('Preencha a descrição do pedido ou configure campos no tipo.')
      return
    }

    const answers: Record<string, unknown> = { ...dynValues }
    if (description.trim()) answers.observacoes = description.trim()

    setBusy(true)
    const res = await api<{ case: { id: string } }>('/cases', {
      method: 'POST',
      body: JSON.stringify({
        areaId,
        requestTypeId: typeId,
        title: title.trim() || undefined,
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

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Nova solicitação
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        O formulário muda conforme o <strong>tipo</strong> (definido pelo administrador por demanda/área).
      </Typography>

      {areas.length === 0 ? (
        <Alert severity="info">
          Nenhuma área disponível. Peça ao administrador para configurar áreas no portal ou rode o seed da API.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="area-label">Área</InputLabel>
            <Select
              labelId="area-label"
              label="Área"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              {areas.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} disabled={!areaId}>
            <InputLabel id="tipo-label">Tipo (demanda)</InputLabel>
            <Select
              labelId="tipo-label"
              label="Tipo (demanda)"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              {types.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 200 }}
          />

          <DynamicFormFields fields={dynamicFields} values={dynValues} onChange={setDyn} disabled={busy} />

          <TextField
            fullWidth
            multiline
            minRows={3}
            label={dynamicFields.length ? 'Observações adicionais (opcional)' : 'Descrição do pedido'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              dynamicFields.length
                ? 'Detalhes extra além dos campos acima'
                : 'Descreva o que precisa com o máximo de detalhes possível.'
            }
            sx={{ mb: 3, mt: dynamicFields.length ? 2 : 0 }}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" disabled={busy} onClick={() => void submit(false)}>
              Salvar rascunho
            </Button>
            <Button variant="contained" disabled={busy} onClick={() => void submit(true)}>
              Enviar solicitação
            </Button>
            <Button component={RouterLink} to="/" disabled={busy}>
              Cancelar
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { createFilterOptions } from '@mui/material/Autocomplete'
import type { FormFieldDef, NexusOptionsSource } from '../lib/formSchema'
import {
  applyConditionalRules,
  PORTAL_SELECT_OTHER_VALUE,
  type ConditionRule,
  parseMultiIds,
  parseMultiWithOther,
  parseRepeatValues,
  parseRepeatGroupRows,
  parseSelectWithOther,
  primaryIdForDependentFilter,
  serializeMultiIds,
  serializeMultiWithOther,
  serializeRepeatValues,
  serializeRepeatGroupRows,
  serializeSelectWithOther,
} from '../lib/formSchema'
import { api } from '../lib/api'
import { parseAttachmentRefString, uploadAttachment } from '../lib/uploadAttachment'

type Props = {
  fields: FormFieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  disabled?: boolean
  rules?: ConditionRule[]
  clearOnHide?: boolean
  onFileUploadError?: (msg: string) => void
  onFileUploadSuccess?: () => void
}

type CsvParseResult = { headers: string[]; rows: Record<string, string>[] }

function parseCsv(raw: string): CsvParseResult {
  const text = (raw ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!text) return { headers: [], rows: [] }
  const lines = text.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
  if (lines.length === 0) return { headers: [], rows: [] }

  const headerLine = lines[0]!
  const delim = headerLine.includes(';') && !headerLine.includes(',') ? ';' : ','

  const parseLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = !inQ
        }
        continue
      }
      if (ch === delim && !inQ) {
        out.push(cur.trim())
        cur = ''
        continue
      }
      cur += ch
    }
    out.push(cur.trim())
    return out.map((c) => c.replace(/^"|"$/g, '').trim())
  }

  const headers = parseLine(headerLine).map((h) => h.trim())
  const rows: Record<string, string>[] = []
  for (const line of lines.slice(1)) {
    const cells = parseLine(line)
    const row: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      const k = headers[i]
      if (!k) continue
      row[k] = (cells[i] ?? '').trim()
    }
    rows.push(row)
  }
  return { headers, rows }
}

const filterNexusOptions = createFilterOptions<{ value: string; label: string }>({
  stringify: (o) => `${o.label} ${o.value}`,
})

const filterStringOptions = createFilterOptions<string>()

function collectDescendantKeys(fields: FormFieldDef[], rootKey: string): string[] {
  const out: string[] = []
  const queue = [rootKey]
  const seen = new Set<string>()
  while (queue.length) {
    const k = queue.shift()!
    for (const f of fields) {
      if (f.nexusOptions?.filterByParentKey !== k) continue
      if (seen.has(f.key)) continue
      seen.add(f.key)
      out.push(f.key)
      queue.push(f.key)
    }
  }
  return out
}

const NEXUS_FETCH_MS = 30_000

type Opt = { value: string; label: string }

function useNexusOptions(
  n: NexusOptionsSource | null | undefined,
  allFields: FormFieldDef[],
  values: Record<string, string>
) {
  const parentKey = n?.filterByParentKey
  const filterCol = n?.filterByField?.trim()
  const parentFieldDef = parentKey ? allFields.find((x) => x.key === parentKey) : undefined
  const parentVal = parentKey ? primaryIdForDependentFilter(values[parentKey] ?? '', parentFieldDef) : ''
  const parentLabel = parentKey ? allFields.find((x) => x.key === parentKey)?.label ?? parentKey : ''

  const [opts, setOpts] = useState<Opt[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [misconfigured, setMisconfigured] = useState(false)

  useEffect(() => {
    setMisconfigured(false)
    setBlocked(false)
    if (!n?.entity || !n.valueField || !n.labelField) return

    if (parentKey && !filterCol) {
      setMisconfigured(true)
      setOpts([])
      setErr(null)
      return
    }
    if (parentKey && filterCol && !parentVal) {
      setBlocked(true)
      setOpts([])
      setErr(null)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    const timer = window.setTimeout(() => ac.abort(), NEXUS_FETCH_MS)
    setOpts(null)
    setErr(null)

    void (async () => {
      try {
        const params = new URLSearchParams({
          entity: n.entity,
          value: n.valueField,
          label: n.labelField,
        })
        if (parentKey && filterCol && parentVal) {
          params.set('filterField', filterCol)
          params.set('filterValue', parentVal)
        }
        const r = await api<{ options: Opt[] }>(`/nexus/options?${params.toString()}`, { signal: ac.signal })
        if (cancelled) return
        if (!r.ok) {
          setErr(r.error || 'Erro ao carregar dados do Nexus')
          setOpts([])
          return
        }
        setErr(null)
        setOpts(r.data?.options ?? [])
      } catch (e) {
        if (cancelled) return
        if (e instanceof DOMException && e.name === 'AbortError') {
          setErr('Tempo esgotado ao carregar o Nexus. Verifique a rede ou tente de novo.')
          setOpts([])
          return
        }
        setErr(e instanceof Error ? e.message : 'Erro de rede')
        setOpts([])
      } finally {
        window.clearTimeout(timer)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [n?.entity, n?.valueField, n?.labelField, n?.filterByField, parentKey, filterCol, parentVal])

  return { opts, err, blocked, misconfigured, parentLabel }
}

function usePortalListOptions(listId: string | null | undefined) {
  const [opts, setOpts] = useState<Opt[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!listId) {
      setOpts([])
      setErr(null)
      return
    }
    let cancelled = false
    const ac = new AbortController()
    const timer = window.setTimeout(() => ac.abort(), NEXUS_FETCH_MS)
    setOpts(null)
    setErr(null)
    void (async () => {
      try {
        const r = await api<{ options: Opt[] }>(`/portal/lookup-lists/${listId}/options`, {
          signal: ac.signal,
        })
        if (cancelled) return
        if (!r.ok) {
          setErr(r.error || 'Erro ao carregar lista')
          setOpts([])
          return
        }
        setErr(null)
        setOpts(r.data?.options ?? [])
      } catch (e) {
        if (cancelled) return
        if (e instanceof DOMException && e.name === 'AbortError') {
          setErr('Tempo esgotado. Tente de novo.')
          setOpts([])
          return
        }
        setErr(e instanceof Error ? e.message : 'Erro de rede')
        setOpts([])
      } finally {
        window.clearTimeout(timer)
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [listId])

  return { opts, err }
}

function PortalListSelectControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const { opts, err } = usePortalListOptions(field.portalListId)

  const selected = useMemo(() => {
    if (opts === null || err) return null
    const found = opts.find((o) => o.value === value)
    if (found) return found
    if (value) return { value, label: `${value} (valor guardado)` }
    return null
  }, [opts, value, err])

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder="A carregar…"
        InputProps={{
          endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} />,
        }}
        helperText="A carregar itens da lista do portal…"
      />
    )
  }

  if (err) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label}
        value={err}
        error
        helperText="Confirme se a lista existe em Banco de dados → Listas do portal."
      />
    )
  }

  return (
    <Autocomplete
      disabled={disabled}
      options={opts}
      filterOptions={filterNexusOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      value={selected}
      onChange={(_, newVal) => onChange(field.key, newVal?.value ?? '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          placeholder="Escreva para filtrar ou escolha na lista"
          helperText={
            opts.length === 0
              ? 'Nenhum item nesta lista. Peça ao administrador para adicionar itens em Banco de dados → Listas do portal.'
              : 'Lista gerida no portal.'
          }
        />
      )}
    />
  )
}

function PortalListMultiSelectControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const { opts, err } = usePortalListOptions(field.portalListId)
  const ids = useMemo(() => parseMultiIds(value), [value])
  const selectedOpts = useMemo(() => {
    if (!opts || err) return []
    return ids.map((id) => opts.find((o) => o.value === id) ?? { value: id, label: `${id} (guardado)` })
  }, [opts, ids, err])

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        InputProps={{ endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} /> }}
        helperText="A carregar lista do portal…"
      />
    )
  }

  if (err) {
    return <TextField fullWidth disabled label={field.label} value={err} error helperText={err} />
  }

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={opts}
      filterOptions={filterNexusOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      value={selectedOpts}
      onChange={(_, newVal) => onChange(field.key, serializeMultiIds(newVal.map((o) => o.value)))}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          placeholder="Escolha um ou mais itens"
          helperText="Lista gerida no portal."
        />
      )}
    />
  )
}

function PortalListMultiSelectWithOtherControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const { opts, err } = usePortalListOptions(field.portalListId)
  const otherLabel = field.otherLabel?.trim() || 'Outro (cadastro manual)'
  const otherOption: Opt = { value: PORTAL_SELECT_OTHER_VALUE, label: otherLabel }
  const parsed = useMemo(() => parseMultiWithOther(value), [value])
  const allOpts = useMemo(() => (!opts || err ? [] : [...opts, otherOption]), [opts, err, otherOption])

  const selectedOpts = useMemo(() => {
    if (!opts || err) return []
    const fromIds = parsed.ids.map(
      (id) => opts.find((o) => o.value === id) ?? { value: id, label: `${id} (guardado)` }
    )
    const extra = parsed.other !== null ? [otherOption] : []
    return [...fromIds, ...extra]
  }, [opts, err, parsed, otherOption])

  const showOtherText = parsed.other !== null
  const otherText = parsed.other ?? ''

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        InputProps={{ endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} /> }}
        helperText="A carregar lista do portal…"
      />
    )
  }

  if (err) {
    return <TextField fullWidth disabled label={field.label} value={err} error helperText={err} />
  }

  return (
    <Box>
      <Autocomplete
        multiple
        disabled={disabled}
        options={allOpts}
        filterOptions={filterNexusOptions}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        value={selectedOpts}
        onChange={(_, newVal) => {
          const list = newVal ?? []
          const hasOtherChip = list.some((o) => o.value === PORTAL_SELECT_OTHER_VALUE)
          const ids = list.filter((o) => o.value !== PORTAL_SELECT_OTHER_VALUE).map((o) => o.value)
          const prev = parseMultiWithOther(value)
          const other = hasOtherChip
            ? prev.other !== null && prev.other !== undefined
              ? prev.other
              : ''
            : null
          onChange(field.key, serializeMultiWithOther({ ids, other }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            placeholder="Escolha um ou mais itens ou «Outro»"
            helperText="Lista do portal; pode combinar várias opções com texto livre."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Descrever (cadastro manual)"
          value={otherText}
          disabled={disabled}
          required={field.required}
          placeholder={field.otherPlaceholder || 'Detalhe o valor'}
          onChange={(e) => {
            const p = parseMultiWithOther(value)
            onChange(field.key, serializeMultiWithOther({ ids: p.ids, other: e.target.value }))
          }}
        />
      )}
    </Box>
  )
}

function PortalListSelectWithOtherControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const { opts, err } = usePortalListOptions(field.portalListId)
  const otherLabel = field.otherLabel?.trim() || 'Outro (cadastro manual)'
  const otherOption: Opt = { value: PORTAL_SELECT_OTHER_VALUE, label: otherLabel }
  const parsed = useMemo(() => parseSelectWithOther(value), [value])
  const allOpts = useMemo(() => {
    if (!opts || err) return []
    return [...opts, otherOption]
  }, [opts, err, otherLabel])
  const selected = useMemo(() => {
    if (!opts || err) return null
    if (parsed.id) {
      const hit = opts.find((o) => o.value === parsed.id)
      if (hit) return hit
      return { value: parsed.id, label: `${parsed.id} (valor guardado)` }
    }
    if (parsed.other !== null) return otherOption
    return null
  }, [opts, err, parsed, otherOption])
  const showOtherText = parsed.id === null && parsed.other !== null
  const otherText = showOtherText ? parsed.other ?? '' : ''

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        InputProps={{ endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} /> }}
        helperText="A carregar lista do portal…"
      />
    )
  }

  if (err) {
    return <TextField fullWidth disabled label={field.label} value={err} error />
  }

  return (
    <Box>
      <Autocomplete
        disabled={disabled}
        options={allOpts}
        filterOptions={filterNexusOptions}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        value={selected}
        onChange={(_, newVal) => {
          if (!newVal) {
            onChange(field.key, '')
            return
          }
          if (newVal.value === PORTAL_SELECT_OTHER_VALUE) {
            onChange(field.key, serializeSelectWithOther({ id: null, other: '' }))
            return
          }
          onChange(field.key, serializeSelectWithOther({ id: newVal.value, other: null }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            placeholder="Lista ou outro"
            helperText="Escolha um item da lista ou «Outro»."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Descrever (cadastro manual)"
          value={otherText}
          disabled={disabled}
          required={field.required}
          placeholder={field.otherPlaceholder || 'Detalhe o valor'}
          onChange={(e) =>
            onChange(field.key, serializeSelectWithOther({ id: null, other: e.target.value }))
          }
        />
      )}
    </Box>
  )
}

function NexusSelectControl({
  field,
  value,
  values,
  allFields,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  values: Record<string, string>
  allFields: FormFieldDef[]
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const n = field.nexusOptions
  const { opts, err, blocked, misconfigured, parentLabel } = useNexusOptions(n, allFields, values)

  const selectedNexus = useMemo(() => {
    if (opts === null || err) return null
    const found = opts.find((o) => o.value === value)
    if (found) return found
    if (value) return { value, label: `${value} (valor guardado)` }
    return null
  }, [opts, value, err])

  if (misconfigured) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Configuração incompleta"
        error
        helperText={`Defina a coluna de filtro no tipo de solicitação (admin), ou remova o campo pai em «Lista dependente». Campo pai: ${n?.filterByParentKey || '—'}.`}
      />
    )
  }

  if (blocked) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder={`Selecione «${parentLabel}» antes`}
        helperText={`Este campo depende de «${parentLabel}». Escolha o valor acima para carregar a lista filtrada do Nexus.`}
      />
    )
  }

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder="A carregar…"
        InputProps={{
          endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} />,
        }}
        helperText="A carregar dados sincronizados do Nexus (até 30 s)…"
      />
    )
  }

  if (err) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label}
        value={err}
        error
        helperText="Confirme NEXUS_API_*, sincronização na aba Banco de dados e rede. Recarregue a página se o erro persistir."
      />
    )
  }

  return (
    <Autocomplete
      disabled={disabled}
      options={opts}
      loading={false}
      filterOptions={filterNexusOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      value={selectedNexus}
      onChange={(_, newVal) => onChange(field.key, newVal?.value ?? '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          placeholder="Escreva para filtrar ou escolha na lista"
          helperText={
            opts.length === 0
              ? 'Nenhum registo no Nexus para este filtro. Ajuste a seleção ou peça sincronização dos dados.'
              : 'Digite para procurar; os dados vêm do Nexus sincronizado.'
          }
        />
      )}
    />
  )
}

function NexusMultiSelectControl({
  field,
  value,
  values,
  allFields,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  values: Record<string, string>
  allFields: FormFieldDef[]
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const n = field.nexusOptions
  const { opts, err, blocked, misconfigured, parentLabel } = useNexusOptions(n, allFields, values)

  const ids = useMemo(() => parseMultiIds(value), [value])

  const selectedOpts = useMemo(() => {
    if (!opts || err) return []
    return ids.map((id) => opts.find((o) => o.value === id) ?? { value: id, label: `${id} (guardado)` })
  }, [opts, ids, err])

  if (misconfigured) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Configuração incompleta"
        error
        helperText={`Defina a coluna de filtro no tipo de solicitação (admin). Campo pai: ${n?.filterByParentKey || '—'}.`}
      />
    )
  }

  if (blocked) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder={`Selecione «${parentLabel}» antes`}
        helperText={`Este campo depende de «${parentLabel}». Escolha o valor acima para carregar a lista filtrada do Nexus.`}
      />
    )
  }

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder="A carregar…"
        InputProps={{
          endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} />,
        }}
        helperText="A carregar dados do Nexus (várias escolhas)…"
      />
    )
  }

  if (err) {
    return (
      <TextField fullWidth disabled label={field.label} value={err} error helperText={err} />
    )
  }

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={opts}
      filterOptions={filterNexusOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      value={selectedOpts}
      onChange={(_, newVal) => onChange(field.key, serializeMultiIds(newVal.map((o) => o.value)))}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          placeholder="Escolha um ou mais itens"
          helperText="Várias escolhas; dados do Nexus sincronizado."
        />
      )}
    />
  )
}

function NexusMultiSelectWithOtherControl({
  field,
  value,
  values,
  allFields,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  values: Record<string, string>
  allFields: FormFieldDef[]
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const n = field.nexusOptions
  const { opts, err, blocked, misconfigured, parentLabel } = useNexusOptions(n, allFields, values)
  const otherLabel = field.otherLabel?.trim() || 'Outro (cadastro manual)'
  const otherOption: Opt = { value: PORTAL_SELECT_OTHER_VALUE, label: otherLabel }
  const parsed = useMemo(() => parseMultiWithOther(value), [value])

  const allOpts = useMemo(() => (!opts || err ? [] : [...opts, otherOption]), [opts, err, otherOption])

  const selectedOpts = useMemo(() => {
    if (!opts || err) return []
    const fromIds = parsed.ids.map(
      (id) => opts.find((o) => o.value === id) ?? { value: id, label: `${id} (guardado)` }
    )
    const extra = parsed.other !== null ? [otherOption] : []
    return [...fromIds, ...extra]
  }, [opts, err, parsed, otherOption])

  const showOtherText = parsed.other !== null
  const otherText = parsed.other ?? ''

  if (misconfigured) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Configuração incompleta"
        error
        helperText={`Defina a coluna de filtro no tipo de solicitação (admin). Campo pai: ${n?.filterByParentKey || '—'}.`}
      />
    )
  }

  if (blocked) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder={`Selecione «${parentLabel}» antes`}
        helperText={`Este campo depende de «${parentLabel}».`}
      />
    )
  }

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        InputProps={{ endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} /> }}
        helperText="A carregar dados do Nexus…"
      />
    )
  }

  if (err) {
    return <TextField fullWidth disabled label={field.label} value={err} error helperText={err} />
  }

  return (
    <Box>
      <Autocomplete
        multiple
        disabled={disabled}
        options={allOpts}
        filterOptions={filterNexusOptions}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        value={selectedOpts}
        onChange={(_, newVal) => {
          const list = newVal ?? []
          const hasOtherChip = list.some((o) => o.value === PORTAL_SELECT_OTHER_VALUE)
          const ids = list.filter((o) => o.value !== PORTAL_SELECT_OTHER_VALUE).map((o) => o.value)
          const prev = parseMultiWithOther(value)
          const other = hasOtherChip
            ? prev.other !== null && prev.other !== undefined
              ? prev.other
              : ''
            : null
          onChange(field.key, serializeMultiWithOther({ ids, other }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            placeholder="Escolha um ou mais ou «Outro»"
            helperText="Várias escolhas no Nexus e texto livre opcional."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Descrever (cadastro manual)"
          value={otherText}
          disabled={disabled}
          required={field.required}
          placeholder={field.otherPlaceholder || 'Detalhe o valor'}
          onChange={(e) => {
            const p = parseMultiWithOther(value)
            onChange(field.key, serializeMultiWithOther({ ids: p.ids, other: e.target.value }))
          }}
          helperText="Este texto é guardado na solicitação."
        />
      )}
    </Box>
  )
}

function NexusSelectWithOtherControl({
  field,
  value,
  values,
  allFields,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  values: Record<string, string>
  allFields: FormFieldDef[]
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const n = field.nexusOptions
  const { opts, err, blocked, misconfigured, parentLabel } = useNexusOptions(n, allFields, values)

  const otherLabel = field.otherLabel?.trim() || 'Outro (cadastro manual)'
  const otherOption: Opt = { value: PORTAL_SELECT_OTHER_VALUE, label: otherLabel }

  const parsed = useMemo(() => parseSelectWithOther(value), [value])

  const allOpts = useMemo(() => {
    if (!opts || err) return []
    return [...opts, otherOption]
  }, [opts, err, otherLabel])

  const selected = useMemo(() => {
    if (!opts || err) return null
    if (parsed.id) {
      const hit = opts.find((o) => o.value === parsed.id)
      if (hit) return hit
      return { value: parsed.id, label: `${parsed.id} (valor guardado)` }
    }
    if (parsed.other !== null) return otherOption
    return null
  }, [opts, err, parsed, otherOption])

  const showOtherText = parsed.id === null && parsed.other !== null
  const otherText = showOtherText ? parsed.other ?? '' : ''

  if (misconfigured) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Configuração incompleta"
        error
        helperText={`Campo pai: ${n?.filterByParentKey || '—'}.`}
      />
    )
  }

  if (blocked) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder={`Selecione «${parentLabel}» antes`}
        helperText={`Depende de «${parentLabel}».`}
      />
    )
  }

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        InputProps={{ endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} /> }}
        helperText="A carregar dados do Nexus…"
      />
    )
  }

  if (err) {
    return <TextField fullWidth disabled label={field.label} value={err} error />
  }

  return (
    <Box>
      <Autocomplete
        disabled={disabled}
        options={allOpts}
        filterOptions={filterNexusOptions}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        value={selected}
        onChange={(_, newVal) => {
          if (!newVal) {
            onChange(field.key, '')
            return
          }
          if (newVal.value === PORTAL_SELECT_OTHER_VALUE) {
            onChange(field.key, serializeSelectWithOther({ id: null, other: '' }))
            return
          }
          onChange(field.key, serializeSelectWithOther({ id: newVal.value, other: null }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            placeholder="Lista ou outro"
            helperText="Pode escolher um registo do Nexus ou «Outro» para informar um valor novo."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Descrever (cadastro manual)"
          value={otherText}
          disabled={disabled}
          required={field.required}
          placeholder={field.otherPlaceholder || 'Nome ou identificação do novo registo'}
          onChange={(e) =>
            onChange(field.key, serializeSelectWithOther({ id: null, other: e.target.value }))
          }
          helperText="Este texto é guardado na solicitação; o cadastro no Nexus pode ser feito depois pela equipa."
        />
      )}
    </Box>
  )
}

function ManualMultiSelectControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const opts = field.options ?? []
  const ids = useMemo(() => parseMultiIds(value), [value])
  const selected = useMemo(() => ids.filter((id) => opts.includes(id)), [ids, opts])

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={opts}
      filterOptions={filterStringOptions}
      value={selected}
      onChange={(_, newVal) => onChange(field.key, serializeMultiIds(newVal))}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          helperText="Várias escolhas a partir da lista fixa definida no tipo."
        />
      )}
    />
  )
}

function ManualMultiSelectWithOtherControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const opts = field.options ?? []
  const otherLabel = field.otherLabel?.trim() || 'Outro (especificar)'
  const parsed = useMemo(() => parseMultiWithOther(value), [value])
  const allOpts = useMemo(() => [...opts, otherLabel], [opts, otherLabel])

  const selected = useMemo(() => {
    const fromList = parsed.ids.filter((id) => opts.includes(id))
    const extra = parsed.other !== null ? [otherLabel] : []
    return [...fromList, ...extra]
  }, [parsed, opts, otherLabel])

  const showOtherText = parsed.other !== null
  const otherText = parsed.other ?? ''

  return (
    <Box>
      <Autocomplete
        multiple
        disabled={disabled}
        options={allOpts}
        filterOptions={filterStringOptions}
        value={selected}
        onChange={(_, newVal) => {
          const list = newVal ?? []
          const hasOther = list.includes(otherLabel)
          const ids = list.filter((x) => x !== otherLabel && opts.includes(x))
          const prev = parseMultiWithOther(value)
          const other = hasOther
            ? prev.other !== null && prev.other !== undefined
              ? prev.other
              : ''
            : null
          onChange(field.key, serializeMultiWithOther({ ids, other }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            helperText="Lista fixa; pode escolher várias opções e «Outro» com texto livre."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Especificar"
          value={otherText}
          disabled={disabled}
          placeholder={field.otherPlaceholder || ''}
          onChange={(e) => {
            const p = parseMultiWithOther(value)
            onChange(field.key, serializeMultiWithOther({ ids: p.ids, other: e.target.value }))
          }}
        />
      )}
    </Box>
  )
}

function ManualSelectWithOtherControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const opts = field.options ?? []
  const otherLabel = field.otherLabel?.trim() || 'Outro (especificar)'
  const otherOption = otherLabel
  const allOpts = [...opts, otherOption]

  const parsed = useMemo(() => parseSelectWithOther(value), [value])

  const selected = useMemo(() => {
    if (parsed.id && opts.includes(parsed.id)) return parsed.id
    if (parsed.other !== null) return otherOption
    return null
  }, [parsed, opts, otherOption])

  const showOtherText = parsed.id === null && parsed.other !== null
  const otherText = showOtherText ? parsed.other ?? '' : ''

  return (
    <Box>
      <Autocomplete
        disabled={disabled}
        options={allOpts}
        filterOptions={filterStringOptions}
        value={selected}
        onChange={(_, newVal) => {
          if (newVal == null) {
            onChange(field.key, '')
            return
          }
          if (newVal === otherOption) {
            onChange(field.key, serializeSelectWithOther({ id: null, other: '' }))
            return
          }
          onChange(field.key, serializeSelectWithOther({ id: newVal, other: null }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            helperText="Lista fixa ou «Outro» para texto livre."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Especificar"
          value={otherText}
          disabled={disabled}
          placeholder={field.otherPlaceholder || ''}
          onChange={(e) =>
            onChange(field.key, serializeSelectWithOther({ id: null, other: e.target.value }))
          }
        />
      )}
    </Box>
  )
}

export default function DynamicFormFields({
  fields,
  values,
  onChange,
  disabled,
  rules,
  clearOnHide,
  onFileUploadError,
  onFileUploadSuccess,
}: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const groupCsvFileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [groupImportOpen, setGroupImportOpen] = useState<Record<string, boolean>>({})
  const [groupImportText, setGroupImportText] = useState<Record<string, string>>({})
  const [groupImportErr, setGroupImportErr] = useState<Record<string, string | null>>({})

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      onChange(key, value)
      for (const d of collectDescendantKeys(fields, key)) {
        onChange(d, '')
      }
    },
    [fields, onChange]
  )

  if (fields.length === 0) return null

  const { visibleByKey, requiredByKey } = useMemo(
    () => applyConditionalRules(fields, rules ?? [], values),
    [fields, rules, values]
  )

  const prevVisibleRef = useRef<Record<string, boolean> | null>(null)
  useEffect(() => {
    const prev = prevVisibleRef.current
    prevVisibleRef.current = visibleByKey
    if (prev == null) return
    if (clearOnHide === false) return
    for (const [k, nowVisible] of Object.entries(visibleByKey)) {
      const was = prev[k]
      if (was !== false && nowVisible === false) {
        // limpar valor do campo ou do grupo
        onChange(k, '')
      }
    }
  }, [visibleByKey, clearOnHide, onChange])

  const groupKeysInOrder = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const f of fields) {
      const g = (f.repeatGroupKey ?? '').trim()
      if (!g) continue
      if (seen.has(g)) continue
      seen.add(g)
      out.push(g)
    }
    return out
  }, [fields])

  const groupFields = useMemo(() => {
    const map = new Map<string, FormFieldDef[]>()
    for (const g of groupKeysInOrder) map.set(g, [])
    for (const f of fields) {
      const g = (f.repeatGroupKey ?? '').trim()
      if (!g) continue
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(f)
    }
    return map
  }, [fields, groupKeysInOrder])

  useEffect(() => {
    // Auto-criação de linhas do grupo baseada em um campo numérico (ex.: quantos_usuarios)
    for (const gk of groupKeysInOrder) {
      if (visibleByKey[gk] === false) continue
      const cols = groupFields.get(gk) ?? []
      if (cols.length === 0) continue
      const src = cols[0]?.repeatGroupSource
      const minRows = Math.min(25, Math.max(1, src?.minRows ?? 1))
      const max = Math.min(25, Math.max(1, cols[0]?.repeatGroupMax ?? 25))
      const countKey = (src?.countFromKey ?? '').trim()
      const rawCount = countKey ? (values[countKey] ?? '').trim() : ''
      const parsed = rawCount ? Number(rawCount) : NaN
      const desired = Number.isFinite(parsed) && parsed > 0 ? Math.min(max, Math.trunc(parsed)) : Math.min(max, minRows)

      const curRaw = values[gk] ?? ''
      const curRows = parseRepeatGroupRows(curRaw)
      if (curRows.length === desired) continue
      const next = curRows.slice(0, desired)
      while (next.length < desired) next.push({})
      handleFieldChange(gk, serializeRepeatGroupRows(next))
    }
  }, [groupKeysInOrder, groupFields, values, visibleByKey, handleFieldChange])

  function renderSingleField(
    f: FormFieldDef,
    v: string,
    onRawChange: (next: string) => void,
    renderKey: string
  ) {
    const effectiveRequired = requiredByKey[f.key] ?? !!f.required
    const ff = { ...f, required: effectiveRequired }
    if (f.type === 'file') {
      const attachment = parseAttachmentRefString(v)
      const busy = uploadingKey === f.key
      return (
        <Box key={renderKey}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {ff.label}
            {ff.required ? ' *' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            O arquivo é enviado para o Cloudflare R2 (não fica na base de dados).
          </Typography>
          <input
            type="file"
            hidden
            ref={(el) => {
              fileInputRefs.current[f.key] = el
            }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setUploadingKey(f.key)
              const result = await uploadAttachment(file)
              setUploadingKey(null)
              if (!result.ok) {
                onFileUploadError?.(result.error)
                return
              }
              onRawChange(JSON.stringify(result.ref))
              onFileUploadSuccess?.()
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={busy ? <CircularProgress size={16} /> : <AttachFileIcon />}
              disabled={disabled || busy}
              onClick={() => fileInputRefs.current[f.key]?.click()}
            >
              {attachment ? 'Substituir arquivo' : 'Escolher arquivo'}
            </Button>
            {attachment && (
              <Typography variant="body2" color="text.secondary">
                {attachment.fileName}
              </Typography>
            )}
          </Box>
        </Box>
      )
    }
    if (f.type === 'textarea') {
      return (
        <TextField
          key={renderKey}
          fullWidth
          multiline
          minRows={3}
          label={ff.label + (ff.required ? ' *' : '')}
          value={v}
          onChange={(e) => onRawChange(e.target.value)}
          required={ff.required}
          disabled={disabled}
          placeholder={ff.placeholder}
        />
      )
    }
    if (f.type === 'number') {
      return (
        <TextField
          key={renderKey}
          fullWidth
          type="number"
          label={ff.label + (ff.required ? ' *' : '')}
          value={v}
          onChange={(e) => onRawChange(e.target.value)}
          required={ff.required}
          disabled={disabled}
        />
      )
    }
    if (f.type === 'date') {
      return (
        <TextField
          key={renderKey}
          fullWidth
          type="date"
          label={ff.label + (ff.required ? ' *' : '')}
          value={v}
          onChange={(e) => onRawChange(e.target.value)}
          required={ff.required}
          disabled={disabled}
          InputLabelProps={{ shrink: true }}
        />
      )
    }
    if (f.type === 'checkbox') {
      return (
        <FormControlLabel
          key={renderKey}
          control={
            <Checkbox
              checked={v === 'true'}
              onChange={(_, checked) => onRawChange(checked ? 'true' : 'false')}
              disabled={disabled}
            />
          }
          label={ff.label + (ff.required ? ' *' : '')}
        />
      )
    }
    if (f.type === 'select' && f.selectListSource === 'portal' && !f.portalListId) {
      return (
        <TextField
          key={renderKey}
          fullWidth
          disabled
          label={ff.label + (ff.required ? ' *' : '')}
          value=""
          helperText="No admin, em Áreas e tipos, abra este tipo e escolha qual lista do portal usar neste campo."
        />
      )
    }
    if (f.type === 'select' && f.portalListId) {
      if (f.multiple && f.allowOther) {
        return (
          <PortalListMultiSelectWithOtherControl
            key={renderKey}
            field={f}
            value={v}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      if (f.multiple) {
        return (
          <PortalListMultiSelectControl
            key={renderKey}
            field={f}
            value={v}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      if (f.allowOther) {
        return (
          <PortalListSelectWithOtherControl
            key={renderKey}
            field={f}
            value={v}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      return (
        <PortalListSelectControl
          key={renderKey}
          field={f}
          value={v}
          onChange={(_, next) => onRawChange(next)}
          disabled={disabled}
        />
      )
    }
    if (f.type === 'select' && f.nexusOptions) {
      if (f.multiple && f.allowOther) {
        return (
          <NexusMultiSelectWithOtherControl
            key={renderKey}
            field={f}
            value={v}
            values={values}
            allFields={fields}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      if (f.multiple) {
        return (
          <NexusMultiSelectControl
            key={renderKey}
            field={f}
            value={v}
            values={values}
            allFields={fields}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      if (f.allowOther) {
        return (
          <NexusSelectWithOtherControl
            key={renderKey}
            field={f}
            value={v}
            values={values}
            allFields={fields}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      return (
        <NexusSelectControl
          key={renderKey}
          field={f}
          value={v}
          values={values}
          allFields={fields}
          onChange={(_, next) => onRawChange(next)}
          disabled={disabled}
        />
      )
    }
    if (f.type === 'select' && f.options?.length) {
      if (f.multiple && f.allowOther) {
        return (
          <ManualMultiSelectWithOtherControl
            key={renderKey}
            field={f}
            value={v}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      if (f.multiple) {
        return (
          <ManualMultiSelectControl
            key={renderKey}
            field={f}
            value={v}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      if (f.allowOther) {
        return (
          <ManualSelectWithOtherControl
            key={renderKey}
            field={f}
            value={v}
            onChange={(_, next) => onRawChange(next)}
            disabled={disabled}
          />
        )
      }
      const selectedManual = v && f.options.includes(v) ? v : null
      return (
        <Autocomplete
          key={renderKey}
          disabled={disabled}
          options={f.options}
          filterOptions={filterStringOptions}
          value={selectedManual}
          onChange={(_, newVal) => onRawChange(newVal ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label={ff.label + (ff.required ? ' *' : '')}
              required={ff.required}
              placeholder="Escreva para filtrar ou escolha na lista"
              helperText="Digite para procurar nas opções definidas no tipo de demanda."
            />
          )}
        />
      )
    }
    if (f.type === 'select') {
      return (
        <TextField
          key={renderKey}
          fullWidth
          disabled
          label={f.label}
          value="Configure opções (manual) ou origem Nexus no formulário."
        />
      )
    }
    return (
      <TextField
        key={renderKey}
        fullWidth
        label={ff.label + (ff.required ? ' *' : '')}
        value={v}
        onChange={(e) => onRawChange(e.target.value)}
        required={ff.required}
        disabled={disabled}
        placeholder={ff.placeholder}
      />
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2,
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
        Campos do tipo de solicitação
      </Typography>

      {(() => {
        const renderedGroups = new Set<string>()

        const renderGroup = (gk: string) => {
          if (visibleByKey[gk] === false) return null
          const gFields = groupFields.get(gk) ?? []
          const max = Math.min(25, Math.max(1, gFields[0]?.repeatGroupMax ?? 25))
          const raw = values[gk] ?? ''
          const rows = parseRepeatGroupRows(raw)
          const visibleCols = gFields.filter((c) => visibleByKey[c.key] !== false)
          if (visibleCols.length === 0) return null

          const importOpen = groupImportOpen[gk] === true
          const importText = groupImportText[gk] ?? ''
          const parsed = importText.trim() ? parseCsv(importText) : { headers: [], rows: [] }
          const parsedRows = parsed.rows
            .map((r) => {
              const out: Record<string, string> = {}
              for (const col of visibleCols) out[col.key] = (r[col.key] ?? '').trim()
              return out
            })
            .filter((r) => Object.values(r).some((v) => (v ?? '').trim()))
          const importErr = groupImportErr[gk]

          const groupColsGrid =
            visibleCols.length >= 3
              ? { xs: '1fr', md: '1fr 1fr 1fr' }
              : { xs: '1fr', md: '1fr 1fr' }

          return (
            <Box key={`group__${gk}`} sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Grupo: {gk}
              </Typography>

              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const headers = visibleCols.map((c) => c.key).join(',')
                      const csv = `${headers}\n`
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `template_${gk}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    Baixar template CSV
                  </Button>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    hidden
                    ref={(el) => {
                      groupCsvFileRefs.current[gk] = el
                    }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (!f) return
                      const reader = new FileReader()
                      reader.onload = () => {
                        setGroupImportErr((p) => ({ ...p, [gk]: null }))
                        setGroupImportText((p) => ({ ...p, [gk]: String(reader.result ?? '') }))
                        setGroupImportOpen((p) => ({ ...p, [gk]: true }))
                      }
                      reader.readAsText(f, 'UTF-8')
                    }}
                  />
                  <Button size="small" variant="outlined" onClick={() => groupCsvFileRefs.current[gk]?.click()}>
                    Enviar CSV
                  </Button>
                  <Button size="small" onClick={() => setGroupImportOpen((p) => ({ ...p, [gk]: !importOpen }))}>
                    {importOpen ? 'Fechar importação' : 'Importar em massa'}
                  </Button>
                </Stack>

                <Collapse in={importOpen}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 1 }}>
                    O CSV deve ter cabeçalho com as chaves: {visibleCols.map((c) => c.key).join(', ')}.
                  </Typography>
                  {importErr ? (
                    <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                      {importErr}
                    </Typography>
                  ) : null}
                  <TextField
                    label="Colar CSV"
                    value={importText}
                    onChange={(e) => {
                      setGroupImportText((p) => ({ ...p, [gk]: e.target.value }))
                      setGroupImportErr((p) => ({ ...p, [gk]: null }))
                    }}
                    multiline
                    minRows={4}
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={disabled || parsedRows.length === 0}
                      onClick={() => {
                        const next = parsedRows.slice(0, max)
                        handleFieldChange(gk, serializeRepeatGroupRows(next.length ? next : [{}]))
                        setGroupImportText((p) => ({ ...p, [gk]: '' }))
                      }}
                    >
                      Aplicar (substituir) {parsedRows.length} linha(s)
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={disabled || parsedRows.length === 0 || rows.length >= max}
                      onClick={() => {
                        const merged = [...rows, ...parsedRows].slice(0, max)
                        handleFieldChange(gk, serializeRepeatGroupRows(merged.length ? merged : [{}]))
                        setGroupImportText((p) => ({ ...p, [gk]: '' }))
                      }}
                    >
                      Acrescentar
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Prévia: {parsedRows.length} linha(s) reconhecida(s).
                  </Typography>
                </Collapse>
              </Paper>

              {rows.map((row, idx) => (
                <Paper key={`group__${gk}__row_${idx}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                      Grupo {idx + 1}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      disabled={disabled || rows.length <= 1}
                      onClick={() => {
                        const next = rows.filter((_, j) => j !== idx)
                        handleFieldChange(gk, serializeRepeatGroupRows(next.length ? next : [{}]))
                      }}
                    >
                      Remover
                    </Button>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: groupColsGrid, gap: 1.5 }}>
                    {visibleCols.map((col) => {
                      const inner: FormFieldDef = { ...col, repeatGroupKey: undefined, repeatable: false }
                      const cellVal = row[col.key] ?? ''
                      const cellKey = `group__${gk}__row_${idx}__col_${col.key}`
                      return (
                        <Box key={cellKey}>
                          {renderSingleField(
                            inner,
                            cellVal,
                            (nextRaw) => {
                              const nextRows = [...rows]
                              const nextRow = { ...(nextRows[idx] ?? {}) }
                              nextRow[col.key] = nextRaw
                              nextRows[idx] = nextRow
                              handleFieldChange(gk, serializeRepeatGroupRows(nextRows))
                            },
                            cellKey
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                </Paper>
              ))}

              <Button
                size="small"
                variant="outlined"
                disabled={disabled || rows.length >= max}
                onClick={() => {
                  const next = [...rows, {}]
                  handleFieldChange(gk, serializeRepeatGroupRows(next))
                }}
              >
                Adicionar linha
              </Button>
              <Typography variant="caption" color="text.secondary">
                Máximo {max} linhas.
              </Typography>
            </Box>
          )
        }

        const out: (JSX.Element | null)[] = []
        for (const f of fields) {
          const gk = (f.repeatGroupKey ?? '').trim()
          if (gk) {
            if (!renderedGroups.has(gk)) {
              renderedGroups.add(gk)
              out.push(renderGroup(gk))
            }
            continue
          }

          if (visibleByKey[f.key] === false) continue
          const v = values[f.key] ?? ''

          if (f.type === 'section') {
            out.push(
              <Box key={f.key} sx={{ gridColumn: '1 / -1', pt: 1 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                  {f.label}
                </Typography>
                {f.description?.trim() ? (
                  <Typography variant="body2" color="text.secondary">
                    {f.description}
                  </Typography>
                ) : null}
              </Box>
            )
            continue
          }
          if (f.type === 'subtitle') {
            out.push(
              <Box key={f.key} sx={{ gridColumn: '1 / -1', pt: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                  {f.label}
                </Typography>
              </Box>
            )
            continue
          }

          if (f.repeatable) {
            const max = Math.min(25, Math.max(1, f.repeatMax ?? 25))
            if (f.type === 'file') {
              out.push(
                <Box key={f.key} sx={{ gridColumn: '1 / -1' }}>
                  <TextField
                    fullWidth
                    disabled
                    label={f.label}
                    value="Não suportado"
                    helperText="Campo duplicável não suporta upload nesta versão."
                  />
                </Box>
              )
              continue
            }
            const parts = parseRepeatValues(v)
            out.push(
              <Box key={f.key} sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" fontWeight={700}>
                  {f.label}
                  {f.required ? ' *' : ''}
                </Typography>
                {parts.map((pv, idx) => {
                  const inner: FormFieldDef = { ...f, repeatable: false }
                  const key = `${f.key}__rep_${idx}`
                  return (
                    <Paper key={key} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                          Entrada {idx + 1}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          disabled={disabled || parts.length <= 1}
                          onClick={() => {
                            const next = parts.filter((_, j) => j !== idx)
                            handleFieldChange(f.key, serializeRepeatValues(next.length ? next : ['']))
                          }}
                        >
                          Remover
                        </Button>
                      </Box>
                      {renderSingleField(
                        inner,
                        pv,
                        (nextRaw) => {
                          const next = [...parts]
                          next[idx] = nextRaw
                          handleFieldChange(f.key, serializeRepeatValues(next))
                        },
                        `${key}__control`
                      )}
                    </Paper>
                  )
                })}
                <Button
                  size="small"
                  variant="outlined"
                  disabled={disabled || parts.length >= max}
                  onClick={() => {
                    const next = [...parts, '']
                    handleFieldChange(f.key, serializeRepeatValues(next))
                  }}
                >
                  Adicionar mais
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Máximo {max} entradas.
                </Typography>
              </Box>
            )
            continue
          }

          const isWide =
            f.type === 'file' ||
            f.type === 'textarea' ||
            (f.type === 'select' && !!f.allowOther)

          out.push(
            <Box key={f.key} sx={isWide ? { gridColumn: '1 / -1' } : undefined}>
              {renderSingleField(f, v, (next) => handleFieldChange(f.key, next), f.key)}
            </Box>
          )
        }

        return out
      })()}
    </Box>
  )
}

import { useRef, useState } from 'react'
import {
  Button,
  Collapse,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { parseManualFormOptionsImport } from '../lib/nexusCatalog'

type Props = {
  options: string[]
  onChange: (next: string[]) => void
}

function dedupeMerge(a: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of a) {
    const t = p.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

export default function ManualSelectOptionsEditor({ options, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')

  const rows = options.length > 0 ? options : ['']

  function commit(next: string[]) {
    onChange(next.map((x) => x.trim()).filter((x) => x.length > 0))
  }

  function setRow(i: number, v: string) {
    const base = options.length > 0 ? [...options] : ['']
    while (base.length <= i) base.push('')
    base[i] = v
    commit(base)
  }

  function addRow() {
    const cur = options.length > 0 ? [...options] : []
    onChange([...cur, 'Nova opção'])
  }

  function removeRow(i: number) {
    if (rows.length <= 1) return
    const base = options.length > 0 ? [...options] : ['']
    base.splice(i, 1)
    commit(base)
  }

  function applyBulk(merge: boolean) {
    const parsed = parseManualFormOptionsImport(bulkText)
    if (parsed.length === 0) return
    const cur = options.length > 0 ? options : []
    const next = merge ? [...cur, ...parsed] : parsed
    onChange(dedupeMerge(next))
    setBulkText('')
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Uma linha por opção. O texto aparece no formulário e é o valor guardado.
      </Typography>
      <Stack spacing={1}>
        {rows.map((opt, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
            <TextField
              label={`Opção ${i + 1}`}
              value={opt}
              onChange={(e) => setRow(i, e.target.value)}
              size="small"
              fullWidth
              placeholder="Texto da opção"
            />
            <IconButton
              size="small"
              aria-label="Remover opção"
              onClick={() => removeRow(i)}
              disabled={rows.length <= 1}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button size="small" variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={addRow}>
        Adicionar opção
      </Button>

      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
        <Button size="small" onClick={() => setAdvancedOpen((o) => !o)} sx={{ mb: advancedOpen ? 1 : 0 }}>
          {advancedOpen ? '▼' : '▶'} Importar em massa (arquivo ou colar)
        </Button>
        <Collapse in={advancedOpen}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Aceita .csv / .txt: uma opção por linha, ou várias na mesma linha separadas por vírgula ou ponto e vírgula.
            Com tab, usa-se a primeira coluna de cada linha.
          </Typography>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const reader = new FileReader()
              reader.onload = () => setBulkText(String(reader.result ?? ''))
              reader.readAsText(f, 'UTF-8')
              e.target.value = ''
            }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Button size="small" variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => fileRef.current?.click()}>
              Escolher arquivo
            </Button>
          </Stack>
          <TextField
            label="Colar opções"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            multiline
            minRows={4}
            fullWidth
            size="small"
            placeholder={'Opção A\nOpção B\nOpção C'}
            sx={{ mb: 1 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="contained" disabled={!bulkText.trim()} onClick={() => applyBulk(false)}>
              Substituir todas
            </Button>
            <Button size="small" variant="outlined" disabled={!bulkText.trim()} onClick={() => applyBulk(true)}>
              Acrescentar às existentes
            </Button>
          </Stack>
        </Collapse>
      </Paper>
    </Stack>
  )
}

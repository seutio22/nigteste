import React, { useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import { downloadXlsxTemplate } from '../lib/dadosSpreadsheet'

export type DadosTableUploadConfig = {
  tableLabel: string
  filename: string
  headers: readonly string[]
  exampleRows?: Record<string, unknown>[]
  importFile: (file: File) => Promise<{ imported: number; errors: string[] }>
}

type Props = {
  config: DadosTableUploadConfig | null
  disabled?: boolean
  onImported?: () => void
}

export function DadosTableUploadBar({ config, disabled, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!config) return null

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { imported, errors } = await config.importFile(file)
      if (imported === 0 && errors.length) {
        throw new Error(errors.slice(0, 3).join(' · '))
      }
      const errPart = errors.length ? ` (${errors.length} linha(s) ignorada(s) ou com erro)` : ''
      setSuccess(`${imported} registro(s) importado(s) em ${config!.tableLabel}.${errPart}`)
      onImported?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao importar planilha.')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Importe vários registros de uma vez usando o modelo da tabela <strong>{config.tableLabel}</strong>.
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          disabled={disabled || loading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <UploadFileIcon />}
          disabled={disabled || loading}
          onClick={() => fileRef.current?.click()}
        >
          Importar planilha
        </Button>
        <Button
          size="small"
          variant="text"
          startIcon={<DownloadIcon />}
          disabled={disabled || loading}
          onClick={() =>
            downloadXlsxTemplate(config.filename, config.headers, config.exampleRows)
          }
        >
          Baixar modelo
        </Button>
      </Stack>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}
    </Stack>
  )
}

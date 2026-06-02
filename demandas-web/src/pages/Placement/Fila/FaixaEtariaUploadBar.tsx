import React, { useRef, useState } from 'react'
import { Alert, Button, CircularProgress, Stack } from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import {
  downloadFaixaEtariaTemplateXlsx,
  readFaixaEtariaUploadFile,
  type FaixaEtariaUploadResult,
} from './placementFaixaEtariaUpload'

type Props = {
  disabled?: boolean
  onImported: (result: FaixaEtariaUploadResult) => void
}

export function FaixaEtariaUploadBar({ disabled, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await readFaixaEtariaUploadFile(file)
      onImported(result)
      setSuccess(`${result.importedCount} faixa(s) importada(s).`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao importar planilha.')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
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
          onClick={() => void downloadFaixaEtariaTemplateXlsx()}
        >
          Baixar modelo
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
    </>
  )
}

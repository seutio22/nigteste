import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { api } from '../../lib/api.local'
import { resetFailedOperadoraLogoCache } from './Fila/placementOperadoraLogo'
import { useMasterDataStore } from '../../store/masterDataStore'
import { SnackNotification } from '../../components/SnackNotification'

type LogoRow = {
  id: string
  operadoraId: string
  operadoraNome: string
  mimeType: string
  size: number
  updatedAt: string
}

export default function OperadoraLogosTab() {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const [logos, setLogos] = useState<LogoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOperadoraId, setSelectedOperadoraId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  const loadLogos = useCallback(async () => {
    setLoading(true)
    try {
      const res = (await api.get('/placement/operadora-logos')) as { logos?: LogoRow[] }
      setLogos(res.logos ?? [])
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao carregar logos.',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLogos()
  }, [loadLogos])

  const logoByOperadoraId = useMemo(() => new Map(logos.map((l) => [l.operadoraId, l])), [logos])

  const selectedOp = operadoras.find((o) => o.id === selectedOperadoraId)
  const selectedLogo = selectedOperadoraId ? logoByOperadoraId.get(selectedOperadoraId) : undefined

  useEffect(() => {
    if (!selectedOperadoraId || !selectedLogo) {
      setPreviewUrl(null)
      return
    }
    let revoked: string | null = null
    void (async () => {
      try {
        const blob = await api.getBlob(`/placement/operadora-logos/${selectedOperadoraId}/image`)
        revoked = URL.createObjectURL(blob)
        setPreviewUrl(revoked)
      } catch {
        setPreviewUrl(null)
      }
    })()
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [selectedOperadoraId, selectedLogo?.updatedAt, selectedLogo?.id])

  const handleUpload = async (file: File) => {
    if (!selectedOperadoraId) return
    const mime = file.type.toLowerCase()
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime)) {
      setSnack({ open: true, message: 'Use PNG, JPEG, WebP ou GIF.', severity: 'warning' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setSnack({ open: true, message: 'Arquivo muito grande (máx. 2 MB).', severity: 'warning' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.postFormData(`/placement/operadora-logos/${selectedOperadoraId}`, fd)
      resetFailedOperadoraLogoCache()
      await loadLogos()
      setSnack({ open: true, message: 'Logo salvo com sucesso.', severity: 'success' })
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao enviar logo.',
        severity: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (operadoraId: string) => {
    if (!window.confirm('Remover o logo desta operadora?')) return
    try {
      await api.delete(`/placement/operadora-logos/${operadoraId}`)
      resetFailedOperadoraLogoCache()
      await loadLogos()
      if (selectedOperadoraId === operadoraId) setPreviewUrl(null)
      setSnack({ open: true, message: 'Logo removido.', severity: 'success' })
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao remover.',
        severity: 'error',
      })
    }
  }

  const columns: GridColDef<LogoRow>[] = [
    { field: 'operadoraNome', headerName: 'Operadora', flex: 1, minWidth: 180 },
    {
      field: 'mimeType',
      headerName: 'Formato',
      width: 100,
      valueFormatter: (v) => String(v ?? '').replace('image/', '').toUpperCase(),
    },
    {
      field: 'size',
      headerName: 'Tamanho',
      width: 90,
      valueFormatter: (v) => `${Math.round(Number(v) / 1024)} KB`,
    },
    {
      field: 'actions',
      headerName: '',
      width: 72,
      sortable: false,
      renderCell: ({ row }) => (
        <IconButton size="small" color="error" onClick={() => void handleDelete(row.operadoraId)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Vincule um logo a cada operadora (fornecedor). No slide Contrato Atual, o logo aparece na aba do plano;
        sem logo, exibimos apenas o nome.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
          <Autocomplete
            sx={{ minWidth: 280, flex: 1 }}
            options={operadoras}
            getOptionLabel={(o) => o.nome}
            value={selectedOp ?? null}
            onChange={(_, v) => setSelectedOperadoraId(v?.id ?? null)}
            renderInput={(params) => (
              <TextField {...params} label="Operadora (fornecedor)" placeholder="Selecione…" size="small" />
            )}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUpload(f)
              e.target.value = ''
            }}
          />
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
            disabled={!selectedOperadoraId || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {selectedLogo ? 'Substituir logo' : 'Enviar logo'}
          </Button>
        </Stack>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, minHeight: 72 }}>
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt="Preview logo"
              sx={{ maxHeight: 56, maxWidth: 160, objectFit: 'contain' }}
            />
          ) : (
            <Box
              sx={{
                width: 120,
                height: 48,
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <ImageOutlinedIcon />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">
            {selectedLogo
              ? `Cadastrado · ${selectedLogo.mimeType}`
              : selectedOp
                ? 'Sem logo — no comparativo será exibido o nome da operadora.'
                : 'Selecione uma operadora para enviar o logo.'}
          </Typography>
        </Box>
      </Paper>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Logos cadastrados
      </Typography>
      <Box sx={{ height: 320 }}>
        <DataGrid
          rows={logos}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          onRowClick={(p) => setSelectedOperadoraId(p.row.operadoraId)}
        />
      </Box>

      <SnackNotification snack={snack} />
    </Box>
  )
}

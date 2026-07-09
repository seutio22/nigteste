import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SearchIcon from '@mui/icons-material/Search'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PrimaryActionButton } from '../../../components/PrimaryActionButton'
import { api } from '../../../lib/api.local'
import { consultarCnpjPlacement, onlyDigitsCnpj } from '../../../lib/placementCnpjConsulta'
import { SectionHeader } from './CotacaoFormSections'

export type PlacementSubfaturaAnexo = {
  id: string
  nomeOriginal: string
  storedName: string
  mimeType: string
  size: number
}

export type PlacementSubfaturaRow = {
  id: string
  cotacaoId: string
  cnpj: string
  razaoSocial: string
  cidade?: string | null
  uf?: string | null
  vidas?: number | null
  anexos?: unknown
}

/** Anexo ainda não enviado à API (nova cotação em rascunho). */
export type SubfaturaDraftAnexo = {
  id: string
  file: File
  nomeOriginal: string
}

export type SubfaturaDraftItem = {
  clientId: string
  cnpj: string
  razaoSocial: string
  cidade: string | null
  uf: string | null
  vidas: number | null
  pendingAnexos: SubfaturaDraftAnexo[]
}

function formatCnpj14(value: string | null | undefined): string {
  const d = String(value ?? '').replace(/\D/g, '').slice(0, 14)
  if (d.length !== 14) return d
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

function parseAnexos(raw: unknown): PlacementSubfaturaAnexo[] {
  if (!Array.isArray(raw)) return []
  const out: PlacementSubfaturaAnexo[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = r.id != null ? String(r.id) : ''
    const storedName = r.storedName != null ? String(r.storedName) : ''
    if (!id || !storedName) continue
    out.push({
      id,
      nomeOriginal: r.nomeOriginal != null ? String(r.nomeOriginal) : 'arquivo',
      storedName,
      mimeType: r.mimeType != null ? String(r.mimeType) : 'application/octet-stream',
      size: typeof r.size === 'number' ? r.size : 0,
    })
  }
  return out
}

type FormModalState = {
  open: boolean
  editing: PlacementSubfaturaRow | null
  cnpj: string
  razaoSocial: string
  cidade: string
  uf: string
  vidas: string
  saving: boolean
  consultando: boolean
  error: string | null
}

const emptyModal = (): FormModalState => ({
  open: false,
  editing: null,
  cnpj: '',
  razaoSocial: '',
  cidade: '',
  uf: '',
  vidas: '',
  saving: false,
  consultando: false,
  error: null,
})

function newClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function SubfaturaPersistedPanel({
  cotacaoId,
  disabled,
  embedded,
}: {
  cotacaoId: string
  disabled?: boolean
  embedded?: boolean
}) {
  const [rows, setRows] = useState<PlacementSubfaturaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [modal, setModal] = useState<FormModalState>(() => emptyModal())

  const load = useCallback(async () => {
    if (!cotacaoId) return
    setLoading(true)
    setListError(null)
    try {
      const resp = (await api.get(`/placement/cotacoes/${cotacaoId}/subfaturas`)) as {
        subfaturas?: PlacementSubfaturaRow[]
      }
      setRows(resp?.subfaturas ?? [])
    } catch (e: unknown) {
      console.error(e)
      setListError('Não foi possível carregar as empresas (subfatura).')
    } finally {
      setLoading(false)
    }
  }, [cotacaoId])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setModal({
      ...emptyModal(),
      open: true,
    })
  }

  function openEdit(row: PlacementSubfaturaRow) {
    setModal({
      open: true,
      editing: row,
      cnpj: formatCnpj14(row.cnpj),
      razaoSocial: row.razaoSocial ?? '',
      cidade: row.cidade ?? '',
      uf: row.uf ?? '',
      vidas: row.vidas != null ? String(row.vidas) : '',
      saving: false,
      consultando: false,
      error: null,
    })
  }

  async function handleConsultarCnpj() {
    const digits = onlyDigitsCnpj(modal.cnpj)
    setModal((m) => ({ ...m, consultando: true, error: null }))
    try {
      const r = await consultarCnpjPlacement(digits)
      setModal((m) => ({
        ...m,
        consultando: false,
        razaoSocial: r.razaoSocial?.trim() || m.razaoSocial,
        cidade: r.cidade?.trim() || m.cidade,
        uf: (r.uf?.trim() || m.uf).slice(0, 2).toUpperCase(),
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na consulta.'
      setModal((m) => ({ ...m, consultando: false, error: msg }))
    }
  }

  async function handleSaveModal() {
    const digits = onlyDigitsCnpj(modal.cnpj)
    const razaoSocial = modal.razaoSocial.trim()
    if (digits.length !== 14) {
      setModal((m) => ({ ...m, error: 'Informe o CNPJ com 14 dígitos.' }))
      return
    }
    if (!razaoSocial) {
      setModal((m) => ({ ...m, error: 'Razão social é obrigatória.' }))
      return
    }
    const uf = modal.uf.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    const vidasNum = modal.vidas.trim() === '' ? null : Number(modal.vidas)
    if (modal.vidas.trim() !== '' && !Number.isFinite(vidasNum)) {
      setModal((m) => ({ ...m, error: 'Vidas deve ser um número válido.' }))
      return
    }

    setModal((m) => ({ ...m, saving: true, error: null }))
    try {
      if (modal.editing) {
        await api.put(`/placement/subfaturas/${modal.editing.id}`, {
          cnpj: digits,
          razaoSocial,
          cidade: modal.cidade.trim() || null,
          uf: uf.length === 2 ? uf : null,
          vidas: vidasNum,
        })
      } else {
        await api.post(`/placement/cotacoes/${cotacaoId}/subfaturas`, {
          cnpj: digits,
          razaoSocial,
          cidade: modal.cidade.trim() || null,
          uf: uf.length === 2 ? uf : null,
          vidas: vidasNum,
        })
      }
      setModal(emptyModal())
      await load()
    } catch (e: unknown) {
      let msg = 'Erro ao salvar.'
      const anyE = e as { responseText?: string; message?: string }
      if (anyE.responseText) {
        try {
          const j = JSON.parse(anyE.responseText) as { message?: string; error?: string }
          msg = j.message || j.error || msg
        } catch {
          msg = anyE.responseText
        }
      } else if (anyE.message) msg = anyE.message
      setModal((m) => ({ ...m, saving: false, error: msg }))
    }
  }

  async function handleDeleteRow(row: PlacementSubfaturaRow) {
    if (!window.confirm(`Remover a empresa "${row.razaoSocial}" desta cotação?`)) return
    try {
      await api.delete(`/placement/subfaturas/${row.id}`)
      await load()
    } catch (e: unknown) {
      console.error(e)
      setListError('Erro ao excluir registro.')
    }
  }

  async function handleUploadAnexo(subId: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    await api.postFormData(`/placement/subfaturas/${subId}/anexos`, fd)
    const refreshed = (await api.get(`/placement/cotacoes/${cotacaoId}/subfaturas`)) as {
      subfaturas?: PlacementSubfaturaRow[]
    }
    const list = refreshed.subfaturas ?? []
    setRows(list)
    setModal((m) => {
      if (!m.open || m.editing?.id !== subId) return m
      const hit = list.find((r) => r.id === subId)
      return hit ? { ...m, editing: hit } : m
    })
  }

  async function handleDeleteAnexo(subId: string, anexoId: string) {
    if (!window.confirm('Remover este anexo?')) return
    await api.delete(`/placement/subfaturas/${subId}/anexos/${anexoId}`)
    const refreshed = (await api.get(`/placement/cotacoes/${cotacaoId}/subfaturas`)) as {
      subfaturas?: PlacementSubfaturaRow[]
    }
    const list = refreshed.subfaturas ?? []
    setRows(list)
    setModal((m) => {
      if (!m.open || m.editing?.id !== subId) return m
      const hit = list.find((r) => r.id === subId)
      return hit ? { ...m, editing: hit } : m
    })
  }

  async function handleDownloadAnexo(subId: string, anexoId: string, nome: string) {
    const blob = await api.getBlob(`/placement/subfaturas/${subId}/anexos/${anexoId}/download`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome || 'download'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const columns: GridColDef<PlacementSubfaturaRow>[] = [
    {
      field: 'cnpj',
      headerName: 'CNPJ',
      width: 160,
      valueGetter: (_v, row) => formatCnpj14(row.cnpj),
    },
    { field: 'razaoSocial', headerName: 'Razão social', flex: 1, minWidth: 200 },
    { field: 'cidade', headerName: 'Cidade', width: 160, valueGetter: (_v, row) => row.cidade ?? '—' },
    { field: 'uf', headerName: 'UF', width: 70, valueGetter: (_v, row) => row.uf ?? '—' },
    {
      field: 'vidas',
      headerName: 'Vidas',
      width: 90,
      type: 'number',
      valueGetter: (_v, row) => row.vidas ?? '',
    },
    {
      field: 'anexos',
      headerName: 'Anexos',
      width: 90,
      sortable: false,
      valueGetter: (_v, row) => parseAnexos(row.anexos).length,
    },
    {
      field: 'acoes',
      headerName: 'Ações',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0}>
          <Button size="small" onClick={() => openEdit(p.row)} disabled={disabled}>
            Editar
          </Button>
          <Tooltip title="Excluir">
            <span>
              <IconButton
                size="small"
                color="error"
                aria-label="Excluir"
                disabled={disabled}
                onClick={() => void handleDeleteRow(p.row)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  const anexosModal = modal.editing ? parseAnexos(modal.editing.anexos) : []

  const panelContent = (
    <>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        {!embedded && (
          <SectionHeader
            icon={<ReceiptLongIcon fontSize="small" />}
            title="Subfatura"
            description="Etapa da solicitação após «Condições Contratuais»: CNPJs das empresas participantes. Consulta à Receita pelo CNPJ e anexos quando necessário."
          />
        )}
        <PrimaryActionButton startIcon={<AddIcon />} onClick={openCreate} disabled={disabled}>
          Nova empresa
        </PrimaryActionButton>
      </Stack>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setListError(null)}>
          {listError}
        </Alert>
      )}

      <div style={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
            sorting: { sortModel: [{ field: 'razaoSocial', sort: 'asc' }] },
          }}
          sx={{
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
            },
          }}
        />
      </div>
    </>
  )

  return (
    <>
      {embedded ? (
        <Box>{panelContent}</Box>
      ) : (
        <Card variant="outlined">
          <CardContent>{panelContent}</CardContent>
        </Card>
      )}

      <Dialog
        open={modal.open}
        onClose={() => !modal.saving && !disabled && setModal(emptyModal())}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{modal.editing ? 'Editar empresa (subfatura)' : 'Nova empresa (subfatura)'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {modal.error && <Alert severity="error">{modal.error}</Alert>}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="CNPJ"
                fullWidth
                value={modal.cnpj}
                disabled={modal.saving || !!disabled}
                onChange={(e) => setModal((m) => ({ ...m, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
              <Button
                variant="outlined"
                startIcon={modal.consultando ? <CircularProgress size={16} /> : <SearchIcon />}
                disabled={
                  modal.saving || modal.consultando || onlyDigitsCnpj(modal.cnpj).length !== 14 || !!disabled
                }
                onClick={() => void handleConsultarCnpj()}
                sx={{ mt: 0.5, flexShrink: 0 }}
              >
                Consultar
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              A consulta usa a API do backend (BrasilAPI / Receita) e preenche razão social, cidade e UF quando disponíveis.
            </Typography>
            <TextField
              label="Razão social"
              fullWidth
              required
              value={modal.razaoSocial}
              disabled={modal.saving || !!disabled}
              onChange={(e) => setModal((m) => ({ ...m, razaoSocial: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Cidade"
                fullWidth
                value={modal.cidade}
                disabled={modal.saving || !!disabled}
                onChange={(e) => setModal((m) => ({ ...m, cidade: e.target.value }))}
              />
              <TextField
                label="UF"
                sx={{ maxWidth: 100 }}
                value={modal.uf}
                disabled={modal.saving || !!disabled}
                onChange={(e) =>
                  setModal((m) => ({
                    ...m,
                    uf: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
                  }))
                }
                inputProps={{ maxLength: 2 }}
              />
            </Stack>
            <TextField
              label="Vidas"
              type="number"
              fullWidth
              value={modal.vidas}
              disabled={modal.saving || !!disabled}
              onChange={(e) => setModal((m) => ({ ...m, vidas: e.target.value }))}
              inputProps={{ min: 0 }}
            />

            {modal.editing && (
              <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Anexos
                </Typography>
                <Stack spacing={1} sx={{ mb: 1 }}>
                  {anexosModal.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum arquivo anexado.
                    </Typography>
                  )}
                  {anexosModal.map((a) => (
                    <Stack key={a.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={a.nomeOriginal}>
                        {a.nomeOriginal}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(a.size / 1024).toFixed(1)} KB
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="Download"
                        disabled={!!disabled}
                        onClick={() => void handleDownloadAnexo(modal.editing!.id, a.id, a.nomeOriginal)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Remover anexo"
                        disabled={!!disabled}
                        onClick={() => void handleDeleteAnexo(modal.editing!.id, a.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={modal.saving || !!disabled}
                >
                  Enviar arquivo
                  <input
                    type="file"
                    hidden
                    onChange={(ev) => {
                      const f = ev.target.files?.[0]
                      ev.target.value = ''
                      if (f && modal.editing) void handleUploadAnexo(modal.editing.id, f)
                    }}
                  />
                </Button>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(emptyModal())} disabled={modal.saving || !!disabled}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => void handleSaveModal()} disabled={modal.saving || !!disabled}>
            {modal.saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

type DraftGridRow = {
  id: string
  cnpj: string
  razaoSocial: string
  cidade: string | null
  uf: string | null
  vidas: number | null
  anexoCount: number
}

type DraftFormModalState = {
  open: boolean
  editingClientId: string | null
  cnpj: string
  razaoSocial: string
  cidade: string
  uf: string
  vidas: string
  saving: boolean
  consultando: boolean
  error: string | null
}

const emptyDraftFormModal = (): DraftFormModalState => ({
  open: false,
  editingClientId: null,
  cnpj: '',
  razaoSocial: '',
  cidade: '',
  uf: '',
  vidas: '',
  saving: false,
  consultando: false,
  error: null,
})

function SubfaturaDraftPanel({
  items,
  onItemsChange,
  disabled,
}: {
  items: SubfaturaDraftItem[]
  onItemsChange: (next: SubfaturaDraftItem[]) => void
  disabled?: boolean
}) {
  const [modal, setModal] = useState<DraftFormModalState>(() => emptyDraftFormModal())

  const rows = useMemo<DraftGridRow[]>(
    () =>
      items.map((d) => ({
        id: d.clientId,
        cnpj: d.cnpj,
        razaoSocial: d.razaoSocial,
        cidade: d.cidade,
        uf: d.uf,
        vidas: d.vidas,
        anexoCount: d.pendingAnexos.length,
      })),
    [items]
  )

  function openCreate() {
    setModal({ ...emptyDraftFormModal(), open: true })
  }

  function openEdit(row: DraftGridRow) {
    const it = items.find((i) => i.clientId === row.id)
    if (!it) return
    setModal({
      open: true,
      editingClientId: it.clientId,
      cnpj: formatCnpj14(it.cnpj),
      razaoSocial: it.razaoSocial ?? '',
      cidade: it.cidade ?? '',
      uf: it.uf ?? '',
      vidas: it.vidas != null ? String(it.vidas) : '',
      saving: false,
      consultando: false,
      error: null,
    })
  }

  async function handleConsultarCnpj() {
    const digits = onlyDigitsCnpj(modal.cnpj)
    setModal((m) => ({ ...m, consultando: true, error: null }))
    try {
      const r = await consultarCnpjPlacement(digits)
      setModal((m) => ({
        ...m,
        consultando: false,
        razaoSocial: r.razaoSocial?.trim() || m.razaoSocial,
        cidade: r.cidade?.trim() || m.cidade,
        uf: (r.uf?.trim() || m.uf).slice(0, 2).toUpperCase(),
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na consulta.'
      setModal((m) => ({ ...m, consultando: false, error: msg }))
    }
  }

  function handleSaveModal() {
    const digits = onlyDigitsCnpj(modal.cnpj)
    const razaoSocial = modal.razaoSocial.trim()
    if (digits.length !== 14) {
      setModal((m) => ({ ...m, error: 'Informe o CNPJ com 14 dígitos.' }))
      return
    }
    if (!razaoSocial) {
      setModal((m) => ({ ...m, error: 'Razão social é obrigatória.' }))
      return
    }
    const uf = modal.uf.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    const vidasNum = modal.vidas.trim() === '' ? null : Number(modal.vidas)
    if (modal.vidas.trim() !== '' && !Number.isFinite(vidasNum)) {
      setModal((m) => ({ ...m, error: 'Vidas deve ser um número válido.' }))
      return
    }
    const prev = modal.editingClientId ? items.find((i) => i.clientId === modal.editingClientId) : undefined
    const pendingAnexos = prev?.pendingAnexos ?? []
    const newItem: SubfaturaDraftItem = {
      clientId: modal.editingClientId ?? newClientId(),
      cnpj: digits,
      razaoSocial,
      cidade: modal.cidade.trim() || null,
      uf: uf.length === 2 ? uf : null,
      vidas: vidasNum,
      pendingAnexos,
    }
    if (modal.editingClientId) {
      onItemsChange(items.map((i) => (i.clientId === modal.editingClientId ? newItem : i)))
    } else {
      onItemsChange([...items, newItem])
    }
    setModal(emptyDraftFormModal())
  }

  function handleDeleteRow(row: DraftGridRow) {
    if (!window.confirm(`Remover a empresa "${row.razaoSocial}" desta lista?`)) return
    onItemsChange(items.filter((i) => i.clientId !== row.id))
  }

  function editingItem(): SubfaturaDraftItem | undefined {
    if (!modal.editingClientId) return undefined
    return items.find((i) => i.clientId === modal.editingClientId)
  }

  function patchPendingAnexos(updater: (list: SubfaturaDraftAnexo[]) => SubfaturaDraftAnexo[]) {
    if (!modal.editingClientId) return
    onItemsChange(
      items.map((i) =>
        i.clientId === modal.editingClientId ? { ...i, pendingAnexos: updater(i.pendingAnexos) } : i
      )
    )
  }

  function handleDownloadDraftAnexo(a: SubfaturaDraftAnexo) {
    const url = URL.createObjectURL(a.file)
    const el = document.createElement('a')
    el.href = url
    el.download = a.nomeOriginal
    el.click()
    URL.revokeObjectURL(url)
  }

  const draftAnexos = editingItem()?.pendingAnexos ?? []

  const columns: GridColDef<DraftGridRow>[] = [
    {
      field: 'cnpj',
      headerName: 'CNPJ',
      width: 160,
      valueGetter: (_v, row) => formatCnpj14(row.cnpj),
    },
    { field: 'razaoSocial', headerName: 'Razão social', flex: 1, minWidth: 200 },
    { field: 'cidade', headerName: 'Cidade', width: 160, valueGetter: (_v, row) => row.cidade ?? '—' },
    { field: 'uf', headerName: 'UF', width: 70, valueGetter: (_v, row) => row.uf ?? '—' },
    {
      field: 'vidas',
      headerName: 'Vidas',
      width: 90,
      type: 'number',
      valueGetter: (_v, row) => row.vidas ?? '',
    },
    { field: 'anexos', headerName: 'Anexos', width: 90, valueGetter: (_v, row) => row.anexoCount },
    {
      field: 'acoes',
      headerName: 'Ações',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0}>
          <Button size="small" onClick={() => openEdit(p.row)} disabled={disabled}>
            Editar
          </Button>
          <Tooltip title="Excluir">
            <span>
              <IconButton
                size="small"
                color="error"
                aria-label="Excluir"
                disabled={disabled}
                onClick={() => handleDeleteRow(p.row)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
          sx={{ mb: 2 }}
        >
          <SectionHeader
            icon={<ReceiptLongIcon fontSize="small" />}
            title="Subfatura"
            description="Rascunho: empresas participantes serão gravadas ao cadastrar a cotação. Consulta por CNPJ e anexos nesta tela."
          />
          <PrimaryActionButton startIcon={<AddIcon />} onClick={openCreate} disabled={disabled}>
            Nova empresa
          </PrimaryActionButton>
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>
          Os dados ficam neste formulário até você usar «Cadastrar cotação»; em seguida cada empresa e seus anexos são
          enviados automaticamente. Para anexar arquivos, salve a empresa e use «Editar».
        </Alert>

        <div style={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            loading={false}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: { sortModel: [{ field: 'razaoSocial', sort: 'asc' }] },
            }}
            sx={{
              '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f5f5f5',
                borderBottom: '2px solid #e0e0e0',
              },
            }}
          />
        </div>
      </CardContent>

      <Dialog
        open={modal.open}
        onClose={() => !modal.saving && !disabled && setModal(emptyDraftFormModal())}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{modal.editingClientId ? 'Editar empresa (subfatura)' : 'Nova empresa (subfatura)'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {modal.error && <Alert severity="error">{modal.error}</Alert>}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="CNPJ"
                fullWidth
                value={modal.cnpj}
                disabled={modal.saving || !!disabled}
                onChange={(e) => setModal((m) => ({ ...m, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
              <Button
                variant="outlined"
                startIcon={modal.consultando ? <CircularProgress size={16} /> : <SearchIcon />}
                disabled={
                  modal.saving || modal.consultando || onlyDigitsCnpj(modal.cnpj).length !== 14 || !!disabled
                }
                onClick={() => void handleConsultarCnpj()}
                sx={{ mt: 0.5, flexShrink: 0 }}
              >
                Consultar
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              A consulta usa a API do backend (BrasilAPI / Receita) e preenche razão social, cidade e UF quando
              disponíveis.
            </Typography>
            <TextField
              label="Razão social"
              fullWidth
              required
              value={modal.razaoSocial}
              disabled={modal.saving || !!disabled}
              onChange={(e) => setModal((m) => ({ ...m, razaoSocial: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Cidade"
                fullWidth
                value={modal.cidade}
                disabled={modal.saving || !!disabled}
                onChange={(e) => setModal((m) => ({ ...m, cidade: e.target.value }))}
              />
              <TextField
                label="UF"
                sx={{ maxWidth: 100 }}
                value={modal.uf}
                disabled={modal.saving || !!disabled}
                onChange={(e) =>
                  setModal((m) => ({
                    ...m,
                    uf: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
                  }))
                }
                inputProps={{ maxLength: 2 }}
              />
            </Stack>
            <TextField
              label="Vidas"
              type="number"
              fullWidth
              value={modal.vidas}
              disabled={modal.saving || !!disabled}
              onChange={(e) => setModal((m) => ({ ...m, vidas: e.target.value }))}
              inputProps={{ min: 0 }}
            />

            {modal.editingClientId && (
              <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Anexos (enviados ao salvar a cotação)
                </Typography>
                <Stack spacing={1} sx={{ mb: 1 }}>
                  {draftAnexos.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum arquivo anexado.
                    </Typography>
                  )}
                  {draftAnexos.map((a) => (
                    <Stack key={a.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={a.nomeOriginal}>
                        {a.nomeOriginal}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(a.file.size / 1024).toFixed(1)} KB
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="Download"
                        disabled={!!disabled}
                        onClick={() => handleDownloadDraftAnexo(a)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Remover anexo"
                        disabled={!!disabled}
                        onClick={() => patchPendingAnexos((list) => list.filter((x) => x.id !== a.id))}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  disabled={modal.saving || !!disabled}
                >
                  Enviar arquivo
                  <input
                    type="file"
                    hidden
                    onChange={(ev) => {
                      const f = ev.target.files?.[0]
                      ev.target.value = ''
                      if (f && modal.editingClientId) {
                        patchPendingAnexos((list) => [
                          ...list,
                          { id: newClientId(), file: f, nomeOriginal: f.name },
                        ])
                      }
                    }}
                  />
                </Button>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(emptyDraftFormModal())} disabled={modal.saving || !!disabled}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveModal} disabled={modal.saving || !!disabled}>
            Salvar na lista
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export type SubfaturaModuleProps = {
  cotacaoId?: string | null
  draftItems?: SubfaturaDraftItem[]
  onDraftItemsChange?: (items: SubfaturaDraftItem[]) => void
  disabled?: boolean
  embedded?: boolean
}

export function SubfaturaModule({
  cotacaoId,
  draftItems = [],
  onDraftItemsChange,
  disabled,
  embedded,
}: SubfaturaModuleProps) {
  const pid = String(cotacaoId ?? '').trim()
  if (pid) {
    return <SubfaturaPersistedPanel cotacaoId={pid} disabled={disabled} embedded={embedded} />
  }
  return (
    <SubfaturaDraftPanel
      items={draftItems}
      onItemsChange={onDraftItemsChange ?? (() => {})}
      disabled={disabled}
    />
  )
}

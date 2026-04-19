import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { api } from '../lib/api'
import { slugifyFieldKey } from '../lib/formSchema'
import { parseLookupImportText } from '../lib/lookupImport'

type LookupListRow = {
  id: string
  key: string
  label: string
  description: string | null
  sortOrder: number
  active: boolean
  itemCount: number
}

type LookupItemRow = {
  id: string
  label: string
  value: string
  sortOrder: number
  active: boolean
}

export default function PortalLookupListsPanel() {
  const [lists, setLists] = useState<LookupListRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [listDialog, setListDialog] = useState(false)
  const [editListId, setEditListId] = useState<string | null>(null)
  const [listLabel, setListLabel] = useState('')
  const [listKey, setListKey] = useState('')
  const [listKeyTouched, setListKeyTouched] = useState(false)
  const [listBusy, setListBusy] = useState(false)
  const [listCreateMode, setListCreateMode] = useState<'simple' | 'bulk'>('simple')
  const [bulkPaste, setBulkPaste] = useState('')
  const newListFileRef = useRef<HTMLInputElement>(null)

  const [itemsDialog, setItemsDialog] = useState(false)
  const [itemsListId, setItemsListId] = useState<string | null>(null)
  const [itemsTitle, setItemsTitle] = useState('')
  const [items, setItems] = useState<LookupItemRow[]>([])
  const [newItemLabel, setNewItemLabel] = useState('')
  const [itemsBusy, setItemsBusy] = useState(false)
  const [itemsBulkPaste, setItemsBulkPaste] = useState('')
  const [itemsBulkOpen, setItemsBulkOpen] = useState(true)
  const [itemsImportInfo, setItemsImportInfo] = useState<string | null>(null)
  const itemsFileRef = useRef<HTMLInputElement>(null)

  const bulkPreviewNewList = useMemo(() => parseLookupImportText(bulkPaste), [bulkPaste])
  const bulkPreviewItemsDialog = useMemo(() => parseLookupImportText(itemsBulkPaste), [itemsBulkPaste])

  const loadLists = useCallback(async () => {
    const r = await api<{ lists: LookupListRow[] }>('/admin/lookup-lists')
    if (r.ok && r.data?.lists) setLists(r.data.lists)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadLists()
  }, [loadLists])

  function openNewList() {
    setErr(null)
    setEditListId(null)
    setListLabel('')
    setListKey('')
    setListKeyTouched(false)
    setListCreateMode('simple')
    setBulkPaste('')
    setListDialog(true)
  }

  function openEditList(row: LookupListRow) {
    setErr(null)
    setEditListId(row.id)
    setListLabel(row.label)
    setListKey(row.key)
    setListKeyTouched(true)
    setListDialog(true)
  }

  async function saveList() {
    setErr(null)
    const label = listLabel.trim()
    if (!label) {
      setErr('Informe o nome da lista.')
      return
    }
    if (!editListId && listCreateMode === 'bulk' && bulkPreviewNewList.length === 0) {
      setErr('No modo importação, cole texto ou envie um arquivo com pelo menos uma linha.')
      return
    }
    setListBusy(true)
    const r = editListId
      ? await api(`/admin/lookup-lists/${editListId}`, {
          method: 'PATCH',
          body: JSON.stringify({ label }),
        })
      : await api('/admin/lookup-lists', {
          method: 'POST',
          body: JSON.stringify({
            label,
            ...(listKeyTouched ? { key: slugifyFieldKey(listKey) } : {}),
            ...(!editListId && listCreateMode === 'bulk' && bulkPreviewNewList.length > 0
              ? { items: bulkPreviewNewList }
              : {}),
          }),
        })
    setListBusy(false)
    if (!r.ok) {
      setErr(r.error || 'Não foi possível salvar')
      return
    }
    setListDialog(false)
    void loadLists()
  }

  async function removeList(row: LookupListRow) {
    if (
      !window.confirm(
        `Excluir a lista «${row.label}» e todos os ${row.itemCount} itens? Campos de formulário que usam esta lista deixam de funcionar até você reconfigurá-los.`
      )
    )
      return
    setErr(null)
    const r = await api(`/admin/lookup-lists/${row.id}`, { method: 'DELETE' })
    if (!r.ok) {
      setErr(r.error || 'Erro ao excluir')
      return
    }
    void loadLists()
  }

  async function openItems(row: LookupListRow) {
    setErr(null)
    setItemsListId(row.id)
    setItemsTitle(row.label)
    setItemsDialog(true)
    setItemsBulkPaste('')
    setItemsBulkOpen(true)
    setItemsImportInfo(null)
    setNewItemLabel('')
    const r = await api<{ items: LookupItemRow[] }>(`/admin/lookup-lists/${row.id}/items`)
    if (r.ok && r.data?.items) setItems(r.data.items)
    else setItems([])
  }

  async function addItem() {
    if (!itemsListId) return
    const label = newItemLabel.trim()
    if (!label) return
    setItemsBusy(true)
    const r = await api(`/admin/lookup-lists/${itemsListId}/items`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    })
    setItemsBusy(false)
    if (!r.ok) {
      setErr(r.error || 'Não foi possível adicionar')
      return
    }
    setNewItemLabel('')
    const r2 = await api<{ items: LookupItemRow[] }>(`/admin/lookup-lists/${itemsListId}/items`)
    if (r2.ok && r2.data?.items) setItems(r2.data.items)
    void loadLists()
  }

  async function importItemsBulk() {
    if (!itemsListId) return
    if (bulkPreviewItemsDialog.length === 0) {
      setErr('Cole dados ou envie um arquivo (.csv / .txt) com pelo menos uma linha.')
      return
    }
    setErr(null)
    setItemsBusy(true)
    const r = await api<{ created: number; skipped: number; warnings: string[] }>(
      `/admin/lookup-lists/${itemsListId}/items/bulk`,
      {
        method: 'POST',
        body: JSON.stringify({ items: bulkPreviewItemsDialog }),
      }
    )
    setItemsBusy(false)
    if (!r.ok) {
      setErr(r.error || 'Falha na importação')
      setItemsImportInfo(null)
      return
    }
    setErr(null)
    const data = r.data
    if (data) {
      const base = `Importados ${String(data.created)} itens${data.skipped > 0 ? ` · ignorados: ${String(data.skipped)}` : ''}.`
      setItemsImportInfo(
        data.warnings?.length ? `${base} Notas: ${data.warnings.slice(0, 5).join(' · ')}` : base
      )
    }
    setItemsBulkPaste('')
    const r2 = await api<{ items: LookupItemRow[] }>(`/admin/lookup-lists/${itemsListId}/items`)
    if (r2.ok && r2.data?.items) setItems(r2.data.items)
    void loadLists()
  }

  async function removeItem(item: LookupItemRow) {
    if (!window.confirm(`Remover «${item.label}» desta lista?`)) return
    setErr(null)
    const r = await api(`/admin/lookup-items/${item.id}`, { method: 'DELETE' })
    if (!r.ok) {
      setErr(r.error || 'Erro ao remover')
      return
    }
    setItems((prev) => prev.filter((x) => x.id !== item.id))
    void loadLists()
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Crie uma <strong>tabela</strong> (ex.: <em>Filiais</em>) e adicione os <strong>itens</strong> (cada filial). Depois,
        nas <strong>Áreas e tipos</strong>, use o campo lista e escolha &quot;Lista do portal&quot; — sem precisar de
        desenvolvimento.
      </Typography>
      {err && !listDialog && !itemsDialog && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNewList}>
          Nova lista
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Nome</TableCell>
            <TableCell>Chave</TableCell>
            <TableCell>Itens</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4}>Carregando…</TableCell>
            </TableRow>
          ) : lists.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography color="text.secondary">Nenhuma lista. Crie «Filiais», «Categorias», etc.</Typography>
              </TableCell>
            </TableRow>
          ) : (
            lists.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.label}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {row.key}
                  </Typography>
                </TableCell>
                <TableCell>{row.itemCount}</TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<ListAltIcon />} onClick={() => void openItems(row)}>
                    Itens
                  </Button>
                  <Button size="small" startIcon={<EditIcon />} sx={{ ml: 1 }} onClick={() => openEditList(row)}>
                    Editar
                  </Button>
                  <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => void removeList(row)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={listDialog} onClose={() => setListDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editListId ? 'Editar lista' : 'Nova lista'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {err && (
            <Alert severity="error" onClose={() => setErr(null)}>
              {err}
            </Alert>
          )}
          {!editListId && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Como criar
              </Typography>
              <ToggleButtonGroup
                color="primary"
                size="small"
                exclusive
                fullWidth
                value={listCreateMode}
                onChange={(_, v) => v && setListCreateMode(v)}
              >
                <ToggleButton value="simple">Só a tabela</ToggleButton>
                <ToggleButton value="bulk">Tabela + itens em massa</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
          <TextField
            label="Nome da tabela"
            value={listLabel}
            onChange={(e) => {
              const v = e.target.value
              setListLabel(v)
              if (!editListId && !listKeyTouched) setListKey(slugifyFieldKey(v))
            }}
            fullWidth
            autoFocus={editListId ? false : listCreateMode === 'simple'}
            placeholder="Ex.: Filiais"
            helperText="Como aparece para você no admin e nos formulários."
          />
          {!editListId && (
            <TextField
              label="Chave técnica"
              value={listKey}
              onChange={(e) => {
                setListKeyTouched(true)
                setListKey(e.target.value)
              }}
              fullWidth
              helperText="Gerada automaticamente; pode editar (só minúsculas, números e _)."
            />
          )}
          {!editListId && listCreateMode === 'bulk' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2">Importar itens (arquivo ou texto)</Typography>
              <Typography variant="caption" color="text.secondary">
                Uma linha por item; ou duas colunas separadas por vírgula, ponto e vírgula ou tab:{' '}
                <strong>rótulo</strong> e opcionalmente <strong>valor técnico</strong> (só minúsculas, números e _). Linhas
                com # são comentário.
              </Typography>
              <input
                ref={newListFileRef}
                type="file"
                accept=".csv,.txt,text/plain"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = () => setBulkPaste(String(reader.result ?? ''))
                  reader.readAsText(f, 'UTF-8')
                  e.target.value = ''
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => newListFileRef.current?.click()}
              >
                Escolher arquivo (.csv / .txt)
              </Button>
              <TextField
                label="Ou cole aqui"
                value={bulkPaste}
                onChange={(e) => setBulkPaste(e.target.value)}
                multiline
                minRows={5}
                fullWidth
                placeholder={'Matriz\nFilial Norte\nFilial Sul'}
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                {bulkPreviewNewList.length} linha(s) reconhecida(s)
                {bulkPreviewNewList.length > 0 ? ` · pré-visualização: ${bulkPreviewNewList.slice(0, 5).map((x) => x.label).join(', ')}${bulkPreviewNewList.length > 5 ? '…' : ''}` : ''}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setListDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveList()} disabled={listBusy || !listLabel.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={itemsDialog} onClose={() => setItemsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Itens — {itemsTitle}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {err && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
              {err}
            </Alert>
          )}
          {itemsImportInfo && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setItemsImportInfo(null)}>
              {itemsImportInfo}
            </Alert>
          )}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover' }}>
            <Button size="small" onClick={() => setItemsBulkOpen((v) => !v)} sx={{ mb: itemsBulkOpen ? 1 : 0 }}>
              {itemsBulkOpen ? '▼' : '▶'} Importar em massa (arquivo ou texto)
            </Button>
            <Collapse in={itemsBulkOpen}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Mesmo formato do assistente na nova lista: uma linha por item; ou rótulo + valor técnico em duas colunas.
              </Typography>
              <input
                ref={itemsFileRef}
                type="file"
                accept=".csv,.txt,text/plain"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = () => setItemsBulkPaste(String(reader.result ?? ''))
                  reader.readAsText(f, 'UTF-8')
                  e.target.value = ''
                }}
              />
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => itemsFileRef.current?.click()}
                >
                  Enviar arquivo
                </Button>
                <Typography variant="caption" sx={{ alignSelf: 'center' }}>
                  {bulkPreviewItemsDialog.length} linha(s)
                </Typography>
              </Stack>
              <TextField
                label="Colar dados"
                value={itemsBulkPaste}
                onChange={(e) => setItemsBulkPaste(e.target.value)}
                multiline
                minRows={4}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                color="secondary"
                size="small"
                disabled={itemsBusy || bulkPreviewItemsDialog.length === 0}
                onClick={() => void importItemsBulk()}
              >
                Adicionar {bulkPreviewItemsDialog.length} linha(s) à lista
              </Button>
            </Collapse>
          </Paper>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Um item de cada vez
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              label="Novo item"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              fullWidth
              size="small"
              placeholder="Ex.: Matriz São Paulo"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addItem()
                }
              }}
            />
            <Button variant="contained" onClick={() => void addItem()} disabled={itemsBusy || !newItemLabel.trim()}>
              Adicionar
            </Button>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Texto</TableCell>
                <TableCell>Valor guardado</TableCell>
                <TableCell align="right" width={56} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum item. Adicione acima.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.label}</TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace">
                        {it.value}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" aria-label="Remover" onClick={() => void removeItem(it)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

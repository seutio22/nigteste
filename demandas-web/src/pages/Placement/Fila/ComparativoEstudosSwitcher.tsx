import React, { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import type {
  ComparativoCriacaoModo,
  ComparativoEstudoNomeado,
} from './placementAguardandoOperadora'

type Props = {
  estudos: ComparativoEstudoNomeado[]
  ativoId: string
  disabled?: boolean
  /** Texto auxiliar; padrão explica lançamentos de proposta. */
  helperText?: string
  /**
   * `manage` — criar/duplicar/renomear (Aguardando operadora).
   * `present` — só navegar entre comparativos (tela de apresentação).
   */
  mode?: 'manage' | 'present'
  onSelect: (id: string) => void
  onCreate?: (modo: ComparativoCriacaoModo) => void
  onDuplicate?: (modo: ComparativoCriacaoModo) => void
  onRename?: (id: string, nome: string) => void
  onRemove?: (id: string) => void
}

type PendingAction = 'create' | 'duplicate'

export function ComparativoEstudosSwitcher({
  estudos,
  ativoId,
  disabled,
  helperText,
  mode = 'manage',
  onSelect,
  onCreate,
  onDuplicate,
  onRename,
  onRemove,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftNome, setDraftNome] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)

  const isPresent = mode === 'present'
  const ativo = estudos.find((e) => e.id === ativoId) ?? estudos[0]
  const value = estudos.some((e) => e.id === ativoId) ? ativoId : ativo?.id ?? ''

  function confirmarModo(modo: ComparativoCriacaoModo) {
    if (pending === 'create') onCreate?.(modo)
    else if (pending === 'duplicate') onDuplicate?.(modo)
    setPending(null)
  }

  if (isPresent) {
    return (
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
          Comparativo
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
          {helperText ?? 'Escolha qual comparativo apresentar.'}
        </Typography>
        {estudos.length <= 1 ? (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {ativo?.nome || 'Comparativo 1'}
          </Typography>
        ) : (
          <ToggleButtonGroup
            exclusive
            fullWidth
            orientation="vertical"
            size="small"
            value={value}
            disabled={disabled}
            onChange={(_, next: string | null) => {
              if (next) onSelect(next)
            }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              '& .MuiToggleButtonGroup-grouped': {
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px !important',
                margin: 0,
                textTransform: 'none',
                fontWeight: 700,
                justifyContent: 'flex-start',
                px: 1.5,
                py: 1,
                bgcolor: 'background.paper',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderColor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              },
            }}
          >
            {estudos.map((e) => (
              <ToggleButton key={e.id} value={e.id} aria-label={e.nome || 'Comparativo'}>
                {e.nome || 'Comparativo'}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.50',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Comparativos
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {helperText ??
              'Cada comparativo guarda seus próprios lançamentos (valores, planos e cenários). Use os mesmos fornecedores da tabela; pode mesclar na mesma proposta.'}
          </Typography>
        </Box>
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={disabled || !onCreate}
            onClick={() => setPending('create')}
          >
            Novo
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            disabled={disabled || !ativo || !onDuplicate}
            onClick={() => setPending('duplicate')}
          >
            Duplicar
          </Button>
          {estudos.length > 1 && ativo && onRemove && (
            <Tooltip title="Excluir comparativo ativo">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={disabled}
                  aria-label="Excluir comparativo"
                  onClick={() => onRemove(ativo.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <Tabs
        value={value}
        onChange={(_, v: string) => onSelect(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 700 },
        }}
      >
        {estudos.map((e) => (
          <Tab key={e.id} value={e.id} label={e.nome || 'Comparativo'} disabled={disabled} />
        ))}
      </Tabs>

      {ativo && onRename && (
        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.25 }}>
          {editingId === ativo.id ? (
            <>
              <TextField
                size="small"
                label="Nome do comparativo"
                value={draftNome}
                disabled={disabled}
                onChange={(e) => setDraftNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRename(ativo.id, draftNome)
                    setEditingId(null)
                  }
                  if (e.key === 'Escape') setEditingId(null)
                }}
                sx={{ maxWidth: 320 }}
              />
              <Button
                size="small"
                variant="contained"
                disabled={disabled}
                onClick={() => {
                  onRename(ativo.id, draftNome)
                  setEditingId(null)
                }}
              >
                Salvar nome
              </Button>
              <Button size="small" disabled={disabled} onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              size="small"
              startIcon={<EditOutlinedIcon />}
              disabled={disabled}
              onClick={() => {
                setEditingId(ativo.id)
                setDraftNome(ativo.nome)
              }}
            >
              Renomear «{ativo.nome}»
            </Button>
          )}
        </Stack>
      )}

      <Dialog open={pending != null} onClose={() => setPending(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {pending === 'duplicate' ? 'Duplicar comparativo' : 'Novo comparativo'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Como deseja iniciar o novo comparativo a partir de «{ativo?.nome ?? 'Comparativo'}»?
          </Typography>
          <Stack gap={1.25}>
            <Button
              variant="contained"
              disabled={disabled}
              onClick={() => confirmarModo('completo')}
              sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.25 }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Duplicar todos os dados
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontWeight: 400 }}>
                  Copia valores, planos, cenários e configuração para editar em cima.
                </Typography>
              </Box>
            </Button>
            <Button
              variant="outlined"
              disabled={disabled}
              onClick={() => confirmarModo('matriz')}
              sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.25 }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Manter apenas a matriz
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Mantém a estrutura (fornecedores, planos e cenários) sem os valores de custo.
                </Typography>
              </Box>
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

import React from 'react'
import {
  Box,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import RemoveIcon from '@mui/icons-material/Remove'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import { PlacementDraftTextField } from './PlacementDraftTextField'
import {
  appendEstrategiaTextTool,
  estrategiaTextRows,
  type EstrategiaTextTool,
} from './placementEstrategiaEditor'
import type { KickOffEstrategiaItem, KickOffEstrategiaSecao } from './placementKickOffEstrategia'
import { isKickOffItemObrigatorio } from './placementKickOffEstrategia'
import { PlacementEstrategiaInserirAbertura } from './PlacementEstrategiaInserirAbertura'
import type { AberturaResumoLinha } from './placementKickOffAberturaResumo'
import { createKickOffItem } from './placementKickOffEstrategia'

type Props = {
  secao: KickOffEstrategiaSecao
  item: KickOffEstrategiaItem
  itemIndex: number
  itemCount: number
  aberturaLinhas: AberturaResumoLinha[]
  disabled?: boolean
  onPatch: (patch: Partial<KickOffEstrategiaItem>) => void
  onRemove: () => void
  onDuplicate: () => void
  onMove: (direction: -1 | 1) => void
  onReplaceFromAbertura: (item: ReturnType<typeof createKickOffItem>) => void
}

function ToolBtn({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" disabled={disabled} onClick={onClick} aria-label={title}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}

export function PlacementEstrategiaItemRow({
  secao,
  item,
  itemIndex,
  itemCount,
  aberturaLinhas,
  disabled,
  onPatch,
  onRemove,
  onDuplicate,
  onMove,
  onReplaceFromAbertura,
}: Props) {
  const obrigatorio = isKickOffItemObrigatorio(secao, item)
  const vazioObrigatorio = obrigatorio && !item.valor.trim()

  function applyTextTool(field: 'rotulo' | 'valor', tool: EstrategiaTextTool) {
    onPatch({ [field]: appendEstrategiaTextTool(item[field], tool) })
  }

  async function copyValor() {
    if (!item.valor.trim()) return
    try {
      await navigator.clipboard.writeText(item.valor)
    } catch {
      /* ignore */
    }
  }

  const rotuloRows = estrategiaTextRows(item.rotulo, { min: 2, max: 6 })
  const valorRows = estrategiaTextRows(item.valor, { min: 3, max: 14 })

  return (
    <Box
      sx={{
        p: 1.5,
        border: 1,
        borderColor: vazioObrigatorio ? 'warning.main' : 'divider',
        borderRadius: 1,
        bgcolor: vazioObrigatorio ? 'warning.light' : 'background.paper',
        ...(vazioObrigatorio ? { opacity: 0.95 } : {}),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Fato {itemIndex + 1}
          </Typography>
          {obrigatorio && (
            <Chip label="Obrigatório" size="small" color="warning" variant="outlined" />
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.25} flexWrap="wrap" useFlexGap>
          <ToolBtn title="Subir" disabled={disabled || itemIndex <= 0} onClick={() => onMove(-1)}>
            <ArrowUpwardIcon fontSize="small" />
          </ToolBtn>
          <ToolBtn
            title="Descer"
            disabled={disabled || itemIndex >= itemCount - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownwardIcon fontSize="small" />
          </ToolBtn>
          <ToolBtn title="Duplicar fato" disabled={disabled} onClick={onDuplicate}>
            <ContentCopyIcon fontSize="small" />
          </ToolBtn>
          <PlacementEstrategiaInserirAbertura
            linhas={aberturaLinhas}
            disabled={disabled}
            iconOnly
            onInsert={(novo) => onReplaceFromAbertura(novo)}
          />
          <ToolBtn title="Remover fato" disabled={disabled || itemCount <= 1} onClick={onRemove}>
            <DeleteOutlineIcon fontSize="small" />
          </ToolBtn>
        </Stack>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={4}>
          <PlacementDraftTextField
            fullWidth
            size="small"
            multiline
            minRows={rotuloRows}
            maxRows={8}
            label="Rótulo"
            placeholder="Ex.: Tipo de contratação, premissa, restrição…"
            value={item.rotulo}
            disabled={disabled}
            onCommit={(v) => onPatch({ rotulo: v })}
            helperText="Pode usar várias linhas"
          />
          <Stack direction="row" spacing={0.25} sx={{ mt: 0.5 }}>
            <ToolBtn title="Marcador no rótulo" disabled={disabled} onClick={() => applyTextTool('rotulo', 'bullet')}>
              <FormatListBulletedIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
            <ToolBtn title="Traço no rótulo" disabled={disabled} onClick={() => applyTextTool('rotulo', 'dash')}>
              <RemoveIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
          </Stack>
        </Grid>
        <Grid item xs={12} md={8}>
          <PlacementDraftTextField
            fullWidth
            size="small"
            multiline
            minRows={valorRows}
            maxRows={16}
            label={obrigatorio ? 'Conteúdo *' : 'Conteúdo'}
            placeholder="Descreva o acordado na reunião. Use listas, quebras de linha e dados da abertura."
            value={item.valor}
            disabled={disabled}
            required={obrigatorio}
            error={vazioObrigatorio}
            helperText={
              vazioObrigatorio
                ? 'Preenchimento obrigatório para avançar'
                : 'Texto livre — suporta parágrafos e listas'
            }
            onCommit={(v) => onPatch({ valor: v })}
          />
          <Stack direction="row" spacing={0.25} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            <ToolBtn title="Nova linha com marcador" disabled={disabled} onClick={() => applyTextTool('valor', 'bullet')}>
              <FormatListBulletedIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
            <ToolBtn title="Nova linha numerada" disabled={disabled} onClick={() => applyTextTool('valor', 'number')}>
              <FormatListNumberedIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
            <ToolBtn title="Nova linha com traço" disabled={disabled} onClick={() => applyTextTool('valor', 'dash')}>
              <RemoveIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
            <ToolBtn title="Copiar conteúdo" disabled={disabled || !item.valor.trim()} onClick={copyValor}>
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
            <ToolBtn title="Limpar conteúdo" disabled={disabled || !item.valor.trim()} onClick={() => onPatch({ valor: '' })}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </ToolBtn>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

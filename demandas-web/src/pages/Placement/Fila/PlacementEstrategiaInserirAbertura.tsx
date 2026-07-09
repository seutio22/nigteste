import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import type { AberturaResumoLinha } from './placementKickOffAberturaResumo'
import { formatAberturaValorParaEstrategia } from './placementEstrategiaEditor'
import { createKickOffItem, type KickOffEstrategiaItem } from './placementKickOffEstrategia'

type Props = {
  linhas: AberturaResumoLinha[]
  disabled?: boolean
  label?: string
  size?: 'small' | 'medium'
  iconOnly?: boolean
  onInsert: (item: KickOffEstrategiaItem) => void
}

export function PlacementEstrategiaInserirAbertura({
  linhas,
  disabled,
  label = 'Inserir da abertura',
  size = 'small',
  iconOnly,
  onInsert,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const grupos = useMemo(() => {
    const map = new Map<string, AberturaResumoLinha[]>()
    for (const l of linhas) {
      if (l.vazio) continue
      const g = l.grupo || 'Outros'
      const list = map.get(g) ?? []
      list.push(l)
      map.set(g, list)
    }
    return [...map.entries()]
  }, [linhas])

  const disponiveis = grupos.reduce((n, [, items]) => n + items.length, 0)

  return (
    <>
      {iconOnly ? (
        <Tooltip title="Substituir por dado da abertura">
          <span>
            <IconButton
              size="small"
              disabled={disabled || disponiveis < 1}
              aria-label="Inserir da abertura"
              onClick={(e) => setAnchor(e.currentTarget)}
            >
              <PlaylistAddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          size={size}
          variant="outlined"
          startIcon={<PlaylistAddIcon />}
          disabled={disabled || disponiveis < 1}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          {label}
        </Button>
      )}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { maxHeight: 420, minWidth: 300, maxWidth: 420 } }}
      >
        {disponiveis < 1 && (
          <MenuItem disabled>
            <Typography variant="body2">Nenhum dado da abertura disponível.</Typography>
          </MenuItem>
        )}
        {grupos.map(([grupo, items]) => [
          <ListSubheader key={`h-${grupo}`}>{grupo}</ListSubheader>,
          ...items.map((l) => (
            <MenuItem
              key={l.id}
              onClick={() => {
                onInsert(
                  createKickOffItem(
                    l.rotulo,
                    formatAberturaValorParaEstrategia(l.valor)
                  )
                )
                setAnchor(null)
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {l.rotulo}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {formatAberturaValorParaEstrategia(l.valor) || l.valor}
                </Typography>
              </Box>
            </MenuItem>
          )),
          <Divider key={`d-${grupo}`} />,
        ])}
      </Menu>
    </>
  )
}

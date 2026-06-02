import { Box, Typography } from '@mui/material'

type Props = {
  label: string
  onDelete?: () => void
  disabled?: boolean
}

/** Chip pill do multi-select MUI (fundo cinza + X circular). */
export function VinculoValueChip({ label, onDelete, disabled }: Props) {
  return (
    <Box
      component="span"
      onMouseDown={(e) => {
        if (onDelete) e.stopPropagation()
      }}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        height: 26,
        maxWidth: '100%',
        pl: 1.25,
        pr: onDelete && !disabled ? 0.5 : 1.25,
        py: 0.25,
        borderRadius: '9999px',
        bgcolor: '#f1f1f1',
        flexShrink: 0,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.875rem',
          fontWeight: 400,
          color: '#1e293b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.25,
        }}
      >
        {label}
      </Typography>
      {onDelete && !disabled && (
        <Box
          component="button"
          type="button"
          tabIndex={-1}
          aria-label={`Remover ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDelete()
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            minWidth: 16,
            p: 0,
            ml: 0.25,
            border: 'none',
            borderRadius: '50%',
            bgcolor: '#bcbcbc',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1,
            cursor: 'pointer',
            fontFamily: 'inherit',
            '&:hover': { bgcolor: '#9ca3af' },
          }}
        >
          ×
        </Box>
      )}
    </Box>
  )
}

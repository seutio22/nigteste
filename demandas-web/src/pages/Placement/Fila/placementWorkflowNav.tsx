import React from 'react'
import {
  Box,
  Button,
  ButtonProps,
  Collapse,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import {
  placementWorkflowCardSx,
  placementWorkflowIconBoxSx,
  placementWorkflowInfoPanelSx,
} from './placementWorkflowTheme'

/** Altura única para todos os botões de navegação do workflow Placement. */
export const PLACEMENT_NAV_BTN_HEIGHT = 44

const navIconSpacingSx = {
  '& .MuiButton-startIcon': { marginRight: 1.25, marginLeft: 0 },
  '& .MuiButton-endIcon': { marginLeft: 1.25, marginRight: 0 },
}

export const placementNavButtonSx = {
  height: PLACEMENT_NAV_BTN_HEIGHT,
  minHeight: PLACEMENT_NAV_BTN_HEIGHT,
  px: 2.5,
  gap: 1,
  borderRadius: '12px',
  textTransform: 'none' as const,
  fontWeight: 600,
  fontSize: '0.875rem',
  whiteSpace: 'nowrap' as const,
  ...navIconSpacingSx,
}

export const placementNavBackSx = {
  ...placementNavButtonSx,
  borderColor: 'primary.main',
  color: 'primary.main',
  bgcolor: 'background.paper',
  '&:hover': {
    borderColor: 'primary.dark',
    bgcolor: 'rgba(0, 37, 97, 0.04)',
  },
}

export const placementNavForwardSx = {
  ...placementNavButtonSx,
  background: (theme: { palette: { secondary: { main: string }; primary: { main: string } } }) =>
    `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
  color: '#fff',
  boxShadow: '0 4px 14px rgba(0, 37, 97, 0.22)',
  '&:hover': {
    background: (theme: { palette: { secondary: { main: string }; primary: { light: string } } }) =>
      `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.light} 100%)`,
    boxShadow: '0 6px 18px rgba(0, 37, 97, 0.28)',
  },
  '&.Mui-disabled': {
    background: 'action.disabledBackground',
    color: 'action.disabled',
    boxShadow: 'none',
  },
}

export const placementNavSecondarySx = {
  ...placementNavButtonSx,
  borderColor: 'error.light',
  color: 'error.main',
  bgcolor: 'error.light',
  '&:hover': {
    borderColor: 'error.main',
    bgcolor: 'rgba(218, 56, 50, 0.08)',
  },
}

type ShellProps = {
  children: React.ReactNode
  nested?: boolean
}

export function PlacementWorkflowNavShell({ children, nested }: ShellProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...placementWorkflowCardSx,
        mb: 3,
      }}
    >
      {!nested && (
        <Box
          sx={{
            height: 4,
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.primary.light} 100%)`,
          }}
        />
      )}
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 2.5 } }}>{children}</Box>
    </Paper>
  )
}

export function PlacementWorkflowNavLabel({
  action,
  target,
}: {
  action: string
  target?: string
}) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        lineHeight: 1.2,
      }}
    >
      <Typography component="span" variant="body2" sx={{ fontWeight: 500, opacity: 0.9 }}>
        {action}
      </Typography>
      {target ? (
        <>
          <Box
            component="span"
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: 'currentColor',
              opacity: 0.35,
              flexShrink: 0,
            }}
          />
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            {target}
          </Typography>
        </>
      ) : null}
    </Box>
  )
}

type StageLineProps = {
  label: string
  description: string
  objective?: string
  expanded?: boolean
  onToggleInfo?: () => void
  icon?: React.ReactNode
}

export function PlacementWorkflowStageLine({
  label,
  description,
  objective,
  expanded,
  onToggleInfo,
  icon,
}: StageLineProps) {
  return (
    <Box sx={{ ...placementWorkflowInfoPanelSx, mb: 2.5 }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {icon && <Box sx={placementWorkflowIconBoxSx}>{icon}</Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.5, sm: 1.5 }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: objective ? 0.5 : 0 }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                bgcolor: 'background.paper',
                px: 1.25,
                py: 0.35,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'rgba(0, 37, 97, 0.15)',
                flexShrink: 0,
              }}
            >
              {label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              {description}
            </Typography>
          </Stack>

          {objective && onToggleInfo && (
            <Button
              size="small"
              variant="text"
              color="info"
              onClick={onToggleInfo}
              endIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              sx={{
                mt: 0.5,
                px: 0,
                minWidth: 0,
                fontSize: '0.8rem',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {expanded ? 'Ocultar objetivo da etapa' : 'Ver objetivo da etapa'}
            </Button>
          )}

          {objective && (
            <Collapse in={expanded}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  lineHeight: 1.5,
                  borderLeft: '3px solid',
                  borderColor: 'primary.light',
                  pl: 1.5,
                }}
              >
                {objective}
              </Typography>
            </Collapse>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

export function PlacementWorkflowNavRow({ children }: { children: React.ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      alignItems={{ xs: 'stretch', lg: 'center' }}
      justifyContent="space-between"
      spacing={2}
      useFlexGap
      sx={{
        pt: 0.5,
        borderTop: { lg: 'none' },
      }}
    >
      {children}
    </Stack>
  )
}

export function PlacementWorkflowNavActions({ children }: { children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
      {children}
    </Stack>
  )
}

export function PlacementNavBackButton({ children, sx, ...rest }: ButtonProps) {
  return (
    <Button
      variant="outlined"
      startIcon={<ArrowBackIcon fontSize="small" />}
      sx={{ ...placementNavBackSx, ...sx }}
      {...rest}
    >
      {children}
    </Button>
  )
}

export function PlacementNavForwardButton({
  children,
  sx,
  endIcon = <ArrowForwardIcon fontSize="small" />,
  startIcon,
  ...rest
}: ButtonProps) {
  return (
    <Button
      variant="contained"
      disableElevation
      startIcon={startIcon}
      endIcon={startIcon ? undefined : endIcon}
      sx={{ ...placementNavForwardSx, ...sx }}
      {...rest}
    >
      {children}
    </Button>
  )
}

export function PlacementNavSecondaryButton({ children, sx, ...rest }: ButtonProps) {
  return (
    <Button
      variant="outlined"
      startIcon={<StopCircleOutlinedIcon fontSize="small" />}
      sx={{ ...placementNavSecondarySx, ...sx }}
      {...rest}
    >
      {children}
    </Button>
  )
}

export function PlacementWorkflowNavStatus({
  children,
  icon,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      sx={{
        flex: 1,
        minWidth: 0,
        px: { xs: 0, lg: 1 },
        display: { xs: 'none', md: 'flex' },
      }}
    >
      {icon && (
        <Box
          sx={{
            ...placementWorkflowIconBoxSx,
            width: 36,
            height: 36,
            bgcolor: 'info.main',
            boxShadow: 'none',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, pt: 0.25 }}>
        {children}
      </Typography>
    </Stack>
  )
}

export function PlacementWorkflowSectionTitle({
  title,
  icon,
}: {
  title: string
  icon?: React.ReactNode
}) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
      {icon && (
        <Box sx={{ ...placementWorkflowIconBoxSx, width: 36, height: 36 }}>{icon}</Box>
      )}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
    </Stack>
  )
}

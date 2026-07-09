/** Tokens visuais do workflow Placement — alinhados ao theme.ts (NIG). */
export const placementWorkflowCardSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 2px 16px -6px rgba(0, 37, 97, 0.12)',
  overflow: 'hidden',
} as const

export const placementWorkflowIconBoxSx = {
  width: 44,
  height: 44,
  borderRadius: 2,
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  boxShadow: '0 0 0 3px rgba(0, 159, 223, 0.14)',
} as const

export const placementWorkflowInfoPanelSx = {
  p: 2,
  borderRadius: 2,
  bgcolor: 'info.light',
  border: '1px solid',
  borderColor: 'rgba(0, 79, 117, 0.12)',
} as const

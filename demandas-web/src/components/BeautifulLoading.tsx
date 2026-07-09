import React from 'react'
import { Box, CircularProgress, Typography, Fade, Zoom } from '@mui/material'

interface BeautifulLoadingProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
  showDots?: boolean
  fullScreen?: boolean
}

export const BeautifulLoading: React.FC<BeautifulLoadingProps> = ({
  message = 'Carregando',
  size = 'medium',
  showDots = true,
  fullScreen = false,
}) => {
  const spinnerSize = size === 'small' ? 28 : size === 'large' ? 56 : 40
  const textVariant = size === 'small' ? 'body2' : size === 'large' ? 'h6' : 'body1'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
        }),
      }}
    >
      <Zoom in timeout={300}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={spinnerSize} thickness={4} />
          <Fade in timeout={600}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography variant={textVariant as 'body1'} color="text.secondary" sx={{ fontWeight: 500 }}>
                {message}
              </Typography>
              {showDots ? (
                <Typography variant="caption" color="text.disabled" aria-hidden>
                  ...
                </Typography>
              ) : null}
            </Box>
          </Fade>
        </Box>
      </Zoom>
    </Box>
  )
}

export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Carregando página...' }) => (
  <BeautifulLoading message={message} size="medium" showDots />
)

export const DataLoading: React.FC<{ message?: string }> = ({ message = 'Sincronizando dados...' }) => (
  <BeautifulLoading message={message} size="small" showDots />
)

export const FullScreenLoading: React.FC<{ message?: string }> = ({ message = 'Carregando sistema...' }) => (
  <BeautifulLoading message={message} size="large" showDots fullScreen />
)

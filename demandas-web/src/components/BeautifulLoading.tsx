import React from 'react'
import { Box, Typography, Fade, Zoom } from '@mui/material'
import { styled, keyframes } from '@mui/material/styles'

// Animação de rotação da bolinha
const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`

// Animação de pulsação
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

// Animação de fade in/out para o texto
const fadeInOut = keyframes`
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
`

// Componente da bolinha girando
const SpinningBall = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  animation: `${spin} 1s linear infinite`,
  boxShadow: `0 0 20px ${theme.palette.primary.main}40`,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: '50%',
    background: theme.palette.background.paper,
    animation: `${pulse} 2s ease-in-out infinite`,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: '50%',
    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    animation: `${spin} 0.5s linear infinite reverse`,
  }
}))

// Componente do texto animado
const AnimatedText = styled(Typography)(({ theme }) => ({
  animation: `${fadeInOut} 2s ease-in-out infinite`,
  color: theme.palette.text.secondary,
  fontWeight: 500,
  letterSpacing: '0.5px',
}))

// Componente das bolinhas de loading
const LoadingDots = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: 4,
  '& > div': {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: theme.palette.primary.main,
    animation: `${pulse} 1.4s ease-in-out infinite both`,
    '&:nth-of-type(1)': {
      animationDelay: '-0.32s',
    },
    '&:nth-of-type(2)': {
      animationDelay: '-0.16s',
    },
  }
}))

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
  fullScreen = false
}) => {
  const sizeConfig = {
    small: { ball: 24, text: 'body2' },
    medium: { ball: 40, text: 'body1' },
    large: { ball: 56, text: 'h6' }
  }

  const config = sizeConfig[size]

  const content = (
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
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
        })
      }}
    >
      <Zoom in timeout={300}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <SpinningBall sx={{ width: config.ball, height: config.ball }} />
          
          <Fade in timeout={600}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <AnimatedText variant={config.text as any}>
                {message}
              </AnimatedText>
              
              {showDots && (
                <LoadingDots>
                  <div />
                  <div />
                  <div />
                </LoadingDots>
              )}
            </Box>
          </Fade>
        </Box>
      </Zoom>
    </Box>
  )

  return content
}

// Componente específico para páginas
export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Carregando página...' }) => (
  <BeautifulLoading 
    message={message} 
    size="medium" 
    showDots={true}
  />
)

// Componente específico para dados
export const DataLoading: React.FC<{ message?: string }> = ({ message = 'Sincronizando dados...' }) => (
  <BeautifulLoading 
    message={message} 
    size="small" 
    showDots={true}
  />
)
// Forçar atualização para sincronizar Vercel

// Componente para loading full screen
export const FullScreenLoading: React.FC<{ message?: string }> = ({ message = 'Carregando sistema...' }) => (
  <BeautifulLoading 
    message={message} 
    size="large" 
    showDots={true}
    fullScreen={true}
  />
)

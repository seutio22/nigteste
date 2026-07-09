import React from 'react'
import { Box, Typography } from '@mui/material'
import { CONTRATO_SLIDE_H, CONTRATO_SLIDE_W } from './placementContratoAtualLayout'
import { SLIDE_COLORS, SLIDE_FONT } from './placementSlideTheme'

export const SLIDE_W = CONTRATO_SLIDE_W
export const SLIDE_H = CONTRATO_SLIDE_H
export const SLIDE_FONT_FAMILY = SLIDE_FONT

export const TABLE_TEAL = '#009FDF'
export const TABLE_TEAL_DARK = '#004F75'
export const TABLE_NAVY = '#002561'
export const TABLE_GRAY = '#eef1f4'
export const TABLE_SECTION = '#c5cdd3'

type SlideHeaderProps = {
  title: string
  subtitle: string
  icon: React.ReactNode
  badge?: string
}

export function PlacementSlideHeader({ title, subtitle, icon, badge }: SlideHeaderProps) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.25,
        flexShrink: 0,
        minHeight: 60,
        maxHeight: 60,
        background: `linear-gradient(90deg, ${SLIDE_COLORS.primary} 0%, ${SLIDE_COLORS.info} 50%, ${SLIDE_COLORS.infoLight} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: SLIDE_FONT,
              fontSize: 22,
              fontWeight: 800,
              color: SLIDE_COLORS.white,
              lineHeight: 1.05,
            }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 10, color: 'rgba(255,255,255,0.88)' }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      {badge && (
        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.25)',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 9, fontWeight: 700, color: SLIDE_COLORS.white }}>
            {badge}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export function PlacementExpandedFrame({
  children,
  footer,
  minWidth,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
  minWidth?: number | string
}) {
  return (
    <Box
      sx={{
        fontFamily: SLIDE_FONT,
        width: '100%',
        minWidth: minWidth ?? 'min(100%, 960px)',
        height: 'auto',
        overflow: 'visible',
        borderRadius: 2,
        boxShadow: '0 2px 12px rgba(0,37,97,0.08)',
        border: `1px solid ${SLIDE_COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SLIDE_COLORS.white,
        boxSizing: 'border-box',
      }}
    >
      {children}
      {footer}
    </Box>
  )
}

export function PlacementSlideFrame({
  children,
  footer,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Box
      data-slide-inner
      sx={{
        fontFamily: SLIDE_FONT,
        width: '100%',
        maxWidth: SLIDE_W,
        height: SLIDE_H,
        maxHeight: SLIDE_H,
        mx: 'auto',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: '0 12px 36px rgba(0,37,97,0.14)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SLIDE_COLORS.white,
        boxSizing: 'border-box',
      }}
    >
      {children}
      {footer}
    </Box>
  )
}

export function SlidePageFooter({ pageIndex, totalPages }: { pageIndex: number; totalPages: number }) {
  if (totalPages <= 1) return null
  return (
    <Box
      sx={{
        flexShrink: 0,
        height: 28,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: `1px solid ${SLIDE_COLORS.border}`,
        bgcolor: TABLE_GRAY,
      }}
    >
      <Typography sx={{ fontFamily: SLIDE_FONT, fontSize: 10, color: SLIDE_COLORS.muted, fontWeight: 600 }}>
        Página {pageIndex + 1} de {totalPages}
      </Typography>
    </Box>
  )
}

export async function exportSlidePng(el: HTMLElement, filename: string, slideW = SLIDE_W, slideH = SLIDE_H) {
  const root = el.closest('[data-export-root]') as HTMLElement | null
  const prevRootWidth = root?.style.width ?? ''
  const prevRootMaxWidth = root?.style.maxWidth ?? ''

  if (root) {
    root.style.width = `${slideW}px`
    root.style.maxWidth = `${slideW}px`
  }

  try {
    if (document.fonts?.ready) await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: slideW,
      height: slideH,
      windowWidth: slideW,
      windowHeight: slideH,
      onclone: (doc) => {
        const cloneRoot = doc.querySelector('[data-export-root]') as HTMLElement | null
        const slide = doc.querySelector('[data-slide-inner]') as HTMLElement | null
        if (cloneRoot) {
          cloneRoot.style.width = `${slideW}px`
          cloneRoot.style.maxWidth = `${slideW}px`
          cloneRoot.style.height = `${slideH}px`
        }
        if (slide) {
          slide.style.width = `${slideW}px`
          slide.style.height = `${slideH}px`
          slide.style.maxHeight = `${slideH}px`
          slide.style.overflow = 'hidden'
        }
      },
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    if (root) {
      root.style.width = prevRootWidth
      root.style.maxWidth = prevRootMaxWidth
    }
  }
}

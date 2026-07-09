import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import type { CotacaoFormScope, AberturaSectionKey } from './placementCotacaoFormScope'
import {
  showDetalhesBaseSection,
  showDetalhesEmCotacaoSection,
  showMapeamentoSection,
  showObservacoesSection,
  showPrazosSection,
  showSubfaturaSection,
} from './placementCotacaoFormScope'

export type CotacaoFormSectionId =
  | 'solicitacao_estudo'
  | 'mapeamento'
  | 'condicoes_contratuais'
  | 'cenario_estudo'
  | 'subfaturas'
  | 'observacoes'

export const COTACAO_FORM_SECTION_TITLES: Record<CotacaoFormSectionId, string> = {
  solicitacao_estudo: 'Solicitação de Estudo',
  mapeamento: 'Mapeamento',
  condicoes_contratuais: 'Condições Contratuais',
  cenario_estudo: 'Cenário de estudo — Solicitação Mercado',
  subfaturas: 'Subfaturas',
  observacoes: 'Observações',
}

const SIDE_NAV_WIDTH = 272

export function listVisibleCotacaoFormSections(
  formScope: CotacaoFormScope,
  aberturaSectionsOnly?: AberturaSectionKey[]
): CotacaoFormSectionId[] {
  const ids: CotacaoFormSectionId[] = []
  if (showPrazosSection(formScope, aberturaSectionsOnly)) ids.push('solicitacao_estudo')
  if (showMapeamentoSection(formScope, aberturaSectionsOnly)) ids.push('mapeamento')
  if (showDetalhesBaseSection(formScope, aberturaSectionsOnly)) ids.push('condicoes_contratuais')
  if (showDetalhesEmCotacaoSection(formScope)) ids.push('cenario_estudo')
  if (showSubfaturaSection(formScope, aberturaSectionsOnly)) ids.push('subfaturas')
  if (showObservacoesSection(formScope, aberturaSectionsOnly)) ids.push('observacoes')
  return ids
}

function sectionDomId(id: CotacaoFormSectionId) {
  return `cotacao-section-${id}`
}

type NavContextValue = {
  sectionIds: CotacaoFormSectionId[]
  activeSection: CotacaoFormSectionId | null
  isExpanded: (id: CotacaoFormSectionId) => boolean
  toggleSection: (id: CotacaoFormSectionId) => void
  expandAll: () => void
  collapseAll: () => void
  scrollToSection: (id: CotacaoFormSectionId) => void
}

const CotacaoFormNavContext = createContext<NavContextValue | null>(null)

function useCotacaoFormNav() {
  const ctx = useContext(CotacaoFormNavContext)
  if (!ctx) throw new Error('CotacaoFormNavigation requires CotacaoFormNavigationProvider')
  return ctx
}

export function CotacaoFormNavigationProvider({
  sectionIds,
  children,
}: {
  sectionIds: CotacaoFormSectionId[]
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState<Set<CotacaoFormSectionId>>(() => new Set())
  const [activeSection, setActiveSection] = useState<CotacaoFormSectionId | null>(null)

  useEffect(() => {
    const first = sectionIds[0]
    setExpanded(first ? new Set([first]) : new Set())
    setActiveSection(first ?? null)
  }, [sectionIds.join('|')])

  const isExpanded = useCallback((id: CotacaoFormSectionId) => expanded.has(id), [expanded])

  const toggleSection = useCallback((id: CotacaoFormSectionId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setActiveSection(id)
  }, [])

  const expandAll = useCallback(() => {
    setExpanded(new Set(sectionIds))
  }, [sectionIds])

  const collapseAll = useCallback(() => {
    setExpanded(new Set())
  }, [])

  const scrollToSection = useCallback((id: CotacaoFormSectionId) => {
    setExpanded((prev) => new Set([...prev, id]))
    setActiveSection(id)
    requestAnimationFrame(() => {
      document.getElementById(sectionDomId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const value = useMemo<NavContextValue>(
    () => ({
      sectionIds,
      activeSection,
      isExpanded,
      toggleSection,
      expandAll,
      collapseAll,
      scrollToSection,
    }),
    [sectionIds, activeSection, isExpanded, toggleSection, expandAll, collapseAll, scrollToSection]
  )

  return <CotacaoFormNavContext.Provider value={value}>{children}</CotacaoFormNavContext.Provider>
}

function CotacaoFormSideNav() {
  const { sectionIds, activeSection, expandAll, collapseAll, scrollToSection } = useCotacaoFormNav()

  return (
    <>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
        Trilha do formulário
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, mb: 1.5 }}>
        Selecione um tópico para expandir e ir até o bloco correspondente.
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
        <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={expandAll}>
          Expandir
        </Button>
        <Button size="small" startIcon={<UnfoldLessIcon />} onClick={collapseAll}>
          Recolher
        </Button>
      </Stack>
      <Divider sx={{ mb: 1 }} />
      <List dense disablePadding>
        {sectionIds.map((id) => (
          <ListItemButton
            key={id}
            selected={activeSection === id}
            onClick={() => scrollToSection(id)}
            sx={{ borderRadius: 1, py: 1, px: 1.25, mb: 0.25 }}
          >
            <ListItemText
              primary={COTACAO_FORM_SECTION_TITLES[id]}
              primaryTypographyProps={{ variant: 'body2', fontWeight: activeSection === id ? 700 : 500 }}
            />
          </ListItemButton>
        ))}
      </List>
    </>
  )
}

function MobileTopicNav() {
  const { sectionIds, scrollToSection, activeSection } = useCotacaoFormNav()

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Ir para o tópico
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: 'auto', pb: 0.5 }}>
        {sectionIds.map((id) => (
          <Button
            key={id}
            size="small"
            variant={activeSection === id ? 'contained' : 'outlined'}
            onClick={() => scrollToSection(id)}
            sx={{ flexShrink: 0 }}
          >
            {COTACAO_FORM_SECTION_TITLES[id]}
          </Button>
        ))}
      </Stack>
    </Paper>
  )
}

export function CotacaoFormNavigationLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const { sectionIds } = useCotacaoFormNav()
  const showSideNav = sectionIds.length > 1

  if (!showSideNav) {
    return <>{children}</>
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 3,
      }}
    >
      {isDesktop && (
        <Box
          component="aside"
          aria-label="Trilha do formulário"
          sx={{
            width: SIDE_NAV_WIDTH,
            flexShrink: 0,
            position: 'sticky',
            top: 88,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 104px)',
            overflowY: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'grey.50',
            p: 2.5,
            boxShadow: '0 2px 12px -4px rgba(0, 37, 97, 0.08)',
          }}
        >
          <CotacaoFormSideNav />
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, width: '100%', pt: 0.5 }}>
        {!isDesktop && <MobileTopicNav />}
        {children}
      </Box>
    </Box>
  )
}

export function CollapsibleFormSection({
  id,
  title,
  icon,
  description,
  children,
  navigationEnabled,
}: {
  id: CotacaoFormSectionId
  title: string
  icon?: React.ReactNode
  description?: string
  children: React.ReactNode
  navigationEnabled: boolean
}) {
  if (!navigationEnabled) {
    return <>{children}</>
  }

  return (
    <CollapsibleFormSectionInner id={id} title={title} icon={icon} description={description}>
      {children}
    </CollapsibleFormSectionInner>
  )
}

function CollapsibleFormSectionInner({
  id,
  title,
  icon,
  description,
  children,
}: {
  id: CotacaoFormSectionId
  title: string
  icon?: React.ReactNode
  description?: string
  children: React.ReactNode
}) {
  const nav = useContext(CotacaoFormNavContext)
  if (!nav) return <>{children}</>

  const { isExpanded, toggleSection } = nav
  const open = isExpanded(id)

  return (
    <Paper
      variant="outlined"
      id={sectionDomId(id)}
      sx={{
        scrollMarginTop: 112,
        overflow: 'hidden',
        borderRadius: 3,
        mb: 2.5,
        borderColor: 'divider',
        boxShadow: '0 2px 12px -4px rgba(0, 37, 97, 0.06)',
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={() => toggleSection(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleSection(id)
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          px: { xs: 2, md: 3 },
          py: 2,
          cursor: 'pointer',
          userSelect: 'none',
          bgcolor: open ? 'action.hover' : 'background.paper',
          borderBottom: open ? 1 : 0,
          borderColor: 'divider',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {icon && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          aria-label={open ? 'Recolher seção' : 'Expandir seção'}
          onClick={(e) => {
            e.stopPropagation()
            toggleSection(id)
          }}
          sx={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit={false}>
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: { xs: 2.5, md: 3 },
            bgcolor: 'background.paper',
            '& .MuiCard-root': {
              boxShadow: 'none',
            },
            '& .MuiCardContent-root': {
              px: { xs: 0, md: 0 },
              py: 0,
              '&:last-child': { pb: 0 },
            },
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Paper>
  )
}

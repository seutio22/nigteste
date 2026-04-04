import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Chip, Container, Divider, List, ListItem, ListItemText, Typography } from '@mui/material'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { api } from '../lib/api'

type AreaRow = {
  id: string
  slug: string
  name: string
  types: { id: string; slug: string; name: string }[]
}

type Props = {
  onPick: (areaId: string, typeId: string) => void
}

/** Catálogo amigável só no fluxo «Nova solicitação» (não é o painel administrativo). */
export default function NewRequestCatalog({ onPick }: Props) {
  const [areas, setAreas] = useState<AreaRow[]>([])

  useEffect(() => {
    void (async () => {
      const a = await api<{ areas: AreaRow[] }>('/areas')
      if (a.ok && a.data?.areas) setAreas(a.data.areas)
    })()
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.primary.main}14 0%, ${t.palette.primary.dark}22 100%)`,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <RocketLaunchIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>
            Escolha o tipo de solicitação
          </Typography>
        </Box>
        <Typography color="text.secondary" variant="body2">
          Selecione uma área e um tipo abaixo. Em seguida preencha o formulário definido pela sua organização.
        </Typography>
      </Box>

      {areas.length === 0 ? (
        <Typography color="text.secondary">Nenhuma área disponível no momento.</Typography>
      ) : (
        areas.map((ar) => (
          <Card
            key={ar.id}
            elevation={0}
            sx={{
              mb: 2,
              borderRadius: 3,
              overflow: 'visible',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  {ar.name}
                </Typography>
                <Chip size="small" label={ar.slug} variant="outlined" />
              </Box>
              <Divider sx={{ my: 2 }} />
              <List dense disablePadding>
                {ar.types.map((t) => (
                  <ListItem
                    key={t.id}
                    disableGutters
                    sx={{ py: 0.75, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                    secondaryAction={
                      <Button variant="contained" size="medium" onClick={() => onPick(ar.id, t.id)} sx={{ ml: 1 }}>
                        Continuar
                      </Button>
                    }
                  >
                    <ListItemText primary={t.name} secondary={t.slug} primaryTypographyProps={{ fontWeight: 600 }} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  )
}

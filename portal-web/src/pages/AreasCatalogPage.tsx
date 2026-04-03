import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'

type AreaRow = {
  id: string
  slug: string
  name: string
  types: { id: string; slug: string; name: string }[]
}

export default function AreasCatalogPage() {
  const [areas, setAreas] = useState<AreaRow[]>([])

  useEffect(() => {
    void (async () => {
      const a = await api<{ areas: AreaRow[] }>('/areas')
      if (a.ok && a.data?.areas) setAreas(a.data.areas)
    })()
  }, [])

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Áreas e tipos de solicitação
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Cada tipo abre um fluxo de formulário. Use o botão para iniciar diretamente com área e tipo
        selecionados.
      </Typography>

      {areas.length === 0 ? (
        <Typography color="text.secondary">Nenhuma área cadastrada.</Typography>
      ) : (
        areas.map((ar) => (
          <Card key={ar.id} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {ar.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Slug: {ar.slug}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense disablePadding>
                {ar.types.map((t) => (
                  <ListItem
                    key={t.id}
                    disableGutters
                    secondaryAction={
                      <Button
                        component={RouterLink}
                        size="small"
                        variant="contained"
                        to={`/solicitacoes/nova?areaId=${ar.id}&typeId=${t.id}`}
                      >
                        Iniciar
                      </Button>
                    }
                  >
                    <ListItemText primary={t.name} secondary={t.slug} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        ))
      )}

      <Box sx={{ mt: 3 }}>
        <Button component={RouterLink} to="/solicitacoes/nova" variant="outlined">
          Nova solicitação (escolher na página)
        </Button>
      </Box>
    </Container>
  )
}

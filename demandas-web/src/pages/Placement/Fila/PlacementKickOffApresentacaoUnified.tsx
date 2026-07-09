import React, { forwardRef } from 'react'
import { Box, Divider, Typography } from '@mui/material'
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import type { CotacaoFormState } from './CotacaoFormFields'
import { PlacementAnaliseBaseUnifiedPage } from './PlacementAnaliseBaseUnifiedPage'
import { KickOffInconsistenciasResumoTable } from './KickOffInconsistenciasResumoTable'
import { useKickOffValidacaoResumo } from './useKickOffValidacaoResumo'

type Props = {
  cotacaoId: string
  ticket: string
  form: CotacaoFormState
}

export const PlacementKickOffApresentacaoUnified = forwardRef<HTMLDivElement, Props>(
  function PlacementKickOffApresentacaoUnified({ cotacaoId, ticket, form }, ref) {
    const { loading, validacao, itens, totalLinhas } = useKickOffValidacaoResumo(cotacaoId, form)

    return (
      <Box
        ref={ref}
        data-export-root
        sx={{
          width: '100%',
          minWidth: 0,
          bgcolor: 'background.paper',
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <ViewAgendaIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Apresentação — Análise da base
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ticket {ticket} · painel unificado da cotação
            </Typography>
          </Box>
        </Box>

        <PlacementAnaliseBaseUnifiedPage cotacaoId={cotacaoId} />

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <WarningAmberIcon fontSize="small" color="warning" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Resumo de inconsistências
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Validação da base importada em relação aos dados da abertura da cotação.
        </Typography>

        <KickOffInconsistenciasResumoTable
          loading={loading}
          itens={itens}
          totalLinhas={totalLinhas}
          totalOcorrencias={validacao?.totalApontamentos ?? 0}
          fullWidth
        />
      </Box>
    )
  }
)

import React from 'react'

import { Alert, Box, Card, CardContent, Grid, TextField, Typography } from '@mui/material'

import {

  EMPTY_DADOS_FINANCEIROS,

  participacaoExcedeLimite,

  sanitizePercentInput,

  somaParticipacaoPercentual,

  type ComissaoAtualContrato,

  type ComissaoEstudoCotacao,

  type DadosFinanceirosCotacao,

  type ParticipacaoPercentual,

} from './placementCotacaoFinanceiro'



type Props = {

  value: DadosFinanceirosCotacao

  clienteTipo: 'casa' | 'prospect'

  temCorretorParceiro: boolean

  disabled?: boolean

  onChange: (next: DadosFinanceirosCotacao) => void

  /** base_atual: só contrato vigente; em_cotacao+: cenário de estudo também. */

  workflowStageKey?: 'base_atual' | 'em_cotacao' | 'aguardando_operadora' | 'proposta_enviada' | 'fechada' | 'perdida' | 'cancelada' | string

}



function PercentField({

  label,

  value,

  required,

  disabled,

  onChange,

  helperText,

  error,

}: {

  label: string

  value: string

  required?: boolean

  disabled?: boolean

  onChange: (v: string) => void

  helperText?: string

  error?: boolean

}) {

  return (

    <TextField

      label={label}

      fullWidth

      size="small"

      required={required}

      disabled={disabled}

      value={value}

      onChange={(e) => onChange(sanitizePercentInput(e.target.value))}

      InputProps={{

        endAdornment: <Typography variant="body2" color="text.secondary">%</Typography>,

      }}

      inputProps={{ inputMode: 'decimal' }}

      helperText={helperText}

      error={error}

    />

  )

}



function ParticipacaoFields({

  participacao,

  temCorretorParceiro,

  disabled,

  onChange,

}: {

  participacao: ParticipacaoPercentual

  temCorretorParceiro: boolean

  disabled?: boolean

  onChange: (next: ParticipacaoPercentual) => void

}) {

  const soma = somaParticipacaoPercentual(participacao.mds, participacao.corretorParceiro)

  const excede = participacaoExcedeLimite(participacao.mds, participacao.corretorParceiro)



  return (

    <Box>

      <Grid container spacing={2}>

        <Grid item xs={12} sm={temCorretorParceiro ? 6 : 12}>

          <PercentField

            label="Participação % MDS"

            value={participacao.mds}

            disabled={disabled}

            onChange={(mds) => onChange({ ...participacao, mds })}

            error={excede}

          />

        </Grid>

        {temCorretorParceiro && (

          <Grid item xs={12} sm={6}>

            <PercentField

              label="Participação % Corretor parceiro"

              value={participacao.corretorParceiro}

              disabled={disabled}

              onChange={(corretorParceiro) => onChange({ ...participacao, corretorParceiro })}

              error={excede}

            />

          </Grid>

        )}

      </Grid>

      {excede ? (

        <Alert severity="error" sx={{ mt: 1.5 }}>

          A soma das participações ({soma.toLocaleString('pt-BR')}) não pode superar 100%.

        </Alert>

      ) : (

        temCorretorParceiro && (

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>

            Soma atual: {soma.toLocaleString('pt-BR')}% (máximo 100%)

          </Typography>

        )

      )}

    </Box>

  )

}



export function CotacaoFinanceiroSection({

  value,

  clienteTipo,

  temCorretorParceiro,

  disabled,

  onChange,

  workflowStageKey = 'completo',

}: Props) {

  const showEstudo = workflowStageKey !== 'base_atual'

  const patchAtual = (part: Partial<ComissaoAtualContrato>) =>

    onChange({ ...value, atual: { ...value.atual, ...part } })



  const patchEstudo = (part: Partial<ComissaoEstudoCotacao>) =>

    onChange({ ...value, estudo: { ...value.estudo, ...part } })



  const isCasa = clienteTipo === 'casa'



  return (

    <Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>

        Quesito financeiro

      </Typography>

      {showEstudo && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Comissões e participação do contrato vigente e do cenário de estudo da cotação.
        </Typography>
      )}



      <Grid container spacing={2.5}>

        <Grid item xs={12} lg={showEstudo ? 6 : 12}>

          <Card variant="outlined" sx={{ height: '100%' }}>

            <CardContent>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>

                Comissão atual — contrato vigente

              </Typography>

              {isCasa && (

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>

                  Vitalício obrigatório para Cliente da Carteira.

                </Typography>

              )}

              <Box sx={{ mb: 2 }}>

                <PercentField

                  label="Comissão vitalício (contrato)"

                  value={value.atual.comissaoVitalicioContrato}

                  required={isCasa}

                  disabled={disabled}

                  onChange={(comissaoVitalicioContrato) => patchAtual({ comissaoVitalicioContrato })}

                />

              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>

                Participação no contrato atual

              </Typography>

              <ParticipacaoFields

                participacao={value.atual.participacao}

                temCorretorParceiro={temCorretorParceiro}

                disabled={disabled}

                onChange={(participacao) => patchAtual({ participacao })}

              />

            </CardContent>

          </Card>

        </Grid>



        {showEstudo && (

        <Grid item xs={12} lg={6}>

          <Card variant="outlined" sx={{ height: '100%' }}>

            <CardContent>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>

                Cenário de estudo (cotação)

              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>

                <Grid item xs={12} sm={6}>

                  <PercentField

                    label="Comissão agenciamento"

                    value={value.estudo.comissaoAgenciamento}

                    disabled={disabled}

                    onChange={(comissaoAgenciamento) => patchEstudo({ comissaoAgenciamento })}

                  />

                </Grid>

                <Grid item xs={12} sm={6}>

                  <PercentField

                    label="Comissão vitalício"

                    value={value.estudo.comissaoVitalicio}

                    disabled={disabled}

                    onChange={(comissaoVitalicio) => patchEstudo({ comissaoVitalicio })}

                  />

                </Grid>

              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>

                Participação no cenário de estudo

              </Typography>

              <ParticipacaoFields

                participacao={value.estudo.participacao}

                temCorretorParceiro={temCorretorParceiro}

                disabled={disabled}

                onChange={(participacao) => patchEstudo({ participacao })}

              />

            </CardContent>

          </Card>

        </Grid>

        )}

      </Grid>

    </Box>

  )

}



export { EMPTY_DADOS_FINANCEIROS }



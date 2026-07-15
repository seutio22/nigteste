/** Contagem de vidas (> 0) a partir de string digitada. */
export function parseVidasCount(v: string | undefined | null): number {
  const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Destaque no TextField de valor: âmbar = falta preencher · verde = ok · cinza = sem vidas. */
export function sxCampoValorPorVidas(temVidas: boolean, valorPreenchido: boolean) {
  if (!temVidas) {
    return {
      '& .MuiOutlinedInput-root': {
        bgcolor: 'action.disabledBackground',
      },
    }
  }
  if (!valorPreenchido) {
    return {
      '& .MuiOutlinedInput-root': {
        bgcolor: '#FFFBEB',
        '& fieldset': { borderColor: '#F59E0B', borderWidth: 2 },
        '&:hover fieldset': { borderColor: '#D97706' },
        '&.Mui-focused fieldset': { borderColor: '#D97706', borderWidth: 2 },
      },
    }
  }
  return {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#ECFDF5',
      '& fieldset': { borderColor: '#6EE7B7' },
    },
  }
}

/** Card de faixa etária no lançamento de proposta. */
export function sxCardFaixaPorVidas(temVidas: boolean, valorPreenchido: boolean) {
  if (!temVidas) {
    return { p: 1, opacity: 0.55, bgcolor: 'grey.50' }
  }
  if (!valorPreenchido) {
    return { p: 1, bgcolor: '#FFFBEB', borderColor: '#FCD34D', borderWidth: 2 }
  }
  return { p: 1, bgcolor: '#F0FDF4', borderColor: '#86EFAC' }
}

/** Linha da tabela de faixas na abertura do contrato. */
export function sxTableRowFaixaPorVidas(temVidas: boolean, valorPreenchido: boolean) {
  if (!temVidas) {
    return { opacity: 0.55, bgcolor: 'grey.50' }
  }
  if (!valorPreenchido) {
    return { bgcolor: '#FFFBEB' }
  }
  return { bgcolor: '#F0FDF4' }
}

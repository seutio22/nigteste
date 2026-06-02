import { api } from './api.local'

export type ConsultaCnpjResponse = {
  razaoSocial: string | null
  cnae: string | null
  nomeFantasia?: string | null
  cidade?: string | null
  uf?: string | null
}

export function onlyDigitsCnpj(value: string): string {
  return (value || '').replace(/\D+/g, '').slice(0, 14)
}

/** Consulta CNPJ na API do backend (proxy BrasilAPI). */
export async function consultarCnpjPlacement(cnpj: string): Promise<ConsultaCnpjResponse> {
  const digits = onlyDigitsCnpj(cnpj)
  if (digits.length !== 14) {
    throw new Error('Informe o CNPJ com 14 dígitos.')
  }
  return api.get(`/placement/consulta-cnpj/${digits}`) as Promise<ConsultaCnpjResponse>
}

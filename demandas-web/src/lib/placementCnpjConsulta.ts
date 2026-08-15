import { api } from './api.local'
import { normalizeCnpj } from './cnpjAlfanumerico'

export {
  formatCnpj14,
  formatCnpjMask,
  isCnpjShape,
  isValidCnpj,
  normalizeCnpj,
  onlyDigitsCnpj,
  cnpjProntoParaConsulta,
} from './cnpjAlfanumerico'

export type ConsultaCnpjResponse = {
  razaoSocial: string | null
  cnae: string | null
  nomeFantasia?: string | null
  cidade?: string | null
  uf?: string | null
}

/** Consulta CNPJ na API do backend (proxy BrasilAPI). */
export async function consultarCnpjPlacement(cnpj: string): Promise<ConsultaCnpjResponse> {
  const id = normalizeCnpj(cnpj)
  if (id.length !== 14) {
    throw new Error('Informe o CNPJ com 14 caracteres (letras e números).')
  }
  return api.get(`/placement/consulta-cnpj/${encodeURIComponent(id)}`) as Promise<ConsultaCnpjResponse>
}

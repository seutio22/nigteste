import { describe, expect, it } from 'vitest'
import {
  coparticipacaoFromCopartForm,
  coparticipacaoSimNaoLabel,
  temCoparticipacaoFromValor,
} from './placementContratoAtual'
import { emptyCoparticipacao } from './placementCoparticipacao'

describe('coparticipacaoSimNaoLabel', () => {
  it('normaliza Sim e Não explícitos', () => {
    expect(coparticipacaoSimNaoLabel('Sim')).toBe('Sim')
    expect(coparticipacaoSimNaoLabel('Não')).toBe('Não')
    expect(temCoparticipacaoFromValor('Sim')).toBe(true)
    expect(temCoparticipacaoFromValor('Não')).toBe(false)
  })

  it('converte textos legados de abertura para Sim/Não', () => {
    expect(coparticipacaoSimNaoLabel('Sem coparticipação')).toBe('Não')
    expect(coparticipacaoSimNaoLabel('Com coparticipação')).toBe('Sim')
    expect(coparticipacaoSimNaoLabel('20% Consultas e exames simples')).toBe('Sim')
    expect(coparticipacaoSimNaoLabel('')).toBe('—')
  })

  it('deriva Sim/Não a partir do formulário de abertura', () => {
    const comCopart = emptyCoparticipacao()
    comCopart.possui = true
    expect(coparticipacaoFromCopartForm(comCopart, '')).toBe('Sim')
    expect(coparticipacaoFromCopartForm(emptyCoparticipacao(), 'Detalhe global')).toBe('Sim')
    expect(coparticipacaoFromCopartForm(emptyCoparticipacao(), '')).toBe('Não')
  })
})

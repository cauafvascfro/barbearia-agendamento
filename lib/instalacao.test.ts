import { describe, expect, it } from 'vitest'
import { avaliarProntidaoInstalacao } from './instalacao'

const configValida = {
  nome_barbearia: 'New Style Barbearia',
  telefone: '(75) 99999-9999',
  intervalo_agendamento: 30,
  antecedencia_maxima_dias: 30,
}

describe('avaliarProntidaoInstalacao', () => {
  it('considera pronta uma instalação completa', () => {
    const resultado = avaliarProntidaoInstalacao(configValida, 3, 5, 0)
    expect(resultado.pronta).toBe(true)
    expect(resultado.concluidos).toBe(resultado.total)
    expect(resultado.pendencias).toEqual([])
  })

  it.each([
    ['identidade', { ...configValida, nome_barbearia: ' ' }, 3, 5, 0],
    ['telefone', { ...configValida, telefone: ' ' }, 3, 5, 0],
    ['serviços', configValida, 0, 5, 0],
    ['expediente', configValida, 3, 0, 0],
    ['regras da agenda', { ...configValida, intervalo_agendamento: 0 }, 3, 5, 0],
  ])('informa a pendência de %s', (pendencia, config, servicos, horarios, aberturas) => {
    const resultado = avaliarProntidaoInstalacao(config, servicos, horarios, aberturas)
    expect(resultado.pronta).toBe(false)
    expect(resultado.pendencias).toContain(pendencia)
  })

  it('aceita abertura especial futura como expediente', () => {
    const resultado = avaliarProntidaoInstalacao(configValida, 3, 0, 1)
    expect(resultado.expedienteOk).toBe(true)
    expect(resultado.pronta).toBe(true)
  })

  it('rejeita configuração ausente', () => {
    const resultado = avaliarProntidaoInstalacao(null, 3, 5, 0)
    expect(resultado.pronta).toBe(false)
    expect(resultado.pendencias).toContain('identidade')
    expect(resultado.pendencias).toContain('telefone')
    expect(resultado.pendencias).toContain('regras da agenda')
  })
})

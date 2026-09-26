export type ConfiguracaoProntidao = {
  nome_barbearia?: string | null
  telefone?: string | null
  intervalo_agendamento?: number | null
  antecedencia_maxima_dias?: number | null
}

export function avaliarProntidaoInstalacao(
  config: ConfiguracaoProntidao | null | undefined,
  servicosAtivos: number,
  horariosAtivos: number,
  aberturasFuturas: number,
) {
  const identidadeOk = Boolean(config?.nome_barbearia?.trim())
  const contatoOk = Boolean(config?.telefone?.trim())
  const servicosOk = servicosAtivos > 0
  const expedienteOk = horariosAtivos > 0 || aberturasFuturas > 0
  const regrasOk = Boolean(
    config &&
      Number(config.intervalo_agendamento) >= 5 &&
      Number(config.antecedencia_maxima_dias) >= 1,
  )

  const itens = [
    { chave: 'identidade', ok: identidadeOk },
    { chave: 'telefone', ok: contatoOk },
    { chave: 'serviços', ok: servicosOk },
    { chave: 'expediente', ok: expedienteOk },
    { chave: 'regras da agenda', ok: regrasOk },
  ]

  return {
    identidadeOk,
    contatoOk,
    servicosOk,
    expedienteOk,
    regrasOk,
    pronta: itens.every((item) => item.ok),
    concluidos: itens.filter((item) => item.ok).length,
    total: itens.length,
    pendencias: itens.filter((item) => !item.ok).map((item) => item.chave),
  }
}

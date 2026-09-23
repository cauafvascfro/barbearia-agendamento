export function formatarMoeda(valor: number | string | null | undefined) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatarTelefone(telefone?: string | null) {
  if (!telefone) return '—'
  const numero = telefone.replace(/\D/g, '')
  const semDDI = numero.startsWith('55') ? numero.slice(2) : numero

  if (semDDI.length === 11) {
    return `(${semDDI.slice(0, 2)}) ${semDDI.slice(2, 7)}-${semDDI.slice(7)}`
  }
  if (semDDI.length === 10) {
    return `(${semDDI.slice(0, 2)}) ${semDDI.slice(2, 6)}-${semDDI.slice(6)}`
  }
  return telefone
}

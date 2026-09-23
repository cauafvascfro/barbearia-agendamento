export function intervalosConflitam(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
) {
  return inicioA < fimB && fimA > inicioB
}

import { describe, expect, it } from 'vitest'
import { intervalosConflitam } from './regras'

describe('intervalosConflitam', () => {
  it('detecta sobreposição', () => {
    expect(
      intervalosConflitam(
        new Date('2026-09-25T14:00:00-03:00'),
        new Date('2026-09-25T15:00:00-03:00'),
        new Date('2026-09-25T14:30:00-03:00'),
        new Date('2026-09-25T15:30:00-03:00'),
      ),
    ).toBe(true)
  })

  it('permite horários consecutivos', () => {
    expect(
      intervalosConflitam(
        new Date('2026-09-25T14:00:00-03:00'),
        new Date('2026-09-25T14:30:00-03:00'),
        new Date('2026-09-25T14:30:00-03:00'),
        new Date('2026-09-25T15:00:00-03:00'),
      ),
    ).toBe(false)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { createPaletteInMemoryRepository } from './PaletteInMemoryRepository'
import type { Palette } from '../Domain/ValueObject/Palette'
import type { SeedColors } from '../Domain/ValueObject/SeedColors'

const createMockPalette = (): Palette => ({
  seedColors: {
    brand: { l: 0.5, c: 0.1, h: 240 },
    foundation: { l: 0.9, c: 0.01, h: 0 },
    accent: { l: 0.6, c: 0.15, h: 30 },
  },
  semanticPalette: {} as Palette['semanticPalette'],
  primitivePalette: {} as Palette['primitivePalette'],
})

describe('PaletteInMemoryRepository', () => {
  it('should return initial palette via get()', () => {
    const initialPalette = createMockPalette()
    const repo = createPaletteInMemoryRepository({ initialPalette })

    expect(repo.get()).toBe(initialPalette)
  })

  it('should update palette via set()', () => {
    const initialPalette = createMockPalette()
    const repo = createPaletteInMemoryRepository({ initialPalette })

    const newPalette = { ...initialPalette, seedColors: { ...initialPalette.seedColors, brand: { l: 0.7, c: 0.2, h: 180 } } }
    repo.set(newPalette)

    expect(repo.get()).toBe(newPalette)
  })

  it('should notify subscribers on set()', () => {
    const initialPalette = createMockPalette()
    const repo = createPaletteInMemoryRepository({ initialPalette })

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    const newPalette = { ...initialPalette }
    repo.set(newPalette)

    expect(subscriber).toHaveBeenCalledWith(newPalette)
  })

  it('should allow unsubscribing', () => {
    const initialPalette = createMockPalette()
    const repo = createPaletteInMemoryRepository({ initialPalette })

    const subscriber = vi.fn()
    const unsubscribe = repo.subscribe(subscriber)

    unsubscribe()
    repo.set({ ...initialPalette })

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('should update seed colors partially', () => {
    const initialPalette = createMockPalette()
    const repo = createPaletteInMemoryRepository({ initialPalette })

    const newBrand = { l: 0.8, c: 0.25, h: 120 }
    repo.updateSeedColors({ brand: newBrand })

    expect(repo.get().seedColors.brand).toEqual(newBrand)
    expect(repo.get().seedColors.foundation).toEqual(initialPalette.seedColors.foundation)
  })

  it('should notify subscribers on updateSeedColors()', () => {
    const initialPalette = createMockPalette()
    const repo = createPaletteInMemoryRepository({ initialPalette })

    const subscriber = vi.fn()
    repo.subscribe(subscriber)

    repo.updateSeedColors({ brand: { l: 0.8, c: 0.25, h: 120 } })

    expect(subscriber).toHaveBeenCalled()
  })
})

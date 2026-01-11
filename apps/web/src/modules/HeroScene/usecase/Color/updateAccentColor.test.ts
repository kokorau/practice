import { describe, it, expect } from 'vitest'
import { updateAccentColor } from './updateAccentColor'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroView/HeroViewInMemoryRepository'

describe('updateAccentColor', () => {
  it('should update accent color hue', () => {
    const repository = createHeroViewInMemoryRepository()
    const originalAccent = repository.get().colors.accent

    updateAccentColor({ hue: 240 }, repository)

    const updated = repository.get().colors.accent
    expect(updated.hue).toBe(240)
    expect(updated.saturation).toBe(originalAccent.saturation)
    expect(updated.value).toBe(originalAccent.value)
  })

  it('should update accent color saturation', () => {
    const repository = createHeroViewInMemoryRepository()

    updateAccentColor({ saturation: 90 }, repository)

    expect(repository.get().colors.accent.saturation).toBe(90)
  })

  it('should update accent color value', () => {
    const repository = createHeroViewInMemoryRepository()

    updateAccentColor({ value: 55 }, repository)

    expect(repository.get().colors.accent.value).toBe(55)
  })

  it('should update multiple properties at once', () => {
    const repository = createHeroViewInMemoryRepository()

    updateAccentColor({ hue: 180, saturation: 75, value: 65 }, repository)

    const updated = repository.get().colors.accent
    expect(updated.hue).toBe(180)
    expect(updated.saturation).toBe(75)
    expect(updated.value).toBe(65)
  })
})

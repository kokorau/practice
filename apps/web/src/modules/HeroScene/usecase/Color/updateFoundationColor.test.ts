import { describe, it, expect } from 'vitest'
import { updateFoundationColor } from './updateFoundationColor'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroView/HeroViewInMemoryRepository'

describe('updateFoundationColor', () => {
  it('should update foundation color hue', () => {
    const repository = createHeroViewInMemoryRepository()
    const originalFoundation = repository.get().colors.foundation

    updateFoundationColor({ hue: 210 }, repository)

    const updated = repository.get().colors.foundation
    expect(updated.hue).toBe(210)
    expect(updated.saturation).toBe(originalFoundation.saturation)
    expect(updated.value).toBe(originalFoundation.value)
  })

  it('should update foundation color saturation', () => {
    const repository = createHeroViewInMemoryRepository()

    updateFoundationColor({ saturation: 10 }, repository)

    expect(repository.get().colors.foundation.saturation).toBe(10)
  })

  it('should update foundation color value', () => {
    const repository = createHeroViewInMemoryRepository()

    updateFoundationColor({ value: 20 }, repository)

    expect(repository.get().colors.foundation.value).toBe(20)
  })

  it('should update multiple properties at once', () => {
    const repository = createHeroViewInMemoryRepository()

    updateFoundationColor({ hue: 0, saturation: 0, value: 10 }, repository)

    const updated = repository.get().colors.foundation
    expect(updated.hue).toBe(0)
    expect(updated.saturation).toBe(0)
    expect(updated.value).toBe(10)
  })
})

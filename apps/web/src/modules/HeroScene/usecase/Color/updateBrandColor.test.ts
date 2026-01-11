import { describe, it, expect } from 'vitest'
import { updateBrandColor } from './updateBrandColor'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroView/HeroViewInMemoryRepository'

describe('updateBrandColor', () => {
  it('should update brand color hue', () => {
    const repository = createHeroViewInMemoryRepository()
    const originalBrand = repository.get().colors.brand

    updateBrandColor({ hue: 120 }, repository)

    const updated = repository.get().colors.brand
    expect(updated.hue).toBe(120)
    expect(updated.saturation).toBe(originalBrand.saturation)
    expect(updated.value).toBe(originalBrand.value)
  })

  it('should update brand color saturation', () => {
    const repository = createHeroViewInMemoryRepository()

    updateBrandColor({ saturation: 50 }, repository)

    expect(repository.get().colors.brand.saturation).toBe(50)
  })

  it('should update brand color value', () => {
    const repository = createHeroViewInMemoryRepository()

    updateBrandColor({ value: 80 }, repository)

    expect(repository.get().colors.brand.value).toBe(80)
  })

  it('should update multiple properties at once', () => {
    const repository = createHeroViewInMemoryRepository()

    updateBrandColor({ hue: 200, saturation: 60, value: 70 }, repository)

    const updated = repository.get().colors.brand
    expect(updated.hue).toBe(200)
    expect(updated.saturation).toBe(60)
    expect(updated.value).toBe(70)
  })
})

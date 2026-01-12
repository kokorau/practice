import { describe, it, expect } from 'vitest'
import { applyColorPreset } from './applyColorPreset'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { ColorPreset } from '../../../SemanticColorPalette/Domain/ValueObject/ColorPreset'

describe('applyColorPreset', () => {
  it('should apply color preset to repository', () => {
    const repository = createHeroViewInMemoryRepository()

    const preset: ColorPreset = {
      id: 'ocean',
      name: 'Ocean',
      description: 'Ocean blue theme',
      brand: { hue: 200, saturation: 80, value: 60 },
      accent: { hue: 30, saturation: 90, value: 70 },
      foundation: { hue: 210, saturation: 5, value: 95 },
    }

    applyColorPreset(preset, repository)

    const colors = repository.get().colors
    expect(colors.brand).toEqual(preset.brand)
    expect(colors.accent).toEqual(preset.accent)
    expect(colors.foundation).toEqual(preset.foundation)
  })

  it('should apply preset without affecting other color settings', () => {
    const repository = createHeroViewInMemoryRepository()
    const originalColors = repository.get().colors

    const preset: ColorPreset = {
      id: 'sunset',
      name: 'Sunset',
      description: 'Warm sunset theme',
      brand: { hue: 15, saturation: 85, value: 65 },
      accent: { hue: 45, saturation: 90, value: 75 },
      foundation: { hue: 30, saturation: 10, value: 98 },
    }

    applyColorPreset(preset, repository)

    const updated = repository.get().colors
    expect(updated.background).toEqual(originalColors.background)
    expect(updated.mask).toEqual(originalColors.mask)
    expect(updated.semanticContext).toEqual(originalColors.semanticContext)
  })
})

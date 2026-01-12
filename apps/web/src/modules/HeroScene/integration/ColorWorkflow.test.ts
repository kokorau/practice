/**
 * ColorWorkflow Integration Tests
 *
 * 色変更→palette反映の統合テスト
 * HeroViewRepository + 複数UseCaseを組み合わせたワークフローを検証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHeroViewInMemoryRepository } from '../Infra/HeroViewInMemoryRepository'
import { updateBrandColor } from '../usecase/Color/updateBrandColor'
import { updateAccentColor } from '../usecase/Color/updateAccentColor'
import { updateFoundationColor } from '../usecase/Color/updateFoundationColor'
import { applyColorPreset } from '../usecase/Color/applyColorPreset'
import type { HeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type { HeroViewConfig } from '../Domain/HeroViewConfig'
import type { ColorPreset } from '../../../SemanticColorPalette/Domain/ValueObject/ColorPreset'

describe('ColorWorkflow Integration', () => {
  let repository: HeroViewRepository

  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      background: { primary: 'B', secondary: 'auto' },
      mask: { primary: 'auto', secondary: 'auto' },
      semanticContext: 'canvas',
      brand: { hue: 198, saturation: 70, value: 65 },
      accent: { hue: 30, saturation: 80, value: 60 },
      foundation: { hue: 0, saturation: 0, value: 97 },
    },
    layers: [
      {
        type: 'base',
        id: 'base',
        name: 'Background',
        visible: true,
        surface: { type: 'solid' },
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  beforeEach(() => {
    repository = createHeroViewInMemoryRepository(createTestConfig())
  })

  describe('プリセット適用 → brand色変更 → accent色変更 → 状態確認', () => {
    const createColorPreset = (id: string, brandHue: number, accentHue: number, foundationHue: number): ColorPreset => ({
      id,
      name: `Preset ${id}`,
      description: 'Test preset',
      brand: { hue: brandHue, saturation: 70, value: 65 },
      accent: { hue: accentHue, saturation: 80, value: 60 },
      foundation: { hue: foundationHue, saturation: 5, value: 95 },
    })

    it('should apply color preset then customize brand and accent colors', () => {
      // Step 1: カラープリセットを適用
      const preset = createColorPreset('preset-1', 220, 340, 10)
      applyColorPreset(preset, repository)
      const afterPreset = repository.get().colors

      // プリセット適用後の状態を確認
      expect(afterPreset.brand.hue).toBe(220)
      expect(afterPreset.accent.hue).toBe(340)
      expect(afterPreset.foundation.hue).toBe(10)

      // Step 2: brand色を変更
      updateBrandColor({ hue: 120, saturation: 85, value: 70 }, repository)
      const afterBrand = repository.get().colors

      expect(afterBrand.brand).toEqual({ hue: 120, saturation: 85, value: 70 })
      // accent, foundationは変更されていないことを確認
      expect(afterBrand.accent).toEqual(afterPreset.accent)
      expect(afterBrand.foundation).toEqual(afterPreset.foundation)

      // Step 3: accent色を変更
      updateAccentColor({ hue: 280, saturation: 75, value: 60 }, repository)
      const afterAccent = repository.get().colors

      expect(afterAccent.accent).toEqual({ hue: 280, saturation: 75, value: 60 })
      // brandは前のステップの値を維持
      expect(afterAccent.brand).toEqual({ hue: 120, saturation: 85, value: 70 })
      // foundationはプリセットの値を維持
      expect(afterAccent.foundation).toEqual(afterPreset.foundation)
    })

    it('should apply multiple color presets sequentially', () => {
      // プリセット0を適用
      const preset0 = createColorPreset('preset-0', 100, 200, 0)
      applyColorPreset(preset0, repository)
      const preset0Colors = { ...repository.get().colors }

      // プリセット1を適用
      const preset1 = createColorPreset('preset-1', 250, 350, 20)
      applyColorPreset(preset1, repository)
      const preset1Colors = repository.get().colors

      // 異なるプリセットであることを確認
      expect(preset1Colors.brand).not.toEqual(preset0Colors.brand)
    })
  })

  describe('色変更 → subscribe通知の検証', () => {
    it('should notify subscribers when brand color changes', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      updateBrandColor({ hue: 200 }, repository)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          colors: expect.objectContaining({
            brand: expect.objectContaining({ hue: 200 }),
          }),
        })
      )
    })

    it('should notify subscribers for each color change in sequence', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      // 複数の色変更を連続して行う
      updateBrandColor({ hue: 100 }, repository)
      updateAccentColor({ hue: 200 }, repository)
      updateFoundationColor({ hue: 300 }, repository)

      expect(callback).toHaveBeenCalledTimes(3)

      // 最終状態の確認
      const finalConfig = repository.get()
      expect(finalConfig.colors.brand.hue).toBe(100)
      expect(finalConfig.colors.accent.hue).toBe(200)
      expect(finalConfig.colors.foundation.hue).toBe(300)
    })

    it('should allow unsubscribe and stop notifications', () => {
      const callback = vi.fn()
      const unsubscribe = repository.subscribe(callback)

      updateBrandColor({ hue: 100 }, repository)
      expect(callback).toHaveBeenCalledTimes(1)

      // unsubscribe後は通知されない
      unsubscribe()
      updateBrandColor({ hue: 200 }, repository)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('部分更新の検証', () => {
    it('should preserve other HSV values when updating only hue', () => {
      const initialBrand = repository.get().colors.brand
      const originalSaturation = initialBrand.saturation
      const originalValue = initialBrand.value

      updateBrandColor({ hue: 150 }, repository)

      const updatedBrand = repository.get().colors.brand
      expect(updatedBrand.hue).toBe(150)
      expect(updatedBrand.saturation).toBe(originalSaturation)
      expect(updatedBrand.value).toBe(originalValue)
    })

    it('should handle concurrent partial updates correctly', () => {
      // 同時に複数の部分更新を行う
      updateBrandColor({ hue: 100 }, repository)
      updateBrandColor({ saturation: 50 }, repository)
      updateBrandColor({ value: 80 }, repository)

      const brand = repository.get().colors.brand
      expect(brand.hue).toBe(100)
      expect(brand.saturation).toBe(50)
      expect(brand.value).toBe(80)
    })
  })

  describe('全色変更ワークフロー', () => {
    it('should support complete color customization workflow', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      // Step 1: 初期状態を確認
      const initialState = repository.get()
      expect(initialState.colors.brand.hue).toBe(198)

      // Step 2: プリセット適用
      const preset: ColorPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'For testing',
        brand: { hue: 300, saturation: 75, value: 70 },
        accent: { hue: 60, saturation: 85, value: 65 },
        foundation: { hue: 15, saturation: 10, value: 90 },
      }
      applyColorPreset(preset, repository)

      // Step 3: 各色をカスタマイズ
      updateBrandColor({ hue: 45, saturation: 90, value: 75 }, repository)
      updateAccentColor({ hue: 180, saturation: 60, value: 50 }, repository)
      updateFoundationColor({ hue: 10, saturation: 5, value: 98 }, repository)

      // Step 4: 最終状態を確認
      const finalState = repository.get()
      expect(finalState.colors.brand).toEqual({ hue: 45, saturation: 90, value: 75 })
      expect(finalState.colors.accent).toEqual({ hue: 180, saturation: 60, value: 50 })
      expect(finalState.colors.foundation).toEqual({ hue: 10, saturation: 5, value: 98 })

      // 4回の変更（プリセット + 3色）で4回の通知
      expect(callback).toHaveBeenCalledTimes(4)
    })
  })
})

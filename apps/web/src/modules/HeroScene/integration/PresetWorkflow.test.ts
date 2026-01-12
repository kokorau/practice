/**
 * PresetWorkflow Integration Tests
 *
 * プリセット適用→カスタマイズ→エクスポート→再適用の統合テスト
 * HeroViewRepository + Preset UseCaseを組み合わせたワークフローを検証
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHeroViewInMemoryRepository } from '../Infra/HeroViewInMemoryRepository'
import { applyPreset } from '../usecase/Preset/applyPreset'
import { createPreset, exportPreset } from '../usecase/Preset/exportPreset'
import { updateBrandColor } from '../usecase/Color/updateBrandColor'
import { updateAccentColor } from '../usecase/Color/updateAccentColor'
import { addLayer } from '../usecase/Layer/addLayer'
import type { HeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type { HeroViewConfig, SurfaceLayerNodeConfig } from '../Domain/HeroViewConfig'
import type { HeroViewPreset } from '../Domain/HeroViewPreset'
import type { PresetExportPort } from '../usecase/Preset/PresetExportPort'

describe('PresetWorkflow Integration', () => {
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

  const createPresetConfig = (): HeroViewConfig => ({
    viewport: { width: 1920, height: 1080 },
    colors: {
      background: { primary: 'F5', secondary: 'auto' },
      mask: { primary: 'A', secondary: 'auto' },
      semanticContext: 'sectionTint',
      brand: { hue: 100, saturation: 50, value: 50 },
      accent: { hue: 200, saturation: 60, value: 70 },
      foundation: { hue: 10, saturation: 5, value: 95 },
    },
    layers: [
      {
        type: 'base',
        id: 'base',
        name: 'Background',
        visible: true,
        surface: { type: 'stripe', width1: 20, width2: 20, angle: 45 },
        processors: [],
      },
      {
        type: 'surface',
        id: 'preset-surface',
        name: 'Preset Surface',
        visible: true,
        surface: { type: 'grid', lineWidth: 2, cellSize: 30 },
        processors: [],
      },
    ],
    foreground: { elements: [] },
  })

  const createSurfaceLayer = (id: string): SurfaceLayerNodeConfig => ({
    type: 'surface',
    id,
    name: 'Custom Surface',
    visible: true,
    surface: { type: 'polkaDot', dotRadius: 10, spacing: 40, rowOffset: 0.5 },
    processors: [],
  })

  beforeEach(() => {
    repository = createHeroViewInMemoryRepository(createTestConfig())
  })

  describe('プリセット適用 → カスタマイズ → エクスポート → 再適用', () => {
    it('should support complete preset workflow', () => {
      const callback = vi.fn()
      repository.subscribe(callback)

      // Step 1: プリセットを適用
      const preset: HeroViewPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        config: createPresetConfig(),
        colorPreset: {
          brand: { hue: 250, saturation: 80, value: 70 },
          accent: { hue: 350, saturation: 90, value: 80 },
          foundation: { hue: 20, saturation: 10, value: 98 },
        },
      }

      applyPreset(preset, repository)

      const afterPreset = repository.get()
      expect(afterPreset.viewport.width).toBe(1920)
      expect(afterPreset.colors.brand).toEqual({ hue: 250, saturation: 80, value: 70 })
      expect(afterPreset.layers).toHaveLength(2)

      // Step 2: カスタマイズ
      updateBrandColor({ hue: 120 }, repository)
      updateAccentColor({ saturation: 50 }, repository)
      addLayer(createSurfaceLayer('custom-layer'), repository)

      const afterCustomization = repository.get()
      expect(afterCustomization.colors.brand.hue).toBe(120)
      expect(afterCustomization.colors.accent.saturation).toBe(50)
      expect(afterCustomization.layers).toHaveLength(3)

      // Step 3: エクスポート
      const exportedPreset = createPreset(repository, {
        id: 'exported-preset',
        name: 'My Custom Preset',
      })

      expect(exportedPreset.id).toBe('exported-preset')
      expect(exportedPreset.name).toBe('My Custom Preset')
      expect(exportedPreset.config.colors.brand.hue).toBe(120)
      expect(exportedPreset.config.layers).toHaveLength(3)
      expect(exportedPreset.colorPreset).toEqual({
        brand: { hue: 120, saturation: 80, value: 70 },
        accent: { hue: 350, saturation: 50, value: 80 },
        foundation: { hue: 20, saturation: 10, value: 98 },
      })

      // Step 4: 新しいリポジトリに再適用
      const newRepository = createHeroViewInMemoryRepository(createTestConfig())
      applyPreset(exportedPreset, newRepository)

      const reappliedConfig = newRepository.get()
      expect(reappliedConfig.colors.brand.hue).toBe(120)
      expect(reappliedConfig.colors.accent.saturation).toBe(50)
      expect(reappliedConfig.layers).toHaveLength(3)

      // 5回の変更（プリセット:set + プリセット:colorPreset + brand + accent + レイヤー追加）
      expect(callback).toHaveBeenCalledTimes(5)
    })
  })

  describe('exportPreset with PresetExportPort', () => {
    it('should call export port with preset data', () => {
      const mockExportPort: PresetExportPort = {
        downloadAsJson: vi.fn(),
      }

      updateBrandColor({ hue: 200 }, repository)

      const exported = exportPreset(repository, mockExportPort, {
        id: 'export-test',
        name: 'Export Test Preset',
      })

      expect(mockExportPort.downloadAsJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'export-test',
          name: 'Export Test Preset',
          config: expect.objectContaining({
            colors: expect.objectContaining({
              brand: expect.objectContaining({ hue: 200 }),
            }),
          }),
        })
      )

      expect(exported.config.colors.brand.hue).toBe(200)
    })
  })

  describe('プリセット適用時の設定上書き検証', () => {
    it('should completely replace config when applying preset', () => {
      // カスタマイズを行う
      addLayer(createSurfaceLayer('custom-1'), repository)
      addLayer(createSurfaceLayer('custom-2'), repository)
      updateBrandColor({ hue: 999 }, repository)

      expect(repository.get().layers).toHaveLength(3)

      // プリセットを適用すると完全に上書きされる
      const preset: HeroViewPreset = {
        id: 'overwrite-test',
        name: 'Overwrite Test',
        config: createPresetConfig(),
      }

      applyPreset(preset, repository)

      const afterPreset = repository.get()
      expect(afterPreset.layers).toHaveLength(2) // プリセットのレイヤー数
      expect(afterPreset.colors.brand.hue).toBe(100) // プリセットの色
    })

    it('should apply colorPreset over config colors', () => {
      const preset: HeroViewPreset = {
        id: 'color-override',
        name: 'Color Override Test',
        config: createPresetConfig(), // brand.hue = 100
        colorPreset: {
          brand: { hue: 300, saturation: 90, value: 80 }, // これが優先される
          accent: { hue: 50, saturation: 70, value: 60 },
          foundation: { hue: 0, saturation: 0, value: 100 },
        },
      }

      applyPreset(preset, repository)

      const config = repository.get()
      expect(config.colors.brand).toEqual({ hue: 300, saturation: 90, value: 80 })
      expect(config.colors.accent).toEqual({ hue: 50, saturation: 70, value: 60 })
    })

    it('should use config colors when colorPreset is not provided', () => {
      const preset: HeroViewPreset = {
        id: 'no-color-preset',
        name: 'No Color Preset',
        config: createPresetConfig(), // brand.hue = 100
        // colorPreset is not provided
      }

      applyPreset(preset, repository)

      const config = repository.get()
      expect(config.colors.brand.hue).toBe(100) // configの値
    })
  })

  describe('createPreset のオプション検証', () => {
    it('should generate default id and name when options not provided', () => {
      const preset = createPreset(repository)

      expect(preset.id).toMatch(/^custom-\d+$/)
      expect(preset.name).toBe('Custom Preset')
    })

    it('should use provided id and name', () => {
      const preset = createPreset(repository, {
        id: 'my-custom-id',
        name: 'My Custom Name',
      })

      expect(preset.id).toBe('my-custom-id')
      expect(preset.name).toBe('My Custom Name')
    })

    it('should capture current repository state in preset', () => {
      // リポジトリを変更
      updateBrandColor({ hue: 42, saturation: 42, value: 42 }, repository)
      addLayer(createSurfaceLayer('test-layer'), repository)

      const preset = createPreset(repository)

      expect(preset.config.colors.brand).toEqual({ hue: 42, saturation: 42, value: 42 })
      expect(preset.config.layers).toHaveLength(2)
      expect(preset.colorPreset).toEqual({
        brand: { hue: 42, saturation: 42, value: 42 },
        accent: { hue: 30, saturation: 80, value: 60 },
        foundation: { hue: 0, saturation: 0, value: 97 },
      })
    })
  })

  describe('複数プリセットの切り替え', () => {
    it('should allow switching between presets', () => {
      const preset1: HeroViewPreset = {
        id: 'preset-1',
        name: 'Preset 1',
        config: {
          ...createPresetConfig(),
          viewport: { width: 800, height: 600 },
        },
        colorPreset: {
          brand: { hue: 100, saturation: 100, value: 100 },
          accent: { hue: 100, saturation: 100, value: 100 },
          foundation: { hue: 100, saturation: 100, value: 100 },
        },
      }

      const preset2: HeroViewPreset = {
        id: 'preset-2',
        name: 'Preset 2',
        config: {
          ...createPresetConfig(),
          viewport: { width: 1600, height: 900 },
        },
        colorPreset: {
          brand: { hue: 200, saturation: 50, value: 50 },
          accent: { hue: 200, saturation: 50, value: 50 },
          foundation: { hue: 200, saturation: 50, value: 50 },
        },
      }

      applyPreset(preset1, repository)
      expect(repository.get().viewport.width).toBe(800)
      expect(repository.get().colors.brand.hue).toBe(100)

      applyPreset(preset2, repository)
      expect(repository.get().viewport.width).toBe(1600)
      expect(repository.get().colors.brand.hue).toBe(200)

      // 再度preset1に戻る
      applyPreset(preset1, repository)
      expect(repository.get().viewport.width).toBe(800)
      expect(repository.get().colors.brand.hue).toBe(100)
    })
  })
})

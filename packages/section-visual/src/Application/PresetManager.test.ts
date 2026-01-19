/**
 * PresetManager Tests
 *
 * Tests for the PresetManager class that handles preset operations
 * with caching and merge mode support.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PresetManager, createPresetManager, type MergeMode } from './PresetManager'
import type { HeroViewPresetRepository } from './ports/HeroViewPresetRepository'
import type { HeroViewRepository } from '../Domain/repository/HeroViewRepository'
import type { HeroViewPreset } from '../Domain/HeroViewPreset'
import type { HeroViewConfig, LayerNodeConfig } from '../Domain/HeroViewConfig'
import type { PresetExportPort } from '../usecase/Preset/PresetExportPort'

// Layer IDs for template layers
const BASE_LAYER_ID = 'base-layer'

// ============================================================
// Test Fixtures
// ============================================================

const createMockPreset = (id: string, name: string): HeroViewPreset => ({
  id,
  name,
  config: createMockHeroViewConfig([
    { type: 'base', id: BASE_LAYER_ID, name: 'Background', visible: true, surface: { id: 'solid', params: {} } },
  ]),
  colorPreset: {
    brand: { hue: 200, saturation: 60, value: 70 },
    accent: { hue: 30, saturation: 80, value: 60 },
    foundation: { hue: 0, saturation: 0, value: 97 },
  },
})

const createMockHeroViewConfig = (layers: LayerNodeConfig[]): HeroViewConfig => ({
  viewport: { width: 1280, height: 720 },
  colors: {
    background: { primary: 'B', secondary: 'auto' },
    mask: { primary: 'auto', secondary: 'auto' },
    semanticContext: 'canvas',
    brand: { hue: 200, saturation: 60, value: 70 },
    accent: { hue: 30, saturation: 80, value: 60 },
    foundation: { hue: 0, saturation: 0, value: 97 },
  },
  layers,
  foreground: { elements: [] },
})

const createMockPresetRepository = (presets: HeroViewPreset[]): HeroViewPresetRepository => ({
  findAll: vi.fn().mockResolvedValue(presets),
  findById: vi.fn().mockImplementation((id: string) => {
    const preset = presets.find(p => p.id === id)
    return Promise.resolve(preset ?? null)
  }),
})

const createMockHeroViewRepository = (config: HeroViewConfig): HeroViewRepository => ({
  get: vi.fn().mockReturnValue(config),
  set: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {}),
  findLayer: vi.fn(),
  updateColors: vi.fn(),
  updateViewport: vi.fn(),
  updateForeground: vi.fn(),
  updateLayer: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  reorderLayers: vi.fn(),
})

const createMockExportPort = (): PresetExportPort => ({
  downloadAsJson: vi.fn(),
})

// ============================================================
// Tests
// ============================================================

describe('PresetManager', () => {
  let presetManager: PresetManager
  let mockPresetRepository: HeroViewPresetRepository
  let mockHeroViewRepository: HeroViewRepository
  let mockExportPort: PresetExportPort
  let mockPresets: HeroViewPreset[]

  beforeEach(() => {
    mockPresets = [
      createMockPreset('preset-1', 'Preset 1'),
      createMockPreset('preset-2', 'Preset 2'),
    ]
    mockPresetRepository = createMockPresetRepository(mockPresets)
    mockHeroViewRepository = createMockHeroViewRepository(createMockHeroViewConfig([]))
    mockExportPort = createMockExportPort()

    presetManager = new PresetManager(
      mockPresetRepository,
      mockHeroViewRepository,
      mockExportPort
    )
  })

  describe('getPresets', () => {
    it('should load presets from repository', async () => {
      const presets = await presetManager.getPresets()

      expect(presets).toHaveLength(2)
      expect(presets[0].id).toBe('preset-1')
      expect(presets[1].id).toBe('preset-2')
      expect(mockPresetRepository.findAll).toHaveBeenCalled()
    })

    it('should cache presets after first load', async () => {
      await presetManager.getPresets()
      await presetManager.getPresets()

      // Should only call repository once due to caching
      expect(mockPresetRepository.findAll).toHaveBeenCalledTimes(1)
    })

    it('should bypass cache when useCache is false', async () => {
      await presetManager.getPresets()
      await presetManager.getPresets(false)

      expect(mockPresetRepository.findAll).toHaveBeenCalledTimes(2)
    })

    it('should report cached state correctly', async () => {
      expect(presetManager.isCached()).toBe(false)

      await presetManager.getPresets()
      expect(presetManager.isCached()).toBe(true)
    })
  })

  describe('findById', () => {
    it('should find preset by ID', async () => {
      const preset = await presetManager.findById('preset-1')

      expect(preset).not.toBeNull()
      expect(preset?.id).toBe('preset-1')
    })

    it('should return null for non-existent preset', async () => {
      const preset = await presetManager.findById('non-existent')

      expect(preset).toBeNull()
    })

    it('should use cache if available', async () => {
      // First load presets to populate cache
      await presetManager.getPresets()

      // Find by ID should use cache
      const preset = await presetManager.findById('preset-1')

      expect(preset?.id).toBe('preset-1')
      // findById should not be called since cache has the preset
      expect(mockPresetRepository.findById).not.toHaveBeenCalled()
    })
  })

  describe('applyPreset - replace mode', () => {
    it('should apply preset with complete replacement', async () => {
      const preset = await presetManager.applyPreset('preset-1', 'replace')

      expect(preset).not.toBeNull()
      expect(mockHeroViewRepository.set).toHaveBeenCalledWith(mockPresets[0].config)
    })

    it('should return preset with colorPreset for caller to apply', async () => {
      const preset = await presetManager.applyPreset('preset-1', 'replace')

      // colorPreset is no longer written to config.colors
      // It's returned to the caller for UI state updates
      expect(preset?.colorPreset).toEqual(mockPresets[0].colorPreset)
      // updateColors should NOT be called for brand/accent/foundation
      expect(mockHeroViewRepository.updateColors).not.toHaveBeenCalled()
    })

    it('should return null for non-existent preset', async () => {
      const preset = await presetManager.applyPreset('non-existent')

      expect(preset).toBeNull()
      expect(mockHeroViewRepository.set).not.toHaveBeenCalled()
    })

    it('should default to replace mode', async () => {
      await presetManager.applyPreset('preset-1')

      expect(mockHeroViewRepository.set).toHaveBeenCalledWith(mockPresets[0].config)
    })
  })

  describe('applyPreset - merge mode', () => {
    it('should preserve custom layers when merging', async () => {
      // Set up current config with custom layer
      const customLayer: LayerNodeConfig = {
        type: 'surface',
        id: 'custom-layer-1',
        name: 'Custom Layer',
        visible: true,
        surface: { id: 'stripe', params: { width1: 20, width2: 20, angle: 45 } },
      }
      const currentConfig = createMockHeroViewConfig([
        { type: 'base', id: BASE_LAYER_ID, name: 'Background', visible: true, surface: { id: 'solid', params: {} } },
        customLayer,
      ])
      ;(mockHeroViewRepository.get as any).mockReturnValue(currentConfig)

      await presetManager.applyPreset('preset-1', 'merge')

      // Should merge: preset template layers + custom layers
      const setCall = (mockHeroViewRepository.set as any).mock.calls[0][0] as HeroViewConfig

      // Should have preset's base layer
      expect(setCall.layers.some((l: LayerNodeConfig) => l.id === BASE_LAYER_ID)).toBe(true)
      // Should preserve custom layer
      expect(setCall.layers.some((l: LayerNodeConfig) => l.id === 'custom-layer-1')).toBe(true)
    })

    it('should replace template layers from preset', async () => {
      // Set up current config
      const currentConfig = createMockHeroViewConfig([
        { type: 'base', id: BASE_LAYER_ID, name: 'Old Background', visible: true, surface: { id: 'stripe', params: { width1: 10, width2: 10, angle: 0 } } },
      ])
      ;(mockHeroViewRepository.get as any).mockReturnValue(currentConfig)

      await presetManager.applyPreset('preset-1', 'merge')

      const setCall = (mockHeroViewRepository.set as any).mock.calls[0][0] as HeroViewConfig
      const baseLayer = setCall.layers.find((l: LayerNodeConfig) => l.id === BASE_LAYER_ID)

      // Base layer should come from preset (solid, not stripe)
      expect(baseLayer?.surface?.id).toBe('solid')
    })
  })

  describe('exportAsPreset', () => {
    it('should create preset from current config', () => {
      const preset = presetManager.exportAsPreset({ name: 'My Preset' })

      expect(preset.name).toBe('My Preset')
      expect(mockExportPort.downloadAsJson).toHaveBeenCalled()
    })

    it('should download preset as JSON', () => {
      presetManager.exportAsPreset()

      expect(mockExportPort.downloadAsJson).toHaveBeenCalled()
    })
  })

  describe('createPreset', () => {
    it('should create preset without downloading', () => {
      const preset = presetManager.createPreset({ name: 'My Preset' })

      expect(preset.name).toBe('My Preset')
      expect(mockExportPort.downloadAsJson).not.toHaveBeenCalled()
    })
  })

  describe('clearCache', () => {
    it('should clear the preset cache', async () => {
      await presetManager.getPresets()
      expect(presetManager.isCached()).toBe(true)

      presetManager.clearCache()
      expect(presetManager.isCached()).toBe(false)
    })

    it('should force reload on next getPresets call', async () => {
      await presetManager.getPresets()
      presetManager.clearCache()
      await presetManager.getPresets()

      expect(mockPresetRepository.findAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('createPresetManager factory', () => {
    it('should create PresetManager instance', () => {
      const manager = createPresetManager({
        presetRepository: mockPresetRepository,
        heroViewRepository: mockHeroViewRepository,
        presetExportPort: mockExportPort,
      })

      expect(manager).toBeInstanceOf(PresetManager)
    })

    it('should work without export port', () => {
      const manager = createPresetManager({
        presetRepository: mockPresetRepository,
        heroViewRepository: mockHeroViewRepository,
      })

      // Should not throw when creating preset
      const preset = manager.createPreset({ name: 'Test' })
      expect(preset.name).toBe('Test')
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { createPreset, exportPreset } from './exportPreset'
import { createHeroViewInMemoryRepository } from '../../Infra/HeroViewInMemoryRepository'
import type { HeroViewConfig } from '../../Domain/HeroViewConfig'
import type { PresetExportPort } from './PresetExportPort'
import type { PresetColorConfig } from '../../Domain/HeroViewPreset'

describe('createPreset', () => {
  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      semanticContext: 'canvas',
    },
    layers: [
      {
        type: 'group',
        id: 'test-group',
        name: 'Test Group',
        visible: true,
        children: [],
      },
    ],
    foreground: { elements: [] },
  })

  const testColorPreset: PresetColorConfig = {
    brand: { hue: 198, saturation: 70, value: 65 },
    accent: { hue: 30, saturation: 80, value: 60 },
    foundation: { hue: 0, saturation: 0, value: 97 },
  }

  it('should create preset from current config', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const preset = createPreset(repository)

    expect(preset.id).toMatch(/^custom-\d+$/)
    expect(preset.name).toBe('Custom Preset')
    expect(preset.config.viewport.width).toBe(1280)
    expect(preset.config.layers).toHaveLength(1)
  })

  it('should include colorPreset when provided in options', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const preset = createPreset(repository, { colorPreset: testColorPreset })

    expect(preset.colorPreset).toEqual(testColorPreset)
  })

  it('should have undefined colorPreset when not provided', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const preset = createPreset(repository)

    expect(preset.colorPreset).toBeUndefined()
  })

  it('should use custom id when provided', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const preset = createPreset(repository, { id: 'my-custom-id' })

    expect(preset.id).toBe('my-custom-id')
  })

  it('should use custom name when provided', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())

    const preset = createPreset(repository, { name: 'My Custom Preset' })

    expect(preset.name).toBe('My Custom Preset')
  })
})

describe('exportPreset', () => {
  const createTestConfig = (): HeroViewConfig => ({
    viewport: { width: 1280, height: 720 },
    colors: {
      semanticContext: 'canvas',
    },
    layers: [],
    foreground: { elements: [] },
  })

  it('should create preset and call exportPort.downloadAsJson', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const mockExportPort: PresetExportPort = {
      downloadAsJson: vi.fn(),
    }

    const preset = exportPreset(repository, mockExportPort)

    expect(mockExportPort.downloadAsJson).toHaveBeenCalledOnce()
    expect(mockExportPort.downloadAsJson).toHaveBeenCalledWith(preset)
    expect(preset.config.viewport.width).toBe(1280)
  })

  it('should pass options to createPreset', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const mockExportPort: PresetExportPort = {
      downloadAsJson: vi.fn(),
    }

    const preset = exportPreset(repository, mockExportPort, {
      id: 'exported-preset',
      name: 'Exported Preset',
    })

    expect(preset.id).toBe('exported-preset')
    expect(preset.name).toBe('Exported Preset')
  })

  it('should return the created preset', () => {
    const repository = createHeroViewInMemoryRepository(createTestConfig())
    const mockExportPort: PresetExportPort = {
      downloadAsJson: vi.fn(),
    }

    const preset = exportPreset(repository, mockExportPort)

    expect(preset).toBeDefined()
    expect(preset.id).toMatch(/^custom-\d+$/)
    // colorPreset is undefined when not provided
    expect(preset.colorPreset).toBeUndefined()
  })
})

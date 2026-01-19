/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { usePresetActions, type ColorStateRefs, type ColorPresetColors } from './usePresetActions'
import type { HeroViewConfig, PresetColorConfig } from '@practice/section-visual'

describe('usePresetActions', () => {
  const createColorState = (): ColorStateRefs => ({
    hue: ref(0),
    saturation: ref(0),
    value: ref(0),
    accentHue: ref(0),
    accentSaturation: ref(0),
    accentValue: ref(0),
    foundationHue: ref(0),
    foundationSaturation: ref(0),
    foundationValue: ref(0),
  })

  const createMockConfig = (): HeroViewConfig => ({
    viewport: { width: 1920, height: 1080 },
    colors: {
      background: { primary: 'B', secondary: 'auto' },
      mask: { primary: 'auto', secondary: 'auto' },
      semanticContext: 'canvas',
      brand: { hue: 0, saturation: 0, value: 0 },
      accent: { hue: 0, saturation: 0, value: 0 },
      foundation: { hue: 0, saturation: 0, value: 0 },
    },
    layers: [],
    foreground: { elements: [] },
  })

  describe('applyColorPreset', () => {
    it('should apply brand, accent, and foundation colors', () => {
      const colorState = createColorState()
      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const applyPreset = vi.fn()

      const { applyColorPreset } = usePresetActions({
        colorState,
        toHeroViewConfig,
        applyPreset,
      })

      const preset: ColorPresetColors = {
        brand: { hue: 200, saturation: 70, value: 65 },
        accent: { hue: 30, saturation: 80, value: 60 },
        foundation: { hue: 0, saturation: 5, value: 95 },
      }

      applyColorPreset(preset)

      expect(colorState.hue.value).toBe(200)
      expect(colorState.saturation.value).toBe(70)
      expect(colorState.value.value).toBe(65)
      expect(colorState.accentHue.value).toBe(30)
      expect(colorState.accentSaturation.value).toBe(80)
      expect(colorState.accentValue.value).toBe(60)
      expect(colorState.foundationHue.value).toBe(0)
      expect(colorState.foundationSaturation.value).toBe(5)
      expect(colorState.foundationValue.value).toBe(95)
    })
  })

  describe('applyLayoutPreset', () => {
    it('should call applyPreset with presetId', async () => {
      const colorState = createColorState()
      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const applyPreset = vi.fn().mockResolvedValue(null)

      const { applyLayoutPreset } = usePresetActions({
        colorState,
        toHeroViewConfig,
        applyPreset,
      })

      await applyLayoutPreset('test-preset-id')

      expect(applyPreset).toHaveBeenCalledWith('test-preset-id')
    })

    it('should apply color preset if returned by applyPreset', async () => {
      const colorState = createColorState()
      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const colorPreset: PresetColorConfig = {
        brand: { hue: 180, saturation: 60, value: 50 },
        accent: { hue: 45, saturation: 90, value: 70 },
        foundation: { hue: 10, saturation: 10, value: 90 },
      }
      const applyPreset = vi.fn().mockResolvedValue(colorPreset)

      const { applyLayoutPreset } = usePresetActions({
        colorState,
        toHeroViewConfig,
        applyPreset,
      })

      await applyLayoutPreset('test-preset-id')

      expect(colorState.hue.value).toBe(180)
      expect(colorState.saturation.value).toBe(60)
      expect(colorState.value.value).toBe(50)
      expect(colorState.accentHue.value).toBe(45)
      expect(colorState.accentSaturation.value).toBe(90)
      expect(colorState.accentValue.value).toBe(70)
      expect(colorState.foundationHue.value).toBe(10)
      expect(colorState.foundationSaturation.value).toBe(10)
      expect(colorState.foundationValue.value).toBe(90)
    })

    it('should not modify color state if applyPreset returns null', async () => {
      const colorState = createColorState()
      colorState.hue.value = 100
      colorState.saturation.value = 50
      colorState.value.value = 75

      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const applyPreset = vi.fn().mockResolvedValue(null)

      const { applyLayoutPreset } = usePresetActions({
        colorState,
        toHeroViewConfig,
        applyPreset,
      })

      await applyLayoutPreset('test-preset-id')

      expect(colorState.hue.value).toBe(100)
      expect(colorState.saturation.value).toBe(50)
      expect(colorState.value.value).toBe(75)
    })
  })

  describe('exportPreset', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>
    let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => 'blob:test-url')
      mockRevokeObjectURL = vi.fn()
      mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      }

      vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      })
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as Node)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as unknown as Node)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should create and download a JSON file with current config and colors', () => {
      const colorState = createColorState()
      colorState.hue.value = 200
      colorState.saturation.value = 70
      colorState.value.value = 65
      colorState.accentHue.value = 30
      colorState.accentSaturation.value = 80
      colorState.accentValue.value = 60
      colorState.foundationHue.value = 0
      colorState.foundationSaturation.value = 5
      colorState.foundationValue.value = 95

      const mockConfig = createMockConfig()
      const toHeroViewConfig = vi.fn(() => mockConfig)
      const applyPreset = vi.fn()

      const { exportPreset } = usePresetActions({
        colorState,
        toHeroViewConfig,
        applyPreset,
      })

      exportPreset()

      expect(toHeroViewConfig).toHaveBeenCalled()
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')

      const blobArg = mockCreateObjectURL.mock.calls[0]?.[0]
      expect(blobArg).toBeInstanceOf(Blob)
      expect(blobArg.type).toBe('application/json')
    })

    it('should include color preset in exported data', async () => {
      const colorState = createColorState()
      colorState.hue.value = 200
      colorState.saturation.value = 70
      colorState.value.value = 65
      colorState.accentHue.value = 30
      colorState.accentSaturation.value = 80
      colorState.accentValue.value = 60
      colorState.foundationHue.value = 0
      colorState.foundationSaturation.value = 5
      colorState.foundationValue.value = 95

      const mockConfig = createMockConfig()
      const toHeroViewConfig = vi.fn(() => mockConfig)
      const applyPreset = vi.fn()

      const { exportPreset } = usePresetActions({
        colorState,
        toHeroViewConfig,
        applyPreset,
      })

      exportPreset()

      const blobArg = mockCreateObjectURL.mock.calls[0]?.[0] as Blob
      const text = await blobArg.text()
      const parsed = JSON.parse(text)

      expect(parsed.colorPreset).toEqual({
        brand: { hue: 200, saturation: 70, value: 65 },
        accent: { hue: 30, saturation: 80, value: 60 },
        foundation: { hue: 0, saturation: 5, value: 95 },
      })
    })
  })
})

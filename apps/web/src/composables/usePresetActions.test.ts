/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { usePresetActions, type ColorStateRefs, type ColorPresetColors } from './usePresetActions'
import type { HeroViewConfig, PresetColorConfig } from '@practice/section-visual'

describe('usePresetActions', () => {
  const createColors = (): ColorStateRefs => ({
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
      const colors = createColors()
      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const applyPreset = vi.fn()

      const { applyColorPreset } = usePresetActions({
        colors,
        toHeroViewConfig,
        applyPreset,
      })

      const preset: ColorPresetColors = {
        brand: { hue: 200, saturation: 70, value: 65 },
        accent: { hue: 30, saturation: 80, value: 60 },
        foundation: { hue: 0, saturation: 5, value: 95 },
      }

      applyColorPreset(preset)

      expect(colors.hue.value).toBe(200)
      expect(colors.saturation.value).toBe(70)
      expect(colors.value.value).toBe(65)
      expect(colors.accentHue.value).toBe(30)
      expect(colors.accentSaturation.value).toBe(80)
      expect(colors.accentValue.value).toBe(60)
      expect(colors.foundationHue.value).toBe(0)
      expect(colors.foundationSaturation.value).toBe(5)
      expect(colors.foundationValue.value).toBe(95)
    })
  })

  describe('applyLayoutPreset', () => {
    it('should call applyPreset with presetId', async () => {
      const colors = createColors()
      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const applyPreset = vi.fn().mockResolvedValue(null)

      const { applyLayoutPreset } = usePresetActions({
        colors,
        toHeroViewConfig,
        applyPreset,
      })

      await applyLayoutPreset('test-preset-id')

      expect(applyPreset).toHaveBeenCalledWith('test-preset-id')
    })

    it('should apply color preset if returned by applyPreset', async () => {
      const colors = createColors()
      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const colorPreset: PresetColorConfig = {
        brand: { hue: 180, saturation: 60, value: 50 },
        accent: { hue: 45, saturation: 90, value: 70 },
        foundation: { hue: 10, saturation: 10, value: 90 },
      }
      const applyPreset = vi.fn().mockResolvedValue(colorPreset)

      const { applyLayoutPreset } = usePresetActions({
        colors,
        toHeroViewConfig,
        applyPreset,
      })

      await applyLayoutPreset('test-preset-id')

      expect(colors.hue.value).toBe(180)
      expect(colors.saturation.value).toBe(60)
      expect(colors.value.value).toBe(50)
      expect(colors.accentHue.value).toBe(45)
      expect(colors.accentSaturation.value).toBe(90)
      expect(colors.accentValue.value).toBe(70)
      expect(colors.foundationHue.value).toBe(10)
      expect(colors.foundationSaturation.value).toBe(10)
      expect(colors.foundationValue.value).toBe(90)
    })

    it('should not modify color state if applyPreset returns null', async () => {
      const colors = createColors()
      colors.hue.value = 100
      colors.saturation.value = 50
      colors.value.value = 75

      const toHeroViewConfig = vi.fn(() => createMockConfig())
      const applyPreset = vi.fn().mockResolvedValue(null)

      const { applyLayoutPreset } = usePresetActions({
        colors,
        toHeroViewConfig,
        applyPreset,
      })

      await applyLayoutPreset('test-preset-id')

      expect(colors.hue.value).toBe(100)
      expect(colors.saturation.value).toBe(50)
      expect(colors.value.value).toBe(75)
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
      const colors = createColors()
      colors.hue.value = 200
      colors.saturation.value = 70
      colors.value.value = 65
      colors.accentHue.value = 30
      colors.accentSaturation.value = 80
      colors.accentValue.value = 60
      colors.foundationHue.value = 0
      colors.foundationSaturation.value = 5
      colors.foundationValue.value = 95

      const mockConfig = createMockConfig()
      const toHeroViewConfig = vi.fn(() => mockConfig)
      const applyPreset = vi.fn()

      const { exportPreset } = usePresetActions({
        colors,
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
      const colors = createColors()
      colors.hue.value = 200
      colors.saturation.value = 70
      colors.value.value = 65
      colors.accentHue.value = 30
      colors.accentSaturation.value = 80
      colors.accentValue.value = 60
      colors.foundationHue.value = 0
      colors.foundationSaturation.value = 5
      colors.foundationValue.value = 95

      const mockConfig = createMockConfig()
      const toHeroViewConfig = vi.fn(() => mockConfig)
      const applyPreset = vi.fn()

      const { exportPreset } = usePresetActions({
        colors,
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

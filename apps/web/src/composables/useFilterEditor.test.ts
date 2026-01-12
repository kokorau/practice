import { describe, it, expect, vi } from 'vitest'
import { ref, computed } from 'vue'
import { useFilterEditor } from './useFilterEditor'
import type { LayerFilterConfig } from '../modules/HeroScene'

// ============================================================
// Test Helpers
// ============================================================

const createMockFilterConfig = (): LayerFilterConfig => ({
  vignette: {
    shape: 'ellipse',
    enabled: false,
    intensity: 0.5,
    softness: 0.5,
    color: [0, 0, 0, 1],
    radius: 0.8,
    centerX: 0.5,
    centerY: 0.5,
    aspectRatio: 1,
  },
  chromaticAberration: { enabled: false, intensity: 0.3 },
  dotHalftone: { enabled: false, dotSize: 4, spacing: 8, angle: 45 },
  lineHalftone: { enabled: false, lineWidth: 2, spacing: 6, angle: 0 },
  blur: { enabled: false, radius: 8 },
  blockMosaic: { enabled: false, blockSize: 8 },
})

const createMockOptions = () => {
  const selectedFilterLayerId = ref<string | null>('layer-1')
  const filterConfigs = ref(new Map<string, LayerFilterConfig>([
    ['layer-1', createMockFilterConfig()],
  ]))

  const selectedLayerFilters = computed(() => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return null
    return filterConfigs.value.get(layerId) ?? null
  })

  const getFilterType = vi.fn((layerId: string) => {
    const config = filterConfigs.value.get(layerId)
    if (!config) return 'void' as const
    if (config.vignette.enabled) return 'vignette' as const
    if (config.chromaticAberration.enabled) return 'chromaticAberration' as const
    if (config.dotHalftone.enabled) return 'dotHalftone' as const
    if (config.lineHalftone.enabled) return 'lineHalftone' as const
    if (config.blur.enabled) return 'blur' as const
    if (config.blockMosaic.enabled) return 'blockMosaic' as const
    return 'void' as const
  })

  const selectFilterType = vi.fn((layerId: string, type: string) => {
    const config = filterConfigs.value.get(layerId) ?? createMockFilterConfig()
    filterConfigs.value.set(layerId, {
      ...config,
      vignette: { ...config.vignette, enabled: type === 'vignette' },
      chromaticAberration: { ...config.chromaticAberration, enabled: type === 'chromaticAberration' },
      dotHalftone: { ...config.dotHalftone, enabled: type === 'dotHalftone' },
      lineHalftone: { ...config.lineHalftone, enabled: type === 'lineHalftone' },
      blur: { ...config.blur, enabled: type === 'blur' },
      blockMosaic: { ...config.blockMosaic, enabled: type === 'blockMosaic' },
    })
  })

  const updateVignetteParams = vi.fn((layerId: string, params: Record<string, unknown>) => {
    const config = filterConfigs.value.get(layerId)
    if (!config) return
    filterConfigs.value.set(layerId, {
      ...config,
      vignette: { ...config.vignette, ...params },
    })
  })

  const updateChromaticAberrationParams = vi.fn((layerId: string, params: Record<string, unknown>) => {
    const config = filterConfigs.value.get(layerId)
    if (!config) return
    filterConfigs.value.set(layerId, {
      ...config,
      chromaticAberration: { ...config.chromaticAberration, ...params },
    })
  })

  const updateDotHalftoneParams = vi.fn((layerId: string, params: Record<string, unknown>) => {
    const config = filterConfigs.value.get(layerId)
    if (!config) return
    filterConfigs.value.set(layerId, {
      ...config,
      dotHalftone: { ...config.dotHalftone, ...params },
    })
  })

  const updateLineHalftoneParams = vi.fn((layerId: string, params: Record<string, unknown>) => {
    const config = filterConfigs.value.get(layerId)
    if (!config) return
    filterConfigs.value.set(layerId, {
      ...config,
      lineHalftone: { ...config.lineHalftone, ...params },
    })
  })

  const updateBlurParams = vi.fn((layerId: string, params: Record<string, unknown>) => {
    const config = filterConfigs.value.get(layerId)
    if (!config) return
    filterConfigs.value.set(layerId, {
      ...config,
      blur: { ...config.blur, ...params },
    })
  })

  const updateBlockMosaicParams = vi.fn((layerId: string, params: Record<string, unknown>) => {
    const config = filterConfigs.value.get(layerId)
    if (!config) return
    filterConfigs.value.set(layerId, {
      ...config,
      blockMosaic: { ...config.blockMosaic, ...params },
    })
  })

  return {
    selectedFilterLayerId,
    filterConfigs,
    selectedLayerFilters,
    getFilterType,
    selectFilterType,
    updateVignetteParams,
    updateChromaticAberrationParams,
    updateDotHalftoneParams,
    updateLineHalftoneParams,
    updateBlurParams,
    updateBlockMosaicParams,
  }
}

// ============================================================
// Tests
// ============================================================

describe('useFilterEditor', () => {
  describe('selectedFilterType', () => {
    it('returns void when no layer is selected', () => {
      const options = createMockOptions()
      options.selectedFilterLayerId.value = null

      const { selectedFilterType } = useFilterEditor(options)

      expect(selectedFilterType.value).toBe('void')
    })

    it('returns current filter type from getFilterType', () => {
      const options = createMockOptions()
      options.getFilterType.mockReturnValue('vignette')

      const { selectedFilterType } = useFilterEditor(options)

      expect(selectedFilterType.value).toBe('vignette')
      expect(options.getFilterType).toHaveBeenCalledWith('layer-1')
    })

    it('calls selectFilterType when setting filter type', () => {
      const options = createMockOptions()

      const { selectedFilterType } = useFilterEditor(options)
      selectedFilterType.value = 'chromaticAberration'

      expect(options.selectFilterType).toHaveBeenCalledWith('layer-1', 'chromaticAberration')
    })

    it('does not call selectFilterType when no layer is selected', () => {
      const options = createMockOptions()
      options.selectedFilterLayerId.value = null

      const { selectedFilterType } = useFilterEditor(options)
      selectedFilterType.value = 'vignette'

      expect(options.selectFilterType).not.toHaveBeenCalled()
    })
  })

  describe('currentVignetteConfig', () => {
    it('returns empty object when no layer is selected', () => {
      const options = createMockOptions()
      options.selectedFilterLayerId.value = null

      const { currentVignetteConfig } = useFilterEditor(options)

      expect(currentVignetteConfig.value).toEqual({})
    })

    it('returns vignette config from selected layer', () => {
      const options = createMockOptions()

      const { currentVignetteConfig } = useFilterEditor(options)

      expect(currentVignetteConfig.value).toEqual({
        shape: 'ellipse',
        enabled: false,
        intensity: 0.5,
        softness: 0.5,
        color: [0, 0, 0, 1],
        radius: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        aspectRatio: 1,
      })
    })

    it('calls updateVignetteParams when setting config', () => {
      const options = createMockOptions()

      const { currentVignetteConfig } = useFilterEditor(options)
      currentVignetteConfig.value = { intensity: 0.7 }

      expect(options.updateVignetteParams).toHaveBeenCalledWith('layer-1', { intensity: 0.7 })
    })
  })

  describe('currentChromaticConfig', () => {
    it('returns chromatic aberration config from selected layer', () => {
      const options = createMockOptions()

      const { currentChromaticConfig } = useFilterEditor(options)

      expect(currentChromaticConfig.value).toEqual({
        enabled: false,
        intensity: 0.3,
      })
    })

    it('calls updateChromaticAberrationParams when setting config', () => {
      const options = createMockOptions()

      const { currentChromaticConfig } = useFilterEditor(options)
      currentChromaticConfig.value = { intensity: 0.5 }

      expect(options.updateChromaticAberrationParams).toHaveBeenCalledWith('layer-1', { intensity: 0.5 })
    })
  })

  describe('currentDotHalftoneConfig', () => {
    it('returns dot halftone config from selected layer', () => {
      const options = createMockOptions()

      const { currentDotHalftoneConfig } = useFilterEditor(options)

      expect(currentDotHalftoneConfig.value).toEqual({
        enabled: false,
        dotSize: 4,
        spacing: 8,
        angle: 45,
      })
    })

    it('calls updateDotHalftoneParams when setting config', () => {
      const options = createMockOptions()

      const { currentDotHalftoneConfig } = useFilterEditor(options)
      currentDotHalftoneConfig.value = { dotSize: 6, angle: 30 }

      expect(options.updateDotHalftoneParams).toHaveBeenCalledWith('layer-1', { dotSize: 6, angle: 30 })
    })
  })

  describe('currentLineHalftoneConfig', () => {
    it('returns line halftone config from selected layer', () => {
      const options = createMockOptions()

      const { currentLineHalftoneConfig } = useFilterEditor(options)

      expect(currentLineHalftoneConfig.value).toEqual({
        enabled: false,
        lineWidth: 2,
        spacing: 6,
        angle: 0,
      })
    })

    it('calls updateLineHalftoneParams when setting config', () => {
      const options = createMockOptions()

      const { currentLineHalftoneConfig } = useFilterEditor(options)
      currentLineHalftoneConfig.value = { lineWidth: 3, spacing: 10 }

      expect(options.updateLineHalftoneParams).toHaveBeenCalledWith('layer-1', { lineWidth: 3, spacing: 10 })
    })
  })

  describe('layer selection changes', () => {
    it('updates configs when selected layer changes', () => {
      const options = createMockOptions()
      options.filterConfigs.value.set('layer-2', {
        vignette: {
          shape: 'ellipse',
          enabled: true,
          intensity: 0.9,
          softness: 0.3,
          color: [0, 0, 0, 1],
          radius: 0.5,
          centerX: 0.5,
          centerY: 0.5,
          aspectRatio: 1,
        },
        chromaticAberration: { enabled: false, intensity: 0.1 },
        dotHalftone: { enabled: false, dotSize: 2, spacing: 4, angle: 90 },
        lineHalftone: { enabled: false, lineWidth: 1, spacing: 3, angle: 45 },
        blur: { enabled: false, radius: 8 },
        blockMosaic: { enabled: false, blockSize: 8 },
      })

      const { currentVignetteConfig } = useFilterEditor(options)

      // Initial state
      expect(currentVignetteConfig.value.intensity).toBe(0.5)

      // Change selected layer
      options.selectedFilterLayerId.value = 'layer-2'

      expect(currentVignetteConfig.value.intensity).toBe(0.9)
    })
  })
})

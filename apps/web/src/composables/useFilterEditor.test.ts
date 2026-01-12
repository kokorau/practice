import { describe, it, expect } from 'vitest'
import { useFilterEditor } from './useFilterEditor'
import { useEffectManager } from './useEffectManager'

// ============================================================
// Tests
// ============================================================

describe('useFilterEditor', () => {
  describe('selectedFilterType', () => {
    it('returns void when no layer is selected', () => {
      const effectManager = useEffectManager()
      // Don't select any layer
      effectManager.selectedLayerId.value = null

      const { selectedFilterType } = useFilterEditor({ effectManager })

      expect(selectedFilterType.value).toBe('void')
    })

    it('returns current filter type based on enabled effect', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')
      effectManager.setEffectType('layer-1', 'vignette')

      const { selectedFilterType } = useFilterEditor({ effectManager })

      expect(selectedFilterType.value).toBe('vignette')
    })

    it('calls setEffectType when setting filter type', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { selectedFilterType } = useFilterEditor({ effectManager })
      selectedFilterType.value = 'chromaticAberration'

      // Verify the effect was set
      const config = effectManager.effects.value.get('layer-1')
      expect(config?.chromaticAberration.enabled).toBe(true)
      expect(config?.vignette.enabled).toBe(false)
    })

    it('does not call setEffectType when no layer is selected', () => {
      const effectManager = useEffectManager()
      effectManager.selectedLayerId.value = null

      const { selectedFilterType } = useFilterEditor({ effectManager })
      selectedFilterType.value = 'vignette'

      // No effect should be created since no layer is selected
      expect(effectManager.effects.value.size).toBe(0)
    })

    it('sets void filter type by passing null to setEffectType', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')
      effectManager.setEffectType('layer-1', 'vignette')

      const { selectedFilterType } = useFilterEditor({ effectManager })
      expect(selectedFilterType.value).toBe('vignette')

      selectedFilterType.value = 'void'

      // All effects should be disabled
      const config = effectManager.effects.value.get('layer-1')
      expect(config?.vignette.enabled).toBe(false)
      expect(config?.chromaticAberration.enabled).toBe(false)
    })
  })

  describe('currentVignetteConfig', () => {
    it('returns empty object when no layer is selected', () => {
      const effectManager = useEffectManager()
      effectManager.selectedLayerId.value = null

      const { currentVignetteConfig } = useFilterEditor({ effectManager })

      expect(currentVignetteConfig.value).toEqual({})
    })

    it('returns vignette config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentVignetteConfig } = useFilterEditor({ effectManager })

      // Should return the default vignette config (without 'enabled')
      expect(currentVignetteConfig.value).toHaveProperty('intensity')
      expect(currentVignetteConfig.value).toHaveProperty('radius')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentVignetteConfig } = useFilterEditor({ effectManager })
      currentVignetteConfig.value = { intensity: 0.7 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.vignette.intensity).toBe(0.7)
    })
  })

  describe('currentChromaticConfig', () => {
    it('returns chromatic aberration config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentChromaticConfig } = useFilterEditor({ effectManager })

      expect(currentChromaticConfig.value).toHaveProperty('intensity')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentChromaticConfig } = useFilterEditor({ effectManager })
      currentChromaticConfig.value = { intensity: 0.5 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.chromaticAberration.intensity).toBe(0.5)
    })
  })

  describe('currentDotHalftoneConfig', () => {
    it('returns dot halftone config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentDotHalftoneConfig } = useFilterEditor({ effectManager })

      expect(currentDotHalftoneConfig.value).toHaveProperty('dotSize')
      expect(currentDotHalftoneConfig.value).toHaveProperty('spacing')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentDotHalftoneConfig } = useFilterEditor({ effectManager })
      currentDotHalftoneConfig.value = { dotSize: 6, angle: 30 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.dotHalftone.dotSize).toBe(6)
      expect(config?.dotHalftone.angle).toBe(30)
    })
  })

  describe('currentLineHalftoneConfig', () => {
    it('returns line halftone config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentLineHalftoneConfig } = useFilterEditor({ effectManager })

      expect(currentLineHalftoneConfig.value).toHaveProperty('lineWidth')
      expect(currentLineHalftoneConfig.value).toHaveProperty('spacing')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentLineHalftoneConfig } = useFilterEditor({ effectManager })
      currentLineHalftoneConfig.value = { lineWidth: 3, spacing: 10 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.lineHalftone.lineWidth).toBe(3)
      expect(config?.lineHalftone.spacing).toBe(10)
    })
  })

  describe('currentBlurConfig', () => {
    it('returns blur config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentBlurConfig } = useFilterEditor({ effectManager })

      expect(currentBlurConfig.value).toHaveProperty('radius')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { currentBlurConfig } = useFilterEditor({ effectManager })
      currentBlurConfig.value = { radius: 15 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.blur.radius).toBe(15)
    })
  })

  describe('layer selection changes', () => {
    it('updates configs when selected layer changes', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')
      effectManager.updateEffectParams('layer-1', 'vignette', { intensity: 0.5 })

      effectManager.selectLayer('layer-2')
      effectManager.updateEffectParams('layer-2', 'vignette', { intensity: 0.9 })

      const { currentVignetteConfig } = useFilterEditor({ effectManager })

      // Current selection is layer-2
      expect(currentVignetteConfig.value.intensity).toBe(0.9)

      // Change selected layer
      effectManager.selectLayer('layer-1')

      expect(currentVignetteConfig.value.intensity).toBe(0.5)
    })
  })

  describe('effectConfigs map', () => {
    it('provides access to all effect configs via map', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })

      expect(effectConfigs.vignette).toBeDefined()
      expect(effectConfigs.chromaticAberration).toBeDefined()
      expect(effectConfigs.dotHalftone).toBeDefined()
      expect(effectConfigs.lineHalftone).toBeDefined()
      expect(effectConfigs.blur).toBeDefined()
    })

    it('effectConfigs and legacy configs reference the same computed', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const {
        effectConfigs,
        currentVignetteConfig,
        currentChromaticConfig,
      } = useFilterEditor({ effectManager })

      // They should be the same reference
      expect(effectConfigs.vignette).toBe(currentVignetteConfig)
      expect(effectConfigs.chromaticAberration).toBe(currentChromaticConfig)
    })
  })
})

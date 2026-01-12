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

  describe('effectConfigs.vignette', () => {
    it('returns empty object when no layer is selected', () => {
      const effectManager = useEffectManager()
      effectManager.selectedLayerId.value = null

      const { effectConfigs } = useFilterEditor({ effectManager })

      expect(effectConfigs.vignette.value).toEqual({})
    })

    it('returns vignette config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })

      // Should return the default vignette config (without 'enabled')
      expect(effectConfigs.vignette.value).toHaveProperty('intensity')
      expect(effectConfigs.vignette.value).toHaveProperty('radius')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })
      effectConfigs.vignette.value = { intensity: 0.7 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.vignette.intensity).toBe(0.7)
    })
  })

  describe('effectConfigs.chromaticAberration', () => {
    it('returns chromatic aberration config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })

      expect(effectConfigs.chromaticAberration.value).toHaveProperty('intensity')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })
      effectConfigs.chromaticAberration.value = { intensity: 0.5 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.chromaticAberration.intensity).toBe(0.5)
    })
  })

  describe('effectConfigs.dotHalftone', () => {
    it('returns dot halftone config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })

      expect(effectConfigs.dotHalftone.value).toHaveProperty('dotSize')
      expect(effectConfigs.dotHalftone.value).toHaveProperty('spacing')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })
      effectConfigs.dotHalftone.value = { dotSize: 6, angle: 30 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.dotHalftone.dotSize).toBe(6)
      expect(config?.dotHalftone.angle).toBe(30)
    })
  })

  describe('effectConfigs.lineHalftone', () => {
    it('returns line halftone config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })

      expect(effectConfigs.lineHalftone.value).toHaveProperty('lineWidth')
      expect(effectConfigs.lineHalftone.value).toHaveProperty('spacing')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })
      effectConfigs.lineHalftone.value = { lineWidth: 3, spacing: 10 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.lineHalftone.lineWidth).toBe(3)
      expect(config?.lineHalftone.spacing).toBe(10)
    })
  })

  describe('effectConfigs.blur', () => {
    it('returns blur config from selected layer', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })

      expect(effectConfigs.blur.value).toHaveProperty('radius')
    })

    it('calls updateEffectParams when setting config', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })
      effectConfigs.blur.value = { radius: 15 }

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

      const { effectConfigs } = useFilterEditor({ effectManager })

      // Current selection is layer-2
      expect(effectConfigs.vignette.value.intensity).toBe(0.9)

      // Change selected layer
      effectManager.selectLayer('layer-1')

      expect(effectConfigs.vignette.value.intensity).toBe(0.5)
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

    it('effectConfigs values are writable computed refs', () => {
      const effectManager = useEffectManager()
      effectManager.selectLayer('layer-1')

      const { effectConfigs } = useFilterEditor({ effectManager })

      // Verify they are writable by checking we can set values
      effectConfigs.vignette.value = { intensity: 0.8 }
      effectConfigs.chromaticAberration.value = { intensity: 0.3 }

      const config = effectManager.effects.value.get('layer-1')
      expect(config?.vignette.intensity).toBe(0.8)
      expect(config?.chromaticAberration.intensity).toBe(0.3)
    })
  })
})

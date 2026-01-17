import { describe, it, expect } from 'vitest'
import { useEffectManager } from './useEffectManager'
import { EFFECT_TYPES } from '../modules/HeroScene'

// ============================================================
// Tests
// ============================================================

describe('useEffectManager', () => {
  describe('initial state', () => {
    it('returns empty effects map initially', () => {
      const { effects } = useEffectManager()

      expect(effects.value.size).toBe(0)
    })

    it('returns null selectedLayerId initially', () => {
      const { selectedLayerId } = useEffectManager()

      expect(selectedLayerId.value).toBeNull()
    })

    it('returns null selectedEffect when no layer is selected', () => {
      const { selectedEffect } = useEffectManager()

      expect(selectedEffect.value).toBeNull()
    })
  })

  describe('selectLayer', () => {
    it('sets selectedLayerId', () => {
      const { selectedLayerId, selectLayer } = useEffectManager()

      selectLayer('layer-1')

      expect(selectedLayerId.value).toBe('layer-1')
    })

    it('initializes effect config for the layer', () => {
      const { effects, selectLayer } = useEffectManager()

      selectLayer('layer-1')

      expect(effects.value.has('layer-1')).toBe(true)
      const config = effects.value.get('layer-1')!
      expect(config.vignette).toBeDefined()
      expect(config.chromaticAberration).toBeDefined()
      expect(config.dotHalftone).toBeDefined()
      expect(config.lineHalftone).toBeDefined()
      expect(config.blur).toBeDefined()
    })

    it('sets selectedEffect to the layer config', () => {
      const { selectedEffect, selectLayer } = useEffectManager()

      selectLayer('layer-1')

      expect(selectedEffect.value).not.toBeNull()
      expect(selectedEffect.value!.vignette).toBeDefined()
    })

    it('does not reinitialize existing layer config', () => {
      const { effects, selectLayer, setEffectType } = useEffectManager()

      selectLayer('layer-1')
      setEffectType('layer-1', 'blur')
      selectLayer('layer-1') // Select again

      const config = effects.value.get('layer-1')!
      expect(config.blur.enabled).toBe(true)
    })

    it('can select different layers', () => {
      const { selectedLayerId, effects, selectLayer } = useEffectManager()

      selectLayer('layer-1')
      selectLayer('layer-2')

      expect(selectedLayerId.value).toBe('layer-2')
      expect(effects.value.has('layer-1')).toBe(true)
      expect(effects.value.has('layer-2')).toBe(true)
    })
  })

  describe('setEffectType', () => {
    it('enables the specified effect type', () => {
      const { effects, selectLayer, setEffectType } = useEffectManager()

      selectLayer('layer-1')
      setEffectType('layer-1', 'blur')

      const config = effects.value.get('layer-1')!
      expect(config.blur.enabled).toBe(true)
    })

    it('disables all other effect types (exclusive selection)', () => {
      const { effects, selectLayer, setEffectType } = useEffectManager()

      selectLayer('layer-1')
      setEffectType('layer-1', 'vignette')
      setEffectType('layer-1', 'blur')

      const config = effects.value.get('layer-1')!
      expect(config.vignette.enabled).toBe(false)
      expect(config.chromaticAberration.enabled).toBe(false)
      expect(config.dotHalftone.enabled).toBe(false)
      expect(config.lineHalftone.enabled).toBe(false)
      expect(config.blur.enabled).toBe(true)
    })

    it('disables all effects when type is null', () => {
      const { effects, selectLayer, setEffectType } = useEffectManager()

      selectLayer('layer-1')
      setEffectType('layer-1', 'blur')
      setEffectType('layer-1', null)

      const config = effects.value.get('layer-1')!
      for (const effectType of EFFECT_TYPES) {
        expect(config[effectType].enabled).toBe(false)
      }
    })

    it('creates layer config if it does not exist', () => {
      const { effects, setEffectType } = useEffectManager()

      setEffectType('layer-1', 'blur')

      expect(effects.value.has('layer-1')).toBe(true)
      expect(effects.value.get('layer-1')!.blur.enabled).toBe(true)
    })

    it('preserves effect parameters when changing effect type', () => {
      const { effects, selectLayer, setEffectType, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      setEffectType('layer-1', 'blur')
      updateEffectParams('layer-1', 'blur', { radius: 20 })
      setEffectType('layer-1', 'vignette')
      setEffectType('layer-1', 'blur') // Re-enable blur

      const config = effects.value.get('layer-1')!
      expect(config.blur.radius).toBe(20)
    })
  })

  describe('updateEffectParams', () => {
    it('updates effect parameters', () => {
      const { effects, selectLayer, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      updateEffectParams('layer-1', 'blur', { radius: 15 })

      const config = effects.value.get('layer-1')!
      expect(config.blur.radius).toBe(15)
    })

    it('does not change enabled state', () => {
      const { effects, selectLayer, setEffectType, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      setEffectType('layer-1', 'blur')
      updateEffectParams('layer-1', 'blur', { radius: 15 })

      const config = effects.value.get('layer-1')!
      expect(config.blur.enabled).toBe(true)
    })

    it('merges partial params with existing config', () => {
      const { effects, selectLayer, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      updateEffectParams('layer-1', 'dotHalftone', { dotSize: 10 })
      updateEffectParams('layer-1', 'dotHalftone', { spacing: 20 })

      const config = effects.value.get('layer-1')!
      expect(config.dotHalftone.dotSize).toBe(10)
      expect(config.dotHalftone.spacing).toBe(20)
    })

    it('creates layer config if it does not exist', () => {
      const { effects, updateEffectParams } = useEffectManager()

      updateEffectParams('layer-1', 'blur', { radius: 25 })

      expect(effects.value.has('layer-1')).toBe(true)
      expect(effects.value.get('layer-1')!.blur.radius).toBe(25)
    })

    it('can update vignette params', () => {
      const { effects, selectLayer, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      updateEffectParams('layer-1', 'vignette', { intensity: 0.8, softness: 0.3 })

      const config = effects.value.get('layer-1')!
      expect(config.vignette.intensity).toBe(0.8)
      expect(config.vignette.softness).toBe(0.3)
    })

    it('can update chromatic aberration params', () => {
      const { effects, selectLayer, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      updateEffectParams('layer-1', 'chromaticAberration', { intensity: 10 })

      const config = effects.value.get('layer-1')!
      expect(config.chromaticAberration.intensity).toBe(10)
    })

    it('can update line halftone params', () => {
      const { effects, selectLayer, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      updateEffectParams('layer-1', 'lineHalftone', { lineWidth: 5, angle: 90 })

      const config = effects.value.get('layer-1')!
      expect(config.lineHalftone.lineWidth).toBe(5)
      expect(config.lineHalftone.angle).toBe(90)
    })
  })

  describe('selectedEffect', () => {
    it('reflects changes to the selected layer config', () => {
      const { selectedEffect, selectLayer, setEffectType } = useEffectManager()

      selectLayer('layer-1')
      expect(selectedEffect.value!.blur.enabled).toBe(false)

      setEffectType('layer-1', 'blur')
      expect(selectedEffect.value!.blur.enabled).toBe(true)
    })

    it('updates when selected layer changes', () => {
      const { selectedEffect, selectLayer, setEffectType } = useEffectManager()

      selectLayer('layer-1')
      setEffectType('layer-1', 'blur')

      selectLayer('layer-2')
      setEffectType('layer-2', 'vignette')

      selectLayer('layer-1')
      expect(selectedEffect.value!.blur.enabled).toBe(true)
      expect(selectedEffect.value!.vignette.enabled).toBe(false)

      selectLayer('layer-2')
      expect(selectedEffect.value!.blur.enabled).toBe(false)
      expect(selectedEffect.value!.vignette.enabled).toBe(true)
    })

    it('returns null when selecting non-existent layer without initializing', () => {
      const { selectedEffect, selectedLayerId } = useEffectManager()

      // Directly set selectedLayerId without using selectLayer
      selectedLayerId.value = 'non-existent'

      expect(selectedEffect.value).toBeNull()
    })
  })

  describe('effects reactivity', () => {
    it('effects map is reactive to setEffectType', () => {
      const { effects, selectLayer, setEffectType } = useEffectManager()

      selectLayer('layer-1')
      const initialConfig = effects.value.get('layer-1')

      setEffectType('layer-1', 'blur')
      const updatedConfig = effects.value.get('layer-1')

      // Should be a new object reference (immutable update)
      expect(updatedConfig).not.toBe(initialConfig)
    })

    it('effects map is reactive to updateEffectParams', () => {
      const { effects, selectLayer, updateEffectParams } = useEffectManager()

      selectLayer('layer-1')
      const initialConfig = effects.value.get('layer-1')

      updateEffectParams('layer-1', 'blur', { radius: 15 })
      const updatedConfig = effects.value.get('layer-1')

      // Should be a new object reference (immutable update)
      expect(updatedConfig).not.toBe(initialConfig)
    })
  })

  // ============================================================
  // New Multi-Effect API Tests
  // ============================================================

  describe('Multi-Effect API', () => {
    describe('effectPipelines', () => {
      it('returns empty map initially', () => {
        const { effectPipelines } = useEffectManager()
        expect(effectPipelines.value.size).toBe(0)
      })

      it('stores SingleEffectConfig[] per layer', () => {
        const { effectPipelines, selectLayer, addEffect } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur', { radius: 8 })
        addEffect('layer-1', 'vignette', { intensity: 0.5 })

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline).toHaveLength(2)
        expect(pipeline[0]!.id).toBe('blur')
        expect(pipeline[1]!.id).toBe('vignette')
      })
    })

    describe('selectedPipeline', () => {
      it('returns empty array when no layer is selected', () => {
        const { selectedPipeline } = useEffectManager()
        expect(selectedPipeline.value).toEqual([])
      })

      it('returns pipeline for selected layer', () => {
        const { selectedPipeline, selectLayer, addEffect } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')

        expect(selectedPipeline.value).toHaveLength(1)
        expect(selectedPipeline.value[0]!.id).toBe('blur')
      })
    })

    describe('addEffect', () => {
      it('adds effect to pipeline', () => {
        const { effectPipelines, selectLayer, addEffect } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur', { radius: 10 })

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline).toHaveLength(1)
        expect(pipeline[0]!.id).toBe('blur')
        expect(pipeline[0]!.params.radius).toBe(10)
      })

      it('supports multiple effects (no exclusive selection)', () => {
        const { effectPipelines, selectLayer, addEffect } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')
        addEffect('layer-1', 'vignette')
        addEffect('layer-1', 'chromaticAberration')

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline).toHaveLength(3)
      })

      it('allows same effect type multiple times', () => {
        const { effectPipelines, selectLayer, addEffect } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur', { radius: 5 })
        addEffect('layer-1', 'blur', { radius: 10 })

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline).toHaveLength(2)
        expect(pipeline[0]!.params.radius).toBe(5)
        expect(pipeline[1]!.params.radius).toBe(10)
      })
    })

    describe('removeEffect', () => {
      it('removes effect at index', () => {
        const { effectPipelines, selectLayer, addEffect, removeEffect } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')
        addEffect('layer-1', 'vignette')
        addEffect('layer-1', 'chromaticAberration')

        removeEffect('layer-1', 1) // Remove vignette

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline).toHaveLength(2)
        expect(pipeline[0]!.id).toBe('blur')
        expect(pipeline[1]!.id).toBe('chromaticAberration')
      })

      it('does nothing for invalid index', () => {
        const { effectPipelines, selectLayer, addEffect, removeEffect } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')

        removeEffect('layer-1', 5) // Invalid index
        removeEffect('layer-1', -1) // Negative index

        expect(effectPipelines.value.get('layer-1')!).toHaveLength(1)
      })
    })

    describe('updateEffectAt', () => {
      it('updates effect params at index', () => {
        const { effectPipelines, selectLayer, addEffect, updateEffectAt } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur', { radius: 5 })
        addEffect('layer-1', 'vignette', { intensity: 0.3 })

        updateEffectAt('layer-1', 0, { radius: 15 })

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline[0]!.params.radius).toBe(15)
        expect(pipeline[1]!.params.intensity).toBe(0.3) // Unchanged
      })

      it('merges params with existing', () => {
        const { effectPipelines, selectLayer, addEffect, updateEffectAt } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur', { radius: 5 })

        updateEffectAt('layer-1', 0, { radius: 10 })

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline[0]!.params.radius).toBe(10)
      })
    })

    describe('reorderEffects', () => {
      it('moves effect from one index to another', () => {
        const { effectPipelines, selectLayer, addEffect, reorderEffects } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')
        addEffect('layer-1', 'vignette')
        addEffect('layer-1', 'chromaticAberration')

        reorderEffects('layer-1', 0, 2) // Move blur to end

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline[0]!.id).toBe('vignette')
        expect(pipeline[1]!.id).toBe('chromaticAberration')
        expect(pipeline[2]!.id).toBe('blur')
      })

      it('does nothing for same index', () => {
        const { effectPipelines, selectLayer, addEffect, reorderEffects } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')
        addEffect('layer-1', 'vignette')

        reorderEffects('layer-1', 0, 0)

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline[0]!.id).toBe('blur')
        expect(pipeline[1]!.id).toBe('vignette')
      })
    })

    describe('clearEffects', () => {
      it('removes all effects from layer', () => {
        const { effectPipelines, selectLayer, addEffect, clearEffects } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')
        addEffect('layer-1', 'vignette')

        clearEffects('layer-1')

        expect(effectPipelines.value.get('layer-1')!).toHaveLength(0)
      })
    })

    describe('setEffectPipeline', () => {
      it('replaces entire pipeline', () => {
        const { effectPipelines, selectLayer, addEffect, setEffectPipeline } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')
        addEffect('layer-1', 'vignette')

        setEffectPipeline('layer-1', [
          { type: 'effect', id: 'chromaticAberration', params: { intensity: 5 } },
        ])

        const pipeline = effectPipelines.value.get('layer-1')!
        expect(pipeline).toHaveLength(1)
        expect(pipeline[0]!.id).toBe('chromaticAberration')
      })
    })

    describe('deleteEffectPipeline', () => {
      it('removes layer from map', () => {
        const { effectPipelines, selectLayer, addEffect, deleteEffectPipeline } = useEffectManager()

        selectLayer('layer-1')
        addEffect('layer-1', 'blur')

        deleteEffectPipeline('layer-1')

        expect(effectPipelines.value.has('layer-1')).toBe(false)
      })
    })
  })

  describe('Legacy API compatibility', () => {
    it('effects computed converts pipeline to LayerEffectConfig', () => {
      const { effects, selectLayer, addEffect } = useEffectManager()

      selectLayer('layer-1')
      addEffect('layer-1', 'blur', { radius: 12 })

      const config = effects.value.get('layer-1')!
      expect(config.blur.enabled).toBe(true)
      expect(config.blur.radius).toBe(12)
      expect(config.vignette.enabled).toBe(false)
    })

    it('setEffectConfig accepts LayerEffectConfig', () => {
      const { effectPipelines, setEffectConfig } = useEffectManager()

      const legacyConfig = {
        vignette: { enabled: true, shape: 'ellipse', intensity: 0.5, softness: 0.4, radius: 0.8, centerX: 0.5, centerY: 0.5, aspectRatio: 1, color: [0, 0, 0, 1] },
        blur: { enabled: true, radius: 8 },
        chromaticAberration: { enabled: false, intensity: 3 },
        dotHalftone: { enabled: false, dotSize: 8, spacing: 16, angle: 45 },
        lineHalftone: { enabled: false, lineWidth: 4, spacing: 12, angle: 45 },
      }

      // @ts-expect-error - Testing legacy format acceptance
      setEffectConfig('layer-1', legacyConfig)

      const pipeline = effectPipelines.value.get('layer-1')!
      expect(pipeline).toHaveLength(2) // Only enabled effects
      expect(pipeline.some((e) => e.id === 'vignette')).toBe(true)
      expect(pipeline.some((e) => e.id === 'blur')).toBe(true)
    })

    it('setEffectConfig accepts SingleEffectConfig[]', () => {
      const { effectPipelines, setEffectConfig } = useEffectManager()

      setEffectConfig('layer-1', [
        { type: 'effect', id: 'blur', params: { radius: 10 } },
      ])

      const pipeline = effectPipelines.value.get('layer-1')!
      expect(pipeline).toHaveLength(1)
      expect(pipeline[0]!.id).toBe('blur')
    })
  })
})

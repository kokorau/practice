import { describe, it, expect } from 'vitest'
import { computed, ref, type WritableComputedRef } from 'vue'
import { useVignetteEditor } from './useVignetteEditor'
import type { VignetteConfigParams } from './useFilterEditor'
import type { VignetteConfig } from '../modules/HeroScene'

// ============================================================
// Test Helpers
// ============================================================

/**
 * Create a mock vignette config for testing
 * Uses VignetteConfig internally but returns WritableComputedRef<VignetteConfigParams>
 */
function createMockVignetteConfig(
  initial: Partial<VignetteConfig> = {}
): WritableComputedRef<VignetteConfigParams> {
  // Only include ellipse defaults if shape is ellipse or not specified
  const shape = initial.shape ?? 'ellipse'
  let baseConfig: VignetteConfig

  if (shape === 'ellipse') {
    baseConfig = {
      enabled: false,
      shape: 'ellipse',
      intensity: 0.5,
      softness: 0.4,
      color: [0, 0, 0, 1],
      radius: 0.8,
      centerX: 0.5,
      centerY: 0.5,
      aspectRatio: 1,
    }
  } else if (shape === 'circle') {
    baseConfig = {
      enabled: false,
      shape: 'circle',
      intensity: 0.5,
      softness: 0.4,
      color: [0, 0, 0, 1],
      radius: 0.8,
      centerX: 0.5,
      centerY: 0.5,
    }
  } else if (shape === 'rectangle') {
    baseConfig = {
      enabled: false,
      shape: 'rectangle',
      intensity: 0.5,
      softness: 0.4,
      color: [0, 0, 0, 1],
      centerX: 0.5,
      centerY: 0.5,
      width: 0.8,
      height: 0.6,
      cornerRadius: 0,
    }
  } else {
    baseConfig = {
      enabled: false,
      shape: 'linear',
      intensity: 0.5,
      softness: 0.4,
      color: [0, 0, 0, 1],
      angle: 0,
      startOffset: 0.3,
      endOffset: 0.7,
    }
  }

  const configRef = ref<VignetteConfig>({
    ...baseConfig,
    ...initial,
  } as VignetteConfig)

  return computed({
    get: () => configRef.value as unknown as VignetteConfigParams,
    set: (v) => { configRef.value = v as unknown as VignetteConfig },
  })
}

// ============================================================
// Tests
// ============================================================

describe('useVignetteEditor', () => {
  describe('migratedConfig', () => {
    it('returns config with shape when already present', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'circle',
        radius: 0.7,
        centerX: 0.3,
        centerY: 0.4,
      })

      const { migratedConfig } = useVignetteEditor({ vignetteConfig })

      expect(migratedConfig.value.shape).toBe('circle')
      expect((migratedConfig.value as { radius: number }).radius).toBe(0.7)
    })

  })

  describe('shapeSchema', () => {
    it('returns ellipse schema for ellipse shape', () => {
      const vignetteConfig = createMockVignetteConfig({ shape: 'ellipse' })

      const { shapeSchema } = useVignetteEditor({ vignetteConfig })
      const schema = shapeSchema.value as Record<string, unknown>

      expect(schema).toBeDefined()
      expect(schema.radius).toBeDefined()
      expect(schema.aspectRatio).toBeDefined()
    })

    it('returns circle schema for circle shape', () => {
      const vignetteConfig = createMockVignetteConfig({ shape: 'circle' })

      const { shapeSchema } = useVignetteEditor({ vignetteConfig })
      const schema = shapeSchema.value as Record<string, unknown>

      expect(schema).toBeDefined()
      expect(schema.radius).toBeDefined()
      expect(schema.aspectRatio).toBeUndefined()
    })

    it('returns rectangle schema for rectangle shape', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'rectangle',
      })

      const { shapeSchema } = useVignetteEditor({ vignetteConfig })
      const schema = shapeSchema.value as Record<string, unknown>

      expect(schema).toBeDefined()
      expect(schema.width).toBeDefined()
      expect(schema.height).toBeDefined()
      expect(schema.cornerRadius).toBeDefined()
    })

    it('returns linear schema for linear shape', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'linear',
      })

      const { shapeSchema } = useVignetteEditor({ vignetteConfig })
      const schema = shapeSchema.value as Record<string, unknown>

      expect(schema).toBeDefined()
      expect(schema.angle).toBeDefined()
      expect(schema.startOffset).toBeDefined()
      expect(schema.endOffset).toBeDefined()
    })
  })

  describe('shapeParams', () => {
    it('extracts only shape-specific params for ellipse', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'ellipse',
        intensity: 0.5,
        radius: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        aspectRatio: 1.2,
      })

      const { shapeParams } = useVignetteEditor({ vignetteConfig })

      expect(shapeParams.value).toEqual({
        radius: 0.8,
        centerX: 0.5,
        centerY: 0.5,
        aspectRatio: 1.2,
      })
      expect(shapeParams.value).not.toHaveProperty('enabled')
      expect(shapeParams.value).not.toHaveProperty('shape')
      expect(shapeParams.value).not.toHaveProperty('intensity')
      expect(shapeParams.value).not.toHaveProperty('softness')
      expect(shapeParams.value).not.toHaveProperty('color')
    })

    it('extracts only shape-specific params for rectangle', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'rectangle',
        cornerRadius: 0.1,
      })

      const { shapeParams } = useVignetteEditor({ vignetteConfig })

      expect(shapeParams.value).toEqual({
        width: 0.8,
        height: 0.6,
        cornerRadius: 0.1,
        centerX: 0.5,
        centerY: 0.5,
      })
    })
  })

  describe('colorHex', () => {
    it('converts RGB color to hex string', () => {
      const vignetteConfig = createMockVignetteConfig({
        color: [1, 0, 0, 1], // Red
      })

      const { colorHex } = useVignetteEditor({ vignetteConfig })

      expect(colorHex.value).toBe('#ff0000')
    })

    it('converts black color correctly', () => {
      const vignetteConfig = createMockVignetteConfig({
        color: [0, 0, 0, 1],
      })

      const { colorHex } = useVignetteEditor({ vignetteConfig })

      expect(colorHex.value).toBe('#000000')
    })

    it('converts mixed color correctly', () => {
      const vignetteConfig = createMockVignetteConfig({
        color: [0.5, 0.25, 0.75, 1],
      })

      const { colorHex } = useVignetteEditor({ vignetteConfig })

      expect(colorHex.value).toBe('#8040bf')
    })
  })

  describe('handleBaseUpdate', () => {
    it('updates base params without changing shape', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'ellipse',
        intensity: 0.5,
      })

      const { handleBaseUpdate } = useVignetteEditor({ vignetteConfig })
      handleBaseUpdate({ intensity: 0.8 })

      expect(vignetteConfig.value.intensity).toBe(0.8)
      expect(vignetteConfig.value.shape).toBe('ellipse')
    })

    it('creates new config with defaults when shape changes', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'ellipse',
        intensity: 0.7,
        softness: 0.5,
        radius: 0.9,
        aspectRatio: 1.5,
      })

      const { handleBaseUpdate } = useVignetteEditor({ vignetteConfig })
      handleBaseUpdate({ shape: 'rectangle' })

      const config = vignetteConfig.value as unknown as VignetteConfig
      // Shape should change
      expect(config.shape).toBe('rectangle')
      // Base params should be preserved
      expect(config.intensity).toBe(0.7)
      expect(config.softness).toBe(0.5)
      // Rectangle-specific defaults should be applied
      expect((config as { width: number }).width).toBe(0.8)
      expect((config as { height: number }).height).toBe(0.6)
    })

    it('preserves color when changing shape', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'ellipse',
        color: [1, 0, 0, 0.8],
      })

      const { handleBaseUpdate } = useVignetteEditor({ vignetteConfig })
      handleBaseUpdate({ shape: 'linear' })

      expect(vignetteConfig.value.color).toEqual([1, 0, 0, 0.8])
    })
  })

  describe('handleShapeUpdate', () => {
    it('updates shape-specific params', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'ellipse',
      })

      const { handleShapeUpdate } = useVignetteEditor({ vignetteConfig })
      handleShapeUpdate({ radius: 0.6, aspectRatio: 2 })

      const config = vignetteConfig.value as unknown as VignetteConfig
      expect((config as { radius: number }).radius).toBe(0.6)
      expect((config as { aspectRatio: number }).aspectRatio).toBe(2)
    })

    it('does not change shape when updating shape params', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'circle',
      })

      const { handleShapeUpdate } = useVignetteEditor({ vignetteConfig })
      handleShapeUpdate({ radius: 0.5 })

      expect(vignetteConfig.value.shape).toBe('circle')
    })
  })

  describe('handleColorChange', () => {
    it('updates color from hex input', () => {
      const vignetteConfig = createMockVignetteConfig({
        color: [0, 0, 0, 1],
      })

      const { handleColorChange } = useVignetteEditor({ vignetteConfig })
      const event = {
        target: { value: '#ff8000' },
      } as unknown as Event

      handleColorChange(event)

      expect(vignetteConfig.value.color![0]).toBeCloseTo(1, 2)
      expect(vignetteConfig.value.color![1]).toBeCloseTo(0.502, 2)
      expect(vignetteConfig.value.color![2]).toBeCloseTo(0, 2)
    })

    it('preserves alpha when changing color', () => {
      const vignetteConfig = createMockVignetteConfig({
        color: [0, 0, 0, 0.5],
      })

      const { handleColorChange } = useVignetteEditor({ vignetteConfig })
      const event = {
        target: { value: '#ffffff' },
      } as unknown as Event

      handleColorChange(event)

      expect(vignetteConfig.value.color![3]).toBe(0.5)
    })
  })

  describe('reactivity', () => {
    it('updates computed values when config changes', () => {
      const vignetteConfig = createMockVignetteConfig({
        shape: 'ellipse',
        color: [0, 0, 0, 1],
      })

      const { migratedConfig, colorHex, shapeParams } = useVignetteEditor({ vignetteConfig })

      expect(migratedConfig.value.shape).toBe('ellipse')
      expect(colorHex.value).toBe('#000000')

      // Update config externally (need to cast for type safety)
      vignetteConfig.value = {
        shape: 'circle',
        color: [1, 1, 1, 1],
        intensity: 0.5,
        softness: 0.4,
        radius: 0.5,
        centerX: 0.5,
        centerY: 0.5,
      } as unknown as VignetteConfigParams

      expect(migratedConfig.value.shape).toBe('circle')
      expect(colorHex.value).toBe('#ffffff')
      expect(shapeParams.value.radius).toBe(0.5)
    })
  })
})

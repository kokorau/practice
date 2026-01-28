import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { extractPartialConfig, usePartialConfig } from './extractPartialConfig'
import type { HeroViewConfig, SingleEffectConfig, MaskProcessorConfig } from '@practice/section-visual'
import { $PropertyValue, HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'

/**
 * Create a complete test config with:
 * - 2 surfaces (surface-1, surface-2)
 * - 1 processor with 2 effects and 1 mask (processor-1)
 */
const createCompleteConfig = (): HeroViewConfig => ({
  viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
  colors: { semanticContext: 'canvas' },
  layers: [
    {
      type: 'surface',
      id: 'surface-1',
      name: 'Surface 1',
      visible: true,
      surface: {
        id: 'solid',
        params: { color1: $PropertyValue.static('B') },
      },
    },
    {
      type: 'surface',
      id: 'surface-2',
      name: 'Surface 2',
      visible: true,
      surface: {
        id: 'stripe',
        params: {
          width1: $PropertyValue.static(10),
          width2: $PropertyValue.static(10),
          angle: $PropertyValue.static(0),
          color1: $PropertyValue.static('B'),
          color2: $PropertyValue.static('F1'),
        },
      },
    },
    {
      type: 'processor',
      id: 'processor-1',
      name: 'Effects',
      visible: true,
      modifiers: [
        {
          type: 'effect',
          id: 'blur',
          params: { radius: $PropertyValue.static(8) },
        } satisfies SingleEffectConfig,
        {
          type: 'effect',
          id: 'contrast',
          params: { amount: $PropertyValue.static(1.2) },
        } satisfies SingleEffectConfig,
        {
          type: 'mask',
          enabled: true,
          children: [
            {
              type: 'surface',
              id: 'mask-surface',
              name: 'Gradient',
              visible: true,
              surface: {
                id: 'radialGradient',
                params: {
                  centerX: $PropertyValue.static(0.5),
                  centerY: $PropertyValue.static(0.5),
                  innerRadius: $PropertyValue.static(0.2),
                  outerRadius: $PropertyValue.static(0.8),
                  aspectRatio: $PropertyValue.static(1),
                },
              },
            },
          ],
          invert: false,
          feather: 0,
        } satisfies MaskProcessorConfig,
      ],
    },
  ],
  foreground: { elements: [] },
})

describe('extractPartialConfig', () => {
  it('should return full config for render target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'render')

    expect(result.found).toBe(true)
    expect(result.config.layers).toHaveLength(3)
    expect(result.config.foreground.elements).toHaveLength(0)
  })

  it('should return only first surface for surface-1 target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'surface-1')

    expect(result.found).toBe(true)
    expect(result.config.layers).toHaveLength(1)
    expect(result.config.layers[0].id).toBe('surface-1')
  })

  it('should return surfaces up to target for surface-2 target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'surface-2')

    expect(result.found).toBe(true)
    expect(result.config.layers).toHaveLength(2)
    expect(result.config.layers[0].id).toBe('surface-1')
    expect(result.config.layers[1].id).toBe('surface-2')
  })

  it('should return all layers for processor target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'processor-1')

    expect(result.found).toBe(true)
    expect(result.config.layers).toHaveLength(3)
    // Processor should have all modifiers
    const processor = result.config.layers[2] as any
    expect(processor.modifiers).toHaveLength(3)
  })

  it('should truncate modifiers for effect-0 target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'processor-1-effect-0')

    expect(result.found).toBe(true)
    expect(result.config.layers).toHaveLength(3)

    const processor = result.config.layers[2] as any
    expect(processor.type).toBe('processor')
    expect(processor.modifiers).toHaveLength(1)
    expect(processor.modifiers[0].id).toBe('blur')
  })

  it('should truncate modifiers for effect-1 target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'processor-1-effect-1')

    expect(result.found).toBe(true)

    const processor = result.config.layers[2] as any
    expect(processor.modifiers).toHaveLength(2)
    expect(processor.modifiers[0].id).toBe('blur')
    expect(processor.modifiers[1].id).toBe('contrast')
  })

  it('should include mask for mask-2 target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'processor-1-mask-2')

    expect(result.found).toBe(true)

    const processor = result.config.layers[2] as any
    expect(processor.modifiers).toHaveLength(3)
    expect(processor.modifiers[2].type).toBe('mask')
  })

  it('should include mask for graymap-2 target (same as mask)', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'processor-1-graymap-2')

    expect(result.found).toBe(true)

    const processor = result.config.layers[2] as any
    expect(processor.modifiers).toHaveLength(3)
  })

  it('should return empty layers for non-existent target', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'non-existent')

    expect(result.found).toBe(false)
    expect(result.config.layers).toHaveLength(0)
  })

  it('should return empty layers for non-existent processor internal', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'processor-99-effect-0')

    expect(result.found).toBe(false)
    expect(result.config.layers).toHaveLength(0)
  })

  it('should not modify original config', () => {
    const config = createCompleteConfig()
    const originalLength = (config.layers[2] as any).modifiers.length

    extractPartialConfig(config, 'processor-1-effect-0')

    // Original should be unchanged
    expect((config.layers[2] as any).modifiers.length).toBe(originalLength)
  })

  it('should preserve viewport and colors', () => {
    const config = createCompleteConfig()
    const result = extractPartialConfig(config, 'surface-1')

    expect(result.config.viewport).toEqual(config.viewport)
    expect(result.config.colors).toEqual(config.colors)
  })
})

describe('usePartialConfig', () => {
  it('should return computed partial config that updates', () => {
    const config = ref(createCompleteConfig())
    const targetId = ref('render')

    const partial = usePartialConfig(config, targetId)

    expect(partial.value.found).toBe(true)
    expect(partial.value.config.layers).toHaveLength(3)

    // Change target
    targetId.value = 'processor-1-effect-0'

    expect(partial.value.found).toBe(true)
    const processor = partial.value.config.layers[2] as any
    expect(processor.modifiers).toHaveLength(1)
  })

  it('should work with static target ID', () => {
    const config = ref(createCompleteConfig())
    const partial = usePartialConfig(config, 'surface-1')

    expect(partial.value.found).toBe(true)
    expect(partial.value.config.layers).toHaveLength(1)
  })
})

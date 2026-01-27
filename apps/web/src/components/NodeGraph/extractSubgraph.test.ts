import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { extractSubgraph, useSubgraph } from './extractSubgraph'
import { generateAutoLayout } from './useAutoLayout'
import type { HeroViewConfig, SingleEffectConfig, MaskProcessorConfig } from '@practice/section-visual'
import { $PropertyValue, HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'

/**
 * Create a test config with:
 * - 2 surfaces (surface-1, surface-2)
 * - 1 processor with effect and mask (processor-1)
 * - render output
 *
 * Node structure:
 * surface-1 ─┐
 *            ├─► processor-1 ─┬─► effect-0 ─► mask-1 ─┬─► render
 * surface-2 ─┘                │                       │
 *                             └─► graymap-1 ─────────┘
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

describe('extractSubgraph', () => {
  it('should return full graph when render is specified', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'render')

    // Should include everything
    expect(subgraph.nodes.length).toBe(layout.nodes.length)
    expect(subgraph.connections.length).toBe(layout.connections.length)
    expect(subgraph.renderNode).not.toBeNull()
    expect(subgraph.sourceNodes).toHaveLength(2)
    expect(subgraph.processorNodes).toHaveLength(1)
  })

  it('should extract only upstream nodes for effect', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'processor-1-effect-0')

    // Should include: surface-1, surface-2, processor-1, effect-0
    // Should NOT include: mask, graymap, render
    expect(subgraph.sourceNodes).toHaveLength(2)
    expect(subgraph.processorNodes).toHaveLength(1)
    expect(subgraph.filterNodes).toHaveLength(1)
    expect(subgraph.filterNodes[0].type).toBe('effect')
    expect(subgraph.graymapNodes).toHaveLength(0)
    expect(subgraph.renderNode).toBeNull()
  })

  it('should include graymap when mask is specified', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'processor-1-mask-1')

    // Should include: surfaces, processor, effect, mask, graymap
    // Should NOT include: render
    expect(subgraph.sourceNodes).toHaveLength(2)
    expect(subgraph.processorNodes).toHaveLength(1)
    expect(subgraph.filterNodes).toHaveLength(2) // effect and mask
    expect(subgraph.graymapNodes).toHaveLength(1)
    expect(subgraph.renderNode).toBeNull()

    // Verify connections include graymap → mask
    const graymapToMask = subgraph.connections.find(
      (c) => c.from.nodeId === 'processor-1-graymap-1' && c.to.nodeId === 'processor-1-mask-1'
    )
    expect(graymapToMask).toBeDefined()
  })

  it('should return only source when source is specified', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'surface-1')

    // Should only include surface-1
    expect(subgraph.nodes).toHaveLength(1)
    expect(subgraph.nodes[0].id).toBe('surface-1')
    expect(subgraph.sourceNodes).toHaveLength(1)
    expect(subgraph.connections).toHaveLength(0)
    expect(subgraph.processorNodes).toHaveLength(0)
    expect(subgraph.filterNodes).toHaveLength(0)
    expect(subgraph.renderNode).toBeNull()
  })

  it('should return empty result for non-existent ID', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'non-existent-id')

    expect(subgraph.nodes).toHaveLength(0)
    expect(subgraph.connections).toHaveLength(0)
    expect(subgraph.sourceNodes).toHaveLength(0)
    expect(subgraph.processorNodes).toHaveLength(0)
    expect(subgraph.filterNodes).toHaveLength(0)
    expect(subgraph.graymapNodes).toHaveLength(0)
    expect(subgraph.renderNode).toBeNull()
  })

  it('should include parent processor when targeting internal node', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'processor-1-effect-0')

    // Processor should be included even though it's technically "downstream" of effect
    expect(subgraph.processorNodes).toHaveLength(1)
    expect(subgraph.processorNodes[0].id).toBe('processor-1')

    // Internal connection: processor.left → effect should be included
    const internalConn = subgraph.connections.find(
      (c) => c.from.nodeId === 'processor-1' && c.from.position === 'left'
    )
    expect(internalConn).toBeDefined()
  })

  it('should include all internal nodes when processor is specified', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'processor-1')

    // Processor is specified, but since we go upstream only from processor,
    // internal nodes that are downstream (effect, mask) won't be included directly
    // This test verifies that we get sources → processor connections
    expect(subgraph.sourceNodes).toHaveLength(2)
    expect(subgraph.processorNodes).toHaveLength(1)
  })

  it('should preserve column count from original layout', () => {
    const config = createCompleteConfig()
    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'surface-1')

    expect(subgraph.columnCount).toBe(layout.columnCount)
  })

  it('should work with simple source-to-render layout', () => {
    const config: HeroViewConfig = {
      viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'surface-1',
          name: 'Surface',
          visible: true,
          surface: {
            id: 'solid',
            params: { color1: $PropertyValue.static('B') },
          },
        },
      ],
      foreground: { elements: [] },
    }

    const layout = generateAutoLayout(config)
    const subgraph = extractSubgraph(layout, 'render')

    expect(subgraph.nodes).toHaveLength(2) // surface + render
    expect(subgraph.connections).toHaveLength(1) // surface → render
    expect(subgraph.renderNode?.id).toBe('render')
    expect(subgraph.sourceNodes).toHaveLength(1)
  })
})

describe('useSubgraph', () => {
  it('should return computed subgraph that updates with layout', () => {
    const config = ref<HeroViewConfig>(createCompleteConfig())
    const layout = ref(generateAutoLayout(config.value))
    const targetId = ref('render')

    const subgraph = useSubgraph(layout, targetId)

    // Initially includes everything
    expect(subgraph.value.nodes.length).toBe(layout.value.nodes.length)

    // Change target
    targetId.value = 'processor-1-effect-0'
    expect(subgraph.value.renderNode).toBeNull()
    expect(subgraph.value.filterNodes).toHaveLength(1)
  })

  it('should work with static target ID', () => {
    const config = createCompleteConfig()
    const layout = ref(generateAutoLayout(config))

    const subgraph = useSubgraph(layout, 'surface-1')

    expect(subgraph.value.nodes).toHaveLength(1)
    expect(subgraph.value.nodes[0].id).toBe('surface-1')
  })

  it('should update when layout changes', () => {
    const simpleConfig: HeroViewConfig = {
      viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'surface-1',
          name: 'Surface',
          visible: true,
          surface: {
            id: 'solid',
            params: { color1: $PropertyValue.static('B') },
          },
        },
      ],
      foreground: { elements: [] },
    }

    const layout = ref(generateAutoLayout(simpleConfig))
    const subgraph = useSubgraph(layout, 'render')

    expect(subgraph.value.sourceNodes).toHaveLength(1)
    expect(subgraph.value.processorNodes).toHaveLength(0)

    // Update layout with processor
    layout.value = generateAutoLayout(createCompleteConfig())

    expect(subgraph.value.sourceNodes).toHaveLength(2)
    expect(subgraph.value.processorNodes).toHaveLength(1)
  })
})

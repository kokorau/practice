import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { generateAutoLayout, useAutoLayout } from './useAutoLayout'
import type { HeroViewConfig, SingleEffectConfig, MaskProcessorConfig } from '@practice/section-visual'
import { $PropertyValue, HERO_CANVAS_WIDTH, HERO_CANVAS_HEIGHT } from '@practice/section-visual'

describe('generateAutoLayout', () => {
  const createSimpleConfig = (): HeroViewConfig => ({
    viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
    colors: { semanticContext: 'canvas' },
    layers: [
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Test Surface',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            width1: $PropertyValue.static(20),
            width2: $PropertyValue.static(20),
            angle: $PropertyValue.static(45),
            color1: $PropertyValue.static('B'),
            color2: $PropertyValue.static('F1'),
          },
        },
      },
    ],
    foreground: { elements: [] },
  })

  const createConfigWithProcessor = (): HeroViewConfig => ({
    ...createSimpleConfig(),
    layers: [
      ...createSimpleConfig().layers,
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
        ],
      },
    ],
  })

  const createConfigWithMask = (): HeroViewConfig => ({
    viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
    colors: { semanticContext: 'canvas' },
    layers: [
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Grid',
        visible: true,
        surface: {
          id: 'grid',
          params: {
            cellSize: $PropertyValue.static(25),
            lineWidth: $PropertyValue.static(2),
            color1: $PropertyValue.static('B'),
            color2: $PropertyValue.static('F1'),
          },
        },
      },
      {
        type: 'processor',
        id: 'processor-1',
        name: 'Masked Effects',
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
                name: 'Radial Gradient',
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

  it('should extract source nodes from layers', () => {
    const config = createSimpleConfig()
    const result = generateAutoLayout(config)

    expect(result.sourceNodes).toHaveLength(1)
    expect(result.sourceNodes[0].id).toBe('surface-1')
    expect(result.sourceNodes[0].type).toBe('surface')
    expect(result.sourceNodes[0].column).toBe(0)
  })

  it('should create render node when layers exist', () => {
    const config = createSimpleConfig()
    const result = generateAutoLayout(config)

    expect(result.renderNode).not.toBeNull()
    expect(result.renderNode?.id).toBe('render')
    expect(result.renderNode?.type).toBe('render')
    // With single pipeline (no composite needed), render is at column 1
    expect(result.renderNode?.column).toBe(1)
  })

  it('should create direct source-to-render connection when no processor', () => {
    const config = createSimpleConfig()
    const result = generateAutoLayout(config)

    expect(result.connections).toHaveLength(1)
    expect(result.connections[0].from.nodeId).toBe('surface-1')
    expect(result.connections[0].to.nodeId).toBe('render')
  })

  it('should extract processor nodes', () => {
    const config = createConfigWithProcessor()
    const result = generateAutoLayout(config)

    // Top-level processors are now processed as pipelines of their modifiers
    // The processor node itself is not created; instead, effect/mask nodes are created
    // So processorNodes will be empty for top-level processors
    expect(result.processorNodes).toHaveLength(0)
    // But filterNodes should contain the effect
    expect(result.filterNodes).toHaveLength(1)
    expect(result.filterNodes[0].type).toBe('effect')
    expect(result.filterNodes[0].parentPipelineId).toBe('processor-1')
  })

  it('should extract filter nodes inside processor', () => {
    const config = createConfigWithProcessor()
    const result = generateAutoLayout(config)

    expect(result.filterNodes).toHaveLength(1)
    expect(result.filterNodes[0].type).toBe('effect')
    expect(result.filterNodes[0].label).toBe('Blur')
    expect(result.filterNodes[0].parentPipelineId).toBe('processor-1')
  })

  it('should create source-to-processor and processor-to-render connections', () => {
    const config = createConfigWithProcessor()
    const result = generateAutoLayout(config)

    // With current architecture:
    // - Top-level surface creates its own pipeline (surface → render via composite)
    // - Top-level processor creates effect pipeline (effect → render via composite)
    // - Both connect to composite, composite connects to render
    // Expected connections: surface → composite, effect → composite, composite → render
    expect(result.connections).toHaveLength(3)

    // Surface → Composite (since we have 2 pipelines)
    const surfaceToComposite = result.connections.find(
      (c) => c.from.nodeId === 'surface-1' && c.to.nodeId === 'composite'
    )
    expect(surfaceToComposite).toBeDefined()

    // Effect → Composite
    const effectToComposite = result.connections.find(
      (c) => c.from.nodeId === 'processor-1-effect-0' && c.to.nodeId === 'composite'
    )
    expect(effectToComposite).toBeDefined()

    // Composite → Render
    const compositeToRender = result.connections.find(
      (c) => c.from.nodeId === 'composite' && c.to.nodeId === 'render'
    )
    expect(compositeToRender).toBeDefined()
  })

  it('should extract mask and graymap nodes', () => {
    const config = createConfigWithMask()
    const result = generateAutoLayout(config)

    // Should have blur effect and mask
    expect(result.filterNodes).toHaveLength(2)

    const effectNode = result.filterNodes.find((f) => f.type === 'effect')
    expect(effectNode).toBeDefined()
    expect(effectNode?.label).toBe('Blur')

    const maskNode = result.filterNodes.find((f) => f.type === 'mask')
    expect(maskNode).toBeDefined()

    // Should have graymap for the mask
    expect(result.graymapNodes).toHaveLength(1)
    expect(result.graymapNodes[0].type).toBe('graymap')
    expect(result.graymapNodes[0].parentPipelineId).toBe('processor-1')
  })

  it('should connect multiple sources to the same junction point', () => {
    const config: HeroViewConfig = {
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
              params: { radius: $PropertyValue.static(4) },
            } satisfies SingleEffectConfig,
          ],
        },
      ],
      foreground: { elements: [] },
    }

    const result = generateAutoLayout(config)

    // With current architecture, each top-level layer forms its own pipeline:
    // - surface-1 → composite
    // - surface-2 → composite
    // - effect → composite
    // - composite → render
    // Total: 4
    expect(result.connections).toHaveLength(4)

    // Both sources connect to composite
    const sourceToComposite = result.connections.filter(
      (c) => c.to.nodeId === 'composite' && c.from.nodeId.startsWith('surface')
    )
    expect(sourceToComposite).toHaveLength(2)

    // Effect also connects to composite
    const effectToComposite = result.connections.find(
      (c) => c.to.nodeId === 'composite' && c.from.nodeId === 'processor-1-effect-0'
    )
    expect(effectToComposite).toBeDefined()
  })

  it('should skip invisible layers', () => {
    const config: HeroViewConfig = {
      viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'surface-visible',
          name: 'Visible',
          visible: true,
          surface: {
            id: 'solid',
            params: { color1: $PropertyValue.static('B') },
          },
        },
        {
          type: 'surface',
          id: 'surface-hidden',
          name: 'Hidden',
          visible: false,
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
      ],
      foreground: { elements: [] },
    }

    const result = generateAutoLayout(config)

    expect(result.sourceNodes).toHaveLength(1)
    expect(result.sourceNodes[0].id).toBe('surface-visible')
  })

  it('should flatten grouped layers', () => {
    const config: HeroViewConfig = {
      viewport: { width: HERO_CANVAS_WIDTH, height: HERO_CANVAS_HEIGHT },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'group',
          id: 'group-1',
          name: 'Background Group',
          visible: true,
          children: [
            {
              type: 'surface',
              id: 'nested-surface',
              name: 'Nested Surface',
              visible: true,
              surface: {
                id: 'solid',
                params: { color1: $PropertyValue.static('B') },
              },
            },
          ],
        },
      ],
      foreground: { elements: [] },
    }

    const result = generateAutoLayout(config)

    expect(result.sourceNodes).toHaveLength(1)
    expect(result.sourceNodes[0].id).toBe('nested-surface')
  })
})

describe('internal pipeline connections', () => {
  it('should create internal connections for single effect', () => {
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
          ],
        },
      ],
      foreground: { elements: [] },
    }

    const result = generateAutoLayout(config)

    // With current architecture (no pipeline nodes):
    // - surface-1 forms its own pipeline → composite
    // - processor-1's effect forms another pipeline → composite
    // - composite → render
    // Effect connects directly to composite (no internal pipeline left/right connections)

    // Find effect to composite connection
    const effectToComposite = result.connections.find(
      (c) => c.from.nodeId === 'processor-1-effect-0' && c.to.nodeId === 'composite'
    )
    expect(effectToComposite).toBeDefined()

    // Verify the effect node exists
    expect(result.filterNodes).toHaveLength(1)
    expect(result.filterNodes[0].id).toBe('processor-1-effect-0')
  })

  it('should create chain connections for multiple effects', () => {
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
          ],
        },
      ],
      foreground: { elements: [] },
    }

    const result = generateAutoLayout(config)

    // pipeline.left → blur → contrast → pipeline.right
    const blurToContrast = result.connections.find(
      (c) => c.from.nodeId === 'processor-1-effect-0' && c.to.nodeId === 'processor-1-effect-1'
    )
    expect(blurToContrast).toBeDefined()
  })

  it('should create graymap-to-mask connections', () => {
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
        {
          type: 'processor',
          id: 'processor-1',
          name: 'Masked',
          visible: true,
          modifiers: [
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
    }

    const result = generateAutoLayout(config)

    // graymap → mask (with portOffset 0.7)
    const graymapToMask = result.connections.find(
      (c) => c.from.nodeId === 'processor-1-graymap-0' && c.to.nodeId === 'processor-1-mask-0'
    )
    expect(graymapToMask).toBeDefined()
    expect(graymapToMask?.to.portOffset).toBe(0.7)

    // Mask (as first modifier with graymap) has no incoming connection from previous modifier
    // It connects directly to composite as the output of this processor pipeline
    const maskToComposite = result.connections.find(
      (c) => c.from.nodeId === 'processor-1-mask-0' && c.to.nodeId === 'composite'
    )
    expect(maskToComposite).toBeDefined()
  })

  it('should create effect-then-mask connections', () => {
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
        {
          type: 'processor',
          id: 'processor-1',
          name: 'EffectThenMask',
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
    }

    const result = generateAutoLayout(config)

    // blur → mask (main input, portOffset 0.3)
    const blurToMask = result.connections.find(
      (c) => c.from.nodeId === 'processor-1-effect-0' && c.to.nodeId === 'processor-1-mask-1'
    )
    expect(blurToMask).toBeDefined()
    expect(blurToMask?.to.portOffset).toBe(0.3)

    // graymap → mask
    const graymapToMask = result.connections.find(
      (c) => c.from.nodeId === 'processor-1-graymap-1' && c.to.nodeId === 'processor-1-mask-1'
    )
    expect(graymapToMask).toBeDefined()
    expect(graymapToMask?.to.portOffset).toBe(0.7)
  })
})

describe('useAutoLayout', () => {
  it('should return computed layout that updates with config', () => {
    const config = ref<HeroViewConfig>({
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
    })

    const layout = useAutoLayout(config)

    expect(layout.value.sourceNodes).toHaveLength(1)
    expect(layout.value.connections).toHaveLength(1)

    // Add a processor
    config.value = {
      ...config.value,
      layers: [
        ...config.value.layers,
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
          ],
        },
      ],
    }

    // Layout should update
    // With current architecture:
    // - surface → composite
    // - effect → composite
    // - composite → render
    // Total: 3 connections
    expect(layout.value.filterNodes).toHaveLength(1)
    expect(layout.value.connections).toHaveLength(3)
  })
})

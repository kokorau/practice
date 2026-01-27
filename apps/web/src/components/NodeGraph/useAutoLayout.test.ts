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
    expect(result.renderNode?.column).toBe(2)
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

    expect(result.processorNodes).toHaveLength(1)
    expect(result.processorNodes[0].id).toBe('processor-1')
    expect(result.processorNodes[0].type).toBe('processor')
    expect(result.processorNodes[0].column).toBe(1)
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

    expect(result.connections).toHaveLength(2)

    // Surface → Processor
    const surfaceToProcessor = result.connections.find(
      (c) => c.from.nodeId === 'surface-1' && c.to.nodeId === 'processor-1'
    )
    expect(surfaceToProcessor).toBeDefined()

    // Processor → Render
    const processorToRender = result.connections.find(
      (c) => c.from.nodeId === 'processor-1' && c.to.nodeId === 'render'
    )
    expect(processorToRender).toBeDefined()
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

  it('should calculate correct port offsets for multiple sources', () => {
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

    // Should have 3 connections: 2 sources → processor, processor → render
    expect(result.connections).toHaveLength(3)

    const sourceConnections = result.connections.filter((c) => c.to.nodeId === 'processor-1')
    expect(sourceConnections).toHaveLength(2)

    // First source should have offset 0.2
    const firstSourceConn = sourceConnections.find((c) => c.from.nodeId === 'surface-1')
    expect(firstSourceConn?.to.portOffset).toBe(0.2)

    // Second source should have offset 0.8
    const secondSourceConn = sourceConnections.find((c) => c.from.nodeId === 'surface-2')
    expect(secondSourceConn?.to.portOffset).toBe(0.8)
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
    expect(layout.value.processorNodes).toHaveLength(1)
    expect(layout.value.connections).toHaveLength(2)
  })
})

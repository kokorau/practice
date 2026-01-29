import { describe, it, expect } from 'vitest'
import {
  extractTrackIdsFromParams,
  extractTrackIdsFromHeroViewConfig,
  extractTrackIdsFromLayers,
} from './DependencyExtractor'
import { $PropertyValue, type PropertyValue } from './SectionVisual'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  GroupLayerNodeConfig,
} from './HeroViewConfig'

describe('extractTrackIdsFromParams', () => {
  it('extracts track ID from RangeExpr', () => {
    const params: Record<string, PropertyValue> = {
      radius: $PropertyValue.range('track-mask', 0.1, 0.5),
    }
    const trackIds = extractTrackIdsFromParams(params)
    expect(trackIds).toEqual(['track-mask'])
  })

  it('ignores static values', () => {
    const params: Record<string, PropertyValue> = {
      centerX: $PropertyValue.static(0.5),
      centerY: $PropertyValue.static(0.5),
    }
    const trackIds = extractTrackIdsFromParams(params)
    expect(trackIds).toEqual([])
  })

  it('extracts multiple track IDs', () => {
    const params: Record<string, PropertyValue> = {
      radius: $PropertyValue.range('track-radius', 0.1, 0.5),
      angle: $PropertyValue.range('track-angle', 0, 90),
      centerX: $PropertyValue.static(0.5),
    }
    const trackIds = extractTrackIdsFromParams(params)
    expect(trackIds).toContain('track-radius')
    expect(trackIds).toContain('track-angle')
    expect(trackIds).toHaveLength(2)
  })

  it('returns unique track IDs', () => {
    const params: Record<string, PropertyValue> = {
      width1: $PropertyValue.range('track-size', 10, 20),
      width2: $PropertyValue.range('track-size', 10, 20),
    }
    const trackIds = extractTrackIdsFromParams(params)
    expect(trackIds).toEqual(['track-size'])
  })

  it('returns empty array for empty params', () => {
    const trackIds = extractTrackIdsFromParams({})
    expect(trackIds).toEqual([])
  })
})

describe('extractTrackIdsFromLayers', () => {
  it('extracts from surface layer', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            angle: $PropertyValue.range('track-angle', 0, 90),
            width1: $PropertyValue.static(20),
          },
        },
      } as SurfaceLayerNodeConfig,
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toEqual(['track-angle'])
  })

  it('extracts from processor mask', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'processor',
        id: 'processor-1',
        name: 'Processor',
        visible: true,
        modifiers: [
          {
            type: 'mask',
            enabled: true,
            shape: {
              id: 'circle',
              params: {
                radius: $PropertyValue.range('track-mask-radius', 0.1, 0.5),
                centerX: $PropertyValue.static(0.5),
                centerY: $PropertyValue.static(0.5),
                cutout: $PropertyValue.static(false),
              },
            },
            feather: 0,
          },
        ],
      } as ProcessorNodeConfig,
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toEqual(['track-mask-radius'])
  })

  it('extracts from processor effect', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'processor',
        id: 'processor-1',
        name: 'Processor',
        visible: true,
        modifiers: [
          {
            type: 'effect',
            id: 'blur',
            params: {
              radius: $PropertyValue.range('track-blur', 0, 16),
            },
          },
        ],
      } as ProcessorNodeConfig,
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toEqual(['track-blur'])
  })

  it('extracts from group children recursively', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'group',
        id: 'group-1',
        name: 'Group',
        visible: true,
        children: [
          {
            type: 'surface',
            id: 'surface-1',
            name: 'Surface',
            visible: true,
            surface: {
              id: 'stripe',
              params: {
                angle: $PropertyValue.range('track-inner-angle', 0, 90),
              },
            },
          } as SurfaceLayerNodeConfig,
          {
            type: 'processor',
            id: 'processor-1',
            name: 'Processor',
            visible: true,
            modifiers: [
              {
                type: 'effect',
                id: 'vignette',
                params: {
                  intensity: $PropertyValue.range('track-vignette', 0, 1),
                },
              },
            ],
          } as ProcessorNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toContain('track-inner-angle')
    expect(trackIds).toContain('track-vignette')
    expect(trackIds).toHaveLength(2)
  })

  it('extracts from nested groups', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'group',
        id: 'outer-group',
        name: 'Outer',
        visible: true,
        children: [
          {
            type: 'group',
            id: 'inner-group',
            name: 'Inner',
            visible: true,
            children: [
              {
                type: 'surface',
                id: 'deep-surface',
                name: 'Deep Surface',
                visible: true,
                surface: {
                  id: 'solid',
                  params: {
                    color1: $PropertyValue.range('track-deep', 0, 1),
                  },
                },
              } as SurfaceLayerNodeConfig,
            ],
          } as GroupLayerNodeConfig,
        ],
      } as GroupLayerNodeConfig,
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toEqual(['track-deep'])
  })

  it('returns empty array for layers without RangeExpr', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface',
        visible: true,
        surface: {
          id: 'solid',
          params: {
            color1: $PropertyValue.static('B'),
          },
        },
      } as SurfaceLayerNodeConfig,
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toEqual([])
  })

  it('ignores text, image, model3d layers', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'text',
        id: 'text-1',
        name: 'Text',
        visible: true,
        text: 'Hello',
        fontFamily: 'sans-serif',
        fontSize: 24,
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.2,
        color: '#000',
        position: { x: 0.5, y: 0.5, anchor: 'center' },
        rotation: 0,
      },
      {
        type: 'image',
        id: 'image-1',
        name: 'Image',
        visible: true,
        imageId: 'test.png',
        mode: 'cover',
      },
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toEqual([])
  })

  it('combines track IDs from multiple sources', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'surface',
        id: 'surface-1',
        name: 'Surface',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            angle: $PropertyValue.range('track-angle', 0, 90),
          },
        },
      } as SurfaceLayerNodeConfig,
      {
        type: 'processor',
        id: 'processor-1',
        name: 'Processor',
        visible: true,
        modifiers: [
          {
            type: 'mask',
            enabled: true,
            shape: {
              id: 'circle',
              params: {
                radius: $PropertyValue.range('track-radius', 0.1, 0.5),
              },
            },
            feather: 0,
          },
          {
            type: 'effect',
            id: 'blur',
            params: {
              radius: $PropertyValue.range('track-blur', 0, 16),
            },
          },
        ],
      } as ProcessorNodeConfig,
    ]
    const trackIds = extractTrackIdsFromLayers(layers)
    expect(trackIds).toContain('track-angle')
    expect(trackIds).toContain('track-radius')
    expect(trackIds).toContain('track-blur')
    expect(trackIds).toHaveLength(3)
  })
})

describe('extractTrackIdsFromHeroViewConfig', () => {
  it('extracts track IDs from full config', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'bg',
          name: 'Background',
          visible: true,
          surface: {
            id: 'stripe',
            params: {
              angle: $PropertyValue.range('track-bg-angle', 0, 45),
            },
          },
        } as SurfaceLayerNodeConfig,
        {
          type: 'group',
          id: 'group',
          name: 'Group',
          visible: true,
          children: [
            {
              type: 'processor',
              id: 'proc',
              name: 'Processor',
              visible: true,
              modifiers: [
                {
                  type: 'mask',
                  enabled: true,
                  shape: {
                    id: 'circle',
                    params: {
                      radius: $PropertyValue.range('track-mask', 0.1, 0.5),
                    },
                  },
                  feather: 0,
                },
              ],
            } as ProcessorNodeConfig,
          ],
        } as GroupLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const trackIds = extractTrackIdsFromHeroViewConfig(config)
    expect(trackIds).toContain('track-bg-angle')
    expect(trackIds).toContain('track-mask')
    expect(trackIds).toHaveLength(2)
  })

  it('returns empty array for config without RangeExpr', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'bg',
          name: 'Background',
          visible: true,
          surface: {
            id: 'solid',
            params: {
              color1: $PropertyValue.static('B'),
            },
          },
        } as SurfaceLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const trackIds = extractTrackIdsFromHeroViewConfig(config)
    expect(trackIds).toEqual([])
  })
})

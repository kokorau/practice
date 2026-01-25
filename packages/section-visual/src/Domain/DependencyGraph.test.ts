import { describe, it, expect } from 'vitest'
import {
  buildDependencyGraph,
  buildDependencyGraphFromLayers,
  getSourcesForTrack,
  hasTrackDependency,
  getAllTrackIds,
  getTrackDependencyCounts,
  groupSourcesByType,
  getLayersWithDependencies,
  type DependencySource,
} from './DependencyGraph'
import { $PropertyValue } from './SectionVisual'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  GroupLayerNodeConfig,
} from './HeroViewConfig'

describe('buildDependencyGraph', () => {
  it('builds graph from surface layer', () => {
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
              angle: $PropertyValue.range('track-angle', 0, 90),
              width1: $PropertyValue.static(20),
            },
          },
        } as SurfaceLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)

    expect(graph.allTrackIds.has('track-angle')).toBe(true)
    expect(graph.allTrackIds.size).toBe(1)

    const dep = graph.dependencies.get('track-angle')
    expect(dep).toBeDefined()
    expect(dep!.sources).toHaveLength(1)
    expect(dep!.sources[0]).toEqual({
      type: 'surface',
      layerId: 'bg',
      layerName: 'Background',
      paramName: 'angle',
    })
  })

  it('builds graph from processor mask', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
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
                  centerX: $PropertyValue.static(0.5),
                },
              },
              invert: false,
              feather: 0,
            },
          ],
        } as ProcessorNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)

    expect(graph.allTrackIds.has('track-mask')).toBe(true)

    const dep = graph.dependencies.get('track-mask')
    expect(dep!.sources[0]).toEqual({
      type: 'mask',
      layerId: 'proc',
      layerName: 'Processor',
      paramName: 'radius',
    })
  })

  it('builds graph from processor effect', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'processor',
          id: 'proc',
          name: 'Effects',
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
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)

    expect(graph.allTrackIds.has('track-blur')).toBe(true)

    const dep = graph.dependencies.get('track-blur')
    expect(dep!.sources[0]).toEqual({
      type: 'effect',
      layerId: 'proc',
      layerName: 'Effects',
      paramName: 'radius',
    })
  })

  it('builds graph from nested group layers', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'group',
          id: 'group',
          name: 'Group',
          visible: true,
          children: [
            {
              type: 'surface',
              id: 'inner-surface',
              name: 'Inner Surface',
              visible: true,
              surface: {
                id: 'stripe',
                params: {
                  angle: $PropertyValue.range('track-inner', 0, 45),
                },
              },
            } as SurfaceLayerNodeConfig,
          ],
        } as GroupLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)

    expect(graph.allTrackIds.has('track-inner')).toBe(true)

    const dep = graph.dependencies.get('track-inner')
    expect(dep!.sources[0].layerId).toBe('inner-surface')
  })

  it('handles multiple sources for the same track', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'surface1',
          name: 'Surface 1',
          visible: true,
          surface: {
            id: 'stripe',
            params: {
              angle: $PropertyValue.range('shared-track', 0, 90),
            },
          },
        } as SurfaceLayerNodeConfig,
        {
          type: 'surface',
          id: 'surface2',
          name: 'Surface 2',
          visible: true,
          surface: {
            id: 'stripe',
            params: {
              angle: $PropertyValue.range('shared-track', 10, 80),
            },
          },
        } as SurfaceLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)

    expect(graph.allTrackIds.size).toBe(1)

    const dep = graph.dependencies.get('shared-track')
    expect(dep!.sources).toHaveLength(2)
    expect(dep!.sources[0].layerId).toBe('surface1')
    expect(dep!.sources[1].layerId).toBe('surface2')
  })

  it('returns empty graph for config without dependencies', () => {
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

    const graph = buildDependencyGraph(config)

    expect(graph.allTrackIds.size).toBe(0)
    expect(graph.dependencies.size).toBe(0)
  })
})

describe('buildDependencyGraphFromLayers', () => {
  it('builds graph from layers array', () => {
    const layers: LayerNodeConfig[] = [
      {
        type: 'surface',
        id: 'bg',
        name: 'Background',
        visible: true,
        surface: {
          id: 'stripe',
          params: {
            angle: $PropertyValue.range('track-a', 0, 90),
          },
        },
      } as SurfaceLayerNodeConfig,
    ]

    const graph = buildDependencyGraphFromLayers(layers)

    expect(graph.allTrackIds.has('track-a')).toBe(true)
  })
})

describe('getSourcesForTrack', () => {
  it('returns sources for existing track', () => {
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
              angle: $PropertyValue.range('track-a', 0, 90),
            },
          },
        } as SurfaceLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)
    const sources = getSourcesForTrack(graph, 'track-a')

    expect(sources).toHaveLength(1)
    expect(sources[0].layerId).toBe('bg')
  })

  it('returns empty array for non-existent track', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)
    const sources = getSourcesForTrack(graph, 'non-existent')

    expect(sources).toEqual([])
  })
})

describe('hasTrackDependency', () => {
  it('returns true for existing track', () => {
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
              angle: $PropertyValue.range('track-a', 0, 90),
            },
          },
        } as SurfaceLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)

    expect(hasTrackDependency(graph, 'track-a')).toBe(true)
  })

  it('returns false for non-existent track', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)

    expect(hasTrackDependency(graph, 'non-existent')).toBe(false)
  })
})

describe('getAllTrackIds', () => {
  it('returns all track IDs as array', () => {
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
              angle: $PropertyValue.range('track-a', 0, 90),
              width1: $PropertyValue.range('track-b', 10, 20),
            },
          },
        } as SurfaceLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)
    const trackIds = getAllTrackIds(graph)

    expect(trackIds).toContain('track-a')
    expect(trackIds).toContain('track-b')
    expect(trackIds).toHaveLength(2)
  })
})

describe('getTrackDependencyCounts', () => {
  it('returns correct counts', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'surface1',
          name: 'Surface 1',
          visible: true,
          surface: {
            id: 'stripe',
            params: {
              angle: $PropertyValue.range('shared-track', 0, 90),
            },
          },
        } as SurfaceLayerNodeConfig,
        {
          type: 'surface',
          id: 'surface2',
          name: 'Surface 2',
          visible: true,
          surface: {
            id: 'stripe',
            params: {
              angle: $PropertyValue.range('shared-track', 10, 80),
              width1: $PropertyValue.range('unique-track', 10, 20),
            },
          },
        } as SurfaceLayerNodeConfig,
      ],
      foreground: { elements: [] },
    }

    const graph = buildDependencyGraph(config)
    const counts = getTrackDependencyCounts(graph)

    expect(counts.get('shared-track')).toBe(2)
    expect(counts.get('unique-track')).toBe(1)
  })
})

describe('groupSourcesByType', () => {
  it('groups sources by type correctly', () => {
    const sources: DependencySource[] = [
      { type: 'surface', layerId: 'l1', layerName: 'Layer 1', paramName: 'angle' },
      { type: 'mask', layerId: 'l2', layerName: 'Layer 2', paramName: 'radius' },
      { type: 'effect', layerId: 'l3', layerName: 'Layer 3', paramName: 'blur' },
      { type: 'surface', layerId: 'l4', layerName: 'Layer 4', paramName: 'width' },
    ]

    const grouped = groupSourcesByType(sources)

    expect(grouped.surface).toHaveLength(2)
    expect(grouped.mask).toHaveLength(1)
    expect(grouped.effect).toHaveLength(1)
  })

  it('returns empty arrays for missing types', () => {
    const sources: DependencySource[] = [
      { type: 'surface', layerId: 'l1', layerName: 'Layer 1', paramName: 'angle' },
    ]

    const grouped = groupSourcesByType(sources)

    expect(grouped.surface).toHaveLength(1)
    expect(grouped.mask).toEqual([])
    expect(grouped.effect).toEqual([])
  })
})

describe('getLayersWithDependencies', () => {
  it('returns layer IDs that have dependencies', () => {
    const config: HeroViewConfig = {
      viewport: { width: 1280, height: 720 },
      colors: { semanticContext: 'canvas' },
      layers: [
        {
          type: 'surface',
          id: 'bg-with-deps',
          name: 'Background',
          visible: true,
          surface: {
            id: 'stripe',
            params: {
              angle: $PropertyValue.range('track-a', 0, 90),
            },
          },
        } as SurfaceLayerNodeConfig,
        {
          type: 'surface',
          id: 'bg-no-deps',
          name: 'No Deps',
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

    const graph = buildDependencyGraph(config)
    const layerIds = getLayersWithDependencies(graph)

    expect(layerIds.has('bg-with-deps')).toBe(true)
    expect(layerIds.has('bg-no-deps')).toBe(false)
  })
})

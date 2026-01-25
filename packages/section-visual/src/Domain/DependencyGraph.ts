/**
 * DependencyGraph
 *
 * Build and manage dependency graphs between Timeline tracks and Section-Visual configurations.
 */

import type { PropertyValue, RangeExpr } from './SectionVisual'
import { $PropertyValue } from './SectionVisual'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  SurfaceLayerNodeConfig,
  ProcessorNodeConfig,
  GroupLayerNodeConfig,
  ProcessorConfig,
  MaskProcessorConfig,
  SingleEffectConfig,
} from './HeroViewConfig'

/**
 * Type of dependency source.
 */
export type DependencySourceType = 'surface' | 'mask' | 'effect'

/**
 * Describes the source of a track dependency within a HeroViewConfig.
 */
export interface DependencySource {
  /** Type of source (surface, mask, or effect) */
  type: DependencySourceType
  /** ID of the layer containing this source */
  layerId: string
  /** Display name of the layer */
  layerName: string
  /** Parameter name that references the track */
  paramName: string
}

/**
 * Represents all dependencies for a single timeline track.
 */
export interface TrackDependency {
  /** Timeline track ID */
  trackId: string
  /** All sources that reference this track */
  sources: DependencySource[]
}

/**
 * Complete dependency graph for a HeroViewConfig.
 */
export interface DependencyGraph {
  /** Map of track ID to its dependency information */
  dependencies: Map<string, TrackDependency>
  /** Set of all unique track IDs referenced */
  allTrackIds: Set<string>
}

/**
 * Check if a PropertyValue is a RangeExpr
 */
function isRangeExpr(value: PropertyValue): value is RangeExpr {
  return $PropertyValue.isRange(value)
}

/**
 * Add dependencies from params to the graph.
 */
function addDependenciesFromParams(
  graph: DependencyGraph,
  params: Record<string, PropertyValue>,
  sourceType: DependencySourceType,
  layerId: string,
  layerName: string
): void {
  for (const [paramName, value] of Object.entries(params)) {
    if (isRangeExpr(value)) {
      const trackId = value.trackId
      graph.allTrackIds.add(trackId)

      if (!graph.dependencies.has(trackId)) {
        graph.dependencies.set(trackId, {
          trackId,
          sources: [],
        })
      }

      graph.dependencies.get(trackId)!.sources.push({
        type: sourceType,
        layerId,
        layerName,
        paramName,
      })
    }
  }
}

/**
 * Add dependencies from a ProcessorConfig (effect or mask).
 */
function addDependenciesFromProcessorConfig(
  graph: DependencyGraph,
  config: ProcessorConfig,
  layerId: string,
  layerName: string
): void {
  if (config.type === 'effect') {
    const effectConfig = config as SingleEffectConfig
    addDependenciesFromParams(graph, effectConfig.params, 'effect', layerId, layerName)
  } else if (config.type === 'mask') {
    const maskConfig = config as MaskProcessorConfig
    addDependenciesFromParams(graph, maskConfig.shape.params, 'mask', layerId, layerName)
  }
}

/**
 * Add dependencies from a single LayerNodeConfig.
 */
function addDependenciesFromLayer(
  graph: DependencyGraph,
  layer: LayerNodeConfig
): void {
  switch (layer.type) {
    case 'base':
    case 'surface': {
      const surfaceLayer = layer as SurfaceLayerNodeConfig
      addDependenciesFromParams(
        graph,
        surfaceLayer.surface.params,
        'surface',
        layer.id,
        layer.name
      )
      break
    }
    case 'processor': {
      const processorLayer = layer as ProcessorNodeConfig
      for (const modifier of processorLayer.modifiers) {
        addDependenciesFromProcessorConfig(graph, modifier, layer.id, layer.name)
      }
      break
    }
    case 'group': {
      const groupLayer = layer as GroupLayerNodeConfig
      for (const child of groupLayer.children) {
        addDependenciesFromLayer(graph, child)
      }
      break
    }
    // text, image, model3d layers don't currently have RangeExpr params
    case 'text':
    case 'image':
    case 'model3d':
      break
  }
}

/**
 * Build a dependency graph from a HeroViewConfig.
 *
 * Traverses the entire layer tree and collects dependency information
 * including the source (surface/mask/effect), layer location, and parameter name.
 *
 * @param config - HeroViewConfig to analyze
 * @returns DependencyGraph with all track dependencies
 *
 * @example
 * const config = {
 *   layers: [
 *     {
 *       type: 'surface',
 *       id: 'bg',
 *       name: 'Background',
 *       surface: {
 *         params: { angle: { type: 'range', trackId: 'track-angle', min: 0, max: 90 } }
 *       }
 *     },
 *     {
 *       type: 'processor',
 *       id: 'proc',
 *       name: 'Processor',
 *       modifiers: [
 *         {
 *           type: 'mask',
 *           shape: {
 *             params: { radius: { type: 'range', trackId: 'track-radius', min: 0.1, max: 0.5 } }
 *           }
 *         }
 *       ]
 *     }
 *   ]
 * }
 * const graph = buildDependencyGraph(config)
 * // graph.allTrackIds = Set { 'track-angle', 'track-radius' }
 * // graph.dependencies.get('track-angle') = {
 * //   trackId: 'track-angle',
 * //   sources: [{ type: 'surface', layerId: 'bg', layerName: 'Background', paramName: 'angle' }]
 * // }
 */
export function buildDependencyGraph(config: HeroViewConfig): DependencyGraph {
  const graph: DependencyGraph = {
    dependencies: new Map(),
    allTrackIds: new Set(),
  }

  for (const layer of config.layers) {
    addDependenciesFromLayer(graph, layer)
  }

  return graph
}

/**
 * Build a dependency graph from a layers array.
 *
 * @param layers - Array of LayerNodeConfig to analyze
 * @returns DependencyGraph with all track dependencies
 */
export function buildDependencyGraphFromLayers(layers: LayerNodeConfig[]): DependencyGraph {
  const graph: DependencyGraph = {
    dependencies: new Map(),
    allTrackIds: new Set(),
  }

  for (const layer of layers) {
    addDependenciesFromLayer(graph, layer)
  }

  return graph
}

/**
 * Get all sources that depend on a specific track.
 *
 * @param graph - DependencyGraph to query
 * @param trackId - Track ID to look up
 * @returns Array of DependencySource, or empty array if track not found
 */
export function getSourcesForTrack(
  graph: DependencyGraph,
  trackId: string
): DependencySource[] {
  const dependency = graph.dependencies.get(trackId)
  return dependency?.sources ?? []
}

/**
 * Check if a track is referenced in the dependency graph.
 *
 * @param graph - DependencyGraph to query
 * @param trackId - Track ID to check
 * @returns true if the track is referenced
 */
export function hasTrackDependency(graph: DependencyGraph, trackId: string): boolean {
  return graph.allTrackIds.has(trackId)
}

/**
 * Get all track IDs as an array.
 *
 * @param graph - DependencyGraph to query
 * @returns Array of track IDs
 */
export function getAllTrackIds(graph: DependencyGraph): string[] {
  return Array.from(graph.allTrackIds)
}

/**
 * Get dependency count for each track.
 *
 * @param graph - DependencyGraph to query
 * @returns Map of track ID to number of sources referencing it
 */
export function getTrackDependencyCounts(graph: DependencyGraph): Map<string, number> {
  const counts = new Map<string, number>()
  for (const [trackId, dep] of graph.dependencies) {
    counts.set(trackId, dep.sources.length)
  }
  return counts
}

/**
 * Group sources by their type.
 *
 * @param sources - Array of DependencySource
 * @returns Object with sources grouped by type
 */
export function groupSourcesByType(
  sources: DependencySource[]
): Record<DependencySourceType, DependencySource[]> {
  const grouped: Record<DependencySourceType, DependencySource[]> = {
    surface: [],
    mask: [],
    effect: [],
  }

  for (const source of sources) {
    grouped[source.type].push(source)
  }

  return grouped
}

/**
 * Get all layers that have dependencies.
 *
 * @param graph - DependencyGraph to query
 * @returns Set of layer IDs that have at least one dependency
 */
export function getLayersWithDependencies(graph: DependencyGraph): Set<string> {
  const layerIds = new Set<string>()
  for (const dep of graph.dependencies.values()) {
    for (const source of dep.sources) {
      layerIds.add(source.layerId)
    }
  }
  return layerIds
}

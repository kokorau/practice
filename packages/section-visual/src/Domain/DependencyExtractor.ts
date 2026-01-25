/**
 * DependencyExtractor
 *
 * Extract timeline track IDs from Section-Visual configuration structures.
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
 * Check if a PropertyValue is a RangeExpr
 */
function isRangeExpr(value: PropertyValue): value is RangeExpr {
  return $PropertyValue.isRange(value)
}

/**
 * Extract track IDs from a params object containing PropertyValue entries.
 *
 * @param params - Record of parameter name to PropertyValue
 * @returns Array of unique track IDs found in RangeExpr values
 *
 * @example
 * const params = {
 *   radius: { type: 'range', trackId: 'track-mask', min: 0.1, max: 0.5 },
 *   centerX: { type: 'static', value: 0.5 },
 * }
 * extractTrackIdsFromParams(params) // → ['track-mask']
 */
export function extractTrackIdsFromParams(
  params: Record<string, PropertyValue>
): string[] {
  const trackIds = new Set<string>()

  for (const value of Object.values(params)) {
    if (isRangeExpr(value)) {
      trackIds.add(value.trackId)
    }
  }

  return Array.from(trackIds)
}

/**
 * Extract track IDs from a ProcessorConfig (effect or mask).
 *
 * @param config - ProcessorConfig (SingleEffectConfig or MaskProcessorConfig)
 * @returns Array of unique track IDs
 */
function extractTrackIdsFromProcessorConfig(
  config: ProcessorConfig,
  extractFromLayer: (layer: LayerNodeConfig) => string[]
): string[] {
  const trackIds = new Set<string>()

  if (config.type === 'effect') {
    const effectConfig = config as SingleEffectConfig
    for (const trackId of extractTrackIdsFromParams(effectConfig.params)) {
      trackIds.add(trackId)
    }
  } else if (config.type === 'mask') {
    const maskConfig = config as MaskProcessorConfig
    // Extract track IDs from mask children layers
    for (const child of maskConfig.children) {
      for (const trackId of extractFromLayer(child)) {
        trackIds.add(trackId)
      }
    }
  }

  return Array.from(trackIds)
}

/**
 * Extract track IDs from a single LayerNodeConfig.
 *
 * @param layer - LayerNodeConfig to extract from
 * @returns Array of unique track IDs
 */
function extractTrackIdsFromLayer(layer: LayerNodeConfig): string[] {
  const trackIds = new Set<string>()

  switch (layer.type) {
    case 'base':
    case 'surface': {
      const surfaceLayer = layer as SurfaceLayerNodeConfig
      for (const trackId of extractTrackIdsFromParams(surfaceLayer.surface.params)) {
        trackIds.add(trackId)
      }
      break
    }
    case 'processor': {
      const processorLayer = layer as ProcessorNodeConfig
      for (const modifier of processorLayer.modifiers) {
        for (const trackId of extractTrackIdsFromProcessorConfig(modifier, extractTrackIdsFromLayer)) {
          trackIds.add(trackId)
        }
      }
      break
    }
    case 'group': {
      const groupLayer = layer as GroupLayerNodeConfig
      for (const child of groupLayer.children) {
        for (const trackId of extractTrackIdsFromLayer(child)) {
          trackIds.add(trackId)
        }
      }
      break
    }
    // text, image, model3d layers don't currently have RangeExpr params
    case 'text':
    case 'image':
    case 'model3d':
      break
  }

  return Array.from(trackIds)
}

/**
 * Extract all track IDs from a HeroViewConfig.
 *
 * Traverses the entire layer tree and collects track IDs from:
 * - Surface layer params
 * - Processor mask shape params
 * - Processor effect params
 * - Group layer children (recursively)
 *
 * @param config - HeroViewConfig to extract from
 * @returns Array of unique track IDs found in the configuration
 *
 * @example
 * const config = {
 *   layers: [
 *     {
 *       type: 'surface',
 *       surface: { id: 'stripe', params: { angle: { type: 'range', trackId: 'track-angle', min: 0, max: 90 } } }
 *     },
 *     {
 *       type: 'processor',
 *       modifiers: [
 *         { type: 'mask', shape: { params: { radius: { type: 'range', trackId: 'track-radius', min: 0.1, max: 0.5 } } } }
 *       ]
 *     }
 *   ],
 *   // ...other config
 * }
 * extractTrackIdsFromHeroViewConfig(config) // → ['track-angle', 'track-radius']
 */
export function extractTrackIdsFromHeroViewConfig(config: HeroViewConfig): string[] {
  const trackIds = new Set<string>()

  for (const layer of config.layers) {
    for (const trackId of extractTrackIdsFromLayer(layer)) {
      trackIds.add(trackId)
    }
  }

  return Array.from(trackIds)
}

/**
 * Extract track IDs from layers array.
 *
 * @param layers - Array of LayerNodeConfig to extract from
 * @returns Array of unique track IDs
 */
export function extractTrackIdsFromLayers(layers: LayerNodeConfig[]): string[] {
  const trackIds = new Set<string>()

  for (const layer of layers) {
    for (const trackId of extractTrackIdsFromLayer(layer)) {
      trackIds.add(trackId)
    }
  }

  return Array.from(trackIds)
}

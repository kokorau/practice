/**
 * extractPartialConfig
 *
 * 指定されたノードIDまでの部分的なHeroViewConfigを抽出する
 * NodeGraphのノードIDからHeroViewConfigの対応部分を特定し、
 * そこまでのパイプラインのみを含む新しいConfigを生成する
 *
 * Node ID patterns:
 * - `surface-1`, `image-1` etc: レイヤーID
 * - `processor-1`: プロセッサーID
 * - `processor-1-effect-0`: プロセッサー内エフェクト (mIndex=0)
 * - `processor-1-mask-1`: プロセッサー内マスク (mIndex=1)
 * - `processor-1-graymap-1`: プロセッサー内グレイマップ (mIndex=1)
 * - `render`: 最終出力
 */

import { computed, type Ref, unref, type MaybeRef } from 'vue'
import type {
  HeroViewConfig,
  LayerNodeConfig,
  ProcessorNodeConfig,
} from '@practice/section-visual'

export interface PartialConfigResult {
  /** 部分的なHeroViewConfig */
  config: HeroViewConfig
  /** ターゲットノードが見つかったかどうか */
  found: boolean
}

/**
 * Parse node ID to extract processor info
 */
interface ParsedNodeId {
  type: 'source' | 'processor' | 'effect' | 'mask' | 'graymap' | 'render'
  layerId?: string
  processorId?: string
  modifierIndex?: number
}

function parseNodeId(nodeId: string): ParsedNodeId {
  // render
  if (nodeId === 'render') {
    return { type: 'render' }
  }

  // processor-x-effect-y or processor-x-mask-y or processor-x-graymap-y
  const internalMatch = nodeId.match(/^(.+)-(effect|mask|graymap)-(\d+)$/)
  if (internalMatch) {
    const [, processorId, modType, indexStr] = internalMatch
    return {
      type: modType as 'effect' | 'mask' | 'graymap',
      processorId,
      modifierIndex: parseInt(indexStr, 10),
    }
  }

  // Could be a processor or source layer
  return {
    type: 'source', // Will be determined by layer lookup
    layerId: nodeId,
  }
}

/**
 * Find layer index in layers array (including nested groups)
 */
function findLayerIndex(
  layers: LayerNodeConfig[],
  layerId: string
): { index: number; isProcessor: boolean } | null {
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    if (layer.id === layerId) {
      return { index: i, isProcessor: layer.type === 'processor' }
    }
    // Check nested groups
    if (layer.type === 'group') {
      const nested = findLayerIndex(layer.children, layerId)
      if (nested) {
        // Return the group's index, as we need all layers up to the group
        return { index: i, isProcessor: false }
      }
    }
  }
  return null
}

/**
 * Find processor by ID and return its index
 */
function findProcessorIndex(
  layers: LayerNodeConfig[],
  processorId: string
): number {
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    if (layer.type === 'processor' && layer.id === processorId) {
      return i
    }
    if (layer.type === 'group') {
      // Check nested processors
      const nested = findProcessorIndex(layer.children, processorId)
      if (nested !== -1) {
        return i // Return group index
      }
    }
  }
  return -1
}

/**
 * Deep clone a layer, optionally truncating processor modifiers
 */
function cloneLayerWithModifiers(
  layer: LayerNodeConfig,
  processorId?: string,
  maxModifierIndex?: number
): LayerNodeConfig {
  if (layer.type === 'processor') {
    if (layer.id === processorId && maxModifierIndex !== undefined) {
      return {
        ...layer,
        modifiers: layer.modifiers.slice(0, maxModifierIndex + 1),
      }
    }
    return { ...layer, modifiers: [...layer.modifiers] }
  }

  if (layer.type === 'group') {
    return {
      ...layer,
      children: layer.children.map((child) =>
        cloneLayerWithModifiers(child, processorId, maxModifierIndex)
      ),
    }
  }

  return { ...layer }
}

/**
 * Extract a partial HeroViewConfig up to the specified node
 *
 * @param config - Full HeroViewConfig
 * @param targetNodeId - Target node ID from NodeGraph
 * @returns Partial HeroViewConfig containing only upstream layers
 *
 * @example
 * ```typescript
 * // Extract config up to the first effect
 * const partial = extractPartialConfig(config, 'processor-1-effect-0')
 *
 * // Render the partial config
 * await renderHeroConfig(renderer, partial.config, palette, { scale: 0.3 })
 * ```
 */
export function extractPartialConfig(
  config: HeroViewConfig,
  targetNodeId: string
): PartialConfigResult {
  const parsed = parseNodeId(targetNodeId)

  // render: return full config
  if (parsed.type === 'render') {
    return {
      config: {
        ...config,
        layers: config.layers.map((l) => cloneLayerWithModifiers(l)),
        foreground: { elements: [] },
      },
      found: true,
    }
  }

  // Source layer (surface, image, etc.)
  if (parsed.type === 'source' && parsed.layerId) {
    const result = findLayerIndex(config.layers, parsed.layerId)

    if (!result) {
      // Not found as source, might be a processor ID
      const processorIndex = findProcessorIndex(config.layers, parsed.layerId)
      if (processorIndex !== -1) {
        // It's a processor - include all layers up to and including the processor
        return {
          config: {
            ...config,
            layers: config.layers
              .slice(0, processorIndex + 1)
              .map((l) => cloneLayerWithModifiers(l)),
            foreground: { elements: [] },
          },
          found: true,
        }
      }

      // Not found
      return {
        config: {
          ...config,
          layers: [],
          foreground: { elements: [] },
        },
        found: false,
      }
    }

    if (result.isProcessor) {
      // Target is a processor - include all layers up to and including it
      return {
        config: {
          ...config,
          layers: config.layers
            .slice(0, result.index + 1)
            .map((l) => cloneLayerWithModifiers(l)),
          foreground: { elements: [] },
        },
        found: true,
      }
    }

    // Source layer - include only up to this layer (no processors)
    // Find all source layers up to this one
    const sourceLayers: LayerNodeConfig[] = []
    for (let i = 0; i <= result.index; i++) {
      const layer = config.layers[i]
      if (layer.type !== 'processor') {
        sourceLayers.push(cloneLayerWithModifiers(layer))
      }
    }

    return {
      config: {
        ...config,
        layers: sourceLayers,
        foreground: { elements: [] },
      },
      found: true,
    }
  }

  // Internal processor node (effect, mask, graymap)
  if (
    (parsed.type === 'effect' ||
      parsed.type === 'mask' ||
      parsed.type === 'graymap') &&
    parsed.processorId !== undefined &&
    parsed.modifierIndex !== undefined
  ) {
    const processorIndex = findProcessorIndex(config.layers, parsed.processorId)

    if (processorIndex === -1) {
      return {
        config: {
          ...config,
          layers: [],
          foreground: { elements: [] },
        },
        found: false,
      }
    }

    // Include all layers up to the processor, with truncated modifiers
    const layers = config.layers.slice(0, processorIndex + 1).map((l) =>
      cloneLayerWithModifiers(l, parsed.processorId, parsed.modifierIndex)
    )

    return {
      config: {
        ...config,
        layers,
        foreground: { elements: [] },
      },
      found: true,
    }
  }

  // Unknown pattern
  return {
    config: {
      ...config,
      layers: [],
      foreground: { elements: [] },
    },
    found: false,
  }
}

/**
 * usePartialConfig composable
 *
 * Reactively extracts partial config for a target node
 *
 * @param config - Reactive HeroViewConfig reference
 * @param targetNodeId - Target node ID (can be reactive)
 * @returns Computed partial config result
 *
 * @example
 * ```typescript
 * const config = ref<HeroViewConfig>(...)
 * const targetId = ref('processor-1-effect-0')
 * const partial = usePartialConfig(config, targetId)
 *
 * // partial.value.config can be used for rendering
 * ```
 */
export function usePartialConfig(
  config: Ref<HeroViewConfig>,
  targetNodeId: MaybeRef<string>
) {
  return computed(() => extractPartialConfig(config.value, unref(targetNodeId)))
}

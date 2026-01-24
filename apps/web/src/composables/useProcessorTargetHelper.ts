import type { LayerNodeConfig } from '@practice/section-visual'
import { isProcessorLayerConfig } from '@practice/section-visual'

/**
 * Check if a layer at the given index is the first Processor target
 * (shows arrow head at top).
 *
 * A layer is a processor target if:
 * 1. It's not a processor itself
 * 2. There's a processor after it in the sibling list
 * 3. It's the first non-processor element in the list
 *
 * @param layers - Array of sibling layers
 * @param index - Index of the layer to check
 * @returns true if the layer should display the arrow head
 */
export function isProcessorTarget(layers: LayerNodeConfig[], index: number): boolean {
  const layer = layers[index]
  if (!layer || isProcessorLayerConfig(layer)) return false

  // Check if there's a Processor after this element
  let hasProcessorAfter = false
  for (let i = index + 1; i < layers.length; i++) {
    const sibling = layers[i]
    if (sibling && isProcessorLayerConfig(sibling)) {
      hasProcessorAfter = true
      break
    }
  }
  if (!hasProcessorAfter) return false

  // Check if this is the first non-processor element before a Processor
  for (let i = 0; i < index; i++) {
    const sibling = layers[i]
    if (sibling && !isProcessorLayerConfig(sibling)) {
      return false
    }
  }
  return true
}

/**
 * Check if a layer has a Processor below but is not the first target
 * (shows vertical line only, no arrow head).
 *
 * @param layers - Array of sibling layers
 * @param index - Index of the layer to check
 * @returns true if the layer should display only the vertical line
 */
export function hasProcessorBelow(layers: LayerNodeConfig[], index: number): boolean {
  const layer = layers[index]
  if (!layer || isProcessorLayerConfig(layer)) return false

  // Check if there's a Processor after this element
  let hasProcessorAfter = false
  for (let i = index + 1; i < layers.length; i++) {
    const sibling = layers[i]
    if (sibling && isProcessorLayerConfig(sibling)) {
      hasProcessorAfter = true
      break
    }
  }
  if (!hasProcessorAfter) return false

  // If this is the first target, it gets the arrow head, not the line
  if (isProcessorTarget(layers, index)) return false

  return true
}

/**
 * Composable that provides processor target helper functions
 * bound to a specific layers array.
 *
 * @param getLayers - Function that returns the current layers array
 * @returns Object with helper functions
 */
export function useProcessorTargetHelper(getLayers: () => LayerNodeConfig[]) {
  return {
    /**
     * Check if a layer at the given index is the first Processor target
     */
    isProcessorTarget: (index: number) => isProcessorTarget(getLayers(), index),

    /**
     * Check if a layer has a Processor below but is not the first target
     */
    hasProcessorBelow: (index: number) => hasProcessorBelow(getLayers(), index),
  }
}

import type { LayerNodeConfig } from '@practice/section-visual'
import { isProcessorTarget, hasProcessorBelow } from '@practice/section-visual'

// Re-export pure functions for backward compatibility
export { isProcessorTarget, hasProcessorBelow } from '@practice/section-visual'

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

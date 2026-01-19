import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { HeroViewConfig, TextLayerNodeConfigType, LayerNodeConfig, TextLayerConfig } from '@practice/section-visual'

// ============================================================
// Types
// ============================================================

// TextLayerConfig is imported from HeroScene module
export type { TextLayerConfig }

/**
 * Options for useTextLayerEditor composable
 */
export interface UseTextLayerEditorOptions {
  /** HeroViewConfig containing layers */
  heroViewConfig: Ref<HeroViewConfig> | ComputedRef<HeroViewConfig>
  /** Callback to update text layer config in scene */
  onUpdateConfig: (id: string, updates: Partial<TextLayerConfig>) => void
}

/**
 * Flattened update object for text layer config
 * Position fields (x, y, anchor) are at top level for easier binding
 */
export interface TextLayerConfigUpdate {
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  color?: string
  x?: number
  y?: number
  anchor?: string
  rotation?: number
}

/**
 * Return type for useTextLayerEditor composable
 */
export interface UseTextLayerEditorReturn {
  /** Currently selected text layer ID */
  selectedTextLayerId: Ref<string | null>
  /** Config of the currently selected text layer */
  selectedTextLayerConfig: ComputedRef<TextLayerConfig | null>
  /** Select a text layer by ID */
  selectTextLayer: (id: string | null) => void
  /** Update the selected text layer config */
  updateTextLayerConfig: (updates: TextLayerConfigUpdate) => void
}

// ============================================================
// Composable
// ============================================================

/**
 * Composable for managing text layer editing state and operations
 *
 * Handles:
 * - Selection state for text layers
 * - Config retrieval for selected layer
 * - Config updates with position field merging
 */
/**
 * Helper to find a text layer node by ID in the layer tree
 */
const findTextLayerNode = (layers: LayerNodeConfig[], id: string): TextLayerNodeConfigType | null => {
  for (const layer of layers) {
    if (layer.id === id && layer.type === 'text') {
      return layer as TextLayerNodeConfigType
    }
    if (layer.type === 'group' && 'children' in layer) {
      const found = findTextLayerNode(layer.children, id)
      if (found) return found
    }
  }
  return null
}

export function useTextLayerEditor(
  options: UseTextLayerEditorOptions
): UseTextLayerEditorReturn {
  const { heroViewConfig, onUpdateConfig } = options

  // ============================================================
  // State
  // ============================================================

  const selectedTextLayerId = ref<string | null>(null)

  // ============================================================
  // Computed
  // ============================================================

  /**
   * Get the config of the currently selected text layer
   */
  const selectedTextLayerConfig = computed<TextLayerConfig | null>(() => {
    if (!selectedTextLayerId.value) return null
    const layer = findTextLayerNode(heroViewConfig.value.layers, selectedTextLayerId.value)
    if (!layer) return null
    return {
      type: 'text',
      text: layer.text,
      fontFamily: layer.fontFamily,
      fontSize: layer.fontSize,
      fontWeight: layer.fontWeight,
      letterSpacing: layer.letterSpacing,
      lineHeight: layer.lineHeight,
      color: layer.color,
      position: {
        x: layer.position.x,
        y: layer.position.y,
        anchor: layer.position.anchor as TextLayerConfig['position']['anchor'],
      },
      rotation: layer.rotation,
    }
  })

  // ============================================================
  // Actions
  // ============================================================

  /**
   * Select a text layer by ID
   */
  const selectTextLayer = (id: string | null): void => {
    selectedTextLayerId.value = id
  }

  /**
   * Update the selected text layer config
   * Handles position field merging internally
   */
  const updateTextLayerConfig = (updates: TextLayerConfigUpdate): void => {
    if (!selectedTextLayerId.value) return
    const config = selectedTextLayerConfig.value
    if (!config) return

    // Build the actual config updates, handling position fields specially
    const configUpdates: Partial<TextLayerConfig> = {}

    if (updates.text !== undefined) configUpdates.text = updates.text
    if (updates.fontFamily !== undefined) configUpdates.fontFamily = updates.fontFamily
    if (updates.fontSize !== undefined) configUpdates.fontSize = updates.fontSize
    if (updates.fontWeight !== undefined) configUpdates.fontWeight = updates.fontWeight
    if (updates.letterSpacing !== undefined) configUpdates.letterSpacing = updates.letterSpacing
    if (updates.lineHeight !== undefined) configUpdates.lineHeight = updates.lineHeight
    if (updates.color !== undefined) configUpdates.color = updates.color
    if (updates.rotation !== undefined) configUpdates.rotation = updates.rotation

    // Handle position updates - need to merge with existing position
    if (updates.x !== undefined || updates.y !== undefined || updates.anchor !== undefined) {
      configUpdates.position = {
        x: updates.x ?? config.position.x,
        y: updates.y ?? config.position.y,
        anchor: (updates.anchor ?? config.position.anchor) as TextLayerConfig['position']['anchor'],
      }
    }

    // Call the provided update callback
    onUpdateConfig(selectedTextLayerId.value, configUpdates)
  }

  return {
    selectedTextLayerId,
    selectedTextLayerConfig,
    selectTextLayer,
    updateTextLayerConfig,
  }
}

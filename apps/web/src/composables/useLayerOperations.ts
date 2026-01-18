import { computed, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import type {
  LayerNodeConfig,
  LayerDropPosition,
  ModifierDropPosition,
  HeroViewRepository,
  HeroViewConfig,
} from '../modules/HeroScene'
import {
  findLayerInTree,
} from '../modules/HeroScene'
import type { ProcessorType } from './useLayerSelection'

// ============================================================
// Types
// ============================================================

export interface TextLayerOptions {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
  x: number
  y: number
  anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  rotation: number
}

export interface ObjectLayerOptions {
  modelUrl: string
}

/** Processor type for add-processor operation */
export type AddProcessorType = 'effect' | 'mask'

/**
 * Scene operation callbacks from useHeroScene
 */
export interface SceneOperationCallbacks {
  /** Add mask layer to scene. Returns layer ID or null if limit reached */
  addMaskLayer: () => string | null
  /** Add text layer to scene. Returns layer ID */
  addTextLayer: (options?: Partial<TextLayerOptions>) => string
  /** Add object layer to scene. Returns layer ID */
  addObjectLayer: (options?: Partial<ObjectLayerOptions>) => string
  /** Add group layer to scene. Returns layer ID */
  addGroupLayer: () => string
  /** Remove layer from scene */
  removeLayer: (layerId: string) => boolean
  /** Toggle layer visibility in scene */
  toggleLayerVisibility: (layerId: string) => void
  /** Wrap layer in a new group. Returns group ID or null if failed */
  groupLayer: (layerId: string) => string | null
  /** Wrap layer with mask in a new group. Returns group ID or null if failed */
  useAsMask: (layerId: string) => string | null
  /** Move layer to new position in tree */
  moveLayer: (layerId: string, position: LayerDropPosition) => void
  /** Add processor (effect or mask) to a layer */
  addProcessorToLayer: (layerId: string, processorType: AddProcessorType) => void
  /** Remove a processor modifier from a layer by index */
  removeProcessorFromLayer: (processorNodeId: string, modifierIndex: number) => void
  /** Remove an entire processor node */
  removeProcessor: (processorNodeId: string) => void
}

/**
 * Layer type for UI
 * Note: 'base' is included for type compatibility but cannot be added through UI
 */
export type UILayerType = 'base' | 'surface' | 'text' | 'model3d' | 'image' | 'group'

/**
 * Layer variant (non-group layer types)
 */
export type LayerVariant = 'surface' | 'text' | 'model3d' | 'image' | 'base' | 'processor'

/**
 * Composable options
 */
export interface UseLayerOperationsOptions {
  /** HeroView repository for reading/writing layers */
  repository: HeroViewRepository
  /** Reactive HeroViewConfig for tracking layer changes (required for reactivity) */
  heroViewConfig: ComputedRef<HeroViewConfig> | ShallowRef<HeroViewConfig>
  /** Expanded layer IDs ref */
  expandedLayerIds: Ref<Set<string>>
  /** Scene operation callbacks from useHeroScene */
  sceneCallbacks: SceneOperationCallbacks
  /** Selected layer ID ref from useLayerSelection (optional) */
  selectedLayerId?: Ref<string | null>
  /** Callback when layer is selected */
  onSelectLayer?: (layerId: string) => void
  /** Callback when processor is selected */
  onSelectProcessor?: (layerId: string, type: ProcessorType) => void
  /** Callback when selection should be cleared */
  onClearSelection?: () => void
}

/**
 * Composable return type
 */
export interface UseLayerOperationsReturn {
  // State (computed from repository)
  layers: ComputedRef<LayerNodeConfig[]>

  // Computed
  selectedLayer: ComputedRef<LayerNodeConfig | null>
  selectedLayerVariant: ComputedRef<LayerVariant | null>

  // Layer Selection
  handleSelectLayer: (id: string) => void
  handleSelectProcessor: (layerId: string, type: ProcessorType) => void

  // Layer Tree Operations
  handleToggleExpand: (layerId: string) => void
  handleToggleVisibility: (layerId: string) => void

  // Layer CRUD
  handleAddLayer: (type: UILayerType) => void
  handleRemoveLayer: (layerId: string) => void
  handleAddProcessor: (layerId: string, processorType: AddProcessorType) => void
  handleRemoveProcessor: (processorNodeId: string, modifierIndex: number) => void
  handleRemoveProcessorNode: (processorNodeId: string) => void

  // Grouping
  handleGroupSelection: (layerId: string) => void
  handleUseAsMask: (layerId: string) => void

  // DnD Move
  handleMoveNode: (nodeId: string, position: LayerDropPosition) => void
  handleMoveModifier: (sourceNodeId: string, modifierIndex: number, position: ModifierDropPosition) => void
}

// ============================================================
// Helper functions
// ============================================================

/**
 * Get layer variant from LayerNodeConfig
 */
const getLayerVariant = (layer: LayerNodeConfig): LayerVariant | null => {
  switch (layer.type) {
    case 'surface':
      return 'surface'
    case 'text':
      return 'text'
    case 'model3d':
      return 'model3d'
    case 'image':
      return 'image'
    case 'base':
      return 'base'
    case 'processor':
      return 'processor'
    case 'group':
      return null // Groups don't have a variant
    default:
      return null
  }
}

// ============================================================
// Composable
// ============================================================

export function useLayerOperations(
  options: UseLayerOperationsOptions,
): UseLayerOperationsReturn {
  const {
    heroViewConfig,
    expandedLayerIds,
    sceneCallbacks,
    selectedLayerId,
    onSelectLayer,
    onSelectProcessor,
    onClearSelection,
  } = options

  // ============================================================
  // State (computed from reactive heroViewConfig)
  // ============================================================
  const layers = computed(() => {
    // Use reactive heroViewConfig to ensure computed updates when config changes
    return heroViewConfig.value?.layers ?? []
  })

  // ============================================================
  // Computed
  // ============================================================
  const selectedLayer = computed(() => {
    if (!selectedLayerId?.value) return null
    return findLayerInTree(layers.value, selectedLayerId.value) ?? null
  })

  const selectedLayerVariant = computed(() => {
    const layer = selectedLayer.value
    if (!layer) return null
    return getLayerVariant(layer)
  })

  // ============================================================
  // Handlers - Selection (delegate to callbacks)
  // ============================================================
  const handleSelectLayer = (id: string) => onSelectLayer?.(id)

  const handleSelectProcessor = (layerId: string, type: ProcessorType) => {
    if (findLayerInTree(layers.value, layerId)) onSelectProcessor?.(layerId, type)
  }

  // ============================================================
  // Handlers - Tree Operations
  // ============================================================
  const handleToggleExpand = (layerId: string) => {
    const newExpandedIds = new Set(expandedLayerIds.value)
    if (newExpandedIds.has(layerId)) {
      newExpandedIds.delete(layerId)
    } else {
      newExpandedIds.add(layerId)
    }
    expandedLayerIds.value = newExpandedIds
  }

  const handleToggleVisibility = (layerId: string) => {
    const layer = findLayerInTree(layers.value, layerId)
    if (!layer) return

    // Delegate to usecase via sceneCallbacks
    // Config update and render are handled by the usecase
    sceneCallbacks.toggleLayerVisibility(layerId)
  }

  // ============================================================
  // Handlers - CRUD
  // ============================================================
  const handleAddLayer = (type: UILayerType) => {
    // Base layer cannot be added through UI
    if (type === 'base') return

    // Delegate to sceneCallbacks - usecase handles repository update
    switch (type) {
      case 'surface': {
        sceneCallbacks.addMaskLayer()
        break
      }
      case 'group': {
        const layerId = sceneCallbacks.addGroupLayer()
        // Expand the new group by default (UI state only)
        expandedLayerIds.value = new Set([...expandedLayerIds.value, layerId])
        break
      }
      case 'text': {
        sceneCallbacks.addTextLayer({
          text: 'New Text',
          fontFamily: 'sans-serif',
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 1.2,
          color: '#ffffff',
          x: 0.5,
          y: 0.5,
          anchor: 'center',
          rotation: 0,
        })
        break
      }
      case 'model3d': {
        sceneCallbacks.addObjectLayer({ modelUrl: '' })
        break
      }
      case 'image':
        // Image is WIP
        return
      default:
        return
    }
  }

  const handleRemoveLayer = (layerId: string) => {
    // Delegate to sceneCallbacks - usecase handles repository update and effect cleanup
    const removed = sceneCallbacks.removeLayer(layerId)
    if (!removed) return

    // Clear selection if the removed layer was selected
    if (selectedLayerId?.value === layerId) {
      onClearSelection?.()
    }
  }

  const handleAddProcessor = (layerId: string, processorType: AddProcessorType) => {
    // Delegate to sceneCallbacks - usecase handles processor creation and modifier addition
    sceneCallbacks.addProcessorToLayer(layerId, processorType)
  }

  const handleRemoveProcessor = (processorNodeId: string, modifierIndex: number) => {
    // Delegate to sceneCallbacks - usecase handles modifier removal
    sceneCallbacks.removeProcessorFromLayer(processorNodeId, modifierIndex)
  }

  const handleRemoveProcessorNode = (processorNodeId: string) => {
    // Delegate to sceneCallbacks - usecase handles processor node removal
    sceneCallbacks.removeProcessor(processorNodeId)
  }

  // ============================================================
  // Handlers - Grouping
  // ============================================================
  const handleGroupSelection = (layerId: string) => {
    // Delegate to sceneCallbacks - usecase handles repository update
    const groupId = sceneCallbacks.groupLayer(layerId)
    if (!groupId) return

    // Expand the new group (UI state only)
    expandedLayerIds.value = new Set([...expandedLayerIds.value, groupId])
  }

  const handleUseAsMask = (layerId: string) => {
    // Delegate to sceneCallbacks - usecase handles repository update
    const groupId = sceneCallbacks.useAsMask(layerId)
    if (!groupId) return

    // Expand the new group (UI state only)
    expandedLayerIds.value = new Set([...expandedLayerIds.value, groupId])
  }

  // ============================================================
  // Handlers - DnD Move
  // ============================================================
  const handleMoveNode = (nodeId: string, position: LayerDropPosition) => {
    // Delegate to sceneCallbacks - usecase handles repository update and render
    sceneCallbacks.moveLayer(nodeId, position)
  }

  const handleMoveModifier = (_sourceNodeId: string, _modifierIndex: number, _position: ModifierDropPosition) => {
    // TODO: Implement modifier move using moveModifierInTree
    console.warn('handleMoveModifier not yet implemented')
  }

  // ============================================================
  // Return
  // ============================================================
  return {
    // State
    layers,

    // Computed
    selectedLayer,
    selectedLayerVariant,

    // Layer Selection
    handleSelectLayer,
    handleSelectProcessor,

    // Layer Tree Operations
    handleToggleExpand,
    handleToggleVisibility,

    // Layer CRUD
    handleAddLayer,
    handleRemoveLayer,
    handleAddProcessor,
    handleRemoveProcessor,
    handleRemoveProcessorNode,

    // Grouping
    handleGroupSelection,
    handleUseAsMask,

    // DnD Move
    handleMoveNode,
    handleMoveModifier,
  }
}

import { computed, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import type {
  LayerNodeConfig,
  GroupLayerNodeConfig,
  SurfaceLayerNodeConfig,
  TextLayerNodeConfig,
  ProcessorNodeConfig,
  LayerDropPosition,
  ModifierDropPosition,
  HeroViewRepository,
  HeroViewConfig,
} from '../modules/HeroScene'
import {
  findLayerInTree,
  removeLayerFromTree,
  moveLayerInTree,
  isGroupLayerConfig,
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
  /** Remove layer from scene */
  removeLayer: (layerId: string) => boolean
  /** Toggle layer visibility in scene */
  toggleLayerVisibility: (layerId: string) => void
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

/**
 * Recursively collect all descendant layer IDs
 */
const collectDescendantIds = (node: LayerNodeConfig): string[] => {
  const ids: string[] = [node.id]
  if (isGroupLayerConfig(node)) {
    for (const child of node.children) {
      ids.push(...collectDescendantIds(child))
    }
  }
  return ids
}

// ============================================================
// Composable
// ============================================================

export function useLayerOperations(
  options: UseLayerOperationsOptions,
): UseLayerOperationsReturn {
  const {
    repository,
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

    const config = repository.get()
    if (!config) return

    let newLayer: LayerNodeConfig | null = null

    switch (type) {
      case 'surface': {
        const layerId = sceneCallbacks.addMaskLayer()
        if (!layerId) return // Surface layer limit reached

        newLayer = {
          type: 'surface',
          id: layerId,
          name: 'Surface',
          visible: true,
          surface: { type: 'solid', color: 'B' },
        } as SurfaceLayerNodeConfig
        break
      }
      case 'group': {
        const id = `group-${Date.now()}`
        newLayer = {
          type: 'group',
          id,
          name: 'Group',
          visible: true,
          children: [],
        } as GroupLayerNodeConfig
        // Expand the new group by default
        expandedLayerIds.value = new Set([...expandedLayerIds.value, id])
        break
      }
      case 'text': {
        const layerId = sceneCallbacks.addTextLayer({
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

        newLayer = {
          type: 'text',
          id: layerId,
          name: 'Text',
          visible: true,
          text: 'New Text',
          fontFamily: 'sans-serif',
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 1.2,
          color: '#ffffff',
          position: { x: 0.5, y: 0.5, anchor: 'center' },
          rotation: 0,
        } as TextLayerNodeConfig
        break
      }
      case 'model3d': {
        const layerId = sceneCallbacks.addObjectLayer({ modelUrl: '' })

        newLayer = {
          type: 'model3d',
          id: layerId,
          name: '3D Model',
          visible: true,
          modelUrl: '',
          scale: 1,
          rotation: { x: 0, y: 0, z: 0 },
          position: { x: 0, y: 0, z: 0 },
        }
        break
      }
      case 'image':
        // Image is WIP
        return
      default:
        return
    }

    if (newLayer) {
      const newLayers = [...config.layers, newLayer]
      repository.set({ ...config, layers: newLayers })
    }
  }

  const handleRemoveLayer = (layerId: string) => {
    const config = repository.get()
    if (!config) return

    const layer = findLayerInTree(config.layers, layerId)
    if (!layer) return

    // Collect all layer IDs to remove from scene (including children)
    const idsToRemove = collectDescendantIds(layer)

    // Remove non-group layers from scene
    for (const id of idsToRemove) {
      const l = findLayerInTree(config.layers, id)
      if (l && !isGroupLayerConfig(l)) {
        sceneCallbacks.removeLayer(id)
      }
    }

    // Remove from layer tree
    const newLayers = removeLayerFromTree(config.layers, layerId)
    repository.set({ ...config, layers: newLayers })

    // Clear selection if the removed layer was selected
    if (selectedLayerId?.value === layerId) {
      onClearSelection?.()
    }
  }

  // ============================================================
  // Handlers - Grouping
  // ============================================================
  const handleGroupSelection = (layerId: string) => {
    const config = repository.get()
    if (!config) return

    const layer = findLayerInTree(config.layers, layerId)
    if (!layer) return

    // Create a new group containing the selected layer
    const groupId = `group-${Date.now()}`
    const newGroup: GroupLayerNodeConfig = {
      type: 'group',
      id: groupId,
      name: 'Group',
      visible: true,
      children: [layer],
    }

    // Replace the layer with the group
    const newLayers = config.layers.map((l) => {
      if (l.id === layerId) {
        return newGroup
      }
      return l
    })

    repository.set({ ...config, layers: newLayers })

    // Expand the new group
    expandedLayerIds.value = new Set([...expandedLayerIds.value, groupId])
  }

  const handleUseAsMask = (layerId: string) => {
    const config = repository.get()
    if (!config) return

    const layer = findLayerInTree(config.layers, layerId)
    if (!layer || isGroupLayerConfig(layer)) return

    // Create a processor node with the layer as target
    const processorId = `processor-${Date.now()}`
    const processor: ProcessorNodeConfig = {
      type: 'processor',
      id: processorId,
      name: 'Mask',
      visible: true,
      modifiers: [{
        type: 'mask',
        enabled: true,
        shape: { type: 'circle', centerX: 0.5, centerY: 0.5, radius: 0.3, cutout: false },
        invert: false,
        feather: 0,
      }],
    }

    // Create a group with the layer and processor
    const groupId = `group-${Date.now()}`
    const newGroup: GroupLayerNodeConfig = {
      type: 'group',
      id: groupId,
      name: 'Masked Group',
      visible: true,
      children: [layer, processor],
    }

    // Replace the layer with the group
    const newLayers = config.layers.map((l) => {
      if (l.id === layerId) {
        return newGroup
      }
      return l
    })

    repository.set({ ...config, layers: newLayers })

    // Expand the new group
    expandedLayerIds.value = new Set([...expandedLayerIds.value, groupId])
  }

  // ============================================================
  // Handlers - DnD Move
  // ============================================================
  const handleMoveNode = (nodeId: string, position: LayerDropPosition) => {
    const config = repository.get()
    if (!config) return

    const newLayers = moveLayerInTree(config.layers, nodeId, position)
    repository.set({ ...config, layers: newLayers })
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

    // Grouping
    handleGroupSelection,
    handleUseAsMask,

    // DnD Move
    handleMoveNode,
    handleMoveModifier,
  }
}

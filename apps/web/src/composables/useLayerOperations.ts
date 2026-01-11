import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type {
  LayerNode,
  SceneNode,
  LayerVariant,
  LayerNodeType,
  DropPosition,
  TextAnchor,
} from '../modules/HeroScene'
import {
  findLayerNode,
  updateLayerNode,
  removeNode,
  moveLayerNode,
  wrapNodeInGroup,
  wrapNodeInMaskedGroup,
  createSurfaceLayerNode,
  createGroupLayerNode,
  createTextLayerNode,
  createModel3DLayerNode,
  createEffectProcessor,
  createMaskProcessor,
  isLayer,
  isGroup,
  getSceneLayerId,
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
  anchor: TextAnchor
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
  addTextLayer: (options: TextLayerOptions) => string
  /** Add object layer to scene. Returns layer ID */
  addObjectLayer: (options: ObjectLayerOptions) => string
  /** Remove layer from scene */
  removeLayer: (sceneLayerId: string) => boolean
  /** Toggle layer visibility in scene */
  toggleLayerVisibility: (sceneLayerId: string) => void
}

/**
 * Composable options
 */
export interface UseLayerOperationsOptions {
  /** Initial layers tree */
  initialLayers: LayerNode[]
  /** Scene operation callbacks from useHeroScene */
  sceneCallbacks: SceneOperationCallbacks
  /** Selected layer ID ref from useLayerSelection (optional) */
  selectedLayerId?: Ref<string | null>
  /** Custom ID mapper function (optional) */
  mapLayerIdToSceneLayerId?: (uiLayerId: string) => string
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
  // State
  layers: Ref<LayerNode[]>

  // Computed
  selectedLayer: ComputedRef<SceneNode | null>
  selectedLayerVariant: ComputedRef<LayerVariant | null>

  // Layer Selection
  handleSelectLayer: (id: string) => void
  handleSelectProcessor: (layerId: string, type: ProcessorType) => void

  // Layer Tree Operations
  handleToggleExpand: (layerId: string) => void
  handleToggleVisibility: (layerId: string) => void
  handleMoveLayer: (sourceId: string, targetId: string, position: DropPosition) => void

  // Layer CRUD
  handleAddLayer: (type: LayerNodeType) => void
  handleRemoveLayer: (layerId: string) => void

  // Grouping
  handleGroupSelection: (layerId: string) => void
  handleUseAsMask: (layerId: string) => void

  // Utility
  mapLayerIdToSceneLayerId: (uiLayerId: string) => string
}

// ============================================================
// Default ID Mapper
// ============================================================

const defaultMapLayerIdToSceneLayerId = (uiLayerId: string): string => {
  if (uiLayerId === 'base') return 'base-layer'
  // Background layers map to base-layer in the scene
  if (uiLayerId.startsWith('background-')) return 'base-layer'
  // Surface layers map to mask-layer in the scene (LAYER_IDS.MASK)
  if (uiLayerId.startsWith('surface')) return 'mask-layer'
  // Legacy support for old IDs
  if (uiLayerId.startsWith('clip-group')) return 'mask-layer'
  if (uiLayerId.startsWith('mask')) return 'mask-layer'
  return uiLayerId
}

// ============================================================
// Composable
// ============================================================

export function useLayerOperations(
  options: UseLayerOperationsOptions,
): UseLayerOperationsReturn {
  const {
    initialLayers,
    sceneCallbacks,
    selectedLayerId,
    mapLayerIdToSceneLayerId: customMapper,
    onSelectLayer,
    onSelectProcessor,
    onClearSelection,
  } = options

  // ============================================================
  // State
  // ============================================================
  const layers = ref<LayerNode[]>(initialLayers)

  // ============================================================
  // ID Mapping
  // ============================================================
  const mapLayerIdToSceneLayerId = customMapper ?? defaultMapLayerIdToSceneLayerId

  // ============================================================
  // Computed
  // ============================================================
  const selectedLayer = computed(() => {
    if (!selectedLayerId?.value) return null
    return findLayerNode(layers.value, selectedLayerId.value) ?? null
  })

  const selectedLayerVariant = computed(() => {
    const layer = selectedLayer.value
    if (!layer || !isLayer(layer)) return null
    return layer.variant
  })

  // ============================================================
  // Handlers - Selection
  // ============================================================
  const handleSelectLayer = (id: string) => {
    onSelectLayer?.(id)
  }

  const handleSelectProcessor = (layerId: string, type: ProcessorType) => {
    const layer = findLayerNode(layers.value, layerId)
    if (!layer) return
    onSelectProcessor?.(layerId, type)
  }

  // ============================================================
  // Handlers - Tree Operations
  // ============================================================
  const handleToggleExpand = (layerId: string) => {
    layers.value = updateLayerNode(layers.value, layerId, {
      expanded: !findLayerNode(layers.value, layerId)?.expanded,
    })
  }

  const handleToggleVisibility = (layerId: string) => {
    const layer = findLayerNode(layers.value, layerId)
    if (!layer) return

    layers.value = updateLayerNode(layers.value, layerId, {
      visible: !layer.visible,
    })

    if (isLayer(layer)) {
      sceneCallbacks.toggleLayerVisibility(getSceneLayerId(layer))
    }
  }

  const handleMoveLayer = (sourceId: string, targetId: string, position: DropPosition) => {
    layers.value = moveLayerNode(layers.value, sourceId, targetId, position)
  }

  // ============================================================
  // Handlers - CRUD
  // ============================================================
  const handleAddLayer = (type: LayerNodeType) => {
    let sceneLayerId: string | null = null
    let newLayer: LayerNode | null = null

    switch (type) {
      case 'surface': {
        // Add to scene (this adds to editorState.canvasLayers and renders)
        sceneLayerId = sceneCallbacks.addMaskLayer()
        if (!sceneLayerId) {
          // Surface layer limit reached
          return
        }
        // Create UI layer node
        newLayer = createSurfaceLayerNode(
          sceneLayerId,
          { type: 'solid', color: 'B' },
          {
            name: 'Surface',
            processors: [createEffectProcessor(), createMaskProcessor()],
          },
        )
        break
      }
      case 'group': {
        // Groups are UI-only for now (no scene representation)
        const id = `group-${Date.now()}`
        newLayer = createGroupLayerNode(id, [], { name: 'Group', expanded: true })
        break
      }
      case 'text': {
        // Add to scene
        sceneLayerId = sceneCallbacks.addTextLayer({
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
        // Create UI layer node (no processors by default)
        newLayer = createTextLayerNode(
          sceneLayerId,
          {
            type: 'text',
            text: 'New Text',
            fontFamily: 'sans-serif',
            fontSize: 48,
            fontWeight: 400,
            letterSpacing: 0,
            lineHeight: 1.2,
            color: '#ffffff',
            position: { x: 0.5, y: 0.5, anchor: 'center' },
            rotation: 0,
          },
          { name: 'Text', processors: [] },
        )
        break
      }
      case 'model3d': {
        // Add to scene (requires a model URL)
        sceneLayerId = sceneCallbacks.addObjectLayer({ modelUrl: '' })
        // Create UI layer node (no processors by default)
        newLayer = createModel3DLayerNode(
          sceneLayerId,
          {
            type: 'model3d',
            modelUrl: '',
            scale: 1,
            rotation: { x: 0, y: 0, z: 0 },
            position: { x: 0, y: 0, z: 0 },
          },
          { name: '3D Model', processors: [] },
        )
        break
      }
      case 'image':
        // Image is WIP, should not reach here
        return
      default:
        return
    }

    if (newLayer) {
      // Add to the end of the layers array
      layers.value = [...layers.value, newLayer]
    }
  }

  const handleRemoveLayer = (layerId: string) => {
    // Find the layer to check if it's a Group
    const layer = findLayerNode(layers.value, layerId)
    if (!layer) return

    // If it's a Group, remove all children from the scene first
    if (isGroup(layer)) {
      const removeChildrenFromScene = (node: LayerNode) => {
        if (isGroup(node)) {
          for (const child of node.children) {
            removeChildrenFromScene(child)
          }
        } else if (isLayer(node)) {
          // It's a Layer node, remove from scene
          sceneCallbacks.removeLayer(getSceneLayerId(node))
        }
      }
      removeChildrenFromScene(layer)
    } else if (isLayer(layer)) {
      // Single layer, remove from scene
      sceneCallbacks.removeLayer(getSceneLayerId(layer))
    }

    // Remove from UI layers tree
    layers.value = removeNode(layers.value, layerId)

    // Clear selection if the removed layer was selected
    if (selectedLayerId?.value === layerId) {
      onClearSelection?.()
    }
  }

  // ============================================================
  // Handlers - Grouping
  // ============================================================
  const handleGroupSelection = (layerId: string) => {
    // Wrap the selected layer in a new group
    layers.value = wrapNodeInGroup(layers.value, layerId)
  }

  const handleUseAsMask = (layerId: string) => {
    // Wrap the selected layer in a new group with a mask modifier
    layers.value = wrapNodeInMaskedGroup(layers.value, layerId)
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
    handleMoveLayer,

    // Layer CRUD
    handleAddLayer,
    handleRemoveLayer,

    // Grouping
    handleGroupSelection,
    handleUseAsMask,

    // Utility
    mapLayerIdToSceneLayerId,
  }
}

import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import {
  useLayerOperations,
  type SceneOperationCallbacks,
  type UseLayerOperationsOptions,
} from './useLayerOperations'
import {
  createGroupLayerNode,
  createSurfaceLayerNode,
  createEffectProcessor,
  createMaskProcessor,
  type LayerNode,
} from '../modules/HeroScene'

// ============================================================
// Test Fixtures
// ============================================================

const createMockSceneCallbacks = (): SceneOperationCallbacks => ({
  addMaskLayer: vi.fn(() => `clipgroup-${Date.now()}`),
  addTextLayer: vi.fn(() => `text-${Date.now()}`),
  addObjectLayer: vi.fn(() => `object-${Date.now()}`),
  removeLayer: vi.fn(() => true),
  toggleLayerVisibility: vi.fn(),
})

const createInitialLayers = (): LayerNode[] => [
  createGroupLayerNode(
    'background-group',
    [
      createSurfaceLayerNode('background-surface', { type: 'solid', color: 'BN1' }),
    ],
    { name: 'Background', expanded: true },
  ),
  createGroupLayerNode(
    'main-group',
    [
      createSurfaceLayerNode(
        'surface-1',
        { type: 'solid', color: 'B' },
        {
          processors: [createEffectProcessor(), createMaskProcessor()],
        },
      ),
    ],
    { name: 'Main Group', expanded: true },
  ),
]

const createOptions = (
  overrides: Partial<UseLayerOperationsOptions> = {},
): UseLayerOperationsOptions => ({
  initialLayers: createInitialLayers(),
  sceneCallbacks: createMockSceneCallbacks(),
  ...overrides,
})

// ============================================================
// Tests
// ============================================================

describe('useLayerOperations', () => {
  // ============================================================
  // Initial State
  // ============================================================
  describe('initial state', () => {
    it('should initialize with provided layers', () => {
      const { layers } = useLayerOperations(createOptions())

      expect(layers.value).toHaveLength(2)
      expect(layers.value[0]?.id).toBe('background-group')
      expect(layers.value[1]?.id).toBe('main-group')
    })

    it('should return null for selectedLayer when no selection', () => {
      const { selectedLayer } = useLayerOperations(createOptions())

      expect(selectedLayer.value).toBeNull()
    })

    it('should return null for selectedLayerVariant when no selection', () => {
      const { selectedLayerVariant } = useLayerOperations(createOptions())

      expect(selectedLayerVariant.value).toBeNull()
    })
  })

  // ============================================================
  // Selection with selectedLayerId
  // ============================================================
  describe('selection with selectedLayerId', () => {
    it('should return selected layer when selectedLayerId is provided', () => {
      const selectedLayerId = ref<string | null>('surface-1')
      const { selectedLayer } = useLayerOperations(
        createOptions({ selectedLayerId }),
      )

      expect(selectedLayer.value).not.toBeNull()
      expect(selectedLayer.value?.id).toBe('surface-1')
    })

    it('should return layer variant for selected layer', () => {
      const selectedLayerId = ref<string | null>('surface-1')
      const { selectedLayerVariant } = useLayerOperations(
        createOptions({ selectedLayerId }),
      )

      expect(selectedLayerVariant.value).toBe('surface')
    })

    it('should return null variant for group selection', () => {
      const selectedLayerId = ref<string | null>('main-group')
      const { selectedLayerVariant } = useLayerOperations(
        createOptions({ selectedLayerId }),
      )

      expect(selectedLayerVariant.value).toBeNull()
    })
  })

  // ============================================================
  // handleToggleExpand
  // ============================================================
  describe('handleToggleExpand', () => {
    it('should toggle expanded state from true to false', () => {
      const { layers, handleToggleExpand } = useLayerOperations(createOptions())

      handleToggleExpand('background-group')

      const group = layers.value.find((l) => l.id === 'background-group')
      expect(group).toBeDefined()
      expect(group!.expanded).toBe(false)
    })

    it('should toggle expanded state from false to true', () => {
      const initial = createInitialLayers()
      initial[0]!.expanded = false

      const { layers, handleToggleExpand } = useLayerOperations(
        createOptions({ initialLayers: initial }),
      )

      handleToggleExpand('background-group')

      const group = layers.value.find((l) => l.id === 'background-group')
      expect(group).toBeDefined()
      expect(group!.expanded).toBe(true)
    })
  })

  // ============================================================
  // handleToggleVisibility
  // ============================================================
  describe('handleToggleVisibility', () => {
    it('should toggle visibility and call scene callback', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleToggleVisibility } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleToggleVisibility('surface-1')

      // getSceneLayerId returns SCENE_LAYER_IDS.MASK for surface layers
      expect(callbacks.toggleLayerVisibility).toHaveBeenCalled()
    })

    it('should not call scene callback for non-existent layer', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleToggleVisibility } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleToggleVisibility('non-existent')

      expect(callbacks.toggleLayerVisibility).not.toHaveBeenCalled()
    })

    it('should update visibility in layers tree', () => {
      const { layers, handleToggleVisibility } = useLayerOperations(createOptions())

      // Find surface-1 initial visibility
      const findSurface = () => {
        const mainGroup = layers.value.find((l) => l.id === 'main-group')
        if (mainGroup && 'children' in mainGroup) {
          return mainGroup.children.find((c) => c.id === 'surface-1')
        }
        return null
      }

      const initialVisible = findSurface()?.visible
      handleToggleVisibility('surface-1')
      const afterToggle = findSurface()?.visible

      expect(afterToggle).toBe(!initialVisible)
    })
  })

  // ============================================================
  // handleAddLayer
  // ============================================================
  describe('handleAddLayer', () => {
    it('should add surface layer and call scene callback', () => {
      const callbacks = createMockSceneCallbacks()
      const { layers, handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const initialCount = layers.value.length
      handleAddLayer('surface')

      expect(callbacks.addMaskLayer).toHaveBeenCalled()
      expect(layers.value.length).toBe(initialCount + 1)
    })

    it('should add group without calling scene callback', () => {
      const callbacks = createMockSceneCallbacks()
      const { layers, handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleAddLayer('group')

      expect(callbacks.addMaskLayer).not.toHaveBeenCalled()
      const newGroup = layers.value.find((l) => l.id.startsWith('group-'))
      expect(newGroup).toBeDefined()
    })

    it('should not add layer when addMaskLayer returns null', () => {
      const callbacks = createMockSceneCallbacks()
      callbacks.addMaskLayer = vi.fn(() => null)

      const { layers, handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const initialCount = layers.value.length
      handleAddLayer('surface')

      expect(layers.value.length).toBe(initialCount)
    })

    it('should add text layer and call scene callback', () => {
      const callbacks = createMockSceneCallbacks()
      const { layers, handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const initialCount = layers.value.length
      handleAddLayer('text')

      expect(callbacks.addTextLayer).toHaveBeenCalled()
      expect(layers.value.length).toBe(initialCount + 1)
    })

    it('should add model3d layer and call scene callback', () => {
      const callbacks = createMockSceneCallbacks()
      const { layers, handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const initialCount = layers.value.length
      handleAddLayer('model3d')

      expect(callbacks.addObjectLayer).toHaveBeenCalled()
      expect(layers.value.length).toBe(initialCount + 1)
    })

    it('should not add image layer (WIP)', () => {
      const callbacks = createMockSceneCallbacks()
      const { layers, handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const initialCount = layers.value.length
      handleAddLayer('image')

      expect(layers.value.length).toBe(initialCount)
    })
  })

  // ============================================================
  // handleRemoveLayer
  // ============================================================
  describe('handleRemoveLayer', () => {
    it('should remove layer and call scene callback', () => {
      const callbacks = createMockSceneCallbacks()
      const onClearSelection = vi.fn()
      const selectedLayerId = ref<string | null>('surface-1')
      const { handleRemoveLayer } = useLayerOperations(
        createOptions({
          sceneCallbacks: callbacks,
          onClearSelection,
          selectedLayerId,
        }),
      )

      handleRemoveLayer('surface-1')

      // getSceneLayerId returns SCENE_LAYER_IDS.MASK for surface layers
      expect(callbacks.removeLayer).toHaveBeenCalled()
      expect(onClearSelection).toHaveBeenCalled()
    })

    it('should remove group and all children from scene', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleRemoveLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleRemoveLayer('main-group')

      // Group内のsurface-1もシーンから削除される
      expect(callbacks.removeLayer).toHaveBeenCalled()
    })

    it('should remove layer from tree', () => {
      const { layers, handleRemoveLayer } = useLayerOperations(createOptions())

      handleRemoveLayer('main-group')

      expect(layers.value.find((l) => l.id === 'main-group')).toBeUndefined()
    })

    it('should not call onClearSelection when removed layer is not selected', () => {
      const onClearSelection = vi.fn()
      const selectedLayerId = ref<string | null>('background-surface')
      const { handleRemoveLayer } = useLayerOperations(
        createOptions({ onClearSelection, selectedLayerId }),
      )

      handleRemoveLayer('surface-1')

      expect(onClearSelection).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // handleGroupSelection
  // ============================================================
  describe('handleGroupSelection', () => {
    it('should wrap layer in new group', () => {
      const { layers, handleGroupSelection } = useLayerOperations(createOptions())

      handleGroupSelection('surface-1')

      // Find if surface-1 is now wrapped in a new group
      const findLayer = (nodes: LayerNode[], id: string): LayerNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node
          if ('children' in node) {
            const found = findLayer(node.children, id)
            if (found) return found
          }
        }
        return null
      }

      const surface = findLayer(layers.value, 'surface-1')
      expect(surface).not.toBeNull()
    })
  })

  // ============================================================
  // handleUseAsMask
  // ============================================================
  describe('handleUseAsMask', () => {
    it('should wrap layer in masked group', () => {
      const { layers, handleUseAsMask } = useLayerOperations(createOptions())

      handleUseAsMask('surface-1')

      // The structure should change but surface-1 should still exist
      const findLayer = (nodes: LayerNode[], id: string): LayerNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node
          if ('children' in node) {
            const found = findLayer(node.children, id)
            if (found) return found
          }
        }
        return null
      }

      const surface = findLayer(layers.value, 'surface-1')
      expect(surface).not.toBeNull()
    })
  })

  // ============================================================
  // mapLayerIdToSceneLayerId
  // ============================================================
  describe('mapLayerIdToSceneLayerId', () => {
    it('should map base to base-layer', () => {
      const { mapLayerIdToSceneLayerId } = useLayerOperations(createOptions())

      expect(mapLayerIdToSceneLayerId('base')).toBe('base-layer')
    })

    it('should map background- prefix to base-layer', () => {
      const { mapLayerIdToSceneLayerId } = useLayerOperations(createOptions())

      expect(mapLayerIdToSceneLayerId('background-surface')).toBe('base-layer')
    })

    it('should map surface prefix to mask-layer', () => {
      const { mapLayerIdToSceneLayerId } = useLayerOperations(createOptions())

      expect(mapLayerIdToSceneLayerId('surface-1')).toBe('mask-layer')
    })

    it('should map clip-group prefix to mask-layer', () => {
      const { mapLayerIdToSceneLayerId } = useLayerOperations(createOptions())

      expect(mapLayerIdToSceneLayerId('clip-group-1')).toBe('mask-layer')
    })

    it('should map mask prefix to mask-layer', () => {
      const { mapLayerIdToSceneLayerId } = useLayerOperations(createOptions())

      expect(mapLayerIdToSceneLayerId('mask-1')).toBe('mask-layer')
    })

    it('should return original id for unknown prefix', () => {
      const { mapLayerIdToSceneLayerId } = useLayerOperations(createOptions())

      expect(mapLayerIdToSceneLayerId('text-1')).toBe('text-1')
    })

    it('should use custom mapper when provided', () => {
      const customMapper = vi.fn((id: string) => `custom-${id}`)
      const { mapLayerIdToSceneLayerId } = useLayerOperations(
        createOptions({ mapLayerIdToSceneLayerId: customMapper }),
      )

      const result = mapLayerIdToSceneLayerId('test-id')

      expect(customMapper).toHaveBeenCalledWith('test-id')
      expect(result).toBe('custom-test-id')
    })
  })

  // ============================================================
  // Selection Callbacks
  // ============================================================
  describe('selection callbacks', () => {
    it('should call onSelectLayer when handleSelectLayer is called', () => {
      const onSelectLayer = vi.fn()
      const { handleSelectLayer } = useLayerOperations(
        createOptions({ onSelectLayer }),
      )

      handleSelectLayer('surface-1')

      expect(onSelectLayer).toHaveBeenCalledWith('surface-1')
    })

    it('should call onSelectProcessor when handleSelectProcessor is called', () => {
      const onSelectProcessor = vi.fn()
      const { handleSelectProcessor } = useLayerOperations(
        createOptions({ onSelectProcessor }),
      )

      handleSelectProcessor('surface-1', 'effect')

      expect(onSelectProcessor).toHaveBeenCalledWith('surface-1', 'effect')
    })

    it('should not call onSelectProcessor for non-existent layer', () => {
      const onSelectProcessor = vi.fn()
      const { handleSelectProcessor } = useLayerOperations(
        createOptions({ onSelectProcessor }),
      )

      handleSelectProcessor('non-existent', 'effect')

      expect(onSelectProcessor).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // handleMoveLayer
  // ============================================================
  describe('handleMoveLayer', () => {
    it('should move layer in tree', () => {
      const { layers, handleMoveLayer } = useLayerOperations(createOptions())

      // Move main-group before background-group
      handleMoveLayer('main-group', 'background-group', 'before')

      expect(layers.value[0]?.id).toBe('main-group')
      expect(layers.value[1]?.id).toBe('background-group')
    })
  })
})

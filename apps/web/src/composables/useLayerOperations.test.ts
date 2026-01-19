import { describe, it, expect, vi } from 'vitest'
import { ref, shallowRef } from 'vue'
import {
  useLayerOperations,
  type SceneOperationCallbacks,
  type UseLayerOperationsOptions,
} from './useLayerOperations'
import type {
  HeroViewRepository,
  HeroViewConfig,
  LayerNodeConfig,
  BaseLayerNodeConfig,
  SurfaceLayerNodeConfig,
  GroupLayerNodeConfig,
} from '@practice/section-visual'

// ============================================================
// Test Fixtures
// ============================================================

const createMockSceneCallbacks = (): SceneOperationCallbacks => ({
  addMaskLayer: vi.fn(() => `clipgroup-${Date.now()}`),
  addTextLayer: vi.fn(() => `text-${Date.now()}`),
  addObjectLayer: vi.fn(() => `object-${Date.now()}`),
  addGroupLayer: vi.fn(() => `group-${Date.now()}`),
  removeLayer: vi.fn(() => true),
  toggleLayerVisibility: vi.fn(),
  groupLayer: vi.fn(() => `group-${Date.now()}`),
  useAsMask: vi.fn(() => `group-${Date.now()}`),
  moveLayer: vi.fn(),
})

const BASE_LAYER_ID = 'base-layer'
const MASK_LAYER_ID = 'mask-layer'

const createInitialLayers = (): LayerNodeConfig[] => [
  {
    type: 'group',
    id: 'background-group',
    name: 'Background',
    visible: true,
    children: [
      {
        type: 'base',
        id: BASE_LAYER_ID,
        name: 'Base',
        visible: true,
        surface: { type: 'solid', color: 'BN1' },
      } as BaseLayerNodeConfig,
    ],
  } as GroupLayerNodeConfig,
  {
    type: 'group',
    id: 'main-group',
    name: 'Main Group',
    visible: true,
    children: [
      {
        type: 'surface',
        id: MASK_LAYER_ID,
        name: 'Surface',
        visible: true,
        surface: { type: 'solid', color: 'B' },
      } as SurfaceLayerNodeConfig,
    ],
  } as GroupLayerNodeConfig,
]

const createMockRepository = (layers: LayerNodeConfig[] = createInitialLayers()): HeroViewRepository => {
  let config: HeroViewConfig = {
    layers,
    colors: {
      brand: { hue: 220, saturation: 0.8, value: 0.7 },
      accent: { hue: 40, saturation: 0.9, value: 0.8 },
      foundation: { hue: 220, saturation: 0.1, value: 0.95 },
    },
    foreground: {
      elements: [],
    },
  }

  const listeners: Array<(config: HeroViewConfig) => void> = []

  return {
    get: () => config,
    set: (newConfig: HeroViewConfig) => {
      config = newConfig
      listeners.forEach(l => l(config))
    },
    updateLayer: vi.fn((layerId: string, updates: Partial<LayerNodeConfig>) => {
      // Simple mock implementation
      const updateInTree = (nodes: LayerNodeConfig[]): LayerNodeConfig[] => {
        return nodes.map(node => {
          if (node.id === layerId) {
            return { ...node, ...updates }
          }
          if (node.type === 'group') {
            return {
              ...node,
              children: updateInTree((node as GroupLayerNodeConfig).children),
            }
          }
          return node
        })
      }
      config = { ...config, layers: updateInTree(config.layers) }
      listeners.forEach(l => l(config))
    }),
    subscribe: (listener: (config: HeroViewConfig) => void) => {
      listeners.push(listener)
      return () => {
        const idx = listeners.indexOf(listener)
        if (idx >= 0) listeners.splice(idx, 1)
      }
    },
  }
}

const createOptions = (
  overrides: Partial<UseLayerOperationsOptions> = {},
): UseLayerOperationsOptions => {
  const repository = overrides.repository ?? createMockRepository()
  const heroViewConfig = overrides.heroViewConfig ?? shallowRef(repository.get())
  const expandedLayerIds = overrides.expandedLayerIds ?? ref(new Set(['background-group', 'main-group']))
  return {
    repository,
    heroViewConfig,
    expandedLayerIds,
    sceneCallbacks: overrides.sceneCallbacks ?? createMockSceneCallbacks(),
    ...overrides,
  }
}

// ============================================================
// Tests
// ============================================================

describe('useLayerOperations', () => {
  // ============================================================
  // Initial State
  // ============================================================
  describe('initial state', () => {
    it('should initialize with layers from repository', () => {
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
      const selectedLayerId = ref<string | null>(MASK_LAYER_ID)
      const { selectedLayer } = useLayerOperations(
        createOptions({ selectedLayerId }),
      )

      expect(selectedLayer.value).not.toBeNull()
      expect(selectedLayer.value?.id).toBe(MASK_LAYER_ID)
    })

    it('should return layer variant for selected surface layer', () => {
      const selectedLayerId = ref<string | null>(MASK_LAYER_ID)
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
      const expandedLayerIds = ref(new Set(['background-group', 'main-group']))
      const { handleToggleExpand } = useLayerOperations(
        createOptions({ expandedLayerIds }),
      )

      handleToggleExpand('background-group')

      expect(expandedLayerIds.value.has('background-group')).toBe(false)
    })

    it('should toggle expanded state from false to true', () => {
      const expandedLayerIds = ref(new Set(['main-group']))
      const { handleToggleExpand } = useLayerOperations(
        createOptions({ expandedLayerIds }),
      )

      handleToggleExpand('background-group')

      expect(expandedLayerIds.value.has('background-group')).toBe(true)
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

      handleToggleVisibility(MASK_LAYER_ID)

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
  })

  // ============================================================
  // handleAddLayer
  // ============================================================
  describe('handleAddLayer', () => {
    it('should call addMaskLayer when adding surface layer', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleAddLayer('surface')

      expect(callbacks.addMaskLayer).toHaveBeenCalled()
    })

    it('should call addGroupLayer when adding group layer', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleAddLayer('group')

      expect(callbacks.addGroupLayer).toHaveBeenCalled()
      expect(callbacks.addMaskLayer).not.toHaveBeenCalled()
    })

    it('should expand group after adding', () => {
      const callbacks = createMockSceneCallbacks()
      const expandedLayerIds = ref(new Set<string>())
      vi.mocked(callbacks.addGroupLayer).mockReturnValue('new-group-123')
      const { handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, expandedLayerIds }),
      )

      handleAddLayer('group')

      expect(expandedLayerIds.value.has('new-group-123')).toBe(true)
    })

    it('should only call sceneCallbacks (no direct repository.set)', () => {
      const callbacks = createMockSceneCallbacks()
      const repository = createMockRepository()
      const repositorySpy = vi.spyOn(repository, 'set')
      const { handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, repository }),
      )

      handleAddLayer('surface')
      handleAddLayer('group')
      handleAddLayer('text')
      handleAddLayer('model3d')

      // handleAddLayer should delegate to sceneCallbacks, not call repository.set directly
      expect(repositorySpy).not.toHaveBeenCalled()
    })

    it('should call addTextLayer when adding text layer', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleAddLayer('text')

      expect(callbacks.addTextLayer).toHaveBeenCalled()
    })

    it('should call addObjectLayer when adding model3d layer', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleAddLayer('model3d')

      expect(callbacks.addObjectLayer).toHaveBeenCalled()
    })

    it('should not add base layer (handled specially)', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleAddLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleAddLayer('base')

      expect(callbacks.addMaskLayer).not.toHaveBeenCalled()
      expect(callbacks.addTextLayer).not.toHaveBeenCalled()
      expect(callbacks.addObjectLayer).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // handleRemoveLayer
  // ============================================================
  describe('handleRemoveLayer', () => {
    it('should call removeLayer callback', () => {
      const callbacks = createMockSceneCallbacks()
      const selectedLayerId = ref<string | null>(MASK_LAYER_ID)
      const { handleRemoveLayer } = useLayerOperations(
        createOptions({
          sceneCallbacks: callbacks,
          selectedLayerId,
        }),
      )

      handleRemoveLayer(MASK_LAYER_ID)

      expect(callbacks.removeLayer).toHaveBeenCalledWith(MASK_LAYER_ID)
    })

    it('should call onClearSelection when removing selected layer', () => {
      const callbacks = createMockSceneCallbacks()
      const onClearSelection = vi.fn()
      const selectedLayerId = ref<string | null>(MASK_LAYER_ID)
      const { handleRemoveLayer } = useLayerOperations(
        createOptions({
          sceneCallbacks: callbacks,
          onClearSelection,
          selectedLayerId,
        }),
      )

      handleRemoveLayer(MASK_LAYER_ID)

      expect(onClearSelection).toHaveBeenCalled()
    })

    it('should not call onClearSelection when removing non-selected layer', () => {
      const callbacks = createMockSceneCallbacks()
      const onClearSelection = vi.fn()
      const selectedLayerId = ref<string | null>(MASK_LAYER_ID)
      const { handleRemoveLayer } = useLayerOperations(
        createOptions({
          sceneCallbacks: callbacks,
          onClearSelection,
          selectedLayerId,
        }),
      )

      handleRemoveLayer('some-other-layer')

      expect(onClearSelection).not.toHaveBeenCalled()
    })

    it('should only call sceneCallbacks.removeLayer (no direct repository.set)', () => {
      const callbacks = createMockSceneCallbacks()
      const repository = createMockRepository()
      const repositorySpy = vi.spyOn(repository, 'set')
      const { handleRemoveLayer } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, repository }),
      )

      handleRemoveLayer(MASK_LAYER_ID)

      // handleRemoveLayer should delegate to sceneCallbacks, not call repository.set directly
      expect(callbacks.removeLayer).toHaveBeenCalledWith(MASK_LAYER_ID)
      expect(repositorySpy).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // handleGroupSelection
  // ============================================================
  describe('handleGroupSelection', () => {
    it('should call groupLayer callback', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleGroupSelection } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleGroupSelection(MASK_LAYER_ID)

      expect(callbacks.groupLayer).toHaveBeenCalledWith(MASK_LAYER_ID)
    })

    it('should expand group after grouping', () => {
      const callbacks = createMockSceneCallbacks()
      const expandedLayerIds = ref(new Set<string>())
      vi.mocked(callbacks.groupLayer).mockReturnValue('new-group-123')
      const { handleGroupSelection } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, expandedLayerIds }),
      )

      handleGroupSelection(MASK_LAYER_ID)

      expect(expandedLayerIds.value.has('new-group-123')).toBe(true)
    })

    it('should only call sceneCallbacks.groupLayer (no direct repository.set)', () => {
      const callbacks = createMockSceneCallbacks()
      const repository = createMockRepository()
      const repositorySpy = vi.spyOn(repository, 'set')
      const { handleGroupSelection } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, repository }),
      )

      handleGroupSelection(MASK_LAYER_ID)

      // handleGroupSelection should delegate to sceneCallbacks, not call repository.set directly
      expect(callbacks.groupLayer).toHaveBeenCalled()
      expect(repositorySpy).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // handleSelectLayer
  // ============================================================
  describe('handleSelectLayer', () => {
    it('should call onSelectLayer callback', () => {
      const onSelectLayer = vi.fn()
      const { handleSelectLayer } = useLayerOperations(
        createOptions({ onSelectLayer }),
      )

      handleSelectLayer(MASK_LAYER_ID)

      expect(onSelectLayer).toHaveBeenCalledWith(MASK_LAYER_ID)
    })
  })

  // ============================================================
  // handleSelectProcessor
  // ============================================================
  describe('handleSelectProcessor', () => {
    it('should call onSelectProcessor callback', () => {
      const onSelectProcessor = vi.fn()
      const { handleSelectProcessor } = useLayerOperations(
        createOptions({ onSelectProcessor }),
      )

      handleSelectProcessor(MASK_LAYER_ID, 'effect')

      expect(onSelectProcessor).toHaveBeenCalledWith(MASK_LAYER_ID, 'effect')
    })
  })

  // ============================================================
  // handleUseAsMask
  // ============================================================
  describe('handleUseAsMask', () => {
    it('should call useAsMask callback', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleUseAsMask } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      handleUseAsMask(MASK_LAYER_ID)

      expect(callbacks.useAsMask).toHaveBeenCalledWith(MASK_LAYER_ID)
    })

    it('should expand the new group when useAsMask succeeds', () => {
      const callbacks = createMockSceneCallbacks()
      const expandedLayerIds = ref(new Set<string>())
      vi.mocked(callbacks.useAsMask).mockReturnValue('new-mask-group-123')
      const { handleUseAsMask } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, expandedLayerIds }),
      )

      handleUseAsMask(MASK_LAYER_ID)

      expect(expandedLayerIds.value.has('new-mask-group-123')).toBe(true)
    })

    it('should not expand when useAsMask returns null', () => {
      const callbacks = createMockSceneCallbacks()
      const expandedLayerIds = ref(new Set<string>())
      vi.mocked(callbacks.useAsMask).mockReturnValue(null)
      const { handleUseAsMask } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, expandedLayerIds }),
      )

      handleUseAsMask(MASK_LAYER_ID)

      expect(expandedLayerIds.value.size).toBe(0)
    })

    it('should only call sceneCallbacks.useAsMask (no direct repository.set)', () => {
      const callbacks = createMockSceneCallbacks()
      const repository = createMockRepository()
      const repositorySpy = vi.spyOn(repository, 'set')
      const { handleUseAsMask } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, repository }),
      )

      handleUseAsMask(MASK_LAYER_ID)

      // handleUseAsMask should delegate to sceneCallbacks, not call repository.set directly
      expect(callbacks.useAsMask).toHaveBeenCalledWith(MASK_LAYER_ID)
      expect(repositorySpy).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // handleMoveNode
  // ============================================================
  describe('handleMoveNode', () => {
    it('should call moveLayer callback with correct arguments', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleMoveNode } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const position = { type: 'after' as const, targetId: 'background-group' }
      handleMoveNode(MASK_LAYER_ID, position)

      expect(callbacks.moveLayer).toHaveBeenCalledWith(MASK_LAYER_ID, position)
    })

    it('should call moveLayer with "before" position', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleMoveNode } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const position = { type: 'before' as const, targetId: 'main-group' }
      handleMoveNode(MASK_LAYER_ID, position)

      expect(callbacks.moveLayer).toHaveBeenCalledWith(MASK_LAYER_ID, position)
    })

    it('should call moveLayer with "into" position', () => {
      const callbacks = createMockSceneCallbacks()
      const { handleMoveNode } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks }),
      )

      const position = { type: 'into' as const, targetId: 'main-group' }
      handleMoveNode(MASK_LAYER_ID, position)

      expect(callbacks.moveLayer).toHaveBeenCalledWith(MASK_LAYER_ID, position)
    })

    it('should only call sceneCallbacks.moveLayer (no direct repository.set)', () => {
      const callbacks = createMockSceneCallbacks()
      const repository = createMockRepository()
      const repositorySpy = vi.spyOn(repository, 'set')
      const { handleMoveNode } = useLayerOperations(
        createOptions({ sceneCallbacks: callbacks, repository }),
      )

      const position = { type: 'after' as const, targetId: 'background-group' }
      handleMoveNode(MASK_LAYER_ID, position)

      // handleMoveNode should delegate to sceneCallbacks, not call repository.set directly
      expect(callbacks.moveLayer).toHaveBeenCalledWith(MASK_LAYER_ID, position)
      expect(repositorySpy).not.toHaveBeenCalled()
    })
  })
})

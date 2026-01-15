import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { ContextTargetType } from '../components/HeroGenerator/DraggableLayerNode.vue'
import type { ContextMenuItem } from '../components/HeroGenerator/ContextMenu.vue'
import type { LayerNodeConfig, ProcessorConfig, ProcessorNodeConfig } from '../modules/HeroScene'
import {
  findLayerInTree,
  updateLayerInTree,
  isProcessorLayerConfig,
} from '../modules/HeroScene'

// ============================================================
// Types
// ============================================================

export interface ContextMenuCallbacks {
  handleGroupSelection: (layerId: string) => void
  handleUseAsMask: (layerId: string) => void
  handleToggleVisibility: (layerId: string) => void
  handleRemoveLayer: (layerId: string) => void
  handleRemoveForegroundElement: (elementId: string) => void
}

export interface UseContextMenuReturn {
  // State
  contextMenuOpen: Ref<boolean>
  contextMenuPosition: Ref<{ x: number; y: number }>
  contextMenuLayerId: Ref<string | null>
  contextMenuTargetType: Ref<ContextTargetType | 'html'>

  // Computed
  contextMenuTargetVisible: ComputedRef<boolean>
  contextMenuItems: ComputedRef<ContextMenuItem[]>

  // Handlers
  handleLayerContextMenu: (layerId: string, event: MouseEvent, targetType: ContextTargetType) => void
  handleForegroundContextMenu: (elementId: string, event: MouseEvent) => void
  handleContextMenuClose: () => void
  handleContextMenuSelect: (itemId: string) => void
  handleGlobalContextMenu: (e: MouseEvent) => void
}

// ============================================================
// Helper Functions
// ============================================================

const isEffectModifier = (mod: ProcessorConfig): boolean => mod.type === 'effect'
const isMaskModifier = (mod: ProcessorConfig): boolean => mod.type === 'mask'

// ============================================================
// Composable
// ============================================================

export function useContextMenu(
  layers: Ref<LayerNodeConfig[]>,
  callbacks: ContextMenuCallbacks,
): UseContextMenuReturn {
  // ============================================================
  // State
  // ============================================================
  const contextMenuOpen = ref(false)
  const contextMenuPosition = ref({ x: 0, y: 0 })
  const contextMenuLayerId = ref<string | null>(null)
  const contextMenuTargetType = ref<ContextTargetType | 'html'>('layer')

  // ============================================================
  // Computed
  // ============================================================

  const contextMenuTargetVisible = computed(() => {
    if (!contextMenuLayerId.value) return true
    const layer = findLayerInTree(layers.value, contextMenuLayerId.value)
    return layer?.visible ?? true
  })

  const contextMenuItems = computed((): ContextMenuItem[] => {
    const targetType = contextMenuTargetType.value

    // HTML elements: only Remove
    if (targetType === 'html') {
      return [
        { id: 'remove', label: 'Remove', icon: 'delete' },
      ]
    }

    // Effect/Mask modifiers: only Remove (removes modifier from layer)
    if (targetType === 'effect' || targetType === 'mask') {
      return [
        { id: 'remove-modifier', label: 'Remove', icon: 'delete' },
      ]
    }

    // Processor group: no actions
    if (targetType === 'processor') {
      return [
        { id: 'processor-info', label: 'Processor', disabled: true },
      ]
    }

    // Regular layer/group: full menu
    return [
      { id: 'group-selection', label: 'Group Selection', icon: 'folder' },
      { id: 'use-as-mask', label: 'Use as Mask', icon: 'vignette' },
      { id: 'sep-1', label: '', separator: true },
      { id: 'toggle-visibility', label: contextMenuTargetVisible.value ? 'Hide' : 'Show', icon: contextMenuTargetVisible.value ? 'visibility_off' : 'visibility' },
      { id: 'sep-2', label: '', separator: true },
      { id: 'remove', label: 'Remove', icon: 'delete' },
    ]
  })

  // ============================================================
  // Handlers
  // ============================================================

  const handleLayerContextMenu = (layerId: string, event: MouseEvent, targetType: ContextTargetType) => {
    contextMenuLayerId.value = layerId
    contextMenuTargetType.value = targetType
    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    contextMenuOpen.value = true
  }

  const handleForegroundContextMenu = (elementId: string, event: MouseEvent) => {
    contextMenuLayerId.value = elementId
    contextMenuTargetType.value = 'html'
    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    contextMenuOpen.value = true
  }

  const handleContextMenuClose = () => {
    contextMenuOpen.value = false
    contextMenuLayerId.value = null
    contextMenuTargetType.value = 'layer'
  }

  const handleRemoveModifier = (layerId: string, modifierType: 'effect' | 'mask') => {
    const layer = findLayerInTree(layers.value, layerId)
    if (!layer || !isProcessorLayerConfig(layer)) return

    const processor = layer as ProcessorNodeConfig

    // Filter out the modifier of the specified type
    const newModifiers = processor.modifiers.filter((mod: ProcessorConfig) => {
      if (modifierType === 'effect') return !isEffectModifier(mod)
      if (modifierType === 'mask') return !isMaskModifier(mod)
      return true
    })

    layers.value = updateLayerInTree(layers.value, layerId, {
      modifiers: newModifiers,
    })
  }

  const handleContextMenuSelect = (itemId: string) => {
    const layerId = contextMenuLayerId.value
    if (!layerId) return

    const targetType = contextMenuTargetType.value

    switch (itemId) {
      case 'group-selection':
        callbacks.handleGroupSelection(layerId)
        break
      case 'use-as-mask':
        callbacks.handleUseAsMask(layerId)
        break
      case 'toggle-visibility':
        callbacks.handleToggleVisibility(layerId)
        break
      case 'remove':
        // For HTML elements, use foreground remove
        if (targetType === 'html') {
          callbacks.handleRemoveForegroundElement(layerId)
        } else {
          callbacks.handleRemoveLayer(layerId)
        }
        break
      case 'remove-modifier':
        // Remove the specific modifier (effect or mask)
        if (targetType === 'effect' || targetType === 'mask') {
          handleRemoveModifier(layerId, targetType)
        }
        break
    }
    handleContextMenuClose()
  }

  // Prevent default context menu on the entire generator
  const handleGlobalContextMenu = (e: MouseEvent) => {
    e.preventDefault()
  }

  return {
    // State
    contextMenuOpen,
    contextMenuPosition,
    contextMenuLayerId,
    contextMenuTargetType,

    // Computed
    contextMenuTargetVisible,
    contextMenuItems,

    // Handlers
    handleLayerContextMenu,
    handleForegroundContextMenu,
    handleContextMenuClose,
    handleContextMenuSelect,
    handleGlobalContextMenu,
  }
}

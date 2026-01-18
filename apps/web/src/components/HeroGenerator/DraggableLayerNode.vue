<script setup lang="ts">
/**
 * DraggableLayerNode
 *
 * Recursive tree node component for layer hierarchy.
 * Features:
 * - Visual depth indication via indentation
 * - Expand/collapse for groups
 * - Drag & drop reordering
 */

import { computed, ref, inject } from 'vue'
import type { LayerNodeConfig, GroupLayerNodeConfig, ProcessorNodeConfig, ProcessorConfig, MaskProcessorConfig, ModifierDropPosition, LayerDropPosition } from '@practice/hero-scene'
import { isGroupLayerConfig, isProcessorLayerConfig, isSurfaceLayerConfig, isBaseLayerConfig, isTextLayerConfig, isModel3DLayerConfig, isImageLayerConfig, isSingleEffectConfig } from '@practice/hero-scene'
import { LAYER_DRAG_KEY, type DropTarget } from '../../composables/useLayerDragAndDrop'
import { MODIFIER_DRAG_KEY, type ModifierDropTarget } from '../../composables/useModifierDragAndDrop'
import DropIndicator from './DropIndicator.vue'

// Layer variant type for UI display
type LayerVariant = 'base' | 'surface' | 'group' | 'model3d' | 'image' | 'text' | 'processor'

// Helper functions for modifier type checking
const isEffectModifier = (mod: ProcessorConfig): boolean => mod.type === 'effect'
const isMaskModifier = (mod: ProcessorConfig): boolean => mod.type === 'mask'

// Helper to check if an effect modifier is enabled
// SingleEffectConfig: existence means enabled (no legacy format check needed)
const isEffectEnabled = (mod: ProcessorConfig): boolean => {
  return isSingleEffectConfig(mod)
}

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  node: LayerNodeConfig
  depth: number
  selectedId: string | null
  selectedProcessorType: 'effect' | 'mask' | 'processor' | null
  /** All layers in the tree (for DnD validation) */
  layers: LayerNodeConfig[]
  /** Expanded layer IDs (UI state) */
  expandedLayerIds: Set<string>
  /** Whether this node is a target of a Processor (next sibling is Processor) */
  isProcessorTarget?: boolean
}>()

/** Context menu target type */
export type ContextTargetType = 'layer' | 'processor' | 'effect' | 'mask'

/** Processor type for add-processor event */
export type AddProcessorType = 'effect' | 'mask'

const emit = defineEmits<{
  select: [nodeId: string]
  'toggle-expand': [nodeId: string]
  'toggle-visibility': [nodeId: string]
  'select-processor': [nodeId: string, processorType: 'effect' | 'mask' | 'processor']
  'remove-layer': [nodeId: string]
  'add-processor': [nodeId: string, processorType: AddProcessorType]
  // Context menu event (with target type and optional modifier index)
  contextmenu: [nodeId: string, event: MouseEvent, targetType: ContextTargetType, modifierIndex?: number]
  // DnD move events
  'move-node': [nodeId: string, position: LayerDropPosition]
  'move-modifier': [sourceNodeId: string, modifierIndex: number, position: ModifierDropPosition]
}>()

// ============================================================
// Computed
// ============================================================

const isSelected = computed(() => props.selectedId === props.node.id)
const isGroupNode = computed(() => isGroupLayerConfig(props.node))
const isProcessorNode = computed(() => isProcessorLayerConfig(props.node))
const hasChildren = computed(() => isGroupNode.value && (props.node as GroupLayerNodeConfig).children.length > 0)
const isExpanded = computed(() => props.expandedLayerIds.has(props.node.id))

// Check if this node has expandable content (only children, modifiers are always visible)
const hasExpandableContent = computed(() => hasChildren.value)

// Check if this node's processor is selected
const isProcessorSelected = computed(() =>
  props.selectedId === props.node.id && props.selectedProcessorType === 'processor'
)

// Processor expand state (local, not persisted)
const isProcessorExpanded = ref(true)

// Indent style based on depth
const indentStyle = computed(() => ({
  paddingLeft: `${props.depth * 0.75}rem`,
}))

// Children for group nodes
const children = computed((): LayerNodeConfig[] => {
  if (isGroupLayerConfig(props.node)) {
    return (props.node as GroupLayerNodeConfig).children
  }
  return []
})

// Check if a child is a Processor target (next sibling is Processor)
const isChildProcessorTarget = (index: number): boolean => {
  const nextSibling = children.value[index + 1]
  return nextSibling ? isProcessorLayerConfig(nextSibling) : false
}

// Get node variant for display
const nodeVariant = computed((): LayerVariant => {
  const node = props.node
  if (isBaseLayerConfig(node)) return 'base'
  if (isSurfaceLayerConfig(node)) return 'surface'
  if (isTextLayerConfig(node)) return 'text'
  if (isModel3DLayerConfig(node)) return 'model3d'
  if (isImageLayerConfig(node)) return 'image'
  if (isProcessorLayerConfig(node)) return 'processor'
  if (isGroupLayerConfig(node)) return 'group'
  return 'surface' // fallback
})

// Modifier info with index for DnD
// Note: Effect details are managed by useEffectManager and shown in property panel
// Layer tree only shows whether effect/mask modifiers exist
const modifiers = computed(() => {
  const result: { type: 'effect' | 'mask'; label: string; value: string; icon: string; enabled: boolean; index: number }[] = []

  // Only ProcessorNodeConfig has modifiers
  if (!isProcessorLayerConfig(props.node)) return result

  const processor = props.node as ProcessorNodeConfig
  processor.modifiers.forEach((mod: ProcessorConfig, index: number) => {
    if (isEffectModifier(mod)) {
      result.push({
        type: 'effect',
        label: 'Effect',
        value: '', // Details shown in property panel
        icon: 'auto_fix_high',
        enabled: isEffectEnabled(mod),
        index,
      })
    } else if (isMaskModifier(mod)) {
      const maskMod = mod as MaskProcessorConfig
      result.push({
        type: 'mask',
        label: 'Mask',
        value: maskMod.shape.id,
        icon: 'content_cut',
        enabled: maskMod.enabled,
        index,
      })
    }
  })

  return result
})

// ============================================================
// Icon & Label Helpers
// ============================================================

const getLayerIcon = (variant: LayerVariant): string => {
  switch (variant) {
    case 'base': return 'gradient'
    case 'surface': return 'texture'
    case 'group': return 'folder_open'
    case 'processor': return 'tune'
    case 'model3d': return 'view_in_ar'
    case 'image': return 'image'
    case 'text': return 'text_fields'
    default: return 'layers'
  }
}

// ============================================================
// Event Handlers
// ============================================================

const handleSelect = () => {
  emit('select', props.node.id)
}

const handleContextMenu = (e: MouseEvent, targetType: ContextTargetType = 'layer', modifierIndex?: number) => {
  e.preventDefault()
  e.stopPropagation()
  emit('contextmenu', props.node.id, e, targetType, modifierIndex)
}

const handleToggleExpand = (e: Event) => {
  e.stopPropagation()
  emit('toggle-expand', props.node.id)
}

const handleToggleProcessorExpand = () => {
  isProcessorExpanded.value = !isProcessorExpanded.value
}

const handleToggleVisibility = (e: Event) => {
  e.stopPropagation()
  emit('toggle-visibility', props.node.id)
}

const handleRemove = (e: Event) => {
  e.stopPropagation()
  emit('remove-layer', props.node.id)
}

const handleSelectProcessor = (type: 'effect' | 'mask' | 'processor') => {
  emit('select-processor', props.node.id, type)
}

// ============================================================
// Add Processor Menu
// ============================================================

const showAddProcessorMenu = ref(false)

const handleToggleAddProcessorMenu = (e: Event) => {
  e.stopPropagation()
  showAddProcessorMenu.value = !showAddProcessorMenu.value
}

const handleAddProcessor = (type: AddProcessorType, e: Event) => {
  e.stopPropagation()
  emit('add-processor', props.node.id, type)
  showAddProcessorMenu.value = false
}

// ============================================================
// Drag & Drop (SceneNode)
// ============================================================

const dragContext = inject(LAYER_DRAG_KEY, null)
const nodeRef = ref<HTMLElement | null>(null)

// Current drop target for this node
const localDropTarget = computed((): DropTarget | null => {
  if (!dragContext) return null
  const target = dragContext.state.dropTarget.value
  if (!target || target.nodeId !== props.node.id) return null
  return target
})

// Check if this node is being dragged
const isBeingDragged = computed(() => {
  if (!dragContext) return false
  return dragContext.state.isDragging.value &&
    dragContext.state.dragItem.value?.nodeId === props.node.id
})

// Handle pointer down to start drag
const handlePointerDown = (e: PointerEvent) => {
  if (!dragContext) return
  // Only start drag on primary button
  if (e.button !== 0) return
  // Don't start drag on buttons
  if ((e.target as HTMLElement).closest('button')) return

  dragContext.actions.startDrag(
    { type: 'layerNode', nodeId: props.node.id },
    e
  )
  // Note: Don't use setPointerCapture here - we need events to reach other nodes
}

// ============================================================
// Drag & Drop (Modifier)
// ============================================================

const modifierDragContext = inject(MODIFIER_DRAG_KEY, null)

// Get local modifier drop target (if targeting a modifier in this node)
const getLocalModifierDropTarget = (modifierIndex: number): ModifierDropTarget | null => {
  if (!modifierDragContext) return null
  const target = modifierDragContext.state.dropTarget.value
  if (!target || target.nodeId !== props.node.id || target.modifierIndex !== modifierIndex) return null
  return target
}

// Check if a modifier is being dragged from this node
const isModifierBeingDragged = (modifierIndex: number): boolean => {
  if (!modifierDragContext) return false
  return modifierDragContext.state.isDragging.value &&
    modifierDragContext.state.dragItem.value?.nodeId === props.node.id &&
    modifierDragContext.state.dragItem.value?.modifierIndex === modifierIndex
}

// Handle pointer down on modifier to start drag
const handleModifierPointerDown = (e: PointerEvent, modifierIndex: number, modifierType: 'effect' | 'mask') => {
  if (!modifierDragContext) return
  // Only start drag on primary button
  if (e.button !== 0) return
  // Don't start drag on buttons
  if ((e.target as HTMLElement).closest('button')) return

  e.stopPropagation() // Prevent node drag from starting

  modifierDragContext.actions.startDrag(
    {
      type: 'modifier',
      nodeId: props.node.id,
      modifierIndex,
      modifierType,
    },
    e
  )
}
</script>

<template>
  <div class="draggable-layer-node">
    <!-- Node Header (not shown for processor nodes - they show directly as processor-group-node) -->
    <div
      v-if="!isProcessorNode"
      ref="nodeRef"
      class="node-header"
      :class="{ selected: isSelected, dragging: isBeingDragged }"
      :style="indentStyle"
      :data-node-id="node.id"
      :data-is-group="isGroupNode"
      @click="handleSelect"
      @contextmenu="(e: MouseEvent) => handleContextMenu(e, 'layer')"
      @pointerdown="handlePointerDown"
    >
      <!-- Drop Indicator -->
      <DropIndicator
        v-if="localDropTarget"
        :position="localDropTarget.position"
      />
      <!-- Processor Link: 上向き矢印 (対象レイヤーの先頭、次の兄弟がProcessorの場合表示) -->
      <svg v-if="isProcessorTarget" class="processor-link-icon" viewBox="0 0 12 24" fill="none">
        <!-- 縦線 (矢印先端から下へ、次の要素まで伸ばす) -->
        <line x1="6" y1="6" x2="6" y2="36" stroke="currentColor" stroke-width="1" />
        <!-- 矢印ヘッド (上向き三角形) -->
        <path d="M6 2 L9 7 L3 7 Z" fill="currentColor" />
      </svg>

      <!-- Expand Toggle -->
      <button
        v-if="hasExpandableContent || isGroupNode"
        class="expand-toggle"
        :class="{ expanded: isExpanded }"
        @click="handleToggleExpand"
      >
        <span class="material-icons">chevron_right</span>
      </button>
      <span v-else-if="!isProcessorTarget" class="expand-spacer" />

      <!-- Type Icon -->
      <span class="material-icons layer-icon">{{ getLayerIcon(nodeVariant) }}</span>

      <!-- Layer Name -->
      <div class="layer-info">
        <span class="layer-name">{{ node.name }}</span>
      </div>

      <!-- Add Processor Button (only for non-processor, non-group layers) -->
      <div
        v-if="!isProcessorNode && !isGroupNode"
        class="add-processor-container"
        @click.stop
      >
        <button
          class="add-processor-toggle"
          :class="{ active: showAddProcessorMenu }"
          title="Add Effect or Mask"
          @click="handleToggleAddProcessorMenu"
        >
          <span class="material-icons">add</span>
        </button>

        <Transition name="fade">
          <div
            v-if="showAddProcessorMenu"
            class="add-processor-menu"
            @click.stop
          >
            <button
              class="add-processor-item"
              @click="(e) => handleAddProcessor('effect', e)"
            >
              <span class="material-icons">auto_fix_high</span>
              <span>Effect</span>
            </button>
            <button
              class="add-processor-item"
              @click="(e) => handleAddProcessor('mask', e)"
            >
              <span class="material-icons">content_cut</span>
              <span>Mask</span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- Visibility Toggle -->
      <button
        class="visibility-toggle"
        :class="{ hidden: !node.visible }"
        @click="handleToggleVisibility"
      >
        <span class="material-icons">{{ node.visible ? 'visibility' : 'visibility_off' }}</span>
      </button>

      <!-- Remove Button -->
      <button
        class="remove-toggle"
        @click="handleRemove"
      >
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- Processor group (contains Effect/Mask as children) -->
    <template v-if="modifiers.length > 0">
      <!-- Processor parent node with L-shape connector -->
      <div
        class="processor-group-node"
        :class="{ selected: isProcessorSelected }"
        :style="{ paddingLeft: `${depth * 0.75}rem` }"
        @click="handleSelectProcessor('processor')"
        @contextmenu="(e: MouseEvent) => handleContextMenu(e, 'processor')"
      >
        <!-- L字コーナー SVG -->
        <svg class="processor-link-icon" viewBox="0 0 12 24" fill="none">
          <!-- 縦線 (上の要素から中央へ、上にはみ出す) -->
          <line x1="6" y1="-12" x2="6" y2="12" stroke="currentColor" stroke-width="1" />
          <!-- 横線 (中央から右へ) -->
          <line x1="6" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="1" />
        </svg>
        <!-- Expand Toggle -->
        <button
          class="expand-toggle"
          :class="{ expanded: isProcessorExpanded }"
          @click="handleToggleProcessorExpand"
        >
          <span class="material-icons">chevron_right</span>
        </button>
        <span class="material-icons layer-icon">tune</span>
        <div class="layer-info">
          <span class="layer-name">Processor</span>
        </div>
      </div>
      <!-- Processor children (Effect, Mask) -->
      <template v-if="isProcessorExpanded">
        <div
          v-for="mod in modifiers"
          :key="`${mod.type}-${mod.index}`"
          class="processor-child-node"
          :class="{ dragging: isModifierBeingDragged(mod.index) }"
          :style="{ paddingLeft: `${(depth + 1) * 0.75}rem` }"
          :data-modifier-node-id="node.id"
          :data-modifier-index="mod.index"
          @click="handleSelectProcessor(mod.type)"
          @contextmenu="(e: MouseEvent) => handleContextMenu(e, mod.type, mod.index)"
          @pointerdown="(e: PointerEvent) => handleModifierPointerDown(e, mod.index, mod.type)"
        >
          <!-- Drop Indicator for Modifier -->
          <DropIndicator
            v-if="getLocalModifierDropTarget(mod.index)"
            :position="getLocalModifierDropTarget(mod.index)!.position"
          />
          <span class="expand-spacer" />
          <span class="material-icons layer-icon">{{ mod.icon }}</span>
          <div class="layer-info">
            <span class="layer-name">{{ mod.label }}</span>
          </div>
          <span class="processor-value">{{ mod.value }}</span>
          <span class="material-icons processor-arrow">chevron_right</span>
        </div>
      </template>
    </template>

    <!-- Children (Recursive) -->
    <template v-if="isExpanded && children.length > 0 && node.visible">
      <DraggableLayerNode
        v-for="(child, index) in children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :selected-processor-type="selectedProcessorType"
        :layers="layers"
        :expanded-layer-ids="expandedLayerIds"
        :is-processor-target="isChildProcessorTarget(index)"
        @select="(id: string) => emit('select', id)"
        @toggle-expand="(id: string) => emit('toggle-expand', id)"
        @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
        @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
        @remove-layer="(id: string) => emit('remove-layer', id)"
        @add-processor="(id: string, type: AddProcessorType) => emit('add-processor', id, type)"
        @contextmenu="(id: string, e: MouseEvent, targetType: ContextTargetType, modifierIndex?: number) => emit('contextmenu', id, e, targetType, modifierIndex)"
        @move-node="(id: string, position: LayerDropPosition) => emit('move-node', id, position)"
        @move-modifier="(sourceNodeId: string, modifierIndex: number, position: ModifierDropPosition) => emit('move-modifier', sourceNodeId, modifierIndex, position)"
      />
    </template>
  </div>
</template>

<style scoped>
.draggable-layer-node {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Node Header */
.node-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 0.25rem;
  overflow: visible; /* Allow processor link to overflow */
}

.node-header:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .node-header:hover {
  background: oklch(0.24 0.02 260);
}

.node-header.selected {
  background: oklch(0.55 0.15 250 / 0.15);
}

:global(.dark) .node-header.selected {
  background: oklch(0.55 0.15 250 / 0.25);
}

.node-header.dragging {
  opacity: 0.5;
}

.node-header {
  position: relative;
  touch-action: none;
  user-select: none;
}

/* Expand Toggle */
.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 0.75rem;
  height: 1rem;
  padding: 0;
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  border-radius: 0.125rem;
  transition: transform 0.15s, color 0.15s;
  flex-shrink: 0;
}

:global(.dark) .expand-toggle {
  color: oklch(0.55 0.02 260);
}

.expand-toggle:hover {
  color: oklch(0.35 0.02 260);
}

:global(.dark) .expand-toggle:hover {
  color: oklch(0.75 0.02 260);
}

.expand-toggle.expanded {
  transform: rotate(90deg);
}

.expand-toggle .material-icons {
  font-size: 1rem;
}

.expand-spacer {
  width: 0.75rem;
  flex-shrink: 0;
}

/* Layer Icon */
.layer-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
  flex-shrink: 0;
}

:global(.dark) .layer-icon {
  color: oklch(0.60 0.02 260);
}

/* Layer Info */
.layer-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.layer-name {
  font-size: 0.8125rem;
  color: oklch(0.25 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .layer-name {
  color: oklch(0.85 0.02 260);
}

/* Visibility Toggle */
.visibility-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  border-radius: 0.125rem;
  transition: color 0.15s;
  flex-shrink: 0;
  opacity: 0;
}

.node-header:hover .visibility-toggle,
.visibility-toggle.hidden {
  opacity: 1;
}

:global(.dark) .visibility-toggle {
  color: oklch(0.60 0.02 260);
}

.visibility-toggle:hover {
  color: oklch(0.30 0.02 260);
}

:global(.dark) .visibility-toggle:hover {
  color: oklch(0.85 0.02 260);
}

.visibility-toggle.hidden {
  color: oklch(0.70 0.01 260);
}

:global(.dark) .visibility-toggle.hidden {
  color: oklch(0.40 0.02 260);
}

.visibility-toggle .material-icons {
  font-size: 1rem;
}

.visibility-spacer {
  width: 1.25rem;
  flex-shrink: 0;
}

/* Remove Toggle */
.remove-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: none;
  border: none;
  color: oklch(0.55 0.02 260);
  cursor: pointer;
  border-radius: 0.125rem;
  transition: color 0.15s;
  flex-shrink: 0;
  opacity: 0;
}

.node-header:hover .remove-toggle {
  opacity: 1;
}

:global(.dark) .remove-toggle {
  color: oklch(0.50 0.02 260);
}

.remove-toggle:hover {
  color: oklch(0.60 0.15 25);
}

.remove-toggle .material-icons {
  font-size: 1rem;
}

/* ============================================================
   Processor Link System (連結矢印) - SVG版
   ============================================================ */

/* SVGアイコン共通スタイル */
.processor-link-icon {
  width: 0.75rem;
  height: 1.5rem;
  flex-shrink: 0;
  color: oklch(0.55 0.02 260);
  overflow: visible; /* SVGがはみ出せるように */
}

:global(.dark) .processor-link-icon {
  color: oklch(0.50 0.02 260);
}

/* Processor group node (parent of Effect/Mask) */
.processor-group-node {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  transition: background 0.15s;
  cursor: pointer;
}

.processor-group-node:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .processor-group-node:hover {
  background: oklch(0.24 0.02 260);
}

.processor-group-node.selected {
  background: oklch(0.55 0.15 250 / 0.15);
}

:global(.dark) .processor-group-node.selected {
  background: oklch(0.55 0.15 250 / 0.25);
}

/* Processor内のchevronは小さく */
.processor-group-node .expand-toggle {
  width: 0.5rem;
}

/* Processor child nodes (Effect, Mask) */
.processor-child-node {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 0.25rem;
  position: relative;
  touch-action: none;
  user-select: none;
}

.processor-child-node.dragging {
  opacity: 0.5;
}

.processor-child-node:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .processor-child-node:hover {
  background: oklch(0.24 0.02 260);
}

.processor-value {
  flex: 1;
  font-size: 0.6875rem;
  color: oklch(0.55 0.02 260);
  text-align: right;
  margin-right: 0.25rem;
}

:global(.dark) .processor-value {
  color: oklch(0.55 0.02 260);
}

.processor-arrow {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
  opacity: 0;
  transition: opacity 0.15s;
}

:global(.dark) .processor-arrow {
  color: oklch(0.45 0.02 260);
}

.processor-child-node:hover .processor-arrow {
  opacity: 1;
}

/* ============================================================
   Add Processor Button & Menu
   ============================================================ */

.add-processor-container {
  position: relative;
}

.add-processor-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  border-radius: 0.25rem;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
  opacity: 0;
}

.node-header:hover .add-processor-toggle {
  opacity: 1;
}

:global(.dark) .add-processor-toggle {
  color: oklch(0.60 0.02 260);
}

.add-processor-toggle:hover {
  color: oklch(0.35 0.02 260);
  background: oklch(0.88 0.01 260);
}

:global(.dark) .add-processor-toggle:hover {
  color: oklch(0.80 0.02 260);
  background: oklch(0.28 0.02 260);
}

.add-processor-toggle.active {
  opacity: 1;
  color: oklch(0.50 0.15 250);
  background: oklch(0.90 0.01 260);
}

:global(.dark) .add-processor-toggle.active {
  color: oklch(0.65 0.15 250);
  background: oklch(0.28 0.02 260);
}

.add-processor-toggle .material-icons {
  font-size: 1rem;
}

.add-processor-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 7rem;
  margin-top: 0.25rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  overflow: hidden;
  z-index: 20;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:global(.dark) .add-processor-menu {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.30 0.02 260);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.add-processor-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  color: oklch(0.25 0.02 260);
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

:global(.dark) .add-processor-item {
  color: oklch(0.85 0.02 260);
}

.add-processor-item:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .add-processor-item:hover {
  background: oklch(0.28 0.02 260);
}

.add-processor-item .material-icons {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .add-processor-item .material-icons {
  color: oklch(0.60 0.02 260);
}

/* Fade transition for menu */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

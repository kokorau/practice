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
import type { SceneNode, Group, LayerVariant } from '../../modules/HeroScene'
import { isGroup, isLayer, isEffectModifier, isMaskModifier } from '../../modules/HeroScene'
import { LAYER_DRAG_KEY, type DropTarget } from '../../composables/useLayerDragAndDrop'
import DropIndicator from './DropIndicator.vue'

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  node: SceneNode
  depth: number
  selectedId: string | null
  selectedProcessorType: 'effect' | 'mask' | 'processor' | null
  /** All nodes in the tree (for DnD validation) */
  nodes: SceneNode[]
}>()

/** Context menu target type */
export type ContextTargetType = 'layer' | 'processor' | 'effect' | 'mask'

const emit = defineEmits<{
  select: [nodeId: string]
  'toggle-expand': [nodeId: string]
  'toggle-visibility': [nodeId: string]
  'select-processor': [nodeId: string, processorType: 'effect' | 'mask' | 'processor']
  'remove-layer': [nodeId: string]
  // Context menu event (with target type)
  contextmenu: [nodeId: string, event: MouseEvent, targetType: ContextTargetType]
  // DnD move event
  'move-node': [nodeId: string, position: import('../../modules/HeroScene').DropPosition]
}>()

// ============================================================
// Computed
// ============================================================

const isSelected = computed(() => props.selectedId === props.node.id)
const isGroupNode = computed(() => isGroup(props.node))
const hasChildren = computed(() => isGroupNode.value && (props.node as Group).children.length > 0)
const isExpanded = computed(() => props.node.expanded)

// Check if this node has expandable content (only children, modifiers are always visible)
const hasExpandableContent = computed(() => hasChildren.value)
const hasModifiers = computed(() => modifiers.value.length > 0)

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
const children = computed(() => {
  if (isGroup(props.node)) {
    return props.node.children
  }
  return []
})

// Get node variant for Layer nodes
const nodeVariant = computed((): LayerVariant | 'group' => {
  if (isLayer(props.node)) {
    return props.node.variant
  }
  return 'group'
})

// Modifier info
// Note: Effect details are managed by useEffectManager and shown in property panel
// Layer tree only shows whether effect/mask modifiers exist
const modifiers = computed(() => {
  const result: { type: 'effect' | 'mask'; label: string; value: string; icon: string; enabled: boolean }[] = []

  const nodeModifiers = props.node.modifiers
  // Effect placeholder - details are in useEffectManager
  const effectMod = nodeModifiers.find(isEffectModifier)
  if (effectMod) {
    result.push({
      type: 'effect',
      label: 'Effect',
      value: '', // Details shown in property panel
      icon: 'auto_fix_high',
      enabled: true,
    })
  }

  // MaskModifier
  for (const mod of nodeModifiers) {
    if (isMaskModifier(mod)) {
      result.push({
        type: 'mask',
        label: 'Mask',
        value: mod.config.shape,
        icon: 'content_cut',
        enabled: mod.enabled,
      })
    }
  }

  return result
})

// ============================================================
// Icon & Label Helpers
// ============================================================

const getLayerIcon = (variant: LayerVariant | 'group'): string => {
  switch (variant) {
    case 'base': return 'gradient'
    case 'surface': return 'texture'
    case 'group': return 'folder_open'
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

const handleContextMenu = (e: MouseEvent, targetType: ContextTargetType = 'layer') => {
  e.preventDefault()
  e.stopPropagation()
  emit('contextmenu', props.node.id, e, targetType)
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
// Drag & Drop
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
    { type: 'sceneNode', nodeId: props.node.id },
    e
  )
  // Note: Don't use setPointerCapture here - we need events to reach other nodes
}
</script>

<template>
  <div class="draggable-layer-node">
    <!-- Node Header -->
    <div
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
      <!-- Processor Link: 上向き矢印 (対象レイヤーの先頭) -->
      <svg v-if="hasModifiers" class="processor-link-icon" viewBox="0 0 12 24" fill="none">
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
      <span v-else-if="!hasModifiers" class="expand-spacer" />

      <!-- Type Icon -->
      <span class="material-icons layer-icon">{{ getLayerIcon(nodeVariant) }}</span>

      <!-- Layer Name -->
      <div class="layer-info">
        <span class="layer-name">{{ node.name }}</span>
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
          :key="mod.type"
          class="processor-child-node"
          :style="{ paddingLeft: `${(depth + 1) * 0.75}rem` }"
          @click="handleSelectProcessor(mod.type)"
          @contextmenu="(e: MouseEvent) => handleContextMenu(e, mod.type)"
        >
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
        v-for="child in children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :selected-processor-type="selectedProcessorType"
        :nodes="nodes"
        @select="(id: string) => emit('select', id)"
        @toggle-expand="(id: string) => emit('toggle-expand', id)"
        @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
        @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
        @remove-layer="(id: string) => emit('remove-layer', id)"
        @contextmenu="(id: string, e: MouseEvent, targetType: ContextTargetType) => emit('contextmenu', id, e, targetType)"
        @move-node="(id: string, position: import('../../modules/HeroScene').DropPosition) => emit('move-node', id, position)"
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
</style>

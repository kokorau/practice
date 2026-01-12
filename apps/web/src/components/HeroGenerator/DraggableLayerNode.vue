<script setup lang="ts">
/**
 * DraggableLayerNode
 *
 * Recursive tree node component with drag & drop support.
 * Features:
 * - Native HTML5 drag and drop
 * - Visual depth indication via indentation
 * - Three drop zones: before, into (groups only), after
 * - Expand/collapse for groups
 */

import { computed, ref } from 'vue'
import type { SceneNode, Group, LayerVariant, DropPosition } from '../../modules/HeroScene'
import { isGroup, isLayer, isEffectModifier, isMaskModifier } from '../../modules/HeroScene'
import type { DropTarget } from './useLayerDragDrop'

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  node: SceneNode
  depth: number
  selectedId: string | null
  selectedProcessorType: 'effect' | 'mask' | 'processor' | null
  draggedId: string | null
  dropTarget: DropTarget | null
}>()

/** Context menu target type */
export type ContextTargetType = 'layer' | 'processor' | 'effect' | 'mask'

const emit = defineEmits<{
  select: [nodeId: string]
  'toggle-expand': [nodeId: string]
  'toggle-visibility': [nodeId: string]
  'select-processor': [nodeId: string, processorType: 'effect' | 'mask' | 'processor']
  'remove-layer': [nodeId: string]
  // Drag & drop events
  'drag-start': [nodeId: string]
  'drag-end': []
  'drag-over': [nodeId: string, position: DropPosition, event: DragEvent]
  'drag-leave': [nodeId: string]
  drop: [sourceId: string, targetId: string, position: DropPosition]
  // Processor drop zone event
  'drop-to-processor': [sourceId: string, targetLayerId: string]
  // Context menu event (with target type)
  contextmenu: [nodeId: string, event: MouseEvent, targetType: ContextTargetType]
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
const isDragging = computed(() => props.draggedId === props.node.id)
const isBaseLayer = computed(() => isLayer(props.node) && props.node.variant === 'base')
const isDraggable = computed(() => !isBaseLayer.value)
const hasModifiers = computed(() => modifiers.value.length > 0)

// Check if this node's processor is selected
const isProcessorSelected = computed(() =>
  props.selectedId === props.node.id && props.selectedProcessorType === 'processor'
)

// Processor expand state (local, not persisted)
const isProcessorExpanded = ref(true)

// Check if this node is the current drop target
const isDropTarget = computed(() => props.dropTarget?.nodeId === props.node.id)
const dropPosition = computed(() => props.dropTarget?.nodeId === props.node.id ? props.dropTarget.position : null)

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
const modifiers = computed(() => {
  const result: { type: 'effect' | 'mask'; label: string; value: string; icon: string; enabled: boolean }[] = []

  const nodeModifiers = props.node.modifiers
  const effectMod = nodeModifiers.find(isEffectModifier)
  if (effectMod) {
    const activeEffects: string[] = []
    if (effectMod.config.vignette.enabled) activeEffects.push('Vignette')
    if (effectMod.config.chromaticAberration.enabled) activeEffects.push('CA')
    if (effectMod.config.dotHalftone.enabled) activeEffects.push('Dot HT')
    if (effectMod.config.lineHalftone.enabled) activeEffects.push('Line HT')
    result.push({
      type: 'effect',
      label: 'Effect',
      value: activeEffects.length > 0 ? activeEffects.join(' / ') : 'None',
      icon: 'auto_fix_high',
      enabled: effectMod.enabled,
    })
  }

  if (!isBaseLayer.value) {
    const maskMod = nodeModifiers.find(isMaskModifier)
    if (maskMod) {
      const shapeType = maskMod.config.shape
      result.push({
        type: 'mask',
        label: 'Mask',
        value: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
        icon: 'crop',
        enabled: maskMod.enabled,
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

// Drag & Drop Handlers
const handleDragStart = (e: DragEvent) => {
  if (!isDraggable.value) {
    e.preventDefault()
    return
  }
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', props.node.id)
  emit('drag-start', props.node.id)
}

const handleDragEnd = () => {
  emit('drag-end')
}

const handleDragOver = (e: DragEvent) => {
  // Don't allow dropping onto self or if not dragging
  if (!props.draggedId || props.draggedId === props.node.id) {
    return
  }
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'

  // Calculate drop position based on mouse position
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const y = e.clientY - rect.top
  const height = rect.height

  const topZone = height * 0.25
  const bottomZone = height * 0.75

  let position: DropPosition
  if (y < topZone) {
    position = 'before'
  } else if (y > bottomZone) {
    position = 'after'
  } else {
    position = isGroupNode.value ? 'into' : 'after'
  }

  emit('drag-over', props.node.id, position, e)
}

const handleDragLeave = (e: DragEvent) => {
  // Check if we're leaving to a child element
  const relatedTarget = e.relatedTarget as HTMLElement | null
  const currentTarget = e.currentTarget as HTMLElement
  if (relatedTarget && currentTarget.contains(relatedTarget)) {
    return
  }
  emit('drag-leave', props.node.id)
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  if (!props.draggedId || !props.dropTarget) return

  emit('drop', props.draggedId, props.dropTarget.nodeId, props.dropTarget.position)
}

// Processor Drop Zone State & Handlers
const isProcessorDropZoneActive = ref(false)

const handleProcessorDropZoneDragOver = (e: DragEvent) => {
  if (!props.draggedId || props.draggedId === props.node.id) {
    return
  }
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  isProcessorDropZoneActive.value = true
}

const handleProcessorDropZoneDragLeave = () => {
  isProcessorDropZoneActive.value = false
}

const handleProcessorDropZoneDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (!props.draggedId) return

  emit('drop-to-processor', props.draggedId, props.node.id)
  isProcessorDropZoneActive.value = false
}
</script>

<template>
  <div
    class="draggable-layer-node"
    :class="{
      'is-dragging': isDragging,
      'is-drop-target': isDropTarget,
      'drop-before': dropPosition === 'before',
      'drop-into': dropPosition === 'into',
      'drop-after': dropPosition === 'after',
    }"
  >
    <!-- Node Header -->
    <div
      class="node-header"
      :class="{ selected: isSelected }"
      :style="indentStyle"
      :draggable="isDraggable"
      @click="handleSelect"
      @contextmenu="(e: MouseEvent) => handleContextMenu(e, 'layer')"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
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
      <span v-else-if="!isBaseLayer && !hasModifiers" class="expand-spacer" />

      <!-- Type Icon -->
      <span class="material-icons layer-icon">{{ getLayerIcon(nodeVariant) }}</span>

      <!-- Layer Name -->
      <div class="layer-info">
        <span class="layer-name">{{ node.name }}</span>
      </div>

      <!-- Visibility Toggle -->
      <button
        v-if="!isBaseLayer"
        class="visibility-toggle"
        :class="{ hidden: !node.visible }"
        @click="handleToggleVisibility"
      >
        <span class="material-icons">{{ node.visible ? 'visibility' : 'visibility_off' }}</span>
      </button>
      <span v-else class="visibility-spacer" />

      <!-- Remove Button -->
      <button
        v-if="!isBaseLayer"
        class="remove-toggle"
        @click="handleRemove"
      >
        <span class="material-icons">close</span>
      </button>
      <span v-else class="visibility-spacer" />
    </div>

    <!-- Processor Drop Zone (visible when dragging, between surface and processor) -->
    <div
      v-if="hasModifiers && draggedId && draggedId !== node.id"
      class="processor-drop-zone"
      :class="{ active: isProcessorDropZoneActive }"
      :style="{ paddingLeft: `${depth * 0.75 + 1.5}rem` }"
      @dragover="handleProcessorDropZoneDragOver"
      @dragleave="handleProcessorDropZoneDragLeave"
      @drop="handleProcessorDropZoneDrop"
    >
      <span class="material-icons drop-zone-icon">add</span>
      <span class="drop-zone-text">Drop here to add to processor</span>
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
        :dragged-id="draggedId"
        :drop-target="dropTarget"
        @select="(id: string) => emit('select', id)"
        @toggle-expand="(id: string) => emit('toggle-expand', id)"
        @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
        @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
        @remove-layer="(id: string) => emit('remove-layer', id)"
        @contextmenu="(id: string, e: MouseEvent, targetType: ContextTargetType) => emit('contextmenu', id, e, targetType)"
        @drag-start="(id: string) => emit('drag-start', id)"
        @drag-end="() => emit('drag-end')"
        @drag-over="(id: string, pos: DropPosition, e: DragEvent) => emit('drag-over', id, pos, e)"
        @drag-leave="(id: string) => emit('drag-leave', id)"
        @drop="(src: string, tgt: string, pos: DropPosition) => emit('drop', src, tgt, pos)"
        @drop-to-processor="(src: string, tgt: string) => emit('drop-to-processor', src, tgt)"
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

/* Dragging state */
.draggable-layer-node.is-dragging {
  opacity: 0.5;
}

/* Drop target indicators */
.draggable-layer-node.is-drop-target.drop-before::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: oklch(0.55 0.20 250);
  z-index: 10;
}

.draggable-layer-node.is-drop-target.drop-after::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: oklch(0.55 0.20 250);
  z-index: 10;
}

.draggable-layer-node.is-drop-target.drop-into > .node-header {
  background: oklch(0.55 0.20 250 / 0.2);
  outline: 2px solid oklch(0.55 0.20 250);
  outline-offset: -2px;
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

/* ============================================================
   Processor Drop Zone
   ============================================================ */

.processor-drop-zone {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  margin: 0.125rem 0;
  border: 2px dashed oklch(0.65 0.10 250 / 0.5);
  border-radius: 0.25rem;
  background: oklch(0.95 0.02 250 / 0.3);
  color: oklch(0.50 0.10 250);
  font-size: 0.75rem;
  transition: all 0.15s ease;
  cursor: pointer;
}

:global(.dark) .processor-drop-zone {
  border-color: oklch(0.50 0.10 250 / 0.5);
  background: oklch(0.25 0.02 250 / 0.3);
  color: oklch(0.60 0.10 250);
}

.processor-drop-zone.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.90 0.05 250 / 0.5);
  color: oklch(0.45 0.15 250);
}

:global(.dark) .processor-drop-zone.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.30 0.05 250 / 0.5);
  color: oklch(0.65 0.15 250);
}

.drop-zone-icon {
  font-size: 1rem;
}

.drop-zone-text {
  font-weight: 500;
}
</style>

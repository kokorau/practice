<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import type { SceneNode, ForegroundElementConfig, ForegroundElementType, DropPosition } from '../../modules/HeroScene'
import DraggableLayerNode, { type ContextTargetType } from './DraggableLayerNode.vue'
import DragPreview from './DragPreview.vue'
import { useLayerSelection } from '../../composables/useLayerSelection'
import { useLayerDragAndDrop, LAYER_DRAG_KEY } from '../../composables/useLayerDragAndDrop'

// ============================================================
// Types
// ============================================================

/**
 * Layer types in the UI (for add layer menu)
 * Combines LayerVariant values with 'group' for the UI
 */
export type LayerType = 'base' | 'group' | 'surface' | 'model3d' | 'text' | 'image'

/** Sub-item types within a layer */
export type SubItemType = 'surface' | 'shape' | 'effect' | 'source' | 'filter'

// ============================================================
// Props & Emits
// ============================================================

/** HTML element types (re-exported for backward compatibility) */
export type HtmlElementType = ForegroundElementType

const props = defineProps<{
  layers: SceneNode[]
  foregroundElements: ForegroundElementConfig[]
  selectedForegroundElementId: string | null
}>()

// Layer selection from store
const { layerId: selectedLayerId, processorType: selectedProcessorType } = useLayerSelection()

const emit = defineEmits<{
  'select-layer': [layerId: string]
  'toggle-expand': [layerId: string]
  'toggle-visibility': [layerId: string]
  'select-processor': [layerId: string, processorType: 'effect' | 'mask' | 'processor']
  'add-layer': [type: LayerType]
  'remove-layer': [layerId: string]
  'layer-contextmenu': [layerId: string, event: MouseEvent, targetType: ContextTargetType]
  'move-node': [nodeId: string, position: DropPosition]
  'select-foreground-element': [elementId: string]
  'add-foreground-element': [type: ForegroundElementType]
  'remove-foreground-element': [elementId: string]
  'foreground-contextmenu': [elementId: string, event: MouseEvent]
}>()

// ============================================================
// Drag & Drop
// ============================================================

const dragAndDrop = useLayerDragAndDrop()
provide(LAYER_DRAG_KEY, dragAndDrop)

const handleMoveNode = (nodeId: string, position: DropPosition) => {
  emit('move-node', nodeId, position)
}

// ============================================================
// Context Menu
// ============================================================

const handleLayerContextMenu = (layerId: string, event: MouseEvent, targetType: ContextTargetType) => {
  emit('layer-contextmenu', layerId, event, targetType)
}

// ============================================================
// Add Layer Menu
// ============================================================

const showAddMenu = ref(false)

const allLayerTypes: { type: LayerType; label: string; icon: string; disabled?: boolean }[] = [
  { type: 'surface', label: 'Surface', icon: 'texture' },
  { type: 'group', label: 'Group', icon: 'folder_open' },
  { type: 'model3d', label: '3D Model', icon: 'view_in_ar' },
  { type: 'image', label: 'Image (WIP)', icon: 'image', disabled: true },
  { type: 'text', label: 'Text', icon: 'text_fields' },
]

// Filter out layer types that are disabled
const addableLayerTypes = computed(() => {
  return allLayerTypes.filter(item => !item.disabled)
})

const handleAddLayer = (type: LayerType) => {
  emit('add-layer', type)
  showAddMenu.value = false
}

// ============================================================
// Add HTML Element Menu
// ============================================================

const showHtmlAddMenu = ref(false)

const htmlElementTypes: { type: ForegroundElementType; label: string; icon: string }[] = [
  { type: 'title', label: 'Title', icon: 'title' },
  { type: 'description', label: 'Description', icon: 'notes' },
]

// Get visible foreground elements
const visibleForegroundElements = computed(() =>
  props.foregroundElements.filter(el => el.visible)
)

// Get icon for element type
const getElementIcon = (type: ForegroundElementType) =>
  type === 'title' ? 'title' : 'notes'

const handleAddForegroundElement = (type: ForegroundElementType) => {
  emit('add-foreground-element', type)
  showHtmlAddMenu.value = false
}

const handleRemoveForegroundElement = (elementId: string) => {
  emit('remove-foreground-element', elementId)
}

const handleSelectForegroundElement = (elementId: string) => {
  emit('select-foreground-element', elementId)
}

const handleForegroundContextMenu = (elementId: string, event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  emit('foreground-contextmenu', elementId, event)
}
</script>

<template>
  <div class="layer-panel">
    <!-- Canvas Layers Section -->
    <div class="panel-section">
      <div class="section-header">
        <span class="material-icons section-icon">layers</span>
        <span class="section-title">Canvas</span>
        <div class="add-layer-container">
          <button
            class="add-layer-icon-button"
            :class="{ active: showAddMenu }"
            title="Add Layer"
            @click="showAddMenu = !showAddMenu"
          >
            <span class="material-icons">add</span>
          </button>

          <Transition name="fade">
            <div v-if="showAddMenu" class="add-layer-menu">
              <button
                v-for="item in addableLayerTypes"
                :key="item.type"
                class="add-menu-item"
                :class="{ disabled: item.disabled }"
                :disabled="item.disabled"
                @click="!item.disabled && handleAddLayer(item.type)"
              >
                <span class="material-icons">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="layer-list">
        <DraggableLayerNode
          v-for="layer in layers"
          :key="layer.id"
          :node="layer"
          :depth="0"
          :selected-id="selectedLayerId"
          :selected-processor-type="selectedProcessorType ?? null"
          :nodes="layers"
          @select="(id: string) => emit('select-layer', id)"
          @toggle-expand="(id: string) => emit('toggle-expand', id)"
          @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
          @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
          @remove-layer="(id: string) => emit('remove-layer', id)"
          @contextmenu="handleLayerContextMenu"
          @move-node="handleMoveNode"
        />
      </div>

      <!-- Drag Preview -->
      <DragPreview
        v-if="dragAndDrop.state.isDragging.value && dragAndDrop.state.dragItem.value"
        :nodes="layers"
        :node-id="dragAndDrop.state.dragItem.value.nodeId"
        :position="dragAndDrop.state.pointerPosition.value"
      />
    </div>

    <!-- HTML Section -->
    <div class="panel-section">
      <div class="section-header">
        <span class="material-icons section-icon">code</span>
        <span class="section-title">HTML</span>
        <div class="add-layer-container">
          <button
            class="add-layer-icon-button"
            :class="{ active: showHtmlAddMenu }"
            title="Add HTML Element"
            @click="showHtmlAddMenu = !showHtmlAddMenu"
          >
            <span class="material-icons">add</span>
          </button>

          <Transition name="fade">
            <div v-if="showHtmlAddMenu" class="add-layer-menu">
              <button
                v-for="item in htmlElementTypes"
                :key="item.type"
                class="add-menu-item"
                @click="handleAddForegroundElement(item.type)"
              >
                <span class="material-icons">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="html-layer-list">
        <div
          v-for="element in visibleForegroundElements"
          :key="element.id"
          class="html-layer-item"
          :class="{ selected: selectedForegroundElementId === element.id }"
          @click="handleSelectForegroundElement(element.id)"
          @contextmenu="handleForegroundContextMenu(element.id, $event)"
        >
          <span class="material-icons html-layer-icon">{{ getElementIcon(element.type) }}</span>
          <span class="html-layer-name">{{ element.type === 'title' ? 'Title' : 'Description' }}</span>
          <button
            class="html-layer-remove"
            title="Remove"
            @click.stop="handleRemoveForegroundElement(element.id)"
          >
            <span class="material-icons">close</span>
          </button>
        </div>

        <div v-if="visibleForegroundElements.length === 0" class="html-layer-empty">
          No HTML elements
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Section */
.panel-section {
  /* No background or padding */
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid oklch(0.85 0.01 260);
}

:global(.dark) .section-header {
  border-bottom-color: oklch(0.25 0.02 260);
}

.section-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .section-icon {
  color: oklch(0.60 0.02 260);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.40 0.02 260);
}

:global(.dark) .section-title {
  color: oklch(0.70 0.02 260);
}

/* Layer List */
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Add Layer */
.add-layer-container {
  position: relative;
  margin-left: auto;
}

.add-layer-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

:global(.dark) .add-layer-icon-button {
  color: oklch(0.60 0.02 260);
}

.add-layer-icon-button:hover {
  color: oklch(0.35 0.02 260);
  background: oklch(0.88 0.01 260);
}

:global(.dark) .add-layer-icon-button:hover {
  color: oklch(0.80 0.02 260);
  background: oklch(0.28 0.02 260);
}

.add-layer-icon-button.active {
  color: oklch(0.50 0.15 250);
  background: oklch(0.90 0.01 260);
}

:global(.dark) .add-layer-icon-button.active {
  color: oklch(0.65 0.15 250);
  background: oklch(0.28 0.02 260);
}

.add-layer-icon-button .material-icons {
  font-size: 1rem;
}

.add-layer-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 9rem;
  margin-top: 0.25rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:global(.dark) .add-layer-menu {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.30 0.02 260);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.add-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: none;
  border: none;
  color: oklch(0.25 0.02 260);
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

:global(.dark) .add-menu-item {
  color: oklch(0.85 0.02 260);
}

.add-menu-item:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .add-menu-item:hover {
  background: oklch(0.28 0.02 260);
}

.add-menu-item .material-icons {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .add-menu-item .material-icons {
  color: oklch(0.60 0.02 260);
}

.add-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-menu-item.disabled:hover {
  background: none;
}

/* HTML Layer List */
.html-layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.html-layer-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.html-layer-item:hover {
  background: oklch(0.90 0.01 260);
}

:global(.dark) .html-layer-item:hover {
  background: oklch(0.24 0.02 260);
}

.html-layer-item.selected {
  background: oklch(0.55 0.15 250 / 0.15);
}

:global(.dark) .html-layer-item.selected {
  background: oklch(0.55 0.15 250 / 0.25);
}

.html-layer-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
  flex-shrink: 0;
}

:global(.dark) .html-layer-icon {
  color: oklch(0.60 0.02 260);
}

.html-layer-name {
  flex: 1;
  font-size: 0.8125rem;
  color: oklch(0.25 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .html-layer-name {
  color: oklch(0.85 0.02 260);
}

/* Contrast Badge */
.contrast-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
}

.contrast-badge.excellent {
  background: oklch(0.75 0.15 145);
  color: oklch(0.25 0.05 145);
}

.contrast-badge.good {
  background: oklch(0.80 0.12 130);
  color: oklch(0.30 0.05 130);
}

.contrast-badge.fair {
  background: oklch(0.80 0.12 85);
  color: oklch(0.30 0.05 85);
}

.contrast-badge.poor {
  background: oklch(0.75 0.15 30);
  color: oklch(0.25 0.05 30);
}

/* HTML Layer Remove Button */
.html-layer-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.25rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  color: oklch(0.55 0.02 260);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.html-layer-item:hover .html-layer-remove {
  opacity: 1;
}

.html-layer-remove:hover {
  color: oklch(0.50 0.15 25);
  background: oklch(0.90 0.05 25);
}

:global(.dark) .html-layer-remove:hover {
  color: oklch(0.70 0.15 25);
  background: oklch(0.28 0.05 25);
}

.html-layer-remove .material-icons {
  font-size: 0.875rem;
}

/* Empty States */
.html-layer-empty,
.add-menu-empty {
  padding: 0.75rem;
  font-size: 0.75rem;
  color: oklch(0.55 0.02 260);
  text-align: center;
}

:global(.dark) .html-layer-empty,
:global(.dark) .add-menu-empty {
  color: oklch(0.55 0.02 260);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

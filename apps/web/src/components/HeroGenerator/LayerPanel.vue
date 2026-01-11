<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LayerNode, LayerNodeType, DropPosition } from '../../modules/HeroScene'
import { flattenLayerNodes, isLayer } from '../../modules/HeroScene'
import DraggableLayerNode from './DraggableLayerNode.vue'
import { useLayerDragDrop } from './useLayerDragDrop'
import { useLayerSelection } from '../../composables/useLayerSelection'

// ============================================================
// Types (kept for backward compatibility)
// ============================================================

/**
 * Layer types in the UI
 */
export type LayerType = LayerNodeType

/** @deprecated Use LayerType instead */
export type LegacyLayerType = 'base' | 'group' | 'object' | 'text' | 'clipGroup'

/** @deprecated Use LayerNode instead */
export interface LayerItem {
  id: string
  type: LayerType
  name: string
  visible: boolean
  expanded: boolean
}

/** Sub-item types within a layer */
export type SubItemType = 'surface' | 'shape' | 'effect' | 'source' | 'filter'

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  layers: LayerNode[]
  titleContrastScore?: number | null
  descriptionContrastScore?: number | null
}>()

// Layer selection from store
const { layerId: selectedLayerId, processorType: selectedProcessorType } = useLayerSelection()

/** HTML element types */
export type HtmlElementType = 'title' | 'description' | 'button' | 'link'

const emit = defineEmits<{
  'select-layer': [layerId: string]
  'toggle-expand': [layerId: string]
  'toggle-visibility': [layerId: string]
  'select-processor': [layerId: string, processorType: 'effect' | 'mask' | 'processor']
  'add-layer': [type: LayerType]
  'remove-layer': [layerId: string]
  'move-layer': [sourceId: string, targetId: string, position: DropPosition]
  'open-foreground-title': []
  'open-foreground-description': []
  'add-html-element': [type: HtmlElementType]
}>()

// ============================================================
// Drag & Drop State
// ============================================================

const { draggedId, dropTarget, startDrag, endDrag, setDropTarget, clearDropTarget } = useLayerDragDrop()

const handleDragStart = (nodeId: string) => {
  startDrag(nodeId)
}

const handleDragEnd = () => {
  endDrag()
}

const handleDragOver = (nodeId: string, position: DropPosition) => {
  setDropTarget({ nodeId, position })
}

const handleDragLeave = (nodeId: string) => {
  clearDropTarget(nodeId)
}

const handleDrop = (sourceId: string, targetId: string, position: DropPosition) => {
  emit('move-layer', sourceId, targetId, position)
  endDrag()
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

// Filter out layer types that have reached their limit
const addableLayerTypes = computed(() => {
  const flatLayers = flattenLayerNodes(props.layers)
  const hasSurface = flatLayers.some(l => isLayer(l) && l.variant === 'surface')
  return allLayerTypes.filter(item => {
    // Currently limiting to 1 surface layer (can be expanded later)
    if (item.type === 'surface' && hasSurface) return false
    return true
  })
})

const handleAddLayer = (type: LayerType) => {
  emit('add-layer', type)
  showAddMenu.value = false
}

// ============================================================
// Add HTML Element Menu
// ============================================================

const showHtmlAddMenu = ref(false)

const htmlElementTypes: { type: HtmlElementType; label: string; icon: string; disabled?: boolean }[] = [
  { type: 'title', label: 'Title', icon: 'title' },
  { type: 'description', label: 'Description', icon: 'notes' },
  { type: 'button', label: 'Button (WIP)', icon: 'smart_button', disabled: true },
  { type: 'link', label: 'Link (WIP)', icon: 'link', disabled: true },
]

const handleAddHtmlElement = (type: HtmlElementType) => {
  emit('add-html-element', type)
  showHtmlAddMenu.value = false
}

// Get score level class for contrast badge
const getScoreLevel = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (score >= 75) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 45) return 'fair'
  return 'poor'
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
          :dragged-id="draggedId"
          :drop-target="dropTarget"
          @select="(id: string) => emit('select-layer', id)"
          @toggle-expand="(id: string) => emit('toggle-expand', id)"
          @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
          @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
          @remove-layer="(id: string) => emit('remove-layer', id)"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
          @drag-over="handleDragOver"
          @drag-leave="handleDragLeave"
          @drop="handleDrop"
        />
      </div>
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
                :class="{ disabled: item.disabled }"
                :disabled="item.disabled"
                @click="!item.disabled && handleAddHtmlElement(item.type)"
              >
                <span class="material-icons">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="html-layer-list">
        <button class="html-layer-item" @click="emit('open-foreground-title')">
          <span class="material-icons html-layer-icon">title</span>
          <span class="html-layer-name">Title</span>
          <span
            v-if="titleContrastScore != null"
            class="contrast-badge"
            :class="getScoreLevel(titleContrastScore)"
          >Lc {{ titleContrastScore }}</span>
        </button>

        <button class="html-layer-item" @click="emit('open-foreground-description')">
          <span class="material-icons html-layer-icon">notes</span>
          <span class="html-layer-name">Description</span>
          <span
            v-if="descriptionContrastScore != null"
            class="contrast-badge"
            :class="getScoreLevel(descriptionContrastScore)"
          >Lc {{ descriptionContrastScore }}</span>
        </button>
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

<script setup lang="ts">
import { ref } from 'vue'

// ============================================================
// Types
// ============================================================
export type LayerType = 'base' | 'mask' | 'object' | 'text'

export interface LayerItem {
  id: string
  type: LayerType
  name: string
  visible: boolean
  expanded: boolean
}

export type SubItemType = 'surface' | 'shape' | 'filter' | 'source'

export interface SubItemConfig {
  type: SubItemType
  label: string
  value: string
  enabled: boolean
}

// ============================================================
// Props & Emits
// ============================================================
defineProps<{
  layers: LayerItem[]
}>()

const emit = defineEmits<{
  'toggle-visibility': [layerId: string]
  'toggle-expand': [layerId: string]
  'select-subitem': [layerId: string, subItemType: SubItemType]
  'add-layer': [type: LayerType]
  'remove-layer': [layerId: string]
}>()

// ============================================================
// Layer Configuration
// ============================================================
const getSubItems = (layer: LayerItem): SubItemConfig[] => {
  switch (layer.type) {
    case 'base':
      return [
        { type: 'surface', label: 'Surface', value: 'Stripe', enabled: true },
        { type: 'filter', label: 'Filter', value: 'Vignette / CA', enabled: true },
      ]
    case 'mask':
      return [
        { type: 'surface', label: 'Surface', value: 'Solid', enabled: true },
        { type: 'shape', label: 'Shape', value: 'Blob', enabled: true },
        { type: 'filter', label: 'Filter', value: 'WIP', enabled: false },
      ]
    case 'object':
      return [
        { type: 'source', label: 'Source', value: 'Image', enabled: true },
        { type: 'filter', label: 'Filter', value: 'WIP', enabled: false },
      ]
    case 'text':
      return [
        { type: 'source', label: 'Source', value: 'Text Content', enabled: true },
        { type: 'filter', label: 'Filter', value: 'WIP', enabled: false },
      ]
    default:
      return []
  }
}

const getLayerIcon = (type: LayerType): string => {
  switch (type) {
    case 'base': return 'gradient'
    case 'mask': return 'crop_free'
    case 'object': return 'image'
    case 'text': return 'text_fields'
    default: return 'layers'
  }
}

const getLayerTypeLabel = (type: LayerType): string => {
  switch (type) {
    case 'base': return 'Base'
    case 'mask': return 'Mask'
    case 'object': return 'Object'
    case 'text': return 'Text'
    default: return 'Layer'
  }
}

// ============================================================
// Add Layer Menu
// ============================================================
const showAddMenu = ref(false)

const addableLayerTypes: { type: LayerType; label: string; icon: string }[] = [
  { type: 'mask', label: 'Mask', icon: 'crop_free' },
  { type: 'object', label: 'Object', icon: 'image' },
  { type: 'text', label: 'Text', icon: 'text_fields' },
]

const handleAddLayer = (type: LayerType) => {
  emit('add-layer', type)
  showAddMenu.value = false
}
</script>

<template>
  <div class="layer-panel">
    <!-- Canvas Layers Section -->
    <div class="panel-section">
      <div class="section-header">
        <span class="material-icons section-icon">layers</span>
        <span class="section-title">Canvas</span>
      </div>

      <div class="layer-list">
        <div
          v-for="layer in layers"
          :key="layer.id"
          class="layer-item"
          :class="{ expanded: layer.expanded }"
        >
          <!-- Layer Header -->
          <div class="layer-header" @click="emit('toggle-expand', layer.id)">
            <button
              class="visibility-toggle"
              :class="{ hidden: !layer.visible }"
              @click.stop="emit('toggle-visibility', layer.id)"
            >
              <span class="material-icons">{{ layer.visible ? 'visibility' : 'visibility_off' }}</span>
            </button>

            <span class="material-icons layer-icon">{{ getLayerIcon(layer.type) }}</span>

            <div class="layer-info">
              <span class="layer-type">{{ getLayerTypeLabel(layer.type) }}</span>
              <span class="layer-name">{{ layer.name }}</span>
            </div>

            <span class="material-icons expand-icon">
              {{ layer.expanded ? 'expand_less' : 'expand_more' }}
            </span>

            <!-- Remove button (not for base) -->
            <button
              v-if="layer.type !== 'base'"
              class="remove-button"
              @click.stop="emit('remove-layer', layer.id)"
            >
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Sub Items (expanded) -->
          <Transition name="expand">
            <div v-if="layer.expanded" class="sub-items">
              <button
                v-for="subItem in getSubItems(layer)"
                :key="subItem.type"
                class="sub-item"
                :class="{ disabled: !subItem.enabled }"
                :disabled="!subItem.enabled"
                @click="emit('select-subitem', layer.id, subItem.type)"
              >
                <span class="sub-item-label">{{ subItem.label }}</span>
                <span class="sub-item-value">{{ subItem.value }}</span>
                <span class="material-icons sub-item-arrow">chevron_right</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Add Layer Button -->
      <div class="add-layer-container">
        <button class="add-layer-button" @click="showAddMenu = !showAddMenu">
          <span class="material-icons">add</span>
          <span>Add Layer</span>
        </button>

        <Transition name="fade">
          <div v-if="showAddMenu" class="add-layer-menu">
            <button
              v-for="item in addableLayerTypes"
              :key="item.type"
              class="add-menu-item"
              @click="handleAddLayer(item.type)"
            >
              <span class="material-icons">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- HTML Section -->
    <div class="panel-section">
      <div class="section-header">
        <span class="material-icons section-icon">code</span>
        <span class="section-title">HTML</span>
      </div>

      <div class="html-note">
        <span class="material-icons">info</span>
        <span>Foreground HTML layer (CTA, text) - customization coming soon</span>
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
  background: oklch(0.18 0.02 260);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid oklch(0.25 0.02 260);
}

.section-icon {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.70 0.02 260);
}

/* Layer List */
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.layer-item {
  background: oklch(0.22 0.02 260);
  border-radius: 0.375rem;
  overflow: hidden;
}

.layer-item.expanded {
  background: oklch(0.24 0.02 260);
}

/* Layer Header */
.layer-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
}

.layer-header:hover {
  background: oklch(0.28 0.02 260);
}

.visibility-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: none;
  border: none;
  color: oklch(0.70 0.02 260);
  cursor: pointer;
  padding: 0;
  border-radius: 0.25rem;
  transition: color 0.15s, background 0.15s;
}

.visibility-toggle:hover {
  background: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.visibility-toggle.hidden {
  color: oklch(0.40 0.02 260);
}

.visibility-toggle .material-icons {
  font-size: 1rem;
}

.layer-icon {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
}

.layer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.layer-type {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: oklch(0.50 0.02 260);
}

.layer-name {
  font-size: 0.75rem;
  color: oklch(0.85 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expand-icon {
  font-size: 1.125rem;
  color: oklch(0.50 0.02 260);
}

.remove-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
  padding: 0;
  border-radius: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.layer-header:hover .remove-button {
  opacity: 1;
}

.remove-button:hover {
  background: oklch(0.40 0.10 25);
  color: oklch(0.90 0.02 260);
}

.remove-button .material-icons {
  font-size: 0.875rem;
}

/* Sub Items */
.sub-items {
  display: flex;
  flex-direction: column;
  padding: 0 0.5rem 0.5rem;
  gap: 0.25rem;
}

.sub-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: oklch(0.20 0.02 260);
  border: 1px solid oklch(0.28 0.02 260);
  border-radius: 0.25rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.sub-item:hover:not(.disabled) {
  background: oklch(0.26 0.02 260);
  border-color: oklch(0.35 0.02 260);
}

.sub-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sub-item-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: oklch(0.60 0.02 260);
  min-width: 3.5rem;
}

.sub-item-value {
  flex: 1;
  font-size: 0.75rem;
  color: oklch(0.85 0.02 260);
}

.sub-item-arrow {
  font-size: 1rem;
  color: oklch(0.45 0.02 260);
}

.sub-item:hover:not(.disabled) .sub-item-arrow {
  color: oklch(0.70 0.02 260);
}

/* Add Layer */
.add-layer-container {
  position: relative;
  margin-top: 0.5rem;
}

.add-layer-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: 1px dashed oklch(0.35 0.02 260);
  border-radius: 0.375rem;
  color: oklch(0.60 0.02 260);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.add-layer-button:hover {
  border-color: oklch(0.50 0.15 250);
  color: oklch(0.80 0.02 260);
  background: oklch(0.22 0.02 260);
}

.add-layer-button .material-icons {
  font-size: 1rem;
}

.add-layer-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: oklch(0.22 0.02 260);
  border: 1px solid oklch(0.30 0.02 260);
  border-radius: 0.375rem;
  overflow: hidden;
  z-index: 10;
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
  color: oklch(0.85 0.02 260);
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.add-menu-item:hover {
  background: oklch(0.28 0.02 260);
}

.add-menu-item .material-icons {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
}

/* HTML Note */
.html-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem;
  background: oklch(0.22 0.02 260);
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  color: oklch(0.60 0.02 260);
  line-height: 1.4;
}

.html-note .material-icons {
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* Transitions */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 200px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

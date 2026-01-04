<script setup lang="ts">
import { ref, computed } from 'vue'

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
// Types: Filter config (from HeroScene module)
// ============================================================
export interface LayerFilterConfig {
  vignette: { enabled: boolean }
  chromaticAberration: { enabled: boolean }
  dotHalftone: { enabled: boolean }
  lineHalftone: { enabled: boolean }
}

// ============================================================
// Props & Emits
// ============================================================
const props = defineProps<{
  layers: LayerItem[]
  layerFilterConfigs?: Map<string, LayerFilterConfig>
  backgroundSurfaceLabel?: string
  maskSurfaceLabel?: string
  maskShapeLabel?: string
}>()

const emit = defineEmits<{
  'toggle-visibility': [layerId: string]
  'select-subitem': [layerId: string, subItemType: SubItemType]
  'add-layer': [type: LayerType]
  'remove-layer': [layerId: string]
  'open-foreground-title': []
  'open-foreground-description': []
}>()

// ============================================================
// Layer Configuration
// ============================================================

// Map UI layer ID to scene layer ID for filter lookup
const getSceneLayerId = (uiLayerId: string): string => {
  if (uiLayerId === 'base') return 'base-layer'
  if (uiLayerId.startsWith('mask')) return 'mask-layer'
  return uiLayerId
}

// Get filter display value based on current filter state
const getFilterValue = (layerId: string): string => {
  if (!props.layerFilterConfigs) return 'None'
  const sceneLayerId = getSceneLayerId(layerId)
  const config = props.layerFilterConfigs.get(sceneLayerId)
  if (!config) return 'None'

  const filters: string[] = []
  if (config.vignette.enabled) filters.push('Vignette')
  if (config.chromaticAberration.enabled) filters.push('CA')
  if (config.dotHalftone.enabled) filters.push('Dot HT')
  if (config.lineHalftone.enabled) filters.push('Line HT')

  return filters.length > 0 ? filters.join(' / ') : 'None'
}

const getSubItemsForLayer = (layer: LayerItem): SubItemConfig[] => {
  switch (layer.type) {
    case 'base':
      return [
        { type: 'surface', label: 'Surface', value: props.backgroundSurfaceLabel ?? 'Solid', enabled: true },
        { type: 'filter', label: 'Filter', value: getFilterValue(layer.id), enabled: true },
      ]
    case 'mask':
      return [
        { type: 'surface', label: 'Surface', value: props.maskSurfaceLabel ?? 'Solid', enabled: true },
        { type: 'shape', label: 'Shape', value: props.maskShapeLabel ?? 'None', enabled: true },
        { type: 'filter', label: 'Filter', value: getFilterValue(layer.id), enabled: true },
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

// Computed map for reactive sub-items (tracks layerFilterConfigs changes)
const subItemsMap = computed(() => {
  // Access layerFilterConfigs to establish reactive dependency
  const _filterConfigs = props.layerFilterConfigs
  const map = new Map<string, SubItemConfig[]>()
  for (const layer of props.layers) {
    map.set(layer.id, getSubItemsForLayer(layer))
  }
  return map
})

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

const allLayerTypes: { type: LayerType; label: string; icon: string }[] = [
  { type: 'mask', label: 'Mask', icon: 'crop_free' },
  { type: 'object', label: 'Object', icon: 'image' },
  { type: 'text', label: 'Text', icon: 'text_fields' },
]

// Filter out layer types that have reached their limit (mask: 1)
const addableLayerTypes = computed(() => {
  const hasMask = props.layers.some(l => l.type === 'mask')
  return allLayerTypes.filter(item => {
    if (item.type === 'mask' && hasMask) return false
    return true
  })
})

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
          class="layer-item expanded"
        >
          <!-- Layer Header: [icon][text(flex-1)][eye][x] -->
          <div class="layer-header">
            <span class="material-icons layer-icon">{{ getLayerIcon(layer.type) }}</span>

            <div class="layer-info">
              <span class="layer-type">{{ getLayerTypeLabel(layer.type) }}</span>
              <span class="layer-name">{{ layer.name }}</span>
            </div>

            <button
              v-if="layer.type !== 'base'"
              class="visibility-toggle"
              :class="{ hidden: !layer.visible }"
              @click.stop="emit('toggle-visibility', layer.id)"
            >
              <span class="material-icons">{{ layer.visible ? 'visibility' : 'visibility_off' }}</span>
            </button>
            <span v-else class="visibility-placeholder" />

            <button
              v-if="layer.type !== 'base'"
              class="remove-layer-toggle"
              @click.stop="emit('remove-layer', layer.id)"
            >
              <span class="material-icons">close</span>
            </button>
            <span v-else class="visibility-placeholder" />
          </div>

          <!-- Sub Items (always visible) -->
          <div class="sub-items">
            <button
              v-for="subItem in subItemsMap.get(layer.id)"
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

      <div class="foreground-buttons">
        <button class="foreground-button" @click="emit('open-foreground-title')">
          <span class="material-icons">title</span>
          <div class="foreground-info">
            <span class="foreground-label">Title</span>
            <span class="foreground-desc">Position</span>
          </div>
          <span class="material-icons foreground-arrow">chevron_right</span>
        </button>

        <button class="foreground-button" @click="emit('open-foreground-description')">
          <span class="material-icons">notes</span>
          <div class="foreground-info">
            <span class="foreground-label">Description</span>
            <span class="foreground-desc">Position</span>
          </div>
          <span class="material-icons foreground-arrow">chevron_right</span>
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
  background: oklch(0.92 0.01 260);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

:global(.dark) .panel-section {
  background: oklch(0.18 0.02 260);
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

.layer-item {
  background: oklch(0.88 0.01 260);
  border-radius: 0.375rem;
  overflow: hidden;
}

:global(.dark) .layer-item {
  background: oklch(0.22 0.02 260);
}

.layer-item.expanded {
  background: oklch(0.86 0.01 260);
}

:global(.dark) .layer-item.expanded {
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
  background: oklch(0.82 0.01 260);
}

:global(.dark) .layer-header:hover {
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
  color: oklch(0.40 0.02 260);
  cursor: pointer;
  padding: 0;
  border-radius: 0.25rem;
  transition: color 0.15s, background 0.15s;
}

:global(.dark) .visibility-toggle {
  color: oklch(0.70 0.02 260);
}

.visibility-toggle:hover {
  background: oklch(0.78 0.01 260);
  color: oklch(0.25 0.02 260);
}

:global(.dark) .visibility-toggle:hover {
  background: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.visibility-toggle.hidden {
  color: oklch(0.65 0.01 260);
}

:global(.dark) .visibility-toggle.hidden {
  color: oklch(0.40 0.02 260);
}

.visibility-toggle .material-icons {
  font-size: 1rem;
}

.visibility-placeholder {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.layer-icon {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .layer-icon {
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
  color: oklch(0.55 0.02 260);
}

:global(.dark) .layer-type {
  color: oklch(0.50 0.02 260);
}

.layer-name {
  font-size: 0.75rem;
  color: oklch(0.25 0.02 260);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.dark) .layer-name {
  color: oklch(0.85 0.02 260);
}

.remove-layer-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: none;
  border: none;
  color: oklch(0.55 0.02 260);
  cursor: pointer;
  padding: 0;
  border-radius: 0.25rem;
  transition: color 0.15s, background 0.15s;
}

:global(.dark) .remove-layer-toggle {
  color: oklch(0.50 0.02 260);
}

.remove-layer-toggle:hover {
  background: oklch(0.50 0.10 25 / 0.3);
  color: oklch(0.70 0.10 25);
}

.remove-layer-toggle .material-icons {
  font-size: 1rem;
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
  background: oklch(0.94 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.25rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

:global(.dark) .sub-item {
  background: oklch(0.20 0.02 260);
  border-color: oklch(0.28 0.02 260);
}

.sub-item:hover:not(.disabled) {
  background: oklch(0.88 0.01 260);
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .sub-item:hover:not(.disabled) {
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
  color: oklch(0.50 0.02 260);
  min-width: 3.5rem;
}

:global(.dark) .sub-item-label {
  color: oklch(0.60 0.02 260);
}

.sub-item-value {
  flex: 1;
  font-size: 0.75rem;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .sub-item-value {
  color: oklch(0.85 0.02 260);
}

.sub-item-arrow {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
}

:global(.dark) .sub-item-arrow {
  color: oklch(0.45 0.02 260);
}

.sub-item:hover:not(.disabled) .sub-item-arrow {
  color: oklch(0.40 0.02 260);
}

:global(.dark) .sub-item:hover:not(.disabled) .sub-item-arrow {
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
  border: 1px dashed oklch(0.75 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.50 0.02 260);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

:global(.dark) .add-layer-button {
  border-color: oklch(0.35 0.02 260);
  color: oklch(0.60 0.02 260);
}

.add-layer-button:hover {
  border-color: oklch(0.50 0.15 250);
  color: oklch(0.35 0.02 260);
  background: oklch(0.90 0.01 260);
}

:global(.dark) .add-layer-button:hover {
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

/* Foreground Buttons */
.foreground-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.foreground-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: oklch(0.88 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

:global(.dark) .foreground-button {
  background: oklch(0.22 0.02 260);
  border-color: oklch(0.28 0.02 260);
}

.foreground-button:hover {
  background: oklch(0.84 0.01 260);
  border-color: oklch(0.75 0.01 260);
}

:global(.dark) .foreground-button:hover {
  background: oklch(0.26 0.02 260);
  border-color: oklch(0.35 0.02 260);
}

.foreground-button > .material-icons {
  font-size: 1rem;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .foreground-button > .material-icons {
  color: oklch(0.60 0.02 260);
}

.foreground-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.foreground-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
}

:global(.dark) .foreground-label {
  color: oklch(0.85 0.02 260);
}

.foreground-desc {
  font-size: 0.625rem;
  color: oklch(0.55 0.02 260);
}

.foreground-arrow {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
}

:global(.dark) .foreground-arrow {
  color: oklch(0.45 0.02 260);
}

.foreground-button:hover .foreground-arrow {
  color: oklch(0.40 0.02 260);
}

:global(.dark) .foreground-button:hover .foreground-arrow {
  color: oklch(0.70 0.02 260);
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

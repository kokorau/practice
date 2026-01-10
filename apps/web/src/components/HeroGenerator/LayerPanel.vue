<script setup lang="ts">
import { ref, computed } from 'vue'

// ============================================================
// Types
// ============================================================

/**
 * Layer types in the UI
 *
 * Categories:
 * - object: Drawable targets (base, surface, text, model3d, image)
 * - group: Organizational grouping only
 *
 * Note: Processors (effect, mask) are sub-items of layers, not layer types
 */
export type LayerType = 'base' | 'surface' | 'text' | 'model3d' | 'image' | 'group'

/** @deprecated Use LayerType instead */
export type LegacyLayerType = 'base' | 'group' | 'object' | 'text' | 'clipGroup'

/** Layer item for UI display */
export interface LayerItem {
  id: string
  type: LayerType
  name: string
  visible: boolean
  expanded: boolean
}

/** Sub-item types within a layer */
export type SubItemType = 'surface' | 'shape' | 'effect' | 'source' | 'filter'

/** Sub-item configuration for display */
export interface SubItemConfig {
  type: SubItemType
  label: string
  value: string
  enabled: boolean
  /** Nesting level for processor items */
  indent?: number
}

// ============================================================
// Types: Effect config (from HeroScene module)
// ============================================================

/** Layer effect configuration */
export interface LayerEffectConfig {
  vignette: { enabled: boolean }
  chromaticAberration: { enabled: boolean }
  dotHalftone: { enabled: boolean }
  lineHalftone: { enabled: boolean }
}

// Legacy alias
export type LayerFilterConfig = LayerEffectConfig

// ============================================================
// Props & Emits
// ============================================================

const props = defineProps<{
  layers: LayerItem[]
  layerEffectConfigs?: Map<string, LayerEffectConfig>
  /** @deprecated Use layerEffectConfigs instead */
  layerFilterConfigs?: Map<string, LayerEffectConfig>
  backgroundSurfaceLabel?: string
  /** @deprecated Use groupSurfaceLabel instead */
  clipGroupSurfaceLabel?: string
  groupSurfaceLabel?: string
  /** @deprecated Use groupShapeLabel instead */
  clipGroupShapeLabel?: string
  groupShapeLabel?: string
  titleContrastScore?: number | null
  descriptionContrastScore?: number | null
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
// Computed: Merged props with backward compatibility
// ============================================================

const effectConfigs = computed(() =>
  props.layerEffectConfigs ?? props.layerFilterConfigs
)

const groupSurface = computed(() =>
  props.groupSurfaceLabel ?? props.clipGroupSurfaceLabel
)

const groupShape = computed(() =>
  props.groupShapeLabel ?? props.clipGroupShapeLabel
)

// ============================================================
// Layer Configuration
// ============================================================

// Map UI layer ID to scene layer ID for effect lookup
const getSceneLayerId = (uiLayerId: string): string => {
  if (uiLayerId === 'base') return 'base-layer'
  if (uiLayerId.startsWith('clip-group') || uiLayerId.startsWith('group')) return 'clip-group-layer'
  // Legacy support
  if (uiLayerId.startsWith('mask')) return 'clip-group-layer'
  return uiLayerId
}

// Get effect display value based on current effect state
const getEffectValue = (layerId: string): string => {
  if (!effectConfigs.value) return 'None'
  const sceneLayerId = getSceneLayerId(layerId)
  const config = effectConfigs.value.get(sceneLayerId)
  if (!config) return 'None'

  const effects: string[] = []
  if (config.vignette.enabled) effects.push('Vignette')
  if (config.chromaticAberration.enabled) effects.push('CA')
  if (config.dotHalftone.enabled) effects.push('Dot HT')
  if (config.lineHalftone.enabled) effects.push('Line HT')

  return effects.length > 0 ? effects.join(' / ') : 'None'
}

const getSubItemsForLayer = (layer: LayerItem): SubItemConfig[] => {
  // Normalize type: treat legacy 'clipGroup' and 'object' types
  const layerType = layer.type as string
  const normalizedType: LayerType =
    layerType === 'clipGroup' ? 'surface' :
    layerType === 'object' ? 'model3d' :
    layer.type

  switch (normalizedType) {
    case 'base':
      return [
        { type: 'surface', label: 'Surface', value: props.backgroundSurfaceLabel ?? 'Solid', enabled: true },
        // Processor section (effect only for base - no mask)
        { type: 'effect', label: 'Effect', value: getEffectValue(layer.id), enabled: true, indent: 1 },
      ]
    case 'surface':
      return [
        { type: 'surface', label: 'Surface', value: groupSurface.value ?? 'Solid', enabled: true },
        // Processor section (effect + mask for surface layers)
        { type: 'effect', label: 'Effect', value: getEffectValue(layer.id), enabled: true, indent: 1 },
        { type: 'shape', label: 'Mask', value: groupShape.value ?? 'None', enabled: true, indent: 1 },
      ]
    case 'group':
      return [
        // Group is purely organizational - no surface, but can have processors
        { type: 'effect', label: 'Effect', value: getEffectValue(layer.id), enabled: true, indent: 1 },
        { type: 'shape', label: 'Mask', value: groupShape.value ?? 'None', enabled: true, indent: 1 },
      ]
    case 'model3d':
      return [
        { type: 'source', label: 'Source', value: '3D Model', enabled: true },
        { type: 'effect', label: 'Effect', value: 'WIP', enabled: false, indent: 1 },
      ]
    case 'image':
      return [
        { type: 'source', label: 'Source', value: 'Image', enabled: true },
        { type: 'effect', label: 'Effect', value: getEffectValue(layer.id), enabled: true, indent: 1 },
        { type: 'shape', label: 'Mask', value: 'None', enabled: true, indent: 1 },
      ]
    case 'text':
      return [
        { type: 'source', label: 'Source', value: 'Text Content', enabled: true },
        { type: 'effect', label: 'Effect', value: 'WIP', enabled: false, indent: 1 },
      ]
    default:
      return []
  }
}

// Computed map for reactive sub-items (tracks layerEffectConfigs changes)
const subItemsMap = computed(() => {
  // Access effectConfigs to establish reactive dependency
  void effectConfigs.value
  const map = new Map<string, SubItemConfig[]>()
  for (const layer of props.layers) {
    map.set(layer.id, getSubItemsForLayer(layer))
  }
  return map
})

const getLayerIcon = (type: LayerType | LegacyLayerType): string => {
  switch (type) {
    case 'base': return 'gradient'
    case 'surface': return 'texture'
    case 'group':
    case 'clipGroup': return 'folder_open'
    case 'model3d':
    case 'object': return 'view_in_ar'
    case 'image': return 'image'
    case 'text': return 'text_fields'
    default: return 'layers'
  }
}

const getLayerTypeLabel = (type: LayerType | LegacyLayerType): string => {
  switch (type) {
    case 'base': return 'Base'
    case 'surface':
    case 'clipGroup': return 'Surface'
    case 'group': return 'Group'
    case 'model3d':
    case 'object': return '3D Model'
    case 'image': return 'Image'
    case 'text': return 'Text'
    default: return 'Layer'
  }
}

// ============================================================
// Add Layer Menu
// ============================================================

const showAddMenu = ref(false)

const allLayerTypes: { type: LayerType; label: string; icon: string }[] = [
  { type: 'surface', label: 'Surface', icon: 'texture' },
  { type: 'group', label: 'Group', icon: 'folder_open' },
  { type: 'model3d', label: '3D Model', icon: 'view_in_ar' },
  { type: 'image', label: 'Image', icon: 'image' },
  { type: 'text', label: 'Text', icon: 'text_fields' },
]

// Filter out layer types that have reached their limit
const addableLayerTypes = computed(() => {
  // Check for surface layers (including legacy 'clipGroup')
  const hasSurface = props.layers.some(l =>
    l.type === 'surface' || (l.type as string) === 'clipGroup'
  )
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

// Get score level class for contrast badge
const getScoreLevel = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (score >= 75) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 45) return 'fair'
  return 'poor'
}

// Handle subitem selection with type mapping for backward compatibility
const handleSelectSubitem = (layerId: string, subItemType: SubItemType) => {
  // Map effect -> filter for backward compatibility with parent components
  const mappedType = subItemType === 'effect' ? 'filter' as SubItemType : subItemType
  emit('select-subitem', layerId, mappedType)
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

          <!-- Sub Items (with processor nesting) -->
          <div class="sub-items">
            <button
              v-for="subItem in subItemsMap.get(layer.id)"
              :key="subItem.type"
              class="sub-item"
              :class="{
                disabled: !subItem.enabled,
                'processor-item': subItem.indent === 1,
              }"
              :disabled="!subItem.enabled"
              @click="handleSelectSubitem(layer.id, subItem.type)"
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
          <span
            v-if="titleContrastScore != null"
            class="contrast-badge"
            :class="getScoreLevel(titleContrastScore)"
          >Lc {{ titleContrastScore }}</span>
          <span class="material-icons foreground-arrow">chevron_right</span>
        </button>

        <button class="foreground-button" @click="emit('open-foreground-description')">
          <span class="material-icons">notes</span>
          <div class="foreground-info">
            <span class="foreground-label">Description</span>
            <span class="foreground-desc">Position</span>
          </div>
          <span
            v-if="descriptionContrastScore != null"
            class="contrast-badge"
            :class="getScoreLevel(descriptionContrastScore)"
          >Lc {{ descriptionContrastScore }}</span>
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

/* Processor items (indented) */
.sub-item.processor-item {
  margin-left: 0.75rem;
  padding: 0.375rem 0.625rem;
  background: oklch(0.96 0.01 260);
  border-color: oklch(0.88 0.01 260);
}

:global(.dark) .sub-item.processor-item {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.25 0.02 260);
}

.sub-item.processor-item:hover:not(.disabled) {
  background: oklch(0.92 0.01 260);
}

:global(.dark) .sub-item.processor-item:hover:not(.disabled) {
  background: oklch(0.22 0.02 260);
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

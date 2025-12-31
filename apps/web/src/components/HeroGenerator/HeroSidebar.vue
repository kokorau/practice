<script setup lang="ts">
import { ref } from 'vue'
import type { Oklch } from '@practice/color'
import type { TexturePattern, MaskPattern } from '@practice/texture'
import BrandColorPicker from '../SiteBuilder/BrandColorPicker.vue'
import FoundationPresets from '../SiteBuilder/FoundationPresets.vue'
import LayerPanel, { type LayerItem, type LayerType, type SubItemType, type LayerFilterConfig } from './LayerPanel.vue'
import type { SectionType, MidgroundSurfacePreset } from '../../composables/SiteBuilder'

type NeutralRampItem = {
  key: string
  css: string
}

defineProps<{
  activeTab: 'generator' | 'palette'
  // Color state
  hue: number
  saturation: number
  value: number
  selectedHex: string
  brandOklch: Oklch
  selectedFoundationId: string
  foundationHex: string
  foundationLabel: string
  // Layer state
  activeSection: SectionType | null
  texturePatterns: TexturePattern[]
  maskPatterns: MaskPattern[]
  midgroundTexturePatterns: MidgroundSurfacePreset[]
  selectedBackgroundIndex: number
  selectedMaskIndex: number | null
  selectedMidgroundTextureIndex: number | null
  // Filter state
  layerFilterConfigs?: Map<string, LayerFilterConfig>
  // Palette tab
  neutralRampDisplay: NeutralRampItem[]
}>()

const emit = defineEmits<{
  (e: 'update:hue', value: number): void
  (e: 'update:saturation', value: number): void
  (e: 'update:value', value: number): void
  (e: 'update:selectedFoundationId', value: string): void
  (e: 'openSection', section: SectionType): void
  (e: 'selectFilterLayer', layerId: string): void
  // Layer operations - propagate to parent for useHeroScene
  (e: 'toggleLayerVisibility', layerId: string): void
  (e: 'addLayer', type: LayerType): void
  (e: 'removeLayer', layerId: string): void
}>()

// Map UI layer IDs to useHeroScene layer IDs
const mapLayerIdToSceneLayerId = (uiLayerId: string): string => {
  if (uiLayerId === 'base') return 'base-layer'
  if (uiLayerId.startsWith('mask')) return 'mask-layer'
  return uiLayerId
}

// ============================================================
// Color Popup
// ============================================================
type ColorPopup = 'brand' | 'foundation' | null
const activeColorPopup = ref<ColorPopup>(null)

const toggleColorPopup = (popup: ColorPopup) => {
  activeColorPopup.value = activeColorPopup.value === popup ? null : popup
}

// ============================================================
// Layer Management
// ============================================================
const layers = ref<LayerItem[]>([
  { id: 'base', type: 'base', name: 'Background', visible: true, expanded: true },
  { id: 'mask-1', type: 'mask', name: 'Mask Layer', visible: true, expanded: false },
])

const handleToggleVisibility = (layerId: string) => {
  const layer = layers.value.find(l => l.id === layerId)
  if (layer) {
    layer.visible = !layer.visible
    // Propagate to parent for useHeroScene
    emit('toggleLayerVisibility', mapLayerIdToSceneLayerId(layerId))
  }
}

const handleSelectSubItem = (layerId: string, subItemType: SubItemType) => {
  // Map to existing section system for now
  const layer = layers.value.find(l => l.id === layerId)
  if (!layer) return

  if (layer.type === 'base') {
    if (subItemType === 'surface') {
      emit('openSection', 'background')
    } else if (subItemType === 'filter') {
      emit('selectFilterLayer', mapLayerIdToSceneLayerId(layerId))
      emit('openSection', 'filter')
    }
  } else if (layer.type === 'mask') {
    if (subItemType === 'surface') {
      emit('openSection', 'mask-surface')
    } else if (subItemType === 'shape') {
      emit('openSection', 'mask-shape')
    } else if (subItemType === 'filter') {
      emit('selectFilterLayer', mapLayerIdToSceneLayerId(layerId))
      emit('openSection', 'filter')
    }
  }
}

const handleAddLayer = (type: LayerType) => {
  const id = `${type}-${Date.now()}`
  const names: Record<LayerType, string> = {
    base: 'Background',
    mask: 'Mask Layer',
    object: 'Object',
    text: 'Text Layer',
  }
  layers.value.push({
    id,
    type,
    name: names[type],
    visible: true,
    expanded: true,
  })
  // Propagate to parent for useHeroScene
  emit('addLayer', type)
}

const handleRemoveLayer = (layerId: string) => {
  const index = layers.value.findIndex(l => l.id === layerId)
  const layer = index > -1 ? layers.value[index] : undefined
  if (layer && layer.type !== 'base') {
    layers.value.splice(index, 1)
    // Propagate to parent for useHeroScene
    emit('removeLayer', mapLayerIdToSceneLayerId(layerId))
  }
}
</script>

<template>
  <aside class="hero-sidebar">
    <!-- カラー設定セクション -->
    <div class="sidebar-section">
      <p class="sidebar-label">Color Settings</p>

      <!-- Brand Color -->
      <button
        class="color-button"
        :class="{ active: activeColorPopup === 'brand' }"
        @click="toggleColorPopup('brand')"
      >
        <span class="color-swatch" :style="{ backgroundColor: selectedHex }" />
        <span class="color-info">
          <span class="color-name">Brand</span>
          <span class="color-value">{{ selectedHex }}</span>
        </span>
      </button>

      <!-- Foundation -->
      <button
        class="color-button"
        :class="{ active: activeColorPopup === 'foundation' }"
        @click="toggleColorPopup('foundation')"
      >
        <span class="color-swatch" :style="{ backgroundColor: foundationHex }" />
        <span class="color-info">
          <span class="color-name">Foundation</span>
          <span class="color-value">{{ foundationLabel }}</span>
        </span>
      </button>
    </div>

    <!-- レイヤーパネル (Generator タブのみ) -->
    <template v-if="activeTab === 'generator'">
      <LayerPanel
        :layers="layers"
        :layer-filter-configs="layerFilterConfigs"
        @toggle-visibility="handleToggleVisibility"
        @select-subitem="handleSelectSubItem"
        @add-layer="handleAddLayer"
        @remove-layer="handleRemoveLayer"
        @open-foreground-title="emit('openSection', 'foreground-title')"
        @open-foreground-description="emit('openSection', 'foreground-description')"
      />
    </template>

    <!-- Palette タブ: Neutral Ramp -->
    <template v-if="activeTab === 'palette'">
      <div class="sidebar-section">
        <p class="sidebar-label">Neutral Ramp</p>
        <div class="neutral-ramp">
          <span
            v-for="item in neutralRampDisplay"
            :key="item.key"
            class="ramp-step"
            :style="{ backgroundColor: item.css }"
            :title="`${item.key}: ${item.css}`"
          />
        </div>
      </div>
    </template>

    <!-- カラーポップアップ -->
    <Transition name="popup">
      <div v-if="activeColorPopup" class="color-popup">
        <div class="popup-header">
          <h2>{{ activeColorPopup === 'brand' ? 'Brand Color' : 'Foundation' }}</h2>
          <button class="popup-close" @click="activeColorPopup = null">×</button>
        </div>
        <div class="popup-content">
          <BrandColorPicker
            v-if="activeColorPopup === 'brand'"
            :hue="hue"
            :saturation="saturation"
            :value="value"
            @update:hue="emit('update:hue', $event)"
            @update:saturation="emit('update:saturation', $event)"
            @update:value="emit('update:value', $event)"
          />
          <FoundationPresets
            v-if="activeColorPopup === 'foundation'"
            :selected-id="selectedFoundationId"
            :brand-oklch="brandOklch"
            :brand-hue="hue"
            @update:selected-id="emit('update:selectedFoundationId', $event)"
          />
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
/* Sidebar Sections */
.sidebar-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid oklch(0.25 0.02 260);
}

.sidebar-label {
  margin: 0 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

/* Color Buttons */
.color-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: oklch(0.22 0.02 260);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.color-button:hover {
  background: oklch(0.26 0.02 260);
}

.color-button.active {
  background: oklch(0.50 0.20 250);
}

.color-swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid oklch(0.40 0.02 260);
  flex-shrink: 0;
}

.color-info {
  display: flex;
  flex-direction: column;
}

.color-name {
  font-size: 0.75rem;
  font-weight: 600;
}

.color-value {
  font-size: 0.625rem;
  color: oklch(0.60 0.02 260);
  font-family: ui-monospace, monospace;
}

/* Neutral Ramp */
.neutral-ramp {
  display: flex;
  gap: 2px;
}

.ramp-step {
  flex: 1;
  height: 2rem;
}

.ramp-step:first-child {
  border-radius: 0.25rem 0 0 0.25rem;
}

.ramp-step:last-child {
  border-radius: 0 0.25rem 0.25rem 0;
}

/* Color Popup */
.color-popup {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 0.25rem;
  width: 18rem;
  background: oklch(0.18 0.02 260);
  border: 1px solid oklch(0.25 0.02 260);
  border-radius: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 50;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid oklch(0.25 0.02 260);
}

.popup-header h2 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.popup-close {
  background: none;
  border: none;
  color: oklch(0.60 0.02 260);
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.popup-close:hover {
  color: oklch(0.90 0.02 260);
}

.popup-content {
  padding: 1rem;
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BrandColorPicker from '../SiteBuilder/BrandColorPicker.vue'
import ColorPresets from '../SiteBuilder/ColorPresets.vue'
import LayoutPresetSelector from './LayoutPresetSelector.vue'
import FloatingPanel from './FloatingPanel.vue'
import LayerPanel, { type LayerType } from './LayerPanel.vue'
import type { ColorPreset } from '../../modules/SemanticColorPalette/Domain'
import type { HeroViewPreset, LayerNode, DropPosition, ForegroundElementConfig, ForegroundElementType } from '../../modules/HeroScene'
type NeutralRampItem = {
  key: string
  css: string
}

// Sidebar tab
type SidebarTab = 'theme' | 'layers'

const props = defineProps<{
  activeTab: 'generator' | 'palette'
  // Color state (Brand)
  hue: number
  saturation: number
  value: number
  selectedHex: string
  // Color state (Accent)
  accentHue: number
  accentSaturation: number
  accentValue: number
  accentHex: string
  // Foundation (HSV values)
  foundationHue: number
  foundationSaturation: number
  foundationValue: number
  foundationHex: string
  // Palette tab
  neutralRampDisplay: NeutralRampItem[]
  // Layout presets
  presets: HeroViewPreset[]
  selectedPresetId: string | null
  // Layers
  layers: LayerNode[]
  // Foreground elements
  foregroundElements: ForegroundElementConfig[]
  // Selected foreground element ID for highlighting
  selectedForegroundElementId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:hue', value: number): void
  (e: 'update:saturation', value: number): void
  (e: 'update:value', value: number): void
  (e: 'update:accentHue', value: number): void
  (e: 'update:accentSaturation', value: number): void
  (e: 'update:accentValue', value: number): void
  (e: 'update:foundationHue', value: number): void
  (e: 'update:foundationSaturation', value: number): void
  (e: 'update:foundationValue', value: number): void
  (e: 'applyColorPreset', preset: ColorPreset): void
  (e: 'applyLayoutPreset', presetId: string): void
  // Layer events
  (e: 'select-layer', layerId: string): void
  (e: 'toggle-expand', layerId: string): void
  (e: 'toggle-visibility', layerId: string): void
  (e: 'select-processor', layerId: string, processorType: 'effect' | 'mask' | 'processor'): void
  (e: 'add-layer', type: LayerType): void
  (e: 'remove-layer', layerId: string): void
  (e: 'move-layer', sourceId: string, targetId: string, position: DropPosition): void
  (e: 'layer-contextmenu', layerId: string, event: MouseEvent): void
  // Foreground events
  (e: 'select-foreground-element', elementId: string): void
  (e: 'foreground-contextmenu', elementId: string, event: MouseEvent): void
  (e: 'add-foreground-element', type: ForegroundElementType): void
  (e: 'remove-foreground-element', elementId: string): void
}>()

// ============================================================
// Sidebar Tab State
// ============================================================
const sidebarTab = ref<SidebarTab>('theme')

// ============================================================
// Color Popup
// ============================================================
type ColorPopup = 'layout' | 'presets' | 'brand' | 'accent' | 'foundation' | null
const activeColorPopup = ref<ColorPopup>(null)

// Button refs for click-outside ignore
const layoutButtonRef = ref<HTMLElement | null>(null)
const presetsButtonRef = ref<HTMLElement | null>(null)
const brandButtonRef = ref<HTMLElement | null>(null)
const accentButtonRef = ref<HTMLElement | null>(null)
const foundationButtonRef = ref<HTMLElement | null>(null)

const toggleColorPopup = (popup: ColorPopup) => {
  activeColorPopup.value = activeColorPopup.value === popup ? null : popup
}

const closePopup = () => {
  activeColorPopup.value = null
}

const currentIgnoreRefs = computed(() => {
  switch (activeColorPopup.value) {
    case 'layout':
      return [layoutButtonRef.value]
    case 'presets':
      return [presetsButtonRef.value]
    case 'brand':
      return [brandButtonRef.value]
    case 'accent':
      return [accentButtonRef.value]
    case 'foundation':
      return [foundationButtonRef.value]
    default:
      return []
  }
})

const popupTitle = computed(() => {
  switch (activeColorPopup.value) {
    case 'layout':
      return 'Layout Presets'
    case 'presets':
      return 'Color Presets'
    case 'brand':
      return 'Brand Color'
    case 'accent':
      return 'Accent Color'
    case 'foundation':
      return 'Foundation'
    default:
      return ''
  }
})

// Get currently selected preset name
const selectedPresetName = computed(() => {
  const preset = props.presets.find(p => p.id === props.selectedPresetId)
  return preset?.name ?? 'Select preset'
})
</script>

<template>
  <aside class="hero-sidebar">
    <!-- サイドバータブ -->
    <div class="sidebar-tabs">
      <button
        class="sidebar-tab"
        :class="{ active: sidebarTab === 'theme' }"
        @click="sidebarTab = 'theme'"
      >
        <span class="material-icons">palette</span>
        Theme
      </button>
      <button
        class="sidebar-tab"
        :class="{ active: sidebarTab === 'layers' }"
        @click="sidebarTab = 'layers'"
      >
        <span class="material-icons">layers</span>
        Layers
      </button>
    </div>

    <!-- Theme タブ -->
    <template v-if="sidebarTab === 'theme'">
      <!-- レイアウトプリセットセクション -->
      <div class="sidebar-section">
      <p class="sidebar-label">Layout</p>
      <button
        ref="layoutButtonRef"
        class="color-button"
        :class="{ active: activeColorPopup === 'layout' }"
        @click="toggleColorPopup('layout')"
      >
        <span class="material-icons layout-icon">dashboard</span>
        <span class="color-info">
          <span class="color-name">Layout Preset</span>
          <span class="color-value">{{ selectedPresetName }}</span>
        </span>
      </button>
    </div>

    <!-- カラー設定セクション -->
    <div class="sidebar-section">
      <p class="sidebar-label">Color Settings</p>

      <!-- Presets -->
      <button
        ref="presetsButtonRef"
        class="color-button"
        :class="{ active: activeColorPopup === 'presets' }"
        @click="toggleColorPopup('presets')"
      >
        <span class="color-swatches">
          <span class="color-swatch-mini" :style="{ backgroundColor: selectedHex }" />
          <span class="color-swatch-mini" :style="{ backgroundColor: accentHex }" />
          <span class="color-swatch-mini" :style="{ backgroundColor: foundationHex }" />
        </span>
        <span class="color-info">
          <span class="color-name">Presets</span>
          <span class="color-value">Quick start</span>
        </span>
      </button>

      <!-- Brand Color -->
      <button
        ref="brandButtonRef"
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

      <!-- Accent Color -->
      <button
        ref="accentButtonRef"
        class="color-button"
        :class="{ active: activeColorPopup === 'accent' }"
        @click="toggleColorPopup('accent')"
      >
        <span class="color-swatch" :style="{ backgroundColor: accentHex }" />
        <span class="color-info">
          <span class="color-name">Accent</span>
          <span class="color-value">{{ accentHex }}</span>
        </span>
      </button>

      <!-- Foundation -->
      <button
        ref="foundationButtonRef"
        class="color-button"
        :class="{ active: activeColorPopup === 'foundation' }"
        @click="toggleColorPopup('foundation')"
      >
        <span class="color-swatch" :style="{ backgroundColor: foundationHex }" />
        <span class="color-info">
          <span class="color-name">Foundation</span>
          <span class="color-value">{{ foundationHex }}</span>
        </span>
      </button>
    </div>

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
    </template>

    <!-- Layers タブ -->
    <template v-if="sidebarTab === 'layers'">
      <div class="sidebar-section layers-section">
        <LayerPanel
          :layers="layers"
          :foreground-elements="foregroundElements"
          :selected-foreground-element-id="selectedForegroundElementId"
          @select-layer="(id: string) => emit('select-layer', id)"
          @toggle-expand="(id: string) => emit('toggle-expand', id)"
          @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
          @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
          @add-layer="(type: LayerType) => emit('add-layer', type)"
          @remove-layer="(id: string) => emit('remove-layer', id)"
          @move-layer="(src: string, tgt: string, pos: DropPosition) => emit('move-layer', src, tgt, pos)"
          @layer-contextmenu="(id: string, e: MouseEvent) => emit('layer-contextmenu', id, e)"
          @select-foreground-element="(id: string) => emit('select-foreground-element', id)"
          @foreground-contextmenu="(id: string, e: MouseEvent) => emit('foreground-contextmenu', id, e)"
          @add-foreground-element="(type: ForegroundElementType) => emit('add-foreground-element', type)"
          @remove-foreground-element="(id: string) => emit('remove-foreground-element', id)"
        />
      </div>
    </template>

    <!-- カラーポップアップ -->
    <FloatingPanel
      :title="popupTitle"
      :is-open="!!activeColorPopup"
      position="left"
      :ignore-refs="currentIgnoreRefs"
      @close="closePopup"
    >
      <LayoutPresetSelector
        v-if="activeColorPopup === 'layout'"
        :presets="presets"
        :selected-preset-id="selectedPresetId"
        @select-preset="emit('applyLayoutPreset', $event); closePopup()"
      />
      <ColorPresets
        v-if="activeColorPopup === 'presets'"
        :brand-hue="hue"
        :brand-saturation="saturation"
        :brand-value="value"
        :accent-hue="accentHue"
        :accent-saturation="accentSaturation"
        :accent-value="accentValue"
        :foundation-hue="foundationHue"
        :foundation-saturation="foundationSaturation"
        :foundation-value="foundationValue"
        @apply-preset="emit('applyColorPreset', $event)"
      />
      <BrandColorPicker
        v-else-if="activeColorPopup === 'brand'"
        :hue="hue"
        :saturation="saturation"
        :value="value"
        @update:hue="emit('update:hue', $event)"
        @update:saturation="emit('update:saturation', $event)"
        @update:value="emit('update:value', $event)"
      />
      <BrandColorPicker
        v-if="activeColorPopup === 'accent'"
        :hue="accentHue"
        :saturation="accentSaturation"
        :value="accentValue"
        @update:hue="emit('update:accentHue', $event)"
        @update:saturation="emit('update:accentSaturation', $event)"
        @update:value="emit('update:accentValue', $event)"
      />
      <BrandColorPicker
        v-if="activeColorPopup === 'foundation'"
        :hue="foundationHue"
        :saturation="foundationSaturation"
        :value="foundationValue"
        @update:hue="emit('update:foundationHue', $event)"
        @update:saturation="emit('update:foundationSaturation', $event)"
        @update:value="emit('update:foundationValue', $event)"
      />
    </FloatingPanel>
  </aside>
</template>

<style scoped>
/* Sidebar Tabs */
.sidebar-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

:global(.dark) .sidebar-tabs {
  border-bottom-color: oklch(0.25 0.02 260);
}

.sidebar-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.45 0.02 260);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

:global(.dark) .sidebar-tab {
  color: oklch(0.60 0.02 260);
}

.sidebar-tab:hover {
  background: oklch(0.90 0.01 260);
  color: oklch(0.30 0.02 260);
}

:global(.dark) .sidebar-tab:hover {
  background: oklch(0.24 0.02 260);
  color: oklch(0.80 0.02 260);
}

.sidebar-tab.active {
  background: oklch(0.55 0.18 250);
  color: white;
}

.sidebar-tab .material-icons {
  font-size: 1rem;
}

/* Sidebar Sections */
.sidebar-section {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

.sidebar-section.layers-section {
  border-bottom: none;
  padding-bottom: 0;
}

.layers-section .layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

:global(.dark) .sidebar-section {
  border-bottom-color: oklch(0.25 0.02 260);
}

.sidebar-label {
  margin: 0 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

:global(.dark) .sidebar-label {
  color: oklch(0.60 0.02 260);
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
  background: oklch(0.88 0.01 260);
  color: oklch(0.25 0.02 260);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

:global(.dark) .color-button {
  background: oklch(0.22 0.02 260);
  color: oklch(0.90 0.01 260);
}

.color-button:hover {
  background: oklch(0.84 0.01 260);
}

:global(.dark) .color-button:hover {
  background: oklch(0.26 0.02 260);
}

.color-button.active {
  background: oklch(0.55 0.18 250);
  color: white;
}

.color-swatch {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(128, 128, 128, 0.3);
  flex-shrink: 0;
}

.color-swatches {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.color-swatch-mini {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  border: 1px solid rgba(128, 128, 128, 0.3);
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
  opacity: 0.7;
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

/* Layout Icon */
.layout-icon {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: oklch(0.50 0.02 260);
  flex-shrink: 0;
}

:global(.dark) .layout-icon {
  color: oklch(0.60 0.02 260);
}

.color-button.active .layout-icon {
  color: white;
}
</style>

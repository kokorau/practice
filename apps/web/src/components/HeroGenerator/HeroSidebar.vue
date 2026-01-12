<script setup lang="ts">
import { ref, computed } from 'vue'
import BrandColorPicker from '../SiteBuilder/BrandColorPicker.vue'
import ColorPresets from '../SiteBuilder/ColorPresets.vue'
import LayoutPresetSelector from './LayoutPresetSelector.vue'
import FloatingPanel from './FloatingPanel.vue'
import LayerPanel, { type LayerType } from './LayerPanel.vue'
import type { ColorPreset } from '../../modules/SemanticColorPalette/Domain'
import type { HeroViewPreset, SceneNode, ForegroundElementConfig, ForegroundElementType } from '../../modules/HeroScene'
import type { ContextTargetType } from './DraggableLayerNode.vue'

// ============================================================
// Grouped Props Types
// ============================================================

/** Single color HSV state with hex display */
interface ColorHSV {
  hue: number
  saturation: number
  value: number
  hex: string
}

/** All color states (brand, accent, foundation) */
interface ColorStateProps {
  brand: ColorHSV
  accent: ColorHSV
  foundation: ColorHSV
}

/** Layout presets state */
interface LayoutPresetsProps {
  presets: HeroViewPreset[]
  selectedId: string | null
}

/** Layers and foreground elements state */
interface LayersProps {
  items: SceneNode[]
  foregroundElements: ForegroundElementConfig[]
  selectedForegroundElementId: string | null
}

// Sidebar tab
type SidebarTab = 'theme' | 'layers'

// ============================================================
// Props (Grouped)
// ============================================================

const props = defineProps<{
  /** Active main tab */
  activeTab: 'generator' | 'palette'
  /** Color state (brand, accent, foundation) */
  colorState: ColorStateProps
  /** Layout presets */
  layoutPresets: LayoutPresetsProps
  /** Layers and foreground elements */
  layers: LayersProps
}>()

// ============================================================
// Emits (Grouped)
// ============================================================

const emit = defineEmits<{
  // Color updates
  'update:colorState': [colorType: 'brand' | 'accent' | 'foundation', key: keyof ColorHSV, value: number]
  'apply-color-preset': [preset: ColorPreset]
  'apply-layout-preset': [presetId: string]
  // Layer events
  'select-layer': [layerId: string]
  'toggle-expand': [layerId: string]
  'toggle-visibility': [layerId: string]
  'select-processor': [layerId: string, processorType: 'effect' | 'mask' | 'processor']
  'add-layer': [type: LayerType]
  'remove-layer': [layerId: string]
  'group-selection': [layerId: string]
  'use-as-mask': [layerId: string]
  'layer-contextmenu': [layerId: string, event: MouseEvent, targetType: ContextTargetType]
  // Foreground events
  'select-foreground-element': [elementId: string]
  'foreground-contextmenu': [elementId: string, event: MouseEvent]
  'add-foreground-element': [type: ForegroundElementType]
  'remove-foreground-element': [elementId: string]
}>()

// ============================================================
// Export types for parent components
// ============================================================

export type { ColorHSV, ColorStateProps, LayoutPresetsProps, LayersProps }

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
  const preset = props.layoutPresets.presets.find(p => p.id === props.layoutPresets.selectedId)
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
          <span class="color-swatch-mini" :style="{ backgroundColor: colorState.brand.hex }" />
          <span class="color-swatch-mini" :style="{ backgroundColor: colorState.accent.hex }" />
          <span class="color-swatch-mini" :style="{ backgroundColor: colorState.foundation.hex }" />
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
        <span class="color-swatch" :style="{ backgroundColor: colorState.brand.hex }" />
        <span class="color-info">
          <span class="color-name">Brand</span>
          <span class="color-value">{{ colorState.brand.hex }}</span>
        </span>
      </button>

      <!-- Accent Color -->
      <button
        ref="accentButtonRef"
        class="color-button"
        :class="{ active: activeColorPopup === 'accent' }"
        @click="toggleColorPopup('accent')"
      >
        <span class="color-swatch" :style="{ backgroundColor: colorState.accent.hex }" />
        <span class="color-info">
          <span class="color-name">Accent</span>
          <span class="color-value">{{ colorState.accent.hex }}</span>
        </span>
      </button>

      <!-- Foundation -->
      <button
        ref="foundationButtonRef"
        class="color-button"
        :class="{ active: activeColorPopup === 'foundation' }"
        @click="toggleColorPopup('foundation')"
      >
        <span class="color-swatch" :style="{ backgroundColor: colorState.foundation.hex }" />
        <span class="color-info">
          <span class="color-name">Foundation</span>
          <span class="color-value">{{ colorState.foundation.hex }}</span>
        </span>
      </button>
    </div>

    </template>

    <!-- Layers タブ -->
    <template v-if="sidebarTab === 'layers'">
      <div class="sidebar-section layers-section">
        <LayerPanel
          :layers="layers.items"
          :foreground-elements="layers.foregroundElements"
          :selected-foreground-element-id="layers.selectedForegroundElementId"
          @select-layer="(id: string) => emit('select-layer', id)"
          @toggle-expand="(id: string) => emit('toggle-expand', id)"
          @toggle-visibility="(id: string) => emit('toggle-visibility', id)"
          @select-processor="(id: string, type: 'effect' | 'mask' | 'processor') => emit('select-processor', id, type)"
          @add-layer="(type: LayerType) => emit('add-layer', type)"
          @remove-layer="(id: string) => emit('remove-layer', id)"
          @layer-contextmenu="(id: string, e: MouseEvent, type: ContextTargetType) => emit('layer-contextmenu', id, e, type)"
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
        :presets="layoutPresets.presets"
        :selected-preset-id="layoutPresets.selectedId"
        @select-preset="emit('apply-layout-preset', $event); closePopup()"
      />
      <ColorPresets
        v-if="activeColorPopup === 'presets'"
        :brand-hue="colorState.brand.hue"
        :brand-saturation="colorState.brand.saturation"
        :brand-value="colorState.brand.value"
        :accent-hue="colorState.accent.hue"
        :accent-saturation="colorState.accent.saturation"
        :accent-value="colorState.accent.value"
        :foundation-hue="colorState.foundation.hue"
        :foundation-saturation="colorState.foundation.saturation"
        :foundation-value="colorState.foundation.value"
        @apply-preset="emit('apply-color-preset', $event)"
      />
      <BrandColorPicker
        v-else-if="activeColorPopup === 'brand'"
        :hue="colorState.brand.hue"
        :saturation="colorState.brand.saturation"
        :value="colorState.brand.value"
        @update:hue="emit('update:colorState', 'brand', 'hue', $event)"
        @update:saturation="emit('update:colorState', 'brand', 'saturation', $event)"
        @update:value="emit('update:colorState', 'brand', 'value', $event)"
      />
      <BrandColorPicker
        v-if="activeColorPopup === 'accent'"
        :hue="colorState.accent.hue"
        :saturation="colorState.accent.saturation"
        :value="colorState.accent.value"
        @update:hue="emit('update:colorState', 'accent', 'hue', $event)"
        @update:saturation="emit('update:colorState', 'accent', 'saturation', $event)"
        @update:value="emit('update:colorState', 'accent', 'value', $event)"
      />
      <BrandColorPicker
        v-if="activeColorPopup === 'foundation'"
        :hue="colorState.foundation.hue"
        :saturation="colorState.foundation.saturation"
        :value="colorState.foundation.value"
        @update:hue="emit('update:colorState', 'foundation', 'hue', $event)"
        @update:saturation="emit('update:colorState', 'foundation', 'saturation', $event)"
        @update:value="emit('update:colorState', 'foundation', 'value', $event)"
      />
    </FloatingPanel>
  </aside>
</template>

<style scoped>
/* Left Sidebar */
.hero-sidebar {
  width: 16rem;
  flex-shrink: 0;
  background: oklch(0.94 0.01 260);
  border-right: 1px solid oklch(0.88 0.01 260);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  position: relative;
}

:global(.dark) .hero-sidebar {
  background: oklch(0.18 0.02 260);
  border-right-color: oklch(0.25 0.02 260);
}

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

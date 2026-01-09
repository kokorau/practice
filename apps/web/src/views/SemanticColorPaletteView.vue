<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $Oklch } from '@practice/color'
import type { PrimitivePalette } from '../modules/SemanticColorPalette/Domain'
import {
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  NEUTRAL_KEYS,
  FOUNDATION_KEYS,
  ACCENT_RAMP_KEYS,
} from '../modules/SemanticColorPalette/Domain'
import {
  createPrimitivePalette,
  createSemanticFromPrimitive,
  createPrimitiveRefMap,
  toCSSText,
  toCSSRuleSetsText,
} from '../modules/SemanticColorPalette/Infra'
import { useSiteColors } from '../composables/SiteBuilder'
import BrandColorPicker from '../components/SiteBuilder/BrandColorPicker.vue'
import ColorPresets from '../components/SiteBuilder/ColorPresets.vue'
import type { ColorPreset } from '../modules/SemanticColorPalette/Domain'
import PrimitiveTab from '../components/SiteBuilder/PrimitiveTab.vue'
import PalettePreviewTab from '../components/SiteBuilder/PalettePreviewTab.vue'
import ContrastTab from '../components/SiteBuilder/ContrastTab.vue'

// ============================================================
// Tab State
// ============================================================
type TabId = 'primitive' | 'palette' | 'contrast'
const activeTab = ref<TabId>('primitive')

// ============================================================
// Brand, Accent & Foundation Color State
// ============================================================
const {
  hue,
  saturation,
  value,
  selectedHex,
  brandColor,
  accentHue,
  accentSaturation,
  accentValue,
  accentHex,
  accentColor,
  foundationHue,
  foundationSaturation,
  foundationValue,
  foundationColor,
  isDark,
} = useSiteColors()

// Color popup state
type ColorPopup = 'presets' | 'brand' | 'accent' | 'foundation' | null
const activeColorPopup = ref<ColorPopup>(null)

const toggleColorPopup = (popup: ColorPopup) => {
  activeColorPopup.value = activeColorPopup.value === popup ? null : popup
}

// Handle color preset application
const handleApplyColorPreset = (preset: ColorPreset) => {
  // Apply brand
  hue.value = preset.brand.hue
  saturation.value = preset.brand.saturation
  value.value = preset.brand.value
  // Apply accent
  accentHue.value = preset.accent.hue
  accentSaturation.value = preset.accent.saturation
  accentValue.value = preset.accent.value
  // Apply foundation
  foundationHue.value = preset.foundation.hue
  foundationSaturation.value = preset.foundation.saturation
  foundationValue.value = preset.foundation.value
}

// ============================================================
// Primitive & Semantic Palette Generation
// ============================================================
const primitivePalette = computed((): PrimitivePalette => {
  return createPrimitivePalette({
    brand: brandColor.value.oklch,
    foundation: foundationColor.value.oklch,
    accent: accentColor.value.oklch,
  })
})

const semanticPalette = computed(() => createSemanticFromPrimitive(primitivePalette.value))
const primitiveRefMap = computed(() => createPrimitiveRefMap(primitivePalette.value))
const palette = computed(() => semanticPalette.value)

// Extended brand color for PrimitiveTab
const extendedBrandColor = computed(() => ({
  hex: brandColor.value.hex,
  oklch: brandColor.value.oklch,
  cssOklch: brandColor.value.cssOklch,
  cssP3: $Oklch.toCssP3(brandColor.value.oklch),
}))

// Extended accent color for PrimitiveTab
const extendedAccentColor = computed(() => ({
  hex: accentColor.value.hex,
  oklch: accentColor.value.oklch,
  cssOklch: accentColor.value.cssOklch,
  cssP3: $Oklch.toCssP3(accentColor.value.oklch),
}))

// Extended foundation color for PrimitiveTab
const extendedFoundationColor = computed(() => ({
  hex: foundationColor.value.hex,
  css: foundationColor.value.css,
  cssP3: foundationColor.value.cssP3,
}))

// Neutral ramp display
const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// Foundation ramp display
const foundationRampDisplay = computed(() => {
  return FOUNDATION_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// Accent ramp display
const accentRampDisplay = computed(() => {
  return ACCENT_RAMP_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// Context surfaces with CSS class names
const contexts = computed(() => [
  { name: 'canvas', label: 'Canvas', className: CONTEXT_CLASS_NAMES.canvas, tokens: palette.value.context.canvas, refs: primitiveRefMap.value.context.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', className: CONTEXT_CLASS_NAMES.sectionNeutral, tokens: palette.value.context.sectionNeutral, refs: primitiveRefMap.value.context.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', className: CONTEXT_CLASS_NAMES.sectionTint, tokens: palette.value.context.sectionTint, refs: primitiveRefMap.value.context.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', className: CONTEXT_CLASS_NAMES.sectionContrast, tokens: palette.value.context.sectionContrast, refs: primitiveRefMap.value.context.sectionContrast },
])

// Stateless components with CSS class names
const components = computed(() => [
  { name: 'card', label: 'Card', className: COMPONENT_CLASS_NAMES.card, tokens: palette.value.component.card, refs: primitiveRefMap.value.component.card },
  { name: 'cardFlat', label: 'Card Flat', className: COMPONENT_CLASS_NAMES.cardFlat, tokens: palette.value.component.cardFlat, refs: primitiveRefMap.value.component.cardFlat },
])

// Stateful components with CSS class names
const actions = computed(() => [
  { name: 'action', label: 'Action (CTA)', className: COMPONENT_CLASS_NAMES.action, tokens: palette.value.component.action },
  { name: 'actionQuiet', label: 'Action Quiet', className: COMPONENT_CLASS_NAMES.actionQuiet, tokens: palette.value.component.actionQuiet },
])

// Dynamic CSS injection for CSS variables and rule sets
let styleElement: HTMLStyleElement | null = null

const updateStyles = () => {
  if (!styleElement) return
  const cssVariables = toCSSText(palette.value, '.semantic-color-palette-view')
  const cssRuleSets = toCSSRuleSetsText()
  styleElement.textContent = `${cssVariables}\n\n${cssRuleSets}`
}

onMounted(() => {
  styleElement = document.createElement('style')
  styleElement.setAttribute('data-semantic-palette', '')
  document.head.appendChild(styleElement)
  updateStyles()
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
})

watch(palette, updateStyles)
</script>

<template>
  <div class="semantic-color-palette-view" :class="{ dark: isDark }">
    <!-- Left Sidebar: Color Settings -->
    <aside class="palette-sidebar">
      <h2 class="sidebar-title">Color Settings</h2>

      <!-- Presets -->
      <button
        class="color-button"
        :class="{ active: activeColorPopup === 'presets' }"
        @click="toggleColorPopup('presets')"
      >
        <span class="color-swatches">
          <span class="color-swatch-mini" :style="{ backgroundColor: selectedHex }" />
          <span class="color-swatch-mini" :style="{ backgroundColor: accentHex }" />
          <span class="color-swatch-mini" :style="{ backgroundColor: foundationColor.hex }" />
        </span>
        <span class="color-info">
          <span class="color-name">Presets</span>
          <span class="color-value">Quick start</span>
        </span>
      </button>

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

      <!-- Accent Color -->
      <button
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
        class="color-button"
        :class="{ active: activeColorPopup === 'foundation' }"
        @click="toggleColorPopup('foundation')"
      >
        <span class="color-swatch" :style="{ backgroundColor: foundationColor.hex }" />
        <span class="color-info">
          <span class="color-name">Foundation</span>
          <span class="color-value">{{ foundationColor.hex }}</span>
        </span>
      </button>

      <!-- Color Popup -->
      <Transition name="popup">
        <div v-if="activeColorPopup" class="color-popup">
          <div class="popup-header">
            <h3>{{ activeColorPopup === 'presets' ? 'Color Presets' : activeColorPopup === 'brand' ? 'Brand Color' : activeColorPopup === 'accent' ? 'Accent Color' : 'Foundation' }}</h3>
            <button class="popup-close" @click="activeColorPopup = null">×</button>
          </div>
          <div class="popup-content">
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
              @apply-preset="handleApplyColorPreset"
            />
            <BrandColorPicker
              v-else-if="activeColorPopup === 'brand'"
              :hue="hue"
              :saturation="saturation"
              :value="value"
              @update:hue="hue = $event"
              @update:saturation="saturation = $event"
              @update:value="value = $event"
            />
            <BrandColorPicker
              v-if="activeColorPopup === 'accent'"
              :hue="accentHue"
              :saturation="accentSaturation"
              :value="accentValue"
              @update:hue="accentHue = $event"
              @update:saturation="accentSaturation = $event"
              @update:value="accentValue = $event"
            />
            <BrandColorPicker
              v-if="activeColorPopup === 'foundation'"
              :hue="foundationHue"
              :saturation="foundationSaturation"
              :value="foundationValue"
              @update:hue="foundationHue = $event"
              @update:saturation="foundationSaturation = $event"
              @update:value="foundationValue = $event"
            />
          </div>
        </div>
      </Transition>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="header">
        <h1>Semantic Color Palette</h1>
        <nav class="tab-nav">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'primitive' }"
            @click="activeTab = 'primitive'"
          >
            Primitive
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'palette' }"
            @click="activeTab = 'palette'"
          >
            Palette
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'contrast' }"
            @click="activeTab = 'contrast'"
          >
            Contrast
          </button>
        </nav>
      </header>

      <!-- Primitive Tab -->
      <div v-if="activeTab === 'primitive'" class="tab-content">
        <PrimitiveTab
          :brand-color="extendedBrandColor"
          :accent-color="extendedAccentColor"
          :foundation-color="extendedFoundationColor"
          :primitive-palette="primitivePalette"
          :neutral-ramp-display="neutralRampDisplay"
          :foundation-ramp-display="foundationRampDisplay"
          :accent-ramp-display="accentRampDisplay"
        />
      </div>

      <!-- Palette Preview Tab -->
      <div v-if="activeTab === 'palette'" class="tab-content">
        <PalettePreviewTab
          :contexts="contexts"
          :components="components"
          :actions="actions"
        />
      </div>

      <!-- Contrast Tab -->
      <div v-if="activeTab === 'contrast'" class="tab-content">
        <ContrastTab :primitive-palette="primitivePalette" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.semantic-color-palette-view {
  display: flex;
  min-height: 100vh;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  transition: background 0.3s;
}

.semantic-color-palette-view.dark {
  background: oklch(0.12 0.02 260);
}

/* Sidebar */
.palette-sidebar {
  position: relative;
  width: 220px;
  flex-shrink: 0;
  padding: 1.5rem 1rem;
  background: oklch(0.94 0.01 260);
  border-right: 1px solid oklch(0.88 0.01 260);
}

.dark .palette-sidebar {
  background: oklch(0.10 0.02 260);
  border-right-color: oklch(0.20 0.02 260);
}

.sidebar-title {
  margin: 0 0 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

.dark .sidebar-title {
  color: oklch(0.60 0.02 260);
}

/* Color Buttons */
.color-button {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.625rem;
  margin-bottom: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: oklch(0.88 0.01 260);
  color: oklch(0.25 0.02 260);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.dark .color-button {
  background: oklch(0.22 0.02 260);
  color: oklch(0.90 0.01 260);
}

.color-button:hover {
  background: oklch(0.84 0.01 260);
}

.dark .color-button:hover {
  background: oklch(0.26 0.02 260);
}

.color-button.active {
  background: oklch(0.55 0.18 250);
  color: white;
}

.color-button .color-swatch {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(128, 128, 128, 0.3);
  flex-shrink: 0;
}

.color-swatches {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.color-swatch-mini {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(128, 128, 128, 0.3);
}

.color-info {
  display: flex;
  flex-direction: column;
}

.color-name {
  font-size: 0.8rem;
  font-weight: 600;
}

.color-value {
  font-size: 0.65rem;
  opacity: 0.7;
  font-family: ui-monospace, monospace;
}

/* Color Popup */
.color-popup {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 0.25rem;
  width: 18rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 0.75rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 50;
  overflow: hidden;
}

.dark .color-popup {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.25 0.02 260);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

.dark .popup-header {
  border-bottom-color: oklch(0.25 0.02 260);
}

.popup-header h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

.dark .popup-header h3 {
  color: oklch(0.90 0.01 260);
}

.popup-close {
  background: none;
  border: none;
  color: oklch(0.50 0.02 260);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.popup-close:hover {
  color: oklch(0.25 0.02 260);
}

.dark .popup-close:hover {
  color: oklch(0.90 0.02 260);
}

.popup-content {
  padding: 1rem;
}

/* Popup Transition */
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto 1.5rem;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  color: oklch(0.25 0.02 260);
}

.dark h1 {
  color: oklch(0.90 0.01 260);
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 0.25rem;
  background: oklch(0.90 0.01 260);
  padding: 0.25rem;
  border-radius: 0.5rem;
}

.dark .tab-nav {
  background: oklch(0.20 0.02 260);
}

.tab-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.45 0.02 260);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dark .tab-button {
  color: oklch(0.65 0.02 260);
}

.tab-button:hover {
  background: oklch(0.85 0.01 260);
  color: oklch(0.35 0.02 260);
}

.dark .tab-button:hover {
  background: oklch(0.25 0.02 260);
  color: oklch(0.80 0.02 260);
}

.tab-button.active {
  background: white;
  color: oklch(0.25 0.02 260);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dark .tab-button.active {
  background: oklch(0.30 0.02 260);
  color: oklch(0.95 0.01 260);
}

/* Tab Content */
.tab-content {
  max-width: 1400px;
  margin: 0 auto;
}

</style>

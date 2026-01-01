<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $Oklch } from '@practice/color'
import type { PrimitivePalette } from '../modules/SemanticColorPalette/Domain'
import {
  type ContextTokens,
  type ComponentTokens,
  type ActionState,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  NEUTRAL_KEYS,
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
import FoundationPresets from '../components/SiteBuilder/FoundationPresets.vue'

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
  selectedFoundationId,
  foundationColor,
  isDark,
} = useSiteColors()

// Color popup state
type ColorPopup = 'brand' | 'accent' | 'foundation' | null
const activeColorPopup = ref<ColorPopup>(null)

const toggleColorPopup = (popup: ColorPopup) => {
  activeColorPopup.value = activeColorPopup.value === popup ? null : popup
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

// Neutral ramp display
const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
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

const actionStates: ActionState[] = ['default', 'hover', 'active', 'disabled']

// Get token entries for display (flattened for easier viewing)
const getTokenEntries = (tokens: ContextTokens | ComponentTokens) => {
  const entries: [string, string][] = []
  entries.push(['surface', tokens.surface])
  for (const [key, value] of Object.entries(tokens.ink)) {
    entries.push([`ink.${key}`, value])
  }
  return entries
}

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
          <span class="color-value">{{ foundationColor.label }}</span>
        </span>
      </button>

      <!-- Neutral Ramp Display -->
      <div class="neutral-ramp-section">
        <span class="ramp-label">Neutral Ramp</span>
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

      <!-- Color Popup -->
      <Transition name="popup">
        <div v-if="activeColorPopup" class="color-popup">
          <div class="popup-header">
            <h3>{{ activeColorPopup === 'brand' ? 'Brand Color' : activeColorPopup === 'accent' ? 'Accent Color' : 'Foundation' }}</h3>
            <button class="popup-close" @click="activeColorPopup = null">×</button>
          </div>
          <div class="popup-content">
            <BrandColorPicker
              v-if="activeColorPopup === 'brand'"
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
            <FoundationPresets
              v-if="activeColorPopup === 'foundation'"
              :selected-id="selectedFoundationId"
              :brand-oklch="brandColor.oklch"
              :brand-hue="hue"
              @update:selected-id="selectedFoundationId = $event"
            />
          </div>
        </div>
      </Transition>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="header">
        <h1>Semantic Color Palette</h1>
        <span class="current-palette">{{ isDark ? 'Dark Theme' : 'Light Theme' }}</span>
      </header>

    <!-- Contexts Section -->
    <section class="section">
      <h2 class="section-heading">Contexts (Places)</h2>
      <div class="surfaces-grid">
        <div
          v-for="ctx in contexts"
          :key="ctx.name"
          class="surface-card"
          :class="ctx.className"
        >
          <h3 class="surface-title scp-title">{{ ctx.label }}</h3>

          <div class="tokens-list">
            <div
              v-for="[key, value] in getTokenEntries(ctx.tokens)"
              :key="key"
              class="token-row"
            >
              <span class="token-name scp-body">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-value scp-meta">{{ value }}</code>
              </div>
            </div>
          </div>

          <!-- Preview section -->
          <div class="preview-section scp-divider">
            <p class="preview-title scp-title">Title text sample</p>
            <p class="preview-body scp-body">Body text sample</p>
            <p class="preview-meta scp-meta">Meta text sample</p>
            <a href="#" class="preview-link scp-link" @click.prevent>Link text sample</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Components Section -->
    <section class="section">
      <h2 class="section-heading">Components</h2>
      <div class="components-grid">
        <!-- Stateless components -->
        <div
          v-for="comp in components"
          :key="comp.name"
          class="component-card"
          :class="comp.className"
        >
          <h3 class="component-title scp-title">{{ comp.label }}</h3>
          <span class="component-badge scp-meta">Stateless</span>

          <!-- Preview section -->
          <div class="preview-section scp-divider">
            <p class="preview-title scp-title">Title text sample</p>
            <p class="preview-body scp-body">Body text sample</p>
            <p class="preview-meta scp-meta">Meta text sample</p>
            <a href="#" class="preview-link scp-link" @click.prevent>Link text sample</a>
          </div>
        </div>

        <!-- Stateful action components -->
        <div
          v-for="action in actions"
          :key="action.name"
          class="component-card action-component"
        >
          <h3 class="component-title">{{ action.label }}</h3>
          <span class="component-badge">Stateful</span>

          <!-- Interactive buttons -->
          <div class="action-buttons">
            <button :class="action.className">Click me</button>
            <button :class="action.className" disabled>Disabled</button>
          </div>

          <!-- State preview -->
          <div class="state-previews">
            <div
              v-for="state in actionStates"
              :key="state"
              class="state-preview"
            >
              <span class="state-label">{{ state }}</span>
              <button
                class="action-button"
                :style="{
                  backgroundColor: action.tokens.surface[state],
                  borderColor: action.tokens.ink.border[state],
                  color: action.tokens.ink.title[state],
                }"
              >
                Btn
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
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

/* Neutral Ramp */
.neutral-ramp-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid oklch(0.88 0.01 260);
}

.dark .neutral-ramp-section {
  border-top-color: oklch(0.25 0.02 260);
}

.ramp-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
  margin-bottom: 0.5rem;
}

.dark .ramp-label {
  color: oklch(0.60 0.02 260);
}

.neutral-ramp {
  display: flex;
  gap: 2px;
}

.ramp-step {
  flex: 1;
  height: 1.5rem;
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

.current-palette {
  font-size: 0.875rem;
  color: oklch(0.50 0.02 260);
}

.dark .current-palette {
  color: oklch(0.60 0.02 260);
}

.section {
  max-width: 1400px;
  margin: 0 auto 2rem;
}

.section-heading {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: oklch(0.35 0.02 260);
}

.dark .section-heading {
  color: oklch(0.75 0.02 260);
}

.surfaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.surface-card {
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border: 1px solid transparent;
}

.surface-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
}

.tokens-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.token-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.token-name {
  font-size: 0.75rem;
  font-weight: 500;
}

.token-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(128,128,128,0.2);
  flex-shrink: 0;
}

.token-value {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  opacity: 0.8;
}

.preview-section {
  border-top: 1px solid rgba(128,128,128,0.15);
  padding-top: 1rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-section p {
  margin: 0;
  font-size: 0.875rem;
}

.preview-section a {
  font-size: 0.875rem;
  text-decoration: underline;
}

.tint-preview {
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

.accent-preview {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}

/* Components Section (4-column grid) */
.components-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.component-card {
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.action-component {
  background: oklch(0.99 0.005 260);
}

.dark .action-component {
  background: oklch(0.18 0.02 260);
}

.component-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

.dark .component-title {
  color: oklch(0.90 0.01 260);
}

.component-badge {
  display: inline-block;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
  margin-bottom: 0.75rem;
}

.dark .component-badge {
  color: oklch(0.60 0.02 260);
}

/* Action component specific */
.action-component {
  display: flex;
  flex-direction: column;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.action-buttons button {
  padding: 0.4rem 0.75rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-buttons button:disabled {
  cursor: not-allowed;
}

.state-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.state-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.state-label {
  font-size: 0.55rem;
  color: oklch(0.50 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.dark .state-label {
  color: oklch(0.60 0.02 260);
}

.action-button {
  padding: 0.3rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
}
</style>

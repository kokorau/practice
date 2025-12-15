<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $Oklch } from '@practice/color'
import {
  type ContextTokens,
  type ComponentTokens,
  type ActionState,
  type PrimitivePalette,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  NEUTRAL_KEYS,
  PRIMITIVE_KEYS,
} from '../modules/SemanticColorPalette/Domain'
import {
  getPaletteEntries,
  toCSSText,
  toCSSRuleSetsText,
  createPrimitivePalette,
} from '../modules/SemanticColorPalette/Infra'

// HSV Color Picker state
const hue = ref(210)
const saturation = ref(80)
const value = ref(70)

// Color picker interaction
const isDraggingSV = ref(false)
const isDraggingHue = ref(false)
const svPickerRef = ref<HTMLDivElement | null>(null)
const hueSliderRef = ref<HTMLDivElement | null>(null)

// Convert HSV to RGB
const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  s = s / 100
  v = v / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ]
}

// Convert RGB to Hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

// Computed color values
const selectedRgb = computed(() => hsvToRgb(hue.value, saturation.value, value.value))
const selectedHex = computed(() => rgbToHex(...selectedRgb.value))
const hueColor = computed(() => rgbToHex(...hsvToRgb(hue.value, 100, 100)))

// SV Picker handlers
const handleSVMouseDown = (e: MouseEvent) => {
  isDraggingSV.value = true
  updateSV(e)
}

const updateSV = (e: MouseEvent) => {
  if (!svPickerRef.value) return
  const rect = svPickerRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  saturation.value = Math.round((x / rect.width) * 100)
  value.value = Math.round(100 - (y / rect.height) * 100)
}

// Hue Slider handlers
const handleHueMouseDown = (e: MouseEvent) => {
  isDraggingHue.value = true
  updateHue(e)
}

const updateHue = (e: MouseEvent) => {
  if (!hueSliderRef.value) return
  const rect = hueSliderRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  hue.value = Math.round((x / rect.width) * 360)
}

// Global mouse handlers
const handleMouseMove = (e: MouseEvent) => {
  if (isDraggingSV.value) updateSV(e)
  if (isDraggingHue.value) updateHue(e)
}

const handleMouseUp = () => {
  isDraggingSV.value = false
  isDraggingHue.value = false
}

// Tab state
type TabId = 'primitive' | 'palette'
const activeTab = ref<TabId>('primitive')

const tabs: { id: TabId; label: string }[] = [
  { id: 'primitive', label: 'Primitive' },
  { id: 'palette', label: 'Palette Preview' },
]

// Brand color computed
const brandColor = computed(() => {
  const [r, g, b] = selectedRgb.value
  const oklch = $Oklch.fromSrgb({ r: r / 255, g: g / 255, b: b / 255 })
  return {
    hex: selectedHex.value,
    oklch,
    cssOklch: $Oklch.toCss(oklch),
    cssP3: $Oklch.toCssP3(oklch),
  }
})

// ============================================================
// Primitive Palette Generation
// ============================================================

// Generate PrimitivePalette from brand color (uses default params)
const primitivePalette = computed((): PrimitivePalette => {
  return createPrimitivePalette({ brand: brandColor.value.oklch })
})

// Neutral ramp for display (extracted from primitivePalette)
const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

const paletteEntries = getPaletteEntries()
const selectedPaletteId = ref(paletteEntries[0]?.id ?? '')

const selectedEntry = computed(() =>
  paletteEntries.find((e) => e.id === selectedPaletteId.value) ?? paletteEntries[0]!
)
const palette = computed(() => selectedEntry.value.palette)
const isDark = computed(() => selectedPaletteId.value.includes('dark'))

// Context surfaces with CSS class names
const contexts = computed(() => [
  { name: 'canvas', label: 'Canvas', className: CONTEXT_CLASS_NAMES.canvas, tokens: palette.value.context.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', className: CONTEXT_CLASS_NAMES.sectionNeutral, tokens: palette.value.context.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', className: CONTEXT_CLASS_NAMES.sectionTint, tokens: palette.value.context.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', className: CONTEXT_CLASS_NAMES.sectionContrast, tokens: palette.value.context.sectionContrast },
])

// Stateless components with CSS class names
const components = computed(() => [
  { name: 'card', label: 'Card', className: COMPONENT_CLASS_NAMES.card, tokens: palette.value.component.card },
  { name: 'cardFlat', label: 'Card Flat', className: COMPONENT_CLASS_NAMES.cardFlat, tokens: palette.value.component.cardFlat },
])

// Stateful components with CSS class names
const actions = computed(() => [
  { name: 'action', label: 'Action (CTA)', className: COMPONENT_CLASS_NAMES.action, tokens: palette.value.component.action },
  { name: 'actionQuiet', label: 'Action Quiet', className: COMPONENT_CLASS_NAMES.actionQuiet, tokens: palette.value.component.actionQuiet },
])

const actionStates: ActionState[] = ['default', 'hover', 'active', 'disabled']

// Get token entries for display (excluding optional undefined values)
const getTokenEntries = (tokens: ContextTokens | ComponentTokens) => {
  return Object.entries(tokens).filter(([, value]) => value !== undefined)
}

// Dynamic CSS injection for CSS variables and rule sets
let styleElement: HTMLStyleElement | null = null

const updateStyles = () => {
  if (!styleElement) return
  const cssVariables = toCSSText(palette.value, '.semantic-color-palette-generator')
  const cssRuleSets = toCSSRuleSetsText()
  styleElement.textContent = `${cssVariables}\n\n${cssRuleSets}`
}

onMounted(() => {
  styleElement = document.createElement('style')
  styleElement.setAttribute('data-semantic-palette-generator', '')
  document.head.appendChild(styleElement)
  updateStyles()

  // Add global mouse event listeners for color picker
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }

  // Remove global mouse event listeners
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})

watch(palette, updateStyles)
</script>

<template>
  <div class="semantic-color-palette-generator" :class="{ dark: isDark }">
    <!-- Left Sidebar: Color Picker -->
    <aside class="palette-sidebar">
      <h2 class="sidebar-title">Base Color</h2>

      <!-- SV Picker (Saturation-Value) -->
      <div
        ref="svPickerRef"
        class="sv-picker"
        :style="{ backgroundColor: hueColor }"
        @mousedown="handleSVMouseDown"
      >
        <div class="sv-picker-white" />
        <div class="sv-picker-black" />
        <div
          class="sv-picker-cursor"
          :style="{
            left: `${saturation}%`,
            top: `${100 - value}%`,
          }"
        />
      </div>

      <!-- Hue Slider -->
      <div
        ref="hueSliderRef"
        class="hue-slider"
        @mousedown="handleHueMouseDown"
      >
        <div
          class="hue-slider-cursor"
          :style="{ left: `${(hue / 360) * 100}%` }"
        />
      </div>

      <!-- Color Preview & Values -->
      <div class="color-preview-section">
        <div
          class="color-preview"
          :style="{ backgroundColor: selectedHex }"
        />
        <div class="color-values">
          <code class="hex-value">{{ selectedHex }}</code>
          <div class="hsv-values">
            <span>H: {{ hue }}°</span>
            <span>S: {{ saturation }}%</span>
            <span>V: {{ value }}%</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="header">
        <h1>Semantic Color Palette Generator</h1>
        <nav class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>
      </header>

      <!-- Primitive Tab -->
      <div v-if="activeTab === 'primitive'" class="tab-content">
        <section class="section">
          <h2 class="section-heading">Brand Color</h2>
          <div class="brand-color-display">
            <div
              class="brand-color-large"
              :style="{ backgroundColor: brandColor.hex }"
            />
            <div class="brand-color-info">
              <div class="brand-color-row">
                <span class="brand-color-label">HEX</span>
                <code class="brand-color-value">{{ brandColor.hex }}</code>
              </div>
              <div class="brand-color-row">
                <span class="brand-color-label">OKLCH</span>
                <code class="brand-color-value">{{ brandColor.cssOklch }}</code>
              </div>
              <div class="brand-color-row">
                <span class="brand-color-label">Display-P3</span>
                <code class="brand-color-value">{{ brandColor.cssP3 }}</code>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2 class="section-heading">Neutral Ramp (Light Theme)</h2>
          <p class="section-description">
            Brand hue with minimal chroma ({{ primitivePalette.N0.C.toFixed(4) }}) for cohesive grayscale
          </p>
          <div class="neutral-ramp">
            <div
              v-for="step in neutralRampDisplay"
              :key="step.key"
              class="neutral-step"
            >
              <div
                class="neutral-swatch"
                :style="{ backgroundColor: step.css }"
              />
              <div class="neutral-info">
                <span class="neutral-index">{{ step.key }}</span>
                <span class="neutral-l">L: {{ (step.color.L * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2 class="section-heading">Primitive Palette</h2>
          <div class="primitive-palette-grid">
            <div
              v-for="key in PRIMITIVE_KEYS"
              :key="key"
              class="primitive-item"
            >
              <div
                class="primitive-swatch"
                :style="{ backgroundColor: $Oklch.toCss(primitivePalette[key]) }"
              />
              <span class="primitive-key">{{ key }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Palette Preview Tab -->
      <div v-if="activeTab === 'palette'" class="tab-content">
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
            <div class="tint-preview scp-tint-surface">
              <span>Tint surface</span>
            </div>
            <div v-if="ctx.tokens.accent" class="accent-preview scp-accent">Accent</div>
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
            <div class="tint-preview scp-tint-surface">
              <span>Tint surface</span>
            </div>
            <div v-if="comp.tokens.accent" class="accent-preview scp-accent">Accent</div>
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
                  borderColor: action.tokens.border[state],
                  color: action.tokens.title[state],
                }"
              >
                Btn
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.semantic-color-palette-generator {
  display: flex;
  min-height: 100vh;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  transition: background 0.3s;
}

.semantic-color-palette-generator.dark {
  background: oklch(0.12 0.02 260);
}

/* Sidebar */
.palette-sidebar {
  width: 240px;
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
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

.dark .sidebar-title {
  color: oklch(0.60 0.02 260);
}

/* SV Picker */
.sv-picker {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  cursor: crosshair;
  overflow: hidden;
}

.sv-picker-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, white, transparent);
}

.sv-picker-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, black, transparent);
}

.sv-picker-cursor {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5), inset 0 0 2px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Hue Slider */
.hue-slider {
  position: relative;
  width: 100%;
  height: 16px;
  margin-top: 12px;
  border-radius: 8px;
  background: linear-gradient(
    to right,
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  );
  cursor: pointer;
}

.hue-slider-cursor {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 20px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Color Preview */
.color-preview-section {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  align-items: center;
}

.color-preview {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  flex-shrink: 0;
}

.color-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hex-value {
  font-size: 0.875rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

.dark .hex-value {
  color: oklch(0.90 0.01 260);
}

.hsv-values {
  display: flex;
  gap: 8px;
  font-size: 0.7rem;
  color: oklch(0.50 0.02 260);
}

.dark .hsv-values {
  color: oklch(0.60 0.02 260);
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
  gap: 0.5rem;
}

.tab-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: oklch(0.50 0.02 260);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dark .tab-button {
  color: oklch(0.60 0.02 260);
}

.tab-button:hover {
  background: oklch(0.92 0.01 260);
}

.dark .tab-button:hover {
  background: oklch(0.18 0.02 260);
}

.tab-button.active {
  background: oklch(0.55 0.18 250);
  color: white;
}

.dark .tab-button.active {
  background: oklch(0.55 0.16 250);
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Brand Color Display */
.brand-color-display {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.brand-color-large {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.brand-color-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 0.5rem;
}

.brand-color-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.brand-color-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

.dark .brand-color-label {
  color: oklch(0.60 0.02 260);
}

.brand-color-value {
  font-size: 1rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
}

.dark .brand-color-value {
  color: oklch(0.90 0.01 260);
}

/* Section description */
.section-description {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  color: oklch(0.50 0.02 260);
}

.dark .section-description {
  color: oklch(0.60 0.02 260);
}

/* Neutral Ramp */
.neutral-ramp {
  display: flex;
  gap: 0.5rem;
}

.neutral-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.neutral-swatch {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(128, 128, 128, 0.15);
}

.neutral-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.neutral-index {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.35 0.02 260);
}

.dark .neutral-index {
  color: oklch(0.75 0.02 260);
}

.neutral-l {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.50 0.02 260);
}

.dark .neutral-l {
  color: oklch(0.60 0.02 260);
}

/* Primitive Palette Grid */
.primitive-palette-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.primitive-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.primitive-swatch {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(128, 128, 128, 0.15);
}

.primitive-key {
  font-size: 0.7rem;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.40 0.02 260);
}

.dark .primitive-key {
  color: oklch(0.70 0.02 260);
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

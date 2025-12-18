<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $Oklch, contrastRatio } from '@practice/color'
import type { Oklch } from '@practice/color'
import {
  type ContextTokens,
  type ComponentTokens,
  type ActionState,
  type PrimitivePalette,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  NEUTRAL_KEYS,
  FOUNDATION_KEYS,
  BRAND_KEYS,
  $ColorPairValidation,
} from '../modules/SemanticColorPalette/Domain'
import {
  toCSSText,
  toCSSRuleSetsText,
  createPrimitivePalette,
  createSemanticFromPrimitive,
  createPrimitiveRefMap,
  type BaseTokenRefs,
  type PrimitiveRef,
} from '../modules/SemanticColorPalette/Infra'

// ============================================================
// Foundation Color State (the "paper") - Preset Selection
// ============================================================

// Foundation color presets with tint variations
type FoundationPreset = {
  id: string
  label: string
  L: number
  C: number  // Chroma for tint
  H: number | 'brand'  // Hue: fixed or inherit from brand
  description: string
}

const FOUNDATION_PRESETS: FoundationPreset[] = [
  // Light theme foundations (based on F1: L=0.955)
  { id: 'white', label: 'White', L: 0.955, C: 0, H: 0, description: 'Pure neutral' },
  { id: 'cream', label: 'Cream', L: 0.955, C: 0.02, H: 80, description: 'Warm yellow' },
  { id: 'gray-light', label: 'Gray', L: 0.955, C: 0.008, H: 'brand', description: 'Cool neutral' },
  // Dark theme foundations (based on F8: L=0.28)
  { id: 'charcoal', label: 'Charcoal', L: 0.28, C: 0.008, H: 'brand', description: 'Dark neutral' },
  { id: 'warm-dark', label: 'Warm', L: 0.28, C: 0.015, H: 50, description: 'Warm dark' },
  { id: 'ink', label: 'Ink', L: 0.28, C: 0, H: 0, description: 'Pure black' },
]

const selectedFoundationId = ref('white')

// Get the selected preset
const selectedFoundationPreset = computed(() =>
  FOUNDATION_PRESETS.find((p) => p.id === selectedFoundationId.value) ?? FOUNDATION_PRESETS[0]!
)

// Compute foundation color from selected preset
const foundationColor = computed((): { oklch: Oklch; css: string; hex: string } => {
  const preset = selectedFoundationPreset.value
  const presetHue = preset.H === 'brand' ? hue.value : preset.H
  const oklch: Oklch = { L: preset.L, C: preset.C, H: presetHue }
  return {
    oklch,
    css: $Oklch.toCss(oklch),
    hex: (() => {
      const srgb = $Oklch.toSrgb(oklch)
      const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
      return `#${toHex(srgb.r)}${toHex(srgb.g)}${toHex(srgb.b)}`
    })(),
  }
})

// Minimum contrast ratio for Foundation + Brand combination
const MIN_FOUNDATION_BRAND_CONTRAST = 2

// Check contrast for each preset against current brand
const foundationPresetsWithContrast = computed(() => {
  const brandText = $ColorPairValidation.deriveBrandText(brandColor.value.oklch)
  return FOUNDATION_PRESETS.map((preset) => {
    const presetHue = preset.H === 'brand' ? hue.value : preset.H
    const presetOklch: Oklch = { L: preset.L, C: preset.C, H: presetHue }
    const ratio = contrastRatio(brandText, presetOklch)
    const meetsMinContrast = ratio >= MIN_FOUNDATION_BRAND_CONTRAST
    return {
      ...preset,
      resolvedH: presetHue,
      contrastRatio: ratio,
      meetsMinContrast,
    }
  })
})

// Group presets by theme
const lightPresets = computed(() =>
  foundationPresetsWithContrast.value.filter((p) => p.L > 0.5)
)
const darkPresets = computed(() =>
  foundationPresetsWithContrast.value.filter((p) => p.L <= 0.5)
)

// ============================================================
// Brand Color State (HSV Color Picker - the "ink")
// ============================================================
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
type TabId = 'primitive' | 'palette' | 'demo'
const activeTab = ref<TabId>('primitive')

const tabs: { id: TabId; label: string }[] = [
  { id: 'primitive', label: 'Primitive' },
  { id: 'palette', label: 'Palette Preview' },
  { id: 'demo', label: 'Demo' },
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
// Validation
// ============================================================

// Computed contrast ratio for display
const currentContrastRatio = computed(() =>
  contrastRatio($ColorPairValidation.deriveBrandText(brandColor.value.oklch), foundationColor.value.oklch)
)

// Overall validity (contrast check)
const isValidColorPair = computed(() => currentContrastRatio.value >= MIN_FOUNDATION_BRAND_CONTRAST)

// ============================================================
// Primitive Palette Generation
// ============================================================

// Generate PrimitivePalette from brand + foundation colors
const primitivePalette = computed((): PrimitivePalette => {
  return createPrimitivePalette({
    brand: brandColor.value.oklch,
    foundation: foundationColor.value.oklch,
  })
})

// Neutral ramp for display (extracted from primitivePalette)
const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// Foundation ramp for display (extracted from primitivePalette)
const foundationRampDisplay = computed(() => {
  return FOUNDATION_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// ============================================================
// Generated Semantic Palette from Primitive
// ============================================================

// Generate SemanticColorPalette from primitivePalette
const generatedPalette = computed(() => createSemanticFromPrimitive(primitivePalette.value))

// Generate PrimitiveRefMap to track which primitive keys are used
const primitiveRefMap = computed(() => createPrimitiveRefMap(primitivePalette.value))

// Use generated palette for preview
const palette = computed(() => generatedPalette.value)

// Determine dark mode based on foundation lightness
const isDark = computed(() => foundationColor.value.oklch.L <= 0.5)

// Context surfaces with CSS class names and primitive refs
const contexts = computed(() => [
  { name: 'canvas', label: 'Canvas', className: CONTEXT_CLASS_NAMES.canvas, tokens: palette.value.context.canvas, refs: primitiveRefMap.value.context.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', className: CONTEXT_CLASS_NAMES.sectionNeutral, tokens: palette.value.context.sectionNeutral, refs: primitiveRefMap.value.context.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', className: CONTEXT_CLASS_NAMES.sectionTint, tokens: palette.value.context.sectionTint, refs: primitiveRefMap.value.context.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', className: CONTEXT_CLASS_NAMES.sectionContrast, tokens: palette.value.context.sectionContrast, refs: primitiveRefMap.value.context.sectionContrast },
])

// Stateless components with CSS class names and primitive refs
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
// Returns [key, cssValue, primitiveRef] tuples
const getTokenEntries = (tokens: ContextTokens | ComponentTokens, refs: BaseTokenRefs) => {
  const entries: [string, string, PrimitiveRef][] = []
  entries.push(['surface', tokens.surface, refs.surface])
  for (const [key, value] of Object.entries(tokens.ink)) {
    const inkKey = key as keyof typeof refs.ink
    entries.push([`ink.${key}`, value, refs.ink[inkKey]])
  }
  return entries
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
    <!-- Left Sidebar: Color Pickers -->
    <aside class="palette-sidebar">
      <!-- Brand Color Section -->
      <section class="sidebar-section">
        <h2 class="sidebar-title">Brand Color</h2>

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

        <!-- Brand Color Preview -->
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

      </section>

      <!-- Foundation Color Section -->
      <section class="sidebar-section">
        <h2 class="sidebar-title">Foundation Color</h2>

        <!-- Light Theme Presets -->
        <div class="preset-group">
          <span class="preset-group-label">Light</span>
          <div class="preset-options">
            <button
              v-for="preset in lightPresets"
              :key="preset.id"
              class="preset-button"
              :class="{
                selected: selectedFoundationId === preset.id,
                warning: !preset.meetsMinContrast,
              }"
              :style="{ backgroundColor: `oklch(${preset.L} ${preset.C} ${preset.resolvedH})` }"
              @click="selectedFoundationId = preset.id"
            >
              <span class="preset-label">{{ preset.label }}</span>
              <span v-if="!preset.meetsMinContrast" class="preset-warning-icon">!</span>
            </button>
          </div>
        </div>

        <!-- Dark Theme Presets -->
        <div class="preset-group">
          <span class="preset-group-label">Dark</span>
          <div class="preset-options">
            <button
              v-for="preset in darkPresets"
              :key="preset.id"
              class="preset-button preset-button--dark"
              :class="{
                selected: selectedFoundationId === preset.id,
                warning: !preset.meetsMinContrast,
              }"
              :style="{ backgroundColor: `oklch(${preset.L} ${preset.C} ${preset.resolvedH})` }"
              @click="selectedFoundationId = preset.id"
            >
              <span class="preset-label">{{ preset.label }}</span>
              <span v-if="!preset.meetsMinContrast" class="preset-warning-icon">!</span>
            </button>
          </div>
        </div>

        <!-- Selected Foundation Preview -->
        <div class="color-preview-section">
          <div
            class="color-preview"
            :style="{ backgroundColor: foundationColor.hex }"
          />
          <div class="color-values">
            <code class="hex-value">{{ foundationColor.hex }}</code>
            <div class="hsv-values">
              <span>{{ selectedFoundationPreset.label }}</span>
            </div>
          </div>
        </div>

        <!-- Contrast Warning for selected foundation -->
        <div v-if="!isValidColorPair" class="validation-warning">
          <span class="warning-icon">!</span>
          <span class="warning-text">Low contrast ({{ currentContrastRatio.toFixed(1) }}:1)</span>
        </div>
      </section>
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
          <div class="color-pair-grid">
            <!-- Brand Color -->
            <div class="color-card">
              <h2 class="section-heading">Brand Color</h2>
              <div class="color-display">
                <div
                  class="color-large"
                  :style="{ backgroundColor: brandColor.hex }"
                />
                <div class="color-info">
                  <div class="color-row">
                    <span class="color-label">HEX</span>
                    <code class="color-value">{{ brandColor.hex }}</code>
                  </div>
                  <div class="color-row">
                    <span class="color-label">OKLCH</span>
                    <code class="color-value">{{ brandColor.cssOklch }}</code>
                  </div>
                  <div class="color-row">
                    <span class="color-label">Display-P3</span>
                    <code class="color-value">{{ brandColor.cssP3 }}</code>
                  </div>
                </div>
              </div>
            </div>

            <!-- Foundation Color -->
            <div class="color-card">
              <h2 class="section-heading">Foundation Color</h2>
              <div class="color-display">
                <div
                  class="color-large"
                  :style="{ backgroundColor: foundationColor.hex }"
                />
                <div class="color-info">
                  <div class="color-row">
                    <span class="color-label">HEX</span>
                    <code class="color-value">{{ foundationColor.hex }}</code>
                  </div>
                  <div class="color-row">
                    <span class="color-label">OKLCH</span>
                    <code class="color-value">{{ foundationColor.css }}</code>
                  </div>
                  <div class="color-row">
                    <span class="color-label">Preset</span>
                    <code class="color-value">{{ selectedFoundationPreset.label }}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contrast Ratio -->
          <div class="contrast-info" :class="{ warning: !isValidColorPair }">
            <span class="contrast-label">Contrast Ratio</span>
            <span class="contrast-value">{{ currentContrastRatio.toFixed(2) }}:1</span>
            <span v-if="!isValidColorPair" class="contrast-warning">Low contrast</span>
          </div>
        </section>

        <section class="section">
          <h2 class="section-heading">Neutral Ramp (Brand-derived)</h2>
          <p class="section-description">
            Brand hue with minimal chroma ({{ primitivePalette.N0.C.toFixed(4) }}) for ink colors
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
          <h2 class="section-heading">Foundation Ramp (Foundation-derived)</h2>
          <p class="section-description">
            Foundation hue with minimal chroma ({{ primitivePalette.F0.C.toFixed(4) }}) for surface colors
          </p>
          <div class="neutral-ramp">
            <div
              v-for="step in foundationRampDisplay"
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
          <div class="section-header">
            <h2 class="section-heading">Primitive Palette</h2>
            <span class="theme-badge" :class="primitivePalette.theme">
              {{ primitivePalette.theme }}
            </span>
          </div>

          <!-- Neutral (N0-N9) -->
          <div class="primitive-group">
            <h3 class="primitive-group-label">Neutral (Brand-derived)</h3>
            <div class="primitive-palette-grid">
              <div
                v-for="key in NEUTRAL_KEYS"
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
          </div>

          <!-- Foundation (F0-F9) -->
          <div class="primitive-group">
            <h3 class="primitive-group-label">Foundation (Foundation-derived)</h3>
            <div class="primitive-palette-grid">
              <div
                v-for="key in FOUNDATION_KEYS"
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
          </div>

          <!-- Brand (B, Bt, Bs, Bf) -->
          <div class="primitive-group">
            <h3 class="primitive-group-label">Brand (B + derivatives)</h3>
            <div class="primitive-palette-grid">
              <div
                v-for="key in BRAND_KEYS"
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
              v-for="[key, value, ref] in getTokenEntries(ctx.tokens, ctx.refs)"
              :key="key"
              class="token-row"
            >
              <span class="token-name scp-body">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-ref">{{ ref }}</code>
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

          <div class="tokens-list">
            <div
              v-for="[key, value, ref] in getTokenEntries(comp.tokens, comp.refs)"
              :key="key"
              class="token-row"
            >
              <span class="token-name scp-body">{{ key }}</span>
              <div class="token-preview">
                <span class="color-swatch" :style="{ backgroundColor: value }" />
                <code class="token-ref">{{ ref }}</code>
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

        <!-- Stateful action components (on CardFlat) -->
        <div
          v-for="action in actions"
          :key="action.name"
          class="component-card action-component"
          :class="COMPONENT_CLASS_NAMES.cardFlat"
        >
          <h3 class="component-title scp-title">{{ action.label }}</h3>
          <span class="component-badge scp-meta">Stateful</span>

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
              <span class="state-label scp-meta">{{ state }}</span>
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
      </div>

      <!-- Demo Tab -->
      <div v-if="activeTab === 'demo'" class="tab-content">
        <div class="demo-page" :class="CONTEXT_CLASS_NAMES.canvas">
          <!-- Header -->
          <header class="demo-header" :class="CONTEXT_CLASS_NAMES.canvas">
            <div class="demo-header-inner">
              <div class="demo-logo scp-title">PaletteGen</div>
              <nav class="demo-nav">
                <a href="#" class="demo-nav-link scp-body" @click.prevent>Features</a>
                <a href="#" class="demo-nav-link scp-body" @click.prevent>Pricing</a>
                <a href="#" class="demo-nav-link scp-body" @click.prevent>Docs</a>
              </nav>
              <div class="demo-header-actions">
                <button :class="COMPONENT_CLASS_NAMES.actionQuiet">Log in</button>
                <button :class="COMPONENT_CLASS_NAMES.action">Sign up</button>
              </div>
            </div>
          </header>

          <!-- Hero Section -->
          <section class="demo-hero" :class="CONTEXT_CLASS_NAMES.sectionTint">
            <div class="demo-hero-content">
              <span class="demo-hero-badge scp-meta">
                <span class="demo-hero-badge-dot" />
                Now in Public Beta
              </span>
              <h1 class="demo-hero-title scp-title">
                Design with<br />
                <span class="demo-hero-highlight scp-link">Perfect Colors</span>
              </h1>
              <p class="demo-hero-subtitle scp-body">
                Create beautiful, accessible color palettes for your next project. Powered by OKLCH for perceptually uniform results.
              </p>
              <div class="demo-hero-actions">
                <button :class="COMPONENT_CLASS_NAMES.action">Start Free</button>
                <button :class="COMPONENT_CLASS_NAMES.actionQuiet">
                  <span class="demo-play-icon">&#9654;</span>
                  Watch Demo
                </button>
              </div>
              <div class="demo-hero-stats">
                <div class="demo-hero-stat">
                  <span class="demo-hero-stat-value scp-title">10K+</span>
                  <span class="demo-hero-stat-label scp-meta">Designers</span>
                </div>
                <div class="demo-hero-stat">
                  <span class="demo-hero-stat-value scp-title">50K+</span>
                  <span class="demo-hero-stat-label scp-meta">Palettes</span>
                </div>
                <div class="demo-hero-stat">
                  <span class="demo-hero-stat-value scp-title">4.9</span>
                  <span class="demo-hero-stat-label scp-meta">Rating</span>
                </div>
              </div>
            </div>
            <div class="demo-hero-visual">
              <div class="demo-hero-glow" />
              <div class="demo-hero-grid" />
              <div class="demo-hero-shapes">
                <div class="demo-shape demo-shape-1" />
                <div class="demo-shape demo-shape-2" />
                <div class="demo-shape demo-shape-3" />
                <div class="demo-shape demo-shape-4" />
                <div class="demo-shape demo-shape-5" />
              </div>
              <div class="demo-hero-ring demo-hero-ring-1" />
              <div class="demo-hero-ring demo-hero-ring-2" />
              <div class="demo-hero-orb" />
            </div>
          </section>

          <!-- Features Section -->
          <section class="demo-features" :class="CONTEXT_CLASS_NAMES.canvas">
            <h2 class="demo-section-title scp-title">Features</h2>
            <div class="demo-features-grid">
              <div class="demo-feature-card" :class="COMPONENT_CLASS_NAMES.card">
                <div class="demo-feature-visual">
                  <svg viewBox="0 0 120 80" class="demo-feature-svg">
                    <circle cx="30" cy="40" r="25" :fill="'var(--link-text)'" opacity="0.8" />
                    <circle cx="60" cy="40" r="25" :fill="'var(--link-text)'" opacity="0.5" />
                    <circle cx="90" cy="40" r="25" :fill="'var(--link-text)'" opacity="0.2" />
                  </svg>
                </div>
                <h3 class="demo-feature-title scp-title">OKLCH Colors</h3>
                <p class="demo-feature-desc scp-body">Perceptually uniform color space for consistent results.</p>
              </div>
              <div class="demo-feature-card" :class="COMPONENT_CLASS_NAMES.card">
                <div class="demo-feature-visual">
                  <svg viewBox="0 0 120 80" class="demo-feature-svg">
                    <rect x="10" y="20" width="40" height="40" rx="4" :fill="'var(--title)'" opacity="0.2" />
                    <rect x="35" y="20" width="40" height="40" rx="4" :fill="'var(--link-text)'" opacity="0.6" />
                    <path d="M85 25 L105 40 L85 55" :stroke="'var(--link-text)'" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
                <h3 class="demo-feature-title scp-title">Auto Contrast</h3>
                <p class="demo-feature-desc scp-body">Automatically ensures accessible contrast ratios.</p>
              </div>
              <div class="demo-feature-card" :class="COMPONENT_CLASS_NAMES.card">
                <div class="demo-feature-visual">
                  <svg viewBox="0 0 120 80" class="demo-feature-svg">
                    <circle cx="40" cy="40" r="28" :fill="'var(--link-text)'" opacity="0.15" />
                    <path d="M40 12 L40 40 L60 40" :stroke="'var(--link-text)'" stroke-width="3" fill="none" stroke-linecap="round" />
                    <circle cx="80" cy="40" r="28" :fill="'var(--title)'" opacity="0.15" />
                    <path d="M80 12 L80 40 L100 40" :stroke="'var(--title)'" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6" />
                  </svg>
                </div>
                <h3 class="demo-feature-title scp-title">Light & Dark</h3>
                <p class="demo-feature-desc scp-body">Seamless theme switching built right in.</p>
              </div>
            </div>
          </section>

          <!-- Logos Section -->
          <section class="demo-logos" :class="CONTEXT_CLASS_NAMES.sectionNeutral">
            <p class="demo-logos-label scp-meta">Trusted by teams at</p>
            <div class="demo-logos-grid">
              <div class="demo-logo-item scp-title">Acme Inc</div>
              <div class="demo-logo-item scp-title">Globex</div>
              <div class="demo-logo-item scp-title">Stark</div>
              <div class="demo-logo-item scp-title">Wayne</div>
              <div class="demo-logo-item scp-title">Umbrella</div>
            </div>
          </section>

          <!-- How it works Section -->
          <section class="demo-how" :class="CONTEXT_CLASS_NAMES.canvas">
            <h2 class="demo-section-title scp-title">How it works</h2>
            <div class="demo-how-steps">
              <div class="demo-how-step">
                <div class="demo-how-number scp-link">1</div>
                <h3 class="demo-how-title scp-title">Pick a brand color</h3>
                <p class="demo-how-desc scp-body">Choose your primary brand color using our intuitive color picker.</p>
              </div>
              <div class="demo-how-connector" />
              <div class="demo-how-step">
                <div class="demo-how-number scp-link">2</div>
                <h3 class="demo-how-title scp-title">Adjust parameters</h3>
                <p class="demo-how-desc scp-body">Fine-tune lightness, chroma, and contrast to match your vision.</p>
              </div>
              <div class="demo-how-connector" />
              <div class="demo-how-step">
                <div class="demo-how-number scp-link">3</div>
                <h3 class="demo-how-title scp-title">Export & use</h3>
                <p class="demo-how-desc scp-body">Export as CSS variables, Tailwind config, or design tokens.</p>
              </div>
            </div>
          </section>

          <!-- Testimonials Section -->
          <section class="demo-testimonials" :class="CONTEXT_CLASS_NAMES.sectionTint">
            <h2 class="demo-section-title scp-title">What people are saying</h2>
            <div class="demo-testimonials-grid">
              <div class="demo-testimonial" :class="COMPONENT_CLASS_NAMES.card">
                <p class="demo-testimonial-text scp-body">"Finally, a color tool that understands accessibility. The auto-contrast feature alone saves us hours every week."</p>
                <div class="demo-testimonial-author">
                  <div class="demo-testimonial-avatar" />
                  <div class="demo-testimonial-info">
                    <span class="demo-testimonial-name scp-title">Sarah Chen</span>
                    <span class="demo-testimonial-role scp-meta">Design Lead, Figma</span>
                  </div>
                </div>
              </div>
              <div class="demo-testimonial" :class="COMPONENT_CLASS_NAMES.card">
                <p class="demo-testimonial-text scp-body">"We switched from HSL to OKLCH thanks to this tool. The perceptual uniformity makes such a difference."</p>
                <div class="demo-testimonial-author">
                  <div class="demo-testimonial-avatar" />
                  <div class="demo-testimonial-info">
                    <span class="demo-testimonial-name scp-title">Marcus Johnson</span>
                    <span class="demo-testimonial-role scp-meta">Senior Engineer, Vercel</span>
                  </div>
                </div>
              </div>
              <div class="demo-testimonial" :class="COMPONENT_CLASS_NAMES.card">
                <p class="demo-testimonial-text scp-body">"The best palette generator I've used. Dark mode support out of the box is a game changer."</p>
                <div class="demo-testimonial-author">
                  <div class="demo-testimonial-avatar" />
                  <div class="demo-testimonial-info">
                    <span class="demo-testimonial-name scp-title">Emily Park</span>
                    <span class="demo-testimonial-role scp-meta">Product Designer, Linear</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Pricing Section -->
          <section class="demo-pricing" :class="CONTEXT_CLASS_NAMES.canvas">
            <h2 class="demo-section-title scp-title">Simple pricing</h2>
            <p class="demo-pricing-subtitle scp-body">Start free, upgrade when you need more.</p>
            <div class="demo-pricing-grid">
              <div class="demo-pricing-card" :class="COMPONENT_CLASS_NAMES.card">
                <h3 class="demo-pricing-name scp-title">Free</h3>
                <div class="demo-pricing-price">
                  <span class="demo-pricing-amount scp-title">$0</span>
                  <span class="demo-pricing-period scp-meta">/month</span>
                </div>
                <ul class="demo-pricing-features">
                  <li class="scp-body">5 palettes</li>
                  <li class="scp-body">CSS export</li>
                  <li class="scp-body">Basic support</li>
                </ul>
                <button :class="COMPONENT_CLASS_NAMES.actionQuiet">Get Started</button>
              </div>
              <div class="demo-pricing-card demo-pricing-featured" :class="COMPONENT_CLASS_NAMES.card">
                <span class="demo-pricing-badge scp-meta">Popular</span>
                <h3 class="demo-pricing-name scp-title">Pro</h3>
                <div class="demo-pricing-price">
                  <span class="demo-pricing-amount scp-title">$12</span>
                  <span class="demo-pricing-period scp-meta">/month</span>
                </div>
                <ul class="demo-pricing-features">
                  <li class="scp-body">Unlimited palettes</li>
                  <li class="scp-body">All export formats</li>
                  <li class="scp-body">Team sharing</li>
                  <li class="scp-body">Priority support</li>
                </ul>
                <button :class="COMPONENT_CLASS_NAMES.action">Start Free Trial</button>
              </div>
              <div class="demo-pricing-card" :class="COMPONENT_CLASS_NAMES.card">
                <h3 class="demo-pricing-name scp-title">Enterprise</h3>
                <div class="demo-pricing-price">
                  <span class="demo-pricing-amount scp-title">Custom</span>
                </div>
                <ul class="demo-pricing-features">
                  <li class="scp-body">Everything in Pro</li>
                  <li class="scp-body">SSO & SAML</li>
                  <li class="scp-body">Dedicated support</li>
                  <li class="scp-body">Custom integrations</li>
                </ul>
                <button :class="COMPONENT_CLASS_NAMES.actionQuiet">Contact Sales</button>
              </div>
            </div>
          </section>

          <!-- FAQ Section -->
          <section class="demo-faq" :class="CONTEXT_CLASS_NAMES.sectionNeutral">
            <h2 class="demo-section-title scp-title">Frequently asked questions</h2>
            <div class="demo-faq-list">
              <details class="demo-faq-item" :class="COMPONENT_CLASS_NAMES.cardFlat">
                <summary class="demo-faq-question scp-title">What is OKLCH and why should I use it?</summary>
                <p class="demo-faq-answer scp-body">OKLCH is a perceptually uniform color space. Unlike HSL, colors with the same lightness value actually appear equally bright to human eyes, making it ideal for creating consistent design systems.</p>
              </details>
              <details class="demo-faq-item" :class="COMPONENT_CLASS_NAMES.cardFlat">
                <summary class="demo-faq-question scp-title">Can I export to Tailwind CSS?</summary>
                <p class="demo-faq-answer scp-body">Yes! Pro users can export palettes directly to Tailwind config format, including CSS variables and theme extensions.</p>
              </details>
              <details class="demo-faq-item" :class="COMPONENT_CLASS_NAMES.cardFlat">
                <summary class="demo-faq-question scp-title">How does auto-contrast work?</summary>
                <p class="demo-faq-answer scp-body">Our algorithm automatically calculates WCAG-compliant contrast ratios and adjusts text colors to ensure readability on any background.</p>
              </details>
              <details class="demo-faq-item" :class="COMPONENT_CLASS_NAMES.cardFlat">
                <summary class="demo-faq-question scp-title">Is there a Figma plugin?</summary>
                <p class="demo-faq-answer scp-body">We're currently developing a Figma plugin. Join our waitlist to be notified when it's ready.</p>
              </details>
            </div>
          </section>

          <!-- CTA Section -->
          <section class="demo-cta" :class="CONTEXT_CLASS_NAMES.sectionContrast">
            <h2 class="demo-cta-title scp-title">Ready to Start?</h2>
            <p class="demo-cta-desc scp-body">Join thousands of designers using our palette generator.</p>

            <div class="demo-cta-benefits">
              <span class="demo-cta-benefit scp-body">&#10003; Free forever</span>
              <span class="demo-cta-benefit scp-body">&#10003; No credit card</span>
              <span class="demo-cta-benefit scp-body">&#10003; Instant access</span>
            </div>

            <div class="demo-cta-form" :class="COMPONENT_CLASS_NAMES.cardFlat">
              <input
                type="email"
                placeholder="Enter your email"
                class="demo-cta-input scp-body"
              />
              <button :class="COMPONENT_CLASS_NAMES.action">Get Started</button>
            </div>

            <p class="demo-cta-note scp-meta">
              By signing up, you agree to our Terms and Privacy Policy.
            </p>
          </section>

          <!-- Footer -->
          <footer class="demo-footer" :class="CONTEXT_CLASS_NAMES.sectionNeutral">
            <div class="demo-footer-main">
              <div class="demo-footer-brand">
                <div class="demo-footer-logo scp-title">PaletteGen</div>
                <p class="demo-footer-tagline scp-body">Beautiful colors for everyone.</p>
              </div>

              <div class="demo-footer-columns">
                <div class="demo-footer-column">
                  <h4 class="demo-footer-heading scp-title">Product</h4>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>Features</a>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>Pricing</a>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>Changelog</a>
                </div>
                <div class="demo-footer-column">
                  <h4 class="demo-footer-heading scp-title">Resources</h4>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>Documentation</a>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>Guides</a>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>API</a>
                </div>
                <div class="demo-footer-column">
                  <h4 class="demo-footer-heading scp-title">Company</h4>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>About</a>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>Blog</a>
                  <a href="#" class="demo-footer-link scp-body" @click.prevent>Careers</a>
                </div>
              </div>
            </div>

            <div class="demo-footer-bottom scp-divider">
              <p class="demo-footer-copyright scp-meta">&copy; 2024 PaletteGen. All rights reserved.</p>
              <div class="demo-footer-legal">
                <a href="#" class="scp-meta" @click.prevent>Privacy</a>
                <a href="#" class="scp-meta" @click.prevent>Terms</a>
              </div>
            </div>
          </footer>
        </div>
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

/* Color Pair Grid */
.color-pair-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.color-card {
  background: oklch(0.99 0.005 260);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.dark .color-card {
  background: oklch(0.16 0.02 260);
}

.color-card .section-heading {
  margin-top: 0;
  margin-bottom: 1rem;
}

.color-display {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.color-large {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(128, 128, 128, 0.15);
  flex-shrink: 0;
}

.color-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.color-row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.color-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
}

.dark .color-label {
  color: oklch(0.60 0.02 260);
}

.color-value {
  font-size: 0.85rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
}

.dark .color-value {
  color: oklch(0.90 0.01 260);
}

/* Contrast Info */
.contrast-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: oklch(0.96 0.01 260);
  border-radius: 8px;
  border: 1px solid oklch(0.90 0.01 260);
}

.dark .contrast-info {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.25 0.02 260);
}

.contrast-info.warning {
  background: oklch(0.95 0.05 30);
  border-color: oklch(0.80 0.12 30);
}

.dark .contrast-info.warning {
  background: oklch(0.20 0.05 30);
  border-color: oklch(0.40 0.12 30);
}

.contrast-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: oklch(0.50 0.02 260);
}

.dark .contrast-label {
  color: oklch(0.60 0.02 260);
}

.contrast-value {
  font-size: 1rem;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.30 0.02 260);
}

.dark .contrast-value {
  color: oklch(0.85 0.01 260);
}

.contrast-warning {
  font-size: 0.7rem;
  font-weight: 600;
  color: oklch(0.45 0.15 30);
  padding: 0.25rem 0.5rem;
  background: oklch(0.90 0.08 30);
  border-radius: 4px;
}

.dark .contrast-warning {
  color: oklch(0.80 0.12 30);
  background: oklch(0.25 0.08 30);
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

.primitive-group {
  margin-bottom: 1.5rem;
}

.primitive-group:last-child {
  margin-bottom: 0;
}

.primitive-group-label {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: oklch(0.50 0.02 260);
}

.dark .primitive-group-label {
  color: oklch(0.60 0.02 260);
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

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.section-header .section-heading {
  margin-bottom: 0;
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

.theme-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.theme-badge.light {
  background: oklch(0.96 0.02 80);
  color: oklch(0.45 0.08 80);
  border: 1px solid oklch(0.88 0.04 80);
}

.theme-badge.dark {
  background: oklch(0.25 0.02 260);
  color: oklch(0.75 0.02 260);
  border: 1px solid oklch(0.35 0.02 260);
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

.token-ref {
  font-size: 0.75rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  background: color-mix(in oklch, var(--border) 30%, transparent);
  border-radius: 4px;
  color: var(--meta);
}

.preview-section {
  border-top-width: 1px;
  border-top-style: solid;
  /* border-color is set by .scp-divider via var(--divider) */
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

/* .action-component background is set by canvas context class */

.component-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  /* color is set by .scp-title via var(--title) */
}

.component-badge {
  display: inline-block;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  /* color is set by .scp-meta via var(--meta) */
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
  border-width: 1px;
  border-style: solid;
  /* border-color is set by semantic class (.scp-action, .scp-action-quiet) */
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
  text-transform: uppercase;
  letter-spacing: 0.03em;
  /* color is set by .scp-meta via var(--meta) */
}

.action-button {
  padding: 0.3rem 0.5rem;
  border-width: 1px;
  border-style: solid;
  /* border-color is set by semantic class (.scp-action, .scp-action-quiet) */
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
}

/* Sidebar Sections */
.sidebar-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

.sidebar-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.dark .sidebar-section {
  border-bottom-color: oklch(0.20 0.02 260);
}

/* Foundation Color Presets */
.preset-group {
  margin-bottom: 0.75rem;
}

.preset-group-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.50 0.02 260);
  margin-bottom: 0.375rem;
}

.dark .preset-group-label {
  color: oklch(0.60 0.02 260);
}

.preset-options {
  display: flex;
  gap: 0.375rem;
}

.preset-button {
  position: relative;
  flex: 1;
  padding: 0.5rem 0.25rem;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preset-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.preset-button.selected {
  border-color: oklch(0.55 0.18 250);
  box-shadow: 0 0 0 2px oklch(0.55 0.18 250 / 0.3);
}

.preset-button.warning {
  opacity: 0.6;
}

.preset-button.warning:not(.selected) {
  border-color: oklch(0.70 0.15 30);
}

.preset-label {
  display: block;
  font-size: 0.6rem;
  font-weight: 600;
  text-align: center;
  color: oklch(0.25 0.02 260);
}

/* Dark preset labels need light text */
.preset-button--dark .preset-label {
  color: white;
}

.preset-warning-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: oklch(0.65 0.20 30);
  color: white;
  border-radius: 50%;
  font-size: 0.55rem;
  font-weight: 700;
}

/* Validation Warning */
.validation-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: oklch(0.95 0.05 30);
  border-radius: 6px;
  border: 1px solid oklch(0.80 0.12 30);
}

.dark .validation-warning {
  background: oklch(0.20 0.05 30);
  border-color: oklch(0.40 0.12 30);
}

.warning-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: oklch(0.65 0.20 30);
  color: white;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
}

.warning-text {
  font-size: 0.7rem;
  color: oklch(0.40 0.10 30);
}

.dark .warning-text {
  color: oklch(0.75 0.10 30);
}

/* Demo Page */
.demo-page {
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.demo-page > * {
  --content-width: 980px;
  --content-padding: max(2rem, calc((100% - var(--content-width)) / 2));
}

/* Demo Header */
.demo-header {
  padding: 0.75rem var(--content-padding);
  border-bottom: 1px solid var(--border);
}

.demo-header-inner {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.demo-logo {
  font-size: 1.1rem;
  font-weight: 700;
}

.demo-nav {
  display: flex;
  gap: 1.5rem;
  flex: 1;
}

.demo-nav-link {
  font-size: 0.85rem;
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.15s;
}

.demo-nav-link:hover {
  opacity: 1;
}

.demo-header-actions {
  display: flex;
  gap: 0.5rem;
}

.demo-header-actions button {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

/* Demo Hero Section */
.demo-hero {
  display: flex;
  align-items: center;
  gap: 3rem;
  padding: 4rem var(--content-padding);
  position: relative;
  overflow: hidden;
}

.demo-hero-content {
  flex: 1;
  text-align: left;
}

.demo-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: color-mix(in oklch, var(--link-text) 15%, transparent);
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.demo-hero-badge-dot {
  width: 6px;
  height: 6px;
  background: var(--link-text);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.demo-hero-title {
  margin: 0 0 1.25rem;
  font-size: 3.25rem;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.demo-hero-highlight {
  display: inline;
}

.demo-hero-subtitle {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  line-height: 1.7;
  opacity: 0.75;
}

.demo-hero-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.demo-hero-actions button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.85rem;
}

.demo-play-icon {
  font-size: 0.65rem;
}

.demo-hero-stats {
  display: flex;
  gap: 2rem;
}

.demo-hero-stat {
  display: flex;
  flex-direction: column;
}

.demo-hero-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.demo-hero-stat-label {
  font-size: 0.65rem;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Hero Visual */
.demo-hero-visual {
  flex: 0 0 280px;
  height: 280px;
  position: relative;
}

/* Background glow */
.demo-hero-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--title) 25%, transparent) 0%,
    transparent 70%
  );
  filter: blur(30px);
  animation: glowPulse 4s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* Grid pattern */
.demo-hero-grid {
  position: absolute;
  inset: 10px;
  background-image:
    linear-gradient(color-mix(in oklch, var(--title) 20%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklch, var(--title) 20%, transparent) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.5;
  mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 70%);
}

/* Floating shapes container */
.demo-hero-shapes {
  position: absolute;
  inset: 0;
}

.demo-shape {
  position: absolute;
  border-radius: 50%;
}

.demo-shape-1 {
  width: 130px;
  height: 130px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, var(--title) 0%, color-mix(in oklch, var(--title) 60%, var(--surface)) 100%);
  box-shadow: 0 25px 50px color-mix(in oklch, var(--title) 30%, transparent);
}

.demo-shape-2 {
  width: 60px;
  height: 60px;
  top: 10%;
  left: 8%;
  background: color-mix(in oklch, var(--title) 80%, var(--surface));
  opacity: 0.6;
  animation: float1 6s ease-in-out infinite;
}

.demo-shape-3 {
  width: 40px;
  height: 40px;
  top: 15%;
  right: 12%;
  background: color-mix(in oklch, var(--title) 50%, var(--surface));
  opacity: 0.4;
  animation: float2 5s ease-in-out infinite;
}

.demo-shape-4 {
  width: 25px;
  height: 25px;
  bottom: 20%;
  left: 12%;
  background: color-mix(in oklch, var(--title) 60%, var(--surface));
  opacity: 0.5;
  animation: float3 7s ease-in-out infinite;
}

.demo-shape-5 {
  width: 50px;
  height: 50px;
  bottom: 10%;
  right: 8%;
  background: linear-gradient(45deg, var(--title), color-mix(in oklch, var(--title) 40%, var(--surface)));
  opacity: 0.5;
  animation: float1 8s ease-in-out infinite reverse;
}

@keyframes float1 {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-15px) rotate(10deg); }
}

@keyframes float2 {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(10px) scale(1.1); }
}

@keyframes float3 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(8px, -8px); }
  66% { transform: translate(-5px, 5px); }
}

/* Orbital rings */
.demo-hero-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 1px solid var(--title);
  border-radius: 50%;
  opacity: 0.25;
}

.demo-hero-ring-1 {
  width: 180px;
  height: 180px;
  margin: -90px 0 0 -90px;
  animation: spin 20s linear infinite;
}

.demo-hero-ring-2 {
  width: 230px;
  height: 230px;
  margin: -115px 0 0 -115px;
  border-style: dashed;
  opacity: 0.2;
  animation: spin 30s linear infinite reverse;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Center orb with glass effect */
.demo-hero-orb {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80px;
  height: 80px;
  margin: -40px 0 0 -40px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--surface) 85%, var(--title)) 0%,
    color-mix(in oklch, var(--surface) 70%, var(--title)) 100%
  );
  border: 1px solid color-mix(in oklch, var(--title) 25%, transparent);
  box-shadow:
    inset 0 -20px 40px color-mix(in oklch, var(--title) 15%, transparent),
    0 10px 30px color-mix(in oklch, var(--title) 20%, transparent);
}

.demo-hero-orb::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 16px;
  width: 28px;
  height: 16px;
  background: color-mix(in oklch, var(--surface) 90%, transparent);
  border-radius: 50%;
  filter: blur(5px);
}

/* Demo Features Section */
.demo-features {
  padding: 3rem var(--content-padding);
}

.demo-section-title {
  margin: 0 0 2rem;
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: -0.03em;
}

.demo-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.demo-feature-card {
  padding: 1.25rem;
  border-radius: 12px;
  text-align: center;
}

.demo-feature-visual {
  height: 80px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.demo-feature-svg {
  width: 100%;
  height: 100%;
}

.demo-feature-title {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.demo-feature-desc {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.7;
}

/* Demo Logos Section */
.demo-logos {
  padding: 2rem var(--content-padding);
  text-align: center;
}

.demo-logos-label {
  margin: 0 0 1.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.demo-logos-grid {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.demo-logo-item {
  font-size: 1.25rem;
  font-weight: 700;
  opacity: 0.35;
  letter-spacing: -0.02em;
}

/* Demo How it works Section */
.demo-how {
  padding: 3rem var(--content-padding);
}

.demo-how-steps {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.demo-how-step {
  flex: 1;
  text-align: center;
}

.demo-how-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: color-mix(in oklch, var(--link-text) 15%, transparent);
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.demo-how-title {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.demo-how-desc {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.7;
}

.demo-how-connector {
  flex: 0 0 40px;
  height: 2px;
  margin-top: 20px;
  background: linear-gradient(90deg, var(--border), var(--link-text), var(--border));
  opacity: 0.5;
}

/* Demo Testimonials Section */
.demo-testimonials {
  padding: 3rem var(--content-padding);
}

.demo-testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.demo-testimonial {
  padding: 1.5rem;
  border-radius: 12px;
}

.demo-testimonial-text {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  line-height: 1.65;
  font-style: italic;
}

.demo-testimonial-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.demo-testimonial-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--title), color-mix(in oklch, var(--title) 50%, var(--surface)));
  opacity: 0.6;
}

.demo-testimonial-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.demo-testimonial-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.demo-testimonial-role {
  font-size: 0.7rem;
  opacity: 0.7;
}

/* Demo Pricing Section */
.demo-pricing {
  padding: 3rem var(--content-padding);
  text-align: center;
}

.demo-pricing-subtitle {
  margin: 0 0 2rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.demo-pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  text-align: left;
}

.demo-pricing-card {
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.demo-pricing-featured {
  border: 2px solid var(--link-text);
}

.demo-pricing-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.75rem;
  background: var(--link-text);
  color: var(--surface);
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
}

.demo-pricing-name {
  margin: 0 0 0.5rem;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.demo-pricing-price {
  margin-bottom: 1.25rem;
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.demo-pricing-amount {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.demo-pricing-period {
  font-size: 0.8rem;
}

.demo-pricing-features {
  list-style: none;
  margin: 0 0 1.5rem;
  padding: 0;
  flex: 1;
}

.demo-pricing-features li {
  padding: 0.5rem 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.demo-pricing-features li:last-child {
  border-bottom: none;
}

.demo-pricing-card button {
  width: 100%;
  padding: 0.625rem 1rem;
  font-size: 0.85rem;
}

/* Demo FAQ Section */
.demo-faq {
  padding: 3rem var(--content-padding);
}

.demo-faq-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 700px;
  margin: 0 auto;
}

.demo-faq-item {
  padding: 1rem 1.25rem;
  border-radius: 8px;
}

.demo-faq-question {
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.demo-faq-question::-webkit-details-marker {
  display: none;
}

.demo-faq-question::after {
  content: '+';
  font-size: 1.25rem;
  font-weight: 400;
  opacity: 0.5;
  transition: transform 0.2s;
}

.demo-faq-item[open] .demo-faq-question::after {
  transform: rotate(45deg);
}

.demo-faq-answer {
  margin: 1rem 0 0;
  font-size: 0.9rem;
  line-height: 1.65;
  opacity: 0.75;
}

/* Demo CTA Section */
.demo-cta {
  padding: 3rem var(--content-padding);
  text-align: center;
}

.demo-cta-title {
  margin: 0 0 0.75rem;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.demo-cta-desc {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  opacity: 0.8;
}

.demo-cta-benefits {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.demo-cta-benefit {
  font-size: 0.8rem;
}

.demo-cta-form {
  display: flex;
  gap: 0.5rem;
  max-width: 400px;
  margin: 0 auto 1rem;
  padding: 0.5rem;
  border-radius: 8px;
}

.demo-cta-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--body);
  font-size: 0.85rem;
}

.demo-cta-input::placeholder {
  color: var(--meta);
}

.demo-cta-input:focus {
  outline: none;
  border-color: var(--link-text);
}

.demo-cta-form button {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  white-space: nowrap;
}

.demo-cta-note {
  margin: 0;
  font-size: 0.7rem;
}

/* Demo Footer */
.demo-footer {
  padding: 2.5rem var(--content-padding) 1.5rem;
}

.demo-footer-main {
  display: flex;
  gap: 3rem;
  margin-bottom: 1.5rem;
}

.demo-footer-brand {
  flex: 1;
}

.demo-footer-logo {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.demo-footer-tagline {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.8;
}

.demo-footer-columns {
  display: flex;
  gap: 2rem;
}

.demo-footer-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.demo-footer-heading {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.demo-footer-link {
  font-size: 0.75rem;
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.demo-footer-link:hover {
  opacity: 1;
}

.demo-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top-width: 1px;
  border-top-style: solid;
}

.demo-footer-copyright {
  margin: 0;
  font-size: 0.7rem;
}

.demo-footer-legal {
  display: flex;
  gap: 1rem;
}

.demo-footer-legal a {
  font-size: 0.7rem;
  text-decoration: none;
  opacity: 0.7;
}

.demo-footer-legal a:hover {
  opacity: 1;
}

</style>

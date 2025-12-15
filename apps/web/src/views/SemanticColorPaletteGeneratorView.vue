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
  text-transform: uppercase;
  letter-spacing: 0.03em;
  /* color is set by .scp-meta via var(--meta) */
}

.action-button {
  padding: 0.3rem 0.5rem;
  border: 1px solid;
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

</style>

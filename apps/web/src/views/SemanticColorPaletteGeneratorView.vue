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
import type { Preset, Lut } from '../modules/Filter/Domain'
import { $Lut3D } from '../modules/Filter/Domain'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { useFilter } from '../composables/Filter/useFilter'
import FilterPanel from '../components/Filter/FilterPanel.vue'
// SemanticSection module for Demo tab
import {
  $Site,
  $Page,
  createSite,
  renderPage,
  exportToHTML,
  getDefaultContent,
  SECTION_TYPES,
  type Site,
  type Section,
  type SectionType,
  type SectionContent,
  type PageContents,
} from '../modules/SemanticSection'

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

// Sidebar popup state
type PopupType = 'brand' | 'foundation' | 'filter' | 'sections' | null
const activePopup = ref<PopupType>(null)
const popupRef = ref<HTMLDivElement | null>(null)

const openPopup = (type: PopupType) => {
  if (activePopup.value !== type) {
    selectedSectionId.value = null
  }
  activePopup.value = type
}

const closePopup = () => {
  activePopup.value = null
  selectedSectionId.value = null
}

// Close popup on escape key
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && activePopup.value) {
    closePopup()
  }
}

// Close popup on click outside
const handleClickOutside = (e: MouseEvent) => {
  if (activePopup.value && popupRef.value && !popupRef.value.contains(e.target as Node)) {
    // Check if click is on sidebar item (to allow switching between popups)
    const target = e.target as HTMLElement
    if (!target.closest('.sidebar-item')) {
      closePopup()
    }
  }
}

const sidebarItems = [
  { id: 'brand' as const, label: 'Brand Color', icon: '🎨' },
  { id: 'foundation' as const, label: 'Foundation', icon: '📄' },
  { id: 'filter' as const, label: 'Color Filter', icon: '🔮' },
  { id: 'sections' as const, label: 'Sections', icon: '📑' },
]

// ============================================================
// Filter State
// ============================================================

const FILTER_PRESETS: readonly Preset[] = getPresets()

const {
  filter,
  lut: filterLut,
  intensity,
  currentPresetId,
  applyPreset,
  setters: filterSetters,
  setMasterPoint,
  reset: resetFilter,
} = useFilter()

// Current preset name for display in list view
const currentFilterName = computed(() => {
  if (!currentPresetId.value) return 'No Filter'
  const preset = FILTER_PRESETS.find(p => p.id === currentPresetId.value)
  return preset?.name ?? 'Custom'
})

// Apply LUT to a single Oklch color (supports both 1D and 3D LUTs)
const applyLutToOklch = (color: Oklch, lut: Lut): Oklch => {
  // Convert Oklch to sRGB (0-1 range)
  const srgb = $Oklch.toSrgb(color)
  const r = Math.max(0, Math.min(1, srgb.r))
  const g = Math.max(0, Math.min(1, srgb.g))
  const b = Math.max(0, Math.min(1, srgb.b))

  let newR: number, newG: number, newB: number

  if ($Lut3D.is(lut)) {
    // 3D LUT: trilinear interpolation with channel mixing
    const [outR, outG, outB] = $Lut3D.lookup(lut, r, g, b)
    newR = outR
    newG = outG
    newB = outB
  } else {
    // 1D LUT: per-channel lookup
    const rIdx = Math.round(r * 255)
    const gIdx = Math.round(g * 255)
    const bIdx = Math.round(b * 255)
    newR = lut.r[rIdx]!
    newG = lut.g[gIdx]!
    newB = lut.b[bIdx]!
  }

  // Convert back to Oklch
  return $Oklch.fromSrgb({ r: newR, g: newG, b: newB })
}

// Apply LUT to entire PrimitivePalette (supports both 1D and 3D LUTs)
const applyLutToPalette = (palette: PrimitivePalette, lut: Lut): PrimitivePalette => {
  const result = { ...palette }

  // Apply to Neutral keys (N0-N9)
  for (const key of NEUTRAL_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }

  // Apply to Foundation keys (F0-F9)
  for (const key of FOUNDATION_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }

  // Apply to Brand keys (B, Bt, Bs, Bf)
  for (const key of BRAND_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }

  return result
}

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
// Primitive Palette Generation
// ============================================================

// Generate base PrimitivePalette from brand + foundation colors
const basePrimitivePalette = computed((): PrimitivePalette => {
  return createPrimitivePalette({
    brand: brandColor.value.oklch,
    foundation: foundationColor.value.oklch,
  })
})

// Apply filter to PrimitivePalette
const primitivePalette = computed((): PrimitivePalette => {
  return applyLutToPalette(basePrimitivePalette.value, filterLut.value)
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

  // Add global event listeners for popup
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }

  // Remove global mouse event listeners
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)

  // Remove global event listeners for popup
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousedown', handleClickOutside)
})

watch(palette, updateStyles)

// ============================================================
// Demo Tab - Section-based Page Rendering
// ============================================================

// Section type labels for display
const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  header: 'Header',
  hero: 'Hero',
  features: 'Features',
  logos: 'Logos',
  howItWorks: 'How It Works',
  testimonials: 'Testimonials',
  pricing: 'Pricing',
  faq: 'FAQ',
  cta: 'CTA',
  footer: 'Footer',
}

// Demo page sections (fixed structure for now)
const demoPage = $Page.createDemo()

// Editable contents (initialized with defaults)
const initializeContents = (): Record<string, SectionContent> => {
  const contents: Record<string, SectionContent> = {}
  for (const section of demoPage.sections) {
    contents[section.id] = getDefaultContent(section.type)
  }
  return contents
}

const siteContents = ref<Record<string, SectionContent>>(initializeContents())

// Create site from current palette + editable contents
const demoSite = computed((): Site => createSite({
  meta: {
    id: 'demo-site',
    name: 'Demo Site',
    description: 'A demo site for previewing semantic color palettes',
  },
  palette: palette.value,
  pages: [demoPage],
  contents: siteContents.value,
}))

// Selected section for detail view (null = list view)
const selectedSectionId = ref<string | null>(null)

// Get selected section info
const selectedSection = computed(() => {
  if (!selectedSectionId.value) return null
  const section = demoPage.sections.find(s => s.id === selectedSectionId.value)
  if (!section) return null
  return {
    ...section,
    label: SECTION_TYPE_LABELS[section.type],
    content: siteContents.value[section.id],
  }
})

// Navigate to section detail
const selectSection = (sectionId: string) => {
  selectedSectionId.value = sectionId
}

// Navigate back to list
const backToList = () => {
  selectedSectionId.value = null
}

// Update content for a section
const updateSectionContent = (sectionId: string, content: SectionContent) => {
  siteContents.value = {
    ...siteContents.value,
    [sectionId]: content,
  }
}

// Update a single field in section content
const updateContentField = (sectionId: string, fieldKey: string, value: string) => {
  const currentContent = siteContents.value[sectionId]
  if (!currentContent) return

  siteContents.value = {
    ...siteContents.value,
    [sectionId]: {
      ...currentContent,
      [fieldKey]: value,
    },
  }
}

// Current sections list from demo page
const currentSections = computed(() => {
  return demoPage.sections.map((section) => ({
    id: section.id,
    type: section.type,
    label: SECTION_TYPE_LABELS[section.type],
  }))
})

// Generate demo HTML
const demoHtml = computed(() => {
  const site = demoSite.value
  const page = $Site.getFirstPage(site)
  if (!page) return ''

  return renderPage(page, site.contents, site.theme, {
    includeCSS: false, // CSS is already injected via updateStyles
    wrapperClass: 'demo-page',
  })
})

// ============================================================
// Export Functions
// ============================================================

const downloadHTML = () => {
  const html = exportToHTML(demoSite.value, {
    title: 'Semantic Color Palette Demo',
    fullDocument: true,
  })

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'palette-demo.html'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="semantic-color-palette-generator" :class="{ dark: isDark }">
    <!-- Left Sidebar: List with Popup -->
    <aside class="palette-sidebar">
      <div class="sidebar-list">
        <button
          v-for="item in sidebarItems"
          :key="item.id"
          class="sidebar-item"
          :class="{ active: activePopup === item.id }"
          @click="openPopup(item.id)"
        >
          <div class="sidebar-item-main">
            <span class="sidebar-item-icon">{{ item.icon }}</span>
            <span class="sidebar-item-label">{{ item.label }}</span>
          </div>
          <div class="sidebar-item-preview">
            <template v-if="item.id === 'brand'">
              <div
                class="color-swatch-mini"
                :style="{ backgroundColor: selectedHex }"
              />
              <span class="sidebar-item-value">{{ selectedHex }}</span>
            </template>
            <template v-else-if="item.id === 'foundation'">
              <div
                class="color-swatch-mini"
                :style="{ backgroundColor: foundationColor.hex }"
              />
              <span class="sidebar-item-value">{{ selectedFoundationPreset.label }}</span>
            </template>
            <template v-else-if="item.id === 'filter'">
              <span class="sidebar-item-value">{{ currentFilterName }}</span>
            </template>
            <template v-else-if="item.id === 'sections'">
              <span class="sidebar-item-value">{{ currentSections.length }} sections</span>
            </template>
          </div>
        </button>
      </div>

      <!-- Export Button -->
      <div class="sidebar-export">
        <button class="export-button" @click="downloadHTML">
          <span class="export-icon">📥</span>
          <span class="export-label">Export HTML</span>
        </button>
      </div>

      <!-- Popup Panel -->
      <Transition name="popup">
        <div v-if="activePopup" ref="popupRef" class="sidebar-popup">
          <div class="popup-header">
            <div class="popup-breadcrumb">
              <span class="popup-breadcrumb-item" @click="activePopup === 'sections' && selectedSectionId ? backToList() : closePopup()">
                {{ activePopup === 'sections' && selectedSectionId ? 'Sections' : 'Home' }}
              </span>
              <span class="popup-breadcrumb-separator">›</span>
              <h2 class="popup-title">
                <template v-if="activePopup === 'sections' && selectedSection">
                  {{ selectedSection.label }}
                </template>
                <template v-else>
                  {{ activePopup === 'brand' ? 'Brand Color' : activePopup === 'foundation' ? 'Foundation' : activePopup === 'filter' ? 'Color Filter' : 'Sections' }}
                </template>
              </h2>
            </div>
            <button class="popup-close" @click="closePopup">×</button>
          </div>

          <!-- Brand Color Content -->
          <div v-if="activePopup === 'brand'" class="popup-content">
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
          </div>

          <!-- Foundation Color Content -->
          <div v-else-if="activePopup === 'foundation'" class="popup-content">
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
          </div>

          <!-- Filter Content -->
          <div v-else-if="activePopup === 'filter'" class="popup-content">
            <FilterPanel
              :filter="filter"
              :presets="FILTER_PRESETS"
              :current-preset-id="currentPresetId"
              :setters="filterSetters"
              :intensity="intensity"
              @apply-preset="applyPreset"
              @update:master-point="setMasterPoint"
              @update:intensity="intensity = $event"
              @reset="resetFilter"
            />
          </div>

          <!-- Sections Content -->
          <div v-else-if="activePopup === 'sections'" class="popup-content">
            <!-- List View -->
            <template v-if="!selectedSection">
              <div class="sections-list">
                <button
                  v-for="(section, index) in currentSections"
                  :key="section.id"
                  class="section-item section-item--clickable"
                  @click="selectSection(section.id)"
                >
                  <span class="section-number">{{ index + 1 }}</span>
                  <div class="section-info">
                    <span class="section-label">{{ section.label }}</span>
                    <code class="section-type">{{ section.type }}</code>
                  </div>
                  <span class="section-arrow">›</span>
                </button>
              </div>
            </template>

            <!-- Detail View -->
            <template v-else>
              <div class="section-detail">
                <div class="section-detail-header">
                  <span class="section-detail-type">{{ selectedSection.type }}</span>
                </div>

                <!-- Content Fields -->
                <div class="content-fields">
                  <template v-for="(value, key) in selectedSection.content" :key="key">
                    <!-- String field -->
                    <div v-if="typeof value === 'string'" class="content-field">
                      <label class="content-field-label">{{ key }}</label>
                      <input
                        type="text"
                        class="content-field-input"
                        :value="value"
                        @input="updateContentField(selectedSection.id, key as string, ($event.target as HTMLInputElement).value)"
                      />
                    </div>

                    <!-- Array field (show count) -->
                    <div v-else-if="Array.isArray(value)" class="content-field">
                      <label class="content-field-label">{{ key }}</label>
                      <div class="content-field-array">
                        <span class="content-field-array-count">{{ value.length }} items</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Transition>
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
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="demoHtml" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.semantic-color-palette-generator {
  display: flex;
  height: 100vh;
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
  position: relative;
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  padding: 1rem 0.75rem;
  background: oklch(0.94 0.01 260);
  border-right: 1px solid oklch(0.88 0.01 260);
  overflow: visible;
}

.dark .palette-sidebar {
  background: oklch(0.10 0.02 260);
  border-right-color: oklch(0.20 0.02 260);
}

/* Export Button */
.sidebar-export {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid oklch(0.88 0.01 260);
}

.dark .sidebar-export {
  border-top-color: oklch(0.20 0.02 260);
}

.export-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: oklch(0.55 0.18 250);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.export-button:hover {
  background: oklch(0.50 0.18 250);
}

.export-button:active {
  transform: scale(0.98);
}

.dark .export-button {
  background: oklch(0.50 0.16 250);
}

.dark .export-button:hover {
  background: oklch(0.55 0.16 250);
}

.export-icon {
  font-size: 1rem;
}

.export-label {
  flex: 1;
  text-align: left;
}

/* Sidebar Popup */
.sidebar-popup {
  position: absolute;
  top: 0;
  left: 100%;
  width: 320px;
  max-height: 100vh;
  background: oklch(0.97 0.005 260);
  border-left: 1px solid oklch(0.88 0.01 260);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
  z-index: 100;
  border-radius: 0 8px 8px 0;
}

.dark .sidebar-popup {
  background: oklch(0.14 0.02 260);
  border-left-color: oklch(0.20 0.02 260);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
  position: sticky;
  top: 0;
  background: oklch(0.97 0.005 260);
  z-index: 1;
}

.dark .popup-header {
  background: oklch(0.14 0.02 260);
  border-bottom-color: oklch(0.20 0.02 260);
}

.popup-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.popup-breadcrumb-item {
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
  cursor: pointer;
}

.popup-breadcrumb-item:hover {
  color: oklch(0.35 0.02 260);
}

.dark .popup-breadcrumb-item {
  color: oklch(0.60 0.02 260);
}

.dark .popup-breadcrumb-item:hover {
  color: oklch(0.80 0.02 260);
}

.popup-breadcrumb-separator {
  font-size: 0.75rem;
  color: oklch(0.60 0.02 260);
}

.dark .popup-breadcrumb-separator {
  color: oklch(0.50 0.02 260);
}

.popup-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

.dark .popup-title {
  color: oklch(0.90 0.01 260);
}

.popup-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: oklch(0.50 0.02 260);
  font-size: 1.25rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.popup-close:hover {
  background: oklch(0.90 0.01 260);
  color: oklch(0.30 0.02 260);
}

.dark .popup-close:hover {
  background: oklch(0.22 0.02 260);
  color: oklch(0.80 0.02 260);
}

.popup-content {
  padding: 1rem;
}

/* Sections List */
.sections-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: oklch(0.96 0.005 260);
  border-radius: 6px;
  transition: background 0.15s;
}

.dark .section-item {
  background: oklch(0.18 0.02 260);
}

.section-item:hover {
  background: oklch(0.94 0.01 260);
}

.dark .section-item:hover {
  background: oklch(0.22 0.02 260);
}

.section-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: oklch(0.90 0.01 260);
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 600;
  color: oklch(0.40 0.02 260);
  flex-shrink: 0;
}

.dark .section-number {
  background: oklch(0.28 0.02 260);
  color: oklch(0.70 0.02 260);
}

.section-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: oklch(0.25 0.02 260);
}

.dark .section-label {
  color: oklch(0.90 0.01 260);
}

.section-type {
  font-size: 0.65rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.50 0.02 260);
}

.dark .section-type {
  color: oklch(0.60 0.02 260);
}

.section-item--clickable {
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
}

.section-arrow {
  font-size: 1rem;
  color: oklch(0.60 0.02 260);
  margin-left: auto;
}

.dark .section-arrow {
  color: oklch(0.50 0.02 260);
}

/* Section Detail View */
.section-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-detail-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-detail-type {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: oklch(0.92 0.01 260);
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: oklch(0.45 0.02 260);
}

.dark .section-detail-type {
  background: oklch(0.22 0.02 260);
  color: oklch(0.65 0.02 260);
}

/* Content Fields */
.content-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.content-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.content-field-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: oklch(0.45 0.02 260);
  text-transform: capitalize;
}

.dark .content-field-label {
  color: oklch(0.65 0.02 260);
}

.content-field-input {
  padding: 0.5rem 0.625rem;
  border: 1px solid oklch(0.88 0.01 260);
  border-radius: 6px;
  background: oklch(0.99 0.005 260);
  color: oklch(0.20 0.02 260);
  font-size: 0.8rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.content-field-input:focus {
  outline: none;
  border-color: oklch(0.55 0.18 250);
  box-shadow: 0 0 0 3px oklch(0.55 0.18 250 / 0.15);
}

.dark .content-field-input {
  background: oklch(0.16 0.02 260);
  border-color: oklch(0.28 0.02 260);
  color: oklch(0.90 0.01 260);
}

.dark .content-field-input:focus {
  border-color: oklch(0.55 0.16 250);
  box-shadow: 0 0 0 3px oklch(0.55 0.16 250 / 0.2);
}

.content-field-array {
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.005 260);
  border: 1px solid oklch(0.90 0.01 260);
  border-radius: 6px;
}

.dark .content-field-array {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.26 0.02 260);
}

.content-field-array-count {
  font-size: 0.75rem;
  color: oklch(0.50 0.02 260);
}

.dark .content-field-array-count {
  color: oklch(0.60 0.02 260);
}

/* Popup Transition */
.popup-enter-active,
.popup-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.popup-enter-from,
.popup-leave-to {
  transform: translateX(-8px);
  opacity: 0;
}

/* Sidebar List View */
.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  background: oklch(0.99 0.005 260);
  border: none;
  border-radius: 0.5rem;
  color: oklch(0.25 0.02 260);
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  width: 100%;
}

.dark .sidebar-item {
  background: oklch(0.16 0.02 260);
  color: oklch(0.90 0.01 260);
}

.sidebar-item:hover {
  background: oklch(0.96 0.01 260);
}

.dark .sidebar-item:hover {
  background: oklch(0.20 0.02 260);
}

.sidebar-item.active {
  background: oklch(0.96 0.01 260);
  border-left: 3px solid oklch(0.55 0.18 250);
  padding-left: calc(0.625rem - 3px);
}

.dark .sidebar-item.active {
  background: oklch(0.20 0.02 260);
  border-left-color: oklch(0.55 0.16 250);
}

.sidebar-item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-item-icon {
  font-size: 0.875rem;
}

.sidebar-item-label {
  font-weight: 600;
  font-size: 0.7rem;
}

.sidebar-item-preview {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-left: 1.375rem;
}

.color-swatch-mini {
  width: 1rem;
  height: 1rem;
  border-radius: 0.1875rem;
  border: 1px solid rgba(128, 128, 128, 0.2);
}

.sidebar-item-value {
  font-size: 0.65rem;
  color: oklch(0.50 0.02 260);
  font-family: 'SF Mono', Monaco, monospace;
}

.dark .sidebar-item-value {
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

/* Demo Page - use :deep() for v-html content */
:deep(.demo-page) {
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

/* Demo Header */
.demo-header {
  padding: 1rem var(--content-padding);
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
  gap: 0.75rem;
}

.demo-header-actions button {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
}

/* Demo Hero Section */
.demo-hero {
  display: flex;
  align-items: center;
  gap: 4rem;
  padding: 5rem var(--content-padding);
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
  padding: 0.5rem 1rem;
  background: color-mix(in oklch, var(--link-text) 15%, transparent);
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
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
  margin: 0 0 1.5rem;
  font-size: 3.25rem;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.demo-hero-highlight {
  display: inline;
}

.demo-hero-subtitle {
  margin: 0 0 2rem;
  font-size: 1rem;
  line-height: 1.7;
  opacity: 0.75;
}

.demo-hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.demo-hero-actions button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
}

.demo-play-icon {
  font-size: 0.65rem;
}

.demo-hero-stats {
  display: flex;
  gap: 2.5rem;
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
  padding: 4rem var(--content-padding);
}

.demo-section-title {
  margin: 0 0 2.5rem;
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: -0.03em;
}

.demo-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.demo-feature-card {
  padding: 1.75rem;
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
  margin: 0 0 0.75rem;
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
  padding: 3rem var(--content-padding);
  text-align: center;
}

.demo-logos-label {
  margin: 0 0 1.5rem;
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
  padding: 4rem var(--content-padding);
}

.demo-how-steps {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
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
  margin-bottom: 1.25rem;
}

.demo-how-title {
  margin: 0 0 0.75rem;
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
  padding: 4rem var(--content-padding);
}

.demo-testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.demo-testimonial {
  padding: 2rem;
  border-radius: 12px;
}

.demo-testimonial-text {
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  line-height: 1.65;
  font-style: italic;
}

.demo-testimonial-author {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  padding: 4rem var(--content-padding);
  text-align: center;
}

.demo-pricing-subtitle {
  margin: 0 0 2.5rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.demo-pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  text-align: left;
}

.demo-pricing-card {
  padding: 2rem;
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
  margin: 0 0 0.75rem;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.demo-pricing-price {
  margin-bottom: 1.5rem;
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
  margin: 0 0 2rem;
  padding: 0;
  flex: 1;
}

.demo-pricing-features li {
  padding: 0.625rem 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.demo-pricing-features li:last-child {
  border-bottom: none;
}

.demo-pricing-card button {
  width: 100%;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
}

/* Demo FAQ Section */
.demo-faq {
  padding: 4rem var(--content-padding);
}

.demo-faq-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 700px;
  margin: 0 auto;
}

.demo-faq-item {
  padding: 1.25rem 1.5rem;
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
  padding: 4.5rem var(--content-padding);
  text-align: center;
}

.demo-cta-title {
  margin: 0 0 1rem;
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.demo-cta-desc {
  margin: 0 0 1.5rem;
  font-size: 1rem;
  opacity: 0.8;
}

.demo-cta-benefits {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.demo-cta-benefit {
  font-size: 0.8rem;
}

.demo-cta-form {
  display: flex;
  gap: 0.75rem;
  max-width: 420px;
  margin: 0 auto 1.25rem;
  padding: 0.625rem;
  border-radius: 8px;
}

.demo-cta-input {
  flex: 1;
  padding: 0.625rem 1rem;
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
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  white-space: nowrap;
}

.demo-cta-note {
  margin: 0;
  font-size: 0.7rem;
}

/* Demo Footer */
.demo-footer {
  padding: 3rem var(--content-padding) 2rem;
}

.demo-footer-main {
  display: flex;
  gap: 4rem;
  margin-bottom: 2rem;
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
  gap: 3rem;
}

.demo-footer-column {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
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
  padding-top: 1.5rem;
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

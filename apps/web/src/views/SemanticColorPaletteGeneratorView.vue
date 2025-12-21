<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import '../components/SemanticColorPaletteGenerator/demo-styles.css'
import { $Oklch } from '@practice/color'
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
  type Site,
  type SectionContent,
} from '../modules/SemanticSection'
// Child components
import BrandColorPicker from '../components/SemanticColorPaletteGenerator/BrandColorPicker.vue'
import FoundationPresets from '../components/SemanticColorPaletteGenerator/FoundationPresets.vue'
import SectionsEditor from '../components/SemanticColorPaletteGenerator/SectionsEditor.vue'
import PrimitiveTab from '../components/SemanticColorPaletteGenerator/PrimitiveTab.vue'
import PalettePreviewTab from '../components/SemanticColorPaletteGenerator/PalettePreviewTab.vue'

// ============================================================
// Brand Color State (HSV Color Picker - the "ink")
// ============================================================
const hue = ref(210)
const saturation = ref(80)
const value = ref(70)

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

// Tab state
type TabId = 'primitive' | 'palette' | 'demo'
const activeTab = ref<TabId>('primitive')

// Sidebar popup state
type PopupType = 'brand' | 'foundation' | 'filter' | 'sections' | null
const activePopup = ref<PopupType>(null)
const popupRef = ref<HTMLDivElement | null>(null)

// Foundation preset state
const selectedFoundationId = ref('white')
const foundationPresetsRef = ref<InstanceType<typeof FoundationPresets> | null>(null)

// Sections editor ref
const sectionsEditorRef = ref<InstanceType<typeof SectionsEditor> | null>(null)

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
  const srgb = $Oklch.toSrgb(color)
  const r = Math.max(0, Math.min(1, srgb.r))
  const g = Math.max(0, Math.min(1, srgb.g))
  const b = Math.max(0, Math.min(1, srgb.b))

  let newR: number, newG: number, newB: number

  if ($Lut3D.is(lut)) {
    const [outR, outG, outB] = $Lut3D.lookup(lut, r, g, b)
    newR = outR
    newG = outG
    newB = outB
  } else {
    const rIdx = Math.round(r * 255)
    const gIdx = Math.round(g * 255)
    const bIdx = Math.round(b * 255)
    newR = lut.r[rIdx]!
    newG = lut.g[gIdx]!
    newB = lut.b[bIdx]!
  }

  return $Oklch.fromSrgb({ r: newR, g: newG, b: newB })
}

// Apply LUT to entire PrimitivePalette
const applyLutToPalette = (palette: PrimitivePalette, lut: Lut): PrimitivePalette => {
  const result = { ...palette }
  for (const key of NEUTRAL_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }
  for (const key of FOUNDATION_KEYS) {
    result[key] = applyLutToOklch(palette[key], lut)
  }
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

// Foundation color from FoundationPresets component
const foundationColor = computed(() => {
  if (foundationPresetsRef.value) {
    const fc = foundationPresetsRef.value.foundationColor
    const preset = foundationPresetsRef.value.selectedPreset
    return {
      oklch: fc.oklch,
      css: fc.css,
      hex: fc.hex,
      label: preset.label,
    }
  }
  // Fallback
  const oklch: Oklch = { L: 0.955, C: 0, H: 0 }
  return {
    oklch,
    css: $Oklch.toCss(oklch),
    hex: '#f2f2f2',
    label: 'White',
  }
})

// ============================================================
// Primitive Palette Generation
// ============================================================

const basePrimitivePalette = computed((): PrimitivePalette => {
  return createPrimitivePalette({
    brand: brandColor.value.oklch,
    foundation: foundationColor.value.oklch,
  })
})

const primitivePalette = computed((): PrimitivePalette => {
  return applyLutToPalette(basePrimitivePalette.value, filterLut.value)
})

const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

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

const generatedPalette = computed(() => createSemanticFromPrimitive(primitivePalette.value))
const primitiveRefMap = computed(() => createPrimitiveRefMap(primitivePalette.value))
const palette = computed(() => generatedPalette.value)
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

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousedown', handleClickOutside)
})

watch(palette, updateStyles)

// ============================================================
// Demo Tab - Section-based Page Rendering
// ============================================================

const demoPage = $Page.createDemo()

const initializeContents = (): Record<string, SectionContent> => {
  const contents: Record<string, SectionContent> = {}
  for (const section of demoPage.sections) {
    contents[section.id] = getDefaultContent(section.type)
  }
  return contents
}

const siteContents = ref<Record<string, SectionContent>>(initializeContents())

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

const selectedSectionId = ref<string | null>(null)

const currentSections = computed(() => demoPage.sections)

const demoHtml = computed(() => {
  const site = demoSite.value
  const page = $Site.getFirstPage(site)
  if (!page) return ''
  return renderPage(page, site.contents, site.theme, {
    includeCSS: false,
    wrapperClass: 'demo-page',
  })
})

// Update content for a section
const updateSectionContent = (sectionId: string, content: SectionContent) => {
  siteContents.value = {
    ...siteContents.value,
    [sectionId]: content,
  }
}

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
              <div class="color-swatch-mini" :style="{ backgroundColor: selectedHex }" />
              <span class="sidebar-item-value">{{ selectedHex }}</span>
            </template>
            <template v-else-if="item.id === 'foundation'">
              <div class="color-swatch-mini" :style="{ backgroundColor: foundationColor.hex }" />
              <span class="sidebar-item-value">{{ foundationColor.label }}</span>
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
              <span class="popup-breadcrumb-item" @click="activePopup === 'sections' && selectedSectionId ? (sectionsEditorRef?.backToList(), selectedSectionId = null) : closePopup()">
                {{ activePopup === 'sections' && selectedSectionId ? 'Sections' : 'Home' }}
              </span>
              <span class="popup-breadcrumb-separator">›</span>
              <h2 class="popup-title">
                {{ activePopup === 'brand' ? 'Brand Color' : activePopup === 'foundation' ? 'Foundation' : activePopup === 'filter' ? 'Color Filter' : 'Sections' }}
              </h2>
            </div>
            <button class="popup-close" @click="closePopup">×</button>
          </div>

          <!-- Brand Color Content -->
          <div v-if="activePopup === 'brand'" class="popup-content">
            <BrandColorPicker
              :hue="hue"
              :saturation="saturation"
              :value="value"
              @update:hue="hue = $event"
              @update:saturation="saturation = $event"
              @update:value="value = $event"
            />
          </div>

          <!-- Foundation Color Content -->
          <div v-else-if="activePopup === 'foundation'" class="popup-content">
            <FoundationPresets
              ref="foundationPresetsRef"
              :selected-id="selectedFoundationId"
              :brand-oklch="brandColor.oklch"
              :brand-hue="hue"
              @update:selected-id="selectedFoundationId = $event"
            />
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
            <SectionsEditor
              ref="sectionsEditorRef"
              :sections="currentSections"
              :contents="siteContents"
              :selected-section-id="selectedSectionId"
              @update:selected-section-id="selectedSectionId = $event"
              @update:content="updateSectionContent"
            />
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
        <PrimitiveTab
          :brand-color="brandColor"
          :foundation-color="foundationColor"
          :primitive-palette="primitivePalette"
          :neutral-ramp-display="neutralRampDisplay"
          :foundation-ramp-display="foundationRampDisplay"
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

/* Demo Page - use :deep() for v-html content */
:deep(.demo-page) {
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import '../components/SemanticColorPaletteGenerator/demo-styles.css'
import './SemanticColorPaletteGeneratorView.css'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import {
  type PrimitivePalette,
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
  NEUTRAL_KEYS,
} from '../modules/SemanticColorPalette/Domain'
import {
  toCSSText,
  toCSSRuleSetsText,
  createPrimitivePalette,
  createSemanticFromPrimitive,
  createPrimitiveRefMap,
} from '../modules/SemanticColorPalette/Infra'
import type { Preset } from '../modules/Filter/Domain'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { useFilter } from '../composables/Filter/useFilter'
import { useDemoSite } from '../composables/SemanticColorPalette/useDemoSite'
import { hsvToRgb, rgbToHex, applyLutToPalette } from '../components/SemanticColorPaletteGenerator/utils'
// Child components
import PaletteSidebar from '../components/SemanticColorPaletteGenerator/PaletteSidebar.vue'
import PrimitiveTab from '../components/SemanticColorPaletteGenerator/PrimitiveTab.vue'
import PalettePreviewTab from '../components/SemanticColorPaletteGenerator/PalettePreviewTab.vue'

// ============================================================
// Brand Color State (HSV Color Picker - the "ink")
// ============================================================
const hue = ref(210)
const saturation = ref(80)
const value = ref(70)

// Computed color values
const selectedRgb = computed(() => hsvToRgb(hue.value, saturation.value, value.value))
const selectedHex = computed(() => rgbToHex(...selectedRgb.value))

// Tab state
type TabId = 'primitive' | 'palette' | 'demo'
const activeTab = ref<TabId>('primitive')

// Foundation preset state
const selectedFoundationId = ref('white')
const sidebarRef = ref<InstanceType<typeof PaletteSidebar> | null>(null)

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

// Foundation color from FoundationPresets component via PaletteSidebar
const foundationColor = computed(() => {
  const presetsRef = sidebarRef.value?.foundationPresetsRef
  if (presetsRef) {
    const fc = presetsRef.foundationColor
    const preset = presetsRef.selectedPreset
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
  return NEUTRAL_KEYS.map((key) => ({
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
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
})

watch(palette, updateStyles)

// ============================================================
// Demo Tab - Section-based Page Rendering
// ============================================================

const {
  siteContents,
  currentSections,
  demoHtml,
  selectedSectionId,
  updateSectionContent,
  downloadHTML,
} = useDemoSite(palette)

// Handle master point update from sidebar
const handleUpdateMasterPoint = (index: number, val: number) => {
  setMasterPoint(index, val)
}
</script>

<template>
  <div class="semantic-color-palette-generator" :class="{ dark: isDark }">
    <!-- Left Sidebar -->
    <PaletteSidebar
      ref="sidebarRef"
      :hue="hue"
      :saturation="saturation"
      :value="value"
      :selected-hex="selectedHex"
      :selected-foundation-id="selectedFoundationId"
      :foundation-label="foundationColor.label"
      :foundation-hex="foundationColor.hex"
      :brand-oklch="brandColor.oklch"
      :filter="filter"
      :filter-presets="FILTER_PRESETS"
      :current-preset-id="currentPresetId"
      :filter-setters="filterSetters"
      :intensity="intensity"
      :current-filter-name="currentFilterName"
      :sections="currentSections"
      :section-contents="siteContents"
      :selected-section-id="selectedSectionId"
      @update:hue="hue = $event"
      @update:saturation="saturation = $event"
      @update:value="value = $event"
      @update:selected-foundation-id="selectedFoundationId = $event"
      @update:intensity="intensity = $event"
      @update:selected-section-id="selectedSectionId = $event"
      @update-section-content="updateSectionContent"
      @apply-preset="applyPreset"
      @update-master-point="handleUpdateMasterPoint"
      @reset-filter="resetFilter"
      @download-h-t-m-l="downloadHTML"
    />

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

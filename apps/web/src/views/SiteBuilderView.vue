<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import '../components/SiteBuilder/demo-styles.css'
import './SiteBuilderView.css'
import { $Oklch } from '@practice/color'
import type { Oklch } from '@practice/color'
import { FOUNDATION_PRESETS } from '../components/SiteBuilder/foundationPresets'
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
import { toCSSText as toDesignTokensCSSText } from '../modules/DesignTokens/Infra'
import type { Preset } from '../modules/Filter/Domain'
import { getPresets } from '../modules/Filter/Infra/PresetRepository'
import { getTokenPresetEntries } from '../modules/DesignTokens/Infra'
import { useFilter } from '../composables/Filter/useFilter'
import { useDemoSite } from '../composables/SemanticColorPalette/useDemoSite'
import { useSiteBuilderAssets } from '../composables/SiteBuilder'
import { hsvToRgb, rgbToHex, applyLutToPalette } from '../components/SiteBuilder/utils'
// Child components
import PaletteSidebar from '../components/SiteBuilder/PaletteSidebar.vue'
import PrimitiveTab from '../components/SiteBuilder/PrimitiveTab.vue'
import PalettePreviewTab from '../components/SiteBuilder/PalettePreviewTab.vue'
import BrandGuideTab from '../components/SiteBuilder/BrandGuideTab.vue'
import AssetsTab from '../components/SiteBuilder/AssetsTab.vue'

// ============================================================
// SiteBuilder Assets (Single Source of Truth)
// ============================================================
const {
  isLoaded,
  loadInitialData,
  updateBrandGuide,
  updateSiteConfig,
  updateFilterConfig,
  updateSiteContents,
} = useSiteBuilderAssets()

// ============================================================
// Brand Color State (HSV Color Picker - the "ink")
// ============================================================
// 初期値は loadInitialData で設定される（undefined -> 実際の値）
const hue = ref<number | undefined>(undefined)
const saturation = ref<number | undefined>(undefined)
const value = ref<number | undefined>(undefined)

// Computed color values（ロード前は仮の値を使用）
const selectedRgb = computed(() => hsvToRgb(hue.value ?? 0, saturation.value ?? 0, value.value ?? 0))
const selectedHex = computed(() => rgbToHex(...selectedRgb.value))

// Tab state
type TabId = 'primitive' | 'palette' | 'demo' | 'brand-guide' | 'assets'
const activeTab = ref<TabId>('primitive')

// Brand Guide state (synced with Asset)
const brandGuideMarkdown = ref('')

// Sync Brand Guide back to Asset when changed (debounced)
let brandGuideSyncTimeout: ReturnType<typeof setTimeout> | null = null
watch(brandGuideMarkdown, (newContent) => {
  // ロード完了前は同期しない
  if (!isLoaded.value) return
  if (brandGuideSyncTimeout) clearTimeout(brandGuideSyncTimeout)
  brandGuideSyncTimeout = setTimeout(() => {
    updateBrandGuide(newContent)
  }, 500)
})

// Foundation preset state
const selectedFoundationId = ref<string | undefined>(undefined)
const sidebarRef = ref<InstanceType<typeof PaletteSidebar> | null>(null)

// ============================================================
// Design Tokens State
// ============================================================
const tokenPresets = getTokenPresetEntries()
const selectedTokensId = ref<string | undefined>(undefined)

// Sync SiteConfig back to Asset when changed (debounced)
let siteConfigSyncTimeout: ReturnType<typeof setTimeout> | null = null
const syncSiteConfig = () => {
  // ロード完了前は同期しない
  if (!isLoaded.value) return
  // undefined の値がある場合は同期しない
  if (hue.value === undefined || saturation.value === undefined || value.value === undefined) return
  if (selectedFoundationId.value === undefined || selectedTokensId.value === undefined) return

  if (siteConfigSyncTimeout) clearTimeout(siteConfigSyncTimeout)
  siteConfigSyncTimeout = setTimeout(() => {
    updateSiteConfig({
      brandHSV: {
        hue: hue.value!,
        saturation: saturation.value!,
        value: value.value!,
      },
      foundationId: selectedFoundationId.value!,
      tokensId: selectedTokensId.value!,
    })
  }, 500)
}

watch([hue, saturation, value, selectedFoundationId, selectedTokensId], syncSiteConfig)

const currentTokensPreset = computed(() =>
  tokenPresets.find((p) => p.id === selectedTokensId.value) ?? tokenPresets[0]!
)
const currentTokens = computed(() => currentTokensPreset.value.tokens)

const tabs: { id: TabId; label: string }[] = [
  { id: 'primitive', label: 'Primitive' },
  { id: 'palette', label: 'Palette Preview' },
  { id: 'demo', label: 'Demo' },
  { id: 'brand-guide', label: 'Brand Guide' },
  { id: 'assets', label: 'Assets' },
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

// Foundation color computed from selected preset ID (not dependent on FoundationPresets component)
const foundationColor = computed(() => {
  const preset = FOUNDATION_PRESETS.find((p) => p.id === selectedFoundationId.value) ?? FOUNDATION_PRESETS[0]!
  const presetHue = preset.H === 'brand' ? (hue.value ?? 0) : preset.H
  const oklch: Oklch = { L: preset.L, C: preset.C, H: presetHue }
  const srgb = $Oklch.toSrgb(oklch)
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return {
    oklch,
    css: $Oklch.toCss(oklch),
    hex: `#${toHex(srgb.r)}${toHex(srgb.g)}${toHex(srgb.b)}`,
    label: preset.label,
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
// FilterConfig 同期
// ============================================================

// Sync FilterConfig back to Asset when changed (debounced)
let filterConfigSyncTimeout: ReturnType<typeof setTimeout> | null = null
const syncFilterConfig = () => {
  // ロード完了前は同期しない
  if (!isLoaded.value) return

  if (filterConfigSyncTimeout) clearTimeout(filterConfigSyncTimeout)
  filterConfigSyncTimeout = setTimeout(() => {
    updateFilterConfig({
      filter: filter.value,
      intensity: intensity.value,
      presetId: currentPresetId.value,
    })
  }, 500)
}

watch([filter, intensity, currentPresetId], syncFilterConfig, { deep: true })

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
  const colorVariables = toCSSText(palette.value, '.site-builder')
  const tokenVariables = toDesignTokensCSSText(currentTokens.value, '.site-builder')
  const cssRuleSets = toCSSRuleSetsText()
  styleElement.textContent = `${colorVariables}\n\n${tokenVariables}\n\n${cssRuleSets}`
}

onMounted(async () => {
  // スタイル要素を先に作成
  styleElement = document.createElement('style')
  styleElement.setAttribute('data-site-builder', '')
  document.head.appendChild(styleElement)

  // Asset から初期データをロード
  const initialData = await loadInitialData()

  // SiteConfig の値を設定
  hue.value = initialData.siteConfig.brandHSV.hue
  saturation.value = initialData.siteConfig.brandHSV.saturation
  value.value = initialData.siteConfig.brandHSV.value
  selectedFoundationId.value = initialData.siteConfig.foundationId
  selectedTokensId.value = initialData.siteConfig.tokensId

  // FilterConfig の値を設定
  filter.value = initialData.filterConfig.filter
  intensity.value = initialData.filterConfig.intensity
  currentPresetId.value = initialData.filterConfig.presetId

  // BrandGuide の値を設定
  brandGuideMarkdown.value = initialData.brandGuideContent

  // SiteContents の値を設定（既存のデフォルト値とマージ）
  siteContents.value = { ...siteContents.value, ...initialData.siteContents }

  // スタイルを更新
  updateStyles()
})

onUnmounted(() => {
  if (styleElement) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
})

watch([palette, currentTokens], updateStyles)

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
} = useDemoSite({ palette, tokens: currentTokens })

// Sync SiteContents back to Asset when changed (debounced)
let siteContentsSyncTimeout: ReturnType<typeof setTimeout> | null = null
watch(siteContents, (newContents) => {
  // ロード完了前は同期しない
  if (!isLoaded.value) return

  if (siteContentsSyncTimeout) clearTimeout(siteContentsSyncTimeout)
  siteContentsSyncTimeout = setTimeout(() => {
    updateSiteContents(newContents)
  }, 500)
}, { deep: true })

// Handle master point update from sidebar
const handleUpdateMasterPoint = (index: number, val: number) => {
  setMasterPoint(index, val)
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="!isLoaded" class="site-builder-loading">
    <div class="loading-spinner" />
    <p>Loading...</p>
  </div>

  <!-- Main Content -->
  <div v-else class="site-builder" :class="{ dark: isDark }">
    <!-- Left Sidebar -->
    <PaletteSidebar
      ref="sidebarRef"
      :hue="hue ?? 0"
      :saturation="saturation ?? 0"
      :value="value ?? 0"
      :selected-hex="selectedHex"
      :selected-foundation-id="selectedFoundationId ?? ''"
      :foundation-label="foundationColor.label"
      :foundation-hex="foundationColor.hex"
      :brand-oklch="brandColor.oklch"
      :filter="filter"
      :filter-presets="FILTER_PRESETS"
      :current-preset-id="currentPresetId"
      :filter-setters="filterSetters"
      :intensity="intensity"
      :current-filter-name="currentFilterName"
      :selected-tokens-id="selectedTokensId ?? ''"
      :current-tokens-name="currentTokensPreset.name"
      :sections="currentSections"
      :section-contents="siteContents"
      :selected-section-id="selectedSectionId"
      @update:hue="hue = $event"
      @update:saturation="saturation = $event"
      @update:value="value = $event"
      @update:selected-foundation-id="selectedFoundationId = $event"
      @update:intensity="intensity = $event"
      @update:selected-tokens-id="selectedTokensId = $event"
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
        <h1>Site Builder</h1>
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

      <!-- Brand Guide Tab -->
      <div v-if="activeTab === 'brand-guide'" class="tab-content">
        <BrandGuideTab
          v-model:markdown="brandGuideMarkdown"
        />
      </div>

      <!-- Assets Tab -->
      <div v-if="activeTab === 'assets'" class="tab-content">
        <AssetsTab />
      </div>
    </main>
  </div>
</template>

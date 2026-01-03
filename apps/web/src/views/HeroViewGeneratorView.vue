<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { $Oklch } from '@practice/color'
import type { PrimitivePalette } from '../modules/SemanticColorPalette/Domain'
import {
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
import PalettePreviewTab from '../components/SiteBuilder/PalettePreviewTab.vue'
import HeroSidebar from '../components/HeroGenerator/HeroSidebar.vue'
import HeroPreview from '../components/HeroGenerator/HeroPreview.vue'
import LayerPanel, { type LayerItem, type LayerType, type SubItemType } from '../components/HeroGenerator/LayerPanel.vue'
import SurfaceSelector from '../components/HeroGenerator/SurfaceSelector.vue'
import GridPositionPicker from '../components/HeroGenerator/GridPositionPicker.vue'
import FontSelector from '../components/HeroGenerator/FontSelector.vue'
import SchemaFields from '../components/SchemaFields.vue'
import {
  VignetteFilterSchema,
  ChromaticAberrationFilterSchema,
  DotHalftoneFilterSchema,
  LineHalftoneFilterSchema,
} from '../modules/HeroScene'
import {
  useSiteColors,
  useHeroScene,
  type GridPosition,
} from '../composables/SiteBuilder'
import type { ColorPreset } from '../modules/SemanticColorPalette/Domain'
import './HeroViewGeneratorView.css'

// ============================================================
// UI Dark Mode (independent from palette)
// ============================================================
const uiDarkMode = ref(false)

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
  foundationL,
  foundationC,
  foundationH,
  foundationHueLinkedToBrand,
  foundationColor,
} = useSiteColors()

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

// Neutral ramp display
const neutralRampDisplay = computed(() => {
  return NEUTRAL_KEYS.map((key) => ({
    key,
    color: primitivePalette.value[key],
    css: $Oklch.toCss(primitivePalette.value[key]),
  }))
})

// Context surfaces
const contexts = computed(() => [
  { name: 'canvas', label: 'Canvas', className: CONTEXT_CLASS_NAMES.canvas, tokens: semanticPalette.value.context.canvas, refs: primitiveRefMap.value.context.canvas },
  { name: 'sectionNeutral', label: 'Section Neutral', className: CONTEXT_CLASS_NAMES.sectionNeutral, tokens: semanticPalette.value.context.sectionNeutral, refs: primitiveRefMap.value.context.sectionNeutral },
  { name: 'sectionTint', label: 'Section Tint', className: CONTEXT_CLASS_NAMES.sectionTint, tokens: semanticPalette.value.context.sectionTint, refs: primitiveRefMap.value.context.sectionTint },
  { name: 'sectionContrast', label: 'Section Contrast', className: CONTEXT_CLASS_NAMES.sectionContrast, tokens: semanticPalette.value.context.sectionContrast, refs: primitiveRefMap.value.context.sectionContrast },
])

// Components
const components = computed(() => [
  { name: 'card', label: 'Card', className: COMPONENT_CLASS_NAMES.card, tokens: semanticPalette.value.component.card, refs: primitiveRefMap.value.component.card },
  { name: 'cardFlat', label: 'Card Flat', className: COMPONENT_CLASS_NAMES.cardFlat, tokens: semanticPalette.value.component.cardFlat, refs: primitiveRefMap.value.component.cardFlat },
])

// Actions
const actions = computed(() => [
  { name: 'action', label: 'Action (CTA)', className: COMPONENT_CLASS_NAMES.action, tokens: semanticPalette.value.component.action },
  { name: 'actionQuiet', label: 'Action Quiet', className: COMPONENT_CLASS_NAMES.actionQuiet, tokens: semanticPalette.value.component.actionQuiet },
])

// ============================================================
// Hero Scene (WebGPU rendering with layer system)
// ============================================================
const {
  texturePatterns,
  maskPatterns,
  midgroundTexturePatterns,
  textureColor1,
  textureColor2,
  midgroundTextureColor1,
  midgroundTextureColor2,
  createMidgroundThumbnailSpec,
  selectedBackgroundIndex,
  selectedMaskIndex,
  selectedMidgroundTextureIndex,
  activeSection,
  openSection,
  initPreview,
  customBackgroundImage,
  customBackgroundFile,
  setBackgroundImage,
  clearBackgroundImage,
  loadRandomBackgroundImage,
  isLoadingRandomBackground,
  customMaskImage,
  customMaskFile,
  setMaskImage,
  clearMaskImage,
  loadRandomMaskImage,
  isLoadingRandomMask,
  // Per-layer filters
  selectedFilterLayerId,
  selectedLayerFilters,
  layerFilterConfigs,
  updateLayerFilters,
  // Custom shape/surface params
  customMaskShapeParams,
  customSurfaceParams,
  customBackgroundSurfaceParams,
  currentMaskShapeSchema,
  currentSurfaceSchema,
  currentBackgroundSurfaceSchema,
  updateMaskShapeParams,
  updateSurfaceParams,
  updateBackgroundSurfaceParams,
  // Layer operations
  addMaskLayer,
  removeLayer,
  toggleLayerVisibility,
  // Foreground
  foregroundConfig,
} = useHeroScene({ primitivePalette, isDark: uiDarkMode })

// Filter type: single selection (void, vignette, chromaticAberration, dotHalftone, lineHalftone)
type FilterType = 'void' | 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone'
const selectedFilterType = computed<FilterType>({
  get: () => {
    const filters = selectedLayerFilters.value
    if (filters?.vignette.enabled) return 'vignette'
    if (filters?.chromaticAberration.enabled) return 'chromaticAberration'
    if (filters?.dotHalftone.enabled) return 'dotHalftone'
    if (filters?.lineHalftone.enabled) return 'lineHalftone'
    return 'void'
  },
  set: (type) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateLayerFilters(layerId, {
      vignette: { enabled: type === 'vignette' },
      chromaticAberration: { enabled: type === 'chromaticAberration' },
      dotHalftone: { enabled: type === 'dotHalftone' },
      lineHalftone: { enabled: type === 'lineHalftone' },
    })
  },
})

// Current filter params for SchemaFields binding
const currentVignetteConfig = computed({
  get: () => selectedLayerFilters.value?.vignette ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateLayerFilters(layerId, { vignette: value })
  },
})

const currentChromaticConfig = computed({
  get: () => selectedLayerFilters.value?.chromaticAberration ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateLayerFilters(layerId, { chromaticAberration: value })
  },
})

const currentDotHalftoneConfig = computed({
  get: () => selectedLayerFilters.value?.dotHalftone ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateLayerFilters(layerId, { dotHalftone: value })
  },
})

const currentLineHalftoneConfig = computed({
  get: () => selectedLayerFilters.value?.lineHalftone ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateLayerFilters(layerId, { lineHalftone: value })
  },
})

// Convert texture patterns to SurfaceSelector format with createSpec
const backgroundPatterns = computed(() =>
  texturePatterns.map((p) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      p.createSpec(textureColor1.value, textureColor2.value, viewport),
  }))
)

const maskSurfacePatterns = computed(() =>
  midgroundTexturePatterns.map((p) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      createMidgroundThumbnailSpec(p, midgroundTextureColor1.value, midgroundTextureColor2.value, viewport),
  }))
)

const heroPreviewRef = ref<InstanceType<typeof HeroPreview> | null>(null)

// ============================================================
// Foreground Layout Config (from useHeroScene)
// ============================================================

const titlePosition = computed({
  get: () => foregroundConfig.value.title.position,
  set: (pos: GridPosition) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      title: { ...foregroundConfig.value.title, position: pos },
    }
  },
})

const descriptionPosition = computed({
  get: () => foregroundConfig.value.description.position,
  set: (pos: GridPosition) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      description: { ...foregroundConfig.value.description, position: pos },
    }
  },
})

const titleFont = computed({
  get: () => foregroundConfig.value.title.fontId,
  set: (fontId: string | undefined) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      title: { ...foregroundConfig.value.title, fontId },
    }
  },
})

const descriptionFont = computed({
  get: () => foregroundConfig.value.description.fontId,
  set: (fontId: string | undefined) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      description: { ...foregroundConfig.value.description, fontId },
    }
  },
})

const titleFontSize = computed({
  get: () => foregroundConfig.value.title.fontSize ?? 3,
  set: (fontSize: number) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      title: { ...foregroundConfig.value.title, fontSize },
    }
  },
})

const descriptionFontSize = computed({
  get: () => foregroundConfig.value.description.fontSize ?? 1,
  set: (fontSize: number) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      description: { ...foregroundConfig.value.description, fontSize },
    }
  },
})

const titleContent = computed({
  get: () => foregroundConfig.value.title.content,
  set: (content: string) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      title: { ...foregroundConfig.value.title, content },
    }
  },
})

const descriptionContent = computed({
  get: () => foregroundConfig.value.description.content,
  set: (content: string) => {
    foregroundConfig.value = {
      ...foregroundConfig.value,
      description: { ...foregroundConfig.value.description, content },
    }
  },
})

// ============================================================
// Dynamic CSS Injection for Palette Preview
// ============================================================
let paletteStyleElement: HTMLStyleElement | null = null

const updatePaletteStyles = () => {
  if (!paletteStyleElement) return
  const colorVariables = toCSSText(semanticPalette.value, '.hero-palette-preview')
  const cssRuleSets = toCSSRuleSetsText()
  paletteStyleElement.textContent = `${colorVariables}\n\n${cssRuleSets}`
}

watch(semanticPalette, updatePaletteStyles)

onMounted(async () => {
  // Palette用スタイル要素を作成
  paletteStyleElement = document.createElement('style')
  paletteStyleElement.setAttribute('data-hero-palette', '')
  document.head.appendChild(paletteStyleElement)
  updatePaletteStyles()

  // テクスチャプレビュー用キャンバス初期化 (HeroPreviewのcanvasを使用)
  await initPreview(heroPreviewRef.value?.canvasRef)
})

onUnmounted(() => {
  if (paletteStyleElement) {
    document.head.removeChild(paletteStyleElement)
    paletteStyleElement = null
  }
})

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
  foundationL.value = preset.foundation.L
  foundationC.value = preset.foundation.C
  foundationH.value = preset.foundation.H
  foundationHueLinkedToBrand.value = false
}

// ============================================================
// Tab State
// ============================================================
type TabId = 'generator' | 'palette'
const activeTab = ref<TabId>('generator')

// ============================================================
// Layer Management (for Right Panel)
// ============================================================
const layers = ref<LayerItem[]>([
  { id: 'base', type: 'base', name: 'Background', visible: true, expanded: true },
  { id: 'mask-1', type: 'mask', name: 'Mask Layer', visible: true, expanded: false },
])

const mapLayerIdToSceneLayerId = (uiLayerId: string): string => {
  if (uiLayerId === 'base') return 'base-layer'
  if (uiLayerId.startsWith('mask')) return 'mask-layer'
  return uiLayerId
}

const handleToggleVisibility = (layerId: string) => {
  const layer = layers.value.find(l => l.id === layerId)
  if (layer) {
    layer.visible = !layer.visible
    toggleLayerVisibility(mapLayerIdToSceneLayerId(layerId))
  }
}

const handleSelectSubItem = (layerId: string, subItemType: SubItemType) => {
  const layer = layers.value.find(l => l.id === layerId)
  if (!layer) return

  if (layer.type === 'base') {
    if (subItemType === 'surface') {
      openSection('background')
    } else if (subItemType === 'filter') {
      selectedFilterLayerId.value = mapLayerIdToSceneLayerId(layerId)
      openSection('filter')
    }
  } else if (layer.type === 'mask') {
    if (subItemType === 'surface') {
      openSection('mask-surface')
    } else if (subItemType === 'shape') {
      openSection('mask-shape')
    } else if (subItemType === 'filter') {
      selectedFilterLayerId.value = mapLayerIdToSceneLayerId(layerId)
      openSection('filter')
    }
  }
}

const handleAddLayer = (type: LayerType) => {
  const id = `${type}-${Date.now()}`
  const names: Record<LayerType, string> = {
    base: 'Background',
    mask: 'Mask Layer',
    object: 'Object',
    text: 'Text Layer',
  }
  layers.value.push({
    id,
    type,
    name: names[type],
    visible: true,
    expanded: true,
  })
  if (type === 'mask') addMaskLayer()
}

const handleRemoveLayer = (layerId: string) => {
  const index = layers.value.findIndex(l => l.id === layerId)
  const layer = index > -1 ? layers.value[index] : undefined
  if (layer && layer.type !== 'base') {
    layers.value.splice(index, 1)
    removeLayer(mapLayerIdToSceneLayerId(layerId))
  }
}
</script>

<template>
  <div class="hero-generator" :class="{ dark: uiDarkMode }">
    <!-- 左パネル: カラー設定 & セクション一覧 -->
    <HeroSidebar
      :active-tab="activeTab"
      :hue="hue"
      :saturation="saturation"
      :value="value"
      :selected-hex="selectedHex"
      :brand-oklch="brandColor.oklch"
      :accent-hue="accentHue"
      :accent-saturation="accentSaturation"
      :accent-value="accentValue"
      :accent-hex="accentHex"
      :foundation-l="foundationL"
      :foundation-c="foundationC"
      :foundation-h="foundationH"
      :foundation-hue-linked-to-brand="foundationHueLinkedToBrand"
      :foundation-hex="foundationColor.hex"
      :neutral-ramp-display="neutralRampDisplay"
      @update:hue="hue = $event"
      @update:saturation="saturation = $event"
      @update:value="value = $event"
      @update:accent-hue="accentHue = $event"
      @update:accent-saturation="accentSaturation = $event"
      @update:accent-value="accentValue = $event"
      @update:foundation-l="foundationL = $event"
      @update:foundation-c="foundationC = $event"
      @update:foundation-h="foundationH = $event"
      @update:foundation-hue-linked-to-brand="foundationHueLinkedToBrand = $event"
      @apply-color-preset="handleApplyColorPreset"
    />

    <!-- サブパネル: パターン選択 (Generator タブのみ, 右パネルに沿って表示) -->
    <Transition name="subpanel-right">
      <aside v-if="activeSection && activeTab === 'generator'" class="hero-subpanel subpanel-right">
      <div class="hero-subpanel-header">
        <h2>{{
          activeSection === 'background' ? 'テクスチャ選択' :
          activeSection === 'mask-surface' ? 'マスクテクスチャ' :
          activeSection === 'mask-shape' ? 'マスク形状' :
          activeSection === 'filter' ? 'フィルター設定' :
          activeSection === 'foreground-title' ? 'タイトル位置' :
          activeSection === 'foreground-description' ? '説明文位置' :
          ''
        }}</h2>
        <button class="hero-subpanel-close" @click="activeSection = null">×</button>
      </div>

      <div class="hero-subpanel-content">
        <!-- 後景: テクスチャ選択 -->
        <template v-if="activeSection === 'background'">
          <!-- Background surface params (shown when non-solid pattern is selected) -->
          <div v-if="currentBackgroundSurfaceSchema && customBackgroundSurfaceParams && customBackgroundSurfaceParams.type !== 'solid'" class="surface-params">
            <SchemaFields
              :schema="currentBackgroundSurfaceSchema"
              :model-value="customBackgroundSurfaceParams"
              @update:model-value="updateBackgroundSurfaceParams($event)"
            />
          </div>
          <SurfaceSelector
            :custom-image="customBackgroundImage"
            :custom-file-name="customBackgroundFile?.name ?? null"
            :patterns="backgroundPatterns"
            :selected-index="selectedBackgroundIndex"
            :show-random-button="true"
            :is-loading-random="isLoadingRandomBackground"
            @upload-image="setBackgroundImage"
            @clear-image="clearBackgroundImage"
            @select-pattern="(i) => { if (i !== null) selectedBackgroundIndex = i }"
            @load-random="loadRandomBackgroundImage()"
          />
        </template>

        <!-- マスク形状選択 -->
        <template v-else-if="activeSection === 'mask-shape'">
          <!-- Shape params (shown when mask is selected) -->
          <div v-if="currentMaskShapeSchema && customMaskShapeParams" class="shape-params">
            <SchemaFields
              :schema="currentMaskShapeSchema"
              :model-value="customMaskShapeParams"
              :exclude="['cutout']"
              @update:model-value="updateMaskShapeParams($event)"
            />
          </div>
          <div class="pattern-grid">
            <button
              v-for="(pattern, i) in maskPatterns"
              :key="i"
              class="pattern-button"
              :class="{ active: selectedMaskIndex === i }"
              @click="selectedMaskIndex = i"
            >
              <canvas data-thumbnail-canvas class="pattern-canvas" />
              <span class="pattern-label">{{ pattern.label }}</span>
            </button>
          </div>
        </template>

        <!-- マスクテクスチャ選択 -->
        <template v-else-if="activeSection === 'mask-surface'">
          <!-- Surface params (shown when texture is selected) -->
          <div v-if="currentSurfaceSchema && customSurfaceParams" class="surface-params">
            <SchemaFields
              :schema="currentSurfaceSchema"
              :model-value="customSurfaceParams"
              @update:model-value="updateSurfaceParams($event)"
            />
          </div>
          <SurfaceSelector
            :custom-image="customMaskImage"
            :custom-file-name="customMaskFile?.name ?? null"
            :patterns="maskSurfacePatterns"
            :selected-index="selectedMidgroundTextureIndex"
            :show-solid-option="true"
            :show-random-button="true"
            :is-loading-random="isLoadingRandomMask"
            @upload-image="setMaskImage"
            @clear-image="clearMaskImage"
            @select-pattern="(i) => { selectedMidgroundTextureIndex = i }"
            @load-random="loadRandomMaskImage()"
          />
        </template>

        <!-- 前景: Title 設定 -->
        <template v-else-if="activeSection === 'foreground-title'">
          <div class="foreground-section">
            <div class="foreground-field">
              <label class="foreground-label">Text</label>
              <input
                v-model="titleContent"
                type="text"
                class="foreground-input"
                placeholder="Enter title text"
              />
            </div>
            <GridPositionPicker
              v-model="titlePosition"
              label="Position"
            />
            <FontSelector
              v-model="titleFont"
              label="Font"
            />
            <div class="foreground-field">
              <label class="foreground-label">Font Size</label>
              <div class="font-size-control">
                <input
                  v-model.number="titleFontSize"
                  type="range"
                  min="1"
                  max="6"
                  step="0.25"
                  class="font-size-slider"
                />
                <span class="font-size-value">{{ titleFontSize }}rem</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 前景: Description 設定 -->
        <template v-else-if="activeSection === 'foreground-description'">
          <div class="foreground-section">
            <div class="foreground-field">
              <label class="foreground-label">Text</label>
              <textarea
                v-model="descriptionContent"
                class="foreground-textarea"
                placeholder="Enter description text"
                rows="3"
              />
            </div>
            <GridPositionPicker
              v-model="descriptionPosition"
              label="Position"
            />
            <FontSelector
              v-model="descriptionFont"
              label="Font"
            />
            <div class="foreground-field">
              <label class="foreground-label">Font Size</label>
              <div class="font-size-control">
                <input
                  v-model.number="descriptionFontSize"
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.125"
                  class="font-size-slider"
                />
                <span class="font-size-value">{{ descriptionFontSize }}rem</span>
              </div>
            </div>
          </div>
        </template>

        <!-- フィルター設定 (排他選択) -->
        <template v-else-if="activeSection === 'filter'">
          <div class="filter-section">
            <!-- Filter params (shown when filter is active) -->
            <div v-if="selectedFilterType === 'vignette'" class="filter-params">
              <SchemaFields
                :schema="VignetteFilterSchema"
                :model-value="currentVignetteConfig"
                :exclude="['enabled']"
                @update:model-value="currentVignetteConfig = $event"
              />
            </div>
            <div v-else-if="selectedFilterType === 'chromaticAberration'" class="filter-params">
              <SchemaFields
                :schema="ChromaticAberrationFilterSchema"
                :model-value="currentChromaticConfig"
                :exclude="['enabled']"
                @update:model-value="currentChromaticConfig = $event"
              />
            </div>
            <div v-else-if="selectedFilterType === 'dotHalftone'" class="filter-params">
              <SchemaFields
                :schema="DotHalftoneFilterSchema"
                :model-value="currentDotHalftoneConfig"
                :exclude="['enabled']"
                @update:model-value="currentDotHalftoneConfig = $event"
              />
            </div>
            <div v-else-if="selectedFilterType === 'lineHalftone'" class="filter-params">
              <SchemaFields
                :schema="LineHalftoneFilterSchema"
                :model-value="currentLineHalftoneConfig"
                :exclude="['enabled']"
                @update:model-value="currentLineHalftoneConfig = $event"
              />
            </div>

            <!-- Filter type selection -->
            <div class="filter-options">
              <label class="filter-option" :class="{ active: selectedFilterType === 'void' }">
                <input type="radio" v-model="selectedFilterType" value="void" />
                <span class="filter-name">None</span>
              </label>
              <label class="filter-option" :class="{ active: selectedFilterType === 'vignette' }">
                <input type="radio" v-model="selectedFilterType" value="vignette" />
                <span class="filter-name">Vignette</span>
              </label>
              <label class="filter-option" :class="{ active: selectedFilterType === 'chromaticAberration' }">
                <input type="radio" v-model="selectedFilterType" value="chromaticAberration" />
                <span class="filter-name">Chromatic Aberration</span>
              </label>
              <label class="filter-option" :class="{ active: selectedFilterType === 'dotHalftone' }">
                <input type="radio" v-model="selectedFilterType" value="dotHalftone" />
                <span class="filter-name">Dot Halftone</span>
              </label>
              <label class="filter-option" :class="{ active: selectedFilterType === 'lineHalftone' }">
                <input type="radio" v-model="selectedFilterType" value="lineHalftone" />
                <span class="filter-name">Line Halftone</span>
              </label>
            </div>
          </div>
        </template>

      </div>
      </aside>
    </Transition>

    <!-- 中央: メインコンテンツ -->
    <main class="hero-main">
      <!-- ヘッダー -->
      <header class="hero-header">
        <h1>Hero View Generator</h1>
        <nav class="hero-tab-nav">
          <button
            class="hero-tab-button"
            :class="{ active: activeTab === 'generator' }"
            @click="activeTab = 'generator'"
          >Generator</button>
          <button
            class="hero-tab-button"
            :class="{ active: activeTab === 'palette' }"
            @click="activeTab = 'palette'"
          >Palette</button>
        </nav>
      </header>

      <!-- Generator タブ: プレビュー -->
      <HeroPreview
        v-if="activeTab === 'generator'"
        ref="heroPreviewRef"
        :foreground-config="foregroundConfig"
        class="hero-tab-content"
      />

      <!-- Palette タブ: Semantic Palette プレビュー -->
      <div v-if="activeTab === 'palette'" class="hero-tab-content hero-palette-container hero-palette-preview" :class="{ dark: uiDarkMode }">
        <PalettePreviewTab
          :contexts="contexts"
          :components="components"
          :actions="actions"
        />
      </div>
    </main>

    <!-- 右パネル: Canvas/HTML レイヤー -->
    <aside v-if="activeTab === 'generator'" class="hero-right-panel">
      <LayerPanel
        :layers="layers"
        :layer-filter-configs="layerFilterConfigs"
        @toggle-visibility="handleToggleVisibility"
        @select-subitem="handleSelectSubItem"
        @add-layer="handleAddLayer"
        @remove-layer="handleRemoveLayer"
        @open-foreground-title="openSection('foreground-title')"
        @open-foreground-description="openSection('foreground-description')"
      />
    </aside>
  </div>
</template>

<style scoped>
/* Pattern Grid */
.pattern-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pattern-button {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 2px solid oklch(0.85 0.01 260);
  border-radius: 0.5rem;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dark .pattern-button {
  border-color: oklch(0.30 0.02 260);
}

.pattern-button:hover {
  border-color: oklch(0.75 0.01 260);
}

.dark .pattern-button:hover {
  border-color: oklch(0.40 0.02 260);
}

.pattern-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.1);
}

.pattern-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.pattern-none {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: oklch(0.92 0.01 260);
  color: oklch(0.50 0.02 260);
  font-size: 0.875rem;
}

.dark .pattern-none {
  background: oklch(0.22 0.02 260);
  color: oklch(0.60 0.02 260);
}

.pattern-label {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.40 0.02 260);
  text-align: left;
}

.dark .pattern-label {
  color: oklch(0.70 0.02 260);
}

/* Empty State */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: oklch(0.50 0.02 260);
}

/* Layout Grid */
.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.layout-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.625rem 0.5rem;
  border: 2px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.40 0.02 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dark .layout-button {
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.70 0.02 260);
}

.layout-button:hover {
  border-color: oklch(0.75 0.01 260);
  background: oklch(0.92 0.01 260);
}

.dark .layout-button:hover {
  border-color: oklch(0.40 0.02 260);
  background: oklch(0.20 0.02 260);
}

.layout-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.15);
  color: oklch(0.25 0.02 260);
}

.dark .layout-button.active {
  color: oklch(0.90 0.02 260);
}

.layout-icon {
  font-size: 1.25rem;
}

.layout-label {
  font-size: 0.625rem;
  font-weight: 500;
}

/* Texture Grid */
.texture-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.texture-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem;
  border: 2px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.40 0.02 260);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dark .texture-button {
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.70 0.02 260);
}

.texture-button:hover {
  border-color: oklch(0.75 0.01 260);
  background: oklch(0.92 0.01 260);
}

.dark .texture-button:hover {
  border-color: oklch(0.40 0.02 260);
  background: oklch(0.20 0.02 260);
}

.texture-button.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.15);
  color: oklch(0.25 0.02 260);
}

.dark .texture-button.active {
  color: oklch(0.90 0.02 260);
}

.texture-icon {
  font-size: 1rem;
}

.texture-label {
  font-size: 0.5rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

/* Filter Section */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: oklch(0.92 0.01 260);
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dark .filter-option {
  background: oklch(0.20 0.02 260);
}

.filter-option:hover {
  background: oklch(0.88 0.01 260);
}

.dark .filter-option:hover {
  background: oklch(0.24 0.02 260);
}

.filter-option.active {
  border-color: oklch(0.55 0.20 250);
  background: oklch(0.55 0.20 250 / 0.15);
}

.filter-option input[type="radio"] {
  width: 1rem;
  height: 1rem;
  accent-color: oklch(0.55 0.20 250);
}

.filter-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: oklch(0.25 0.02 260);
}

.dark .filter-name {
  color: oklch(0.85 0.02 260);
}

.filter-params {
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.dark .filter-params {
  background: oklch(0.18 0.02 260);
}

.shape-params,
.surface-params {
  padding: 0.75rem;
  background: oklch(0.94 0.01 260);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}

.dark .shape-params,
.dark .surface-params {
  background: oklch(0.18 0.02 260);
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Foreground Section */
.foreground-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.foreground-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.foreground-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.40 0.02 260);
}

.dark .foreground-label {
  color: oklch(0.70 0.02 260);
}

.foreground-input,
.foreground-textarea {
  padding: 0.625rem 0.75rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.25 0.02 260);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.15s;
}

.dark .foreground-input,
.dark .foreground-textarea {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.foreground-input:focus,
.foreground-textarea:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

.foreground-textarea {
  resize: vertical;
  min-height: 4rem;
}

.font-size-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.font-size-slider {
  flex: 1;
  height: 4px;
  appearance: none;
  background: oklch(0.85 0.01 260);
  border-radius: 2px;
  cursor: pointer;
}

.dark .font-size-slider {
  background: oklch(0.30 0.02 260);
}

.font-size-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

.font-size-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.font-size-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.font-size-value {
  min-width: 4rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: oklch(0.40 0.02 260);
  text-align: right;
}

.dark .font-size-value {
  color: oklch(0.70 0.02 260);
}

</style>

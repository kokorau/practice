<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
} from '../modules/SemanticColorPalette/Infra'
import PalettePreviewTab from '../components/SiteBuilder/PalettePreviewTab.vue'
import HeroSidebar from '../components/HeroGenerator/HeroSidebar.vue'
import HeroPreview from '../components/HeroGenerator/HeroPreview.vue'
import type { HeroPrimitiveKey } from '../modules/HeroScene'
import {
  createGroup,
  createSurfaceLayer,
  createEffectModifier,
  createMaskModifier,
} from '../modules/HeroScene'
import FloatingPanel from '../components/HeroGenerator/FloatingPanel.vue'
import FontSelector from '../components/HeroGenerator/FontSelector.vue'
import {
  BackgroundSectionPanel,
  ClipGroupShapePanel,
  ClipGroupSurfacePanel,
  EffectSectionPanel,
  TextLayerSectionPanel,
} from '../components/HeroGenerator/FloatingPanelContent'
import {
  useSiteColors,
  useHeroScene,
  createSurfacePatterns,
} from '../composables/SiteBuilder'
import { getSurfacePresets } from '@practice/texture'
import type { ColorPreset } from '../modules/SemanticColorPalette/Domain'
import { useContrastChecker } from '../composables/useContrastChecker'
import { useLayerSelection } from '../composables/useLayerSelection'
import { useLayerOperations } from '../composables/useLayerOperations'
import { useTextLayerEditor } from '../composables/useTextLayerEditor'
import { useFilterEditor } from '../composables/useFilterEditor'
import { useForegroundElement } from '../composables/useForegroundElement'
import { useContextMenu } from '../composables/useContextMenu'
import { usePaletteStyles } from '../composables/usePaletteStyles'
import { RightPropertyPanel } from '../components/HeroGenerator/RightPropertyPanel'
import ContextMenu from '../components/HeroGenerator/ContextMenu.vue'
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
  foundationHue,
  foundationSaturation,
  foundationValue,
  foundationHex,
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
  maskInnerColor,
  maskOuterColor,
  createMidgroundThumbnailSpec,
  createBackgroundThumbnailSpec,
  selectedBackgroundIndex,
  selectedMaskIndex,
  selectedMidgroundTextureIndex,
  activeSection,
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
  // Filter Usecase API
  selectFilterType: selectFilterTypeUsecase,
  getFilterType: getFilterTypeUsecase,
  updateVignetteParams,
  updateChromaticAberrationParams,
  updateDotHalftoneParams,
  updateLineHalftoneParams,
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
  addMaskLayer: sceneAddMaskLayer,
  addTextLayer: sceneAddTextLayer,
  addObjectLayer: sceneAddObjectLayer,
  removeLayer: sceneRemoveLayer,
  toggleLayerVisibility,
  updateTextLayerConfig: heroUpdateTextLayerConfig,
  // Editor state (for text layer editing)
  editorState,
  // Foreground
  foregroundConfig,
  foregroundTitleColor,
  foregroundBodyColor,
  foregroundElementColors,
  foregroundTitleAutoKey,
  foregroundBodyAutoKey,
  // Canvas ImageData for contrast analysis
  canvasImageData,
  setElementBounds,
  // PrimitiveKey color selection
  backgroundColorKey1,
  backgroundColorKey2,
  maskColorKey1,
  maskColorKey2,
  // Presets
  presets,
  selectedPresetId,
  loadPresets,
  applyPreset,
  // Serialization
  toHeroViewConfig,
} = useHeroScene({ primitivePalette, isDark: uiDarkMode })

// ============================================================
// Filter Editor (Composable)
// ============================================================
const {
  selectedFilterType,
  currentVignetteConfig,
  currentChromaticConfig,
  currentDotHalftoneConfig,
  currentLineHalftoneConfig,
} = useFilterEditor({
  selectedFilterLayerId,
  selectedLayerFilters,
  getFilterType: getFilterTypeUsecase,
  selectFilterType: selectFilterTypeUsecase,
  updateVignetteParams,
  updateChromaticAberrationParams,
  updateDotHalftoneParams,
  updateLineHalftoneParams,
})

// Get surface presets for surfaceConfig mapping
const surfacePresets = getSurfacePresets()

// Convert texture patterns to SurfaceSelector format with createSpec and surfaceConfig
const backgroundPatterns = createSurfacePatterns({
  patterns: texturePatterns,
  color1: textureColor1,
  color2: textureColor2,
  createSpec: (p, c1, c2, viewport) => p.createSpec(c1, c2, viewport),
  surfacePresets,
})

const maskSurfacePatterns = createSurfacePatterns({
  patterns: midgroundTexturePatterns,
  color1: midgroundTextureColor1,
  color2: midgroundTextureColor2,
  createSpec: createMidgroundThumbnailSpec,
  surfacePresets,
})

const heroPreviewRef = ref<InstanceType<typeof HeroPreview> | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)

// Subpanel title
const sectionTitle = computed(() => {
  switch (activeSection.value) {
    case 'background':
      return 'テクスチャ選択'
    case 'clip-group-surface':
      return 'クリップグループテクスチャ'
    case 'clip-group-shape':
      return 'クリップグループ形状'
    case 'filter':
    case 'effect':
      return 'エフェクト設定'
    case 'text-content':
      return 'テキスト設定'
    default:
      return ''
  }
})

// ============================================================
// Text Layer Editing
// ============================================================
const {
  selectedTextLayerConfig,
  updateTextLayerConfig,
} = useTextLayerEditor({
  editorState,
  onUpdateConfig: heroUpdateTextLayerConfig,
})

const closeSection = () => {
  activeSection.value = null
}

// ============================================================
// Dynamic CSS Injection for Palette Preview
// ============================================================
usePaletteStyles(semanticPalette)

onMounted(async () => {
  // Load layout presets and apply initial preset (including colors)
  const initialColorPreset = await loadPresets()
  if (initialColorPreset) {
    hue.value = initialColorPreset.brand.hue
    saturation.value = initialColorPreset.brand.saturation
    value.value = initialColorPreset.brand.value
    accentHue.value = initialColorPreset.accent.hue
    accentSaturation.value = initialColorPreset.accent.saturation
    accentValue.value = initialColorPreset.accent.value
    foundationHue.value = initialColorPreset.foundation.hue
    foundationSaturation.value = initialColorPreset.foundation.saturation
    foundationValue.value = initialColorPreset.foundation.value
  }

  // テクスチャプレビュー用キャンバス初期化 (HeroPreviewのcanvasを使用)
  await initPreview(heroPreviewRef.value?.canvasRef)
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
  foundationHue.value = preset.foundation.hue
  foundationSaturation.value = preset.foundation.saturation
  foundationValue.value = preset.foundation.value
}

// Handle layout preset application (also applies color preset if available)
const handleApplyLayoutPreset = async (presetId: string) => {
  const colorPreset = await applyPreset(presetId)
  if (colorPreset) {
    // Apply brand
    hue.value = colorPreset.brand.hue
    saturation.value = colorPreset.brand.saturation
    value.value = colorPreset.brand.value
    // Apply accent
    accentHue.value = colorPreset.accent.hue
    accentSaturation.value = colorPreset.accent.saturation
    accentValue.value = colorPreset.accent.value
    // Apply foundation
    foundationHue.value = colorPreset.foundation.hue
    foundationSaturation.value = colorPreset.foundation.saturation
    foundationValue.value = colorPreset.foundation.value
  }
}

// ============================================================
// Export Preset
// ============================================================
const exportPreset = () => {
  // Build preset with current config and colors
  const preset = {
    id: `custom-${Date.now()}`,
    name: 'Custom Preset',
    config: toHeroViewConfig(),
    colorPreset: {
      brand: {
        hue: hue.value,
        saturation: saturation.value,
        value: value.value,
      },
      accent: {
        hue: accentHue.value,
        saturation: accentSaturation.value,
        value: accentValue.value,
      },
      foundation: {
        hue: foundationHue.value,
        saturation: foundationSaturation.value,
        value: foundationValue.value,
      },
    },
  }

  // Download as JSON
  const json = JSON.stringify(preset, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hero-preset-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============================================================
// Hero Preview Config (for panel previews)
// ============================================================
const currentHeroConfig = computed(() => toHeroViewConfig())

// ============================================================
// Tab State
// ============================================================
type TabId = 'generator' | 'palette'
const activeTab = ref<TabId>('generator')

// ============================================================
// Layer Selection (from Store)
// ============================================================
const {
  layerId: selectedLayerId,
  processorType: selectedProcessorType,
  selectCanvasLayer,
  selectProcessor,
  clearSelection,
} = useLayerSelection()

// ============================================================
// Foreground Element (Composable)
// ============================================================
const {
  selectedForegroundElementId,
  selectedForegroundElement,
  handleSelectForegroundElement,
  handleAddForegroundElement,
  handleRemoveForegroundElement,
  selectedElementPosition,
  selectedElementFont,
  selectedElementFontSize,
  selectedElementContent,
  selectedElementColorKey,
  isFontPanelOpen,
  selectedFontPreset,
  selectedFontDisplayName,
  openFontPanel,
  closeFontPanel,
} = useForegroundElement({
  foregroundConfig,
  clearCanvasSelection: clearSelection,
})

// ============================================================
// Layer Operations (Composable)
// ============================================================
const {
  layers,
  selectedLayer,
  selectedLayerVariant,
  handleSelectLayer,
  handleToggleExpand,
  handleToggleVisibility,
  handleSelectProcessor,
  handleMoveLayer,
  handleAddLayer,
  handleRemoveLayer,
  handleGroupSelection,
  handleUseAsMask,
} = useLayerOperations({
  initialLayers: [
    createGroup(
      'background-group',
      [
        createSurfaceLayer(
          'background-surface',
          { type: 'solid', color: 'BN1' },
          {
            name: 'Surface',
            modifiers: [createEffectModifier()],
          },
        ),
      ],
      { name: 'Background', expanded: true },
    ),
    createGroup(
      'main-group',
      [
        createSurfaceLayer(
          'surface-1',
          { type: 'solid', color: 'B' },
          {
            name: 'Surface',
            modifiers: [createEffectModifier(), createMaskModifier()],
          },
        ),
      ],
      { name: 'Main Group', expanded: true },
    ),
  ],
  selectedLayerId,
  sceneCallbacks: {
    addMaskLayer: sceneAddMaskLayer,
    addTextLayer: sceneAddTextLayer,
    addObjectLayer: sceneAddObjectLayer,
    removeLayer: sceneRemoveLayer,
    toggleLayerVisibility: toggleLayerVisibility,
  },
  onSelectLayer: (id) => {
    selectCanvasLayer(id)
    selectedForegroundElementId.value = null
  },
  onSelectProcessor: (layerId, type) => {
    selectProcessor(layerId, type)
    selectedForegroundElementId.value = null
    if (type === 'effect') {
      const layer = selectedLayer.value
      if (layer && 'variant' in layer) {
        selectedFilterLayerId.value = layer.id
      }
    }
  },
  onClearSelection: () => selectCanvasLayer(''),
})

// ============================================================
// APCA Contrast Check
// ============================================================
const { titleContrastResult, descriptionContrastResult } = useContrastChecker({
  canvasImageData,
  heroPreviewRef,
  foregroundTitleColor,
  foregroundBodyColor,
  setElementBounds,
  watchDependencies: [selectedElementPosition, selectedElementFontSize],
})

// ============================================================
// Context Menu
// ============================================================
const {
  contextMenuOpen,
  contextMenuPosition,
  contextMenuItems,
  handleLayerContextMenu,
  handleForegroundContextMenu,
  handleContextMenuClose,
  handleContextMenuSelect,
  handleGlobalContextMenu,
} = useContextMenu(layers, {
  handleGroupSelection,
  handleUseAsMask,
  handleToggleVisibility,
  handleRemoveLayer,
  handleRemoveForegroundElement,
})
</script>

<template>
  <div class="hero-generator" :class="{ dark: uiDarkMode }" @contextmenu="handleGlobalContextMenu">
    <!-- 左パネル: カラー設定 & レイヤー -->
    <HeroSidebar
      :active-tab="activeTab"
      :hue="hue"
      :saturation="saturation"
      :value="value"
      :selected-hex="selectedHex"
      :accent-hue="accentHue"
      :accent-saturation="accentSaturation"
      :accent-value="accentValue"
      :accent-hex="accentHex"
      :foundation-hue="foundationHue"
      :foundation-saturation="foundationSaturation"
      :foundation-value="foundationValue"
      :foundation-hex="foundationHex"
      :neutral-ramp-display="neutralRampDisplay"
      :presets="presets"
      :selected-preset-id="selectedPresetId"
      :layers="layers"
      :foreground-elements="foregroundConfig.elements"
      :selected-foreground-element-id="selectedForegroundElementId"
      @update:hue="hue = $event"
      @update:saturation="saturation = $event"
      @update:value="value = $event"
      @update:accent-hue="accentHue = $event"
      @update:accent-saturation="accentSaturation = $event"
      @update:accent-value="accentValue = $event"
      @update:foundation-hue="foundationHue = $event"
      @update:foundation-saturation="foundationSaturation = $event"
      @update:foundation-value="foundationValue = $event"
      @apply-color-preset="handleApplyColorPreset"
      @apply-layout-preset="handleApplyLayoutPreset"
      @select-layer="handleSelectLayer"
      @toggle-expand="handleToggleExpand"
      @toggle-visibility="handleToggleVisibility"
      @select-processor="handleSelectProcessor"
      @add-layer="handleAddLayer"
      @remove-layer="handleRemoveLayer"
      @move-layer="handleMoveLayer"
      @layer-contextmenu="handleLayerContextMenu"
      @select-foreground-element="handleSelectForegroundElement"
      @foreground-contextmenu="handleForegroundContextMenu"
      @add-foreground-element="handleAddForegroundElement"
      @remove-foreground-element="handleRemoveForegroundElement"
    />

    <!-- サブパネル: パターン選択 (Generator タブのみ, 右パネルに沿って表示) -->
    <FloatingPanel
      v-if="activeTab === 'generator'"
      :title="sectionTitle"
      :is-open="!!activeSection"
      position="right"
      :ignore-refs="[rightPanelRef]"
      @close="closeSection"
    >
        <!-- 後景: テクスチャ選択 -->
        <BackgroundSectionPanel
          v-if="activeSection === 'background'"
          :color-key1="backgroundColorKey1"
          :color-key2="backgroundColorKey2"
          :palette="primitivePalette"
          :surface-schema="currentBackgroundSurfaceSchema"
          :surface-params="customBackgroundSurfaceParams"
          :patterns="backgroundPatterns"
          :selected-index="selectedBackgroundIndex"
          :custom-image="customBackgroundImage"
          :custom-file-name="customBackgroundFile?.name ?? null"
          :is-loading-random="isLoadingRandomBackground"
          preview-mode="hero"
          :base-config="currentHeroConfig"
          @update:color-key1="(v) => { if (v !== 'auto') backgroundColorKey1 = v }"
          @update:color-key2="backgroundColorKey2 = $event"
          @update:surface-params="updateBackgroundSurfaceParams($event)"
          @upload-image="setBackgroundImage"
          @clear-image="clearBackgroundImage"
          @select-pattern="(i) => { if (i !== null) selectedBackgroundIndex = i }"
          @load-random="loadRandomBackgroundImage()"
        />

        <!-- クリップグループ形状選択 -->
        <ClipGroupShapePanel
          v-else-if="activeSection === 'clip-group-shape'"
          :shape-schema="currentMaskShapeSchema"
          :shape-params="customMaskShapeParams"
          :patterns="maskPatterns"
          :selected-index="selectedMaskIndex"
          :mask-outer-color="maskOuterColor"
          :mask-inner-color="maskInnerColor"
          :create-background-thumbnail-spec="createBackgroundThumbnailSpec"
          preview-mode="hero"
          :base-config="currentHeroConfig"
          :palette="primitivePalette"
          @update:shape-params="updateMaskShapeParams($event)"
          @update:selected-index="selectedMaskIndex = $event"
        />

        <!-- クリップグループテクスチャ選択 -->
        <ClipGroupSurfacePanel
          v-else-if="activeSection === 'clip-group-surface'"
          :color-key1="maskColorKey1"
          :color-key2="maskColorKey2"
          :palette="primitivePalette"
          :surface-schema="currentSurfaceSchema"
          :surface-params="customSurfaceParams"
          :patterns="maskSurfacePatterns"
          :selected-index="selectedMidgroundTextureIndex"
          :custom-image="customMaskImage"
          :custom-file-name="customMaskFile?.name ?? null"
          :is-loading-random="isLoadingRandomMask"
          preview-mode="hero"
          :base-config="currentHeroConfig"
          @update:color-key1="maskColorKey1 = $event"
          @update:color-key2="maskColorKey2 = $event"
          @update:surface-params="updateSurfaceParams($event)"
          @upload-image="setMaskImage"
          @clear-image="clearMaskImage"
          @select-pattern="(i) => { if (i !== null) selectedMidgroundTextureIndex = i }"
          @load-random="loadRandomMaskImage()"
        />

        <!-- エフェクト設定 (排他選択) -->
        <EffectSectionPanel
          v-else-if="activeSection === 'filter' || activeSection === 'effect'"
          :selected-filter-type="selectedFilterType"
          :vignette-config="currentVignetteConfig"
          :chromatic-config="currentChromaticConfig"
          :dot-halftone-config="currentDotHalftoneConfig"
          :line-halftone-config="currentLineHalftoneConfig"
          :base-config="currentHeroConfig"
          :palette="primitivePalette"
          :show-preview="true"
          @update:selected-filter-type="selectedFilterType = $event"
          @update:vignette-config="currentVignetteConfig = $event"
          @update:chromatic-config="currentChromaticConfig = $event"
          @update:dot-halftone-config="currentDotHalftoneConfig = $event"
          @update:line-halftone-config="currentLineHalftoneConfig = $event"
        />

        <!-- テキストレイヤー設定 -->
        <TextLayerSectionPanel
          v-else-if="activeSection === 'text-content'"
          :config="selectedTextLayerConfig"
          @update:config="updateTextLayerConfig($event)"
        />

    </FloatingPanel>

    <!-- フォント選択パネル (右パネルの左側に表示) -->
    <FloatingPanel
      v-if="activeTab === 'generator'"
      title="Font"
      :is-open="isFontPanelOpen"
      position="right"
      :ignore-refs="[rightPanelRef]"
      @close="closeFontPanel"
    >
      <FontSelector v-model="selectedElementFont" />
    </FloatingPanel>

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
        :title-color="foregroundTitleColor"
        :body-color="foregroundBodyColor"
        :element-colors="foregroundElementColors"
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

    <!-- 右パネル: 選択要素のプロパティ -->
    <RightPropertyPanel
      v-if="activeTab === 'generator'"
      ref="rightPanelRef"
      :selected-foreground-element="selectedForegroundElement"
      :selected-layer="selectedLayer"
      :selected-layer-variant="selectedLayerVariant"
      :selected-processor-type="selectedProcessorType"
      :primitive-palette="primitivePalette"
      :title-contrast-result="titleContrastResult"
      :description-contrast-result="descriptionContrastResult"
      :foreground-title-auto-key="foregroundTitleAutoKey"
      :foreground-body-auto-key="foregroundBodyAutoKey"
      :selected-element-color-key="selectedElementColorKey"
      :selected-element-content="selectedElementContent"
      :selected-element-position="selectedElementPosition"
      :selected-element-font-size="selectedElementFontSize"
      :selected-font-preset="selectedFontPreset"
      :selected-font-display-name="selectedFontDisplayName"
      :background-color-key1="backgroundColorKey1"
      :background-color-key2="backgroundColorKey2"
      :custom-background-image="customBackgroundImage"
      :custom-background-file-name="customBackgroundFile?.name ?? null"
      :background-patterns="backgroundPatterns"
      :selected-background-index="selectedBackgroundIndex"
      :is-loading-random-background="isLoadingRandomBackground"
      :current-background-surface-schema="currentBackgroundSurfaceSchema"
      :custom-background-surface-params="customBackgroundSurfaceParams"
      :mask-color-key1="maskColorKey1"
      :mask-color-key2="maskColorKey2"
      :custom-mask-image="customMaskImage"
      :custom-mask-file-name="customMaskFile?.name ?? null"
      :mask-surface-patterns="maskSurfacePatterns"
      :selected-midground-texture-index="selectedMidgroundTextureIndex"
      :is-loading-random-mask="isLoadingRandomMask"
      :current-surface-schema="currentSurfaceSchema"
      :custom-surface-params="customSurfaceParams"
      :selected-filter-type="selectedFilterType"
      :vignette-config="currentVignetteConfig"
      :chromatic-config="currentChromaticConfig"
      :dot-halftone-config="currentDotHalftoneConfig"
      :line-halftone-config="currentLineHalftoneConfig"
      :mask-patterns="maskPatterns"
      :selected-mask-index="selectedMaskIndex"
      :current-mask-shape-schema="currentMaskShapeSchema"
      :custom-mask-shape-params="customMaskShapeParams"
      :mask-outer-color="maskOuterColor"
      :mask-inner-color="maskInnerColor"
      :create-background-thumbnail-spec="createBackgroundThumbnailSpec"
      @export-preset="exportPreset"
      @update:selected-element-color-key="selectedElementColorKey = $event as HeroPrimitiveKey"
      @update:selected-element-content="selectedElementContent = $event"
      @update:selected-element-position="selectedElementPosition = $event"
      @update:selected-element-font-size="selectedElementFontSize = $event"
      @open-font-panel="openFontPanel"
      @update:background-color-key1="backgroundColorKey1 = $event"
      @update:background-color-key2="backgroundColorKey2 = $event"
      @upload-background-image="setBackgroundImage"
      @clear-background-image="clearBackgroundImage"
      @select-background-pattern="(i) => { if (i !== null) selectedBackgroundIndex = i }"
      @load-random-background="loadRandomBackgroundImage()"
      @update:background-surface-params="updateBackgroundSurfaceParams($event)"
      @update:mask-color-key1="maskColorKey1 = $event"
      @update:mask-color-key2="maskColorKey2 = $event"
      @upload-mask-image="setMaskImage"
      @clear-mask-image="clearMaskImage"
      @select-mask-pattern="(i) => { if (i !== null) selectedMidgroundTextureIndex = i }"
      @load-random-mask="loadRandomMaskImage()"
      @update:surface-params="updateSurfaceParams($event)"
      @update:selected-filter-type="selectedFilterType = $event"
      @update:vignette-config="currentVignetteConfig = $event"
      @update:chromatic-config="currentChromaticConfig = $event"
      @update:dot-halftone-config="currentDotHalftoneConfig = $event"
      @update:line-halftone-config="currentLineHalftoneConfig = $event"
      @update:selected-mask-index="selectedMaskIndex = $event"
      @update:mask-shape-params="updateMaskShapeParams($event)"
    />

    <!-- Context Menu -->
    <ContextMenu
      :items="contextMenuItems"
      :position="contextMenuPosition"
      :is-open="contextMenuOpen"
      @close="handleContextMenuClose"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<!-- Styles moved to FloatingPanelContent components -->

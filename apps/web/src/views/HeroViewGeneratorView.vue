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
import { useContrastChecker } from '../composables/useContrastChecker'
import { useLayerSelection } from '../composables/useLayerSelection'
import { useLayerOperations } from '../composables/useLayerOperations'
import { useTextLayerEditor } from '../composables/useTextLayerEditor'
import { useFilterEditor } from '../composables/useFilterEditor'
import { useForegroundElement } from '../composables/useForegroundElement'
import { useContextMenu } from '../composables/useContextMenu'
import { usePresetActions } from '../composables/usePresetActions'
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

// ============================================================
// Preset Actions (Composable)
// ============================================================
const {
  applyColorPreset: handleApplyColorPreset,
  applyLayoutPreset: handleApplyLayoutPreset,
  exportPreset,
} = usePresetActions({
  colorState: {
    hue,
    saturation,
    value,
    accentHue,
    accentSaturation,
    accentValue,
    foundationHue,
    foundationSaturation,
    foundationValue,
  },
  toHeroViewConfig,
  applyPreset,
})

// Convert texture patterns to SurfaceSelector format with createSpec and surfaceConfig
// surfaceConfig is derived from pattern.params (no separate surfacePresets array needed)
const backgroundPatterns = createSurfacePatterns({
  patterns: texturePatterns,
  color1: textureColor1,
  color2: textureColor2,
  createSpec: (p, c1, c2, viewport) => p.createSpec(c1, c2, viewport),
})

const maskSurfacePatterns = createSurfacePatterns({
  patterns: midgroundTexturePatterns,
  color1: midgroundTextureColor1,
  color2: midgroundTextureColor2,
  createSpec: createMidgroundThumbnailSpec,
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
    handleApplyColorPreset(initialColorPreset)
  }

  // テクスチャプレビュー用キャンバス初期化 (HeroPreviewのcanvasを使用)
  await initPreview(heroPreviewRef.value?.canvasRef)
})

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
  selectedElementFontWeight,
  selectedElementLetterSpacing,
  selectedElementLineHeight,
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

// ============================================================
// HeroSidebar Event Handlers
// ============================================================

const handleColorStateUpdate = (
  colorType: 'brand' | 'accent' | 'foundation',
  key: 'hue' | 'saturation' | 'value' | 'hex',
  newValue: number
) => {
  switch (colorType) {
    case 'brand':
      if (key === 'hue') hue.value = newValue
      else if (key === 'saturation') saturation.value = newValue
      else if (key === 'value') value.value = newValue
      break
    case 'accent':
      if (key === 'hue') accentHue.value = newValue
      else if (key === 'saturation') accentSaturation.value = newValue
      else if (key === 'value') accentValue.value = newValue
      break
    case 'foundation':
      if (key === 'hue') foundationHue.value = newValue
      else if (key === 'saturation') foundationSaturation.value = newValue
      else if (key === 'value') foundationValue.value = newValue
      break
  }
}

// ============================================================
// RightPropertyPanel Event Handlers
// ============================================================

const handleForegroundUpdate = (key: string, value: unknown) => {
  switch (key) {
    case 'elementColorKey':
      selectedElementColorKey.value = value as HeroPrimitiveKey
      break
    case 'elementContent':
      selectedElementContent.value = value as string
      break
    case 'elementPosition':
      selectedElementPosition.value = value as typeof selectedElementPosition.value
      break
    case 'elementFontSize':
      selectedElementFontSize.value = value as number
      break
    case 'elementFontWeight':
      selectedElementFontWeight.value = value as number
      break
    case 'elementLetterSpacing':
      selectedElementLetterSpacing.value = value as number
      break
    case 'elementLineHeight':
      selectedElementLineHeight.value = value as number
      break
  }
}

const handleBackgroundUpdate = (key: string, value: unknown) => {
  switch (key) {
    case 'colorKey1':
      backgroundColorKey1.value = value as typeof backgroundColorKey1.value
      break
    case 'colorKey2':
      backgroundColorKey2.value = value as typeof backgroundColorKey2.value
      break
    case 'uploadImage':
      setBackgroundImage(value as File)
      break
    case 'clearImage':
      clearBackgroundImage()
      break
    case 'selectPattern':
      if (value !== null) selectedBackgroundIndex.value = value as number
      break
    case 'loadRandom':
      loadRandomBackgroundImage()
      break
    case 'surfaceParams':
      updateBackgroundSurfaceParams(value as Record<string, unknown>)
      break
  }
}

const handleMaskUpdate = (key: string, value: unknown) => {
  switch (key) {
    case 'colorKey1':
      maskColorKey1.value = value as typeof maskColorKey1.value
      break
    case 'colorKey2':
      maskColorKey2.value = value as typeof maskColorKey2.value
      break
    case 'uploadImage':
      setMaskImage(value as File)
      break
    case 'clearImage':
      clearMaskImage()
      break
    case 'selectPattern':
      if (value !== null) selectedMidgroundTextureIndex.value = value as number
      break
    case 'loadRandom':
      loadRandomMaskImage()
      break
    case 'surfaceParams':
      updateSurfaceParams(value as Record<string, unknown>)
      break
    case 'selectedShapeIndex':
      selectedMaskIndex.value = value as number
      break
    case 'shapeParams':
      updateMaskShapeParams(value as Record<string, unknown>)
      break
  }
}

const handleFilterUpdate = (key: string, value: unknown) => {
  switch (key) {
    case 'selectedType':
      selectedFilterType.value = value as typeof selectedFilterType.value
      break
    case 'vignetteConfig':
      currentVignetteConfig.value = value as typeof currentVignetteConfig.value
      break
    case 'chromaticConfig':
      currentChromaticConfig.value = value as typeof currentChromaticConfig.value
      break
    case 'dotHalftoneConfig':
      currentDotHalftoneConfig.value = value as typeof currentDotHalftoneConfig.value
      break
    case 'lineHalftoneConfig':
      currentLineHalftoneConfig.value = value as typeof currentLineHalftoneConfig.value
      break
  }
}
</script>

<template>
  <div class="hero-generator" :class="{ dark: uiDarkMode }" @contextmenu="handleGlobalContextMenu">
    <!-- 左パネル: カラー設定 & レイヤー -->
    <HeroSidebar
      :active-tab="activeTab"
      :color-state="{
        brand: { hue, saturation, value, hex: selectedHex },
        accent: { hue: accentHue, saturation: accentSaturation, value: accentValue, hex: accentHex },
        foundation: { hue: foundationHue, saturation: foundationSaturation, value: foundationValue, hex: foundationHex },
      }"
      :layout-presets="{
        presets,
        selectedId: selectedPresetId,
      }"
      :layers="{
        items: layers,
        foregroundElements: foregroundConfig.elements,
        selectedForegroundElementId,
      }"
      :palette-display="{
        neutralRamp: neutralRampDisplay,
      }"
      @update:color-state="handleColorStateUpdate"
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
        v-show="activeTab === 'generator'"
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
      ref="rightPanelRef"
      :selection="{
        foregroundElement: selectedForegroundElement,
        layer: selectedLayer,
        layerVariant: selectedLayerVariant,
        processorType: selectedProcessorType,
      }"
      :foreground="{
        titleAutoKey: foregroundTitleAutoKey,
        bodyAutoKey: foregroundBodyAutoKey,
        elementColorKey: selectedElementColorKey,
        elementContent: selectedElementContent,
        elementPosition: selectedElementPosition,
        elementFontSize: selectedElementFontSize,
        elementFontWeight: selectedElementFontWeight,
        elementLetterSpacing: selectedElementLetterSpacing,
        elementLineHeight: selectedElementLineHeight,
        fontPreset: selectedFontPreset,
        fontDisplayName: selectedFontDisplayName,
      }"
      :contrast="{
        title: titleContrastResult,
        description: descriptionContrastResult,
      }"
      :background="{
        colorKey1: backgroundColorKey1,
        colorKey2: backgroundColorKey2,
        customImage: customBackgroundImage,
        customFileName: customBackgroundFile?.name ?? null,
        patterns: backgroundPatterns,
        selectedIndex: selectedBackgroundIndex,
        isLoadingRandom: isLoadingRandomBackground,
        surfaceSchema: currentBackgroundSurfaceSchema,
        surfaceParams: customBackgroundSurfaceParams,
      }"
      :mask="{
        colorKey1: maskColorKey1,
        colorKey2: maskColorKey2,
        customImage: customMaskImage,
        customFileName: customMaskFile?.name ?? null,
        surfacePatterns: maskSurfacePatterns,
        selectedSurfaceIndex: selectedMidgroundTextureIndex,
        isLoadingRandom: isLoadingRandomMask,
        surfaceSchema: currentSurfaceSchema,
        surfaceParams: customSurfaceParams,
        shapePatterns: maskPatterns,
        selectedShapeIndex: selectedMaskIndex,
        shapeSchema: currentMaskShapeSchema,
        shapeParams: customMaskShapeParams,
        outerColor: maskOuterColor,
        innerColor: maskInnerColor,
        createBackgroundThumbnailSpec: createBackgroundThumbnailSpec,
      }"
      :filter="{
        selectedType: selectedFilterType,
        vignetteConfig: currentVignetteConfig,
        chromaticConfig: currentChromaticConfig,
        dotHalftoneConfig: currentDotHalftoneConfig,
        lineHalftoneConfig: currentLineHalftoneConfig,
      }"
      :palette="primitivePalette"
      @export-preset="exportPreset"
      @open-font-panel="openFontPanel"
      @update:foreground="handleForegroundUpdate"
      @update:background="handleBackgroundUpdate"
      @update:mask="handleMaskUpdate"
      @update:filter="handleFilterUpdate"
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

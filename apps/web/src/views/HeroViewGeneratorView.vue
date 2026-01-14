<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { PrimitivePalette } from '../modules/SemanticColorPalette/Domain'
import {
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
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
  createEffectPlaceholder,
  createMaskModifier,
  SCENE_LAYER_IDS,
  getSceneLayerId,
  isLayer,
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
import DebugPanel from '../components/HeroGenerator/DebugPanel.vue'

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
const heroScene = useHeroScene({ primitivePalette, isDark: uiDarkMode })

// ============================================================
// Filter Editor (Composable)
// ============================================================
const {
  selectedFilterType,
  effectConfigs,
} = useFilterEditor({
  effectManager: heroScene.filter.effectManager,
})

// Filter props object for passing to child components
// Using plain object to avoid Vue's auto-unwrapping of refs in templates
const filterProps = {
  selectedType: selectedFilterType,
  vignetteConfig: effectConfigs.vignette,
  chromaticConfig: effectConfigs.chromaticAberration,
  dotHalftoneConfig: effectConfigs.dotHalftone,
  lineHalftoneConfig: effectConfigs.lineHalftone,
  blurConfig: effectConfigs.blur,
}

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
  toHeroViewConfig: heroScene.serialization.toHeroViewConfig,
  applyPreset: heroScene.preset.applyPreset,
})

// Convert texture patterns to SurfaceSelector format with createSpec and surfaceConfig
// surfaceConfig is derived from pattern.params (no separate surfacePresets array needed)
const backgroundPatterns = createSurfacePatterns({
  patterns: heroScene.pattern.texturePatterns,
  color1: heroScene.pattern.textureColor1,
  color2: heroScene.pattern.textureColor2,
  createSpec: (p, c1, c2, viewport) => p.createSpec(c1, c2, viewport),
})

const maskSurfacePatterns = createSurfacePatterns({
  patterns: heroScene.pattern.midgroundTexturePatterns,
  color1: heroScene.pattern.midgroundTextureColor1,
  color2: heroScene.pattern.midgroundTextureColor2,
  createSpec: heroScene.pattern.createMidgroundThumbnailSpec,
})

const heroPreviewRef = ref<InstanceType<typeof HeroPreview> | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)

// Type helpers for props (converts specific union types to Record<string, unknown>)
const backgroundSurfaceParamsForUI = computed(() =>
  heroScene.background.customBackgroundSurfaceParams.value as Record<string, unknown> | null
)
const maskSurfaceParamsForUI = computed(() =>
  heroScene.mask.customSurfaceParams.value as Record<string, unknown> | null
)
const maskShapeParamsForUI = computed(() =>
  heroScene.mask.customMaskShapeParams.value as Record<string, unknown> | null
)

// Subpanel title
const sectionTitle = computed(() => {
  switch (heroScene.pattern.activeSection.value) {
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
  editorState: heroScene.editor.editorState,
  onUpdateConfig: heroScene.layer.updateTextLayerConfig,
})

const closeSection = () => {
  heroScene.pattern.activeSection.value = null
}

// ============================================================
// Dynamic CSS Injection for Palette Preview
// ============================================================
usePaletteStyles(semanticPalette)

onMounted(async () => {
  // Load layout presets and apply initial preset (including colors)
  const initialColorPreset = await heroScene.preset.loadPresets()
  if (initialColorPreset) {
    handleApplyColorPreset(initialColorPreset)
  }

  // テクスチャプレビュー用キャンバス初期化 (HeroPreviewのcanvasを使用)
  await heroScene.renderer.initPreview(heroPreviewRef.value?.canvasRef)
})

// ============================================================
// Hero Preview Config (for panel previews)
// ============================================================
const currentHeroConfig = computed(() => heroScene.serialization.toHeroViewConfig())

// ============================================================
// Tab State
// ============================================================
type TabId = 'generator' | 'palette' | 'debug'
const activeTab = ref<TabId>('generator')

// ============================================================
// Debug Panel Data
// ============================================================
const debugSections = computed(() => [
  {
    id: 'heroViewConfig',
    label: 'HeroViewConfig (Export)',
    data: heroScene.serialization.toHeroViewConfig(),
  },
  {
    id: 'editorState',
    label: 'Editor State',
    data: heroScene.editor.editorState.value,
  },
  {
    id: 'pattern',
    label: 'Pattern State',
    data: {
      activeSection: heroScene.pattern.activeSection.value,
      selectedBackgroundIndex: heroScene.pattern.selectedBackgroundIndex.value,
      selectedMaskIndex: heroScene.pattern.selectedMaskIndex.value,
      selectedMidgroundTextureIndex: heroScene.pattern.selectedMidgroundTextureIndex.value,
    },
  },
  {
    id: 'background',
    label: 'Background State',
    data: {
      colorKey1: heroScene.background.backgroundColorKey1.value,
      colorKey2: heroScene.background.backgroundColorKey2.value,
      customBackgroundImage: heroScene.background.customBackgroundImage.value ? '(image data)' : null,
      customBackgroundSurfaceParams: heroScene.background.customBackgroundSurfaceParams.value,
    },
  },
  {
    id: 'mask',
    label: 'Mask State',
    data: {
      colorKey1: heroScene.mask.maskColorKey1.value,
      colorKey2: heroScene.mask.maskColorKey2.value,
      customMaskImage: heroScene.mask.customMaskImage.value ? '(image data)' : null,
      customMaskShapeParams: heroScene.mask.customMaskShapeParams.value,
      customSurfaceParams: heroScene.mask.customSurfaceParams.value,
    },
  },
  {
    id: 'foreground',
    label: 'Foreground State',
    data: heroScene.foreground.foregroundConfig.value,
  },
])

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
  foregroundConfig: heroScene.foreground.foregroundConfig,
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
  handleAddLayer,
  handleRemoveLayer,
  handleGroupSelection,
  handleUseAsMask,
  handleMoveNode,
  handleMoveModifier,
} = useLayerOperations({
  initialLayers: [
    createGroup(
      'background-group',
      [
        createSurfaceLayer(
          SCENE_LAYER_IDS.BASE,
          { type: 'solid', color: 'BN1' },
          {
            name: 'Surface',
            modifiers: [createEffectPlaceholder()],
          },
        ),
      ],
      { name: 'Background', expanded: true },
    ),
    createGroup(
      'main-group',
      [
        createSurfaceLayer(
          SCENE_LAYER_IDS.MASK,
          { type: 'solid', color: 'B' },
          {
            name: 'Surface',
            modifiers: [createEffectPlaceholder(), createMaskModifier()],
          },
        ),
      ],
      { name: 'Main Group', expanded: true },
    ),
  ],
  selectedLayerId,
  sceneCallbacks: {
    addMaskLayer: heroScene.layer.addMaskLayer,
    addTextLayer: heroScene.layer.addTextLayer,
    addObjectLayer: heroScene.layer.addObjectLayer,
    removeLayer: heroScene.layer.removeLayer,
    toggleLayerVisibility: heroScene.layer.toggleLayerVisibility,
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
      if (layer && isLayer(layer)) {
        // Get scene layer ID from layer variant
        heroScene.filter.selectedFilterLayerId.value = getSceneLayerId(layer)
      }
    }
  },
  onClearSelection: () => selectCanvasLayer(''),
})

// ============================================================
// APCA Contrast Check
// ============================================================
const { titleContrastResult, descriptionContrastResult } = useContrastChecker({
  canvasImageData: heroScene.canvas.canvasImageData,
  heroPreviewRef,
  foregroundTitleColor: heroScene.foreground.foregroundTitleColor,
  foregroundBodyColor: heroScene.foreground.foregroundBodyColor,
  setElementBounds: heroScene.canvas.setElementBounds,
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
      heroScene.background.backgroundColorKey1.value = value as typeof heroScene.background.backgroundColorKey1.value
      break
    case 'colorKey2':
      heroScene.background.backgroundColorKey2.value = value as typeof heroScene.background.backgroundColorKey2.value
      break
    case 'uploadImage':
      heroScene.background.setBackgroundImage(value as File)
      break
    case 'clearImage':
      heroScene.background.clearBackgroundImage()
      break
    case 'selectPattern':
      if (value !== null) heroScene.pattern.selectedBackgroundIndex.value = value as number
      break
    case 'loadRandom':
      heroScene.background.loadRandomBackgroundImage()
      break
    case 'surfaceParams':
      heroScene.background.updateBackgroundSurfaceParams(value as Record<string, unknown>)
      break
  }
}

const handleMaskUpdate = (key: string, value: unknown) => {
  switch (key) {
    case 'colorKey1':
      heroScene.mask.maskColorKey1.value = value as typeof heroScene.mask.maskColorKey1.value
      break
    case 'colorKey2':
      heroScene.mask.maskColorKey2.value = value as typeof heroScene.mask.maskColorKey2.value
      break
    case 'uploadImage':
      heroScene.mask.setMaskImage(value as File)
      break
    case 'clearImage':
      heroScene.mask.clearMaskImage()
      break
    case 'selectPattern':
      if (value !== null) heroScene.pattern.selectedMidgroundTextureIndex.value = value as number
      break
    case 'loadRandom':
      heroScene.mask.loadRandomMaskImage()
      break
    case 'surfaceParams':
      heroScene.mask.updateSurfaceParams(value as Record<string, unknown>)
      break
    case 'selectedShapeIndex':
      heroScene.pattern.selectedMaskIndex.value = value as number
      break
    case 'shapeParams':
      heroScene.mask.updateMaskShapeParams(value as Record<string, unknown>)
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
        presets: heroScene.preset.presets.value,
        selectedId: heroScene.preset.selectedPresetId.value,
      }"
      :layers="{
        items: layers,
        foregroundElements: heroScene.foreground.foregroundConfig.value.elements,
        selectedForegroundElementId,
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
      @layer-contextmenu="handleLayerContextMenu"
      @move-node="handleMoveNode"
      @move-modifier="handleMoveModifier"
      @select-foreground-element="handleSelectForegroundElement"
      @foreground-contextmenu="handleForegroundContextMenu"
      @add-foreground-element="handleAddForegroundElement"
      @remove-foreground-element="handleRemoveForegroundElement"
    />

    <!-- サブパネル: パターン選択 (Generator タブのみ, 右パネルに沿って表示) -->
    <FloatingPanel
      v-if="activeTab === 'generator'"
      :title="sectionTitle"
      :is-open="!!heroScene.pattern.activeSection.value"
      position="right"
      :ignore-refs="[rightPanelRef]"
      @close="closeSection"
    >
        <!-- 後景: テクスチャ選択 -->
        <BackgroundSectionPanel
          v-if="heroScene.pattern.activeSection.value === 'background'"
          :color-key1="heroScene.background.backgroundColorKey1.value"
          :color-key2="heroScene.background.backgroundColorKey2.value"
          :palette="primitivePalette"
          :surface-schema="heroScene.background.currentBackgroundSurfaceSchema.value"
          :surface-params="backgroundSurfaceParamsForUI"
          :patterns="backgroundPatterns"
          :selected-index="heroScene.pattern.selectedBackgroundIndex.value"
          :custom-image="heroScene.background.customBackgroundImage.value"
          :custom-file-name="heroScene.background.customBackgroundFile.value?.name ?? null"
          :is-loading-random="heroScene.background.isLoadingRandomBackground.value"
          preview-mode="hero"
          :base-config="currentHeroConfig"
          @update:color-key1="(v) => { if (v !== 'auto') heroScene.background.backgroundColorKey1.value = v }"
          @update:color-key2="heroScene.background.backgroundColorKey2.value = $event"
          @update:surface-params="heroScene.background.updateBackgroundSurfaceParams($event)"
          @upload-image="heroScene.background.setBackgroundImage"
          @clear-image="heroScene.background.clearBackgroundImage"
          @select-pattern="(i) => { if (i !== null) heroScene.pattern.selectedBackgroundIndex.value = i }"
          @load-random="heroScene.background.loadRandomBackgroundImage()"
        />

        <!-- クリップグループ形状選択 -->
        <ClipGroupShapePanel
          v-else-if="heroScene.pattern.activeSection.value === 'clip-group-shape'"
          :shape-schema="heroScene.mask.currentMaskShapeSchema.value"
          :shape-params="maskShapeParamsForUI"
          :patterns="heroScene.pattern.maskPatterns"
          :selected-index="heroScene.pattern.selectedMaskIndex.value"
          :mask-outer-color="heroScene.pattern.maskOuterColor.value"
          :mask-inner-color="heroScene.pattern.maskInnerColor.value"
          :create-background-thumbnail-spec="heroScene.pattern.createBackgroundThumbnailSpec"
          preview-mode="hero"
          :base-config="currentHeroConfig"
          :palette="primitivePalette"
          @update:shape-params="heroScene.mask.updateMaskShapeParams($event)"
          @update:selected-index="heroScene.pattern.selectedMaskIndex.value = $event"
        />

        <!-- クリップグループテクスチャ選択 -->
        <ClipGroupSurfacePanel
          v-else-if="heroScene.pattern.activeSection.value === 'clip-group-surface'"
          :color-key1="heroScene.mask.maskColorKey1.value"
          :color-key2="heroScene.mask.maskColorKey2.value"
          :palette="primitivePalette"
          :surface-schema="heroScene.mask.currentSurfaceSchema.value"
          :surface-params="maskSurfaceParamsForUI"
          :patterns="maskSurfacePatterns"
          :selected-index="heroScene.pattern.selectedMidgroundTextureIndex.value"
          :custom-image="heroScene.mask.customMaskImage.value"
          :custom-file-name="heroScene.mask.customMaskFile.value?.name ?? null"
          :is-loading-random="heroScene.mask.isLoadingRandomMask.value"
          preview-mode="hero"
          :base-config="currentHeroConfig"
          @update:color-key1="heroScene.mask.maskColorKey1.value = $event"
          @update:color-key2="heroScene.mask.maskColorKey2.value = $event"
          @update:surface-params="heroScene.mask.updateSurfaceParams($event)"
          @upload-image="heroScene.mask.setMaskImage"
          @clear-image="heroScene.mask.clearMaskImage"
          @select-pattern="(i) => { if (i !== null) heroScene.pattern.selectedMidgroundTextureIndex.value = i }"
          @load-random="heroScene.mask.loadRandomMaskImage()"
        />

        <!-- エフェクト設定 (排他選択) -->
        <EffectSectionPanel
          v-else-if="heroScene.pattern.activeSection.value === 'filter' || heroScene.pattern.activeSection.value === 'effect'"
          :filter="filterProps"
          :base-config="currentHeroConfig"
          :palette="primitivePalette"
          :show-preview="true"
        />

        <!-- テキストレイヤー設定 -->
        <TextLayerSectionPanel
          v-else-if="heroScene.pattern.activeSection.value === 'text-content'"
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
          <button
            class="hero-tab-button"
            :class="{ active: activeTab === 'debug' }"
            @click="activeTab = 'debug'"
          >Debug</button>
        </nav>
      </header>

      <!-- Generator タブ: プレビュー -->
      <HeroPreview
        v-show="activeTab === 'generator'"
        ref="heroPreviewRef"
        :foreground-config="heroScene.foreground.foregroundConfig.value"
        :title-color="heroScene.foreground.foregroundTitleColor.value"
        :body-color="heroScene.foreground.foregroundBodyColor.value"
        :element-colors="heroScene.foreground.foregroundElementColors.value"
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

      <!-- Debug タブ: HeroScene 状態可視化 -->
      <DebugPanel
        v-if="activeTab === 'debug'"
        :sections="debugSections"
        class="hero-tab-content"
      />
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
        titleAutoKey: heroScene.foreground.foregroundTitleAutoKey.value,
        bodyAutoKey: heroScene.foreground.foregroundBodyAutoKey.value,
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
        colorKey1: heroScene.background.backgroundColorKey1.value,
        colorKey2: heroScene.background.backgroundColorKey2.value,
        customImage: heroScene.background.customBackgroundImage.value,
        customFileName: heroScene.background.customBackgroundFile.value?.name ?? null,
        patterns: backgroundPatterns,
        selectedIndex: heroScene.pattern.selectedBackgroundIndex.value,
        isLoadingRandom: heroScene.background.isLoadingRandomBackground.value,
        surfaceSchema: heroScene.background.currentBackgroundSurfaceSchema.value,
        surfaceParams: backgroundSurfaceParamsForUI,
      }"
      :mask="{
        colorKey1: heroScene.mask.maskColorKey1.value,
        colorKey2: heroScene.mask.maskColorKey2.value,
        customImage: heroScene.mask.customMaskImage.value,
        customFileName: heroScene.mask.customMaskFile.value?.name ?? null,
        surfacePatterns: maskSurfacePatterns,
        selectedSurfaceIndex: heroScene.pattern.selectedMidgroundTextureIndex.value,
        isLoadingRandom: heroScene.mask.isLoadingRandomMask.value,
        surfaceSchema: heroScene.mask.currentSurfaceSchema.value,
        surfaceParams: maskSurfaceParamsForUI,
        shapePatterns: heroScene.pattern.maskPatterns,
        selectedShapeIndex: heroScene.pattern.selectedMaskIndex.value,
        shapeSchema: heroScene.mask.currentMaskShapeSchema.value,
        shapeParams: maskShapeParamsForUI,
        outerColor: heroScene.pattern.maskOuterColor.value,
        innerColor: heroScene.pattern.maskInnerColor.value,
        createBackgroundThumbnailSpec: heroScene.pattern.createBackgroundThumbnailSpec,
      }"
      :filter="filterProps"
      :palette="primitivePalette"
      @export-preset="exportPreset"
      @open-font-panel="openFontPanel"
      @update:foreground="handleForegroundUpdate"
      @update:background="handleBackgroundUpdate"
      @update:mask="handleMaskUpdate"
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

<style scoped>
.hero-generator {
  display: flex;
  height: 100vh;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  color: oklch(0.25 0.02 260);
  transition: background 0.3s;
}

.hero-generator.dark {
  background: oklch(0.12 0.02 260);
  color: oklch(0.90 0.01 260);
}

/* Main Content */
.hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: oklch(0.94 0.01 260);
}

.dark .hero-main {
  background: oklch(0.08 0.02 260);
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid oklch(0.88 0.01 260);
}

.dark .hero-header {
  border-bottom-color: oklch(0.20 0.02 260);
}

.hero-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: oklch(0.25 0.02 260);
}

.dark .hero-header h1 {
  color: oklch(0.95 0.01 260);
}

/* Tab Navigation */
.hero-tab-nav {
  display: flex;
  gap: 0.25rem;
  background: oklch(0.90 0.01 260);
  padding: 0.25rem;
  border-radius: 0.5rem;
}

.dark .hero-tab-nav {
  background: oklch(0.14 0.02 260);
}

.hero-tab-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: oklch(0.45 0.02 260);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dark .hero-tab-button {
  color: oklch(0.60 0.02 260);
}

.hero-tab-button:hover {
  background: oklch(0.85 0.01 260);
  color: oklch(0.35 0.02 260);
}

.dark .hero-tab-button:hover {
  background: oklch(0.20 0.02 260);
  color: oklch(0.80 0.02 260);
}

.hero-tab-button.active {
  background: white;
  color: oklch(0.25 0.02 260);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dark .hero-tab-button.active {
  background: oklch(0.50 0.20 250);
  color: white;
  box-shadow: none;
}

/* Tab Content */
.hero-tab-content {
  flex: 1;
  overflow: hidden;
  animation: heroFadeIn 0.2s ease;
}

@keyframes heroFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Palette Preview */
.hero-palette-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
</style>

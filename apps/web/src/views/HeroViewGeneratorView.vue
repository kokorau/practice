<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CONTEXT_CLASS_NAMES,
  COMPONENT_CLASS_NAMES,
} from '@practice/semantic-color-palette/Domain'
import {
  createSemanticFromPrimitive,
  createPrimitiveRefMap,
} from '@practice/semantic-color-palette/Infra'
import { createHeroConfigSlice } from '@practice/site/Infra'
import PalettePreviewTab from '../components/SiteBuilder/PalettePreviewTab.vue'
import HeroSidebar from '../components/HeroGenerator/HeroSidebar.vue'
import HeroPreview from '../components/HeroGenerator/HeroPreview.vue'
import type { ImageLayerNodeConfig, ProcessorNodeConfig, SurfaceLayerNodeConfig, MaskShapeConfig } from '@practice/section-visual'
import {
  isBaseLayerConfig,
  isSurfaceLayerConfig,
  isProcessorLayerConfig,
  getEffectsBeforeMask,
  createEffectSpecsForPreview,
  findLayerInTree,
  findProcessorTargetSurface,
  normalizeMaskConfig,
} from '@practice/section-visual'

// Type guard for ImageLayerNodeConfig
function isImageLayerConfig(layer: unknown): layer is ImageLayerNodeConfig {
  return !!layer && typeof layer === 'object' && 'type' in layer && layer.type === 'image'
}
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
  useSiteState,
  useSiteColorsBridge,
  useHeroScene,
  createSurfacePatterns,
} from '../composables/SiteBuilder'
import { useContrastChecker } from '../composables/useContrastChecker'
import { provideLayerSelection } from '../composables/useLayerSelection'
import { useLayerOperations } from '../composables/useLayerOperations'
import { useTextLayerEditor } from '../composables/useTextLayerEditor'
import { useFilterEditor } from '../composables/useFilterEditor'
import { useForegroundElement } from '../composables/useForegroundElement'
import { useContextMenu } from '../composables/useContextMenu'
import { usePresetActions } from '../composables/usePresetActions'
import { usePaletteStyles } from '../composables/usePaletteStyles'
import { useHeroGeneratorPanelHandlers, useHeroGeneratorColorHandlers } from '../composables/HeroGenerator'
import { RightPropertyPanel } from '../components/HeroGenerator/RightPropertyPanel'
import ContextMenu from '../components/HeroGenerator/ContextMenu.vue'
import DebugPanel from '../components/HeroGenerator/DebugPanel.vue'

// ============================================================
// UI Dark Mode (independent from palette)
// ============================================================
const uiDarkMode = ref(false)

// ============================================================
// Layer Selection (provide for child components)
// ============================================================
const layerSelection = provideLayerSelection()
const {
  layerId: selectedLayerId,
  processorType: selectedProcessorType,
  processorLayerId,
  selectCanvasLayer,
  selectProcessor,
} = layerSelection

// ============================================================
// Site State (Source of Truth)
// ============================================================
const siteState = useSiteState()

// ============================================================
// Hero Config Repository (Slice Adapter)
// ============================================================
const heroConfigSlice = createHeroConfigSlice({
  siteRepository: siteState.repository,
  configId: 'hero-generator',
  createIfNotExists: true,
})

// ============================================================
// Brand, Accent & Foundation Color State (Bridge to Site)
// ============================================================
const colors = useSiteColorsBridge({ siteState })
const {
  hue,
  saturation,
  value,
  selectedHex,
  accentHue,
  accentSaturation,
  accentValue,
  accentHex,
  foundationHue,
  foundationSaturation,
  foundationValue,
  foundationHex,
} = colors

// ============================================================
// Color State Update Handler
// ============================================================
const { handleColorStateUpdate } = useHeroGeneratorColorHandlers({ colors })

// ============================================================
// Primitive & Semantic Palette (from Site State)
// ============================================================
const primitivePalette = siteState.primitivePalette

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
const heroScene = useHeroScene({
  primitivePalette,
  isDark: siteState.isDark,
  layerSelection,
  repository: heroConfigSlice,
})

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
  pixelateConfig: effectConfigs.pixelate,
  hexagonMosaicConfig: effectConfigs.hexagonMosaic,
  voronoiMosaicConfig: effectConfigs.voronoiMosaic,
}

// ============================================================
// Preset Actions (Composable)
// ============================================================
const {
  applyColorPreset: handleApplyColorPreset,
  applyLayoutPreset: handleApplyLayoutPreset,
  exportPreset,
} = usePresetActions({
  colors,
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
  heroViewConfig: heroScene.editor.heroViewConfig,
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
const currentHeroConfig = computed(() => heroScene.editor.heroViewConfig.value)

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
    data: heroScene.editor.heroViewConfig.value,
  },
])

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
  layerSelection,
})

// ============================================================
// Layer Operations (Composable)
// ============================================================

// Computed ref for expandedLayerIds from editorUIState
const expandedLayerIds = computed({
  get: () => heroScene.editor.editorUIState.value.layerTree.expandedLayerIds,
  set: (val: Set<string>) => { heroScene.editor.editorUIState.value.layerTree.expandedLayerIds = val },
})

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
  handleAddProcessor,
  handleRemoveProcessor,
  handleRemoveProcessorNode,
  handleGroupSelection,
  handleUseAsMask,
  handleMoveNode,
  handleMoveModifier,
} = useLayerOperations({
  repository: heroScene.usecase.heroViewRepository,
  heroViewConfig: heroScene.editor.heroViewConfig,
  expandedLayerIds,
  sceneCallbacks: {
    addMaskLayer: heroScene.layer.addMaskLayer,
    addTextLayer: heroScene.layer.addTextLayer,
    addObjectLayer: heroScene.layer.addObjectLayer,
    addImageLayer: heroScene.layer.addImageLayer,
    addGroupLayer: heroScene.layer.addGroupLayer,
    removeLayer: heroScene.layer.removeLayer,
    toggleLayerVisibility: heroScene.layer.toggleLayerVisibility,
    groupLayer: heroScene.layer.groupLayer,
    useAsMask: heroScene.layer.useAsMask,
    moveLayer: heroScene.layer.moveLayer,
    moveModifier: heroScene.layer.moveModifier,
    addProcessorToLayer: heroScene.layer.addProcessorToLayer,
    removeProcessorFromLayer: heroScene.layer.removeProcessorFromLayer,
    removeProcessor: heroScene.layer.removeProcessor,
  },
  selectedLayerId,
  onSelectLayer: (id) => {
    selectCanvasLayer(id)
  },
  onSelectProcessor: (layerId, type) => {
    selectProcessor(layerId, type)
    if (type === 'effect') {
      const layer = selectedLayer.value
      // Get scene layer ID from layer type
      if (layer && (isBaseLayerConfig(layer) || isSurfaceLayerConfig(layer))) {
        heroScene.filter.selectedFilterLayerId.value = layer.id
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
  handleRemoveProcessor,
  handleRemoveProcessorNode,
})

// ============================================================
// RightPropertyPanel Event Handlers
// ============================================================
const {
  handleForegroundUpdate,
  handleBackgroundUpdate,
  handleMaskUpdate,
} = useHeroGeneratorPanelHandlers({
  foregroundRefs: {
    selectedElementColorKey,
    selectedElementContent,
    selectedElementPosition,
    selectedElementFontSize,
    selectedElementFontWeight,
    selectedElementLetterSpacing,
    selectedElementLineHeight,
  },
  background: heroScene.background,
  mask: heroScene.mask,
  pattern: heroScene.pattern,
})

// ============================================================
// Image Layer Handling
// ============================================================

// Computed property for image layer props (when an image layer is selected)
const imageLayerProps = computed(() => {
  const layer = selectedLayer.value
  if (!layer || !isImageLayerConfig(layer)) return null

  const layerId = layer.id
  const isLoading = heroScene.images.isLayerLoading.value.get(layerId) ?? false
  const imageUrl = heroScene.images.getImageUrl(layerId)

  return {
    layerId,
    imageId: layer.imageId,
    mode: layer.mode ?? 'cover',
    position: layer.position,
    imageUrl,
    isLoading,
  }
})

// Computed property for preceding effect specs (for mask preview)
// When a mask is selected in a processor, get all effects that come before it
const precedingEffectSpecs = computed(() => {
  const layer = selectedLayer.value
  if (!layer || !isProcessorLayerConfig(layer)) return undefined

  const processor = layer as ProcessorNodeConfig
  const precedingEffects = getEffectsBeforeMask(processor.modifiers)

  if (precedingEffects.length === 0) return undefined

  // Convert to shader specs for thumbnail preview (256x144 is the thumbnail size)
  return createEffectSpecsForPreview(
    precedingEffects,
    { width: 256, height: 144 },
    1 // scale factor
  )
})

// Selected processor for mask preview pipeline
const selectedProcessor = computed<ProcessorNodeConfig | undefined>(() => {
  // Use processorLayerId which is set when a mask/effect is selected
  if (!processorLayerId.value) return undefined
  const layers = heroScene.editor.heroViewConfig.value?.layers
  if (!layers) return undefined
  const layer = findLayerInTree(layers, processorLayerId.value)
  if (!layer || !isProcessorLayerConfig(layer)) return undefined
  return layer as ProcessorNodeConfig
})

// Target surface that the selected processor applies to
const processorTargetSurface = computed<SurfaceLayerNodeConfig | undefined>(() => {
  const processor = selectedProcessor.value
  if (!processor) return undefined

  const layers = heroScene.editor.heroViewConfig.value?.layers
  if (!layers) return undefined

  return findProcessorTargetSurface(layers, processor.id) ?? undefined
})

// Mask patterns with normalized config for pipeline-based preview
const shapePatternsWithConfig = computed(() => {
  return heroScene.pattern.maskPatterns.map((pattern) => ({
    ...pattern,
    maskConfig: normalizeMaskConfig(pattern.maskConfig as MaskShapeConfig),
  }))
})

const handleImageUpdate = (key: string, value: unknown) => {
  const layer = selectedLayer.value
  if (!layer || !isImageLayerConfig(layer)) return

  const layerId = layer.id

  switch (key) {
    case 'uploadImage':
      heroScene.images.setLayerImage(layerId, value as File)
      break
    case 'clearImage':
      heroScene.images.clearLayerImage(layerId)
      break
    case 'loadRandom':
      heroScene.images.loadRandomImage(layerId, value as string | undefined)
      break
    case 'mode':
      heroScene.usecase.layerUsecase.updateLayer(layerId, { mode: value } as Partial<ImageLayerNodeConfig>)
      break
    case 'position':
      heroScene.usecase.layerUsecase.updateLayer(layerId, { position: value } as Partial<ImageLayerNodeConfig>)
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
        expandedLayerIds: expandedLayerIds,
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
      @add-processor="handleAddProcessor"
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
          preview-mode="hero"
          :base-config="currentHeroConfig"
          @update:color-key1="(v) => { if (v !== 'auto') heroScene.background.backgroundColorKey1.value = v }"
          @update:color-key2="heroScene.background.backgroundColorKey2.value = $event"
          @update:surface-params="heroScene.background.updateBackgroundSurfaceParams($event)"
          @select-pattern="(i) => { if (i !== null) heroScene.pattern.selectedBackgroundIndex.value = i }"
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
          preview-mode="hero"
          :base-config="currentHeroConfig"
          @update:color-key1="heroScene.mask.maskColorKey1.value = $event"
          @update:color-key2="heroScene.mask.maskColorKey2.value = $event"
          @update:surface-params="heroScene.mask.updateSurfaceParams($event)"
          @select-pattern="(i) => { if (i !== null) heroScene.pattern.selectedMidgroundTextureIndex.value = i }"
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
        :compiled-view="heroScene.foreground.compiledView.value"
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

    <!-- Popup Portal Container (for PresetSelector popups) -->
    <div id="preset-popup-portal" class="preset-popup-portal" />

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
        patterns: backgroundPatterns,
        selectedIndex: heroScene.pattern.selectedBackgroundIndex.value,
        surfaceSchema: heroScene.background.currentBackgroundSurfaceSchema.value,
        surfaceParams: backgroundSurfaceParamsForUI,
        rawSurfaceParams: heroScene.background.rawBackgroundSurfaceParams.value,
      }"
      :mask="{
        colorKey1: heroScene.mask.maskColorKey1.value,
        colorKey2: heroScene.mask.maskColorKey2.value,
        surfacePatterns: maskSurfacePatterns,
        selectedSurfaceIndex: heroScene.pattern.selectedMidgroundTextureIndex.value,
        surfaceSchema: heroScene.mask.currentSurfaceSchema.value,
        surfaceParams: maskSurfaceParamsForUI,
        rawSurfaceParams: heroScene.mask.rawSurfaceParams.value,
        shapePatterns: heroScene.pattern.maskPatterns,
        shapePatternsWithConfig: shapePatternsWithConfig,
        selectedShapeIndex: heroScene.pattern.selectedMaskIndex.value,
        shapeSchema: heroScene.mask.currentMaskShapeSchema.value,
        shapeParams: maskShapeParamsForUI,
        rawShapeParams: heroScene.mask.rawMaskShapeParams.value,
        outerColor: heroScene.pattern.maskOuterColor.value,
        innerColor: heroScene.pattern.maskInnerColor.value,
        createBackgroundThumbnailSpec: heroScene.pattern.createBackgroundThumbnailSpec,
        precedingEffectSpecs: precedingEffectSpecs,
        surface: processorTargetSurface,
        processor: selectedProcessor,
      }"
      :filter="filterProps"
      :image="imageLayerProps"
      :palette="primitivePalette"
      @export-preset="exportPreset"
      @open-font-panel="openFontPanel"
      @update:foreground="handleForegroundUpdate"
      @update:background="handleBackgroundUpdate"
      @update:mask="handleMaskUpdate"
      @update:image="handleImageUpdate"
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
  position: relative;
  display: flex;
  height: 100vh;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  color: oklch(0.25 0.02 260);
  transition: background 0.3s;
}

/* Portal container for PresetSelector popups */
.preset-popup-portal {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 40;
}

.preset-popup-portal > * {
  pointer-events: auto;
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

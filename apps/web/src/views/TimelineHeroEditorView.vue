<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import type { Ms, IntensityProvider, Timeline } from '@practice/timeline'
import { createHeroConfigSlice } from '@practice/site/Infra'
import HeroSidebar from '../components/HeroGenerator/HeroSidebar.vue'
import HeroPreview from '../components/HeroGenerator/HeroPreview.vue'
import TimelinePanel from '../components/Timeline/TimelinePanel.vue'
import { TIMELINE_PRESETS } from '../modules/Timeline/Infra/timelinePresets'
import {
  useSiteState,
  useSiteColorsBridge,
  useHeroScene,
  createSurfacePatterns,
  LAYER_IDS,
} from '../composables/SiteBuilder'
import type { ProcessorNodeConfig, SurfaceLayerNodeConfig } from '@practice/section-visual'
import {
  isImageLayerConfig,
  isAnimatedPreset,
  createInMemoryHeroViewPresetRepository,
  createSelectProcessorUsecase,
  createApplyAnimatedPresetUsecase,
  getProcessorWithTargetUsecase,
} from '@practice/section-visual'
import type { ImageLayerNodeConfig } from '@practice/section-visual'
import { provideLayerSelection } from '../composables/useLayerSelection'
import { useLayerOperations } from '../composables/useLayerOperations'
import { useFilterEditor } from '../composables/useFilterEditor'
import { useHeroGeneratorColorHandlers, useHeroGeneratorPanelHandlers } from '../composables/HeroGenerator'
import { useForegroundElement } from '../composables/useForegroundElement'
import { usePresetActions } from '../composables/usePresetActions'
import { RightPropertyPanel } from '../components/HeroGenerator/RightPropertyPanel'

// ============================================================
// Editor Config
// ============================================================
const VISIBLE_DURATION = 30000 as Ms // 30 seconds

// ============================================================
// Preset Repository (Timeline用プリセット)
// ============================================================
const timelinePresetRepository = createInMemoryHeroViewPresetRepository(TIMELINE_PRESETS)

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
  clearSelection,
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
  configId: 'timeline-hero-editor',
  createIfNotExists: true,
})

// ============================================================
// Brand, Accent & Foundation Color State (Bridge to Site)
// ============================================================
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
} = useSiteColorsBridge({ siteState })

// ============================================================
// Color State Update Handler
// ============================================================
const { handleColorStateUpdate } = useHeroGeneratorColorHandlers({
  brand: { hue, saturation, value },
  accent: { hue: accentHue, saturation: accentSaturation, value: accentValue },
  foundation: { hue: foundationHue, saturation: foundationSaturation, value: foundationValue },
})

// ============================================================
// Primitive Palette (from Site State)
// ============================================================
const primitivePalette = siteState.primitivePalette

// ============================================================
// Timeline Panel Ref (for intensityProvider access)
// ============================================================
const timelinePanelRef = ref<InstanceType<typeof TimelinePanel> | null>(null)

// Lazy getter for IntensityProvider - evaluated at render time
const getIntensityProvider = (): IntensityProvider | undefined => {
  return timelinePanelRef.value?.intensityProvider
}

// Handler for frameState changes - triggers re-render when timeline intensities change
const handleFrameStateUpdate = () => {
  // Re-render when timeline updates intensities
  heroScene.renderer.renderSceneFromConfig?.()
}

// ============================================================
// Hero Scene (WebGPU rendering with layer system + IntensityProvider)
// ============================================================
// Uses lazy getter so intensityProvider is available after TimelinePanel mounts
const heroScene = useHeroScene({
  primitivePalette,
  isDark: siteState.isDark,
  layerSelection,
  repository: heroConfigSlice,
  getIntensityProvider,
  presetRepository: timelinePresetRepository,
})

// ============================================================
// SelectProcessor Usecase (EffectManager Port integration)
// ============================================================
const selectProcessorUsecase = createSelectProcessorUsecase({
  effectManager: {
    selectLayer: (layerId) => heroScene.filter.effectManager.selectLayer(layerId),
    setEffectPipeline: (layerId, effects) => heroScene.filter.effectManager.setEffectPipeline(layerId, effects),
  },
})

// ============================================================
// ApplyAnimatedPreset Usecase (Preset change handling)
// ============================================================
const applyAnimatedPresetUsecase = createApplyAnimatedPresetUsecase({
  repository: heroScene.usecase.heroViewRepository,
  foregroundConfig: {
    set: (config) => { heroScene.foreground.foregroundConfig.value = config },
  },
  effectManager: {
    selectLayer: (layerId) => heroScene.filter.effectManager.selectLayer(layerId),
  },
})

// ============================================================
// Selected Preset (from heroScene.preset)
// ============================================================
const selectedPreset = computed(() => {
  const presetId = heroScene.preset.selectedPresetId.value
  return heroScene.preset.presets.value.find((p) => p.id === presetId)
})

// Get timeline from selected preset (only if it's an animated preset)
const selectedTimeline = computed((): Timeline | undefined => {
  const preset = selectedPreset.value
  if (preset && isAnimatedPreset(preset)) {
    return preset.timeline
  }
  return undefined
})

// ============================================================
// Filter Editor (Composable)
// ============================================================
const {
  selectedFilterType,
  effectConfigs,
  rawEffectParams,
} = useFilterEditor({
  effectManager: heroScene.filter.effectManager,
})

// Filter props object for passing to child components
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
  // Raw params for DSL display
  rawVignetteParams: rawEffectParams.vignette,
  rawChromaticParams: rawEffectParams.chromaticAberration,
  rawDotHalftoneParams: rawEffectParams.dotHalftone,
  rawLineHalftoneParams: rawEffectParams.lineHalftone,
  rawBlurParams: rawEffectParams.blur,
  rawPixelateParams: rawEffectParams.pixelate,
  rawHexagonMosaicParams: rawEffectParams.hexagonMosaic,
  rawVoronoiMosaicParams: rawEffectParams.voronoiMosaic,
}

// ============================================================
// Preset Actions (Composable)
// ============================================================
const {
  applyColorPreset: handleApplyColorPreset,
  applyLayoutPreset: handleApplyLayoutPreset,
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

// ============================================================
// Foreground Element (Composable)
// ============================================================
const {
  selectedForegroundElementId,
  selectedForegroundElement,
  handleSelectForegroundElement,
  selectedElementPosition,
  selectedElementFontSize,
  selectedElementFontWeight,
  selectedElementLetterSpacing,
  selectedElementLineHeight,
  selectedElementContent,
  selectedElementColorKey,
  selectedFontPreset,
  selectedFontDisplayName,
} = useForegroundElement({
  foregroundConfig: heroScene.foreground.foregroundConfig,
  clearCanvasSelection: clearSelection,
})

// Convert texture patterns to SurfaceSelector format
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

// Type helpers for props
const backgroundSurfaceParamsForUI = computed(() =>
  heroScene.background.customBackgroundSurfaceParams.value as Record<string, unknown> | null
)
const maskSurfaceParamsForUI = computed(() =>
  heroScene.mask.customSurfaceParams.value as Record<string, unknown> | null
)
const maskShapeParamsForUI = computed(() =>
  heroScene.mask.customMaskShapeParams.value as Record<string, unknown> | null
)

// ============================================================
// Layer Operations (Composable)
// ============================================================
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
    // Use SelectProcessorUsecase for effect sync (only for effect/mask types)
    if (type === 'effect' || type === 'mask') {
      selectProcessorUsecase.execute(layers.value, layerId, type)
    }
  },
  onClearSelection: () => selectCanvasLayer(''),
})

// ============================================================
// Panel Handlers (via composable)
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

// ============================================================
// Initialize on mount
// ============================================================
onMounted(async () => {
  // Load layout presets and apply initial preset (including colors)
  // loadPresets handles both static and animated presets via getPresetConfig
  const initialColorPreset = await heroScene.preset.loadPresets()
  if (initialColorPreset) {
    handleApplyColorPreset(initialColorPreset)
  }

  // Wait for next tick to ensure TimelinePanel is fully mounted and refs are ready
  await nextTick()

  // Initialize preview canvas (after TimelinePanel mounts so paramResolver is available)
  await heroScene.renderer.initPreview(heroPreviewRef.value?.canvasRef)
})

// Watch for preset changes to update config
watch(() => heroScene.preset.selectedPresetId.value, async (newPresetId) => {
  if (!newPresetId) return

  const preset = heroScene.preset.presets.value.find((p) => p.id === newPresetId)
  if (!preset) return

  // Use ApplyAnimatedPresetUsecase for animated preset handling and effect manager reset
  applyAnimatedPresetUsecase.execute(preset, LAYER_IDS.BASE)

  // Re-render scene (View responsibility)
  await nextTick()
  heroScene.renderer.renderSceneFromConfig?.()
})

// ============================================================
// Layout Resize
// ============================================================
const timelineHeightPercent = ref(35)
const isResizing = ref(false)

function startResize(e: MouseEvent) {
  isResizing.value = true
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return
  const vh = window.innerHeight
  const fromBottom = vh - e.clientY
  const percent = Math.min(Math.max((fromBottom / vh) * 100, 15), 60)
  timelineHeightPercent.value = percent
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// ============================================================
// Mask Preview Pipeline Support
// ============================================================
// Use GetProcessorWithTargetUsecase for processor and target surface lookup
const processorWithTarget = computed(() => {
  const layers = heroScene.editor.heroViewConfig.value?.layers
  if (!layers) return { processor: undefined, targetSurface: undefined }
  return getProcessorWithTargetUsecase.execute(layers, processorLayerId.value)
})

const selectedProcessor = computed<ProcessorNodeConfig | undefined>(() => processorWithTarget.value.processor)
const processorTargetSurface = computed<SurfaceLayerNodeConfig | undefined>(() => processorWithTarget.value.targetSurface)
</script>

<template>
  <div class="timeline-hero-editor" :class="{ dark: uiDarkMode }">
    <!-- Top Section: Hero Editor Layout -->
    <div
      class="hero-editor-area"
      :style="{ minHeight: `${100 - timelineHeightPercent}%` }"
    >
      <!-- Left: Sidebar -->
      <HeroSidebar
        :active-tab="'generator'"
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
          selectedForegroundElementId: selectedForegroundElementId,
          expandedLayerIds: expandedLayerIds,
        }"
        @update:color-state="handleColorStateUpdate"
        @apply-color-preset="handleApplyColorPreset"
        @apply-layout-preset="handleApplyLayoutPreset"
        @select-layer="handleSelectLayer"
        @select-foreground-element="handleSelectForegroundElement"
        @toggle-expand="handleToggleExpand"
        @toggle-visibility="handleToggleVisibility"
        @select-processor="handleSelectProcessor"
        @add-layer="handleAddLayer"
        @remove-layer="handleRemoveLayer"
        @add-processor="handleAddProcessor"
        @move-node="handleMoveNode"
        @move-modifier="handleMoveModifier"
      />

      <!-- Center: Preview -->
      <main class="hero-main">
        <HeroPreview
          ref="heroPreviewRef"
          :compiled-view="heroScene.foreground.compiledView.value"
          class="hero-preview"
        />
      </main>

      <!-- Popup Portal Container (for PresetSelector popups) -->
      <div id="preset-popup-portal" class="preset-popup-portal" />

      <!-- Right: Property Panel -->
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
          title: null,
          description: null,
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
          shapePatternsWithConfig: heroScene.pattern.maskPatternsWithNormalizedConfig.value,
          selectedShapeIndex: heroScene.pattern.selectedMaskIndex.value,
          shapeSchema: heroScene.mask.currentMaskShapeSchema.value,
          shapeParams: maskShapeParamsForUI,
          rawShapeParams: heroScene.mask.rawMaskShapeParams.value,
          outerColor: heroScene.pattern.maskOuterColor.value,
          innerColor: heroScene.pattern.maskInnerColor.value,
          createBackgroundThumbnailSpec: heroScene.pattern.createBackgroundThumbnailSpec,
          surface: processorTargetSurface,
          processor: selectedProcessor,
        }"
        :filter="filterProps"
        :image="imageLayerProps"
        :palette="primitivePalette"
        @update:foreground="handleForegroundUpdate"
        @update:background="handleBackgroundUpdate"
        @update:mask="handleMaskUpdate"
        @update:image="handleImageUpdate"
      />
    </div>

    <!-- Resize Handle -->
    <div
      class="resize-handle"
      :class="{ 'resize-handle--active': isResizing }"
      @mousedown="startResize"
    />

    <!-- Bottom: Timeline Panel -->
    <section
      class="timeline-area"
      :style="{ height: `${timelineHeightPercent}%` }"
    >
      <TimelinePanel
        v-if="selectedTimeline"
        :key="heroScene.preset.selectedPresetId.value ?? 'default'"
        ref="timelinePanelRef"
        :timeline="selectedTimeline"
        :visible-duration="VISIBLE_DURATION"
        @update:frame-state="handleFrameStateUpdate"
      />
      <div v-else class="no-timeline-message">
        Select an animated preset to view the timeline
      </div>
    </section>
  </div>
</template>

<style scoped>
.timeline-hero-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  background: oklch(0.97 0.005 260);
  color: oklch(0.25 0.02 260);
}

.timeline-hero-editor.dark {
  background: oklch(0.12 0.02 260);
  color: oklch(0.90 0.01 260);
}

.hero-editor-area {
  position: relative;
  flex: 1;
  display: flex;
  overflow: hidden;
}

.hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: oklch(0.94 0.01 260);
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

.dark .hero-main {
  background: oklch(0.08 0.02 260);
}

.hero-preview {
  flex: 1;
  overflow: hidden;
}

.resize-handle {
  height: 4px;
  background: oklch(0.85 0.01 260);
  cursor: ns-resize;
  transition: background 0.15s;
  flex-shrink: 0;
}

.resize-handle:hover,
.resize-handle--active {
  background: oklch(0.50 0.20 250);
}

.timeline-area {
  display: flex;
  flex-direction: column;
  background: oklch(0.97 0.005 260);
  border-top: 1px solid oklch(0.88 0.01 260);
  flex-shrink: 0;
}

.no-timeline-message {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  font-size: 14px;
  color: oklch(0.50 0.02 260);
}

.dark .no-timeline-message {
  color: oklch(0.60 0.02 260);
}
</style>

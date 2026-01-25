<script setup lang="ts">
import { computed, onMounted, onUnmounted, nextTick, watch, ref } from 'vue'
import type { Ms, IntensityProvider, TrackId } from '@practice/timeline'
import { createHeroConfigSlice } from '@practice/site/Infra'
import { createTimelineEditor, useTimelineContextMenu } from '@practice/timeline-editor'
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
import { createInMemoryHeroViewPresetRepository, buildDependencyGraph, type DependencyGraph } from '@practice/section-visual'
import { provideLayerSelection } from '../composables/useLayerSelection'
import { useLayerOperations } from '../composables/useLayerOperations'
import { useFilterEditor } from '../composables/useFilterEditor'
import { useHeroGeneratorColorHandlers, useHeroGeneratorPanelHandlers } from '../composables/HeroGenerator'
import { useForegroundElement } from '../composables/useForegroundElement'
import { usePresetActions } from '../composables/usePresetActions'
import { useLayoutResize, usePanelResize } from '../composables/useLayoutResize'
import { useImageLayerEditor } from '../composables/useImageLayerEditor'
import { useContextMenu } from '../composables/useContextMenu'
import { RightPropertyPanel } from '../components/HeroGenerator/RightPropertyPanel'
import ContextMenu from '../components/HeroGenerator/ContextMenu.vue'

// ============================================================
// Editor Config
// ============================================================
const VISIBLE_DURATION = 30000 as Ms // 30 seconds

// ============================================================
// Timeline Editor (selection state)
// ============================================================
const timelineEditor = createTimelineEditor()
const selectedTrackId = ref<TrackId | null>(null)

const unsubscribeSelection = timelineEditor.onSelectionChange((selection) => {
  selectedTrackId.value = selection.type === 'track' ? selection.id as TrackId : null
})

onUnmounted(() => {
  unsubscribeSelection()
})

function onSelectTrack(trackId: TrackId) {
  timelineEditor.selectTrack(trackId)
}

// ============================================================
// Timeline Context Menu
// ============================================================
const timelineContextMenu = useTimelineContextMenu()

function onTrackContextMenu(trackId: TrackId, event: MouseEvent) {
  timelineContextMenu.handleTrackContextMenu(trackId, event)
}

// ============================================================
// Preset Repository (Timeline用プリセット)
// ============================================================
const timelinePresetRepository = createInMemoryHeroViewPresetRepository(TIMELINE_PRESETS)

// ============================================================
// Layer Selection (provide for child components)
// ============================================================
const layerSelection = provideLayerSelection()
const {
  layerId: selectedLayerId,
  processorType: selectedProcessorType,
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
  configId: 'timeline-hero-editor',
  createIfNotExists: true,
})

// ============================================================
// Brand, Accent & Foundation Color State (Bridge to Site)
// ============================================================
const colors = useSiteColorsBridge({ siteState })

// ============================================================
// Color State Update Handler
// ============================================================
const { handleColorStateUpdate } = useHeroGeneratorColorHandlers({ colors })

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
// Usecases & Preset (from heroScene)
// ============================================================
const { selectProcessorUsecase, applyAnimatedPresetUsecase } = heroScene.usecase
const { selectedPreset, selectedTimeline } = heroScene.preset

// Sync track keys when timeline changes
watch(selectedTimeline, (timeline) => {
  if (timeline) {
    timelineEditor.syncTracks(timeline.tracks.map(t => t.id))
  }
}, { immediate: true })

// ============================================================
// Dependency Graph (for Timeline Panel)
// ============================================================
const dependencyGraph = computed<DependencyGraph | null>(() => {
  const config = heroScene.editor.heroViewConfig.value
  if (!config) return null
  return buildDependencyGraph(config)
})

// ============================================================
// Filter Editor (Composable)
// ============================================================
const { filterProps } = useFilterEditor({
  effectManager: heroScene.filter.effectManager,
})

// ============================================================
// Preset Actions (Composable)
// ============================================================
const {
  applyColorPreset: handleApplyColorPreset,
  applyLayoutPreset: handleApplyLayoutPreset,
} = usePresetActions({
  colors,
  toHeroViewConfig: heroScene.serialization.toHeroViewConfig,
  applyPreset: heroScene.preset.applyPreset,
})

// ============================================================
// Foreground Element (Composable)
// ============================================================
const foregroundElement = useForegroundElement({
  foregroundConfig: heroScene.foreground.foregroundConfig,
  layerSelection,
})

// Destructure commonly used values
const {
  selectedForegroundElementId,
  selectedForegroundElement,
  handleSelectForegroundElement,
  selectedFontPreset,
  selectedFontDisplayName,
} = foregroundElement

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
  handleAddProcessor,
  handleAddModifierToProcessor,
  handleRemoveProcessor,
  handleRemoveProcessorNode,
  handleGroupSelection,
  handleUseAsMask,
  handleMoveNode,
  handleMoveModifier,
} = useLayerOperations({
  repository: heroScene.usecase.heroViewRepository,
  heroViewConfig: heroScene.editor.heroViewConfig,
  expandedLayerIds: heroScene.editor.expandedLayerIds,
  sceneCallbacks: heroScene.layer,
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
  foregroundRefs: foregroundElement,
  background: heroScene.background,
  mask: heroScene.mask,
  pattern: heroScene.pattern,
})

// ============================================================
// Image Layer Editor (Composable)
// ============================================================
const { imageLayerProps, handleImageUpdate } = useImageLayerEditor({
  selectedLayer,
  isLayerLoading: heroScene.images.isLayerLoading,
  getImageUrl: heroScene.images.getImageUrl,
  setLayerImage: heroScene.images.setLayerImage,
  clearLayerImage: heroScene.images.clearLayerImage,
  loadRandomImage: heroScene.images.loadRandomImage,
  updateLayer: heroScene.usecase.layerUsecase.updateLayer,
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
  handleRemoveForegroundElement: foregroundElement.handleRemoveForegroundElement,
  handleRemoveProcessor,
  handleRemoveProcessorNode,
  handleAddModifierToProcessor,
})

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
watch(selectedPreset, async (preset) => {
  if (!preset) return

  // Use ApplyAnimatedPresetUsecase for animated preset handling and effect manager reset
  applyAnimatedPresetUsecase.execute(preset, LAYER_IDS.BASE)

  // Re-render scene (View responsibility)
  await nextTick()
  heroScene.renderer.renderSceneFromConfig?.()
})

// ============================================================
// Layout Resize (Composable)
// ============================================================
const {
  heightPercent: timelineHeightPercent,
  isResizing: isTimelineResizing,
  startResize: startTimelineResize,
} = useLayoutResize({ initialPercent: 35, minPercent: 15, maxPercent: 60 })

// Left panel resize (16rem = 256px)
const {
  width: leftPanelWidth,
  isResizing: isLeftPanelResizing,
  startResize: startLeftPanelResize,
} = usePanelResize({ initialWidth: 256, minWidth: 200, maxWidth: 600, direction: 'left' })

// Right panel resize (16rem = 256px)
const {
  width: rightPanelWidth,
  isResizing: isRightPanelResizing,
  startResize: startRightPanelResize,
} = usePanelResize({ initialWidth: 256, minWidth: 200, maxWidth: 600, direction: 'right' })

// Combined resizing state for cursor styling
const isResizing = computed(() => isTimelineResizing.value || isLeftPanelResizing.value || isRightPanelResizing.value)

// ============================================================
// Component Props (Computed for reactivity and template clarity)
// ============================================================

// HeroSidebar props (use pre-built colorState from useSiteColorsBridge)

const sidebarLayoutPresets = computed(() => ({
  presets: heroScene.preset.presets.value,
  selectedId: heroScene.preset.selectedPresetId.value,
}))

const sidebarLayers = computed(() => ({
  items: layers.value,
  foregroundElements: heroScene.foreground.foregroundConfig.value.elements,
  selectedForegroundElementId: selectedForegroundElementId.value,
  expandedLayerIds: heroScene.editor.expandedLayerIds.value,
}))

// RightPropertyPanel props
const panelSelection = computed(() => ({
  foregroundElement: selectedForegroundElement.value,
  layer: selectedLayer.value,
  layerVariant: selectedLayerVariant.value,
  processorType: selectedProcessorType.value,
}))

const panelForeground = computed(() => ({
  titleAutoKey: heroScene.foreground.foregroundTitleAutoKey.value,
  bodyAutoKey: heroScene.foreground.foregroundBodyAutoKey.value,
  elementColorKey: foregroundElement.selectedElementColorKey.value,
  elementContent: foregroundElement.selectedElementContent.value,
  elementPosition: foregroundElement.selectedElementPosition.value,
  elementFontSize: foregroundElement.selectedElementFontSize.value,
  elementFontWeight: foregroundElement.selectedElementFontWeight.value,
  elementLetterSpacing: foregroundElement.selectedElementLetterSpacing.value,
  elementLineHeight: foregroundElement.selectedElementLineHeight.value,
  fontPreset: selectedFontPreset.value,
  fontDisplayName: selectedFontDisplayName.value,
}))

const panelBackground = computed(() => ({
  patterns: backgroundPatterns.value,
  selectedIndex: heroScene.pattern.selectedBackgroundIndex.value,
  surfaceSchema: heroScene.background.currentBackgroundSurfaceSchema.value,
  surfaceParams: heroScene.background.customBackgroundSurfaceParams.value as Record<string, unknown> | null,
  rawSurfaceParams: heroScene.background.rawBackgroundSurfaceParams.value,
}))

const panelMask = computed(() => ({
  surfacePatterns: maskSurfacePatterns.value,
  selectedSurfaceIndex: heroScene.pattern.selectedMidgroundTextureIndex.value,
  surfaceSchema: heroScene.mask.currentSurfaceSchema.value,
  surfaceParams: heroScene.mask.customSurfaceParams.value as Record<string, unknown> | null,
  rawSurfaceParams: heroScene.mask.rawSurfaceParams.value,
  shapePatterns: heroScene.pattern.maskPatterns,
  shapePatternsWithConfig: heroScene.pattern.maskPatternsWithNormalizedConfig.value,
  selectedShapeIndex: heroScene.pattern.selectedMaskIndex.value,
  shapeSchema: heroScene.mask.currentMaskShapeSchema.value,
  shapeParams: heroScene.mask.customMaskShapeParams.value as Record<string, unknown> | null,
  rawShapeParams: heroScene.mask.rawMaskShapeParams.value,
  outerColor: heroScene.pattern.maskOuterColor.value,
  innerColor: heroScene.pattern.maskInnerColor.value,
  createBackgroundThumbnailSpec: heroScene.pattern.createBackgroundThumbnailSpec,
  surface: heroScene.mask.processorTarget.value.targetSurface,
  processor: heroScene.mask.processorTarget.value.processor,
}))
</script>

<template>
  <div class="timeline-hero-editor" :class="{ 'is-resizing': isResizing }" @contextmenu="handleGlobalContextMenu">
    <!-- Top Section: Hero Editor Layout -->
    <div
      class="hero-editor-area"
      :style="{ minHeight: `${100 - timelineHeightPercent}%` }"
    >
      <!-- Left: Sidebar -->
      <HeroSidebar
        :active-tab="'generator'"
        :color-state="colors.colorState.value"
        :layout-presets="sidebarLayoutPresets"
        :layers="sidebarLayers"
        :style="{ width: `${leftPanelWidth}px` }"
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
        @add-modifier-to-processor="handleAddModifierToProcessor"
        @layer-contextmenu="handleLayerContextMenu"
        @move-node="handleMoveNode"
        @move-modifier="handleMoveModifier"
        @foreground-contextmenu="handleForegroundContextMenu"
      />

      <!-- Left Panel Resize Handle -->
      <div
        class="resize-handle-horizontal"
        @mousedown="startLeftPanelResize"
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

      <!-- Right Panel Resize Handle -->
      <div
        class="resize-handle-horizontal"
        @mousedown="startRightPanelResize"
      />

      <!-- Right: Property Panel -->
      <RightPropertyPanel
        :selection="panelSelection"
        :foreground="panelForeground"
        :contrast="{ title: null, description: null }"
        :background="panelBackground"
        :mask="panelMask"
        :filter="filterProps"
        :filter-processor="{ filterConfig: null }"
        :image="imageLayerProps"
        :palette="primitivePalette"
        :style="{ width: `${rightPanelWidth}px` }"
        @update:foreground="handleForegroundUpdate"
        @update:background="handleBackgroundUpdate"
        @update:mask="handleMaskUpdate"
        @update:image="handleImageUpdate"
      />
    </div>

    <!-- Resize Handle -->
    <div
      class="resize-handle"
      @mousedown="startTimelineResize"
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
        :selected-track-id="selectedTrackId"
        :get-track-key="timelineEditor.getTrackKey"
        :dependency-graph="dependencyGraph"
        @update:frame-state="handleFrameStateUpdate"
        @select:track="onSelectTrack"
        @contextmenu:track="onTrackContextMenu"
      />
      <div v-else class="no-timeline-message">
        Select an animated preset to view the timeline
      </div>
    </section>

    <!-- Context Menu (Layers) -->
    <ContextMenu
      :items="contextMenuItems"
      :position="contextMenuPosition"
      :is-open="contextMenuOpen"
      @close="handleContextMenuClose"
      @select="handleContextMenuSelect"
    />

    <!-- Context Menu (Timeline) -->
    <ContextMenu
      :items="timelineContextMenu.items.value"
      :position="timelineContextMenu.position.value"
      :is-open="timelineContextMenu.isOpen.value"
      @close="timelineContextMenu.handleClose"
      @select="timelineContextMenu.handleSelect"
    />
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

/* Prevent text selection during resize */
.timeline-hero-editor.is-resizing {
  user-select: none;
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

.hero-preview {
  flex: 1;
  overflow: hidden;
}

/* Vertical resize handle (timeline) */
.resize-handle {
  position: relative;
  height: 3px;
  cursor: ns-resize;
  flex-shrink: 0;
}

.resize-handle::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: oklch(0.85 0.01 260);
}

/* Horizontal resize handles (left/right panels) */
.resize-handle-horizontal {
  position: relative;
  width: 3px;
  cursor: ew-resize;
  flex-shrink: 0;
}

.resize-handle-horizontal::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: oklch(0.85 0.01 260);
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
</style>

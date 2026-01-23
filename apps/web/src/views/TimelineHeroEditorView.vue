<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import type { Ms, IntensityProvider } from '@practice/timeline'
import { createHeroConfigSlice } from '@practice/site/Infra'
import HeroSidebar from '../components/HeroGenerator/HeroSidebar.vue'
import HeroPreview from '../components/HeroGenerator/HeroPreview.vue'
import TimelinePanel from '../components/Timeline/TimelinePanel.vue'
import { ANIMATED_PRESETS, type AnimatedPreset } from '../modules/Timeline/Infra/animatedHeroData'
import {
  useSiteState,
  useSiteColorsBridge,
  useHeroScene,
  createSurfacePatterns,
} from '../composables/SiteBuilder'
import {
  isBaseLayerConfig,
  isSurfaceLayerConfig,
  findLayerInTree,
} from '@practice/section-visual'
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
// Animated Preset Selection
// ============================================================
const selectedPresetId = ref(ANIMATED_PRESETS[0]!.id)
const selectedPreset = computed((): AnimatedPreset =>
  ANIMATED_PRESETS.find((p) => p.id === selectedPresetId.value) ?? ANIMATED_PRESETS[0]!
)

function handleSelectAnimatedPreset(presetId: string) {
  selectedPresetId.value = presetId
  // Update colors when preset changes
  const preset = ANIMATED_PRESETS.find((p) => p.id === presetId)
  if (preset?.colorPreset) {
    hue.value = preset.colorPreset.brand.hue
    saturation.value = preset.colorPreset.brand.saturation
    value.value = preset.colorPreset.brand.value
    accentHue.value = preset.colorPreset.accent.hue
    accentSaturation.value = preset.colorPreset.accent.saturation
    accentValue.value = preset.colorPreset.accent.value
    foundationHue.value = preset.colorPreset.foundation.hue
    foundationSaturation.value = preset.colorPreset.foundation.saturation
    foundationValue.value = preset.colorPreset.foundation.value
  }
}

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
    if (type === 'effect') {
      // Find layer directly from layerId (selectedLayer.value may not be updated yet)
      const layer = findLayerInTree(layers.value, layerId)
      // Only Base and Surface layers support effects
      if (layer && (isBaseLayerConfig(layer) || isSurfaceLayerConfig(layer))) {
        heroScene.filter.effectManager.selectLayer(layer.id)
      }
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
// Initialize on mount
// ============================================================
onMounted(async () => {
  // Load layout presets
  await heroScene.preset.loadPresets()

  // Set animated config directly (bypasses fromHeroViewConfig which can't handle bindings)
  heroScene.usecase.heroViewRepository.set(selectedPreset.value.createConfig())

  // Apply initial color preset
  const initialPreset = selectedPreset.value
  if (initialPreset.colorPreset) {
    hue.value = initialPreset.colorPreset.brand.hue
    saturation.value = initialPreset.colorPreset.brand.saturation
    value.value = initialPreset.colorPreset.brand.value
    accentHue.value = initialPreset.colorPreset.accent.hue
    accentSaturation.value = initialPreset.colorPreset.accent.saturation
    accentValue.value = initialPreset.colorPreset.accent.value
    foundationHue.value = initialPreset.colorPreset.foundation.hue
    foundationSaturation.value = initialPreset.colorPreset.foundation.saturation
    foundationValue.value = initialPreset.colorPreset.foundation.value
  }

  // Wait for next tick to ensure TimelinePanel is fully mounted and refs are ready
  await nextTick()

  // Initialize preview canvas (after TimelinePanel mounts so paramResolver is available)
  await heroScene.renderer.initPreview(heroPreviewRef.value?.canvasRef)
})

// Watch for preset changes to update config
watch(selectedPresetId, async () => {
  // Update hero config when preset changes
  heroScene.usecase.heroViewRepository.set(selectedPreset.value.createConfig())
  // Re-render scene
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
          :foreground-config="heroScene.foreground.foregroundConfig.value"
          :title-color="heroScene.foreground.foregroundTitleColor.value"
          :body-color="heroScene.foreground.foregroundBodyColor.value"
          :element-colors="heroScene.foreground.foregroundElementColors.value"
          class="hero-preview"
        />
      </main>

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
        }"
        :mask="{
          colorKey1: heroScene.mask.maskColorKey1.value,
          colorKey2: heroScene.mask.maskColorKey2.value,
          surfacePatterns: maskSurfacePatterns,
          selectedSurfaceIndex: heroScene.pattern.selectedMidgroundTextureIndex.value,
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
        :image="null"
        :palette="primitivePalette"
        @update:foreground="handleForegroundUpdate"
        @update:background="handleBackgroundUpdate"
        @update:mask="handleMaskUpdate"
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
      <!-- Preset Selector -->
      <div class="preset-selector">
        <span class="preset-selector__label">Animation Preset:</span>
        <div class="preset-selector__buttons">
          <button
            v-for="preset in ANIMATED_PRESETS"
            :key="preset.id"
            class="preset-button"
            :class="{ 'preset-button--active': selectedPresetId === preset.id }"
            :title="preset.description"
            @click="handleSelectAnimatedPreset(preset.id)"
          >
            {{ preset.name }}
          </button>
        </div>
      </div>
      <TimelinePanel
        :key="selectedPresetId"
        ref="timelinePanelRef"
        :timeline="selectedPreset.timeline"
        :visible-duration="VISIBLE_DURATION"
        @update:frame-state="handleFrameStateUpdate"
      />
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

.preset-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: oklch(0.95 0.005 260);
  border-bottom: 1px solid oklch(0.88 0.01 260);
  flex-shrink: 0;
}

.preset-selector__label {
  font-size: 12px;
  font-weight: 500;
  color: oklch(0.45 0.02 260);
  white-space: nowrap;
}

.preset-selector__buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-button {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid oklch(0.80 0.01 260);
  border-radius: 6px;
  background: oklch(0.98 0.005 260);
  color: oklch(0.35 0.02 260);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-button:hover {
  background: oklch(0.94 0.01 260);
  border-color: oklch(0.70 0.02 260);
}

.preset-button--active {
  background: oklch(0.50 0.15 250);
  border-color: oklch(0.45 0.18 250);
  color: oklch(0.98 0.01 260);
}

.preset-button--active:hover {
  background: oklch(0.55 0.15 250);
}

.dark .preset-selector {
  background: oklch(0.15 0.02 260);
  border-bottom-color: oklch(0.25 0.02 260);
}

.dark .preset-selector__label {
  color: oklch(0.70 0.01 260);
}

.dark .preset-button {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.80 0.01 260);
}

.dark .preset-button:hover {
  background: oklch(0.25 0.02 260);
  border-color: oklch(0.40 0.02 260);
}

.dark .preset-button--active {
  background: oklch(0.50 0.15 250);
  border-color: oklch(0.55 0.18 250);
  color: oklch(0.98 0.01 260);
}
</style>

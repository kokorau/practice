<script setup lang="ts">
import type { RGBA } from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette, PrimitiveKey } from '../../../modules/SemanticColorPalette/Domain'
import type { LayerNode, GridPosition } from '../../../modules/HeroScene'
import type { ContrastAnalysisResult } from '../../../modules/ContrastChecker'
import type { PatternItem } from '../SurfaceSelector.vue'
import type { BackgroundSpecCreator } from '../MaskPatternThumbnail.vue'
import type { FilterType } from './EffectSettingsPanel.vue'
import type { MaskPatternItem } from './MaskSettingsPanel.vue'
import PanelHeader from './PanelHeader.vue'
import TextElementPanel from './TextElementPanel.vue'
import LayerSettingsPanel from './LayerSettingsPanel.vue'
import EffectSettingsPanel from './EffectSettingsPanel.vue'
import MaskSettingsPanel from './MaskSettingsPanel.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'

interface ForegroundElementConfig {
  id: string
  type: 'title' | 'description'
  visible: boolean
  position: GridPosition
  content: string
  fontId?: string
  fontSize?: number
  colorKey?: PrimitiveKey | 'auto'
}

interface FontPreset {
  id: string
  name: string
  family: string
}

type ProcessorType = 'effect' | 'mask' | 'processor' | null
type LayerVariant = 'base' | 'surface' | 'text' | 'model3d' | 'image' | null

const props = defineProps<{
  // Selection state
  selectedForegroundElement: ForegroundElementConfig | null
  selectedLayer: LayerNode | null | undefined
  selectedLayerVariant: LayerVariant
  selectedProcessorType: ProcessorType

  // Palette
  primitivePalette: PrimitivePalette

  // Text element props
  titleContrastResult: ContrastAnalysisResult | null
  descriptionContrastResult: ContrastAnalysisResult | null
  foregroundTitleAutoKey: PrimitiveKey | null
  foregroundBodyAutoKey: PrimitiveKey | null
  selectedElementColorKey: PrimitiveKey | 'auto'
  selectedElementContent: string
  selectedElementPosition: GridPosition
  selectedElementFontSize: number
  selectedFontPreset: FontPreset | null
  selectedFontDisplayName: string

  // Background layer props
  backgroundColorKey1: PrimitiveKey
  backgroundColorKey2: PrimitiveKey | 'auto'
  customBackgroundImage: string | null
  customBackgroundFileName: string | null
  backgroundPatterns: PatternItem[]
  selectedBackgroundIndex: number | null
  isLoadingRandomBackground: boolean
  currentBackgroundSurfaceSchema: ObjectSchema | null
  customBackgroundSurfaceParams: Record<string, unknown> | null

  // Surface layer props
  maskColorKey1: PrimitiveKey | 'auto'
  maskColorKey2: PrimitiveKey | 'auto'
  customMaskImage: string | null
  customMaskFileName: string | null
  maskSurfacePatterns: PatternItem[]
  selectedMidgroundTextureIndex: number | null
  isLoadingRandomMask: boolean
  currentSurfaceSchema: ObjectSchema | null
  customSurfaceParams: Record<string, unknown> | null

  // Effect processor props
  selectedFilterType: FilterType
  vignetteConfig: Record<string, unknown>
  chromaticConfig: Record<string, unknown>
  dotHalftoneConfig: Record<string, unknown>
  lineHalftoneConfig: Record<string, unknown>

  // Mask processor props
  maskPatterns: MaskPatternItem[]
  selectedMaskIndex: number | null
  currentMaskShapeSchema: ObjectSchema | null
  customMaskShapeParams: Record<string, unknown> | null
  maskOuterColor: RGBA
  maskInnerColor: RGBA
  createBackgroundThumbnailSpec: BackgroundSpecCreator
}>()

const emit = defineEmits<{
  // Export
  'export-preset': []

  // Text element updates
  'update:selectedElementColorKey': [value: PrimitiveKey | 'auto']
  'update:selectedElementContent': [value: string]
  'update:selectedElementPosition': [value: GridPosition]
  'update:selectedElementFontSize': [value: number]
  'open-font-panel': []

  // Background updates
  'update:backgroundColorKey1': [value: PrimitiveKey]
  'update:backgroundColorKey2': [value: PrimitiveKey | 'auto']
  'upload-background-image': [file: File]
  'clear-background-image': []
  'select-background-pattern': [index: number | null]
  'load-random-background': []
  'update:backgroundSurfaceParams': [value: Record<string, unknown>]

  // Surface updates
  'update:maskColorKey1': [value: PrimitiveKey | 'auto']
  'update:maskColorKey2': [value: PrimitiveKey | 'auto']
  'upload-mask-image': [file: File]
  'clear-mask-image': []
  'select-mask-pattern': [index: number | null]
  'load-random-mask': []
  'update:surfaceParams': [value: Record<string, unknown>]

  // Effect updates
  'update:selectedFilterType': [value: FilterType]
  'update:vignetteConfig': [value: Record<string, unknown>]
  'update:chromaticConfig': [value: Record<string, unknown>]
  'update:dotHalftoneConfig': [value: Record<string, unknown>]
  'update:lineHalftoneConfig': [value: Record<string, unknown>]

  // Mask updates
  'update:selectedMaskIndex': [value: number]
  'update:maskShapeParams': [value: Record<string, unknown>]
}>()

// Check if selected layer is a background layer based on its ID
const isBackgroundLayer = (): boolean => {
  const layerId = props.selectedLayer?.id
  if (!layerId) return false
  return layerId.startsWith('background')
}

// Handle surface params update based on which layer is selected
const handleSurfaceParamsUpdate = (value: Record<string, unknown>) => {
  if (isBackgroundLayer()) {
    emit('update:backgroundSurfaceParams', value)
  } else {
    emit('update:surfaceParams', value)
  }
}

// Compute panel title based on selection state
const panelTitle = (): string => {
  if (props.selectedForegroundElement?.type === 'title') return 'Title'
  if (props.selectedForegroundElement?.type === 'description') return 'Description'
  if (props.selectedProcessorType === 'processor') return 'Processor'
  if (props.selectedProcessorType === 'effect') return 'Effect Settings'
  if (props.selectedProcessorType === 'mask') return 'Mask Settings'
  if (isBackgroundLayer()) return 'Background'
  if (props.selectedLayerVariant === 'surface') return 'Surface'
  return 'Properties'
}
</script>

<template>
  <aside class="hero-right-panel">
    <PanelHeader
      :title="panelTitle()"
      @export="emit('export-preset')"
    />

    <div class="property-panel">
      <!-- Title Settings -->
      <TextElementPanel
        v-if="selectedForegroundElement?.type === 'title'"
        element-type="title"
        :contrast-result="titleContrastResult"
        :auto-color-key="foregroundTitleAutoKey"
        :primitive-palette="primitivePalette"
        :color-key="selectedElementColorKey"
        :content="selectedElementContent"
        :position="selectedElementPosition"
        :font-size="selectedElementFontSize"
        :font-preset="selectedFontPreset"
        :font-display-name="selectedFontDisplayName"
        @update:color-key="emit('update:selectedElementColorKey', $event)"
        @update:content="emit('update:selectedElementContent', $event)"
        @update:position="emit('update:selectedElementPosition', $event)"
        @update:font-size="emit('update:selectedElementFontSize', $event)"
        @open-font-panel="emit('open-font-panel')"
      />

      <!-- Description Settings -->
      <TextElementPanel
        v-else-if="selectedForegroundElement?.type === 'description'"
        element-type="description"
        :contrast-result="descriptionContrastResult"
        :auto-color-key="foregroundBodyAutoKey"
        :primitive-palette="primitivePalette"
        :color-key="selectedElementColorKey"
        :content="selectedElementContent"
        :position="selectedElementPosition"
        :font-size="selectedElementFontSize"
        :font-preset="selectedFontPreset"
        :font-display-name="selectedFontDisplayName"
        @update:color-key="emit('update:selectedElementColorKey', $event)"
        @update:content="emit('update:selectedElementContent', $event)"
        @update:position="emit('update:selectedElementPosition', $event)"
        @update:font-size="emit('update:selectedElementFontSize', $event)"
        @open-font-panel="emit('open-font-panel')"
      />

      <!-- Background (Base Layer) Settings -->
      <LayerSettingsPanel
        v-else-if="!selectedProcessorType && isBackgroundLayer()"
        key="base-layer-settings"
        layer-type="base"
        :primitive-palette="primitivePalette"
        :color-key1="backgroundColorKey1"
        :color-key2="backgroundColorKey2"
        :show-auto1="false"
        :show-auto2="true"
        :custom-image="customBackgroundImage"
        :custom-file-name="customBackgroundFileName"
        :patterns="backgroundPatterns"
        :selected-index="selectedBackgroundIndex"
        :is-loading-random="isLoadingRandomBackground"
        :surface-schema="currentBackgroundSurfaceSchema"
        :surface-params="customBackgroundSurfaceParams"
        @update:color-key1="emit('update:backgroundColorKey1', $event as PrimitiveKey)"
        @update:color-key2="emit('update:backgroundColorKey2', $event)"
        @upload-image="emit('upload-background-image', $event)"
        @clear-image="emit('clear-background-image')"
        @select-pattern="emit('select-background-pattern', $event)"
        @load-random="emit('load-random-background')"
        @update:surface-params="(value) => handleSurfaceParamsUpdate(value)"
      />

      <!-- Surface Layer Settings -->
      <LayerSettingsPanel
        v-else-if="!selectedProcessorType && selectedLayerVariant === 'surface' && !isBackgroundLayer()"
        key="surface-layer-settings"
        layer-type="surface"
        :primitive-palette="primitivePalette"
        :color-key1="maskColorKey1"
        :color-key2="maskColorKey2"
        :show-auto1="true"
        :show-auto2="true"
        :custom-image="customMaskImage"
        :custom-file-name="customMaskFileName"
        :patterns="maskSurfacePatterns"
        :selected-index="selectedMidgroundTextureIndex"
        :is-loading-random="isLoadingRandomMask"
        :surface-schema="currentSurfaceSchema"
        :surface-params="customSurfaceParams"
        @update:color-key1="emit('update:maskColorKey1', $event)"
        @update:color-key2="emit('update:maskColorKey2', $event)"
        @upload-image="emit('upload-mask-image', $event)"
        @clear-image="emit('clear-mask-image')"
        @select-pattern="emit('select-mask-pattern', $event)"
        @load-random="emit('load-random-mask')"
        @update:surface-params="(value) => handleSurfaceParamsUpdate(value)"
      />

      <!-- Effect Processor Settings -->
      <EffectSettingsPanel
        v-else-if="selectedProcessorType === 'effect'"
        :selected-filter-type="selectedFilterType"
        :vignette-config="vignetteConfig"
        :chromatic-config="chromaticConfig"
        :dot-halftone-config="dotHalftoneConfig"
        :line-halftone-config="lineHalftoneConfig"
        @update:selected-filter-type="emit('update:selectedFilterType', $event)"
        @update:vignette-config="emit('update:vignetteConfig', $event)"
        @update:chromatic-config="emit('update:chromaticConfig', $event)"
        @update:dot-halftone-config="emit('update:dotHalftoneConfig', $event)"
        @update:line-halftone-config="emit('update:lineHalftoneConfig', $event)"
      />

      <!-- Mask Processor Settings -->
      <MaskSettingsPanel
        v-else-if="selectedProcessorType === 'mask'"
        :mask-patterns="maskPatterns"
        :selected-mask-index="selectedMaskIndex"
        :mask-shape-schema="currentMaskShapeSchema"
        :mask-shape-params="customMaskShapeParams"
        :mask-outer-color="maskOuterColor"
        :mask-inner-color="maskInnerColor"
        :create-background-thumbnail-spec="createBackgroundThumbnailSpec"
        @update:selected-mask-index="emit('update:selectedMaskIndex', $event)"
        @update:mask-shape-params="emit('update:maskShapeParams', $event)"
      />

      <!-- Processor placeholder -->
      <PlaceholderPanel
        v-else-if="selectedProcessorType === 'processor'"
        type="processor"
      />

      <!-- Layer placeholder (non-base, non-surface layers) -->
      <PlaceholderPanel
        v-else-if="selectedLayer && selectedLayerVariant !== 'base' && selectedLayerVariant !== 'surface'"
        type="layer"
        :layer-name="selectedLayer.name"
      />

      <!-- Empty state -->
      <PlaceholderPanel
        v-else
        type="empty"
      />
    </div>
  </aside>
</template>

<style scoped>
.hero-right-panel {
  position: relative;
  width: 16rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: oklch(0.94 0.01 260);
  border-left: 1px solid oklch(0.88 0.01 260);
  padding: 1rem;
  overflow-y: auto;
}

:global(.dark) .hero-right-panel {
  background: oklch(0.18 0.02 260);
  border-left-color: oklch(0.25 0.02 260);
}

.property-panel {
  flex: 1;
  overflow-y: auto;
}
</style>

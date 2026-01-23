<script setup lang="ts">
import type { WritableComputedRef } from 'vue'
import type { RGBA } from '@practice/texture'
import type { ObjectSchema } from '@practice/schema'
import type { PrimitivePalette, PrimitiveKey } from '@practice/semantic-color-palette/Domain'
import type { LayerNodeConfig, GridPosition, FilterType, SurfaceLayerNodeConfig, BaseLayerNodeConfig, ProcessorNodeConfig } from '@practice/section-visual'
import { isSurfaceLayerConfig, isBaseLayerConfig, isProcessorLayerConfig, isSingleEffectConfig } from '@practice/section-visual'
import type { ContrastAnalysisResult } from '../../../modules/ContrastChecker'
import type { PatternItem } from '../SurfaceSelector.vue'
import type { BackgroundSpecCreator } from '../MaskPatternThumbnail.vue'
import type { MaskPatternItem } from './MaskSettingsPanel.vue'
import type {
  VignetteConfigParams,
  ChromaticConfigParams,
  DotHalftoneConfigParams,
  LineHalftoneConfigParams,
  BlurConfigParams,
} from '../../../composables/useFilterEditor'
import { computed } from 'vue'
import PanelHeader, { type BreadcrumbItem } from './PanelHeader.vue'
import TextElementPanel from './TextElementPanel.vue'
import LayerSettingsPanel from './LayerSettingsPanel.vue'
import ImageLayerSettingsPanel from './ImageLayerSettingsPanel.vue'
import EffectorSettingsPanel from './EffectorSettingsPanel.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'

// ============================================================
// Grouped Props Types
// ============================================================

interface ForegroundElementConfig {
  id: string
  type: 'title' | 'description'
  visible: boolean
  position: GridPosition
  content: string
  fontId?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  colorKey?: PrimitiveKey | 'auto'
}

interface FontPreset {
  id: string
  name: string
  family: string
}

type ProcessorType = 'effect' | 'mask' | 'processor' | null
type LayerVariant = 'base' | 'surface' | 'text' | 'model3d' | 'image' | 'processor' | null

/** Selection state */
interface SelectionProps {
  foregroundElement: ForegroundElementConfig | null
  layer: LayerNodeConfig | null | undefined
  layerVariant: LayerVariant
  processorType: ProcessorType
}

/** Foreground/text element state */
interface ForegroundProps {
  titleAutoKey: PrimitiveKey | null
  bodyAutoKey: PrimitiveKey | null
  elementColorKey: PrimitiveKey | 'auto'
  elementContent: string
  elementPosition: GridPosition
  elementFontSize: number
  elementFontWeight: number
  elementLetterSpacing: number
  elementLineHeight: number
  fontPreset: FontPreset | null
  fontDisplayName: string
}

/** Contrast analysis results */
interface ContrastProps {
  title: ContrastAnalysisResult | null
  description: ContrastAnalysisResult | null
}

/** Background layer state */
interface BackgroundProps {
  colorKey1: PrimitiveKey
  colorKey2: PrimitiveKey | 'auto'
  patterns: PatternItem[]
  selectedIndex: number | null
  surfaceSchema: ObjectSchema | null
  surfaceParams: Record<string, unknown> | null
}

/** Mask/surface layer state */
interface MaskProps {
  colorKey1: PrimitiveKey | 'auto'
  colorKey2: PrimitiveKey | 'auto'
  surfacePatterns: PatternItem[]
  selectedSurfaceIndex: number | null
  surfaceSchema: ObjectSchema | null
  surfaceParams: Record<string, unknown> | null
  shapePatterns: MaskPatternItem[]
  selectedShapeIndex: number | null
  shapeSchema: ObjectSchema | null
  shapeParams: Record<string, unknown> | null
  outerColor: RGBA
  innerColor: RGBA
  createBackgroundThumbnailSpec: BackgroundSpecCreator
}

/** Filter/effect state - WritableComputedRef for direct binding */
interface FilterProps {
  selectedType: WritableComputedRef<FilterType>
  vignetteConfig: WritableComputedRef<VignetteConfigParams>
  chromaticConfig: WritableComputedRef<ChromaticConfigParams>
  dotHalftoneConfig: WritableComputedRef<DotHalftoneConfigParams>
  lineHalftoneConfig: WritableComputedRef<LineHalftoneConfigParams>
  blurConfig: WritableComputedRef<BlurConfigParams>
}

/** Image layer state */
interface ImageProps {
  layerId: string
  imageId: string
  mode: 'cover' | 'positioned'
  position: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    opacity?: number
  } | undefined
  imageUrl: string | null
  isLoading: boolean
}

// ============================================================
// Props (Grouped)
// ============================================================

const props = defineProps<{
  /** Selection state */
  selection: SelectionProps
  /** Foreground/text element state */
  foreground: ForegroundProps
  /** Contrast analysis results */
  contrast: ContrastProps
  /** Background layer state */
  background: BackgroundProps
  /** Mask/surface layer state */
  mask: MaskProps
  /** Filter/effect state */
  filter: FilterProps
  /** Image layer state */
  image: ImageProps | null
  /** Primitive color palette */
  palette: PrimitivePalette
}>()

// ============================================================
// Emits (Grouped)
// ============================================================

const emit = defineEmits<{
  // Export
  'export-preset': []

  // Text element updates
  'update:foreground': [key: keyof ForegroundProps, value: unknown]
  'open-font-panel': []

  // Background updates
  'update:background': [key: keyof BackgroundProps | 'selectPattern', value: unknown]

  // Mask updates
  'update:mask': [key: keyof MaskProps | 'selectPattern', value: unknown]

  // Image layer updates
  'update:image': [key: 'uploadImage' | 'clearImage' | 'loadRandom' | 'mode' | 'position', value: unknown]
}>()

// ============================================================
// Computed Helpers
// ============================================================

// Check if selected layer is a background layer based on its variant
const isBackgroundLayer = (): boolean => {
  return props.selection.layerVariant === 'base'
}

// Handle surface params update based on which layer is selected
const handleSurfaceParamsUpdate = (value: Record<string, unknown>) => {
  if (isBackgroundLayer()) {
    emit('update:background', 'surfaceParams', value)
  } else {
    emit('update:mask', 'surfaceParams', value)
  }
}

// Helper to get surface type from layer
const getSurfaceType = (layer: LayerNodeConfig | null | undefined): string | null => {
  if (!layer) return null
  if (isSurfaceLayerConfig(layer)) {
    return (layer as SurfaceLayerNodeConfig).surface.id
  }
  if (isBaseLayerConfig(layer)) {
    return (layer as BaseLayerNodeConfig).surface.id
  }
  return null
}

// Helper to get effect type from processor layer
const getEffectType = (layer: LayerNodeConfig | null | undefined): string | null => {
  if (!layer || !isProcessorLayerConfig(layer)) return null
  const processor = layer as ProcessorNodeConfig
  const effectMod = processor.modifiers.find((m) => isSingleEffectConfig(m))
  if (effectMod && isSingleEffectConfig(effectMod)) {
    return effectMod.id
  }
  return null
}

// Helper to get mask shape type from processor layer
const getMaskShapeType = (layer: LayerNodeConfig | null | undefined): string | null => {
  if (!layer || !isProcessorLayerConfig(layer)) return null
  const processor = layer as ProcessorNodeConfig
  const maskMod = processor.modifiers.find((m) => m.type === 'mask')
  if (maskMod && maskMod.type === 'mask') {
    return maskMod.shape.id
  }
  return null
}

// Compute breadcrumbs based on selection state
const breadcrumbs = computed((): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = []

  // Foreground elements
  if (props.selection.foregroundElement?.type === 'title') {
    items.push({ label: 'Title' })
    return items
  }
  if (props.selection.foregroundElement?.type === 'description') {
    items.push({ label: 'Description' })
    return items
  }

  // Layer-based selections
  const layer = props.selection.layer
  if (!layer) {
    items.push({ label: 'Properties' })
    return items
  }

  // Add layer name as first item
  items.push({ label: layer.name })

  // Processor type selected (effect or mask)
  if (props.selection.processorType === 'effect') {
    const effectType = getEffectType(layer)
    if (effectType) {
      items.push({ label: effectType })
    }
    return items
  }

  if (props.selection.processorType === 'mask') {
    const shapeType = getMaskShapeType(layer)
    if (shapeType) {
      items.push({ label: shapeType })
    }
    return items
  }

  if (props.selection.processorType === 'processor') {
    items.push({ label: 'Processor' })
    return items
  }

  // Surface or base layer
  const surfaceType = getSurfaceType(layer)
  if (surfaceType) {
    items.push({ label: surfaceType })
  }

  // Image layer
  if (props.selection.layerVariant === 'image') {
    items.push({ label: 'Image' })
  }

  return items
})
</script>

<template>
  <aside class="hero-right-panel">
    <PanelHeader
      :breadcrumbs="breadcrumbs"
      @export="emit('export-preset')"
    />

    <div class="property-panel">
      <!-- Title Settings -->
      <TextElementPanel
        v-if="selection.foregroundElement?.type === 'title'"
        element-type="title"
        :contrast-result="contrast.title"
        :auto-color-key="foreground.titleAutoKey"
        :primitive-palette="palette"
        :color-key="foreground.elementColorKey"
        :content="foreground.elementContent"
        :position="foreground.elementPosition"
        :font-size="foreground.elementFontSize"
        :font-weight="foreground.elementFontWeight"
        :letter-spacing="foreground.elementLetterSpacing"
        :line-height="foreground.elementLineHeight"
        :font-preset="foreground.fontPreset"
        :font-display-name="foreground.fontDisplayName"
        @update:color-key="emit('update:foreground', 'elementColorKey', $event)"
        @update:content="emit('update:foreground', 'elementContent', $event)"
        @update:position="emit('update:foreground', 'elementPosition', $event)"
        @update:font-size="emit('update:foreground', 'elementFontSize', $event)"
        @update:font-weight="emit('update:foreground', 'elementFontWeight', $event)"
        @update:letter-spacing="emit('update:foreground', 'elementLetterSpacing', $event)"
        @update:line-height="emit('update:foreground', 'elementLineHeight', $event)"
        @open-font-panel="emit('open-font-panel')"
      />

      <!-- Description Settings -->
      <TextElementPanel
        v-else-if="selection.foregroundElement?.type === 'description'"
        element-type="description"
        :contrast-result="contrast.description"
        :auto-color-key="foreground.bodyAutoKey"
        :primitive-palette="palette"
        :color-key="foreground.elementColorKey"
        :content="foreground.elementContent"
        :position="foreground.elementPosition"
        :font-size="foreground.elementFontSize"
        :font-weight="foreground.elementFontWeight"
        :letter-spacing="foreground.elementLetterSpacing"
        :line-height="foreground.elementLineHeight"
        :font-preset="foreground.fontPreset"
        :font-display-name="foreground.fontDisplayName"
        @update:color-key="emit('update:foreground', 'elementColorKey', $event)"
        @update:content="emit('update:foreground', 'elementContent', $event)"
        @update:position="emit('update:foreground', 'elementPosition', $event)"
        @update:font-size="emit('update:foreground', 'elementFontSize', $event)"
        @update:font-weight="emit('update:foreground', 'elementFontWeight', $event)"
        @update:letter-spacing="emit('update:foreground', 'elementLetterSpacing', $event)"
        @update:line-height="emit('update:foreground', 'elementLineHeight', $event)"
        @open-font-panel="emit('open-font-panel')"
      />

      <!-- Background (Base Layer) Settings -->
      <LayerSettingsPanel
        v-else-if="!selection.processorType && isBackgroundLayer()"
        key="base-layer-settings"
        layer-type="base"
        :primitive-palette="palette"
        :color-key1="background.colorKey1"
        :color-key2="background.colorKey2"
        :show-auto1="false"
        :show-auto2="true"
        :patterns="background.patterns"
        :selected-index="background.selectedIndex"
        :surface-schema="background.surfaceSchema"
        :surface-params="background.surfaceParams"
        @update:color-key1="emit('update:background', 'colorKey1', $event)"
        @update:color-key2="emit('update:background', 'colorKey2', $event)"
        @select-pattern="emit('update:background', 'selectPattern', $event)"
        @update:surface-params="handleSurfaceParamsUpdate"
      />

      <!-- Surface Layer Settings -->
      <LayerSettingsPanel
        v-else-if="!selection.processorType && selection.layerVariant === 'surface' && !isBackgroundLayer()"
        key="surface-layer-settings"
        layer-type="surface"
        :primitive-palette="palette"
        :color-key1="mask.colorKey1"
        :color-key2="mask.colorKey2"
        :show-auto1="true"
        :show-auto2="true"
        :patterns="mask.surfacePatterns"
        :selected-index="mask.selectedSurfaceIndex"
        :surface-schema="mask.surfaceSchema"
        :surface-params="mask.surfaceParams"
        @update:color-key1="emit('update:mask', 'colorKey1', $event)"
        @update:color-key2="emit('update:mask', 'colorKey2', $event)"
        @select-pattern="emit('update:mask', 'selectPattern', $event)"
        @update:surface-params="handleSurfaceParamsUpdate"
      />

      <!-- Image Layer Settings -->
      <ImageLayerSettingsPanel
        v-else-if="!selection.processorType && selection.layerVariant === 'image' && image"
        key="image-layer-settings"
        :layer-id="image.layerId"
        :image-id="image.imageId"
        :mode="image.mode"
        :position="image.position"
        :image-url="image.imageUrl"
        :is-loading="image.isLoading"
        @upload-image="emit('update:image', 'uploadImage', $event)"
        @clear-image="emit('update:image', 'clearImage', null)"
        @load-random="emit('update:image', 'loadRandom', $event)"
        @update:mode="emit('update:image', 'mode', $event)"
        @update:position="emit('update:image', 'position', $event)"
      />

      <!-- Effector (Effect/Mask) Settings -->
      <EffectorSettingsPanel
        v-else-if="selection.processorType === 'effect' || selection.processorType === 'mask'"
        :effector-type="selection.processorType"
        :filter-props="filter"
        :mask-props="{
          shapePatterns: mask.shapePatterns,
          selectedShapeIndex: mask.selectedShapeIndex,
          shapeSchema: mask.shapeSchema,
          shapeParams: mask.shapeParams,
          outerColor: mask.outerColor,
          innerColor: mask.innerColor,
          createBackgroundThumbnailSpec: mask.createBackgroundThumbnailSpec,
        }"
        @update:selected-mask-index="emit('update:mask', 'selectedShapeIndex', $event)"
        @update:mask-shape-params="emit('update:mask', 'shapeParams', $event)"
      />

      <!-- Processor placeholder -->
      <PlaceholderPanel
        v-else-if="selection.processorType === 'processor'"
        type="processor"
      />

      <!-- Layer placeholder (non-base, non-surface, non-image layers) -->
      <PlaceholderPanel
        v-else-if="selection.layer && selection.layerVariant !== 'base' && selection.layerVariant !== 'surface' && selection.layerVariant !== 'image'"
        type="layer"
        :layer-name="selection.layer.name"
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

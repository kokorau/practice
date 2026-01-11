<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
import type { LayerNode, HeroPrimitiveKey } from '../modules/HeroScene'
import {
  createGroupLayerNode,
  createSurfaceLayerNode,
  createTextLayerNode,
  createModel3DLayerNode,
  createEffectProcessor,
  createMaskProcessor,
  findLayerNode,
  updateLayerNode,
  removeNode,
  moveLayerNode as moveLayerNodeInTree,
  isLayer,
  isGroup,
  type DropPosition,
  type LayerNodeType,
} from '../modules/HeroScene'
import FloatingPanel from '../components/HeroGenerator/FloatingPanel.vue'
import SurfaceSelector from '../components/HeroGenerator/SurfaceSelector.vue'
import FontSelector from '../components/HeroGenerator/FontSelector.vue'
import { getGoogleFontPresets } from '@practice/font'
import PrimitiveColorPicker from '../components/HeroGenerator/PrimitiveColorPicker.vue'
import MaskPatternThumbnail from '../components/HeroGenerator/MaskPatternThumbnail.vue'
import SchemaFields from '../components/SchemaFields.vue'
import {
  VignetteEffectSchema,
  ChromaticAberrationEffectSchema,
  DotHalftoneEffectSchema,
  LineHalftoneEffectSchema,
  createForegroundElementUsecase,
} from '../modules/HeroScene'
import {
  useSiteColors,
  useHeroScene,
  type GridPosition,
} from '../composables/SiteBuilder'
import { createGradientGrainSpec, createDefaultGradientGrainParams, type DepthMapType } from '@practice/texture'
import type { ColorPreset } from '../modules/SemanticColorPalette/Domain'
import { checkContrastAsync, type ContrastAnalysisResult } from '../modules/ContrastChecker'
import { useLayerSelection } from '../composables/useLayerSelection'
import { RightPropertyPanel } from '../components/HeroGenerator/RightPropertyPanel'
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
const backgroundPatterns = computed(() => {
  const textureItems = texturePatterns.map((p) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      p.createSpec(textureColor1.value, textureColor2.value, viewport),
  }))

  // Add gradient grain option
  const defaultGradientParams = createDefaultGradientGrainParams()
  const defaultCurvePoints = [0, 1/36, 4/36, 9/36, 16/36, 25/36, 1]
  const gradientGrainItem = {
    label: 'Gradient Grain',
    type: 'gradientGrain',
    createSpec: (viewport: { width: number; height: number }) =>
      createGradientGrainSpec({
        ...defaultGradientParams,
        depthMapType: defaultGradientParams.depthMapType as DepthMapType,
        colorA: textureColor1.value,
        colorB: textureColor2.value,
        curvePoints: defaultCurvePoints,
      }, viewport),
  }

  return [...textureItems, gradientGrainItem]
})

const maskSurfacePatterns = computed(() => {
  const textureItems = midgroundTexturePatterns.map((p) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      createMidgroundThumbnailSpec(p, midgroundTextureColor1.value, midgroundTextureColor2.value, viewport),
  }))

  // Add gradient grain option (same as background)
  const defaultGradientParams = createDefaultGradientGrainParams()
  const defaultCurvePoints = [0, 1/36, 4/36, 9/36, 16/36, 25/36, 1]
  const gradientGrainItem = {
    label: 'Gradient Grain',
    type: 'gradientGrain',
    createSpec: (viewport: { width: number; height: number }) =>
      createGradientGrainSpec({
        ...defaultGradientParams,
        depthMapType: defaultGradientParams.depthMapType as DepthMapType,
        colorA: midgroundTextureColor1.value,
        colorB: midgroundTextureColor2.value,
        curvePoints: defaultCurvePoints,
      }, viewport),
  }

  return [...textureItems, gradientGrainItem]
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
const selectedTextLayerId = ref<string | null>(null)

// Get selected text layer config
const selectedTextLayerConfig = computed(() => {
  if (!selectedTextLayerId.value) return null
  const layer = editorState.value.canvasLayers.find(
    l => l.id === selectedTextLayerId.value && l.config.type === 'text'
  )
  if (!layer || layer.config.type !== 'text') return null
  return layer.config
})

// Update text layer config (wrapper that handles position updates and calls heroUpdateTextLayerConfig)
const updateTextLayerConfig = (updates: Partial<{
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
  x: number
  y: number
  anchor: string
  rotation: number
}>) => {
  if (!selectedTextLayerId.value) return
  const config = selectedTextLayerConfig.value
  if (!config) return

  // Build the actual config updates, handling position fields specially
  const configUpdates: Record<string, unknown> = {}

  if (updates.text !== undefined) configUpdates.text = updates.text
  if (updates.fontFamily !== undefined) configUpdates.fontFamily = updates.fontFamily
  if (updates.fontSize !== undefined) configUpdates.fontSize = updates.fontSize
  if (updates.fontWeight !== undefined) configUpdates.fontWeight = updates.fontWeight
  if (updates.letterSpacing !== undefined) configUpdates.letterSpacing = updates.letterSpacing
  if (updates.lineHeight !== undefined) configUpdates.lineHeight = updates.lineHeight
  if (updates.color !== undefined) configUpdates.color = updates.color
  if (updates.rotation !== undefined) configUpdates.rotation = updates.rotation

  // Handle position updates - need to merge with existing position
  if (updates.x !== undefined || updates.y !== undefined || updates.anchor !== undefined) {
    configUpdates.position = {
      x: updates.x ?? config.position.x,
      y: updates.y ?? config.position.y,
      anchor: updates.anchor ?? config.position.anchor,
    }
  }

  // Call the composable's updateTextLayerConfig which triggers renderScene
  heroUpdateTextLayerConfig(selectedTextLayerId.value, configUpdates)
}

const closeSection = () => {
  activeSection.value = null
}

// ============================================================
// Foreground Element Usecase
// ============================================================
const selectedForegroundElementId = ref<string | null>(null)

const foregroundUsecase = createForegroundElementUsecase({
  foregroundConfig: {
    get: () => foregroundConfig.value,
    set: (config) => { foregroundConfig.value = config },
  },
  selection: {
    getSelectedId: () => selectedForegroundElementId.value,
    setSelectedId: (id) => { selectedForegroundElementId.value = id },
    clearCanvasSelection: () => clearSelection(),
  },
})

// Get selected foreground element (computed wrapper for reactivity)
const selectedForegroundElement = computed(() => foregroundUsecase.getSelectedElement())

// Handler functions delegating to usecase
const handleSelectForegroundElement = (elementId: string) => {
  foregroundUsecase.selectElement(elementId)
}

const handleAddForegroundElement = (type: 'title' | 'description') => {
  foregroundUsecase.addElement(type)
}

const handleRemoveForegroundElement = (elementId: string) => {
  foregroundUsecase.removeElement(elementId)
}

// ============================================================
// Selected Foreground Element Config (computed with setter)
// ============================================================

const selectedElementPosition = computed({
  get: () => selectedForegroundElement.value?.position ?? 'middle-center',
  set: (pos: GridPosition) => {
    foregroundUsecase.updateSelectedElement({ position: pos })
  },
})

const selectedElementFont = computed({
  get: () => selectedForegroundElement.value?.fontId,
  set: (fontId: string | undefined) => {
    foregroundUsecase.updateSelectedElement({ fontId })
  },
})

const selectedElementFontSize = computed({
  get: () => selectedForegroundElement.value?.fontSize ?? (selectedForegroundElement.value?.type === 'title' ? 3 : 1),
  set: (fontSize: number) => {
    foregroundUsecase.updateSelectedElement({ fontSize })
  },
})

const selectedElementContent = computed({
  get: () => selectedForegroundElement.value?.content ?? '',
  set: (content: string) => {
    foregroundUsecase.updateSelectedElement({ content })
  },
})

const selectedElementColorKey = computed({
  get: (): HeroPrimitiveKey | 'auto' => (selectedForegroundElement.value?.colorKey ?? 'auto') as HeroPrimitiveKey | 'auto',
  set: (colorKey: HeroPrimitiveKey | 'auto') => {
    foregroundUsecase.updateSelectedElement({ colorKey })
  },
})

// ============================================================
// Font Panel State
// ============================================================
const isFontPanelOpen = ref(false)
const allFontPresets = computed(() => getGoogleFontPresets({ excludeIconFonts: true }))

const selectedFontPreset = computed(() => {
  const fontId = selectedElementFont.value
  if (!fontId) return null
  return allFontPresets.value.find(p => p.id === fontId) ?? null
})

const selectedFontDisplayName = computed(() => {
  return selectedFontPreset.value?.name ?? 'System Default'
})

const openFontPanel = () => {
  isFontPanelOpen.value = true
}

const closeFontPanel = () => {
  isFontPanelOpen.value = false
}

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

const layers = ref<LayerNode[]>([
  createGroupLayerNode(
    'background-group',
    [
      createSurfaceLayerNode(
        'background-surface',
        { type: 'solid', color: 'BN1' },
        {
          name: 'Surface',
          processors: [createEffectProcessor()],
        }
      ),
    ],
    { name: 'Background', expanded: true }
  ),
  createGroupLayerNode(
    'main-group',
    [
      createSurfaceLayerNode(
        'surface-1',
        { type: 'solid', color: 'B' },
        {
          name: 'Surface',
          processors: [createEffectProcessor(), createMaskProcessor()],
        }
      ),
    ],
    { name: 'Main Group', expanded: true }
  ),
])

// Get selected layer for right panel display
const selectedLayer = computed(() => {
  if (!selectedLayerId.value) return null
  return findLayerNode(layers.value, selectedLayerId.value)
})

// Helper to get layer variant (for Layer nodes)
const selectedLayerVariant = computed(() => {
  const layer = selectedLayer.value
  if (!layer || !isLayer(layer)) return null
  return layer.variant
})

const mapLayerIdToSceneLayerId = (uiLayerId: string): string => {
  if (uiLayerId === 'base') return 'base-layer'
  // Surface layers map to mask-layer in the scene (LAYER_IDS.MASK)
  if (uiLayerId.startsWith('surface')) return 'mask-layer'
  // Legacy support for old IDs
  if (uiLayerId.startsWith('clip-group')) return 'mask-layer'
  if (uiLayerId.startsWith('mask')) return 'mask-layer'
  return uiLayerId
}

const handleSelectLayer = (id: string) => {
  selectCanvasLayer(id)
  selectedForegroundElementId.value = null
}

const handleToggleExpand = (layerId: string) => {
  layers.value = updateLayerNode(layers.value, layerId, {
    expanded: !findLayerNode(layers.value, layerId)?.expanded,
  })
}

const handleToggleVisibility = (layerId: string) => {
  const layer = findLayerNode(layers.value, layerId)
  if (layer) {
    layers.value = updateLayerNode(layers.value, layerId, {
      visible: !layer.visible,
    })
    toggleLayerVisibility(mapLayerIdToSceneLayerId(layerId))
  }
}

const handleSelectProcessor = (layerId: string, type: 'effect' | 'mask' | 'processor') => {
  const layer = findLayerNode(layers.value, layerId)
  if (!layer) return

  selectProcessor(layerId, type)
  selectedForegroundElementId.value = null

  if (type === 'effect') {
    selectedFilterLayerId.value = mapLayerIdToSceneLayerId(layerId)
  }
}

const handleMoveLayer = (sourceId: string, targetId: string, position: DropPosition) => {
  layers.value = moveLayerNodeInTree(layers.value, sourceId, targetId, position)
}

const handleAddLayer = (type: LayerNodeType) => {
  let sceneLayerId: string | null = null
  let newLayer: LayerNode | null = null

  switch (type) {
    case 'surface': {
      // Add to scene (this adds to editorState.canvasLayers and renders)
      sceneLayerId = sceneAddMaskLayer()
      if (!sceneLayerId) {
        // Surface layer limit reached
        return
      }
      // Create UI layer node
      newLayer = createSurfaceLayerNode(
        sceneLayerId,
        { type: 'solid', color: 'B' },
        {
          name: 'Surface',
          processors: [createEffectProcessor(), createMaskProcessor()],
        }
      )
      break
    }
    case 'group': {
      // Groups are UI-only for now (no scene representation)
      const id = `group-${Date.now()}`
      newLayer = createGroupLayerNode(id, [], { name: 'Group', expanded: true })
      break
    }
    case 'text': {
      // Add to scene
      sceneLayerId = sceneAddTextLayer({
        text: 'New Text',
        fontFamily: 'sans-serif',
        fontSize: 48,
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 1.2,
        color: '#ffffff',
        x: 0.5,
        y: 0.5,
        anchor: 'center',
        rotation: 0,
      })
      // Create UI layer node (no processors by default)
      newLayer = createTextLayerNode(
        sceneLayerId,
        {
          type: 'text',
          text: 'New Text',
          fontFamily: 'sans-serif',
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 1.2,
          color: '#ffffff',
          position: { x: 0.5, y: 0.5, anchor: 'center' },
          rotation: 0,
        },
        { name: 'Text', processors: [] }
      )
      break
    }
    case 'model3d': {
      // Add to scene (requires a model URL)
      sceneLayerId = sceneAddObjectLayer({ modelUrl: '' })
      // Create UI layer node (no processors by default)
      newLayer = createModel3DLayerNode(
        sceneLayerId,
        {
          type: 'model3d',
          modelUrl: '',
          scale: 1,
          rotation: { x: 0, y: 0, z: 0 },
          position: { x: 0, y: 0, z: 0 },
        },
        { name: '3D Model', processors: [] }
      )
      break
    }
    case 'image':
      // Image is WIP, should not reach here
      return
    default:
      return
  }

  if (newLayer) {
    // Add to the end of the layers array
    layers.value = [...layers.value, newLayer]
  }
}

const handleRemoveLayer = (layerId: string) => {
  // Find the layer to check if it's a Group
  const layer = findLayerNode(layers.value, layerId)
  if (!layer) return

  // If it's a Group, remove all children from the scene first
  if (isGroup(layer)) {
    const removeChildrenFromScene = (node: LayerNode) => {
      if (isGroup(node)) {
        for (const child of node.children) {
          removeChildrenFromScene(child)
        }
      } else {
        // It's a Layer node, remove from scene
        const sceneLayerId = mapLayerIdToSceneLayerId(node.id)
        sceneRemoveLayer(sceneLayerId)
      }
    }
    removeChildrenFromScene(layer)
  } else {
    // Single layer, map and remove from scene
    const sceneLayerId = mapLayerIdToSceneLayerId(layerId)
    sceneRemoveLayer(sceneLayerId)
  }

  // Remove from UI layers tree
  layers.value = removeNode(layers.value, layerId)

  // Clear selection if the removed layer was selected
  if (selectedLayerId.value === layerId) {
    selectCanvasLayer('')
  }
}

// ============================================================
// APCA Contrast Check
// ============================================================
const titleContrastResult = ref<ContrastAnalysisResult | null>(null)
const descriptionContrastResult = ref<ContrastAnalysisResult | null>(null)

// Base dimensions used in HeroPreview (must match)
const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080

const checkTitleContrast = async () => {
  await nextTick()
  const imageData = canvasImageData.value
  const bounds = heroPreviewRef.value?.getElementBounds('title')
  const textColor = foregroundTitleColor.value

  if (!imageData || !bounds || !textColor) {
    titleContrastResult.value = null
    setElementBounds('title', null)
    return
  }

  // Scale bounds from BASE dimensions to actual ImageData dimensions
  const scaleX = imageData.width / BASE_WIDTH
  const scaleY = imageData.height / BASE_HEIGHT
  const scaledRegion = {
    x: bounds.x * scaleX,
    y: bounds.y * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY,
  }

  // Update element bounds for auto color selection
  setElementBounds('title', scaledRegion)

  titleContrastResult.value = await checkContrastAsync(imageData, textColor, scaledRegion)
}

const checkDescriptionContrast = async () => {
  await nextTick()
  const imageData = canvasImageData.value
  const bounds = heroPreviewRef.value?.getElementBounds('description')
  const textColor = foregroundBodyColor.value

  if (!imageData || !bounds || !textColor) {
    descriptionContrastResult.value = null
    setElementBounds('description', null)
    return
  }

  // Scale bounds from BASE dimensions to actual ImageData dimensions
  const scaleX = imageData.width / BASE_WIDTH
  const scaleY = imageData.height / BASE_HEIGHT
  const scaledRegion = {
    x: bounds.x * scaleX,
    y: bounds.y * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY,
  }

  // Update element bounds for auto color selection
  setElementBounds('description', scaledRegion)

  descriptionContrastResult.value = await checkContrastAsync(imageData, textColor, scaledRegion)
}

// Watch for changes that affect contrast
watch([foregroundTitleColor, selectedElementPosition, selectedElementFontSize], checkTitleContrast)
watch([foregroundBodyColor, selectedElementPosition, selectedElementFontSize], checkDescriptionContrast)

// Update contrast when canvas ImageData changes (after each render)
watch(canvasImageData, () => {
  checkTitleContrast()
  checkDescriptionContrast()
})
</script>

<template>
  <div class="hero-generator" :class="{ dark: uiDarkMode }">
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
      @select-foreground-element="handleSelectForegroundElement"
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
        <template v-if="activeSection === 'background'">
          <!-- Color selection (at top for easy access) -->
          <div class="color-selection-section no-border">
            <PrimitiveColorPicker
              v-model="backgroundColorKey1"
              :palette="primitivePalette"
              label="Primary Color"
            />
            <PrimitiveColorPicker
              v-model="backgroundColorKey2"
              :palette="primitivePalette"
              label="Secondary Color"
              :show-auto="true"
            />
          </div>
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

        <!-- クリップグループ形状選択 -->
        <template v-else-if="activeSection === 'clip-group-shape'">
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
              <MaskPatternThumbnail
                :create-background-spec="createBackgroundThumbnailSpec"
                :create-mask-spec="pattern.createSpec"
                :mask-color1="maskOuterColor"
                :mask-color2="maskInnerColor"
              />
              <span class="pattern-label">{{ pattern.label }}</span>
            </button>
          </div>
        </template>

        <!-- クリップグループテクスチャ選択 -->
        <template v-else-if="activeSection === 'clip-group-surface'">
          <!-- Mask color selection (at top for easy access) -->
          <div class="color-selection-section no-border">
            <PrimitiveColorPicker
              v-model="maskColorKey1"
              :palette="primitivePalette"
              label="Mask Primary Color"
              :show-auto="true"
            />
            <PrimitiveColorPicker
              v-model="maskColorKey2"
              :palette="primitivePalette"
              label="Mask Secondary Color"
              :show-auto="true"
            />
          </div>
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
            :show-random-button="true"
            :is-loading-random="isLoadingRandomMask"
            @upload-image="setMaskImage"
            @clear-image="clearMaskImage"
            @select-pattern="(i) => { if (i !== null) selectedMidgroundTextureIndex = i }"
            @load-random="loadRandomMaskImage()"
          />
        </template>

        <!-- エフェクト設定 (排他選択) -->
        <template v-else-if="activeSection === 'filter' || activeSection === 'effect'">
          <div class="filter-section">
            <!-- Effect params (shown when effect is active) -->
            <div v-if="selectedFilterType === 'vignette'" class="filter-params">
              <SchemaFields
                :schema="VignetteEffectSchema"
                :model-value="currentVignetteConfig"
                :exclude="['enabled']"
                @update:model-value="currentVignetteConfig = $event"
              />
            </div>
            <div v-else-if="selectedFilterType === 'chromaticAberration'" class="filter-params">
              <SchemaFields
                :schema="ChromaticAberrationEffectSchema"
                :model-value="currentChromaticConfig"
                :exclude="['enabled']"
                @update:model-value="currentChromaticConfig = $event"
              />
            </div>
            <div v-else-if="selectedFilterType === 'dotHalftone'" class="filter-params">
              <SchemaFields
                :schema="DotHalftoneEffectSchema"
                :model-value="currentDotHalftoneConfig"
                :exclude="['enabled']"
                @update:model-value="currentDotHalftoneConfig = $event"
              />
            </div>
            <div v-else-if="selectedFilterType === 'lineHalftone'" class="filter-params">
              <SchemaFields
                :schema="LineHalftoneEffectSchema"
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

        <!-- テキストレイヤー設定 -->
        <template v-else-if="activeSection === 'text-content'">
          <div v-if="selectedTextLayerConfig" class="text-layer-section">
            <div class="text-layer-field">
              <label class="text-layer-label">Text</label>
              <textarea
                :value="selectedTextLayerConfig.text"
                @input="updateTextLayerConfig({ text: ($event.target as HTMLTextAreaElement).value })"
                class="text-layer-textarea"
                placeholder="Enter text..."
                rows="3"
              />
            </div>

            <div class="text-layer-field">
              <label class="text-layer-label">Font Family</label>
              <select
                :value="selectedTextLayerConfig.fontFamily"
                @change="updateTextLayerConfig({ fontFamily: ($event.target as HTMLSelectElement).value })"
                class="text-layer-select"
              >
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
                <option value="'Noto Serif JP', serif">Noto Serif JP</option>
              </select>
            </div>

            <div class="text-layer-row">
              <div class="text-layer-field">
                <label class="text-layer-label">Size (px)</label>
                <input
                  type="number"
                  :value="selectedTextLayerConfig.fontSize"
                  @input="updateTextLayerConfig({ fontSize: Number(($event.target as HTMLInputElement).value) })"
                  class="text-layer-input"
                  min="8"
                  max="200"
                />
              </div>

              <div class="text-layer-field">
                <label class="text-layer-label">Weight</label>
                <select
                  :value="selectedTextLayerConfig.fontWeight"
                  @change="updateTextLayerConfig({ fontWeight: Number(($event.target as HTMLSelectElement).value) })"
                  class="text-layer-select"
                >
                  <option :value="100">Thin</option>
                  <option :value="300">Light</option>
                  <option :value="400">Regular</option>
                  <option :value="500">Medium</option>
                  <option :value="700">Bold</option>
                  <option :value="900">Black</option>
                </select>
              </div>
            </div>

            <div class="text-layer-row">
              <div class="text-layer-field">
                <label class="text-layer-label">Letter Spacing (em)</label>
                <input
                  type="number"
                  :value="selectedTextLayerConfig.letterSpacing"
                  @input="updateTextLayerConfig({ letterSpacing: Number(($event.target as HTMLInputElement).value) })"
                  class="text-layer-input"
                  min="-0.2"
                  max="1"
                  step="0.01"
                />
              </div>

              <div class="text-layer-field">
                <label class="text-layer-label">Line Height</label>
                <input
                  type="number"
                  :value="selectedTextLayerConfig.lineHeight"
                  @input="updateTextLayerConfig({ lineHeight: Number(($event.target as HTMLInputElement).value) })"
                  class="text-layer-input"
                  min="0.5"
                  max="3"
                  step="0.1"
                />
              </div>
            </div>

            <div class="text-layer-field">
              <label class="text-layer-label">Color</label>
              <input
                type="color"
                :value="selectedTextLayerConfig.color"
                @input="updateTextLayerConfig({ color: ($event.target as HTMLInputElement).value })"
                class="text-layer-color"
              />
            </div>

            <div class="text-layer-row">
              <div class="text-layer-field">
                <label class="text-layer-label">Position X</label>
                <input
                  type="range"
                  :value="selectedTextLayerConfig.position.x"
                  @input="updateTextLayerConfig({ x: Number(($event.target as HTMLInputElement).value) })"
                  class="text-layer-slider"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>

              <div class="text-layer-field">
                <label class="text-layer-label">Position Y</label>
                <input
                  type="range"
                  :value="selectedTextLayerConfig.position.y"
                  @input="updateTextLayerConfig({ y: Number(($event.target as HTMLInputElement).value) })"
                  class="text-layer-slider"
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>
            </div>

            <div class="text-layer-field">
              <label class="text-layer-label">Anchor</label>
              <select
                :value="selectedTextLayerConfig.position.anchor"
                @change="updateTextLayerConfig({ anchor: ($event.target as HTMLSelectElement).value })"
                class="text-layer-select"
              >
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="center-left">Center Left</option>
                <option value="center">Center</option>
                <option value="center-right">Center Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>

            <div class="text-layer-field">
              <label class="text-layer-label">Rotation (deg)</label>
              <input
                type="range"
                :value="selectedTextLayerConfig.rotation * (180 / Math.PI)"
                @input="updateTextLayerConfig({ rotation: Number(($event.target as HTMLInputElement).value) * (Math.PI / 180) })"
                class="text-layer-slider"
                min="-180"
                max="180"
                step="1"
              />
            </div>
          </div>
        </template>

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

/* Color Selection Section */
.color-selection-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid oklch(0.85 0.01 260);
}

.color-selection-section.no-border {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  margin-bottom: 1rem;
}

.dark .color-selection-section {
  border-top-color: oklch(0.30 0.02 260);
}

/* Text Layer Section */
.text-layer-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.text-layer-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.text-layer-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.text-layer-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: oklch(0.45 0.02 260);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.dark .text-layer-label {
  color: oklch(0.65 0.02 260);
}

.text-layer-textarea {
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.20 0.02 260);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 3rem;
}

.dark .text-layer-textarea {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.text-layer-textarea:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

.text-layer-input {
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.20 0.02 260);
  font-size: 0.8125rem;
  font-family: inherit;
}

.dark .text-layer-input {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.text-layer-input:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

.text-layer-select {
  padding: 0.5rem 0.625rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  color: oklch(0.20 0.02 260);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
}

.dark .text-layer-select {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
  color: oklch(0.90 0.02 260);
}

.text-layer-select:focus {
  outline: none;
  border-color: oklch(0.55 0.20 250);
}

.text-layer-color {
  width: 100%;
  height: 2rem;
  padding: 0.125rem;
  background: oklch(0.96 0.01 260);
  border: 1px solid oklch(0.85 0.01 260);
  border-radius: 0.375rem;
  cursor: pointer;
}

.dark .text-layer-color {
  background: oklch(0.18 0.02 260);
  border-color: oklch(0.30 0.02 260);
}

.text-layer-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  background: oklch(0.85 0.01 260);
  border-radius: 2px;
  cursor: pointer;
}

.dark .text-layer-slider {
  background: oklch(0.30 0.02 260);
}

.text-layer-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border-radius: 50%;
  cursor: pointer;
}

.text-layer-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: oklch(0.55 0.20 250);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}
</style>

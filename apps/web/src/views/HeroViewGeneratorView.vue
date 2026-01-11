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
import type { LayerNode, HeroPrimitiveKey, SurfaceConfig } from '../modules/HeroScene'
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
  wrapNodeInGroup,
  wrapNodeInMaskedGroup,
  isLayer,
  isGroup,
  isEffectModifier,
  isMaskModifier,
  type DropPosition,
  type LayerNodeType,
  type Modifier,
} from '../modules/HeroScene'
import type { ContextTargetType } from '../components/HeroGenerator/DraggableLayerNode.vue'
import FloatingPanel from '../components/HeroGenerator/FloatingPanel.vue'
import FontSelector from '../components/HeroGenerator/FontSelector.vue'
import { getGoogleFontPresets } from '@practice/font'
import {
  BackgroundSectionPanel,
  ClipGroupShapePanel,
  ClipGroupSurfacePanel,
  EffectSectionPanel,
  TextLayerSectionPanel,
} from '../components/HeroGenerator/FloatingPanelContent'
import {
  createForegroundElementUsecase,
} from '../modules/HeroScene'
import {
  useSiteColors,
  useHeroScene,
  type GridPosition,
} from '../composables/SiteBuilder'
import { createGradientGrainSpec, createDefaultGradientGrainParams, getSurfacePresets, type DepthMapType } from '@practice/texture'
import type { ColorPreset } from '../modules/SemanticColorPalette/Domain'
import { checkContrastAsync, type ContrastAnalysisResult } from '../modules/ContrastChecker'
import { useLayerSelection } from '../composables/useLayerSelection'
import { RightPropertyPanel } from '../components/HeroGenerator/RightPropertyPanel'
import ContextMenu from '../components/HeroGenerator/ContextMenu.vue'
import type { ContextMenuItem } from '../components/HeroGenerator/ContextMenu.vue'
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

// Filter type: single selection (void, vignette, chromaticAberration, dotHalftone, lineHalftone)
// Using Usecase API for filter operations
type FilterType = 'void' | 'vignette' | 'chromaticAberration' | 'dotHalftone' | 'lineHalftone'
const selectedFilterType = computed<FilterType>({
  get: () => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return 'void'
    return getFilterTypeUsecase(layerId)
  },
  set: (type) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    selectFilterTypeUsecase(layerId, type)
  },
})

// Current filter params for SchemaFields binding
// Using Usecase API for filter parameter updates
const currentVignetteConfig = computed({
  get: () => selectedLayerFilters.value?.vignette ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateVignetteParams(layerId, value)
  },
})

const currentChromaticConfig = computed({
  get: () => selectedLayerFilters.value?.chromaticAberration ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateChromaticAberrationParams(layerId, value)
  },
})

const currentDotHalftoneConfig = computed({
  get: () => selectedLayerFilters.value?.dotHalftone ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateDotHalftoneParams(layerId, value)
  },
})

const currentLineHalftoneConfig = computed({
  get: () => selectedLayerFilters.value?.lineHalftone ?? {},
  set: (value) => {
    const layerId = selectedFilterLayerId.value
    if (!layerId) return
    updateLineHalftoneParams(layerId, value)
  },
})

// Get surface presets for surfaceConfig mapping
const surfacePresets = getSurfacePresets()

// Convert texture patterns to SurfaceSelector format with createSpec and surfaceConfig
const backgroundPatterns = computed(() => {
  const textureItems = texturePatterns.map((p, index) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      p.createSpec(textureColor1.value, textureColor2.value, viewport),
    // Map surfaceConfig from presets (same order as texturePatterns)
    // Cast to SurfaceConfig since SurfacePresetParams is compatible with SurfaceConfig
    surfaceConfig: surfacePresets[index]?.params as SurfaceConfig | undefined,
  }))

  // Add gradient grain option (no hero preview support for now)
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
    // Gradient grain doesn't have a standard surfaceConfig
    surfaceConfig: undefined,
  }

  return [...textureItems, gradientGrainItem]
})

const maskSurfacePatterns = computed(() => {
  const textureItems = midgroundTexturePatterns.map((p, index) => ({
    label: p.label,
    createSpec: (viewport: { width: number; height: number }) =>
      createMidgroundThumbnailSpec(p, midgroundTextureColor1.value, midgroundTextureColor2.value, viewport),
    // Map surfaceConfig from presets (same order as midgroundTexturePatterns)
    // Cast to SurfaceConfig since SurfacePresetParams is compatible with SurfaceConfig
    surfaceConfig: surfacePresets[index]?.params as SurfaceConfig | undefined,
  }))

  // Add gradient grain option (no hero preview support for now)
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
    // Gradient grain doesn't have a standard surfaceConfig
    surfaceConfig: undefined,
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
  // Background layers map to base-layer in the scene
  if (uiLayerId.startsWith('background-')) return 'base-layer'
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

const handleGroupSelection = (layerId: string) => {
  // Wrap the selected layer in a new group
  layers.value = wrapNodeInGroup(layers.value, layerId)
}

const handleUseAsMask = (layerId: string) => {
  // Wrap the selected layer in a new group with a mask modifier
  layers.value = wrapNodeInMaskedGroup(layers.value, layerId)
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

// ============================================================
// Context Menu
// ============================================================
const contextMenuOpen = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuLayerId = ref<string | null>(null)
const contextMenuTargetType = ref<ContextTargetType | 'html'>('layer')

// Check if target layer is base layer
const isContextMenuTargetBaseLayer = computed(() => {
  if (!contextMenuLayerId.value) return false
  const layer = findLayerNode(layers.value, contextMenuLayerId.value)
  if (!layer) return false
  return isLayer(layer) && layer.variant === 'base'
})

// Get target layer visibility
const contextMenuTargetVisible = computed(() => {
  if (!contextMenuLayerId.value) return true
  const layer = findLayerNode(layers.value, contextMenuLayerId.value)
  return layer?.visible ?? true
})

const contextMenuItems = computed((): ContextMenuItem[] => {
  const targetType = contextMenuTargetType.value

  // HTML elements: only Remove
  if (targetType === 'html') {
    return [
      { id: 'remove', label: 'Remove', icon: 'delete' },
    ]
  }

  // Effect/Mask modifiers: only Remove (removes modifier from layer)
  if (targetType === 'effect' || targetType === 'mask') {
    return [
      { id: 'remove-modifier', label: 'Remove', icon: 'delete' },
    ]
  }

  // Processor group: no actions
  if (targetType === 'processor') {
    return [
      { id: 'processor-info', label: 'Processor', disabled: true },
    ]
  }

  // Base layer: no actions
  if (isContextMenuTargetBaseLayer.value) {
    return [
      { id: 'base-info', label: 'Base layer', disabled: true },
    ]
  }

  // Regular layer/group: full menu
  return [
    { id: 'group-selection', label: 'Group Selection', icon: 'folder' },
    { id: 'use-as-mask', label: 'Use as Mask', icon: 'vignette' },
    { id: 'sep-1', label: '', separator: true },
    { id: 'toggle-visibility', label: contextMenuTargetVisible.value ? 'Hide' : 'Show', icon: contextMenuTargetVisible.value ? 'visibility_off' : 'visibility' },
    { id: 'sep-2', label: '', separator: true },
    { id: 'remove', label: 'Remove', icon: 'delete' },
  ]
})

const handleLayerContextMenu = (layerId: string, event: MouseEvent, targetType: ContextTargetType) => {
  contextMenuLayerId.value = layerId
  contextMenuTargetType.value = targetType
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuOpen.value = true
}

const handleForegroundContextMenu = (elementId: string, event: MouseEvent) => {
  contextMenuLayerId.value = elementId
  contextMenuTargetType.value = 'html'
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuOpen.value = true
}

const handleContextMenuClose = () => {
  contextMenuOpen.value = false
  contextMenuLayerId.value = null
  contextMenuTargetType.value = 'layer'
}

const handleRemoveModifier = (layerId: string, modifierType: 'effect' | 'mask') => {
  const layer = findLayerNode(layers.value, layerId)
  if (!layer || !isLayer(layer)) return

  // Filter out the modifier of the specified type
  const newModifiers = layer.modifiers.filter((mod: Modifier) => {
    if (modifierType === 'effect') return !isEffectModifier(mod)
    if (modifierType === 'mask') return !isMaskModifier(mod)
    return true
  })

  layers.value = updateLayerNode(layers.value, layerId, {
    modifiers: newModifiers,
  })
}

const handleContextMenuSelect = (itemId: string) => {
  const layerId = contextMenuLayerId.value
  if (!layerId) return

  const targetType = contextMenuTargetType.value

  switch (itemId) {
    case 'group-selection':
      handleGroupSelection(layerId)
      break
    case 'use-as-mask':
      handleUseAsMask(layerId)
      break
    case 'toggle-visibility':
      handleToggleVisibility(layerId)
      break
    case 'remove':
      // For HTML elements, use foreground remove
      if (targetType === 'html') {
        handleRemoveForegroundElement(layerId)
      } else {
        handleRemoveLayer(layerId)
      }
      break
    case 'remove-modifier':
      // Remove the specific modifier (effect or mask)
      if (targetType === 'effect' || targetType === 'mask') {
        handleRemoveModifier(layerId, targetType)
      }
      break
  }
  handleContextMenuClose()
}

// Prevent default context menu on the entire generator
const handleGlobalContextMenu = (e: MouseEvent) => {
  e.preventDefault()
}
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

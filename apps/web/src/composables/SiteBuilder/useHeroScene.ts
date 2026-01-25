/**
 * useHeroScene
 *
 * HeroSceneモジュールをVueのリアクティブシステムと連携するcomposable
 * 現在は2レイヤー固定（base, mask）
 *
 * This composable has been refactored to delegate to smaller, focused composables:
 * - useHeroColors: Color and theme management
 * - useHeroFilters: Filter and effect management
 * - useHeroRenderer: Scene rendering logic
 * - useHeroThumbnails: Thumbnail rendering for UI
 * - useHeroImages: Image upload and management
 */

import { ref, shallowRef, computed, watch, onUnmounted, type ComputedRef, type Ref } from 'vue'
import type { IntensityProvider } from '@practice/timeline'
import {
  type SurfacePreset,
  type GenericParams,
} from '@practice/texture'
import type { HeroViewPresetRepository } from '@practice/section-visual'
import type { PrimitivePalette } from '@practice/semantic-color-palette/Domain'
import {
  type HeroSceneConfig,
  type HtmlLayer,
  type HeroViewConfig,
  type LayerNodeConfig,
  type GroupLayerNodeConfig,
  type SurfaceLayerNodeConfig,
  type TextLayerNodeConfigType,
  type Model3DLayerNodeConfig,
  type ImageLayerNodeConfig,
  type ImagePositionConfig,
  type ForegroundLayerConfig,
  type TextLayerConfig,
  type HeroViewRepository,
  type LayerDropPosition,
  type ModifierDropPosition,
  type CompiledHeroView,
  type FontResolver,
  createDefaultEffectConfig,
  updateTextLayerText,
  updateTextLayerFont,
  updateTextLayerColor,
  updateTextLayerPosition,
  updateTextLayerRotation,
  createHeroViewInMemoryRepository,
  createSurfaceUsecase,
  addLayer as addLayerUsecase,
  removeLayer as removeLayerUsecase,
  toggleExpand as toggleExpandUsecase,
  toggleVisibility as toggleVisibilityUsecase,
  updateLayer as updateLayerUsecase,
  wrapLayerInGroup as wrapLayerInGroupUsecase,
  wrapLayerWithMask as wrapLayerWithMaskUsecase,
  moveLayer as moveLayerUsecase,
  moveModifier as moveModifierUsecase,
  createForegroundElementUsecase,
  type ForegroundConfigPort,
  type SelectionPort,
  HERO_CANVAS_DIMENSIONS,
  type HeroEditorUIState,
  createDefaultHeroEditorUIState,
  type PatternState,
  type BackgroundState,
  type MaskState,
  type FilterState,
  type ForegroundState,
  type PresetState,
  type LayerOperations,
  type ImagesState,
  type InkColorHelpers,
  type CanvasState,
  type SerializationState,
  type UsecaseState,
  type EditorStateRef,
  type RendererActions,
  findLayerInTree,
  isGroupLayerConfig,
  createProcessorUsecase,
  type ProcessorUsecase,
  compileHeroView,
  normalizeMaskConfig,
  type MaskShapeConfig,
  type NormalizedMaskConfig,
  $PropertyValue,
  createSelectProcessorUsecase,
  createApplyAnimatedPresetUsecase,
  getProcessorWithTargetUsecase,
} from '@practice/section-visual'
import { ensureFontLoaded } from '@practice/font'
import { createLayerSelection, type LayerSelectionReturn } from '../useLayerSelection'

// Import extracted composables
import { useHeroColors } from './useHeroColors'
import { useHeroFilters } from './useHeroFilters'
import { useHeroThumbnails } from './useHeroThumbnails'
import { useHeroImages } from './useHeroImages'
import { useHeroSceneRenderer } from './useHeroSceneRenderer'
import { useHeroSurfaceParams } from './useHeroSurfaceParams'
import { useHeroPatternPresets } from './useHeroPatternPresets'
import { useHeroConfigLoader, LAYER_IDS } from './useHeroConfigLoader'
import { useHeroPresets } from './useHeroPresets'

// Note: useHeroLayerOperations and useHeroForeground are available as separate composables
// for new implementations. They are not yet integrated into useHeroScene to maintain
// backward compatibility. See Phase 4 of the refactoring plan.

// Re-export types from extracted composables
export type { SectionType } from './useHeroThumbnails'
export type { ElementBounds } from './useHeroColors'

// ============================================================
// Internal Legacy Types (minimal, kept for viewport config)
// ============================================================

/** @internal Editor state for viewport and html layer config */
interface HeroSceneEditorState {
  config: HeroSceneConfig
  htmlLayer: HtmlLayer
}

/** @internal Create default editor state */
const createHeroSceneEditorState = (
  config?: Partial<HeroSceneConfig>
): HeroSceneEditorState => ({
  config: {
    width: 1280,
    height: 720,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    ...config,
  },
  htmlLayer: {
    id: 'html-layer',
    name: 'HTML Layer',
    visible: true,
    opacity: 1.0,
    layoutId: 'row-top-between',
    items: [],
  },
})

// ============================================================
// Types
// ============================================================

/**
 * Type alias for MidgroundSurfacePreset (now uses SurfacePreset from @practice/texture)
 * @deprecated Use SurfacePreset directly
 */
export type MidgroundSurfacePreset = SurfacePreset


// GenericParams ベースの型エイリアス（後方互換用）
export type CustomMaskShapeParams = GenericParams
export type CustomSurfaceParams = GenericParams
export type CustomBackgroundSurfaceParams = GenericParams

export interface UseHeroSceneOptions {
  primitivePalette: ComputedRef<PrimitivePalette>
  isDark: Ref<boolean> | ComputedRef<boolean>
  repository?: HeroViewRepository
  layerSelection?: LayerSelectionReturn
  /** Lazy getter for IntensityProvider (to handle async mount order) */
  getIntensityProvider?: () => IntensityProvider | undefined
  /** カスタムプリセットリポジトリ（省略時はデフォルトプリセット） */
  presetRepository?: HeroViewPresetRepository
}

// ============================================================
// Composable
// ============================================================

export const useHeroScene = (options: UseHeroSceneOptions) => {
  const { primitivePalette, isDark, repository, layerSelection = createLayerSelection(), getIntensityProvider, presetRepository } = options

  // ============================================================
  // Editor State (unified UI state management)
  // ============================================================
  const editorState = ref<HeroSceneEditorState>(createHeroSceneEditorState(HERO_CANVAS_DIMENSIONS))
  const editorUIState = ref<HeroEditorUIState>(createDefaultHeroEditorUIState())

  // Computed accessors for backward compatibility
  const selectedBackgroundIndex = computed({
    get: () => editorUIState.value.background.selectedPresetIndex ?? 3,
    set: (val: number) => { editorUIState.value.background.selectedPresetIndex = val },
  })
  const selectedMaskIndex = computed({
    get: () => editorUIState.value.mask.selectedShapePresetIndex,
    set: (val: number | null) => { editorUIState.value.mask.selectedShapePresetIndex = val },
  })
  const selectedMidgroundTextureIndex = computed({
    get: () => editorUIState.value.mask.selectedTexturePresetIndex,
    set: (val: number) => { editorUIState.value.mask.selectedTexturePresetIndex = val },
  })

  // ============================================================
  // HeroViewRepository & Usecases
  // ============================================================
  const heroViewRepository = repository ?? createHeroViewInMemoryRepository()

  // Reactive config derived from Repository
  const repoConfig = shallowRef<HeroViewConfig>(heroViewRepository.get())

  // Layer selection for unified surface usecase
  const { layerId: selectedLayerId, selectCanvasLayer } = layerSelection
  const selectionPort = {
    getSelectedLayerId: () => selectedLayerId.value,
  }
  const surfaceUsecase = createSurfaceUsecase({
    repository: heroViewRepository,
    selection: selectionPort,
    imageUpload: {
      upload: async () => '',
      fetchRandom: async () => new File([], ''),
    },
  })

  // Flag to skip watcher updates during fromHeroViewConfig execution
  const isLoadingFromConfig = ref(false)

  // ============================================================
  // Foreground Config (HTML Layer) - SSOT from repository
  // ============================================================
  const foregroundConfig = computed({
    get: () => heroViewRepository.get().foreground,
    set: (val: ForegroundLayerConfig) => heroViewRepository.updateForeground(val),
  })

  // ============================================================
  // Canvas ImageData for contrast analysis
  // ============================================================
  const canvasImageData = shallowRef<ImageData | null>(null)

  // ============================================================
  // Initialize Colors Composable
  // ============================================================
  const heroColors = useHeroColors({
    heroViewRepository,
    repoConfig,
    primitivePalette,
    isDark,
    canvasImageData,
    foregroundConfig,
  })

  // ============================================================
  // Font Resolver for compileHeroView
  // ============================================================
  const fontResolver: FontResolver = (fontId) => {
    if (!fontId) return 'system-ui, sans-serif'
    return ensureFontLoaded(fontId) ?? 'system-ui, sans-serif'
  }

  // ============================================================
  // Compiled HeroView (source of truth for rendering)
  // ============================================================
  const compiledView = computed((): CompiledHeroView => {
    // Get current config (foreground is already in repoConfig via computed setter)
    const config: HeroViewConfig = repoConfig.value

    // Create color context with font resolver
    const colorContext = {
      ...heroColors.foregroundColorContext.value,
      fontResolver,
    }

    return compileHeroView(
      config,
      primitivePalette.value,
      isDark.value,
      { foregroundColorContext: colorContext }
    )
  })

  // ============================================================
  // Initialize Filters Composable
  // ============================================================
  const heroFilters = useHeroFilters({
    layerIds: LAYER_IDS,
    heroViewRepository,
    isLoadingFromConfig,
  })

  // ============================================================
  // Initialize Thumbnails Composable
  // ============================================================
  const heroThumbnails = useHeroThumbnails({
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
    selectedBackgroundIndex,
  })

  // ============================================================
  // Initialize Renderer Composable
  // ============================================================
  const editorConfig = computed(() => editorState.value.config)
  // Mutable reference for lazy imageRegistry access (heroImages initialized later)
  let _imageRegistryGetter: (() => Map<string, ImageBitmap>) | null = null
  // Mutable reference for lazy image cleanup (heroImages initialized later)
  let _clearLayerImage: ((layerId: string) => void) | null = null
  const heroRenderer = useHeroSceneRenderer({
    primitivePalette,
    heroViewRepository,
    canvasImageData,
    editorConfig,
    onDestroyPreview: () => heroThumbnails.destroyThumbnailRenderers(),
    getImageRegistry: () => _imageRegistryGetter?.() ?? new Map(),
    getIntensityProvider,
  })

  // Alias for backward compatibility and shorter access
  const { render, renderSceneFromConfig, initPreview, destroyPreview } = heroRenderer

  // ============================================================
  // Initialize Surface Params Composable
  // ============================================================
  const heroSurfaceParams = useHeroSurfaceParams({
    repoConfig,
    surfaceUsecase,
    selectedLayerId,
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
  })

  // Destructure for backward compatibility
  const {
    customMaskShapeParams,
    customSurfaceParams,
    customBackgroundSurfaceParams,
    rawMaskShapeParams,
    rawSurfaceParams,
    rawBackgroundSurfaceParams,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    currentBackgroundSurfaceSchema,
  } = heroSurfaceParams

  // ============================================================
  // Initialize Pattern Presets Composable
  // ============================================================
  const heroPatternPresets = useHeroPatternPresets({
    heroViewRepository,
    surfaceUsecase,
    midgroundTexturePatterns: heroThumbnails.midgroundTexturePatterns,
    maskPatterns: heroThumbnails.maskPatterns,
    surfaceParams: heroSurfaceParams,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    selectedLayerId,
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
  })

  // Destructure for backward compatibility
  const {
    surfacePresets,
    initMaskShapeParamsFromPreset,
    initSurfaceParamsFromPreset,
    initBackgroundSurfaceParamsFromPreset,
    updateMaskShapeParams,
    updateSurfaceParams,
    updateBackgroundSurfaceParams,
  } = heroPatternPresets

  // ============================================================
  // Layer Usecase wrappers
  // ============================================================
  const layerUsecase = {
    addLayer: (layer: LayerNodeConfig, index?: number) => addLayerUsecase(layer, heroViewRepository, index),
    removeLayer: (layerId: string) => removeLayerUsecase(layerId, heroViewRepository),
    toggleExpand: (layerId: string) => toggleExpandUsecase(layerId, heroViewRepository),
    toggleVisibility: (layerId: string) => toggleVisibilityUsecase(layerId, heroViewRepository),
    updateLayer: (layerId: string, updates: Partial<LayerNodeConfig>) => updateLayerUsecase(layerId, updates, heroViewRepository),
    wrapLayerInGroup: (layerId: string) => wrapLayerInGroupUsecase(layerId, heroViewRepository),
    wrapLayerWithMask: (layerId: string) => wrapLayerWithMaskUsecase(layerId, heroViewRepository),
    moveLayer: (layerId: string, position: LayerDropPosition) => moveLayerUsecase(layerId, position, heroViewRepository),
    moveModifier: (sourceNodeId: string, sourceModifierIndex: number, position: ModifierDropPosition) => moveModifierUsecase(sourceNodeId, sourceModifierIndex, position, heroViewRepository),
  }

  // ============================================================
  // Processor Usecase
  // ============================================================
  const processorUsecase: ProcessorUsecase = createProcessorUsecase({
    repository: heroViewRepository,
  })

  // ============================================================
  // SelectProcessor Usecase (EffectManager Port integration)
  // ============================================================
  const selectProcessorUsecase = createSelectProcessorUsecase({
    effectManager: {
      selectLayer: (layerId) => heroFilters.effectManager.selectLayer(layerId),
      setEffectPipeline: (layerId, effects) => heroFilters.effectManager.setEffectPipeline(layerId, effects),
    },
  })

  // ============================================================
  // ApplyAnimatedPreset Usecase (Preset change handling)
  // ============================================================
  const applyAnimatedPresetUsecase = createApplyAnimatedPresetUsecase({
    repository: heroViewRepository,
    foregroundConfig: {
      set: (config) => { foregroundConfig.value = config },
    },
    effectManager: {
      selectLayer: (layerId) => heroFilters.effectManager.selectLayer(layerId),
    },
  })

  // ============================================================
  // ForegroundElement Usecase
  // ============================================================
  const selectedForegroundElementId = computed({
    get: () => editorUIState.value.foreground.selectedElementId,
    set: (val: string | null) => { editorUIState.value.foreground.selectedElementId = val },
  })

  let _foregroundElementUsecase: ReturnType<typeof createForegroundElementUsecase> | null = null

  const getForegroundElementUsecase = () => {
    if (!_foregroundElementUsecase) {
      const foregroundConfigPort: ForegroundConfigPort = {
        get: () => foregroundConfig.value,
        set: (config: ForegroundLayerConfig) => {
          foregroundConfig.value = config
        },
      }

      const foregroundSelectionPort: SelectionPort = {
        getSelectedId: () => selectedForegroundElementId.value,
        setSelectedId: (id: string | null) => {
          selectedForegroundElementId.value = id
        },
        clearCanvasSelection: () => {
          heroFilters.selectedFilterLayerId.value = null
        },
      }

      _foregroundElementUsecase = createForegroundElementUsecase({
        foregroundConfig: foregroundConfigPort,
        selection: foregroundSelectionPort,
      })
    }
    return _foregroundElementUsecase
  }

  const foregroundElementUsecase = {
    getSelectedElement: () => getForegroundElementUsecase().getSelectedElement(),
    selectElement: (elementId: string | null) => getForegroundElementUsecase().selectElement(elementId),
    addElement: (type: 'title' | 'description') => getForegroundElementUsecase().addElement(type),
    removeElement: (elementId: string) => getForegroundElementUsecase().removeElement(elementId),
    updateElement: (elementId: string, updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) => getForegroundElementUsecase().updateElement(elementId, updates as Parameters<ReturnType<typeof createForegroundElementUsecase>['updateElement']>[1]),
    updateSelectedElement: (updates: { position?: string; content?: string; fontId?: string; fontSize?: number; colorKey?: string }) => getForegroundElementUsecase().updateSelectedElement(updates as Parameters<ReturnType<typeof createForegroundElementUsecase>['updateSelectedElement']>[0]),
  }

  // ============================================================
  // Layer Management
  // ============================================================

  const addMaskLayer = (): string | null => {
    const id = `surface-${Date.now()}`
    const surfaceLayerConfig: SurfaceLayerNodeConfig = {
      type: 'surface',
      id,
      name: 'Surface',
      visible: true,
      surface: {
        id: 'solid',
        params: {
          color1: { type: 'static', value: 'B' },
        },
      },
    }
    layerUsecase.addLayer(surfaceLayerConfig)
    heroFilters.effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addTextLayer = (options?: Partial<{
    text: string
    fontFamily: string
    fontSize: number
    fontWeight: number
    letterSpacing: number
    lineHeight: number
    color: string
    x: number
    y: number
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
    rotation: number
  }>): string => {
    const id = `text-${Date.now()}`
    const textLayerConfig: TextLayerNodeConfigType = {
      type: 'text',
      id,
      name: options?.text?.slice(0, 20) || 'Text Layer',
      visible: true,
      text: options?.text ?? 'Text',
      fontFamily: options?.fontFamily ?? 'sans-serif',
      fontSize: options?.fontSize ?? 48,
      fontWeight: options?.fontWeight ?? 400,
      letterSpacing: options?.letterSpacing ?? 0,
      lineHeight: options?.lineHeight ?? 1.2,
      color: options?.color ?? '#000000',
      position: {
        x: options?.x ?? 0.5,
        y: options?.y ?? 0.5,
        anchor: options?.anchor ?? 'center',
      },
      rotation: options?.rotation ?? 0,
    }
    layerUsecase.addLayer(textLayerConfig)
    heroFilters.effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addObjectLayer = (options?: Partial<{
    modelUrl: string
    x: number
    y: number
    z: number
    rotationX: number
    rotationY: number
    rotationZ: number
    scale: number
  }>): string => {
    const id = `object-${Date.now()}`
    const model3DLayerConfig: Model3DLayerNodeConfig = {
      type: 'model3d',
      id,
      name: 'Object Layer',
      visible: true,
      modelUrl: options?.modelUrl ?? '',
      position: {
        x: options?.x ?? 0,
        y: options?.y ?? 0,
        z: options?.z ?? 0,
      },
      rotation: {
        x: options?.rotationX ?? 0,
        y: options?.rotationY ?? 0,
        z: options?.rotationZ ?? 0,
      },
      scale: options?.scale ?? 1,
    }
    layerUsecase.addLayer(model3DLayerConfig)
    heroFilters.effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addImageLayer = (options?: Partial<{
    imageId: string
    mode: 'cover' | 'positioned'
    position: ImagePositionConfig
  }>): string => {
    const id = `image-${Date.now()}`
    const imageLayerConfig: ImageLayerNodeConfig = {
      type: 'image',
      id,
      name: 'Image Layer',
      visible: true,
      imageId: options?.imageId ?? '',
      mode: options?.mode ?? 'cover',
      position: options?.position,
    }
    layerUsecase.addLayer(imageLayerConfig)
    heroFilters.effectManager.setEffectConfig(id, createDefaultEffectConfig())
    render()
    return id
  }

  const addGroupLayer = (): string => {
    const id = `group-${Date.now()}`
    const groupLayerConfig: GroupLayerNodeConfig = {
      type: 'group',
      id,
      name: 'Group',
      visible: true,
      children: [],
    }
    layerUsecase.addLayer(groupLayerConfig)
    render()
    return id
  }

  const removeLayer = (id: string): boolean => {
    if (id === LAYER_IDS.BASE) return false
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return false

    // Find layer in tree (supports nested layers)
    const layer = findLayerInTree(existingConfig.layers, id)
    if (!layer) return false

    // Collect all descendant IDs to clean up effects and image resources
    const collectDescendantIds = (node: LayerNodeConfig): string[] => {
      const ids: string[] = [node.id]
      if (isGroupLayerConfig(node)) {
        for (const child of node.children) {
          ids.push(...collectDescendantIds(child))
        }
      }
      return ids
    }

    // Collect image layer IDs for resource cleanup
    const collectImageLayerIds = (node: LayerNodeConfig): string[] => {
      const ids: string[] = []
      if (node.type === 'image') {
        ids.push(node.id)
      }
      if (isGroupLayerConfig(node)) {
        for (const child of node.children) {
          ids.push(...collectImageLayerIds(child))
        }
      }
      return ids
    }

    // Delete effect configs for all descendants
    const idsToCleanup = collectDescendantIds(layer)
    for (const descendantId of idsToCleanup) {
      heroFilters.effectManager.deleteEffectConfig(descendantId)
    }

    // Cleanup image resources for image layers
    const imageLayerIds = collectImageLayerIds(layer)
    for (const imageLayerId of imageLayerIds) {
      _clearLayerImage?.(imageLayerId)
    }

    // Remove layer from tree via usecase
    layerUsecase.removeLayer(id)
    render()
    return true
  }

  /**
   * Add a processor (effect or mask) to a layer
   * If the layer doesn't have a processor node, one will be created
   */
  const addProcessorToLayer = (layerId: string, processorType: 'effect' | 'mask') => {
    processorUsecase.addModifier(layerId, processorType)
    render()
  }

  /**
   * Add a modifier (effect or mask) to an existing processor node
   */
  const addModifierToProcessor = (processorNodeId: string, processorType: 'effect' | 'mask') => {
    processorUsecase.addModifierToProcessor(processorNodeId, processorType)
    render()
  }

  /**
   * Remove a processor modifier (effect or mask) from a layer by index
   * If modifiers becomes empty, the processor node is automatically removed
   */
  const removeProcessorFromLayer = (processorNodeId: string, modifierIndex: number) => {
    processorUsecase.removeModifier(processorNodeId, modifierIndex)
    render()
  }

  /**
   * Remove an entire processor node (with all its modifiers)
   */
  const removeProcessor = (processorNodeId: string) => {
    processorUsecase.removeProcessor(processorNodeId)
    render()
  }

  const updateLayerVisibility = (id: string, visible: boolean) => {
    layerUsecase.updateLayer(id, { visible })
    render()
  }

  const toggleLayerVisibility = (id: string) => {
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return
    const layer = findLayerInTree(existingConfig.layers, id)
    if (!layer) return

    // Use usecase to update config (single source of truth)
    layerUsecase.toggleVisibility(id)
    render()
  }

  const groupLayer = (id: string): string | null => {
    // Use usecase to wrap layer in group
    const groupId = layerUsecase.wrapLayerInGroup(id)
    if (!groupId) return null
    render()
    return groupId
  }

  const useAsMask = (id: string): string | null => {
    // Use usecase to wrap layer with mask
    const groupId = layerUsecase.wrapLayerWithMask(id)
    if (!groupId) return null
    render()
    return groupId
  }

  const updateTextLayerConfig = (id: string, updates: Partial<TextLayerConfig>) => {
    const existingConfig = heroViewRepository.get()
    if (!existingConfig) return
    const layer = findLayerInTree(existingConfig.layers, id)
    if (!layer || layer.type !== 'text') return

    if (updates.text !== undefined) {
      updateTextLayerText(id, updates.text, heroViewRepository)
    }
    if (updates.fontFamily !== undefined || updates.fontSize !== undefined ||
        updates.fontWeight !== undefined || updates.letterSpacing !== undefined ||
        updates.lineHeight !== undefined) {
      updateTextLayerFont(id, {
        fontFamily: updates.fontFamily,
        fontSize: updates.fontSize,
        fontWeight: updates.fontWeight,
        letterSpacing: updates.letterSpacing,
        lineHeight: updates.lineHeight,
      }, heroViewRepository)
    }
    if (updates.color !== undefined) {
      updateTextLayerColor(id, updates.color, heroViewRepository)
    }
    if (updates.position !== undefined) {
      updateTextLayerPosition(id, {
        x: updates.position.x,
        y: updates.position.y,
        anchor: updates.position.anchor as 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right',
      }, heroViewRepository)
    }
    if (updates.rotation !== undefined) {
      updateTextLayerRotation(id, updates.rotation, heroViewRepository)
    }
    render()
  }

  const moveLayer = (id: string, position: LayerDropPosition) => {
    layerUsecase.moveLayer(id, position)
    render()
  }

  const moveModifier = (sourceNodeId: string, sourceModifierIndex: number, position: ModifierDropPosition) => {
    layerUsecase.moveModifier(sourceNodeId, sourceModifierIndex, position)
    render()
  }

  // ============================================================
  // Mask Children Operations
  // ============================================================

  const addLayerToMask = (processorId: string, modifierIndex: number, layer: LayerNodeConfig) => {
    heroViewRepository.addLayerToMask(processorId, modifierIndex, layer)
    render()
  }

  const removeLayerFromMask = (processorId: string, modifierIndex: number, layerId: string) => {
    heroViewRepository.removeLayerFromMask(processorId, modifierIndex, layerId)
    render()
  }

  const moveLayerInMask = (processorId: string, modifierIndex: number, layerId: string, newIndex: number) => {
    heroViewRepository.moveLayerInMask(processorId, modifierIndex, layerId, newIndex)
    render()
  }

  // ============================================================
  // Initialize Images Composable
  // ============================================================
  const heroImages = useHeroImages({
    repoConfig,
    heroViewRepository,
    render,
  })

  // Set the imageRegistry getter and clearLayerImage now that heroImages is initialized
  _imageRegistryGetter = () => heroImages.imageRegistry.value
  _clearLayerImage = heroImages.clearLayerImage

  // ============================================================
  // Initialize Config Loader Composable
  // ============================================================
  const { fromHeroViewConfig } = useHeroConfigLoader({
    heroViewRepository,
    editorState,
    heroFilters,
    heroThumbnails,
    selectedBackgroundIndex,
    selectedMidgroundTextureIndex,
    surfacePresets,
    render,
    isLoadingFromConfig,
  })

  // ============================================================
  // Initialize Presets Composable
  // ============================================================
  const heroPresets = useHeroPresets({
    heroViewRepository,
    editorUIState,
    fromHeroViewConfig,
    presetRepository,
  })

  // Destructure for backward compatibility
  const {
    presets,
    selectedPresetId,
    selectedPreset,
    selectedTimeline,
    loadPresets,
    applyPreset,
    exportPreset,
    presetUsecase,
  } = heroPresets

  // ============================================================
  // Watchers
  // ============================================================

  // Preset index watchers: initialize params when preset selection changes
  watch(selectedBackgroundIndex, () => {
    if (isLoadingFromConfig.value) return
    initBackgroundSurfaceParamsFromPreset()
  }, { immediate: true })

  watch(selectedMaskIndex, () => {
    if (isLoadingFromConfig.value) return
    initMaskShapeParamsFromPreset()
  }, { immediate: true })

  watch(selectedMidgroundTextureIndex, () => {
    if (isLoadingFromConfig.value) return
    initSurfaceParamsFromPreset()
  }, { immediate: true })

  // Thumbnail rendering watch (separate from main render cycle)
  watch([heroColors.textureColor1, heroColors.textureColor2], heroThumbnails.renderThumbnails)

  // Re-render when primitivePalette changes (color changes from site state)
  watch(primitivePalette, () => {
    if (isLoadingFromConfig.value) return
    renderSceneFromConfig()
  }, { deep: true })

  // Filter config watch (filters are not yet in repository SSOT)
  watch(
    heroFilters.layerFilterConfigs,
    () => render(),
    { deep: true }
  )

  // Note: The following watchers have been removed as redundant:
  // - Color changes: Colors are now computed from repository, so repository.subscribe triggers render
  // - customMaskShapeParams/customSurfaceParams/customBackgroundSurfaceParams: These are computed from
  //   repoConfig and their setters update the repository, which triggers render via subscription

  // Sync activeSection to layer selection for proper surface targeting
  watch(heroThumbnails.activeSection, (section) => {
    if (!section) return
    const sectionToLayerId: Record<string, string> = {
      'background': 'background',
      'clip-group-surface': 'surface-mask',
    }
    const layerId = sectionToLayerId[section]
    if (layerId) {
      selectCanvasLayer(layerId)
    }
  })

  onUnmounted(() => {
    destroyPreview()
  })

  // ============================================================
  // HeroViewConfig Serialization
  // ============================================================

  /**
   * Get current HeroViewConfig from repository
   * @deprecated Use heroViewRepository.get() directly for new code
   */
  const toHeroViewConfig = (): HeroViewConfig => {
    return heroViewRepository.get()
  }

  const saveToRepository = () => {
    if (repository) {
      repository.set(toHeroViewConfig())
    }
  }

  // ============================================================
  // Repository Integration
  // ============================================================

  let repositoryUnsubscribe: (() => void) | null = null
  let heroViewRepositoryUnsubscribe: (() => void) | null = null

  heroViewRepositoryUnsubscribe = heroViewRepository.subscribe((config: HeroViewConfig) => {
    repoConfig.value = config
    // Trigger render when repository changes (single source of truth for render triggers)
    if (!isLoadingFromConfig.value) {
      renderSceneFromConfig()
    }
  })

  if (repository) {
    repositoryUnsubscribe = repository.subscribe(async (config: HeroViewConfig) => {
      if (isLoadingFromConfig.value) return
      await fromHeroViewConfig(config)
    })
  }

  onUnmounted(() => {
    if (heroViewRepositoryUnsubscribe) {
      heroViewRepositoryUnsubscribe()
      heroViewRepositoryUnsubscribe = null
    }
    if (repositoryUnsubscribe) {
      repositoryUnsubscribe()
      repositoryUnsubscribe = null
    }
  })

  // ============================================================
  // Grouped State Objects (Phase 2: #131)
  // ============================================================

  // Helper: Convert children-based pattern to NormalizedMaskConfig
  const childrenToNormalizedMaskConfig = (
    children: Array<{ surface: { id: string; params: Record<string, { type: string; value: unknown }> } }>
  ): NormalizedMaskConfig | null => {
    const firstChild = children[0]
    if (!firstChild || !firstChild.surface) return null

    const { id, params: childParams } = firstChild.surface
    const normalizedParams: Record<string, ReturnType<typeof $PropertyValue.static>> = {}

    for (const [key, val] of Object.entries(childParams)) {
      if (val && typeof val === 'object' && 'value' in val) {
        normalizedParams[key] = $PropertyValue.static(val.value as number | string | boolean)
      }
    }

    // Cast id to MaskShapeTypeId (children use same shape types as mask)
    return { id: id as NormalizedMaskConfig['id'], params: normalizedParams }
  }

  // Mask patterns with normalized config for pipeline-based preview
  const maskPatternsWithNormalizedConfig = computed(() => {
    return heroThumbnails.maskPatterns
      .map((pattern) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = pattern as any

        // Children-based pattern: convert first child to NormalizedMaskConfig
        if (p.children && Array.isArray(p.children) && p.children.length > 0) {
          const maskConfig = childrenToNormalizedMaskConfig(p.children)
          if (maskConfig) {
            return { ...pattern, maskConfig }
          }
        }

        // Legacy pattern: use normalizeMaskConfig
        if (p.maskConfig) {
          return {
            ...pattern,
            maskConfig: normalizeMaskConfig(p.maskConfig as MaskShapeConfig),
          }
        }

        // No config available - return null to filter out
        return null
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
  })

  const pattern: PatternState = {
    texturePatterns: heroThumbnails.texturePatterns,
    maskPatterns: heroThumbnails.maskPatterns,
    maskPatternsWithNormalizedConfig,
    midgroundTexturePatterns: heroThumbnails.midgroundTexturePatterns,
    textureColor1: heroColors.textureColor1,
    textureColor2: heroColors.textureColor2,
    midgroundTextureColor1: heroColors.midgroundTextureColor1,
    midgroundTextureColor2: heroColors.midgroundTextureColor2,
    maskInnerColor: heroColors.maskInnerColor,
    maskOuterColor: heroColors.maskOuterColor,
    createMidgroundThumbnailSpec: heroThumbnails.createMidgroundThumbnailSpec,
    createBackgroundThumbnailSpec: heroThumbnails.createBackgroundThumbnailSpec,
    selectedBackgroundIndex,
    selectedMaskIndex,
    selectedMidgroundTextureIndex,
    activeSection: heroThumbnails.activeSection,
  }

  const background: BackgroundState = {
    customBackgroundSurfaceParams,
    rawBackgroundSurfaceParams,
    currentBackgroundSurfaceSchema,
    updateBackgroundSurfaceParams,
    updateSingleBackgroundSurfaceParam: heroPatternPresets.updateSingleBackgroundSurfaceParam,
  }

  // ProcessorTarget computed (for RightPropertyPanel mask section)
  const { processorLayerId } = layerSelection
  const processorTarget = computed(() => {
    const layers = repoConfig.value?.layers
    if (!layers) {
      return { processor: undefined, targetSurface: undefined }
    }
    return getProcessorWithTargetUsecase.execute(layers, processorLayerId.value)
  })

  const mask: MaskState = {
    maskSemanticContext: heroColors.maskSemanticContext,
    customMaskShapeParams,
    rawMaskShapeParams,
    customSurfaceParams,
    rawSurfaceParams,
    currentMaskShapeSchema,
    currentSurfaceSchema,
    updateMaskShapeParams,
    updateSurfaceParams,
    updateSingleSurfaceParam: heroPatternPresets.updateSingleSurfaceParam,
    processorTarget,
  }

  const filter: FilterState = {
    effectManager: heroFilters.effectManager,
    selectedFilterLayerId: heroFilters.selectedFilterLayerId,
    selectedLayerFilters: heroFilters.selectedLayerFilters,
    layerFilterConfigs: heroFilters.layerFilterConfigs,
    updateLayerFilters: heroFilters.updateLayerFilters,
    selectFilterType: heroFilters.selectFilterType,
    getFilterType: heroFilters.getFilterType,
    updateVignetteParams: heroFilters.updateVignetteParams,
    updateChromaticAberrationParams: heroFilters.updateChromaticAberrationParams,
    updateDotHalftoneParams: heroFilters.updateDotHalftoneParams,
    updateLineHalftoneParams: heroFilters.updateLineHalftoneParams,
    updateBlurParams: heroFilters.updateBlurParams,
  }

  const foreground: ForegroundState = {
    foregroundConfig,
    foregroundTitleColor: heroColors.foregroundTitleColor,
    foregroundBodyColor: heroColors.foregroundBodyColor,
    foregroundElementColors: heroColors.foregroundElementColors,
    foregroundTitleAutoKey: heroColors.foregroundTitleAutoKey,
    foregroundBodyAutoKey: heroColors.foregroundBodyAutoKey,
    compiledView,
  }

  const preset: PresetState = {
    presets,
    selectedPresetId,
    selectedPreset,
    selectedTimeline,
    loadPresets,
    applyPreset,
    exportPreset,
  }

  const layer: LayerOperations = {
    addMaskLayer,
    addTextLayer,
    addObjectLayer,
    addImageLayer,
    addGroupLayer,
    removeLayer,
    addProcessorToLayer,
    addModifierToProcessor,
    removeProcessorFromLayer,
    removeProcessor,
    updateLayerVisibility,
    toggleLayerVisibility,
    groupLayer,
    useAsMask,
    updateTextLayerConfig,
    moveLayer,
    moveModifier,
    // Mask Children Operations
    addLayerToMask,
    removeLayerFromMask,
    moveLayerInMask,
  }

  const inkColor: InkColorHelpers = {
    getInkColorForSurface: heroColors.getInkColorForSurface,
    getInkRgbaForSurface: heroColors.getInkRgbaForSurface,
  }

  const canvas: CanvasState = {
    canvasImageData,
    setElementBounds: heroColors.setElementBounds,
  }

  const serialization: SerializationState = {
    toHeroViewConfig,
    fromHeroViewConfig,
    saveToRepository,
  }

  const usecase: UsecaseState = {
    heroViewRepository,
    surfaceUsecase,
    layerUsecase,
    foregroundElementUsecase,
    presetUsecase,
    selectedForegroundElementId,
    selectProcessorUsecase,
    applyAnimatedPresetUsecase,
  }

  // Use repository state directly as computed (reactive via repoConfig)
  const heroViewConfigComputed = computed(() => repoConfig.value)

  // Writable computed for expandedLayerIds (syncs with editorUIState)
  const expandedLayerIdsComputed = computed({
    get: () => editorUIState.value.layerTree.expandedLayerIds,
    set: (val: Set<string>) => { editorUIState.value.layerTree.expandedLayerIds = val },
  })

  const editor: EditorStateRef = {
    heroViewConfig: heroViewConfigComputed,
    editorUIState,
    expandedLayerIds: expandedLayerIdsComputed,
  }

  const renderer: RendererActions = {
    initPreview,
    destroyPreview,
    openSection: heroThumbnails.openSection,
    renderSceneFromConfig,
  }

  const images: ImagesState = {
    imageRegistry: heroImages.imageRegistry,
    setLayerImage: heroImages.setLayerImage,
    clearLayerImage: heroImages.clearLayerImage,
    loadRandomImage: heroImages.loadRandomImage,
    getImageUrl: heroImages.getImageUrl,
    isLayerLoading: heroImages.isLayerLoading,
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    pattern,
    background,
    mask,
    filter,
    foreground,
    preset,
    layer,
    images,
    inkColor,
    canvas,
    serialization,
    usecase,
    editor,
    renderer,
  }
}

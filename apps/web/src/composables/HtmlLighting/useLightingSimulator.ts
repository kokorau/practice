import { ref, reactive, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { HTMLToSceneAdapter, $Scene, createPCFShadowShader, TileRenderer, TileCompositor } from '../../modules/Lighting/Infra'
import { $Light, $Color } from '../../modules/Lighting/Domain/ValueObject'
import { $Vector3 } from '../../modules/Vector/Domain/ValueObject'
import { computeBoxShadows, RenderTilesUseCase, type Viewport, type BoxShadowResult } from '../../modules/Lighting/Application'
import { $Hex } from '../../modules/Color/Domain/ValueObject'
import { lightPresets, type LightPreset, type LightSetting } from '../../modules/Lighting/constant/Preset'
import { useFilter } from '../Filter/useFilter'
import { getPresets } from '../../modules/Filter/Infra/PresetRepository'
import type { Preset } from '../../modules/Filter/Domain'

const PRESETS = getPresets()

// Re-export types for convenience
export type { LightPreset, LightSetting }
export type { Preset as FilterPreset }

// Debug info type
export type DebugInfo = {
  viewport: { width: number; height: number; scrollX: number; scrollY: number }
  elementsCount: number
  objectsCount: number
  lightsCount: number
  cameraPosition: { x: number; y: number; z: number }
  cameraSize: { width: number; height: number }
  tiles?: { total: number; pending: number; clean: number }
}

// Convert hex to normalized RGB (0-1)
const hexToNormalizedRgb = (hex: string) => {
  const srgb = $Hex.toSrgb(hex as `#${string}`)
  return { r: srgb.r / 255, g: srgb.g / 255, b: srgb.b / 255 }
}

export interface UseLightingSimulatorOptions {
  htmlContainerRef: Ref<HTMLElement | null>
  sampleHtmlRef: Ref<HTMLElement | null>
  canvasRef: Ref<HTMLCanvasElement | null>
  enableTileRendering?: boolean
  tileHeight?: number
  enableFilter?: boolean
  initialResolutionScale?: number
}

export function useLightingSimulator(options: UseLightingSimulatorOptions) {
  const {
    htmlContainerRef,
    sampleHtmlRef,
    canvasRef,
    enableTileRendering = true,
    tileHeight = 200,
    enableFilter = true,
    initialResolutionScale = 1,
  } = options

  // Resolution scale (0.25 to 2.0)
  const resolutionScale = ref(initialResolutionScale)

  // Tile rendering infrastructure (non-reactive)
  let tileRenderer: TileRenderer | null = null
  let tileCompositor: TileCompositor | null = null
  let renderTilesUseCase: RenderTilesUseCase | null = null

  // Current preset
  const currentPreset = ref<string | null>('Default')

  // Filter composable
  const {
    filter,
    lut,
    pixelEffects,
    currentPresetId: currentFilterPresetId,
    applyPreset: applyFilterPreset,
    setters: filterSetters,
    setMasterPoint,
    setMasterPoints,
    reset: resetFilter,
  } = useFilter(7)

  // Filter enabled state
  const filterEnabled = ref(enableFilter)

  // Light settings (reactive for UI binding)
  const defaultPreset = lightPresets[0]!
  const lightSettings = reactive({
    primary: { ...defaultPreset.primary },
    secondary: { ...defaultPreset.secondary },
    shadowBlur: defaultPreset.shadowBlur,
  })

  // Debug info
  const debugInfo = ref<DebugInfo>({
    viewport: { width: 0, height: 0, scrollX: 0, scrollY: 0 },
    elementsCount: 0,
    objectsCount: 0,
    lightsCount: 0,
    cameraPosition: { x: 0, y: 0, z: 0 },
    cameraSize: { width: 0, height: 0 },
  })

  // Box shadow results
  const boxShadows = ref<BoxShadowResult[]>([])

  // Apply preset
  const applyPreset = (preset: LightPreset) => {
    currentPreset.value = preset.name
    lightSettings.primary = { ...preset.primary }
    lightSettings.secondary = { ...preset.secondary }
    lightSettings.shadowBlur = preset.shadowBlur
  }

  // Build scene from HTML and light settings
  const buildScene = (viewport: Viewport) => {
    if (!sampleHtmlRef.value) return null

    // Parse HTML to scene
    const elements = HTMLToSceneAdapter.parseElements(sampleHtmlRef.value, viewport)
    let { scene, camera } = HTMLToSceneAdapter.toScene(elements, viewport)

    // Create lights from settings
    const primaryRgb = hexToNormalizedRgb(lightSettings.primary.colorHex)
    const primaryColor = $Color.create(primaryRgb.r, primaryRgb.g, primaryRgb.b)
    const secondaryRgb = hexToNormalizedRgb(lightSettings.secondary.colorHex)
    const secondaryColor = $Color.create(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b)
    const frontNormal = $Vector3.create(0, 0, -1)

    const directionalLights = [
      $Light.createDirectional(
        $Vector3.create(lightSettings.primary.x, lightSettings.primary.y, lightSettings.primary.z),
        primaryColor,
        lightSettings.primary.intensity
      ),
      $Light.createDirectional(
        $Vector3.create(lightSettings.secondary.x, lightSettings.secondary.y, lightSettings.secondary.z),
        secondaryColor,
        lightSettings.secondary.intensity
      ),
    ]

    // Calculate ambient so that ambient + directional contribution = 1 for front-facing surfaces
    const white = $Color.create(1.0, 1.0, 1.0)
    const ambientIntensity = Math.max(0, 1.0 - directionalLights.reduce(
      (sum, light) => sum + $Light.intensityToward(light, frontNormal),
      0
    ))

    // Add shadowShader to scene (PCF for CSS box-shadow-like blur)
    scene = { ...scene, shadowShader: createPCFShadowShader(0.3), shadowBlur: lightSettings.shadowBlur }

    scene = $Scene.add(
      scene,
      $Light.createAmbient(white, ambientIntensity),
      ...directionalLights,
    )

    return { scene, camera, elements }
  }

  // Update scene and render (full re-render, called when scene content changes)
  const updateScene = () => {
    if (!htmlContainerRef.value || !sampleHtmlRef.value || !canvasRef.value) return
    if (!renderTilesUseCase) return

    const scale = resolutionScale.value

    // Get container size (visible area) and content size (full scrollable area)
    const containerRect = htmlContainerRef.value.getBoundingClientRect()
    const viewportWidth = containerRect.width
    const viewportHeight = containerRect.height
    const contentHeight = sampleHtmlRef.value.scrollHeight
    const scrollY = htmlContainerRef.value.scrollTop

    // Scaled sizes for rendering
    const scaledViewportWidth = Math.round(viewportWidth * scale)
    const scaledViewportHeight = Math.round(viewportHeight * scale)
    const scaledContentHeight = Math.round(contentHeight * scale)
    const scaledScrollY = Math.round(scrollY * scale)

    // Viewport for parsing elements - use full content size (scaled)
    const viewport: Viewport = {
      width: scaledViewportWidth,
      height: scaledContentHeight,
      scrollX: 0,
      scrollY: 0,
    }

    const result = buildScene(viewport)
    if (!result) return

    const { scene, camera, elements } = result

    // Update debug info
    debugInfo.value = {
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        scrollX: htmlContainerRef.value.scrollLeft,
        scrollY,
      },
      elementsCount: elements.length,
      objectsCount: scene.objects.length,
      lightsCount: scene.lights.length,
      cameraPosition: camera.position,
      cameraSize: { width: camera.width, height: camera.height },
    }

    // Use tile rendering system
    // - Content size for tile grid (covers all content)
    // - Viewport size for display canvas
    renderTilesUseCase.updateScene(
      scene,
      camera,
      scaledViewportWidth,
      scaledContentHeight,
      scaledViewportWidth,
      scaledViewportHeight,
      scaledScrollY
    )

    // Update debug info with tile stats
    const tileDebug = renderTilesUseCase.getDebugInfo()
    debugInfo.value.tiles = {
      total: tileDebug.totalTiles,
      pending: tileDebug.pendingTiles,
      clean: tileDebug.cleanTiles,
    }

    // Compute box shadows from scene
    boxShadows.value = computeBoxShadows(scene, {
      shadowOpacity: 0.25,
      depthScale: 0.5,
      blurScale: 2.0,
    })

    // Apply filter if enabled
    applyFilterToCanvas()
  }

  // Apply filter to the canvas
  const applyFilterToCanvas = () => {
    if (!filterEnabled.value || !tileCompositor) return
    tileCompositor.applyFilter(lut.value, pixelEffects.value)
  }

  // Handle scroll - only update viewport, tiles are cached
  const onScroll = () => {
    if (!htmlContainerRef.value || !renderTilesUseCase) return

    const scale = resolutionScale.value
    const containerRect = htmlContainerRef.value.getBoundingClientRect()
    const scrollY = htmlContainerRef.value.scrollTop

    // Update viewport for tile rendering (re-composite visible tiles) with scaled values
    const scaledScrollY = Math.round(scrollY * scale)
    const scaledViewportHeight = Math.round(containerRect.height * scale)
    renderTilesUseCase.updateViewport(scaledScrollY, scaledViewportHeight)

    // Update debug viewport info (unscaled for display)
    debugInfo.value.viewport = {
      width: containerRect.width,
      height: containerRect.height,
      scrollX: htmlContainerRef.value.scrollLeft,
      scrollY,
    }

    // Update tile debug info
    const tileDebug = renderTilesUseCase.getDebugInfo()
    debugInfo.value.tiles = {
      total: tileDebug.totalTiles,
      pending: tileDebug.pendingTiles,
      clean: tileDebug.cleanTiles,
    }

    // Apply filter after scroll
    applyFilterToCanvas()
  }

  // Handle resize - need full re-render
  const onResize = () => {
    updateScene()
  }

  // Watch preset match
  watch(lightSettings, () => {
    const matchingPreset = lightPresets.find(p =>
      p.primary.x === lightSettings.primary.x &&
      p.primary.y === lightSettings.primary.y &&
      p.primary.z === lightSettings.primary.z &&
      p.primary.intensity === lightSettings.primary.intensity &&
      p.primary.colorHex === lightSettings.primary.colorHex &&
      p.secondary.x === lightSettings.secondary.x &&
      p.secondary.y === lightSettings.secondary.y &&
      p.secondary.z === lightSettings.secondary.z &&
      p.secondary.intensity === lightSettings.secondary.intensity &&
      p.secondary.colorHex === lightSettings.secondary.colorHex &&
      p.shadowBlur === lightSettings.shadowBlur
    )
    currentPreset.value = matchingPreset?.name ?? null
  }, { deep: true })

  // Watch light settings changes to trigger re-render
  watch(lightSettings, () => {
    updateScene()
  }, { deep: true })

  // Watch filter changes to re-apply (without re-rendering tiles)
  watch([lut, pixelEffects, filterEnabled], () => {
    // Re-composite tiles without re-rendering, then apply filter
    if (!renderTilesUseCase || !htmlContainerRef.value) return
    const scale = resolutionScale.value
    const scrollY = htmlContainerRef.value.scrollTop
    const containerRect = htmlContainerRef.value.getBoundingClientRect()
    const scaledScrollY = Math.round(scrollY * scale)
    const scaledViewportHeight = Math.round(containerRect.height * scale)
    renderTilesUseCase.updateViewport(scaledScrollY, scaledViewportHeight)
    applyFilterToCanvas()
  }, { deep: true })

  // Watch resolution scale changes to trigger re-render
  watch(resolutionScale, () => {
    updateScene()
  })

  // Lifecycle
  onMounted(() => {
    if (!canvasRef.value) return

    // Initialize tile rendering system
    tileRenderer = new TileRenderer()
    tileCompositor = new TileCompositor(canvasRef.value)
    renderTilesUseCase = new RenderTilesUseCase(tileRenderer, tileCompositor, {
      tileHeight,
      enableIdleRendering: enableTileRendering,
    })

    // Add event listeners
    window.addEventListener('resize', onResize)
    htmlContainerRef.value?.addEventListener('scroll', onScroll)

    // Wait for layout to complete
    requestAnimationFrame(() => {
      updateScene()
    })
  })

  onUnmounted(() => {
    // Remove event listeners
    window.removeEventListener('resize', onResize)
    htmlContainerRef.value?.removeEventListener('scroll', onScroll)

    // Dispose tile rendering system
    renderTilesUseCase?.dispose()
    tileRenderer?.dispose()
    renderTilesUseCase = null
    tileRenderer = null
    tileCompositor = null
  })

  return {
    // Lighting State
    lightSettings,
    currentPreset,
    debugInfo,
    boxShadows,

    // Lighting Actions
    applyPreset,
    updateScene,

    // Lighting Constants
    lightPresets,

    // Resolution
    resolutionScale,

    // Filter State
    filter,
    filterEnabled,
    currentFilterPresetId,

    // Filter Actions
    applyFilterPreset,
    filterSetters,
    setMasterPoint,
    setMasterPoints,
    resetFilter,

    // Filter Constants
    filterPresets: PRESETS,
  }
}

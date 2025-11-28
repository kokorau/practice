import { ref, reactive, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { RayTracingRenderer, HTMLToSceneAdapter, $Scene, createPCFShadowShader } from '../../modules/Lighting/Infra'
import { $Light, $Color } from '../../modules/Lighting/Domain/ValueObject'
import { $Vector3 } from '../../modules/Vector/Domain/ValueObject'
import { computeBoxShadows, type Viewport, type BoxShadowResult } from '../../modules/Lighting/Application'
import { $Hex } from '../../modules/Color/Domain/ValueObject'
import { lightPresets, type LightPreset, type LightSetting } from '../../modules/Lighting/constant/Preset'

// Re-export types for convenience
export type { LightPreset, LightSetting }

// Debug info type
export type DebugInfo = {
  viewport: { width: number; height: number; scrollX: number; scrollY: number }
  elementsCount: number
  objectsCount: number
  lightsCount: number
  cameraPosition: { x: number; y: number; z: number }
  cameraSize: { width: number; height: number }
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
}

export function useLightingSimulator(options: UseLightingSimulatorOptions) {
  const { htmlContainerRef, sampleHtmlRef, canvasRef } = options

  // Renderer instance (non-reactive)
  let renderer: RayTracingRenderer | null = null

  // Current preset
  const currentPreset = ref<string | null>('Default')

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

  // Update scene and render
  const updateScene = () => {
    if (!htmlContainerRef.value || !sampleHtmlRef.value || !canvasRef.value || !renderer) return

    // Use container size for viewport (visible area)
    const containerRect = htmlContainerRef.value.getBoundingClientRect()
    const viewport: Viewport = {
      width: containerRect.width,
      height: containerRect.height,
      scrollX: htmlContainerRef.value.scrollLeft,
      scrollY: htmlContainerRef.value.scrollTop,
    }

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

    // Update canvas size to match viewport
    canvasRef.value.width = viewport.width
    canvasRef.value.height = viewport.height

    // Update debug info
    debugInfo.value = {
      viewport,
      elementsCount: elements.length,
      objectsCount: scene.objects.length,
      lightsCount: scene.lights.length,
      cameraPosition: camera.position,
      cameraSize: { width: camera.width, height: camera.height },
    }

    renderer.render(scene, camera)

    // Compute box shadows from scene
    boxShadows.value = computeBoxShadows(scene, {
      shadowOpacity: 0.25,
      depthScale: 0.5,
      blurScale: 2.0,
    })
  }

  // Event handlers
  const onScroll = () => {
    updateScene()
  }

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

  // Lifecycle
  onMounted(() => {
    if (!canvasRef.value) return
    renderer = new RayTracingRenderer(canvasRef.value)

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

    renderer?.dispose()
    renderer = null
  })

  return {
    // State
    lightSettings,
    currentPreset,
    debugInfo,
    boxShadows,

    // Actions
    applyPreset,
    updateScene,

    // Constants
    lightPresets,
  }
}

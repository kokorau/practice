import type { Scene, SceneBox } from '../../Lighting/Infra'
import type { DirectionalLight } from '../../Lighting/Domain/ValueObject'

/**
 * Result of box-shadow computation for a single element
 */
export interface BoxShadowResult {
  /** Index of the object in scene.objects */
  readonly objectIndex: number
  /** CSS box-shadow value */
  readonly boxShadow: string
  /** Individual shadow components for further customization */
  readonly components: {
    readonly offsetX: number
    readonly offsetY: number
    readonly blur: number
    readonly spread: number
    readonly color: string
  }
}

/**
 * Options for box-shadow computation
 */
export interface ComputeBoxShadowsOptions {
  /** Base shadow color (default: black) */
  readonly shadowColor?: { r: number; g: number; b: number }
  /** Shadow opacity multiplier (default: 0.3) */
  readonly shadowOpacity?: number
  /** Depth scale factor - how much depth affects shadow offset (default: 1.0) */
  readonly depthScale?: number
  /** Blur scale factor (default: 1.0) */
  readonly blurScale?: number
}

/**
 * Compute CSS box-shadow values from Scene
 *
 * For each Box in the scene, calculates shadow offset based on:
 * - Light direction: determines shadow direction (opposite to light)
 * - Element depth (z position): deeper elements cast longer shadows
 * - shadowBlur: determines blur radius
 */
export const computeBoxShadows = (
  scene: Scene,
  options: ComputeBoxShadowsOptions = {}
): BoxShadowResult[] => {
  const {
    shadowColor = { r: 0, g: 0, b: 0 },
    shadowOpacity = 0.3,
    depthScale = 1.0,
    blurScale = 1.0,
  } = options

  // Get directional lights (we'll use the primary one for shadow direction)
  const directionalLights = scene.lights.filter(
    (l): l is DirectionalLight => l.type === 'directional'
  )

  if (directionalLights.length === 0) {
    // No directional lights, no shadows
    return []
  }

  // Use the strongest directional light as primary shadow caster
  const primaryLight = directionalLights.reduce((strongest, light) =>
    light.intensity > strongest.intensity ? light : strongest
  )

  // Light direction points FROM the light TO the scene
  // Shadow goes in the opposite direction projected onto XY plane
  const lightDir = primaryLight.direction

  // Project light direction onto XY plane for shadow offset
  // Shadow offset = -lightDir.xy / lightDir.z * depth
  // (negative because shadow goes opposite to light direction)
  const shadowDirX = lightDir.z !== 0 ? -lightDir.x / Math.abs(lightDir.z) : 0
  const shadowDirY = lightDir.z !== 0 ? lightDir.y / Math.abs(lightDir.z) : 0 // Y is inverted in CSS

  const baseBlur = scene.shadowBlur ?? 0
  const results: BoxShadowResult[] = []

  scene.objects.forEach((obj, index) => {
    if (obj.type !== 'box') return

    const box = obj as SceneBox
    const depth = box.geometry.center.z

    // Calculate shadow offset based on depth
    // Higher z (further from camera) = larger shadow offset
    const offsetX = Math.round(shadowDirX * depth * depthScale)
    const offsetY = Math.round(shadowDirY * depth * depthScale)

    // Blur increases with depth
    const blur = Math.round(baseBlur * blurScale + Math.abs(depth) * 0.5 * depthScale)

    // Spread is typically 0 for natural shadows
    const spread = 0

    // Calculate opacity based on light intensity
    const opacity = Math.min(1, shadowOpacity * primaryLight.intensity)

    // Format color
    const r = Math.round(shadowColor.r * 255)
    const g = Math.round(shadowColor.g * 255)
    const b = Math.round(shadowColor.b * 255)
    const color = `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`

    // Generate CSS box-shadow string
    const boxShadow = `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`

    results.push({
      objectIndex: index,
      boxShadow,
      components: {
        offsetX,
        offsetY,
        blur,
        spread,
        color,
      },
    })
  })

  return results
}

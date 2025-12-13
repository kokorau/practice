/**
 * CompileScene - Convert Scene to RenderScene
 *
 * Transforms domain Scene into GPU-ready RenderScene by:
 * - Separating objects by type (plane, box, capsule, sphere)
 * - Categorizing lights (ambient, directional)
 * - Applying frustum culling when camera is provided
 * - Applying defaults for missing values
 */

import type {
  Scene,
  ScenePlane,
  SceneBox,
  SceneCapsule,
  SceneSphere,
  OrthographicCamera,
} from '../Domain/ValueObject'
import type { AmbientLight, DirectionalLight } from '../Domain/ValueObject'
import type { RenderScene } from '../Infra/WebGPU/RenderScene'
import { calculateFrustum, calculateShadowFrustum, cullObjects } from './FrustumCulling'

/** Default ambient light when none specified */
const DEFAULT_AMBIENT_LIGHT: AmbientLight = {
  type: 'ambient',
  color: { r: 1, g: 1, b: 1 },
  intensity: 1,
}

/** Default background color */
const DEFAULT_BACKGROUND_COLOR = {
  r: 20 / 255,
  g: 20 / 255,
  b: 40 / 255,
}

/**
 * Compile a Scene into a RenderScene
 *
 * @param scene - Domain scene to compile
 * @param camera - Optional camera for frustum culling
 * @returns GPU-ready RenderScene
 */
export const compileScene = (scene: Scene, camera?: OrthographicCamera): RenderScene => {
  const { objects, lights, backgroundColor, shadowBlur } = scene

  // Separate lights by type (needed for shadow frustum calculation)
  const ambientLight =
    lights.find((l): l is AmbientLight => l.type === 'ambient') ?? DEFAULT_AMBIENT_LIGHT
  const directionalLights = lights.filter(
    (l): l is DirectionalLight => l.type === 'directional'
  )

  // Separate objects by type
  let planes = objects.filter((o): o is ScenePlane => o.type === 'plane')
  let boxes = objects.filter((o): o is SceneBox => o.type === 'box')
  let capsules = objects.filter((o): o is SceneCapsule => o.type === 'capsule')
  let spheres = objects.filter((o): o is SceneSphere => o.type === 'sphere')

  // Apply frustum culling if camera is provided
  // Include shadow caster regions for directional lights
  if (camera) {
    const baseFrustum = calculateFrustum(camera)
    const frustum = calculateShadowFrustum(baseFrustum, directionalLights)
    planes = cullObjects(planes, frustum)
    boxes = cullObjects(boxes, frustum)
    capsules = cullObjects(capsules, frustum)
    spheres = cullObjects(spheres, frustum)
  }

  return {
    planes,
    boxes,
    capsules,
    spheres,
    ambientLight,
    directionalLights,
    backgroundColor: backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    shadowBlur: shadowBlur ?? 0,
  }
}

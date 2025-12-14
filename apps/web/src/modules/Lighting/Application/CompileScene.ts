/**
 * CompileScene - Convert Scene to RenderScene
 *
 * Transforms domain Scene into GPU-ready RenderScene by:
 * - Filtering out fully transparent objects (alpha = 0)
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
import { $Grid2D } from '../Domain/ValueObject'
import type { RenderScene } from '../Infra/WebGPU/RenderScene'
import { calculateFrustum, calculateShadowFrustum, cullObjects } from './FrustumCulling'

/** Minimum box count to enable grid acceleration */
const GRID_MIN_BOXES = 16

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

  // Filter out fully transparent objects and separate by type
  let planes = objects.filter((o): o is ScenePlane => o.type === 'plane' && o.alpha > 0)
  let boxes = objects.filter((o): o is SceneBox => o.type === 'box' && o.alpha > 0)
  let capsules = objects.filter((o): o is SceneCapsule => o.type === 'capsule' && o.alpha > 0)
  let spheres = objects.filter((o): o is SceneSphere => o.type === 'sphere' && o.alpha > 0)

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

  // Build 2D grid for boxes if there are enough to benefit
  const boxGrid = boxes.length >= GRID_MIN_BOXES
    ? $Grid2D.build(boxes) ?? undefined
    : undefined

  return {
    planes,
    boxes,
    capsules,
    spheres,
    ambientLight,
    directionalLights,
    backgroundColor: backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    shadowBlur: shadowBlur ?? 0,
    boxGrid,
  }
}

/**
 * CompileScene - Convert Scene to RenderScene
 *
 * Transforms domain Scene into GPU-ready RenderScene by:
 * - Separating objects by type (plane, box, capsule, sphere)
 * - Categorizing lights (ambient, directional)
 * - Applying defaults for missing values
 */

import type {
  Scene,
  ScenePlane,
  SceneBox,
  SceneCapsule,
  SceneSphere,
} from '../Domain/ValueObject'
import type { AmbientLight, DirectionalLight } from '../Domain/ValueObject'
import type { RenderScene } from '../Infra/WebGPU/RenderScene'

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
 * @returns GPU-ready RenderScene
 */
export const compileScene = (scene: Scene): RenderScene => {
  const { objects, lights, backgroundColor, shadowBlur } = scene

  // Separate objects by type
  const planes = objects.filter((o): o is ScenePlane => o.type === 'plane')
  const boxes = objects.filter((o): o is SceneBox => o.type === 'box')
  const capsules = objects.filter((o): o is SceneCapsule => o.type === 'capsule')
  const spheres = objects.filter((o): o is SceneSphere => o.type === 'sphere')

  // Separate lights by type
  const ambientLight =
    lights.find((l): l is AmbientLight => l.type === 'ambient') ?? DEFAULT_AMBIENT_LIGHT
  const directionalLights = lights.filter(
    (l): l is DirectionalLight => l.type === 'directional'
  )

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

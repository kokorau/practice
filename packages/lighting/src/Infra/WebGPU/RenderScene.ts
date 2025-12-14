/**
 * RenderScene - GPU-ready scene data
 *
 * Holds pre-processed scene data ready for rendering.
 * Objects are separated by type, lights are categorized.
 */

import type {
  ScenePlane,
  SceneBox,
  SceneSphere,
  Color,
} from '../../Domain/ValueObject'
import type { BVH } from '../../Domain/ValueObject/BVH'
import type { AmbientLight, DirectionalLight } from '../../Domain/ValueObject'

/**
 * Pre-processed scene data for GPU rendering
 */
export interface RenderScene {
  /** Plane objects */
  readonly planes: readonly ScenePlane[]
  /** Box objects */
  readonly boxes: readonly SceneBox[]
  /** Sphere objects */
  readonly spheres: readonly SceneSphere[]
  /** Ambient light settings */
  readonly ambientLight: AmbientLight
  /** Directional lights */
  readonly directionalLights: readonly DirectionalLight[]
  /** Background color */
  readonly backgroundColor: Color
  /** Shadow blur amount */
  readonly shadowBlur: number
  /** BVH for spatial partitioning (optional) */
  readonly bvh?: BVH
  /** Indices of infinite planes (not in BVH) */
  readonly infinitePlaneIndices?: readonly number[]
}

/** Default ambient light when none specified */
const DEFAULT_AMBIENT_LIGHT: AmbientLight = {
  type: 'ambient',
  color: { r: 1, g: 1, b: 1 },
  intensity: 1,
}

/** Default background color */
const DEFAULT_BACKGROUND_COLOR: Color = {
  r: 20 / 255,
  g: 20 / 255,
  b: 40 / 255,
}

export const $RenderScene = {
  /**
   * Get object counts for buffer allocation
   */
  getCounts: (renderScene: RenderScene) => ({
    planes: renderScene.planes.length,
    boxes: renderScene.boxes.length,
    spheres: renderScene.spheres.length,
    lights: renderScene.directionalLights.length,
  }),

  /**
   * Create an empty RenderScene
   */
  empty: (): RenderScene => ({
    planes: [],
    boxes: [],
    spheres: [],
    ambientLight: DEFAULT_AMBIENT_LIGHT,
    directionalLights: [],
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    shadowBlur: 0,
  }),
}

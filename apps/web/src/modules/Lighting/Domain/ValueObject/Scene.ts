import type {
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  SphereGeometry,
} from './Geometry'
import type { Light } from './Light'
import type { Color } from './Color'

// =============================================================================
// Scene Objects
// =============================================================================

export interface ScenePlane {
  readonly type: 'plane'
  readonly geometry: PlaneGeometry
  readonly color: Color
  readonly alpha: number // 0 = fully transparent, 1 = fully opaque
  readonly ior: number // Index of refraction (1.0 = air, 1.5 = glass, 2.4 = diamond)
}

export interface SceneBox {
  readonly type: 'box'
  readonly geometry: BoxGeometry
  readonly color: Color
  readonly alpha: number
  readonly ior: number
}

export interface SceneCapsule {
  readonly type: 'capsule'
  readonly geometry: CapsuleGeometry
  readonly color: Color
  readonly alpha: number
  readonly ior: number
}

export interface SceneSphere {
  readonly type: 'sphere'
  readonly geometry: SphereGeometry
  readonly color: Color
  readonly alpha: number
  readonly ior: number
}

export type RenderableObject = ScenePlane | SceneBox | SceneCapsule | SceneSphere

export const $RenderableObject = {
  createPlane: (
    geometry: PlaneGeometry,
    color: Color,
    alpha: number = 1,
    ior: number = 1
  ): ScenePlane => ({
    type: 'plane',
    geometry,
    color,
    alpha,
    ior,
  }),

  createBox: (
    geometry: BoxGeometry,
    color: Color,
    alpha: number = 1,
    ior: number = 1
  ): SceneBox => ({
    type: 'box',
    geometry,
    color,
    alpha,
    ior,
  }),

  createCapsule: (
    geometry: CapsuleGeometry,
    color: Color,
    alpha: number = 1,
    ior: number = 1
  ): SceneCapsule => ({
    type: 'capsule',
    geometry,
    color,
    alpha,
    ior,
  }),

  createSphere: (
    geometry: SphereGeometry,
    color: Color,
    alpha: number = 1,
    ior: number = 1
  ): SceneSphere => ({
    type: 'sphere',
    geometry,
    color,
    alpha,
    ior,
  }),
}

// =============================================================================
// Scene
// =============================================================================

export interface Scene {
  readonly objects: readonly RenderableObject[]
  readonly lights: readonly Light[]
  readonly backgroundColor?: Color
  readonly shadowBlur?: number
}

type SceneItem = RenderableObject | Light

const isLight = (item: SceneItem): item is Light =>
  item.type === 'ambient' || item.type === 'directional'

const isRenderableObject = (item: SceneItem): item is RenderableObject =>
  item.type === 'plane' || item.type === 'box' || item.type === 'capsule' || item.type === 'sphere'

export const $Scene = {
  create: (params?: {
    objects?: RenderableObject[]
    lights?: Light[]
    backgroundColor?: Color
    shadowBlur?: number
  }): Scene => ({
    objects: params?.objects ?? [],
    lights: params?.lights ?? [],
    backgroundColor: params?.backgroundColor,
    shadowBlur: params?.shadowBlur,
  }),

  add: (scene: Scene, ...items: SceneItem[]): Scene => {
    const newObjects = items.filter(isRenderableObject)
    const newLights = items.filter(isLight)
    return {
      ...scene,
      objects: [...scene.objects, ...newObjects],
      lights: [...scene.lights, ...newLights],
    }
  },
}

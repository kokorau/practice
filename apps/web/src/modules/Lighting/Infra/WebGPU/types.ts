import type {
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  SphereGeometry,
  Light,
  Color,
} from '../../Domain/ValueObject'

export interface ScenePlane {
  type: 'plane'
  geometry: PlaneGeometry
  color: Color
  alpha: number // 0 = fully transparent, 1 = fully opaque
  ior: number // Index of refraction (1.0 = air, 1.5 = glass, 2.4 = diamond)
}

export interface SceneBox {
  type: 'box'
  geometry: BoxGeometry
  color: Color
  alpha: number
  ior: number
}

export interface SceneCapsule {
  type: 'capsule'
  geometry: CapsuleGeometry
  color: Color
  alpha: number
  ior: number
}

export interface SceneSphere {
  type: 'sphere'
  geometry: SphereGeometry
  color: Color
  alpha: number
  ior: number
}

export type SceneObject = ScenePlane | SceneBox | SceneCapsule | SceneSphere

export const $SceneObject = {
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

export interface Scene {
  readonly objects: SceneObject[]
  readonly lights: Light[]
  readonly backgroundColor?: Color
  readonly shadowBlur?: number
}

type SceneItem = SceneObject | Light

const isLight = (item: SceneItem): item is Light =>
  item.type === 'ambient' || item.type === 'directional'

const isSceneObject = (item: SceneItem): item is SceneObject =>
  item.type === 'plane' || item.type === 'box' || item.type === 'capsule' || item.type === 'sphere'

export const $Scene = {
  create: (params?: {
    objects?: SceneObject[]
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
    const newObjects = items.filter(isSceneObject)
    const newLights = items.filter(isLight)
    return {
      ...scene,
      objects: [...scene.objects, ...newObjects],
      lights: [...scene.lights, ...newLights],
    }
  },
}

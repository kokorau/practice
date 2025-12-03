import type {
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  Light,
  Color,
} from '../../Domain/ValueObject'

export interface ScenePlane {
  type: 'plane'
  geometry: PlaneGeometry
  color: Color
}

export interface SceneBox {
  type: 'box'
  geometry: BoxGeometry
  color: Color
}

export interface SceneCapsule {
  type: 'capsule'
  geometry: CapsuleGeometry
  color: Color
}

export type SceneObject = ScenePlane | SceneBox | SceneCapsule

export const $SceneObject = {
  createPlane: (geometry: PlaneGeometry, color: Color): ScenePlane => ({
    type: 'plane',
    geometry,
    color,
  }),
  createBox: (geometry: BoxGeometry, color: Color): SceneBox => ({
    type: 'box',
    geometry,
    color,
  }),
  createCapsule: (geometry: CapsuleGeometry, color: Color): SceneCapsule => ({
    type: 'capsule',
    geometry,
    color,
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
  item.type === 'plane' || item.type === 'box' || item.type === 'capsule'

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

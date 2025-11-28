import type { SceneObject } from './Object'
import type { Light } from './Light'
import type { Camera } from './Camera'

/**
 * 3D Space containing objects, lights, and camera
 */
export interface Space {
  readonly objects: readonly SceneObject[]
  readonly lights: readonly Light[]
  readonly camera: Camera
}

export const $Space = {
  create: (
    objects: readonly SceneObject[],
    lights: readonly Light[],
    camera: Camera
  ): Space => ({
    objects,
    lights,
    camera,
  }),
}

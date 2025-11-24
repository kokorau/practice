import type { Light } from './Light'
import type { SceneObject } from './SceneObject'
import type { Shadow } from './Shadow'
import { Shadow as ShadowOps } from './Shadow'

export type Bounds = {
  readonly width: number
  readonly height: number
}

/**
 * シーン全体を管理する集約
 */
export type Scene = {
  readonly bounds: Bounds
  readonly lights: readonly Light[]
  readonly objects: readonly SceneObject[]
}

export const Scene = {
  create(bounds: Bounds): Scene {
    return {
      bounds,
      lights: [],
      objects: [],
    }
  },

  // --- Light 操作 ---

  addLight(scene: Scene, light: Light): Scene {
    if (scene.lights.length >= 5) {
      return scene // 最大5個
    }
    return { ...scene, lights: [...scene.lights, light] }
  },

  removeLight(scene: Scene, lightId: string): Scene {
    return {
      ...scene,
      lights: scene.lights.filter((l) => l.id !== lightId),
    }
  },

  updateLight(
    scene: Scene,
    lightId: string,
    updater: (light: Light) => Light
  ): Scene {
    return {
      ...scene,
      lights: scene.lights.map((l) => (l.id === lightId ? updater(l) : l)),
    }
  },

  // --- Object 操作 ---

  addObject(scene: Scene, obj: SceneObject): Scene {
    return { ...scene, objects: [...scene.objects, obj] }
  },

  removeObject(scene: Scene, objId: string): Scene {
    return {
      ...scene,
      objects: scene.objects.filter((o) => o.id !== objId),
    }
  },

  updateObject(
    scene: Scene,
    objId: string,
    updater: (obj: SceneObject) => SceneObject
  ): Scene {
    return {
      ...scene,
      objects: scene.objects.map((o) => (o.id === objId ? updater(o) : o)),
    }
  },

  // --- 影の計算 ---

  /**
   * 特定オブジェクトに対する全光源からの影を計算
   */
  calculateShadowsForObject(scene: Scene, objId: string): Shadow[] {
    const obj = scene.objects.find((o) => o.id === objId)
    if (!obj) return []

    return scene.lights.map((light) => ShadowOps.calculate(light, obj))
  },

  /**
   * 全オブジェクトの影を計算
   */
  calculateAllShadows(scene: Scene): Map<string, Shadow[]> {
    const result = new Map<string, Shadow[]>()

    for (const obj of scene.objects) {
      const shadows = scene.lights.map((light) =>
        ShadowOps.calculate(light, obj)
      )
      result.set(obj.id, shadows)
    }

    return result
  },
}

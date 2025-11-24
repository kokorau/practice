import type { Light } from './Light'
import { Point } from './Point'
import type { SceneObject } from './SceneObject'
import { SceneObject as SceneObjectOps } from './SceneObject'

/**
 * 表面反射の計算結果を表す値オブジェクト
 */
export type Reflection = {
  /** 光源への角度（度） */
  readonly angle: number
  /** 反射の強度 (0-1) */
  readonly intensity: number
  /** スペキュラー反射の位置 (0-1, 光源方向の端からの割合) */
  readonly specularX: number
  readonly specularY: number
  /** スペキュラーのサイズ (0-1) */
  readonly specularSize: number
  /** 光源色 */
  readonly color: string
}

export const Reflection = {
  /**
   * 光源とオブジェクトから表面反射を計算
   */
  calculate(light: Light, obj: SceneObject): Reflection {
    const objCenter = SceneObjectOps.center(obj)
    const objTopSurface = SceneObjectOps.topSurface(obj)

    // オブジェクトから光源への角度（度）
    const angleRad = Point.angle(objCenter, light.position)
    const angle = (angleRad * 180) / Math.PI

    // 距離に基づく強度の減衰
    const distance = Point.distance(light.position, objTopSurface)
    const maxDistance = 500
    const distanceFactor = 1 - Math.min(distance / maxDistance, 1)

    // 光源の高さ（Z）が高いほど、反射が面全体に広がる
    const heightFactor = Math.min(light.position.z / 200, 1)

    // 反射の強度
    const intensity = light.intensity * distanceFactor * 0.5

    // スペキュラー反射の位置（光源方向の端に近い位置）
    // 角度から位置を計算 (0-1の範囲、0.5が中心)
    const specularX = 0.5 + Math.cos(angleRad) * 0.3 * (1 - heightFactor * 0.5)
    const specularY = 0.5 + Math.sin(angleRad) * 0.3 * (1 - heightFactor * 0.5)

    // スペキュラーのサイズ（光源が高いほど大きく広がる）
    const specularSize = 0.2 + heightFactor * 0.3

    return {
      angle,
      intensity,
      specularX,
      specularY,
      specularSize,
      color: light.color,
    }
  },

  /**
   * 複数の光源からの反射を合成
   * （単純に配列で返す、CSSで重ねる）
   */
  calculateAll(lights: readonly Light[], obj: SceneObject): Reflection[] {
    return lights.map((light) => Reflection.calculate(light, obj))
  },
}

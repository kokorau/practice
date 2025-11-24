import type { Light } from './Light'
import { Point } from './Point'
import type { SceneObject } from './SceneObject'
import { SceneObject as SceneObjectOps } from './SceneObject'

/**
 * 影の計算結果を表す値オブジェクト
 */
export type Shadow = {
  readonly offsetX: number
  readonly offsetY: number
  readonly blur: number
  readonly spread: number
  readonly opacity: number
  readonly inset: boolean // inset shadow（へこみ用）
}

/**
 * ハイライトの計算結果を表す値オブジェクト
 */
export type Highlight = {
  readonly offsetX: number
  readonly offsetY: number
  readonly blur: number
  readonly spread: number
  readonly opacity: number
  readonly inset: boolean
}

export const Shadow = {
  /**
   * 光源とオブジェクトから影を計算
   * 光源のZ位置とオブジェクトのdepthを考慮
   */
  calculate(light: Light, obj: SceneObject): Shadow {
    const objTopSurface = SceneObjectOps.topSurface(obj)
    const distance2D = Point.distance2D(light.position, objTopSurface)
    const distance3D = Point.distance(light.position, objTopSurface)

    // オブジェクトから光源へのベクトル（影は反対方向に伸びる）
    const vectorToLight = Point.vector(objTopSurface, light.position)
    // 影は光源の反対方向なので符号を反転
    const normalized2D = Point.normalize2D({
      x: -vectorToLight.x,
      y: -vectorToLight.y,
      z: -vectorToLight.z,
    })

    // 光源の高さ（z）が影の長さに影響
    // z が低いほど影が長く、高いほど影が短い
    const lightHeight = Math.max(light.position.z, 1) // 0除算防止
    const heightFactor = 100 / lightHeight // 光源が高いほど影は短い

    // オブジェクトの厚み（depth）が影の長さに影響
    const depthFactor = Math.max(obj.depth, 0) / 10

    // 影のオフセット: XY方向 + 高さ/厚みによる補正
    const baseOffset = distance2D * 0.1 * heightFactor
    const offsetScale = baseOffset + depthFactor * heightFactor
    const offsetX = normalized2D.x * offsetScale
    const offsetY = normalized2D.y * offsetScale

    // ぼかし: 距離と高さに応じて増加
    const blur = 5 + (distance3D / 100) * 10 + depthFactor * 2

    // 広がり: 厚みに応じて少し広がる
    const spread = depthFactor > 0 ? depthFactor * 0.5 : 0

    // 不透明度: 距離と光源の強度に応じて減少
    const maxDistance = 500
    const normalizedDistance = Math.min(distance3D / maxDistance, 1)
    const opacity = light.intensity * (0.6 - normalizedDistance * 0.4)

    // へこみ（depth < 0）の場合は inset shadow
    const inset = SceneObjectOps.isInset(obj)

    return { offsetX, offsetY, blur, spread, opacity, inset }
  },

  /**
   * ハイライト（照り返し）を計算
   * 光源側にできる明るい部分
   */
  calculateHighlight(light: Light, obj: SceneObject): Highlight {
    const objTopSurface = SceneObjectOps.topSurface(obj)

    // 光源からオブジェクトへのベクトル（ハイライトは光源方向）
    const vector = Point.vector(objTopSurface, light.position)
    const normalized2D = Point.normalize2D(vector)

    // ハイライトは影の逆方向、より小さく
    const offsetScale = 3 + obj.depth * 0.2
    const offsetX = normalized2D.x * offsetScale
    const offsetY = normalized2D.y * offsetScale

    // ぼかし: 柔らかく
    const blur = 8 + obj.depth * 0.5

    // 広がり
    const spread = 0

    // 不透明度: 光源の強度に応じて
    const distance3D = Point.distance(light.position, objTopSurface)
    const maxDistance = 500
    const normalizedDistance = Math.min(distance3D / maxDistance, 1)
    const opacity = light.intensity * (0.3 - normalizedDistance * 0.2)

    // 浮き出しは外側ハイライト、へこみは内側ハイライト
    const inset = SceneObjectOps.isInset(obj)

    return { offsetX, offsetY, blur, spread, opacity, inset }
  },
}

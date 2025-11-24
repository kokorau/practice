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
  readonly color: string // 光源色の暗い版
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
  readonly color: string // 光源色
}

/**
 * HEX色を暗くする
 */
const darkenColor = (hex: string, factor: number = 0.3): string => {
  // #RRGGBB or #RGB を解析
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '#000000'

  const r = Math.round(parseInt(result[1] ?? '0', 16) * factor)
  const g = Math.round(parseInt(result[2] ?? '0', 16) * factor)
  const b = Math.round(parseInt(result[3] ?? '0', 16) * factor)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
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

    // 影のオフセット: XY方向 + 高さ/厚み + 光源強度による補正
    const baseOffset = distance2D * 0.05 * heightFactor * light.intensity
    const offsetScale = baseOffset + depthFactor * heightFactor * 0.5
    const offsetX = normalized2D.x * offsetScale
    const offsetY = normalized2D.y * offsetScale

    // ぼかし: 距離と高さに応じて増加、光源強度で調整
    const blur = (3 + (distance3D / 100) * 5 + depthFactor * 1) * light.intensity

    // 広がり: 厚みと光源強度に応じて広がる
    const spread = depthFactor > 0 ? depthFactor * 0.2 * light.intensity : 0

    // 不透明度: 距離と光源の強度に応じて減少
    const maxDistance = 500
    const normalizedDistance = Math.min(distance3D / maxDistance, 1)
    const opacity = light.intensity * (0.3 - normalizedDistance * 0.2)

    // へこみ（depth < 0）の場合は inset shadow
    const inset = SceneObjectOps.isInset(obj)

    // 光源色の暗い版を影の色とする
    const color = darkenColor(light.color)

    return { offsetX, offsetY, blur, spread, opacity, inset, color }
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

    // ハイライトは影の逆方向、より小さく、光源強度で調整
    const offsetScale = (2 + obj.depth * 0.1) * light.intensity
    const offsetX = normalized2D.x * offsetScale
    const offsetY = normalized2D.y * offsetScale

    // ぼかし: 柔らかく、光源強度で調整
    const blur = (6 + obj.depth * 0.3) * light.intensity

    // 広がり
    const spread = 0

    // 不透明度: 光源の強度に応じて
    const distance3D = Point.distance(light.position, objTopSurface)
    const maxDistance = 500
    const normalizedDistance = Math.min(distance3D / maxDistance, 1)
    const opacity = light.intensity * (0.2 - normalizedDistance * 0.15)

    // 浮き出しは外側ハイライト、へこみは内側ハイライト
    const inset = SceneObjectOps.isInset(obj)

    // ハイライトは光源色をそのまま使う
    const color = light.color

    return { offsetX, offsetY, blur, spread, opacity, inset, color }
  },
}

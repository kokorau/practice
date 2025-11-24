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
   * 光源とオブジェクトから影を計算（本影と半影の2つ）
   */
  calculateWithPenumbra(light: Light, obj: SceneObject): { umbra: Shadow; penumbra: Shadow } {
    const objTopSurface = SceneObjectOps.topSurface(obj)
    const distance2D = Point.distance2D(light.position, objTopSurface)
    const distance3D = Point.distance(light.position, objTopSurface)

    // オブジェクトから光源へのベクトル（影は反対方向に伸びる）
    const vectorToLight = Point.vector(objTopSurface, light.position)
    const normalized2D = Point.normalize2D({
      x: -vectorToLight.x,
      y: -vectorToLight.y,
      z: -vectorToLight.z,
    })

    const lightHeight = Math.max(light.position.z, 1)
    const heightFactor = 100 / lightHeight
    const depthFactor = Math.max(obj.depth, 0) / 10
    const inset = SceneObjectOps.isInset(obj)
    const color = darkenColor(light.color)

    // 共通のオフセット計算
    // depthが影の長さに大きく影響するように係数を調整
    const baseOffset = distance2D * 0.02 * heightFactor * light.intensity // 0.05→0.02に削減
    const offsetScale = baseOffset + depthFactor * heightFactor * 5 // 係数を2→5に（さらに2.5倍）

    // Umbra（本影）: 濃くて小さい、オブジェクトに近い
    const umbraOffsetX = normalized2D.x * offsetScale * 0.5
    const umbraOffsetY = normalized2D.y * offsetScale * 0.5
    const umbraBlur = (2 + depthFactor * 2) * light.intensity // 係数を0.5→2に
    const umbraSpread = depthFactor > 0 ? depthFactor * 0.3 * light.intensity : 0 // 係数を0.1→0.3に
    const maxDistance = 500
    const normalizedDistance = Math.min(distance3D / maxDistance, 1)
    const umbraOpacity = light.intensity * (0.4 - normalizedDistance * 0.2)

    // Penumbra（半影）: 薄くて大きい、外側に広がる
    const penumbraOffsetX = normalized2D.x * offsetScale * 1.5
    const penumbraOffsetY = normalized2D.y * offsetScale * 1.5
    const penumbraBlur = (8 + (distance3D / 100) * 5 + depthFactor * 5) * light.intensity // 係数を2→5に
    const penumbraSpread = 0
    const penumbraOpacity = light.intensity * (0.15 - normalizedDistance * 0.1)

    return {
      umbra: {
        offsetX: umbraOffsetX,
        offsetY: umbraOffsetY,
        blur: umbraBlur,
        spread: umbraSpread,
        opacity: umbraOpacity,
        inset,
        color,
      },
      penumbra: {
        offsetX: penumbraOffsetX,
        offsetY: penumbraOffsetY,
        blur: penumbraBlur,
        spread: penumbraSpread,
        opacity: penumbraOpacity,
        inset,
        color,
      },
    }
  },

  /**
   * 光源とオブジェクトから影を計算（従来版）
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

    const lightHeight = Math.max(light.position.z, 1)
    const heightFactor = 100 / lightHeight
    const depthFactor = Math.max(obj.depth, 0) / 10

    // ハイライトは影の逆方向、より小さく、光源強度で調整
    // depthが大きいほどハイライトも強調される
    const baseOffset = 2 * light.intensity
    const offsetScale = baseOffset + depthFactor * heightFactor * 2.5 // 0.8 → 2.5に増加
    const offsetX = normalized2D.x * offsetScale
    const offsetY = normalized2D.y * offsetScale

    // ぼかし: 柔らかく、光源強度とdepthで調整
    const blur = (6 + depthFactor * 4) * light.intensity // 1.5 → 4に増加

    // 広がり: depthが大きいとハイライトも広がる
    const spread = depthFactor > 0 ? depthFactor * 0.5 * light.intensity : 0 // 0.15 → 0.5に増加

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

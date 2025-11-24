import type { Point } from './Point'
import { Point as PointOps } from './Point'

/**
 * シーン上のオブジェクトを表す値オブジェクト
 * position.z は常に0（オブジェクトは浮かない）
 * depth で厚み/へこみを表現
 */
export type SceneObject = {
  readonly id: string
  readonly position: Point // z=0 固定
  readonly width: number
  readonly height: number
  readonly depth: number // +: 浮き出し, -: へこみ, 0: フラット
  readonly reflectivity: number // 反射率 (0-1), デフォルト1
}

export const SceneObject = {
  create(
    id: string,
    position: Point,
    size: { width: number; height: number; depth?: number; reflectivity?: number }
  ): SceneObject {
    return {
      id,
      position: PointOps.create(position.x, position.y, 0), // z=0 固定
      width: size.width,
      height: size.height,
      depth: size.depth ?? 0,
      reflectivity: size.reflectivity ?? 1,
    }
  },

  /** オブジェクトの中心座標を取得 */
  center(obj: SceneObject): Point {
    return obj.position
  },

  /** オブジェクト上面の中心座標（depth考慮） */
  topSurface(obj: SceneObject): Point {
    return PointOps.create(obj.position.x, obj.position.y, obj.depth)
  },

  moveTo(obj: SceneObject, position: Point): SceneObject {
    return { ...obj, position: PointOps.create(position.x, position.y, 0) }
  },

  resize(
    obj: SceneObject,
    size: { width?: number; height?: number; depth?: number; reflectivity?: number }
  ): SceneObject {
    return {
      ...obj,
      width: size.width ?? obj.width,
      height: size.height ?? obj.height,
      depth: size.depth ?? obj.depth,
      reflectivity: size.reflectivity ?? obj.reflectivity,
    }
  },

  /** 浮き出しかどうか */
  isRaised(obj: SceneObject): boolean {
    return obj.depth > 0
  },

  /** へこみかどうか */
  isInset(obj: SceneObject): boolean {
    return obj.depth < 0
  },
}

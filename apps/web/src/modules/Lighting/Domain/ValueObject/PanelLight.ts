import { Point } from './Point'
import type { SceneObject } from './SceneObject'
import { SceneObject as SceneObjectOps } from './SceneObject'

/**
 * パネルライト（面光源）を表す値オブジェクト
 *
 * 画面正面からの照明として機能し、影の計算には寄与しない（色の計算のみ）
 * 平行光として扱い、面積による柔らかさを表現
 */
export type PanelLight = {
  readonly id: string
  /** パネル中心の位置 (z は視点からの距離) */
  readonly position: Point
  /** パネルの幅 (px) */
  readonly width: number
  /** パネルの高さ (px) */
  readonly height: number
  /** 光の強度 (0-1) */
  readonly intensity: number
  /** 光の色 (HEX) */
  readonly color: string
  /** 有効/無効 */
  readonly enabled: boolean
}

/**
 * パネルライトからオブジェクトへの照明寄与を計算した結果
 */
export type PanelLightContribution = {
  /** RGB各チャンネルの寄与 (0-255の範囲) */
  readonly r: number
  readonly g: number
  readonly b: number
}

/**
 * HEX色をRGBに変換
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 255, g: 255, b: 255 }
  return {
    r: parseInt(result[1] ?? 'ff', 16),
    g: parseInt(result[2] ?? 'ff', 16),
    b: parseInt(result[3] ?? 'ff', 16),
  }
}

export const PanelLight = {
  /**
   * パネルライトを作成
   */
  create(
    id: string,
    position: Point,
    options?: {
      width?: number
      height?: number
      intensity?: number
      color?: string
      enabled?: boolean
    }
  ): PanelLight {
    return {
      id,
      position,
      width: options?.width ?? 1000,
      height: options?.height ?? 1000,
      intensity: options?.intensity ?? 0.3,
      color: options?.color ?? '#ffffff',
      enabled: options?.enabled ?? true,
    }
  },

  /**
   * デフォルトのパネルライト（画面中央、手前から照らす）
   */
  createDefault(): PanelLight {
    // 画面中央を想定（実際の画面サイズは実行時に調整可能）
    return PanelLight.create('panel-light-default', Point.create(500, 400, 1000), {
      width: 1000,
      height: 1000,
      intensity: 0.5,
      color: '#ffffff',
      enabled: true,
    })
  },

  /**
   * 強度を設定
   */
  setIntensity(panel: PanelLight, intensity: number): PanelLight {
    return { ...panel, intensity: Math.max(0, Math.min(1, intensity)) }
  },

  /**
   * 色を設定
   */
  setColor(panel: PanelLight, color: string): PanelLight {
    return { ...panel, color }
  },

  /**
   * 有効/無効を切り替え
   */
  setEnabled(panel: PanelLight, enabled: boolean): PanelLight {
    return { ...panel, enabled }
  },

  /**
   * 位置を設定
   */
  moveTo(panel: PanelLight, position: Point): PanelLight {
    return { ...panel, position }
  },

  /**
   * サイズを設定
   */
  resize(panel: PanelLight, width: number, height: number): PanelLight {
    return { ...panel, width, height }
  },

  /**
   * パネルライトからオブジェクトへの照明寄与を計算
   *
   * 面光源として、距離とパネルサイズに応じた柔らかい照明を計算
   */
  calculateContribution(panel: PanelLight, obj: SceneObject): PanelLightContribution {
    if (!panel.enabled || panel.intensity === 0) {
      return { r: 0, g: 0, b: 0 }
    }

    const objSurface = SceneObjectOps.topSurface(obj)
    const lightRgb = hexToRgb(panel.color)

    // パネルからオブジェクトへの距離
    const distance = Point.distance(panel.position, objSurface)

    // 面光源の特性: 立体角を計算（パネル面積 / 距離^2）
    const panelArea = panel.width * panel.height
    const solidAngle = panelArea / (distance * distance + 1) // +1 で 0除算防止

    // 正規化（基準: 500x500パネルが1000px先にある場合を1とする）
    const referenceSolidAngle = (500 * 500) / (1000 * 1000)
    const normalizedSolidAngle = Math.min(solidAngle / referenceSolidAngle, 2) // 最大2倍まで

    // 最終的な寄与 = 光源色 × 強度 × 立体角係数
    const contribution = panel.intensity * normalizedSolidAngle

    return {
      r: lightRgb.r * contribution,
      g: lightRgb.g * contribution,
      b: lightRgb.b * contribution,
    }
  },
}

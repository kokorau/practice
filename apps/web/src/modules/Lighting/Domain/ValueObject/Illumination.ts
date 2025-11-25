import type { Light } from './Light'
import type { AmbientLight } from './AmbientLight'
import type { PanelLight } from './PanelLight'
import { PanelLight as PanelLightOps } from './PanelLight'
import { Point } from './Point'
import type { SceneObject } from './SceneObject'
import { SceneObject as SceneObjectOps } from './SceneObject'

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

/**
 * RGBをHEXに変換
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 照明計算の結果
 */
export type IlluminationResult = {
  /** 最終的に見える色 */
  readonly color: string
  /** 総照度 (0-1+, 1以上はオーバーエクスポーズ) */
  readonly totalIlluminance: number
}

/**
 * 事前計算済みの光源情報（RGB変換済み）
 */
type PreparedLight = {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly intensity: number
  readonly position: { x: number; y: number; z: number }
}

/**
 * 事前計算済みのパネルライト情報
 */
type PreparedPanelLight = {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly intensity: number
  readonly position: { x: number; y: number; z: number }
  readonly width: number
  readonly height: number
  readonly enabled: boolean
}

/**
 * 事前計算済みの照明コンテキスト
 * 位置に依存しない計算をまとめて行い、再利用可能にする
 */
export type PreparedIlluminationContext = {
  /** 環境光の寄与（RGB、intensity適用済み） */
  readonly ambientR: number
  readonly ambientG: number
  readonly ambientB: number
  /** 事前計算済みの点光源リスト */
  readonly lights: readonly PreparedLight[]
  /** 事前計算済みのパネルライト */
  readonly panelLight: PreparedPanelLight | null
  /** トーンマッピングのwhite値 */
  readonly tonemapWhite: number
}

// 逆二乗則の定数
const MIN_DISTANCE = 100
const MIN_DISTANCE_SQ = MIN_DISTANCE * MIN_DISTANCE
const LIGHT_SCALE = 10.0

// パネルライトの基準立体角
const PANEL_REFERENCE_SOLID_ANGLE = (500 * 500) / (1000 * 1000)

/**
 * 物理ベースの照明計算
 *
 * 見える色 = albedo × (環境光 + Σ 直接光の寄与)
 */
export const Illumination = {
  /**
   * 照明コンテキストを事前計算
   * 光源設定が変わったときだけ呼び出す
   */
  prepareContext(
    lights: readonly Light[],
    ambient: AmbientLight,
    panelLight?: PanelLight
  ): PreparedIlluminationContext {
    const ambientRgb = hexToRgb(ambient.color)

    const preparedLights: PreparedLight[] = lights.map(light => {
      const rgb = hexToRgb(light.color)
      return {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        intensity: light.intensity,
        position: { x: light.position.x, y: light.position.y, z: light.position.z },
      }
    })

    let preparedPanel: PreparedPanelLight | null = null
    if (panelLight) {
      const rgb = hexToRgb(panelLight.color)
      preparedPanel = {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        intensity: panelLight.intensity,
        position: { x: panelLight.position.x, y: panelLight.position.y, z: panelLight.position.z },
        width: panelLight.width,
        height: panelLight.height,
        enabled: panelLight.enabled,
      }
    }

    return {
      ambientR: ambientRgb.r * ambient.intensity,
      ambientG: ambientRgb.g * ambient.intensity,
      ambientB: ambientRgb.b * ambient.intensity,
      lights: preparedLights,
      panelLight: preparedPanel,
      tonemapWhite: 2.0,
    }
  },

  /**
   * 事前計算済みコンテキストを使って色を計算（最適化版）
   */
  calculateColorFast(
    albedo: string,
    ctx: PreparedIlluminationContext,
    objX: number,
    objY: number,
    objZ: number
  ): string {
    const albedoRgb = hexToRgb(albedo)

    // 環境光（事前計算済み）
    let totalR = ctx.ambientR
    let totalG = ctx.ambientG
    let totalB = ctx.ambientB

    // 各点光源の寄与
    for (const light of ctx.lights) {
      const dx = light.position.x - objX
      const dy = light.position.y - objY
      const dz = light.position.z - objZ
      const distSq = dx * dx + dy * dy + dz * dz
      const effectiveDistSq = Math.max(distSq, MIN_DISTANCE_SQ)
      const attenuation = MIN_DISTANCE_SQ / effectiveDistSq
      const contribution = light.intensity * attenuation * LIGHT_SCALE

      totalR += light.r * contribution
      totalG += light.g * contribution
      totalB += light.b * contribution
    }

    // パネルライトの寄与
    const panel = ctx.panelLight
    if (panel && panel.enabled && panel.intensity > 0) {
      const dx = panel.position.x - objX
      const dy = panel.position.y - objY
      const dz = panel.position.z - objZ
      const distSq = dx * dx + dy * dy + dz * dz + 1 // +1で0除算防止
      const panelArea = panel.width * panel.height
      const solidAngle = panelArea / distSq
      const normalizedSolidAngle = Math.min(solidAngle / PANEL_REFERENCE_SOLID_ANGLE, 2)
      const contribution = panel.intensity * normalizedSolidAngle

      totalR += panel.r * contribution
      totalG += panel.g * contribution
      totalB += panel.b * contribution
    }

    // HDR計算とトーンマッピング
    const hdrR = (albedoRgb.r / 255) * totalR / 255
    const hdrG = (albedoRgb.g / 255) * totalG / 255
    const hdrB = (albedoRgb.b / 255) * totalB / 255

    const white = ctx.tonemapWhite
    const whiteSq = white * white
    const finalR = hdrR * (1 + hdrR / whiteSq) / (1 + hdrR) * 255
    const finalG = hdrG * (1 + hdrG / whiteSq) / (1 + hdrG) * 255
    const finalB = hdrB * (1 + hdrB / whiteSq) / (1 + hdrB) * 255

    return rgbToHex(finalR, finalG, finalB)
  },

  /**
   * 事前計算済みコンテキストを使って複数の色を計算（最適化版）
   */
  calculateColorsFast(
    albedos: Record<string, string>,
    ctx: PreparedIlluminationContext,
    objX: number,
    objY: number,
    objZ: number
  ): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, albedo] of Object.entries(albedos)) {
      result[key] = Illumination.calculateColorFast(albedo, ctx, objX, objY, objZ)
    }
    return result
  },
  /**
   * オブジェクトの最終的な見える色を計算
   *
   * @param albedo オブジェクトの反射率（固有色）
   * @param lights 直接光源のリスト
   * @param ambient 環境光
   * @param obj オブジェクト（位置計算用）
   * @param panelLight パネルライト（オプション、影を作らないフィルライト）
   */
  calculateColor(
    albedo: string,
    lights: readonly Light[],
    ambient: AmbientLight,
    obj: SceneObject,
    panelLight?: PanelLight
  ): IlluminationResult {
    const albedoRgb = hexToRgb(albedo)
    const objTopSurface = SceneObjectOps.topSurface(obj)

    // 環境光の寄与
    const ambientRgb = hexToRgb(ambient.color)
    let totalR = ambientRgb.r * ambient.intensity
    let totalG = ambientRgb.g * ambient.intensity
    let totalB = ambientRgb.b * ambient.intensity

    // 各直接光源の寄与を加算
    for (const light of lights) {
      const lightRgb = hexToRgb(light.color)

      // 距離による減衰（逆二乗則ベース、ただし近距離での爆発を防ぐ）
      const distance = Point.distance(light.position, objTopSurface)
      const minDistance = 100 // 近距離での上限
      const effectiveDistance = Math.max(distance, minDistance)
      const distanceAttenuation = (minDistance * minDistance) / (effectiveDistance * effectiveDistance)

      // 直接光の寄与 = 光源色 × intensity × 減衰 × スケール係数
      const contribution = light.intensity * distanceAttenuation * LIGHT_SCALE

      totalR += lightRgb.r * contribution
      totalG += lightRgb.g * contribution
      totalB += lightRgb.b * contribution
    }

    // パネルライトの寄与を加算（影を作らないフィルライト）
    if (panelLight) {
      const panelContribution = PanelLightOps.calculateContribution(panelLight, obj)
      totalR += panelContribution.r
      totalG += panelContribution.g
      totalB += panelContribution.b
    }

    // 総照度を正規化（255で割って0-1+の範囲に）
    const totalIlluminance = (totalR + totalG + totalB) / (255 * 3)

    // albedo × 総照明 で最終色を計算（HDR値）
    const hdrR = (albedoRgb.r / 255) * totalR / 255
    const hdrG = (albedoRgb.g / 255) * totalG / 255
    const hdrB = (albedoRgb.b / 255) * totalB / 255

    // 修正 Reinhard トーンマッピング: x / (1 + x/white)
    // white値で「どこから白飛びし始めるか」を調整
    // white = 2.0 → HDR値が2.0のとき白飛び開始
    const white = 2.0
    const tonemap = (x: number) => x * (1 + x / (white * white)) / (1 + x)
    const finalR = tonemap(hdrR) * 255
    const finalG = tonemap(hdrG) * 255
    const finalB = tonemap(hdrB) * 255

    return {
      color: rgbToHex(finalR, finalG, finalB),
      totalIlluminance,
    }
  },

  /**
   * 複数の色（albedo）に対して照明を一括計算
   */
  calculateColors(
    albedos: Record<string, string>,
    lights: readonly Light[],
    ambient: AmbientLight,
    obj: SceneObject,
    panelLight?: PanelLight
  ): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, albedo] of Object.entries(albedos)) {
      result[key] = Illumination.calculateColor(albedo, lights, ambient, obj, panelLight).color
    }
    return result
  },
}

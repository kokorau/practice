/**
 * FilterConfig - サイト保存用のフィルター設定
 *
 * apps/web/src/modules/Filter の Filter 型と互換性を持つ構造で、
 * Site に永続化するための設定を定義する。
 */

// ============================================================================
// Curve
// ============================================================================

/**
 * カーブの制御点
 * 7点で表現される 0-1 の変換カーブ
 */
export interface CurveConfig {
  readonly points: readonly number[]
}

export const $CurveConfig = {
  /** 無変換カーブ (対角線) */
  identity: (pointCount: number = 7): CurveConfig => ({
    points: Array.from({ length: pointCount }, (_, i) => i / (pointCount - 1)),
  }),
} as const

// ============================================================================
// Adjustment
// ============================================================================

/**
 * 調整パラメータ
 */
export interface AdjustmentConfig {
  /** 露出: -2 (暗) 〜 0 (無変更) 〜 +2 (明) EV値 */
  readonly exposure: number
  /** ハイライト: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  readonly highlights: number
  /** シャドウ: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  readonly shadows: number
  /** 白レベル: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  readonly whites: number
  /** 黒レベル: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  readonly blacks: number
  /** 明るさ: -1 (暗) 〜 0 (無変更) 〜 +1 (明) */
  readonly brightness: number
  /** コントラスト: -1 (低) 〜 0 (無変更) 〜 +1 (高) */
  readonly contrast: number
  /** 色温度: -1 (寒色/青) 〜 0 (無変更) 〜 +1 (暖色/黄) */
  readonly temperature: number
  /** 色合い: -1 (緑) 〜 0 (無変更) 〜 +1 (マゼンタ) */
  readonly tint: number
  /** 明瞭度: -1 (ソフト) 〜 0 (無変更) 〜 +1 (シャープ) */
  readonly clarity: number
  /** フェード: 0 (無変更) 〜 +1 (黒を持ち上げ) */
  readonly fade: number
  /** 自然な彩度: -1 (彩度低下) 〜 0 (無変更) 〜 +1 (彩度増加) */
  readonly vibrance: number
  /** Split Toning: シャドウの色相 (0-360度) */
  readonly splitShadowHue: number
  /** Split Toning: シャドウの強度 (0-1) */
  readonly splitShadowAmount: number
  /** Split Toning: ハイライトの色相 (0-360度) */
  readonly splitHighlightHue: number
  /** Split Toning: ハイライトの強度 (0-1) */
  readonly splitHighlightAmount: number
  /** Split Toning: バランス (-1=シャドウ寄り, 0=中央, +1=ハイライト寄り) */
  readonly splitBalance: number
  /** Toe: 黒の締まり (0=ソフト, +1=締まり) */
  readonly toe: number
  /** Shoulder: 白のロールオフ (0=リニア, +1=フィルムライク) */
  readonly shoulder: number
  /** Color Balance: Lift R (-1 to +1) シャドウの赤 */
  readonly liftR: number
  /** Color Balance: Lift G (-1 to +1) シャドウの緑 */
  readonly liftG: number
  /** Color Balance: Lift B (-1 to +1) シャドウの青 */
  readonly liftB: number
  /** Color Balance: Gamma R (-1 to +1) ミッドトーンの赤 */
  readonly gammaR: number
  /** Color Balance: Gamma G (-1 to +1) ミッドトーンの緑 */
  readonly gammaG: number
  /** Color Balance: Gamma B (-1 to +1) ミッドトーンの青 */
  readonly gammaB: number
  /** Color Balance: Gain R (-1 to +1) ハイライトの赤 */
  readonly gainR: number
  /** Color Balance: Gain G (-1 to +1) ハイライトの緑 */
  readonly gainG: number
  /** Color Balance: Gain B (-1 to +1) ハイライトの青 */
  readonly gainB: number
  /** Selective Color: 有効/無効 */
  readonly selectiveColorEnabled: boolean
  /** Selective Color: ターゲット色相 (0-360度) */
  readonly selectiveHue: number
  /** Selective Color: 色相の許容範囲 (0-180度) */
  readonly selectiveRange: number
  /** Selective Color: 非選択部分の彩度 (0=グレー, 1=元のまま) */
  readonly selectiveDesaturate: number
  /** Posterize: 階調数 (2-256, 256=無効) */
  readonly posterizeLevels: number
  /** Hue Rotation: 色相回転 (-180 〜 +180度) */
  readonly hueRotation: number
}

export const $AdjustmentConfig = {
  /** デフォルト (無変更) */
  identity: (): AdjustmentConfig => ({
    exposure: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    brightness: 0,
    contrast: 0,
    temperature: 0,
    tint: 0,
    clarity: 0,
    fade: 0,
    vibrance: 0,
    splitShadowHue: 220,
    splitShadowAmount: 0,
    splitHighlightHue: 40,
    splitHighlightAmount: 0,
    splitBalance: 0,
    toe: 0,
    shoulder: 0,
    liftR: 0,
    liftG: 0,
    liftB: 0,
    gammaR: 0,
    gammaG: 0,
    gammaB: 0,
    gainR: 0,
    gainG: 0,
    gainB: 0,
    selectiveColorEnabled: false,
    selectiveHue: 0,
    selectiveRange: 30,
    selectiveDesaturate: 1,
    posterizeLevels: 256,
    hueRotation: 0,
  }),
} as const

// ============================================================================
// FilterConfig
// ============================================================================

/**
 * フィルター設定
 * カーブベースの画像調整設定を保持
 */
export interface FilterConfig {
  /** 基本調整 (Brightness/Contrast 等) - カーブの前に適用 */
  readonly adjustment: AdjustmentConfig
  /** Master カーブ (RGB共通) */
  readonly master: CurveConfig
  /** R チャンネルカーブ (null の場合は Master を使用) */
  readonly r: CurveConfig | null
  /** G チャンネルカーブ (null の場合は Master を使用) */
  readonly g: CurveConfig | null
  /** B チャンネルカーブ (null の場合は Master を使用) */
  readonly b: CurveConfig | null
  /** フィルター強度 (0.0〜1.0) */
  readonly intensity: number
  /** 適用中のプリセットID (null = カスタム) */
  readonly presetId: string | null
}

export const $FilterConfig = {
  /** デフォルトフィルター (無変換) */
  identity: (pointCount: number = 7): FilterConfig => ({
    adjustment: $AdjustmentConfig.identity(),
    master: $CurveConfig.identity(pointCount),
    r: null,
    g: null,
    b: null,
    intensity: 1.0,
    presetId: null,
  }),

  /** 調整が無変更かどうか */
  isIdentity: (config: FilterConfig): boolean => {
    const adj = config.adjustment
    return (
      Math.abs(adj.exposure) < 0.001 &&
      Math.abs(adj.highlights) < 0.001 &&
      Math.abs(adj.shadows) < 0.001 &&
      Math.abs(adj.whites) < 0.001 &&
      Math.abs(adj.blacks) < 0.001 &&
      Math.abs(adj.brightness) < 0.001 &&
      Math.abs(adj.contrast) < 0.001 &&
      Math.abs(adj.temperature) < 0.001 &&
      Math.abs(adj.tint) < 0.001 &&
      Math.abs(adj.clarity) < 0.001 &&
      Math.abs(adj.fade) < 0.001 &&
      Math.abs(adj.vibrance) < 0.001 &&
      adj.splitShadowAmount < 0.001 &&
      adj.splitHighlightAmount < 0.001 &&
      adj.toe < 0.001 &&
      adj.shoulder < 0.001 &&
      Math.abs(adj.liftR) < 0.001 &&
      Math.abs(adj.liftG) < 0.001 &&
      Math.abs(adj.liftB) < 0.001 &&
      Math.abs(adj.gammaR) < 0.001 &&
      Math.abs(adj.gammaG) < 0.001 &&
      Math.abs(adj.gammaB) < 0.001 &&
      Math.abs(adj.gainR) < 0.001 &&
      Math.abs(adj.gainG) < 0.001 &&
      Math.abs(adj.gainB) < 0.001 &&
      !adj.selectiveColorEnabled &&
      adj.posterizeLevels >= 256 &&
      Math.abs(adj.hueRotation) < 0.001 &&
      config.r === null &&
      config.g === null &&
      config.b === null &&
      isIdentityCurve(config.master) &&
      config.intensity >= 0.999 &&
      config.presetId === null
    )
  },
} as const

/** カーブが対角線 (無変換) かどうか */
const isIdentityCurve = (curve: CurveConfig): boolean => {
  const points = curve.points
  const len = points.length
  for (let i = 0; i < len; i++) {
    const expected = i / (len - 1)
    if (Math.abs(points[i]! - expected) >= 0.001) {
      return false
    }
  }
  return true
}

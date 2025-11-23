/**
 * 画像変換関数 - 個別の調整処理
 */

import { srgbToLinear, linearToSrgb } from './colors'
import {
  highlightMask,
  shadowMask,
  whiteMask,
  blackMask,
  clarityMask,
} from './masks'

/**
 * Gamma変換 (Brightness用)
 * gamma < 1: 明るくなる (シャドウを持ち上げ)
 * gamma > 1: 暗くなる
 */
export const applyGamma = (input: number, gamma: number): number => {
  return Math.pow(Math.max(0, Math.min(1, input)), gamma)
}

/**
 * コントラスト変換
 * contrast > 0: コントラスト増加 (S字カーブで端に広げる)
 * contrast < 0: コントラスト減少 (中央0.5に向かって圧縮)
 *
 * @param input 入力値 (0-1)
 * @param contrast コントラスト値 (-1 to +1)
 */
export const applyContrast = (input: number, contrast: number): number => {
  if (Math.abs(contrast) < 0.001) {
    return input // contrast ≈ 0 は変化なし
  }

  if (contrast > 0) {
    // 正のコントラスト: シグモイドS字カーブ
    // contrast 1.0 で十分な効果が出るようにスケール
    const k = contrast * 4
    const centered = input - 0.5

    const sigmoid = 1 / (1 + Math.exp(-k * centered * 4))
    const sigmoid0 = 1 / (1 + Math.exp(-k * (-0.5) * 4))
    const sigmoid1 = 1 / (1 + Math.exp(-k * 0.5 * 4))

    return (sigmoid - sigmoid0) / (sigmoid1 - sigmoid0)
  } else {
    // 負のコントラスト: 中央(0.5)に向かって線形補間
    // contrast = -1 で完全に0.5になる
    const t = Math.abs(contrast)
    return input + (0.5 - input) * t
  }
}

/**
 * パラメータ(-1〜+1)をGamma値に変換
 * brightness: -1 → gamma 2.0 (暗く)
 * brightness:  0 → gamma 1.0 (変化なし)
 * brightness: +1 → gamma 0.5 (明るく)
 */
export const brightnessToGamma = (brightness: number): number => {
  // -1 to +1 → 2.0 to 0.5 (exponential mapping)
  return Math.pow(2, -brightness)
}

/**
 * 露出補正 (Exposure)
 * 線形光空間で乗算を行う
 * @param input sRGB値 (0-1)
 * @param ev EV値 (+1 = 2倍, -1 = 1/2)
 */
export const applyExposure = (input: number, ev: number): number => {
  if (Math.abs(ev) < 0.001) {
    return input // ev ≈ 0 は変化なし
  }

  // sRGB → Linear
  const linear = srgbToLinear(input)

  // 露出補正 (2^ev 倍)
  const multiplier = Math.pow(2, ev)
  const adjusted = linear * multiplier

  // Linear → sRGB (クランプ付き)
  return linearToSrgb(Math.max(0, Math.min(1, adjusted)))
}

/**
 * ハイライト/シャドウ調整
 * @param input 入力値 (0-1)
 * @param highlights ハイライト調整 (-1 to +1)
 * @param shadows シャドウ調整 (-1 to +1)
 */
export const applyHighlightsShadows = (
  input: number,
  highlights: number,
  shadows: number
): number => {
  if (Math.abs(highlights) < 0.001 && Math.abs(shadows) < 0.001) {
    return input
  }

  // 調整の強さ (±1で最大±0.5の変化)
  const strength = 0.5

  // 各マスクの影響度を計算
  const hMask = highlightMask(input)
  const sMask = shadowMask(input)

  // 調整を適用
  let result = input
  result += highlights * hMask * strength
  result += shadows * sMask * strength

  return Math.max(0, Math.min(1, result))
}

/**
 * 白レベル/黒レベル調整
 * Highlights/Shadowsより狭い範囲で、端点に近い部分のみ調整
 * @param input 入力値 (0-1)
 * @param whites 白レベル調整 (-1 to +1)
 * @param blacks 黒レベル調整 (-1 to +1)
 */
export const applyWhitesBlacks = (
  input: number,
  whites: number,
  blacks: number
): number => {
  if (Math.abs(whites) < 0.001 && Math.abs(blacks) < 0.001) {
    return input
  }

  // 調整の強さ (±1で最大±0.3の変化、端点に近いのでより控えめ)
  const strength = 0.3

  // 各マスクの影響度を計算
  const wMask = whiteMask(input)
  const bMask = blackMask(input)

  // 調整を適用
  let result = input
  result += whites * wMask * strength
  result += blacks * bMask * strength

  return Math.max(0, Math.min(1, result))
}

/**
 * 明瞭度調整
 * 中間調のみコントラストを調整 (端点は維持)
 * @param input 入力値 (0-1)
 * @param clarity 明瞭度 (-1 to +1)
 */
export const applyClarity = (input: number, clarity: number): number => {
  if (Math.abs(clarity) < 0.001) {
    return input
  }

  // 中間調マスク
  const mask = clarityMask(input)

  // 0.5 からの距離に基づいて調整
  const centered = input - 0.5

  // 正の clarity: 中間調を0.5から離す (コントラスト増)
  // 負の clarity: 中間調を0.5に近づける (ソフト化)
  const strength = 0.4 // 最大調整量
  const adjustment = centered * clarity * strength * mask

  return Math.max(0, Math.min(1, input + adjustment))
}

/**
 * フェード調整 (黒点の持ち上げ)
 * フィルム風のマット感を出す
 * @param input 入力値 (0-1)
 * @param fade フェード量 (0 to +1)
 */
export const applyFade = (input: number, fade: number): number => {
  if (fade < 0.001) {
    return input
  }

  // 黒点を持ち上げる
  // fade=1で最大約20%まで持ち上げ
  const blackLevel = fade * 0.2
  return blackLevel + input * (1 - blackLevel)
}

/**
 * Toe (黒の締まり)
 * 暗部を非線形にカーブさせてフィルムのような黒締まりを実現
 * @param input 入力値 (0-1)
 * @param toe 強度 (0-1)
 */
export const applyToe = (input: number, toe: number): number => {
  if (toe < 0.001) return input

  // Toe領域 (0-0.3)
  const toeRange = 0.3
  if (input >= toeRange) return input

  // べき乗カーブで黒を締める (toe が高いほど急峻)
  const power = 1 + toe * 1.5 // 1.0 ~ 2.5
  const t = input / toeRange
  const curved = Math.pow(t, power)
  return curved * toeRange
}

/**
 * Shoulder (白のロールオフ)
 * 明部を非線形にカーブさせてフィルムのようなハイライト圧縮を実現
 * @param input 入力値 (0-1)
 * @param shoulder 強度 (0-1)
 */
export const applyShoulder = (input: number, shoulder: number): number => {
  if (shoulder < 0.001) return input

  // Shoulder領域 (0.7-1.0)
  const shoulderStart = 0.7
  if (input <= shoulderStart) return input

  // 逆べき乗カーブで白を圧縮 (shoulder が高いほど圧縮が強い)
  const range = 1 - shoulderStart
  const t = (input - shoulderStart) / range
  const power = 1 / (1 + shoulder * 1.5) // 1.0 ~ 0.4
  const curved = Math.pow(t, power)
  return shoulderStart + curved * range
}

/**
 * HeroViewPreset
 *
 * HeroViewConfigのプリセット定義
 * UIで選択可能なテンプレートを表現する
 */

import type { HeroViewConfig } from './HeroViewConfig'

/**
 * HSVカラー（Brand/Accent用）
 */
export interface PresetHsvColor {
  hue: number
  saturation: number
  value: number
}

/**
 * HSV Foundation設定
 */
export interface PresetFoundation {
  hue: number
  saturation: number
  value: number
}

/**
 * プリセットのカラー設定
 */
export interface PresetColorConfig {
  brand: PresetHsvColor
  accent: PresetHsvColor
  foundation: PresetFoundation
}

/**
 * HeroViewのプリセット
 */
export interface HeroViewPreset {
  /** 一意な識別子 */
  id: string
  /** 表示名 */
  name: string
  /** サムネイル画像URL（オプション） */
  thumbnail?: string
  /** プリセットの設定値 */
  config: HeroViewConfig
  /** カラープリセット（Brand/Accent/Foundation） */
  colorPreset?: PresetColorConfig
}

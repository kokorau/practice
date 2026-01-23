/**
 * HeroViewPreset
 *
 * HeroViewConfigのプリセット定義
 * UIで選択可能なテンプレートを表現する
 *
 * 静的プリセット: configを直接指定
 * 動的プリセット: timeline + createConfigで動的に生成
 */

import type { Timeline } from '@practice/timeline'
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
 *
 * 静的プリセット: configを直接指定
 * 動的プリセット: timeline + createConfigで動的に生成（$PropertyValueバインディング対応）
 */
export interface HeroViewPreset {
  /** 一意な識別子 */
  id: string
  /** 表示名 */
  name: string
  /** 説明文（オプション） */
  description?: string
  /** サムネイル画像URL（オプション） */
  thumbnail?: string
  /** プリセットの設定値（静的プリセット用） */
  config?: HeroViewConfig
  /** カラープリセット（Brand/Accent/Foundation） */
  colorPreset?: PresetColorConfig
  /** タイムライン設定（動的プリセット用） */
  timeline?: Timeline
  /** 設定値を動的に生成する関数（動的プリセット用、$PropertyValueバインディング対応） */
  createConfig?: () => HeroViewConfig
}

/**
 * 静的プリセットかどうかを判定
 */
export const isStaticPreset = (preset: HeroViewPreset): preset is HeroViewPreset & { config: HeroViewConfig } => {
  return preset.config !== undefined && preset.timeline === undefined
}

/**
 * 動的プリセット（Timeline付き）かどうかを判定
 */
export const isAnimatedPreset = (preset: HeroViewPreset): preset is HeroViewPreset & { timeline: Timeline; createConfig: () => HeroViewConfig } => {
  return preset.timeline !== undefined && preset.createConfig !== undefined
}

/**
 * プリセットからHeroViewConfigを取得（静的/動的両対応）
 */
export const getPresetConfig = (preset: HeroViewPreset): HeroViewConfig | undefined => {
  if (isAnimatedPreset(preset)) {
    return preset.createConfig()
  }
  return preset.config
}

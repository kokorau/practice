/**
 * Preset - フィルタープリセット定義
 */

import { type Adjustment, $Adjustment } from './Adjustment'
import { type Filter, $Filter } from './Filter'
import type { Lut3D } from './Lut3D'

/** プリセットカテゴリ */
export type PresetCategory =
  | 'film'       // フィルムエミュレーション
  | 'cinematic'  // シネマティック
  | 'vintage'    // ヴィンテージ
  | 'bw'         // モノクロ
  | 'creative'   // クリエイティブ
  | 'design'     // デザイン (Duotone/Selective Color)

/** プリセット定義 */
export type Preset = {
  /** 一意のID */
  id: string
  /** 表示名 */
  name: string
  /** カテゴリ */
  category: PresetCategory
  /** 短い説明（UI表示用、日本語） */
  description?: string
  /** AI向け詳細説明（効果、適したシーン、特徴を含む、英語推奨） */
  aiDescription?: string
  /** 適したシーン・被写体のタグ */
  suitableFor?: string[]
  /** 色調特性タグ */
  characteristics?: string[]
  /** Adjustment パラメータ (identityからの差分) */
  adjustment: Partial<Adjustment>
  /** Master Curve ポイント (オプション、指定しなければidentity) */
  masterPoints?: number[]
  /** 3D LUT (指定した場合、1D LUTの代わりにこちらを使用) */
  lut3d?: Lut3D
}

export const $Preset = {
  /** PresetからFilterを生成 */
  toFilter: (preset: Preset, pointCount: number = 7): Filter => {
    const base = $Filter.identity(pointCount)
    const identity = $Adjustment.identity()

    // Adjustmentをマージ
    const adjustment: Adjustment = {
      ...identity,
      ...preset.adjustment,
    }

    // Master Curveがあれば適用
    const master = preset.masterPoints
      ? { points: preset.masterPoints }
      : base.master

    return {
      ...base,
      adjustment,
      master,
    }
  },

  /** カテゴリ別にグループ化 */
  groupByCategory: (presets: Preset[]): Map<PresetCategory, Preset[]> => {
    const groups = new Map<PresetCategory, Preset[]>()

    for (const preset of presets) {
      const list = groups.get(preset.category) ?? []
      list.push(preset)
      groups.set(preset.category, list)
    }

    return groups
  },

  /** カテゴリの表示名 */
  categoryLabel: (category: PresetCategory): string => {
    const labels: Record<PresetCategory, string> = {
      film: 'Film',
      cinematic: 'Cinematic',
      vintage: 'Vintage',
      bw: 'B&W',
      creative: 'Creative',
      design: 'Design',
    }
    return labels[category]
  },

  /** AI向けプリセット情報をJSON形式で取得 */
  toAIContext: (preset: Preset): string => {
    const info = {
      id: preset.id,
      name: preset.name,
      category: preset.category,
      description: preset.aiDescription || preset.description || '',
      suitableFor: preset.suitableFor || [],
      characteristics: preset.characteristics || [],
    }
    return JSON.stringify(info, null, 2)
  },

  /** 全プリセットのAI向けサマリーを取得 */
  getAllAIContext: (presets: Preset[]): string => {
    const summary = presets.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.aiDescription || p.description || '',
      suitableFor: p.suitableFor || [],
      characteristics: p.characteristics || [],
    }))
    return JSON.stringify(summary, null, 2)
  },

  /** UI表示用の詳細情報を取得 */
  getDisplayInfo: (preset: Preset): {
    name: string
    category: string
    description: string
    suitableFor: string[]
    characteristics: string[]
  } => ({
    name: preset.name,
    category: $Preset.categoryLabel(preset.category),
    description: preset.description || '',
    suitableFor: preset.suitableFor || [],
    characteristics: preset.characteristics || [],
  }),
}

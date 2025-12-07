import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import type { FontConfig } from './FontConfig'
import { $FontConfig } from './FontConfig'
import type { StyleConfig } from './StyleConfig'
import { $StyleConfig } from './StyleConfig'

/**
 * SiteBlueprint - サイト設定の基礎データ
 *
 * エディターが保持する設定値。
 * これを元に PreviewScene（プレビュー用）や OutputArtifact（出力用）を生成する。
 *
 * ```
 * SiteBlueprint
 *     ├──> PreviewScene
 *     └──> OutputArtifact
 * ```
 */
export type SiteBlueprint = {
  // Color
  brandColor: Oklch
  accentColor: Oklch | null
  filterPresetId: string | null
  filterIntensity: number

  // Font
  font: FontConfig

  // Style
  style: StyleConfig
}

export type SiteBlueprintParams = {
  brandColor?: Oklch
  accentColor?: Oklch | null
  filterPresetId?: string | null
  filterIntensity?: number
  fontId?: string
  stylePackId?: string
}

export const $SiteBlueprint = {
  create(params: SiteBlueprintParams = {}): SiteBlueprint {
    return {
      brandColor: params.brandColor ?? $Oklch.create(0.59, 0.18, 250), // Default blue
      accentColor: params.accentColor ?? null,
      filterPresetId: params.filterPresetId ?? null,
      filterIntensity: params.filterIntensity ?? 1,
      font: $FontConfig.create(params.fontId ?? 'inter'),
      style: $StyleConfig.create(params.stylePackId ?? 'default'),
    }
  },

  default(): SiteBlueprint {
    return $SiteBlueprint.create()
  },
}

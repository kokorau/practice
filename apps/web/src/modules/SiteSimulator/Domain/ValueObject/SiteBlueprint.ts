import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import type { FontConfig } from './FontConfig'
import { $FontConfig } from './FontConfig'
import type { StyleConfig } from './StyleConfig'
import { $StyleConfig } from './StyleConfig'
import type { FilterState } from './FilterState'
import { $FilterState } from './FilterState'

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
  readonly brandColor: Oklch
  readonly accentColor: Oklch | null

  // Filter (カーブ＋Adjustment＋強度＋プリセット)
  readonly filterState: FilterState

  // Font
  readonly font: FontConfig

  // Style
  readonly style: StyleConfig
}

export type SiteBlueprintParams = {
  brandColor?: Oklch
  accentColor?: Oklch | null
  filterState?: FilterState
  fontId?: string
  stylePackId?: string
}

export const $SiteBlueprint = {
  create(params: SiteBlueprintParams = {}): SiteBlueprint {
    return {
      brandColor: params.brandColor ?? $Oklch.create(0.59, 0.18, 250), // Default blue
      accentColor: params.accentColor ?? null,
      filterState: params.filterState ?? $FilterState.identity(7),
      font: $FontConfig.create(params.fontId ?? 'inter'),
      style: $StyleConfig.create(params.stylePackId ?? 'default'),
    }
  },

  default(): SiteBlueprint {
    return $SiteBlueprint.create()
  },

  // === Updaters ===

  setBrandColor(blueprint: SiteBlueprint, brandColor: Oklch): SiteBlueprint {
    return { ...blueprint, brandColor }
  },

  setAccentColor(blueprint: SiteBlueprint, accentColor: Oklch | null): SiteBlueprint {
    return { ...blueprint, accentColor }
  },

  setFilterState(blueprint: SiteBlueprint, filterState: FilterState): SiteBlueprint {
    return { ...blueprint, filterState }
  },

  setFontId(blueprint: SiteBlueprint, fontId: string): SiteBlueprint {
    return { ...blueprint, font: $FontConfig.create(fontId) }
  },

  setStylePackId(blueprint: SiteBlueprint, stylePackId: string): SiteBlueprint {
    return { ...blueprint, style: $StyleConfig.create(stylePackId) }
  },
}

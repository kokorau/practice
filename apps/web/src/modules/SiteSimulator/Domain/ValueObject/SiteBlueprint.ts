import type { Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import { $Oklch } from '../../../Color/Domain/ValueObject/Oklch'
import type { FontPreset } from '../../../Font/Domain/ValueObject'
import type { StylePackPreset } from '../../../StylePack/Domain/ValueObject'
import type { FontConfig } from './FontConfig'
import { $FontConfig } from './FontConfig'
import type { StyleConfig } from './StyleConfig'
import { $StyleConfig } from './StyleConfig'
import type { FilterState } from './FilterState'
import { $FilterState } from './FilterState'
import type { SectionContent } from './SectionContent'
import type { SectionMeta } from './SectionMeta'
import type { BaseTemplateMeta } from './BaseTemplateMeta'

// ============================================================
// Sub-structures
// ============================================================

/**
 * PageData - ページコンテンツ
 */
export type PageData = {
  readonly sections: readonly SectionContent[]
}

/**
 * DesignData - デザインデータ（テンプレート実体）
 *
 * Blueprint が自己完結するために、テンプレートの実体を保持。
 * Repository からコピーされる。
 */
export type DesignData = {
  /** ベーステンプレート（HTML骨格 + ベースCSS） */
  readonly baseTemplate: BaseTemplateMeta
  /** セクションテンプレート（使用中のもののみ） */
  readonly sectionTemplates: ReadonlyMap<string, SectionMeta>
  /** ユーティリティCSS */
  readonly utilityStyles: string
}

/**
 * PaletteData - カラー設定
 */
export type PaletteData = {
  readonly brandColor: Oklch
  readonly accentColor: Oklch | null
}

// ============================================================
// SiteBlueprint
// ============================================================

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
  /** ページコンテンツ */
  readonly page: PageData

  /** デザインデータ（テンプレート実体） */
  readonly design: DesignData

  /** カラー設定 */
  readonly palette: PaletteData

  /** フィルター（カーブ＋Adjustment＋強度＋プリセット） */
  readonly filterState: FilterState

  /** フォント設定 */
  readonly font: FontConfig

  /** スタイル設定 */
  readonly style: StyleConfig
}

export type SiteBlueprintParams = {
  brandColor?: Oklch
  accentColor?: Oklch | null
  filterState?: FilterState
  fontId?: string
  stylePackId?: string
  sections?: SectionContent[]
  baseTemplate?: BaseTemplateMeta
  sectionTemplates?: Map<string, SectionMeta>
  utilityStyles?: string
}

// デフォルトの空ベーステンプレート（Infra層で上書きされる）
const emptyBaseTemplate: BaseTemplateMeta = {
  templateId: 'empty',
  name: 'Empty',
  description: 'Placeholder base template',
  template: '<!DOCTYPE html><html><head>{{fonts}}{{styles}}</head><body>{{sections}}</body></html>',
  style: '',
}

export const $SiteBlueprint = {
  create(params: SiteBlueprintParams = {}): SiteBlueprint {
    return {
      page: {
        sections: params.sections ?? [],
      },
      design: {
        baseTemplate: params.baseTemplate ?? emptyBaseTemplate,
        sectionTemplates: params.sectionTemplates ?? new Map(),
        utilityStyles: params.utilityStyles ?? '',
      },
      palette: {
        brandColor: params.brandColor ?? $Oklch.create(0.59, 0.18, 250), // Default blue
        accentColor: params.accentColor ?? null,
      },
      filterState: params.filterState ?? $FilterState.identity(7),
      font: $FontConfig.create(params.fontId ?? 'inter'),
      style: $StyleConfig.create(params.stylePackId ?? 'default'),
    }
  },

  default(): SiteBlueprint {
    return $SiteBlueprint.create()
  },

  // === Palette Updaters ===

  setBrandColor(blueprint: SiteBlueprint, brandColor: Oklch): SiteBlueprint {
    return {
      ...blueprint,
      palette: { ...blueprint.palette, brandColor },
    }
  },

  setAccentColor(blueprint: SiteBlueprint, accentColor: Oklch | null): SiteBlueprint {
    return {
      ...blueprint,
      palette: { ...blueprint.palette, accentColor },
    }
  },

  // === Filter/Font/Style Updaters ===

  setFilterState(blueprint: SiteBlueprint, filterState: FilterState): SiteBlueprint {
    return { ...blueprint, filterState }
  },

  setFont(blueprint: SiteBlueprint, fontPreset: FontPreset): SiteBlueprint {
    return { ...blueprint, font: $FontConfig.fromPreset(fontPreset) }
  },

  setStyle(blueprint: SiteBlueprint, stylePreset: StylePackPreset): SiteBlueprint {
    return { ...blueprint, style: $StyleConfig.fromPreset(stylePreset) }
  },

  /** @deprecated Use setFont instead */
  setFontId(blueprint: SiteBlueprint, fontId: string): SiteBlueprint {
    return { ...blueprint, font: $FontConfig.create(fontId) }
  },

  /** @deprecated Use setStyle instead */
  setStylePackId(blueprint: SiteBlueprint, stylePackId: string): SiteBlueprint {
    return { ...blueprint, style: $StyleConfig.create(stylePackId) }
  },

  // === Design Updaters ===

  setDesign(blueprint: SiteBlueprint, design: DesignData): SiteBlueprint {
    return { ...blueprint, design }
  },

  setBaseTemplate(blueprint: SiteBlueprint, baseTemplate: BaseTemplateMeta): SiteBlueprint {
    return {
      ...blueprint,
      design: { ...blueprint.design, baseTemplate },
    }
  },

  setSectionTemplate(blueprint: SiteBlueprint, templateId: string, meta: SectionMeta): SiteBlueprint {
    const newTemplates = new Map(blueprint.design.sectionTemplates)
    newTemplates.set(templateId, meta)
    return {
      ...blueprint,
      design: { ...blueprint.design, sectionTemplates: newTemplates },
    }
  },

  setUtilityStyles(blueprint: SiteBlueprint, utilityStyles: string): SiteBlueprint {
    return {
      ...blueprint,
      design: { ...blueprint.design, utilityStyles },
    }
  },

  // === Section Updaters ===

  setSections(blueprint: SiteBlueprint, sections: SectionContent[]): SiteBlueprint {
    return {
      ...blueprint,
      page: { ...blueprint.page, sections },
    }
  },

  addSection(blueprint: SiteBlueprint, section: SectionContent, meta?: SectionMeta): SiteBlueprint {
    let newBlueprint: SiteBlueprint = {
      ...blueprint,
      page: { ...blueprint.page, sections: [...blueprint.page.sections, section] },
    }
    // テンプレートメタも一緒に追加
    if (meta) {
      newBlueprint = $SiteBlueprint.setSectionTemplate(newBlueprint, section.templateId, meta)
    }
    return newBlueprint
  },

  updateSection(blueprint: SiteBlueprint, sectionId: string, section: SectionContent): SiteBlueprint {
    return {
      ...blueprint,
      page: {
        ...blueprint.page,
        sections: blueprint.page.sections.map(s => s.id === sectionId ? section : s),
      },
    }
  },

  removeSection(blueprint: SiteBlueprint, sectionId: string): SiteBlueprint {
    return {
      ...blueprint,
      page: {
        ...blueprint.page,
        sections: blueprint.page.sections.filter(s => s.id !== sectionId),
      },
    }
  },

  moveSection(blueprint: SiteBlueprint, sectionId: string, newIndex: number): SiteBlueprint {
    const sections = [...blueprint.page.sections]
    const currentIndex = sections.findIndex(s => s.id === sectionId)
    if (currentIndex === -1) return blueprint

    const section = sections[currentIndex]
    if (!section) return blueprint
    sections.splice(currentIndex, 1)
    sections.splice(newIndex, 0, section)
    return {
      ...blueprint,
      page: { ...blueprint.page, sections },
    }
  },

  getSection(blueprint: SiteBlueprint, sectionId: string): SectionContent | undefined {
    return blueprint.page.sections.find(s => s.id === sectionId)
  },

  getSectionTemplate(blueprint: SiteBlueprint, templateId: string): SectionMeta | undefined {
    return blueprint.design.sectionTemplates.get(templateId)
  },
}

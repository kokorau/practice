import type { Filter } from '../../../Filter/Domain'

export type SectionType = 'hero' | 'feature' | 'gallery' | 'text' | 'cta'

export type ThemeRef = {
  paletteId: string
  isDark: boolean
  /** Filter preset ID (from PresetRepository) */
  filterId?: string
  /** Custom filter (used when filterId is not set) */
  filter?: Filter
}

export type Section = {
  id: string
  type: SectionType
  themeOverride?: ThemeRef
}

export type Page = {
  id: string
  theme: ThemeRef
  sections: Section[]
}

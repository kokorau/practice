import type { Filter } from '../../../Filter/Domain'

export type SectionType =
  | 'hero-split'
  | 'hero-background'
  | 'hero-stats'
  | 'hero-form'
  | 'feature'
  | 'gallery'
  | 'text'
  | 'cta'
  | 'three-column-text'
  | 'image-text'
  | 'feature-card'
  | 'header'
  | 'footer'
  | 'about'

export type ThemeRef = {
  paletteId: string
  isDark: boolean
  /** Filter preset ID (from PresetRepository) */
  filterId?: string
  /** Custom filter (used when filterId is not set) */
  filter?: Filter
  /** Font preset ID */
  fontId?: string
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

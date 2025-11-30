export type SectionType = 'hero' | 'feature' | 'gallery' | 'text' | 'cta'

export type ThemeRef = {
  paletteId: string
  isDark: boolean
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

export type SectionType = 'hero' | 'feature' | 'gallery' | 'text' | 'cta'

export type Section = {
  id: string
  type: SectionType
  colorOverride?: 'base' | 'primary' | 'secondary' | 'brand'
}

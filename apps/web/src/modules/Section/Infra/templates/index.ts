import type { SectionType } from '../../Domain/ValueObject/Section'
import type { SectionTemplate } from '../../Domain/ValueObject/SectionTemplate'
import { HeroTemplate } from './HeroTemplate'
import { FeatureTemplate } from './FeatureTemplate'
import { TextTemplate } from './TextTemplate'
import { ThreeColumnTextTemplate } from './ThreeColumnTextTemplate'
import { ImageTextTemplate } from './ImageTextTemplate'
import { CTATemplate } from './CTATemplate'
import { GalleryTemplate } from './GalleryTemplate'
import { FeatureCardTemplate } from './FeatureCardTemplate'
import { HeaderTemplate } from './HeaderTemplate'
import { FooterTemplate } from './FooterTemplate'
import { AboutTemplate } from './AboutTemplate'

const templates: Record<SectionType, SectionTemplate> = {
  hero: HeroTemplate,
  feature: FeatureTemplate,
  text: TextTemplate,
  gallery: GalleryTemplate,
  cta: CTATemplate,
  'three-column-text': ThreeColumnTextTemplate,
  'image-text': ImageTextTemplate,
  'feature-card': FeatureCardTemplate,
  header: HeaderTemplate,
  footer: FooterTemplate,
  about: AboutTemplate,
}

export const getTemplate = (type: SectionType): SectionTemplate => {
  return templates[type]
}

export const getAllTemplates = (): SectionTemplate[] => {
  return [
    HeroTemplate,
    FeatureTemplate,
    TextTemplate,
    ThreeColumnTextTemplate,
    ImageTextTemplate,
    CTATemplate,
    GalleryTemplate,
    FeatureCardTemplate,
    HeaderTemplate,
    FooterTemplate,
    AboutTemplate,
  ]
}

export {
  HeroTemplate,
  FeatureTemplate,
  TextTemplate,
  ThreeColumnTextTemplate,
  ImageTextTemplate,
  CTATemplate,
  GalleryTemplate,
  FeatureCardTemplate,
  HeaderTemplate,
  FooterTemplate,
  AboutTemplate,
}

import type { SectionType } from '../../Domain/ValueObject/Section'
import type { SectionTemplate } from '../../Domain/ValueObject/SectionTemplate'
import { HeroSplitTemplate } from './HeroSplitTemplate'
import { HeroBackgroundTemplate } from './HeroBackgroundTemplate'
import { HeroStatsTemplate } from './HeroStatsTemplate'
import { HeroFormTemplate } from './HeroFormTemplate'
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
  'hero-split': HeroSplitTemplate,
  'hero-background': HeroBackgroundTemplate,
  'hero-stats': HeroStatsTemplate,
  'hero-form': HeroFormTemplate,
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
    HeroSplitTemplate,
    HeroBackgroundTemplate,
    HeroStatsTemplate,
    HeroFormTemplate,
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
  HeroSplitTemplate,
  HeroBackgroundTemplate,
  HeroStatsTemplate,
  HeroFormTemplate,
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

import type { SectionType } from './Section'

export type HeroSplitContent = {
  title: string
  subtitle?: string
  buttonText?: string
  buttonUrl?: string
  imageUrl: string
  imageAlt?: string
  imagePosition?: 'left' | 'right'
}

export type HeroBackgroundContent = {
  title: string
  subtitle?: string
  buttonText?: string
  buttonUrl?: string
  backgroundUrl: string
  overlayOpacity?: number // 0-1, default 0.5
}

export type HeroStatsContent = {
  title: string
  subtitle?: string
  buttonText?: string
  buttonUrl?: string
  stats: {
    value: string
    label: string
  }[]
}

export type HeroFormContent = {
  title: string
  subtitle?: string
  buttonText: string
  placeholderText?: string
  trustedBy?: {
    label: string
    logos?: { url: string; alt: string }[]
  }
}

export type FeatureContent = {
  title: string
  description: string
  items: { title: string; description: string }[]
}

export type TextContent = {
  title?: string
  body: string
}

export type ThreeColumnTextContent = {
  columns: {
    title: string
    text: string
  }[]
}

export type ImageTextContent = {
  imageUrl: string
  imageAlt?: string
  title: string
  text?: string
  imagePosition: 'left' | 'right'
}

export type CTAContent = {
  title: string
  description?: string
  buttonText: string
  buttonUrl?: string
}

export type GalleryContent = {
  images: {
    url: string
    alt?: string
  }[]
}

export type FeatureCardContent = {
  title?: string
  cards: {
    imageUrl: string
    imageAlt?: string
    title: string
    description: string
  }[]
}

export type HeaderContent = {
  logoUrl?: string
  logoAlt?: string
  logoText?: string
  links: {
    label: string
    url: string
  }[]
}

export type FooterContent = {
  logoUrl?: string
  logoAlt?: string
  logoText?: string
  links: {
    label: string
    url: string
  }[]
  info?: {
    address?: string
    phone?: string
    email?: string
  }
  copyright?: string
}

export type AboutContent = {
  title: string
  description: string
  buttonText?: string
  buttonUrl?: string
}

export type SectionContent =
  | HeroSplitContent
  | HeroBackgroundContent
  | HeroStatsContent
  | HeroFormContent
  | FeatureContent
  | TextContent
  | ThreeColumnTextContent
  | ImageTextContent
  | CTAContent
  | GalleryContent
  | FeatureCardContent
  | HeaderContent
  | FooterContent
  | AboutContent

export type SectionTemplate = {
  type: SectionType
  render: (content: SectionContent, cssVars: string) => string
}

export type PageContents = Record<string, SectionContent>

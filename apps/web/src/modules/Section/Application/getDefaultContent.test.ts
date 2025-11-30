import { describe, it, expect } from 'vitest'
import { getDefaultContent } from './getDefaultContent'
import type { SectionType } from '../Domain/ValueObject/Section'
import type {
  HeroSplitContent,
  HeroBackgroundContent,
  HeroStatsContent,
  HeroFormContent,
  FeatureContent,
  TextContent,
  ThreeColumnTextContent,
  ImageTextContent,
  CTAContent,
  GalleryContent,
  FeatureCardContent,
  HeaderContent,
  FooterContent,
  AboutContent,
} from '../Domain/ValueObject/SectionTemplate'

describe('getDefaultContent', () => {
  describe('header', () => {
    it('should return header content with links', () => {
      const content = getDefaultContent('header') as HeaderContent

      expect(content.logoText).toBe('Brand')
      expect(content.links).toHaveLength(3)
      expect(content.links[0]).toEqual({ label: 'About', url: '#about' })
    })
  })

  describe('hero-split', () => {
    it('should return hero split content with image', () => {
      const content = getDefaultContent('hero-split') as HeroSplitContent

      expect(content.title).toBe('Transform Your Business')
      expect(content.subtitle).toBeDefined()
      expect(content.buttonText).toBe('Get Started')
      expect(content.imageUrl).toBeDefined()
      expect(content.imagePosition).toBe('right')
    })
  })

  describe('hero-background', () => {
    it('should return hero background content with overlay', () => {
      const content = getDefaultContent('hero-background') as HeroBackgroundContent

      expect(content.title).toBe('Discover the Future')
      expect(content.backgroundUrl).toBeDefined()
      expect(content.overlayOpacity).toBe(0.5)
    })
  })

  describe('hero-stats', () => {
    it('should return hero stats content with stats array', () => {
      const content = getDefaultContent('hero-stats') as HeroStatsContent

      expect(content.title).toBe('Trusted by Thousands')
      expect(content.stats).toHaveLength(4)
      expect(content.stats[0]).toHaveProperty('value')
      expect(content.stats[0]).toHaveProperty('label')
    })
  })

  describe('hero-form', () => {
    it('should return hero form content with trusted by section', () => {
      const content = getDefaultContent('hero-form') as HeroFormContent

      expect(content.title).toBe('Stay Ahead of the Curve')
      expect(content.buttonText).toBe('Subscribe')
      expect(content.placeholderText).toBeDefined()
      expect(content.trustedBy).toBeDefined()
      expect(content.trustedBy?.logos).toHaveLength(3)
    })
  })

  describe('about', () => {
    it('should return about content', () => {
      const content = getDefaultContent('about') as AboutContent

      expect(content.title).toBe('About Us')
      expect(content.description).toBeDefined()
      expect(content.buttonText).toBe('Learn More')
    })
  })

  describe('three-column-text', () => {
    it('should return three columns', () => {
      const content = getDefaultContent('three-column-text') as ThreeColumnTextContent

      expect(content.columns).toHaveLength(3)
      expect(content.columns[0].title).toBe('Mission')
      expect(content.columns[1].title).toBe('Vision')
      expect(content.columns[2].title).toBe('Values')
    })
  })

  describe('image-text', () => {
    it('should return image-text content', () => {
      const content = getDefaultContent('image-text') as ImageTextContent

      expect(content.imageUrl).toBeDefined()
      expect(content.title).toBe('Work Together')
      expect(content.imagePosition).toBe('left')
    })
  })

  describe('feature', () => {
    it('should return feature content with items', () => {
      const content = getDefaultContent('feature') as FeatureContent

      expect(content.title).toBe('Features')
      expect(content.description).toBeDefined()
      expect(content.items).toHaveLength(3)
      expect(content.items[0]).toHaveProperty('title')
      expect(content.items[0]).toHaveProperty('description')
    })
  })

  describe('feature-card', () => {
    it('should return feature card content with cards', () => {
      const content = getDefaultContent('feature-card') as FeatureCardContent

      expect(content.title).toBe('What We Offer')
      expect(content.cards).toHaveLength(3)
      expect(content.cards[0]).toHaveProperty('imageUrl')
      expect(content.cards[0]).toHaveProperty('title')
      expect(content.cards[0]).toHaveProperty('description')
    })
  })

  describe('gallery', () => {
    it('should return gallery content with images', () => {
      const content = getDefaultContent('gallery') as GalleryContent

      expect(content.images).toHaveLength(6)
      expect(content.images[0]).toHaveProperty('url')
      expect(content.images[0]).toHaveProperty('alt')
    })
  })

  describe('cta', () => {
    it('should return CTA content', () => {
      const content = getDefaultContent('cta') as CTAContent

      expect(content.title).toBe('Ready to Get Started?')
      expect(content.description).toBeDefined()
      expect(content.buttonText).toBe('Start Free Trial')
    })
  })

  describe('footer', () => {
    it('should return footer content with info', () => {
      const content = getDefaultContent('footer') as FooterContent

      expect(content.logoText).toBe('Brand')
      expect(content.links).toHaveLength(3)
      expect(content.info).toBeDefined()
      expect(content.info?.address).toBeDefined()
      expect(content.info?.phone).toBeDefined()
      expect(content.info?.email).toBeDefined()
      expect(content.copyright).toBeDefined()
    })
  })

  describe('text (default)', () => {
    it('should return text content for text type', () => {
      const content = getDefaultContent('text') as TextContent

      expect(content.title).toBe('Section Title')
      expect(content.body).toBeDefined()
    })
  })

  describe('all section types', () => {
    const allTypes: SectionType[] = [
      'hero-split',
      'hero-background',
      'hero-stats',
      'hero-form',
      'feature',
      'gallery',
      'text',
      'cta',
      'three-column-text',
      'image-text',
      'feature-card',
      'header',
      'footer',
      'about',
    ]

    it.each(allTypes)('should return content for %s', (type) => {
      const content = getDefaultContent(type)
      expect(content).toBeDefined()
      expect(typeof content).toBe('object')
    })

    it('should return non-null content for all types', () => {
      allTypes.forEach(type => {
        const content = getDefaultContent(type)
        expect(content).not.toBeNull()
        expect(Object.keys(content).length).toBeGreaterThan(0)
      })
    })
  })
})

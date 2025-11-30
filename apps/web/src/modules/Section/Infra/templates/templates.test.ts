import { describe, it, expect } from 'vitest'
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
import { getAllTemplates } from './index'
import {
  validateTemplateOutput,
  createTestCssVars,
  assertValidTemplate,
} from './templateTestHelper'
import type {
  HeroContent,
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
  SectionContent,
} from '../../Domain/ValueObject/SectionTemplate'

const cssVars = createTestCssVars()

describe('HeroTemplate', () => {
  const content: HeroContent = {
    title: 'Test Hero Title',
    subtitle: 'Test subtitle text',
    ctaText: 'Click Me',
  }

  it('renders valid section HTML', () => {
    const html = HeroTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)

    expect(result.isValid).toBe(true)
    expect(result.hasSection).toBe(true)
    expect(result.hasClosingTag).toBe(true)
  })

  it('uses CSS variables', () => {
    const html = HeroTemplate.render(content, cssVars)
    expect(html).toMatch(/rgb\(var\(--color-primary\)\)/)
    expect(html).toMatch(/rgb\(var\(--color-brand\)\)/)
  })

  it('renders title content', () => {
    const html = HeroTemplate.render(content, cssVars)
    expect(html).toContain(content.title)
  })

  it('renders optional subtitle when provided', () => {
    const html = HeroTemplate.render(content, cssVars)
    expect(html).toContain(content.subtitle)
  })

  it('omits subtitle when not provided', () => {
    const minimalContent: HeroContent = { title: 'Only Title' }
    const html = HeroTemplate.render(minimalContent, cssVars)
    expect(html).not.toContain('<p')
  })

  it('renders CTA button when provided', () => {
    const html = HeroTemplate.render(content, cssVars)
    expect(html).toContain('<button')
    expect(html).toContain(content.ctaText)
  })
})

describe('FeatureTemplate', () => {
  const content: FeatureContent = {
    title: 'Features Section',
    description: 'Our amazing features',
    items: [
      { title: 'Feature 1', description: 'First feature description' },
      { title: 'Feature 2', description: 'Second feature description' },
    ],
  }

  it('renders valid section HTML', () => {
    const html = FeatureTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)

    expect(result.isValid).toBe(true)
  })

  it('uses CSS variables', () => {
    const html = FeatureTemplate.render(content, cssVars)
    expect(html).toMatch(/rgb\(var\(--color-base\)\)/)
    expect(html).toMatch(/rgb\(var\(--color-secondary\)\)/)
  })

  it('renders all feature items', () => {
    const html = FeatureTemplate.render(content, cssVars)
    expect(html).toContain('Feature 1')
    expect(html).toContain('Feature 2')
    expect(html).toContain('First feature description')
  })

  it('renders section title and description', () => {
    const html = FeatureTemplate.render(content, cssVars)
    expect(html).toContain(content.title)
    expect(html).toContain(content.description)
  })
})

describe('TextTemplate', () => {
  const content: TextContent = {
    title: 'About Us',
    body: 'This is the body text content.',
  }

  it('renders valid section HTML', () => {
    const html = TextTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)

    expect(result.isValid).toBe(true)
  })

  it('uses CSS variables', () => {
    const html = TextTemplate.render(content, cssVars)
    expect(html).toMatch(/rgb\(var\(--color-base\)\)/)
  })

  it('renders title when provided', () => {
    const html = TextTemplate.render(content, cssVars)
    expect(html).toContain('<h2')
    expect(html).toContain(content.title)
  })

  it('omits title when not provided', () => {
    const minimalContent: TextContent = { body: 'Just body text' }
    const html = TextTemplate.render(minimalContent, cssVars)
    expect(html).not.toContain('<h2')
  })

  it('renders body content', () => {
    const html = TextTemplate.render(content, cssVars)
    expect(html).toContain(content.body)
  })
})

describe('ThreeColumnTextTemplate', () => {
  const content: ThreeColumnTextContent = {
    columns: [
      { title: 'Column 1', text: 'Text for column 1' },
      { title: 'Column 2', text: 'Text for column 2' },
      { title: 'Column 3', text: 'Text for column 3' },
    ],
  }

  it('renders valid section HTML', () => {
    const html = ThreeColumnTextTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders all three columns', () => {
    const html = ThreeColumnTextTemplate.render(content, cssVars)
    expect(html).toContain('Column 1')
    expect(html).toContain('Column 2')
    expect(html).toContain('Column 3')
  })

  it('uses grid layout', () => {
    const html = ThreeColumnTextTemplate.render(content, cssVars)
    expect(html).toContain('grid-template-columns: repeat(3, 1fr)')
  })
})

describe('ImageTextTemplate', () => {
  const content: ImageTextContent = {
    imageUrl: 'https://example.com/image.jpg',
    imageAlt: 'Test image',
    title: 'Image Section Title',
    text: 'Description text',
    imagePosition: 'left',
  }

  it('renders valid section HTML', () => {
    const html = ImageTextTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders image with correct src', () => {
    const html = ImageTextTemplate.render(content, cssVars)
    expect(html).toContain('src="https://example.com/image.jpg"')
  })

  it('renders title and text', () => {
    const html = ImageTextTemplate.render(content, cssVars)
    expect(html).toContain(content.title)
    expect(html).toContain(content.text)
  })

  it('uses 2-column grid', () => {
    const html = ImageTextTemplate.render(content, cssVars)
    expect(html).toContain('grid-template-columns: repeat(2, 1fr)')
  })
})

describe('CTATemplate', () => {
  const content: CTAContent = {
    title: 'Call to Action',
    description: 'Take action now',
    buttonText: 'Get Started',
    buttonUrl: '/signup',
  }

  it('renders valid section HTML', () => {
    const html = CTATemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders title and description', () => {
    const html = CTATemplate.render(content, cssVars)
    expect(html).toContain(content.title)
    expect(html).toContain(content.description)
  })

  it('renders button with link', () => {
    const html = CTATemplate.render(content, cssVars)
    expect(html).toContain('href="/signup"')
    expect(html).toContain(content.buttonText)
  })

  it('uses primary background', () => {
    const html = CTATemplate.render(content, cssVars)
    expect(html).toMatch(/rgb\(var\(--color-primary\)\)/)
  })
})

describe('GalleryTemplate', () => {
  const content: GalleryContent = {
    images: [
      { url: 'https://example.com/1.jpg', alt: 'Image 1' },
      { url: 'https://example.com/2.jpg', alt: 'Image 2' },
      { url: 'https://example.com/3.jpg', alt: 'Image 3' },
      { url: 'https://example.com/4.jpg', alt: 'Image 4' },
      { url: 'https://example.com/5.jpg', alt: 'Image 5' },
      { url: 'https://example.com/6.jpg', alt: 'Image 6' },
    ],
  }

  it('renders valid section HTML', () => {
    const html = GalleryTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders all 6 images', () => {
    const html = GalleryTemplate.render(content, cssVars)
    for (let i = 1; i <= 6; i++) {
      expect(html).toContain(`https://example.com/${i}.jpg`)
    }
  })

  it('uses 3-column grid', () => {
    const html = GalleryTemplate.render(content, cssVars)
    expect(html).toContain('grid-template-columns: repeat(3, 1fr)')
  })
})

describe('FeatureCardTemplate', () => {
  const content: FeatureCardContent = {
    title: 'Our Features',
    cards: [
      { imageUrl: 'https://example.com/1.jpg', title: 'Card 1', description: 'Desc 1' },
      { imageUrl: 'https://example.com/2.jpg', title: 'Card 2', description: 'Desc 2' },
      { imageUrl: 'https://example.com/3.jpg', title: 'Card 3', description: 'Desc 3' },
    ],
  }

  it('renders valid section HTML', () => {
    const html = FeatureCardTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders section title', () => {
    const html = FeatureCardTemplate.render(content, cssVars)
    expect(html).toContain('Our Features')
  })

  it('renders all cards', () => {
    const html = FeatureCardTemplate.render(content, cssVars)
    expect(html).toContain('Card 1')
    expect(html).toContain('Card 2')
    expect(html).toContain('Card 3')
  })

  it('uses secondary color for cards', () => {
    const html = FeatureCardTemplate.render(content, cssVars)
    expect(html).toMatch(/rgb\(var\(--color-secondary\)\)/)
  })
})

describe('HeaderTemplate', () => {
  const content: HeaderContent = {
    logoText: 'Brand',
    links: [
      { label: 'About', url: '/about' },
      { label: 'Contact', url: '/contact' },
    ],
  }

  it('renders valid section HTML', () => {
    const html = HeaderTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders logo text', () => {
    const html = HeaderTemplate.render(content, cssVars)
    expect(html).toContain('Brand')
  })

  it('renders navigation links', () => {
    const html = HeaderTemplate.render(content, cssVars)
    expect(html).toContain('href="/about"')
    expect(html).toContain('About')
    expect(html).toContain('href="/contact"')
    expect(html).toContain('Contact')
  })

  it('uses header element', () => {
    const html = HeaderTemplate.render(content, cssVars)
    expect(html).toContain('<header')
    expect(html).toContain('</header>')
  })
})

describe('FooterTemplate', () => {
  const content: FooterContent = {
    logoText: 'Brand',
    links: [
      { label: 'About', url: '/about' },
      { label: 'Contact', url: '/contact' },
    ],
    info: {
      address: '123 Main St',
      phone: '555-1234',
    },
    copyright: '© 2024 Brand',
  }

  it('renders valid section HTML', () => {
    const html = FooterTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders logo and links', () => {
    const html = FooterTemplate.render(content, cssVars)
    expect(html).toContain('Brand')
    expect(html).toContain('About')
    expect(html).toContain('Contact')
  })

  it('renders info', () => {
    const html = FooterTemplate.render(content, cssVars)
    expect(html).toContain('123 Main St')
    expect(html).toContain('555-1234')
  })

  it('renders copyright', () => {
    const html = FooterTemplate.render(content, cssVars)
    expect(html).toContain('© 2024 Brand')
  })

  it('uses footer element', () => {
    const html = FooterTemplate.render(content, cssVars)
    expect(html).toContain('<footer')
    expect(html).toContain('</footer>')
  })
})

describe('AboutTemplate', () => {
  const content: AboutContent = {
    title: 'About Us',
    description: 'We are a company that does things.',
    buttonText: 'Learn More',
    buttonUrl: '/about',
  }

  it('renders valid section HTML', () => {
    const html = AboutTemplate.render(content, cssVars)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders title and description', () => {
    const html = AboutTemplate.render(content, cssVars)
    expect(html).toContain(content.title)
    expect(html).toContain(content.description)
  })

  it('renders button', () => {
    const html = AboutTemplate.render(content, cssVars)
    expect(html).toContain('href="/about"')
    expect(html).toContain('Learn More')
  })

  it('uses 2-column layout', () => {
    const html = AboutTemplate.render(content, cssVars)
    expect(html).toContain('grid-template-columns: 1fr 2fr')
  })
})

describe('All Templates', () => {
  it('all templates pass validation', () => {
    const templates = getAllTemplates()

    const sampleContents: Record<string, SectionContent> = {
      hero: { title: 'Hero' } as HeroContent,
      feature: { title: 'Features', description: 'Desc', items: [{ title: 'Item', description: 'Desc' }] } as FeatureContent,
      text: { body: 'Text content' } as TextContent,
      'three-column-text': { columns: [{ title: 'Col', text: 'Text' }] } as ThreeColumnTextContent,
      'image-text': { imageUrl: 'https://example.com/img.jpg', title: 'Title', imagePosition: 'left' } as ImageTextContent,
      cta: { title: 'CTA', buttonText: 'Click' } as CTAContent,
      gallery: { images: [{ url: 'https://example.com/img.jpg' }] } as GalleryContent,
      'feature-card': { cards: [{ imageUrl: 'https://example.com/img.jpg', title: 'Card', description: 'Desc' }] } as FeatureCardContent,
      header: { links: [{ label: 'Link', url: '/' }] } as HeaderContent,
      footer: { links: [{ label: 'Link', url: '/' }] } as FooterContent,
      about: { title: 'About', description: 'Desc' } as AboutContent,
    }

    for (const template of templates) {
      const content = sampleContents[template.type]!
      expect(() => assertValidTemplate(template, content)).not.toThrow()
    }
  })
})

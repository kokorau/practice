import { describe, it, expect } from 'vitest'
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
import { getAllTemplates } from './index'
import {
  validateTemplateOutput,
  createTestTheme,
  assertValidTemplate,
} from './templateTestHelper'
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
  SectionContent,
} from '../../Domain/ValueObject/SectionTemplate'

const theme = createTestTheme()

describe('HeroSplitTemplate', () => {
  const content: HeroSplitContent = {
    title: 'Split Hero Title',
    subtitle: 'Split hero subtitle text',
    buttonText: 'Get Started',
    buttonUrl: '/start',
    imageUrl: 'https://example.com/hero.jpg',
    imageAlt: 'Hero image',
    imagePosition: 'right',
  }

  it('renders valid section HTML', () => {
    const html = HeroSplitTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
    expect(result.hasSection).toBe(true)
  })

  it('uses 2-column grid layout', () => {
    const html = HeroSplitTemplate.render(content, theme)
    expect(html).toContain('grid-template-columns: repeat(2, 1fr)')
  })

  it('has minimum height', () => {
    const html = HeroSplitTemplate.render(content, theme)
    expect(html).toContain('min-height: 600px')
  })

  it('renders image with full height', () => {
    const html = HeroSplitTemplate.render(content, theme)
    expect(html).toContain('src="https://example.com/hero.jpg"')
    expect(html).toContain('object-fit: cover')
  })

  it('renders title and subtitle', () => {
    const html = HeroSplitTemplate.render(content, theme)
    expect(html).toContain(content.title)
    expect(html).toContain(content.subtitle)
  })

  it('renders button when provided', () => {
    const html = HeroSplitTemplate.render(content, theme)
    expect(html).toContain('href="/start"')
    expect(html).toContain(content.buttonText)
  })

  it('supports left image position', () => {
    const leftContent: HeroSplitContent = { ...content, imagePosition: 'left' }
    const html = HeroSplitTemplate.render(leftContent, theme)
    expect(html).toContain(content.title)
    expect(html).toContain(content.imageUrl)
  })
})

describe('HeroBackgroundTemplate', () => {
  const content: HeroBackgroundContent = {
    title: 'Background Hero Title',
    subtitle: 'Hero with background image',
    buttonText: 'Learn More',
    buttonUrl: '/learn',
    backgroundUrl: 'https://example.com/bg.jpg',
    overlayOpacity: 0.6,
  }

  it('renders valid section HTML', () => {
    const html = HeroBackgroundTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('has background image', () => {
    const html = HeroBackgroundTemplate.render(content, theme)
    expect(html).toContain("url('https://example.com/bg.jpg')")
    expect(html).toContain('background-size: cover')
  })

  it('has overlay with specified opacity', () => {
    const html = HeroBackgroundTemplate.render(content, theme)
    expect(html).toContain('opacity: 0.6')
  })

  it('uses default overlay opacity of 0.5', () => {
    const minimalContent: HeroBackgroundContent = {
      title: 'Title',
      backgroundUrl: 'https://example.com/bg.jpg',
    }
    const html = HeroBackgroundTemplate.render(minimalContent, theme)
    expect(html).toContain('opacity: 0.5')
  })

  it('has minimum height', () => {
    const html = HeroBackgroundTemplate.render(content, theme)
    expect(html).toContain('min-height: 600px')
  })

  it('renders title, subtitle, and button', () => {
    const html = HeroBackgroundTemplate.render(content, theme)
    expect(html).toContain(content.title)
    expect(html).toContain(content.subtitle)
    expect(html).toContain(content.buttonText)
  })
})

describe('HeroStatsTemplate', () => {
  const content: HeroStatsContent = {
    title: 'Stats Hero Title',
    subtitle: 'We deliver results',
    buttonText: 'See Results',
    buttonUrl: '/results',
    stats: [
      { value: '100+', label: 'Projects' },
      { value: '50K', label: 'Users' },
      { value: '99%', label: 'Satisfaction' },
    ],
  }

  it('renders valid section HTML', () => {
    const html = HeroStatsTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders all stats', () => {
    const html = HeroStatsTemplate.render(content, theme)
    expect(html).toContain('100+')
    expect(html).toContain('Projects')
    expect(html).toContain('50K')
    expect(html).toContain('Users')
    expect(html).toContain('99%')
    expect(html).toContain('Satisfaction')
  })

  it('uses grid layout for stats', () => {
    const html = HeroStatsTemplate.render(content, theme)
    expect(html).toContain('grid-template-columns: repeat(3, 1fr)')
  })

  it('limits stats to 4 items', () => {
    const manyStats: HeroStatsContent = {
      ...content,
      stats: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
        { value: '4', label: 'Four' },
        { value: '5', label: 'Five' },
      ],
    }
    const html = HeroStatsTemplate.render(manyStats, theme)
    expect(html).toContain('1')
    expect(html).toContain('4')
    expect(html).not.toContain('>Five<')
  })

  it('renders title and button', () => {
    const html = HeroStatsTemplate.render(content, theme)
    expect(html).toContain(content.title)
    expect(html).toContain(content.buttonText)
  })

  it('uses brand color for stat values', () => {
    const html = HeroStatsTemplate.render(content, theme)
    expect(html).toMatch(/rgb\(var\(--color-brand\)\)/)
  })
})

describe('HeroFormTemplate', () => {
  const content: HeroFormContent = {
    title: 'Form Hero Title',
    subtitle: 'Sign up for updates',
    buttonText: 'Subscribe',
    placeholderText: 'Enter your email',
    trustedBy: {
      label: 'Trusted by',
      logos: [
        { url: 'https://example.com/logo1.png', alt: 'Company 1' },
        { url: 'https://example.com/logo2.png', alt: 'Company 2' },
      ],
    },
  }

  it('renders valid section HTML', () => {
    const html = HeroFormTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders email input with placeholder', () => {
    const html = HeroFormTemplate.render(content, theme)
    expect(html).toContain('type="email"')
    expect(html).toContain('placeholder="Enter your email"')
  })

  it('renders submit button', () => {
    const html = HeroFormTemplate.render(content, theme)
    expect(html).toContain('<button')
    expect(html).toContain(content.buttonText)
  })

  it('renders trusted by section', () => {
    const html = HeroFormTemplate.render(content, theme)
    expect(html).toContain('Trusted by')
    expect(html).toContain('https://example.com/logo1.png')
    expect(html).toContain('https://example.com/logo2.png')
  })

  it('limits logos to 5', () => {
    const manyLogos: HeroFormContent = {
      ...content,
      trustedBy: {
        label: 'Trusted by',
        logos: [
          { url: 'https://example.com/1.png', alt: '1' },
          { url: 'https://example.com/2.png', alt: '2' },
          { url: 'https://example.com/3.png', alt: '3' },
          { url: 'https://example.com/4.png', alt: '4' },
          { url: 'https://example.com/5.png', alt: '5' },
          { url: 'https://example.com/6.png', alt: '6' },
        ],
      },
    }
    const html = HeroFormTemplate.render(manyLogos, theme)
    expect(html).toContain('https://example.com/5.png')
    expect(html).not.toContain('https://example.com/6.png')
  })

  it('uses 2-column grid layout', () => {
    const html = HeroFormTemplate.render(content, theme)
    expect(html).toContain('grid-template-columns: 1fr 1fr')
  })

  it('renders without trusted by section', () => {
    const minimalContent: HeroFormContent = {
      title: 'Title',
      buttonText: 'Submit',
    }
    const html = HeroFormTemplate.render(minimalContent, theme)
    expect(html).toContain('Title')
    expect(html).not.toContain('Trusted by')
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
    const html = FeatureTemplate.render(content, theme)
    const result = validateTemplateOutput(html)

    expect(result.isValid).toBe(true)
  })

  it('uses CSS variables', () => {
    const html = FeatureTemplate.render(content, theme)
    expect(html).toMatch(/rgb\(var\(--color-base\)\)/)
    expect(html).toMatch(/rgb\(var\(--color-secondary\)\)/)
  })

  it('renders all feature items', () => {
    const html = FeatureTemplate.render(content, theme)
    expect(html).toContain('Feature 1')
    expect(html).toContain('Feature 2')
    expect(html).toContain('First feature description')
  })

  it('renders section title and description', () => {
    const html = FeatureTemplate.render(content, theme)
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
    const html = TextTemplate.render(content, theme)
    const result = validateTemplateOutput(html)

    expect(result.isValid).toBe(true)
  })

  it('uses CSS variables', () => {
    const html = TextTemplate.render(content, theme)
    expect(html).toMatch(/rgb\(var\(--color-base\)\)/)
  })

  it('renders title when provided', () => {
    const html = TextTemplate.render(content, theme)
    expect(html).toContain('<h2')
    expect(html).toContain(content.title)
  })

  it('omits title when not provided', () => {
    const minimalContent: TextContent = { body: 'Just body text' }
    const html = TextTemplate.render(minimalContent, theme)
    expect(html).not.toContain('<h2')
  })

  it('renders body content', () => {
    const html = TextTemplate.render(content, theme)
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
    const html = ThreeColumnTextTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders all three columns', () => {
    const html = ThreeColumnTextTemplate.render(content, theme)
    expect(html).toContain('Column 1')
    expect(html).toContain('Column 2')
    expect(html).toContain('Column 3')
  })

  it('uses grid layout', () => {
    const html = ThreeColumnTextTemplate.render(content, theme)
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
    const html = ImageTextTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders image with correct src', () => {
    const html = ImageTextTemplate.render(content, theme)
    expect(html).toContain('src="https://example.com/image.jpg"')
  })

  it('renders title and text', () => {
    const html = ImageTextTemplate.render(content, theme)
    expect(html).toContain(content.title)
    expect(html).toContain(content.text)
  })

  it('uses 2-column grid', () => {
    const html = ImageTextTemplate.render(content, theme)
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
    const html = CTATemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders title and description', () => {
    const html = CTATemplate.render(content, theme)
    expect(html).toContain(content.title)
    expect(html).toContain(content.description)
  })

  it('renders button with link', () => {
    const html = CTATemplate.render(content, theme)
    expect(html).toContain('href="/signup"')
    expect(html).toContain(content.buttonText)
  })

  it('uses primary background', () => {
    const html = CTATemplate.render(content, theme)
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
    const html = GalleryTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders all 6 images', () => {
    const html = GalleryTemplate.render(content, theme)
    for (let i = 1; i <= 6; i++) {
      expect(html).toContain(`https://example.com/${i}.jpg`)
    }
  })

  it('uses 3-column grid', () => {
    const html = GalleryTemplate.render(content, theme)
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
    const html = FeatureCardTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders section title', () => {
    const html = FeatureCardTemplate.render(content, theme)
    expect(html).toContain('Our Features')
  })

  it('renders all cards', () => {
    const html = FeatureCardTemplate.render(content, theme)
    expect(html).toContain('Card 1')
    expect(html).toContain('Card 2')
    expect(html).toContain('Card 3')
  })

  it('uses secondary color for cards', () => {
    const html = FeatureCardTemplate.render(content, theme)
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
    const html = HeaderTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders logo text', () => {
    const html = HeaderTemplate.render(content, theme)
    expect(html).toContain('Brand')
  })

  it('renders navigation links', () => {
    const html = HeaderTemplate.render(content, theme)
    expect(html).toContain('href="/about"')
    expect(html).toContain('About')
    expect(html).toContain('href="/contact"')
    expect(html).toContain('Contact')
  })

  it('uses header element', () => {
    const html = HeaderTemplate.render(content, theme)
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
    const html = FooterTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders logo and links', () => {
    const html = FooterTemplate.render(content, theme)
    expect(html).toContain('Brand')
    expect(html).toContain('About')
    expect(html).toContain('Contact')
  })

  it('renders info', () => {
    const html = FooterTemplate.render(content, theme)
    expect(html).toContain('123 Main St')
    expect(html).toContain('555-1234')
  })

  it('renders copyright', () => {
    const html = FooterTemplate.render(content, theme)
    expect(html).toContain('© 2024 Brand')
  })

  it('uses footer element', () => {
    const html = FooterTemplate.render(content, theme)
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
    const html = AboutTemplate.render(content, theme)
    const result = validateTemplateOutput(html)
    expect(result.isValid).toBe(true)
  })

  it('renders title and description', () => {
    const html = AboutTemplate.render(content, theme)
    expect(html).toContain(content.title)
    expect(html).toContain(content.description)
  })

  it('renders button', () => {
    const html = AboutTemplate.render(content, theme)
    expect(html).toContain('href="/about"')
    expect(html).toContain('Learn More')
  })

  it('uses 2-column layout', () => {
    const html = AboutTemplate.render(content, theme)
    expect(html).toContain('grid-template-columns: 1fr 2fr')
  })
})

describe('All Templates', () => {
  it('all templates pass validation', () => {
    const templates = getAllTemplates()

    const sampleContents: Record<string, SectionContent> = {
      'hero-split': { title: 'Split', imageUrl: 'https://example.com/img.jpg' } as HeroSplitContent,
      'hero-background': { title: 'Background', backgroundUrl: 'https://example.com/bg.jpg' } as HeroBackgroundContent,
      'hero-stats': { title: 'Stats', stats: [{ value: '100', label: 'Users' }] } as HeroStatsContent,
      'hero-form': { title: 'Form', buttonText: 'Submit' } as HeroFormContent,
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

/**
 * Default Content - Sample content for each section type
 */

import type {
  SectionKind,
  SectionKindContentMap,
  Page,
  HeroSection,
  HeaderContent,
  HeroContent,
  FeaturesContent,
  LogosContent,
  HowItWorksContent,
  TestimonialsContent,
  PricingContent,
  FAQContent,
  CTAContent,
  FooterContent,
} from '../Domain'
import { $Page, $Section } from '../Domain'
import type { HeroViewConfig, PropertyValue } from '@practice/section-visual'
import { $PropertyValue } from '@practice/section-visual'

/** Shorthand for wrapping value as PropertyValue */
const sv = (v: string | number | boolean): PropertyValue => $PropertyValue.static(v)

// Legacy type alias
type SectionType = SectionKind
type SectionContentMap = SectionKindContentMap

// ============================================================================
// Default Content for Each Section Type
// ============================================================================

const headerContent: HeaderContent = {
  logoText: 'PaletteGen',
  links: [
    { label: 'Features', url: '#features' },
    { label: 'Pricing', url: '#pricing' },
    { label: 'Docs', url: '#docs' },
  ],
  ctaLabel: 'Log in',
  ctaUrl: '#signup',
}

const heroContent: HeroContent = {
  badge: 'Now in Public Beta',
  title: 'Design with Perfect Colors',
  highlight: 'Perfect Colors',
  subtitle:
    'Create beautiful, accessible color palettes for your next project. Powered by OKLCH for perceptually uniform results.',
  primaryCtaLabel: 'Start Free',
  secondaryCtaLabel: 'Watch Demo',
  stats: [
    { value: '10K+', label: 'Designers' },
    { value: '50K+', label: 'Palettes' },
    { value: '4.9', label: 'Rating' },
  ],
}

const featuresContent: FeaturesContent = {
  title: 'Features',
  features: [
    {
      title: 'OKLCH Colors',
      description: 'Perceptually uniform color space for consistent results.',
    },
    {
      title: 'Auto Contrast',
      description: 'Automatically ensures accessible contrast ratios.',
    },
    {
      title: 'Light & Dark',
      description: 'Seamless theme switching built right in.',
    },
  ],
}

const logosContent: LogosContent = {
  label: 'Trusted by teams at',
  logos: ['Acme Inc', 'Globex', 'Stark', 'Wayne', 'Umbrella'],
}

const howItWorksContent: HowItWorksContent = {
  title: 'How it works',
  steps: [
    {
      title: 'Pick a brand color',
      description: 'Choose your primary brand color using our intuitive color picker.',
    },
    {
      title: 'Adjust parameters',
      description: 'Fine-tune lightness, chroma, and contrast to match your vision.',
    },
    {
      title: 'Export & use',
      description: 'Export as CSS variables, Tailwind config, or design tokens.',
    },
  ],
}

const testimonialsContent: TestimonialsContent = {
  title: 'What people are saying',
  testimonials: [
    {
      quote:
        'Finally, a color tool that understands accessibility. The auto-contrast feature alone saves us hours every week.',
      authorName: 'Sarah Chen',
      authorRole: 'Design Lead, Figma',
    },
    {
      quote:
        'We switched from HSL to OKLCH thanks to this tool. The perceptual uniformity makes such a difference.',
      authorName: 'Marcus Johnson',
      authorRole: 'Senior Engineer, Vercel',
    },
    {
      quote:
        "The best palette generator I've used. Dark mode support out of the box is a game changer.",
      authorName: 'Emily Park',
      authorRole: 'Product Designer, Linear',
    },
  ],
}

const pricingContent: PricingContent = {
  title: 'Simple pricing',
  subtitle: 'Start free, upgrade when you need more.',
  plans: [
    {
      name: 'Free',
      price: '$0',
      period: 'month',
      features: [
        { text: '5 palettes' },
        { text: 'CSS export' },
        { text: 'Basic support' },
      ],
      ctaLabel: 'Get Started',
    },
    {
      name: 'Pro',
      price: '$12',
      period: 'month',
      features: [
        { text: 'Unlimited palettes' },
        { text: 'All export formats' },
        { text: 'Team sharing' },
        { text: 'Priority support' },
      ],
      ctaLabel: 'Start Free Trial',
      isFeatured: true,
      badge: 'Popular',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: [
        { text: 'Everything in Pro' },
        { text: 'SSO & SAML' },
        { text: 'Dedicated support' },
        { text: 'Custom integrations' },
      ],
      ctaLabel: 'Contact Sales',
    },
  ],
}

const faqContent: FAQContent = {
  title: 'Frequently asked questions',
  items: [
    {
      question: 'What is OKLCH and why should I use it?',
      answer:
        'OKLCH is a perceptually uniform color space. Unlike HSL, colors with the same lightness value actually appear equally bright to human eyes, making it ideal for creating consistent design systems.',
    },
    {
      question: 'Can I export to Tailwind CSS?',
      answer:
        'Yes! Pro users can export palettes directly to Tailwind config format, including CSS variables and theme extensions.',
    },
    {
      question: 'How does auto-contrast work?',
      answer:
        'Our algorithm automatically calculates WCAG-compliant contrast ratios and adjusts text colors to ensure readability on any background.',
    },
    {
      question: 'Is there a Figma plugin?',
      answer:
        "We're currently developing a Figma plugin. Join our waitlist to be notified when it's ready.",
    },
  ],
}

const ctaContent: CTAContent = {
  title: 'Ready to Start?',
  description: 'Join thousands of designers using our palette generator.',
  benefits: ['Free forever', 'No credit card', 'Instant access'],
  inputPlaceholder: 'Enter your email',
  ctaLabel: 'Get Started',
  note: 'By signing up, you agree to our Terms and Privacy Policy.',
}

const footerContent: FooterContent = {
  logoText: 'PaletteGen',
  tagline: 'Beautiful colors for everyone.',
  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'Features', url: '#' },
        { label: 'Pricing', url: '#' },
        { label: 'Changelog', url: '#' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Documentation', url: '#' },
        { label: 'Guides', url: '#' },
        { label: 'API', url: '#' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', url: '#' },
        { label: 'Blog', url: '#' },
        { label: 'Careers', url: '#' },
      ],
    },
  ],
  copyright: '© 2024 PaletteGen. All rights reserved.',
  legalLinks: [
    { label: 'Privacy', url: '#' },
    { label: 'Terms', url: '#' },
  ],
}

// ============================================================================
// Default Content Map
// ============================================================================

const defaultContents: SectionContentMap = {
  header: headerContent,
  hero: heroContent,
  features: featuresContent,
  logos: logosContent,
  howItWorks: howItWorksContent,
  testimonials: testimonialsContent,
  pricing: pricingContent,
  faq: faqContent,
  cta: ctaContent,
  footer: footerContent,
}

/**
 * Get default content for a section type
 */
export const getDefaultContent = <T extends SectionType>(type: T): SectionContentMap[T] => {
  return defaultContents[type]
}

/**
 * Get all default contents
 */
export const getAllDefaultContents = (): SectionContentMap => defaultContents

// ============================================================================
// Corporate Clean Preset Config for Demo Hero
// ============================================================================

/**
 * Corporate Clean preset config for the demo hero section
 */
const corporateCleanConfig: HeroViewConfig = {
  viewport: { width: 1280, height: 720 },
  colors: {
    semanticContext: 'canvas',
  },
  layers: [
    {
      type: 'base',
      id: 'base',
      name: 'Background',
      visible: true,
      surface: {
        id: 'grid',
        params: {
          lineWidth: sv(1),
          cellSize: sv(48),
          color1: sv('BN1'),
          color2: sv('BN2'),
        },
      },
    },
    {
      type: 'processor',
      id: 'bg-processor',
      name: 'Background Effects',
      visible: true,
      modifiers: [
        {
          type: 'effect',
          id: 'vignette',
          params: { shape: sv('ellipse'), intensity: sv(0.3), softness: sv(0.6), radius: sv(0.8), centerX: sv(0.5), centerY: sv(0.5), aspectRatio: sv(1) },
        },
      ],
    },
    {
      type: 'surface',
      id: 'surface-1',
      name: 'Mask Surface',
      visible: true,
      surface: {
        id: 'solid',
        params: {
          color1: sv('B'),
        },
      },
    },
    {
      type: 'processor',
      id: 'processor-mask',
      name: 'Mask Processor',
      visible: true,
      modifiers: [
        {
          type: 'mask',
          enabled: true,
          shape: {
            id: 'rect',
            params: {
              left: sv(0.05), right: sv(0.55), top: sv(0.1), bottom: sv(0.9),
              radiusTopLeft: sv(0.02), radiusTopRight: sv(0.02),
              radiusBottomLeft: sv(0.02), radiusBottomRight: sv(0.02),
              rotation: sv(0), perspectiveX: sv(0), perspectiveY: sv(0),
              cutout: sv(true),
            },
          },
          invert: false,
          feather: 0,
        },
      ],
    },
  ],
  foreground: {
    elements: [
      { id: 'title-1', type: 'title', visible: true, position: 'middle-right', content: 'Enterprise Solutions', fontSize: 3.5, fontId: 'inter' },
      { id: 'description-1', type: 'description', visible: true, position: 'middle-right', content: 'Streamline your business with our platform.', fontSize: 1.25, fontId: 'ibm-plex-sans' },
    ],
  },
}

/**
 * Create a demo page with all section types and default content embedded
 * Hero section includes Corporate Clean canvas config
 */
export const createDemoPage = (): Page => {
  const basePage = $Page.createDemoWithContent(getDefaultContent)

  // Replace hero section with one that includes canvas config
  const sections = basePage.sections.map((section) => {
    if (section.kind === 'hero') {
      return $Section.createHero(section.content, corporateCleanConfig, section.id) as HeroSection
    }
    return section
  })

  return {
    ...basePage,
    sections,
  }
}

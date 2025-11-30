import type { SectionType } from '../Domain/ValueObject/Section'
import type {
  SectionContent,
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

export const getDefaultContent = (type: SectionType): SectionContent => {
  switch (type) {
    case 'header':
      return {
        logoText: 'Brand',
        links: [
          { label: 'About', url: '#about' },
          { label: 'Features', url: '#features' },
          { label: 'Contact', url: '#contact' },
        ],
      } as HeaderContent
    case 'hero-split':
      return {
        title: 'Transform Your Business',
        subtitle: 'Powerful tools and beautiful design to help you succeed in the digital age.',
        buttonText: 'Get Started',
        buttonUrl: '#',
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
        imageAlt: 'Team working together',
        imagePosition: 'right',
      } as HeroSplitContent
    case 'hero-background':
      return {
        title: 'Discover the Future',
        subtitle: 'Experience innovation like never before with our cutting-edge solutions.',
        buttonText: 'Explore Now',
        buttonUrl: '#',
        backgroundUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600',
        overlayOpacity: 0.5,
      } as HeroBackgroundContent
    case 'hero-stats':
      return {
        title: 'Trusted by Thousands',
        subtitle: 'Our platform has helped businesses of all sizes achieve their goals.',
        buttonText: 'View Success Stories',
        buttonUrl: '#',
        stats: [
          { value: '10K+', label: 'Active Users' },
          { value: '99.9%', label: 'Uptime' },
          { value: '24/7', label: 'Support' },
          { value: '50+', label: 'Countries' },
        ],
      } as HeroStatsContent
    case 'hero-form':
      return {
        title: 'Stay Ahead of the Curve',
        subtitle: 'Get exclusive insights and updates delivered straight to your inbox.',
        buttonText: 'Subscribe',
        placeholderText: 'Enter your email',
        trustedBy: {
          label: 'Trusted by leading companies',
          logos: [
            { url: 'https://via.placeholder.com/100x30?text=Acme', alt: 'Acme Inc' },
            { url: 'https://via.placeholder.com/100x30?text=TechCo', alt: 'TechCo' },
            { url: 'https://via.placeholder.com/100x30?text=StartUp', alt: 'StartUp' },
          ],
        },
      } as HeroFormContent
    case 'about':
      return {
        title: 'About Us',
        description: 'We are a team of passionate developers and designers dedicated to creating the best possible experience for our users. Our mission is to make the web more beautiful and accessible.',
        buttonText: 'Learn More',
        buttonUrl: '#',
      } as AboutContent
    case 'three-column-text':
      return {
        columns: [
          { title: 'Mission', text: 'To empower creators with the tools they need to build amazing digital experiences.' },
          { title: 'Vision', text: 'A world where anyone can bring their ideas to life on the web.' },
          { title: 'Values', text: 'Innovation, simplicity, and user-centric design guide everything we do.' },
        ],
      } as ThreeColumnTextContent
    case 'image-text':
      return {
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        imageAlt: 'Team collaboration',
        title: 'Work Together',
        text: 'Collaboration is at the heart of what we do. Our platform makes it easy to work together on projects of any size.',
        imagePosition: 'left',
      } as ImageTextContent
    case 'feature':
      return {
        title: 'Features',
        description: 'Everything you need to build modern web applications.',
        items: [
          { title: 'Fast', description: 'Optimized for speed and performance.' },
          { title: 'Flexible', description: 'Customize everything to your needs.' },
          { title: 'Beautiful', description: 'Stunning designs out of the box.' },
        ],
      } as FeatureContent
    case 'feature-card':
      return {
        title: 'What We Offer',
        cards: [
          { imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400', title: 'Analytics', description: 'Track your performance with detailed analytics.' },
          { imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400', title: 'Collaboration', description: 'Work together seamlessly with your team.' },
          { imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400', title: 'Integration', description: 'Connect with your favorite tools and services.' },
        ],
      } as FeatureCardContent
    case 'gallery':
      return {
        images: [
          { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', alt: 'Coding' },
          { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', alt: 'Team' },
          { url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400', alt: 'Tech' },
          { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400', alt: 'Work' },
          { url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400', alt: 'Code' },
          { url: 'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?w=400', alt: 'Design' },
        ],
      } as GalleryContent
    case 'cta':
      return {
        title: 'Ready to Get Started?',
        description: 'Join thousands of satisfied customers who have transformed their workflow.',
        buttonText: 'Start Free Trial',
        buttonUrl: '#',
      } as CTAContent
    case 'footer':
      return {
        logoText: 'Brand',
        links: [
          { label: 'About', url: '#about' },
          { label: 'Features', url: '#features' },
          { label: 'Contact', url: '#contact' },
        ],
        info: {
          address: '123 Main Street, City',
          phone: '+1 (555) 123-4567',
          email: 'hello@example.com',
        },
        copyright: '© 2024 Brand. All rights reserved.',
      } as FooterContent
    case 'text':
    default:
      return {
        title: 'Section Title',
        body: 'This is a text section. You can add any content here to describe your product, service, or story.',
      } as TextContent
  }
}

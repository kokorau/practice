import { $SectionMeta, $SectionContent, type SectionTemplate } from '../../../../Domain/ValueObject'
import template from './template.html?raw'
import style from './style.css?raw'

export default {
  meta: $SectionMeta.create(
    'hero',
    'Hero',
    'Full-width hero with background image, title, description, and CTA',
    template,
    style,
    [
      { id: 'backgroundImage', type: 'image', label: 'Background Image', required: true },
      { id: 'title', type: 'text', label: 'Title', required: true },
      { id: 'description', type: 'text', label: 'Description', required: false },
      { id: 'cta', type: 'button', label: 'CTA Button', required: false },
    ]
  ),
  defaultContent: () =>
    $SectionContent.create('hero', {
      backgroundImage: $SectionContent.image('https://picsum.photos/seed/hero/1920/1080', 'Hero background'),
      title: $SectionContent.text('Welcome to Our Site'),
      description: $SectionContent.text('Discover amazing features and possibilities that will transform your experience'),
      cta: $SectionContent.button('Get Started', 'primary'),
    }),
} satisfies SectionTemplate

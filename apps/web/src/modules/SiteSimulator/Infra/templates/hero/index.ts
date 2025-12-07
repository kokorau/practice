import { $SectionMeta, $SectionContent } from '../../../Domain/ValueObject'
import type { SectionTemplate } from '../../TemplateRepository'
import template from './template.html?raw'

export const heroTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'hero',
    'Hero',
    'Large hero section with title and CTA',
    template,
    [
      { id: 'title', type: 'text', label: 'Title', required: true },
      { id: 'subtitle', type: 'text', label: 'Subtitle', required: false },
      { id: 'cta', type: 'button', label: 'CTA Button', required: false },
    ]
  ),
  defaultContent: () =>
    $SectionContent.create('hero', {
      title: $SectionContent.text('Welcome to Our Site'),
      subtitle: $SectionContent.text('Discover amazing features and possibilities'),
      cta: $SectionContent.button('Get Started', 'primary'),
    }),
}

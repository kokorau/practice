import { $SectionMeta, $SectionContent } from '../../../Domain/ValueObject'
import type { SectionTemplate } from '../../TemplateRepository'
import template from './template.html?raw'

export const ctaTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'cta',
    'Call to Action',
    'Simple CTA banner',
    template,
    [
      { id: 'title', type: 'text', label: 'Title', required: true },
      { id: 'description', type: 'text', label: 'Description', required: false },
      { id: 'button', type: 'button', label: 'Button', required: true },
    ]
  ),
  defaultContent: () =>
    $SectionContent.create('cta', {
      title: $SectionContent.text('Ready to get started?'),
      description: $SectionContent.text('Join thousands of satisfied customers today.'),
      button: $SectionContent.button('Sign Up Now', 'accent'),
    }),
}

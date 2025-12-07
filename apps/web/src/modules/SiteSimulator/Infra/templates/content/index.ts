import { $SectionMeta, $SectionContent } from '../../../Domain/ValueObject'
import type { SectionTemplate } from '../../TemplateRepository'
import template from './template.html?raw'

export const contentTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'content',
    'Content',
    'Rich text content block',
    template,
    [
      { id: 'title', type: 'text', label: 'Title', required: false },
      { id: 'body', type: 'richtext', label: 'Body', required: true },
    ]
  ),
  defaultContent: () =>
    $SectionContent.create('content', {
      title: $SectionContent.text('About Us'),
      body: $SectionContent.richtext('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    }),
}

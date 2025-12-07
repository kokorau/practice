import { $SectionMeta, $SectionContent, type SectionTemplate } from '../../../Domain/ValueObject'
import template from './template.html?raw'
import style from './style.css?raw'

export default {
  meta: $SectionMeta.create(
    'content',
    'Content',
    'Rich text content block',
    template,
    style,
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
} satisfies SectionTemplate

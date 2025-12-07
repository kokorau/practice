import { $SectionMeta, $SectionContent } from '../../../Domain/ValueObject'
import type { SectionTemplate } from '../../TemplateRepository'
import template from './template.html?raw'

export const cardsTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'cards',
    'Cards',
    'Card grid layout',
    template,
    [
      { id: 'title', type: 'text', label: 'Section Title', required: false },
      { id: 'items', type: 'list', label: 'Cards', required: true },
    ]
  ),
  defaultContent: () =>
    $SectionContent.create('cards', {
      title: $SectionContent.text('Our Services'),
      items: $SectionContent.list([
        $SectionContent.listItem('c1', 'Card 1', 'Card description text'),
        $SectionContent.listItem('c2', 'Card 2', 'Card description text'),
        $SectionContent.listItem('c3', 'Card 3', 'Card description text'),
      ]),
    }),
}

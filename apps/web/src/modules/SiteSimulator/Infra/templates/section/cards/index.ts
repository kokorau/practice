import { $SectionMeta, $SectionContent, type SectionTemplate } from '../../../../Domain/ValueObject'
import template from './template.html?raw'
import style from './style.css?raw'

export default {
  meta: $SectionMeta.create(
    'cards',
    'Cards',
    'Card grid layout with images',
    template,
    style,
    [
      { id: 'title', type: 'text', label: 'Section Title', required: false },
      { id: 'description', type: 'text', label: 'Section Description', required: false },
      { id: 'items', type: 'list', label: 'Cards', required: true },
    ]
  ),
  defaultContent: () =>
    $SectionContent.create('cards', {
      title: $SectionContent.text('Case Studies'),
      description: $SectionContent.text(
        'See how leading companies have transformed their business with our solutions.'
      ),
      items: $SectionContent.list([
        $SectionContent.listItem(
          'c1',
          'TechCorp Inc.',
          'Reduced operational costs by 40% and improved customer satisfaction scores by implementing our automated workflow system.',
          $SectionContent.image('https://picsum.photos/seed/case1/800/500', 'TechCorp office')
        ),
        $SectionContent.listItem(
          'c2',
          'Global Retail Co.',
          'Achieved 3x faster page load times and 25% increase in conversion rates after migrating to our cloud platform.',
          $SectionContent.image('https://picsum.photos/seed/case2/800/500', 'Global Retail storefront')
        ),
        $SectionContent.listItem(
          'c3',
          'HealthFirst Medical',
          'Streamlined patient data management across 50+ clinics, reducing administrative overhead by 60%.',
          $SectionContent.image('https://picsum.photos/seed/case3/800/500', 'HealthFirst clinic')
        ),
      ]),
    }),
} satisfies SectionTemplate

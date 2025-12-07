import type { SectionMeta, SectionContent } from '../Domain/ValueObject'
import { $SectionMeta, $SectionContent } from '../Domain/ValueObject'

/**
 * SectionTemplate - テンプレート定義（Meta + デフォルトコンテンツ）
 */
export type SectionTemplate = {
  readonly meta: SectionMeta
  readonly defaultContent: () => SectionContent
}

// ============================================================
// Template Definitions
// ============================================================

const heroTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'hero',
    'Hero',
    'Large hero section with title and CTA',
    `<section data-bg="surface.base" data-padding="xl" class="text-center">
  <h1 data-color="text.primary" class="text-4xl font-bold mb-4">{{title}}</h1>
  <p data-color="text.secondary" class="text-xl mb-8">{{subtitle}}</p>
  <button data-bg="{{cta.variant}}" data-color="text.onBrandPrimary" data-radius class="px-6 py-3 font-medium text-lg">
    {{cta.label}}
  </button>
</section>`,
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

const cardsTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'cards',
    'Cards',
    'Card grid layout',
    `<section data-bg="surface.elevated" data-padding="lg">
  <h2 data-color="text.primary" class="text-2xl font-semibold mb-6">{{title}}</h2>
  <div class="grid grid-cols-3" data-gap="md">
    {{#each items}}
    <div data-bg="surface.card" data-border="surface.border" data-radius data-padding="lg">
      <h3 data-color="text.primary" class="font-semibold mb-1">{{title}}</h3>
      <p data-color="text.secondary" class="text-sm">{{description}}</p>
    </div>
    {{/each}}
  </div>
</section>`,
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

const ctaTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'cta',
    'Call to Action',
    'Simple CTA banner',
    `<section data-bg="surface.base" data-padding="lg" class="text-center">
  <h2 data-color="text.primary" class="text-2xl font-bold mb-2">{{title}}</h2>
  <p data-color="text.secondary" class="mb-6">{{description}}</p>
  <button data-bg="{{button.variant}}" data-color="text.onAccent" data-radius class="px-6 py-3 font-medium">
    {{button.label}}
  </button>
</section>`,
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

const contentTemplate: SectionTemplate = {
  meta: $SectionMeta.create(
    'content',
    'Content',
    'Rich text content block',
    `<section data-bg="surface.base" data-padding="lg">
  <h2 data-color="text.primary" class="text-2xl font-semibold mb-4">{{title}}</h2>
  <div data-color="text.secondary" class="prose">{{body}}</div>
</section>`,
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

// ============================================================
// Template Registry
// ============================================================

const templates = new Map<string, SectionTemplate>([
  ['hero', heroTemplate],
  ['cards', cardsTemplate],
  ['cta', ctaTemplate],
  ['content', contentTemplate],
])

// ============================================================
// Repository
// ============================================================

export const TemplateRepository = {
  get(templateId: string): SectionTemplate | undefined {
    return templates.get(templateId)
  },

  getMeta(templateId: string): SectionMeta | undefined {
    return templates.get(templateId)?.meta
  },

  getAll(): SectionTemplate[] {
    return Array.from(templates.values())
  },

  getAllIds(): string[] {
    return Array.from(templates.keys())
  },

  createDefaultContent(templateId: string): SectionContent | undefined {
    return templates.get(templateId)?.defaultContent()
  },

  register(template: SectionTemplate): void {
    templates.set(template.meta.templateId, template)
  },

  getDefaultSections(): SectionContent[] {
    return [
      heroTemplate.defaultContent(),
      cardsTemplate.defaultContent(),
      ctaTemplate.defaultContent(),
    ]
  },
}

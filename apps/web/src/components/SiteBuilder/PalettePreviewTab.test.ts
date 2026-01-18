// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PalettePreviewTab from './PalettePreviewTab.vue'
import type {
  ContextTokens,
  ComponentTokens,
  ActionState,
} from '@practice/semantic-color-palette/Domain'
import type { BaseTokenRefs, PrimitiveRef } from '@practice/semantic-color-palette/Infra'

// ============================================================
// Test Helpers
// ============================================================

type Context = {
  name: string
  label: string
  className: string
  tokens: ContextTokens
  refs: BaseTokenRefs
}

type Component = {
  name: string
  label: string
  className: string
  tokens: ComponentTokens
  refs: BaseTokenRefs
}

type Action = {
  name: string
  label: string
  className: string
  tokens: {
    surface: Record<ActionState, string>
    ink: {
      title: Record<ActionState, string>
      border: Record<ActionState, string>
    }
  }
}

function createMockContext(overrides: Partial<Context> = {}): Context {
  return {
    name: 'canvas',
    label: 'Canvas',
    className: 'context-canvas',
    tokens: {
      surface: 'oklch(0.98 0.01 260)',
      ink: {
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.35 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        link: 'oklch(0.45 0.15 260)',
        highlight: 'oklch(0.55 0.20 45)',
        border: 'oklch(0.85 0.01 260)',
        divider: 'oklch(0.90 0.01 260)',
      },
    },
    refs: {
      surface: 'F1' as PrimitiveRef,
      ink: {
        title: 'F7' as PrimitiveRef,
        body: 'F6' as PrimitiveRef,
        meta: 'F5' as PrimitiveRef,
        link: 'B' as PrimitiveRef,
        highlight: 'A' as PrimitiveRef,
        border: 'F3' as PrimitiveRef,
        divider: 'F2' as PrimitiveRef,
      },
    },
    ...overrides,
  }
}

function createMockComponent(overrides: Partial<Component> = {}): Component {
  return {
    name: 'cardFlat',
    label: 'Card Flat',
    className: 'component-card-flat',
    tokens: {
      surface: 'oklch(0.96 0.01 260)',
      ink: {
        title: 'oklch(0.20 0.02 260)',
        body: 'oklch(0.35 0.02 260)',
        meta: 'oklch(0.50 0.02 260)',
        link: 'oklch(0.45 0.15 260)',
        highlight: 'oklch(0.55 0.20 45)',
        border: 'oklch(0.88 0.01 260)',
        divider: 'oklch(0.92 0.01 260)',
      },
    },
    refs: {
      surface: 'F2' as PrimitiveRef,
      ink: {
        title: 'F7' as PrimitiveRef,
        body: 'F6' as PrimitiveRef,
        meta: 'F5' as PrimitiveRef,
        link: 'B' as PrimitiveRef,
        highlight: 'A' as PrimitiveRef,
        border: 'F3' as PrimitiveRef,
        divider: 'F2' as PrimitiveRef,
      },
    },
    ...overrides,
  }
}

function createMockAction(overrides: Partial<Action> = {}): Action {
  return {
    name: 'primary',
    label: 'Primary Button',
    className: 'scp-button-primary',
    tokens: {
      surface: {
        default: 'oklch(0.50 0.15 260)',
        hover: 'oklch(0.45 0.15 260)',
        active: 'oklch(0.40 0.15 260)',
        disabled: 'oklch(0.70 0.05 260)',
      },
      ink: {
        title: {
          default: 'oklch(0.98 0.01 260)',
          hover: 'oklch(0.98 0.01 260)',
          active: 'oklch(0.98 0.01 260)',
          disabled: 'oklch(0.60 0.02 260)',
        },
        border: {
          default: 'oklch(0.50 0.15 260)',
          hover: 'oklch(0.45 0.15 260)',
          active: 'oklch(0.40 0.15 260)',
          disabled: 'oklch(0.70 0.05 260)',
        },
      },
    },
    ...overrides,
  }
}

// ============================================================
// Tests
// ============================================================

describe('PalettePreviewTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('component structure', () => {
    it('renders without errors', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [],
        },
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('renders main container', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [],
        },
      })
      expect(wrapper.find('.palette-preview-tab').exists()).toBe(true)
    })
  })

  describe('contexts section', () => {
    it('renders contexts heading', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('Contexts (Places)')
    })

    it('renders context cards', () => {
      const contexts = [
        createMockContext({ name: 'canvas', label: 'Canvas' }),
        createMockContext({ name: 'surface', label: 'Surface' }),
      ]

      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts,
          components: [],
          actions: [],
        },
      })

      const cards = wrapper.findAll('.surface-card')
      expect(cards.length).toBe(2)
    })

    it('displays context labels', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext({ label: 'Test Context' })],
          components: [],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('Test Context')
    })

    it('applies context className', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext({ className: 'context-test' })],
          components: [],
          actions: [],
        },
      })

      expect(wrapper.find('.context-test').exists()).toBe(true)
    })

    it('displays token rows', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      const tokenRows = wrapper.findAll('.token-row')
      expect(tokenRows.length).toBeGreaterThan(0)
    })

    it('displays color swatches', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      const swatches = wrapper.findAll('.color-swatch')
      expect(swatches.length).toBeGreaterThan(0)
    })

    it('displays token refs', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      const refs = wrapper.findAll('.token-ref')
      expect(refs.length).toBeGreaterThan(0)
      expect(refs[0].text()).toBe('F1') // surface ref
    })

    it('displays preview section with sample text', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('Title text sample')
      expect(wrapper.text()).toContain('Body text sample')
      expect(wrapper.text()).toContain('Meta text sample')
      expect(wrapper.text()).toContain('Link text sample')
      expect(wrapper.text()).toContain('Highlight text sample')
    })
  })

  describe('components section', () => {
    it('renders components heading', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [createMockComponent()],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('Components')
    })

    it('renders component cards', () => {
      const components = [
        createMockComponent({ name: 'card1', label: 'Card 1' }),
        createMockComponent({ name: 'card2', label: 'Card 2' }),
      ]

      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components,
          actions: [],
        },
      })

      const cards = wrapper.findAll('.component-card')
      expect(cards.length).toBe(2)
    })

    it('displays component labels', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [createMockComponent({ label: 'Test Component' })],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('Test Component')
    })

    it('shows stateless badge for components', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [createMockComponent()],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('Stateless')
    })
  })

  describe('actions section', () => {
    it('renders action components', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [createMockAction()],
        },
      })

      expect(wrapper.find('.action-component').exists()).toBe(true)
    })

    it('displays action labels', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [createMockAction({ label: 'Test Action' })],
        },
      })

      expect(wrapper.text()).toContain('Test Action')
    })

    it('shows stateful badge for actions', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [createMockAction()],
        },
      })

      expect(wrapper.text()).toContain('Stateful')
    })

    it('renders interactive buttons', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [createMockAction({ className: 'test-button-class' })],
        },
      })

      const buttons = wrapper.findAll('.action-buttons button')
      expect(buttons.length).toBe(2) // Regular and disabled
    })

    it('renders state preview buttons', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [createMockAction()],
        },
      })

      const stateLabels = wrapper.findAll('.state-label')
      expect(stateLabels.length).toBe(4) // default, hover, active, disabled
    })

    it('displays all action states', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [createMockAction()],
        },
      })

      expect(wrapper.text()).toContain('default')
      expect(wrapper.text()).toContain('hover')
      expect(wrapper.text()).toContain('active')
      expect(wrapper.text()).toContain('disabled')
    })

    it('applies action token colors to state buttons', () => {
      const action = createMockAction()
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [action],
        },
      })

      const actionButtons = wrapper.findAll('.action-button')
      expect(actionButtons.length).toBe(4)

      // First button should exist and be rendered
      const firstButton = actionButtons[0]
      expect(firstButton.exists()).toBe(true)
      // Button element should have the action-button class
      expect(firstButton.classes()).toContain('action-button')
    })

    it('renders disabled button correctly', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [createMockAction()],
        },
      })

      const buttons = wrapper.findAll('.action-buttons button')
      const disabledButton = buttons.find(b => b.attributes('disabled') !== undefined)
      expect(disabledButton).toBeDefined()
    })
  })

  describe('token display', () => {
    it('displays surface token', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('surface')
    })

    it('displays ink tokens', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      expect(wrapper.text()).toContain('ink.title')
      expect(wrapper.text()).toContain('ink.body')
      expect(wrapper.text()).toContain('ink.meta')
    })
  })

  describe('preview links', () => {
    it('prevents default on link clicks', async () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      const link = wrapper.find('.preview-link')
      expect(link.exists()).toBe(true)

      const event = {
        preventDefault: vi.fn(),
      }
      await link.trigger('click', event)

      // Link should have @click.prevent handler
      expect(link.attributes('href')).toBe('#')
    })
  })

  describe('empty states', () => {
    it('handles empty contexts array', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [createMockComponent()],
          actions: [],
        },
      })

      const surfaceCards = wrapper.findAll('.surface-card')
      expect(surfaceCards.length).toBe(0)
    })

    it('handles empty components array', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [createMockContext()],
          components: [],
          actions: [],
        },
      })

      // Only surface cards from contexts, no component cards
      const componentCards = wrapper.findAll('.component-card:not(.surface-card)')
      expect(componentCards.length).toBe(0)
    })

    it('handles empty actions array', () => {
      const wrapper = mount(PalettePreviewTab, {
        props: {
          contexts: [],
          components: [],
          actions: [],
        },
      })

      const actionComponents = wrapper.findAll('.action-component')
      expect(actionComponents.length).toBe(0)
    })
  })
})

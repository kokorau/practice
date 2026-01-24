import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import DslInput from './DslInput.vue'

const meta: Meta<typeof DslInput> = {
  title: 'Debug/DslInput',
  component: DslInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a1a' },
        { name: 'darker', value: '#0a0a0a' },
      ],
    },
  },
  argTypes: {
    modelValue: { control: 'text' },
    placeholder: { control: 'text' },
    showAnalysis: { control: 'boolean' },
  },
  decorators: [
    () => ({
      template: '<div style="width: 400px; padding: 20px;"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Empty state
export const Default: Story = {
  args: {
    modelValue: '',
    showAnalysis: true,
  },
}

// Valid simple expression
export const ValidExpression: Story = {
  args: {
    modelValue: '=@t * 2 + 1',
    showAnalysis: true,
  },
}

// Valid oscillator expression
export const OscillatorExpression: Story = {
  args: {
    modelValue: '=osc(@t, 2000) * 0.5 + 0.25',
    showAnalysis: true,
  },
}

// Multiple periods
export const MultiplePeriods: Story = {
  args: {
    modelValue: '=osc(@t, 2000) * 0.7 + osc(@t, 500) * 0.3',
    showAnalysis: true,
  },
}

// Complex expression with range mapping
export const RangeMappedExpression: Story = {
  args: {
    modelValue: '=range(osc(@t, 4000), 22, 30)',
    showAnalysis: true,
  },
}

// Namespaced reference
export const NamespacedReference: Story = {
  args: {
    modelValue: '=@timeline:track-stripe-angle * 0.5 + 0.25',
    showAnalysis: true,
  },
}

// Math functions
export const MathFunctions: Story = {
  args: {
    modelValue: '=sin(@t / 1000 * PI) * 0.5 + 0.5',
    showAnalysis: true,
  },
}

// Quantized wave
export const QuantizedWave: Story = {
  args: {
    modelValue: '=floor(osc(@t, 2000) * 8) / 8',
    showAnalysis: true,
  },
}

// Invalid expression - syntax error
export const SyntaxError: Story = {
  args: {
    modelValue: '=osc(@t, 2000',
    showAnalysis: true,
  },
}

// Invalid expression - unknown function
export const UnknownFunction: Story = {
  args: {
    modelValue: '=unknown(@t)',
    showAnalysis: true,
  },
}

// Legacy syntax (without = prefix)
export const LegacySyntax: Story = {
  args: {
    modelValue: 'osc(t, 2000)',
    showAnalysis: true,
  },
}

// Interactive story with live editing
export const Interactive: Story = {
  render: (args) => ({
    components: { DslInput },
    setup() {
      const expression = ref(args.modelValue || '')
      return { args, expression }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <DslInput
          v-model="expression"
          :placeholder="args.placeholder"
          :show-analysis="args.showAnalysis"
        />
        <div style="font-size: 11px; color: rgba(255,255,255,0.5); font-family: monospace;">
          <div>v-model: "{{ expression }}"</div>
        </div>
      </div>
    `,
  }),
  args: {
    modelValue: '=osc(@t, 2000)',
    showAnalysis: true,
  },
}

// All display modes demo
export const DisplayModesDemo: Story = {
  render: () => ({
    components: { DslInput },
    setup() {
      const expr1 = ref('=osc(@t, 2000) * 0.5 + 0.25')
      const expr2 = ref('=osc(@t, 4000) * 0.7 + osc(@t, 1000) * 0.3')
      const expr3 = ref('=range(osc(@t, 3000), 10, 90)')
      return { expr1, expr2, expr3 }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">
            Single period oscillator
          </div>
          <DslInput v-model="expr1" />
        </div>
        <div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">
            Multiple periods (click Info to see periods)
          </div>
          <DslInput v-model="expr2" />
        </div>
        <div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">
            Range mapped (click Info twice for amplitude)
          </div>
          <DslInput v-model="expr3" />
        </div>
      </div>
    `,
  }),
}

// Syntax reference expanded
export const SyntaxReferenceExpanded: Story = {
  render: () => ({
    components: { DslInput },
    setup() {
      const expression = ref('')
      return { expression }
    },
    template: `
      <div style="width: 500px;">
        <p style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">
          Click the "?" button to toggle syntax reference
        </p>
        <DslInput v-model="expression" />
      </div>
    `,
  }),
}

// Without analysis button
export const WithoutAnalysis: Story = {
  args: {
    modelValue: '=osc(@t, 2000)',
    showAnalysis: false,
  },
}

// Custom placeholder
export const CustomPlaceholder: Story = {
  args: {
    modelValue: '',
    placeholder: 'Enter intensity expression...',
    showAnalysis: true,
  },
}

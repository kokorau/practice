import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import RangeInput from './RangeInput.vue'

const meta: Meta<typeof RangeInput> = {
  title: 'Components/Form/RangeInput',
  component: RangeInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
  argTypes: {
    label: { control: 'text' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    modelValue: { control: 'number' },
  },
  decorators: [
    () => ({
      template: '<div style="width: 200px;"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Basic number input
export const Default: Story = {
  args: {
    label: 'Intensity',
    min: 0,
    max: 1,
    step: 0.01,
    modelValue: 0.5,
  },
}

// Integer range
export const IntegerRange: Story = {
  args: {
    label: 'Count',
    min: 1,
    max: 100,
    step: 1,
    modelValue: 50,
  },
}

// Negative range
export const NegativeRange: Story = {
  args: {
    label: 'Offset',
    min: -100,
    max: 100,
    step: 1,
    modelValue: 0,
  },
}

// With DSL expression (RangeExpr)
export const WithDSLExpression: Story = {
  args: {
    label: 'Animated Value',
    min: 0,
    max: 1,
    step: 0.01,
    modelValue: 0,
    rawValue: {
      type: 'range',
      trackId: 'intensity',
      min: 0,
      max: 1,
    },
  },
}

// Interactive story with state logging
export const Interactive: Story = {
  render: (args) => ({
    components: { RangeInput },
    setup() {
      const value = ref(args.modelValue)
      const rawValue = ref<unknown>(args.rawValue)
      const logs = ref<string[]>([])

      const addLog = (msg: string) => {
        logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
        if (logs.value.length > 10) logs.value.pop()
      }

      watch(value, (v) => addLog(`modelValue: ${v}`))
      watch(rawValue, (v) => addLog(`rawValue: ${JSON.stringify(v)}`), { deep: true })

      return { args, value, rawValue, logs, addLog }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <RangeInput
          v-bind="args"
          v-model="value"
          :raw-value="rawValue"
          @update:model-value="value = $event"
          @update:raw-value="rawValue = $event"
        />
        <div style="font-size: 12px;">
          <div><strong>Current value:</strong> {{ value }}</div>
          <div><strong>Raw value:</strong> {{ JSON.stringify(rawValue) }}</div>
        </div>
        <div style="font-size: 11px; font-family: monospace; max-height: 150px; overflow-y: auto;">
          <div v-for="(log, i) in logs" :key="i">{{ log }}</div>
        </div>
      </div>
    `,
  }),
  args: {
    label: 'Test Value',
    min: 0,
    max: 100,
    step: 1,
    modelValue: 50,
  },
}

// Error state (invalid input)
export const ErrorState: Story = {
  render: () => ({
    components: { RangeInput },
    setup() {
      const value = ref(0.5)
      return { value }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="font-size: 12px; color: #666;">
          Try typing "abc" or an invalid expression to see the error state.
        </p>
        <RangeInput
          label="Test Error"
          :min="0"
          :max="1"
          :step="0.01"
          v-model="value"
        />
      </div>
    `,
  }),
}

// Math expression support
export const MathExpressions: Story = {
  render: () => ({
    components: { RangeInput },
    setup() {
      const value = ref(0)
      return { value }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="font-size: 12px; color: #666;">
          Try math expressions like "PI/4", "sqrt(2)/2", or "sin(PI/6)".
        </p>
        <RangeInput
          label="Math Expression"
          :min="0"
          :max="10"
          :step="0.01"
          v-model="value"
        />
        <div style="font-size: 12px;">
          <strong>Evaluated value:</strong> {{ value.toFixed(4) }}
        </div>
      </div>
    `,
  }),
}

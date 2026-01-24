import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import SchemaFields from './SchemaFields.vue'
import { defineSchema, number, boolean, select } from '@practice/schema'

// Sample schemas for stories
const vignetteSchema = defineSchema({
  enabled: boolean({ label: 'Enabled', default: true }),
  intensity: number({ label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0.5 }),
  radius: number({ label: 'Radius', min: 0, max: 2, step: 0.1, default: 0.8 }),
})

const filterSchema = defineSchema({
  type: select({
    label: 'Type',
    options: [
      { value: 'none', label: 'None' },
      { value: 'blur', label: 'Blur' },
      { value: 'sharpen', label: 'Sharpen' },
      { value: 'glow', label: 'Glow' },
    ],
    default: 'none',
  }),
  strength: number({ label: 'Strength', min: 0, max: 100, step: 1, default: 50 }),
  enabled: boolean({ label: 'Enabled', default: true }),
})

const complexSchema = defineSchema({
  offsetX: number({ label: 'Offset X', min: -100, max: 100, step: 1, default: 0 }),
  offsetY: number({ label: 'Offset Y', min: -100, max: 100, step: 1, default: 0 }),
  scale: number({ label: 'Scale', min: 0.1, max: 5, step: 0.1, default: 1 }),
  rotation: number({ label: 'Rotation', min: 0, max: 360, step: 1, default: 0 }),
  opacity: number({ label: 'Opacity', min: 0, max: 1, step: 0.01, default: 1 }),
  visible: boolean({ label: 'Visible', default: true }),
  blendMode: select({
    label: 'Blend Mode',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'multiply', label: 'Multiply' },
      { value: 'screen', label: 'Screen' },
      { value: 'overlay', label: 'Overlay' },
    ],
    default: 'normal',
  }),
})

const meta: Meta<typeof SchemaFields> = {
  title: 'Components/Form/SchemaFields',
  component: SchemaFields,
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
  decorators: [
    () => ({
      template: '<div style="width: 300px; padding: 1rem; background: white; border-radius: 8px;"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Basic vignette settings
export const Vignette: Story = {
  args: {
    schema: vignetteSchema,
    modelValue: {
      enabled: true,
      intensity: 0.5,
      radius: 0.8,
    },
  },
}

// Filter with select dropdown
export const FilterWithSelect: Story = {
  args: {
    schema: filterSchema,
    modelValue: {
      type: 'blur',
      strength: 75,
      enabled: true,
    },
  },
}

// Complex schema with many fields
export const ComplexForm: Story = {
  args: {
    schema: complexSchema,
    modelValue: {
      offsetX: 10,
      offsetY: -20,
      scale: 1.5,
      rotation: 45,
      opacity: 0.8,
      visible: true,
      blendMode: 'multiply',
    },
  },
}

// With exclude option (hide 'enabled' field)
export const WithExclude: Story = {
  args: {
    schema: vignetteSchema,
    modelValue: {
      enabled: true,
      intensity: 0.5,
      radius: 0.8,
    },
    exclude: ['enabled'],
  },
}

// Interactive with state tracking
export const Interactive: Story = {
  render: (args) => ({
    components: { SchemaFields },
    setup() {
      const modelValue = ref({ ...args.modelValue })
      const rawParams = ref<Record<string, unknown>>({})
      const logs = ref<string[]>([])

      const addLog = (msg: string) => {
        logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
        if (logs.value.length > 15) logs.value.pop()
      }

      watch(modelValue, (v) => addLog(`modelValue: ${JSON.stringify(v)}`), { deep: true })

      const handleUpdate = (update: Record<string, unknown>) => {
        addLog(`update:modelValue: ${JSON.stringify(update)}`)
        // Merge the update into modelValue
        Object.assign(modelValue.value, update)
      }

      const handleRawUpdate = (key: string, value: unknown) => {
        addLog(`update:rawValue[${key}]: ${JSON.stringify(value)}`)
        rawParams.value[key] = value
      }

      return { args, modelValue, rawParams, logs, handleUpdate, handleRawUpdate }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <SchemaFields
          :schema="args.schema"
          :model-value="modelValue"
          :raw-params="rawParams"
          @update:model-value="handleUpdate"
          @update:raw-value="handleRawUpdate"
        />
        <hr style="border: none; border-top: 1px solid #ddd;" />
        <div style="font-size: 11px;">
          <strong>Current state:</strong>
          <pre style="margin: 0.5rem 0; padding: 0.5rem; background: #f0f0f0; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(modelValue, null, 2) }}</pre>
        </div>
        <div style="font-size: 10px; font-family: monospace; max-height: 120px; overflow-y: auto; background: #fafafa; padding: 0.5rem; border-radius: 4px;">
          <div v-for="(log, i) in logs" :key="i" style="margin-bottom: 2px;">{{ log }}</div>
        </div>
      </div>
    `,
  }),
  args: {
    schema: complexSchema,
    modelValue: {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      visible: true,
      blendMode: 'normal',
    },
  },
}

// With DSL expressions (rawParams)
export const WithDSLExpressions: Story = {
  render: () => ({
    components: { SchemaFields },
    setup() {
      const schema = defineSchema({
        intensity: number({ label: 'Intensity', min: 0, max: 1, step: 0.01, default: 0 }),
        scale: number({ label: 'Scale', min: 0, max: 2, step: 0.1, default: 1 }),
        rotation: number({ label: 'Rotation', min: 0, max: 360, step: 1, default: 0 }),
      })

      const modelValue = ref({
        intensity: 0,
        scale: 1,
        rotation: 0,
      })

      // Raw params with DSL expressions
      const rawParams = ref<Record<string, unknown>>({
        intensity: { type: 'range', trackId: 'pulse', min: 0, max: 1 },
        rotation: { type: 'range', trackId: 'spin', min: 0, max: 360 },
      })

      const handleUpdate = (update: Record<string, unknown>) => {
        Object.assign(modelValue.value, update)
      }

      const handleRawUpdate = (key: string, value: unknown) => {
        rawParams.value[key] = value
      }

      return { schema, modelValue, rawParams, handleUpdate, handleRawUpdate }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="font-size: 12px; color: #666; margin: 0;">
          Fields with DSL expressions show a cyan border. Try editing them to see the DSL syntax.
        </p>
        <SchemaFields
          :schema="schema"
          :model-value="modelValue"
          :raw-params="rawParams"
          @update:model-value="handleUpdate"
          @update:raw-value="handleRawUpdate"
        />
        <div style="font-size: 11px;">
          <strong>Raw params:</strong>
          <pre style="margin: 0.5rem 0; padding: 0.5rem; background: #f0f0f0; border-radius: 4px;">{{ JSON.stringify(rawParams, null, 2) }}</pre>
        </div>
      </div>
    `,
  }),
}

// Value reset issue demonstration
export const ValueResetTest: Story = {
  render: () => ({
    components: { SchemaFields },
    setup() {
      const schema = defineSchema({
        value1: number({ label: 'Value 1', min: 0, max: 100, step: 1, default: 50 }),
        value2: number({ label: 'Value 2', min: 0, max: 100, step: 1, default: 50 }),
        value3: number({ label: 'Value 3', min: 0, max: 100, step: 1, default: 50 }),
      })

      const modelValue = ref({
        value1: 50,
        value2: 50,
        value3: 50,
      })

      const logs = ref<string[]>([])

      const handleUpdate = (update: Record<string, unknown>) => {
        logs.value.unshift(`Received update: ${JSON.stringify(update)}`)
        if (logs.value.length > 10) logs.value.pop()
        // Merge update
        Object.assign(modelValue.value, update)
      }

      return { schema, modelValue, logs, handleUpdate }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="font-size: 12px; color: #666; margin: 0;">
          <strong>Test:</strong> Change Value 1, then quickly change Value 2.
          Check if values reset unexpectedly.
        </p>
        <SchemaFields
          :schema="schema"
          :model-value="modelValue"
          @update:model-value="handleUpdate"
        />
        <div style="font-size: 11px;">
          <strong>State:</strong> {{ JSON.stringify(modelValue) }}
        </div>
        <div style="font-size: 10px; font-family: monospace; max-height: 100px; overflow-y: auto; background: #fafafa; padding: 0.5rem;">
          <div v-for="(log, i) in logs" :key="i">{{ log }}</div>
        </div>
      </div>
    `,
  }),
}

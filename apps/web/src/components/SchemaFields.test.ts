/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SchemaFields from './SchemaFields.vue'
import { defineSchema, number, boolean, select } from '@practice/schema'

describe('SchemaFields', () => {
  const testSchema = defineSchema({
    value1: number({ label: 'Value 1', min: 0, max: 100, step: 1, default: 50 }),
    value2: number({ label: 'Value 2', min: 0, max: 100, step: 1, default: 50 }),
    enabled: boolean({ label: 'Enabled', default: true }),
  })

  it('renders fields from schema', () => {
    const wrapper = mount(SchemaFields, {
      props: {
        schema: testSchema,
        modelValue: { value1: 50, value2: 50, enabled: true },
      },
    })

    // Should have 3 fields (2 number inputs + 1 checkbox)
    expect(wrapper.findAll('input[type="text"]')).toHaveLength(2)
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(1)
  })

  it('emits complete object when updating a single field', async () => {
    const wrapper = mount(SchemaFields, {
      props: {
        schema: testSchema,
        modelValue: { value1: 50, value2: 50, enabled: true },
      },
    })

    // Find and update value1 input (RangeInput emits on blur)
    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[0].trigger('focus')
    await inputs[0].setValue('75')
    await inputs[0].trigger('blur')

    // Should emit complete object with merged value
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({ value1: 75, value2: 50, enabled: true })
  })

  it('preserves other field values when updating one field', async () => {
    const wrapper = mount(SchemaFields, {
      props: {
        schema: testSchema,
        modelValue: { value1: 75, value2: 50, enabled: true },
      },
    })

    // Update value2 (RangeInput emits on blur)
    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[1].trigger('focus')
    await inputs[1].setValue('25')
    await inputs[1].trigger('blur')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    // Should preserve value1 = 75
    expect(emitted![0][0]).toEqual({ value1: 75, value2: 25, enabled: true })
  })

  it('excludes specified fields', () => {
    const wrapper = mount(SchemaFields, {
      props: {
        schema: testSchema,
        modelValue: { value1: 50, value2: 50, enabled: true },
        exclude: ['enabled'],
      },
    })

    // Should only have 2 number inputs, checkbox excluded
    expect(wrapper.findAll('input[type="text"]')).toHaveLength(2)
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0)
  })

  it('renders select fields', () => {
    const selectSchema = defineSchema({
      mode: select({
        label: 'Mode',
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
        default: 'a',
      }),
    })

    const wrapper = mount(SchemaFields, {
      props: {
        schema: selectSchema,
        modelValue: { mode: 'a' },
      },
    })

    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.findAll('option')).toHaveLength(2)
  })

  it('emits update:rawValue when RangeInput emits rawValue', async () => {
    const wrapper = mount(SchemaFields, {
      props: {
        schema: testSchema,
        modelValue: { value1: 50, value2: 50, enabled: true },
        rawParams: {},
      },
    })

    // Find RangeInput component and trigger raw value update
    const rangeInputs = wrapper.findAllComponents({ name: 'RangeInput' })
    expect(rangeInputs.length).toBeGreaterThan(0)

    // Emit update:rawValue from RangeInput
    await rangeInputs[0].vm.$emit('update:rawValue', { type: 'range', trackId: 'test', min: 0, max: 1 })

    const emitted = wrapper.emitted('update:rawValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual(['value1', { type: 'range', trackId: 'test', min: 0, max: 1 }])
  })
})

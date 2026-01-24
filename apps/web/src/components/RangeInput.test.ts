/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RangeInput from './RangeInput.vue'

describe('RangeInput', () => {
  const defaultProps = {
    label: 'Test',
    min: 0,
    max: 100,
    step: 1,
    modelValue: 50,
  }

  it('renders with label and value', () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    expect(wrapper.find('.range-label').text()).toBe('Test')
    expect(wrapper.find('input').element.value).toBe('50')
  })

  it('shows range hint', () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    expect(wrapper.find('.range-hint').text()).toBe('0 ~ 100')
  })

  it('emits update:modelValue on valid input', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.setValue('75')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(75)
  })

  it('clamps value to min/max range', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.setValue('150')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(100) // Clamped to max
  })

  it('shows error state for invalid input', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.setValue('abc')

    expect(wrapper.find('.input-error').exists()).toBe(true)
    expect(wrapper.find('.error-message').exists()).toBe(true)
  })

  it('parses math expressions', async () => {
    const wrapper = mount(RangeInput, {
      props: { ...defaultProps, min: 0, max: 10 },
    })

    const input = wrapper.find('input')
    await input.setValue('2 + 3')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(5)
  })

  it('parses Math functions', async () => {
    const wrapper = mount(RangeInput, {
      props: { ...defaultProps, min: 0, max: 10 },
    })

    const input = wrapper.find('input')
    await input.setValue('sqrt(4)')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(2)
  })

  it('parses PI constant', async () => {
    const wrapper = mount(RangeInput, {
      props: { ...defaultProps, min: 0, max: 10 },
    })

    const input = wrapper.find('input')
    await input.setValue('PI')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBeCloseTo(Math.PI, 5)
  })

  it('parses range() DSL expression', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.setValue("range('intensity', 0, 1)")

    const rawEmitted = wrapper.emitted('update:rawValue')
    expect(rawEmitted).toBeTruthy()
    expect(rawEmitted![0][0]).toEqual({
      type: 'range',
      trackId: 'intensity',
      min: 0,
      max: 1,
    })
  })

  it('parses range() with clamp argument', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.setValue("range('intensity', 0, 1, true)")

    const rawEmitted = wrapper.emitted('update:rawValue')
    expect(rawEmitted).toBeTruthy()
    expect(rawEmitted![0][0]).toEqual({
      type: 'range',
      trackId: 'intensity',
      min: 0,
      max: 1,
      clamp: true,
    })
  })

  it('displays DSL expression from rawValue prop', () => {
    const wrapper = mount(RangeInput, {
      props: {
        ...defaultProps,
        rawValue: {
          type: 'range',
          trackId: 'pulse',
          min: 0,
          max: 1,
        },
      },
    })

    expect(wrapper.find('input').element.value).toBe("range('pulse', 0, 1)")
  })

  it('applies DSL styling when rawValue is RangeExpr', () => {
    const wrapper = mount(RangeInput, {
      props: {
        ...defaultProps,
        rawValue: {
          type: 'range',
          trackId: 'pulse',
          min: 0,
          max: 1,
        },
      },
    })

    expect(wrapper.find('.input-dsl').exists()).toBe(true)
  })

  it('does not reset value while focused', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('7')

    // Simulate parent updating modelValue
    await wrapper.setProps({ modelValue: 50 })

    // Input should retain user's value while focused
    expect(input.element.value).toBe('7')
  })

  it('updates display on blur when modelValue is updated', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('75')

    // Simulate parent updating modelValue after receiving emit
    await wrapper.setProps({ modelValue: 75 })
    await input.trigger('blur')

    // After blur with updated modelValue, display should show the new value
    expect(input.element.value).toBe('75')
  })
})

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

  it('does not emit during input, only on blur', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('75')

    // Should not emit yet (still focused)
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()

    // Now blur to commit
    await input.trigger('blur')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(75)
  })

  it('clamps value to min/max range on blur', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('150')
    await input.trigger('blur')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(100) // Clamped to max
  })

  it('shows error state for invalid input on blur', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('abc')

    // No error while typing
    expect(wrapper.find('.input-error').exists()).toBe(false)

    // Error shown after blur
    await input.trigger('blur')
    expect(wrapper.find('.input-error').exists()).toBe(true)
    expect(wrapper.find('.error-message').exists()).toBe(true)
  })

  it('allows free typing without validation errors', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')

    // Type invalid intermediate values - should not show error
    await input.setValue('1')
    expect(wrapper.find('.input-error').exists()).toBe(false)

    await input.setValue('15')
    expect(wrapper.find('.input-error').exists()).toBe(false)

    await input.setValue('150')
    expect(wrapper.find('.input-error').exists()).toBe(false)

    // Even typing partial expressions should not show error
    await input.setValue('range(')
    expect(wrapper.find('.input-error').exists()).toBe(false)
  })

  it('parses DSL expression with = prefix on blur', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('=osc(@t, 2000)')
    await input.trigger('blur')

    const rawEmitted = wrapper.emitted('update:rawValue')
    expect(rawEmitted).toBeTruthy()
    expect(rawEmitted![0][0]).toMatchObject({
      type: 'dsl',
      expression: '=osc(@t, 2000)',
    })
  })

  it('parses simple DSL math expression on blur', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('=@t * 0.5 + 0.25')
    await input.trigger('blur')

    const rawEmitted = wrapper.emitted('update:rawValue')
    expect(rawEmitted).toBeTruthy()
    expect(rawEmitted![0][0]).toMatchObject({
      type: 'dsl',
      expression: '=@t * 0.5 + 0.25',
    })
  })

  it('shows error for invalid DSL expression', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('=osc(@t')
    await input.trigger('blur')

    // Should show error state
    expect(wrapper.find('.input-error').exists()).toBe(true)
    expect(wrapper.find('.error-message').exists()).toBe(true)
  })

  it('treats non-numeric text without = prefix as error', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('hello')
    await input.trigger('blur')

    // Should show error state for non-numeric string
    expect(wrapper.find('.input-error').exists()).toBe(true)
  })

  it('displays DSL expression from rawValue prop', () => {
    const wrapper = mount(RangeInput, {
      props: {
        ...defaultProps,
        rawValue: {
          type: 'dsl',
          expression: '=osc(@t, 2000)',
          ast: { type: 'number', value: 0 }, // mock AST
        },
      },
    })

    expect(wrapper.find('input').element.value).toBe('=osc(@t, 2000)')
  })

  it('applies DSL styling when rawValue is DslExpr', () => {
    const wrapper = mount(RangeInput, {
      props: {
        ...defaultProps,
        rawValue: {
          type: 'dsl',
          expression: '=osc(@t, 2000)',
          ast: { type: 'number', value: 0 }, // mock AST
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

  it('commits value on blur and updates display', async () => {
    const wrapper = mount(RangeInput, { props: defaultProps })

    const input = wrapper.find('input')
    await input.trigger('focus')
    await input.setValue('75')
    await input.trigger('blur')

    // After blur, display should show the committed value
    expect(input.element.value).toBe('75')

    // And emit should have been called
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(75)
  })

  it('displays RangeExpr from rawValue prop', () => {
    const wrapper = mount(RangeInput, {
      props: {
        ...defaultProps,
        rawValue: {
          type: 'range',
          trackId: 'track-mask-radius',
          min: 0.1,
          max: 0.45,
        },
      },
    })

    expect(wrapper.find('input').element.value).toBe('=range(@track-mask-radius, 0.1, 0.45)')
  })

  it('applies DSL styling when rawValue is RangeExpr', () => {
    const wrapper = mount(RangeInput, {
      props: {
        ...defaultProps,
        rawValue: {
          type: 'range',
          trackId: 'track-mask-radius',
          min: 0.1,
          max: 0.45,
        },
      },
    })

    expect(wrapper.find('.input-dsl').exists()).toBe(true)
  })
})

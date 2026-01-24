/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DslInput from './DslInput.vue'

describe('DslInput', () => {
  it('renders with placeholder', () => {
    const wrapper = mount(DslInput, {
      props: { placeholder: 'Enter expression' },
    })

    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter expression')
  })

  it('shows empty status when input is empty', () => {
    const wrapper = mount(DslInput)

    expect(wrapper.find('.status-indicator').text()).toBe('Empty')
  })

  describe('literal values (no = prefix)', () => {
    it('recognizes number literals', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: '0.5' } })

      expect(wrapper.find('.status-indicator').text()).toBe('Number')
      expect(wrapper.find('.hint-text').text()).toBe('Literal number: 0.5')
    })

    it('recognizes integer literals', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: '42' } })

      expect(wrapper.find('.status-indicator').text()).toBe('Number')
      expect(wrapper.find('.hint-text').text()).toBe('Literal number: 42')
    })

    it('recognizes negative number literals', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: '-3.14' } })

      expect(wrapper.find('.status-indicator').text()).toBe('Number')
      expect(wrapper.find('.hint-text').text()).toBe('Literal number: -3.14')
    })

    it('recognizes string literals', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: 'hello' } })

      expect(wrapper.find('.status-indicator').text()).toBe('String')
      expect(wrapper.find('.hint-text').text()).toBe('Literal string: "hello"')
    })

    it('treats non-numeric text as string', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: 'abc123' } })

      expect(wrapper.find('.status-indicator').text()).toBe('String')
    })
  })

  describe('DSL expressions (= prefix)', () => {
    it('recognizes valid DSL expression', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: '=osc(@t, 2000)' } })

      expect(wrapper.find('.status-indicator').text()).toBe('DSL')
      expect(wrapper.find('.hint-text').text()).toBe('DSL syntax OK')
    })

    it('recognizes simple DSL expression', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: '=@t * 0.5' } })

      expect(wrapper.find('.status-indicator').text()).toBe('DSL')
    })

    it('shows error for invalid DSL expression', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: '=osc(@t' } })

      expect(wrapper.find('.status-indicator').text()).toBe('Error')
      expect(wrapper.find('.hint-row').classes()).toContain('error')
    })

    it('shows error for incomplete expression', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: '=1 +' } })

      expect(wrapper.find('.status-indicator').text()).toBe('Error')
    })
  })

  describe('input events', () => {
    it('emits update:modelValue on input', async () => {
      const wrapper = mount(DslInput)

      const input = wrapper.find('input')
      await input.setValue('test value')

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![emitted!.length - 1][0]).toBe('test value')
    })

    it('syncs with modelValue prop changes', async () => {
      const wrapper = mount(DslInput, { props: { modelValue: 'initial' } })

      expect(wrapper.find('input').element.value).toBe('initial')

      await wrapper.setProps({ modelValue: 'updated' })

      expect(wrapper.find('input').element.value).toBe('updated')
    })
  })

  describe('analysis buttons', () => {
    it('shows analysis button for valid DSL expression', async () => {
      const wrapper = mount(DslInput, {
        props: { modelValue: '=osc(@t, 2000)', showAnalysis: true },
      })

      expect(wrapper.find('.mode-btn').exists()).toBe(true)
    })

    it('hides analysis button for literal values', async () => {
      const wrapper = mount(DslInput, {
        props: { modelValue: '0.5', showAnalysis: true },
      })

      expect(wrapper.find('.mode-btn').exists()).toBe(false)
    })

    it('hides analysis button for empty input', async () => {
      const wrapper = mount(DslInput, {
        props: { modelValue: '', showAnalysis: true },
      })

      expect(wrapper.find('.mode-btn').exists()).toBe(false)
    })

    it('hides analysis button when showAnalysis is false', async () => {
      const wrapper = mount(DslInput, {
        props: { modelValue: '=osc(@t, 2000)', showAnalysis: false },
      })

      expect(wrapper.find('.mode-btn').exists()).toBe(false)
    })
  })

  describe('syntax reference panel', () => {
    it('toggles syntax reference panel', async () => {
      const wrapper = mount(DslInput)

      expect(wrapper.find('.syntax-ref-panel').exists()).toBe(false)

      await wrapper.find('.ref-btn').trigger('click')

      expect(wrapper.find('.syntax-ref-panel').exists()).toBe(true)

      await wrapper.find('.ref-btn').trigger('click')

      expect(wrapper.find('.syntax-ref-panel').exists()).toBe(false)
    })

    it('shows syntax reference sections', async () => {
      const wrapper = mount(DslInput)

      await wrapper.find('.ref-btn').trigger('click')

      const sections = wrapper.findAll('.ref-section h5')
      const sectionTitles = sections.map((s) => s.text())

      expect(sectionTitles).toContain('Operators')
      expect(sectionTitles).toContain('References')
      expect(sectionTitles).toContain('Constants')
      expect(sectionTitles).toContain('Wave Functions')
      expect(sectionTitles).toContain('Math Functions')
      expect(sectionTitles).toContain('Utility Functions')
    })
  })

  describe('display mode toggle', () => {
    it('cycles through display modes for DSL expression', async () => {
      const wrapper = mount(DslInput, {
        props: { modelValue: '=osc(@t, 2000)', showAnalysis: true },
      })

      const modeBtn = wrapper.find('.mode-btn')
      expect(modeBtn.text()).toBe('Info')

      await modeBtn.trigger('click')
      expect(wrapper.find('.mode-btn').text()).toBe('Period')

      await wrapper.find('.mode-btn').trigger('click')
      expect(wrapper.find('.mode-btn').text()).toBe('Amp')

      await wrapper.find('.mode-btn').trigger('click')
      expect(wrapper.find('.mode-btn').text()).toBe('Info')
    })
  })
})

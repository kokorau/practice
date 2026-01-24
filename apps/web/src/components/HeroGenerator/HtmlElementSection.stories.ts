import type { Meta, StoryObj } from '@storybook/vue3-vite'
import HtmlElementSection from './HtmlElementSection.vue'
import type { ForegroundElementConfig } from '@practice/section-visual'

const mockTitle: ForegroundElementConfig = {
  id: 'title-1',
  type: 'title',
  visible: true,
  position: 'middle-center',
  content: 'Build Amazing',
}

const mockDescription: ForegroundElementConfig = {
  id: 'description-1',
  type: 'description',
  visible: true,
  position: 'middle-center',
  content: 'Create beautiful, responsive websites.',
}

const mockElements: ForegroundElementConfig[] = [mockTitle, mockDescription]

const meta: Meta<typeof HtmlElementSection> = {
  title: 'Components/HeroGenerator/HtmlElementSection',
  component: HtmlElementSection,
  tags: ['autodocs'],
  argTypes: {
    foregroundElements: { control: 'object' },
    selectedElementId: { control: 'text' },
  },
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
}

export default meta
type Story = StoryObj<typeof HtmlElementSection>

export const Default: Story = {
  args: {
    foregroundElements: mockElements,
    selectedElementId: null,
  },
}

export const WithSelectedElement: Story = {
  args: {
    foregroundElements: mockElements,
    selectedElementId: 'title-1',
  },
}

export const Empty: Story = {
  args: {
    foregroundElements: [],
    selectedElementId: null,
  },
}

export const OnlyTitle: Story = {
  args: {
    foregroundElements: [mockTitle],
    selectedElementId: null,
  },
}

export const OnlyDescription: Story = {
  args: {
    foregroundElements: [mockDescription],
    selectedElementId: null,
  },
}

// With hidden element (should not be displayed)
export const WithHiddenElement: Story = {
  args: {
    foregroundElements: [
      mockTitle,
      {
        id: 'hidden-desc',
        type: 'description',
        visible: false,
        position: 'middle-center',
        content: 'Hidden description',
      },
    ],
    selectedElementId: null,
  },
}

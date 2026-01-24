import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AddItemMenu from './AddItemMenu.vue'

const layerItems = [
  { type: 'surface', label: 'Surface', icon: 'texture' },
  { type: 'group', label: 'Group', icon: 'folder_open' },
  { type: 'model3d', label: '3D Model', icon: 'view_in_ar' },
  { type: 'image', label: 'Image', icon: 'image' },
  { type: 'text', label: 'Text', icon: 'text_fields' },
] as const

const htmlItems = [
  { type: 'title', label: 'Title', icon: 'title' },
  { type: 'description', label: 'Description', icon: 'notes' },
] as const

const itemsWithDisabled = [
  { type: 'surface', label: 'Surface', icon: 'texture' },
  { type: 'group', label: 'Group', icon: 'folder_open' },
  { type: 'model3d', label: '3D Model', icon: 'view_in_ar', disabled: true },
  { type: 'text', label: 'Text', icon: 'text_fields', disabled: true },
] as const

const meta: Meta<typeof AddItemMenu> = {
  title: 'Components/HeroGenerator/AddItemMenu',
  component: AddItemMenu,
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
}

export default meta
type Story = StoryObj<typeof AddItemMenu>

export const LayerMenu: Story = {
  args: {
    items: layerItems as unknown as typeof layerItems[number][],
    title: 'Add Layer',
  },
}

export const HtmlElementMenu: Story = {
  args: {
    items: htmlItems as unknown as typeof htmlItems[number][],
    title: 'Add HTML Element',
  },
}

export const WithDisabledItems: Story = {
  args: {
    items: itemsWithDisabled as unknown as typeof itemsWithDisabled[number][],
    title: 'Add Layer',
  },
}

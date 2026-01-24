import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AddItemMenu, { type MenuItemOption } from './AddItemMenu.vue'

const layerItems: MenuItemOption<string>[] = [
  { type: 'surface', label: 'Surface', icon: 'texture' },
  { type: 'group', label: 'Group', icon: 'folder_open' },
  { type: 'model3d', label: '3D Model', icon: 'view_in_ar' },
  { type: 'image', label: 'Image', icon: 'image' },
  { type: 'text', label: 'Text', icon: 'text_fields' },
]

const htmlItems: MenuItemOption<string>[] = [
  { type: 'title', label: 'Title', icon: 'title' },
  { type: 'description', label: 'Description', icon: 'notes' },
]

const itemsWithDisabled: MenuItemOption<string>[] = [
  { type: 'surface', label: 'Surface', icon: 'texture' },
  { type: 'group', label: 'Group', icon: 'folder_open' },
  { type: 'model3d', label: '3D Model', icon: 'view_in_ar', disabled: true },
  { type: 'text', label: 'Text', icon: 'text_fields', disabled: true },
]

const meta: Meta = {
  title: 'Components/HeroGenerator/AddItemMenu',
  component: AddItemMenu as never,
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
type Story = StoryObj<typeof meta>

export const LayerMenu: Story = {
  args: {
    items: layerItems,
    title: 'Add Layer',
  },
}

export const HtmlElementMenu: Story = {
  args: {
    items: htmlItems,
    title: 'Add HTML Element',
  },
}

export const WithDisabledItems: Story = {
  args: {
    items: itemsWithDisabled,
    title: 'Add Layer',
  },
}

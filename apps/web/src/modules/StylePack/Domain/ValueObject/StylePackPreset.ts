import type { StylePack } from './StylePack'

export type StylePackPreset = {
  id: string
  name: string
  style: StylePack
}

export const StylePackPresets: StylePackPreset[] = [
  {
    id: 'default',
    name: 'Default',
    style: {
      rounded: 'md',
      font: { heading: 'inherit', body: 'inherit' },
      leading: 'normal',
      gap: 'normal',
      padding: 'normal',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    style: {
      rounded: 'none',
      font: { heading: 'inherit', body: 'inherit' },
      leading: 'tight',
      gap: 'tight',
      padding: 'tight',
    },
  },
  {
    id: 'soft',
    name: 'Soft',
    style: {
      rounded: 'lg',
      font: { heading: 'inherit', body: 'inherit' },
      leading: 'relaxed',
      gap: 'relaxed',
      padding: 'relaxed',
    },
  },
  {
    id: 'rounded',
    name: 'Rounded',
    style: {
      rounded: 'full',
      font: { heading: 'inherit', body: 'inherit' },
      leading: 'normal',
      gap: 'normal',
      padding: 'normal',
    },
  },
  {
    id: 'compact',
    name: 'Compact',
    style: {
      rounded: 'sm',
      font: { heading: 'inherit', body: 'inherit' },
      leading: 'tight',
      gap: 'tight',
      padding: 'normal',
    },
  },
  {
    id: 'spacious',
    name: 'Spacious',
    style: {
      rounded: 'md',
      font: { heading: 'inherit', body: 'inherit' },
      leading: 'relaxed',
      gap: 'relaxed',
      padding: 'relaxed',
    },
  },
]

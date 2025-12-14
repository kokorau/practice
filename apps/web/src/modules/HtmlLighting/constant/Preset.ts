import type { Hex } from '@practice/color'

// Light setting type
export type LightSetting = {
  x: number
  y: number
  z: number
  intensity: number
  colorHex: Hex
}

// Light preset type
export type LightPreset = {
  name: string
  primary: LightSetting
  secondary: LightSetting
  shadowBlur: number
}

// Shadow presets - focused on shadow direction and softness (no color tinting)
export const lightPresets: LightPreset[] = [
  {
    name: 'Top Right',
    primary: { x: 1, y: -1, z: 2, intensity: 0.8, colorHex: '#ffffff' },
    secondary: { x: -1, y: 1, z: 2, intensity: 0.2, colorHex: '#ffffff' },
    shadowBlur: 1.0,
  },
  {
    name: 'Top',
    primary: { x: 0, y: -1, z: 2, intensity: 0.6, colorHex: '#ffffff' },
    secondary: { x: 0, y: 1, z: 2, intensity: 0.1, colorHex: '#ffffff' },
    shadowBlur: 1.0,
  },
  {
    name: 'Top Left',
    primary: { x: -1, y: -1, z: 2, intensity: 0.6, colorHex: '#ffffff' },
    secondary: { x: 1, y: 1, z: 2, intensity: 0.1, colorHex: '#ffffff' },
    shadowBlur: 1.0,
  },
  {
    name: 'Left',
    primary: { x: -1, y: 0, z: 2, intensity: 0.6, colorHex: '#ffffff' },
    secondary: { x: 1, y: 0, z: 2, intensity: 0.1, colorHex: '#ffffff' },
    shadowBlur: 1.0,
  },
  {
    name: 'Soft',
    primary: { x: 1, y: -1, z: 3, intensity: 0.4, colorHex: '#ffffff' },
    secondary: { x: -1, y: 1, z: 3, intensity: 0.2, colorHex: '#ffffff' },
    shadowBlur: 2.5,
  },
  {
    name: 'Hard',
    primary: { x: 1, y: -1, z: 1.5, intensity: 0.8, colorHex: '#ffffff' },
    secondary: { x: -1, y: 1, z: 3, intensity: 0.05, colorHex: '#ffffff' },
    shadowBlur: 0.3,
  },
  {
    name: 'Flat',
    primary: { x: 0, y: 0, z: 3, intensity: 0.5, colorHex: '#ffffff' },
    secondary: { x: 0, y: 0, z: 3, intensity: 0.3, colorHex: '#ffffff' },
    shadowBlur: 1.5,
  },
]

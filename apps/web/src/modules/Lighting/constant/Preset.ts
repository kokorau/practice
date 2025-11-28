import type { Hex } from '../../Color/Domain/ValueObject'

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

// Default presets
export const lightPresets: LightPreset[] = [
  {
    name: 'Default',
    primary: { x: 1, y: -1, z: 2, intensity: 0.5, colorHex: '#ffffff' },
    secondary: { x: -1, y: 1, z: 3, intensity: 0.1, colorHex: '#ffffff' },
    shadowBlur: 1.0,
  },
  {
    name: 'Outdoor Daylight',
    primary: { x: 1, y: -2, z: 3, intensity: 0.7, colorHex: '#fff5e6' },
    secondary: { x: -1, y: 0.5, z: 2, intensity: 0.15, colorHex: '#e6f0ff' },
    shadowBlur: 0.8,
  },
  {
    name: 'Indoor Cool',
    primary: { x: 0, y: -1, z: 2, intensity: 0.5, colorHex: '#e8f4ff' },
    secondary: { x: -1, y: 0, z: 1.5, intensity: 0.2, colorHex: '#ffffff' },
    shadowBlur: 1.5,
  },
  {
    name: 'Indoor Warm',
    primary: { x: 0.5, y: -1, z: 2, intensity: 0.5, colorHex: '#ffe4c4' },
    secondary: { x: -0.5, y: 0.5, z: 1.5, intensity: 0.15, colorHex: '#ffd9b3' },
    shadowBlur: 1.2,
  },
  {
    name: 'Sunset',
    primary: { x: 2, y: -0.5, z: 1, intensity: 0.6, colorHex: '#ff9966' },
    secondary: { x: -1, y: 0, z: 2, intensity: 0.1, colorHex: '#6699cc' },
    shadowBlur: 1.0,
  },
  {
    name: 'Studio',
    primary: { x: 1, y: -1, z: 2, intensity: 0.6, colorHex: '#ffffff' },
    secondary: { x: -1, y: 1, z: 2, intensity: 0.3, colorHex: '#ffffff' },
    shadowBlur: 0.5,
  },
  {
    name: 'Dramatic',
    primary: { x: 2, y: -1, z: 1.5, intensity: 0.8, colorHex: '#ffffff' },
    secondary: { x: -1, y: 0, z: 3, intensity: 0.05, colorHex: '#4466aa' },
    shadowBlur: 0.3,
  },
]

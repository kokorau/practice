/**
 * ColorPreset - Brand, Accent, Foundation の3色セットを表す値オブジェクト
 */

export interface HsvColor {
  hue: number
  saturation: number
  value: number
}

export interface OklchFoundation {
  L: number
  C: number
  H: number
}

export interface ColorPreset {
  id: string
  name: string
  description: string
  brand: HsvColor
  accent: HsvColor
  foundation: OklchFoundation
}

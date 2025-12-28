// Foundation color presets with tint variations
export type FoundationPreset = {
  id: string
  label: string
  L: number
  C: number
  H: number | 'brand'
  description: string
}

export const FOUNDATION_PRESETS: FoundationPreset[] = [
  // Light theme foundations (based on F1: L=0.955)
  { id: 'white', label: 'White', L: 0.955, C: 0, H: 0, description: 'Pure neutral' },
  { id: 'cream', label: 'Cream', L: 0.955, C: 0.02, H: 80, description: 'Warm yellow' },
  { id: 'gray-light', label: 'Gray', L: 0.955, C: 0.008, H: 'brand', description: 'Cool neutral' },
  // Dark theme foundations (based on F8: L=0.28)
  { id: 'charcoal', label: 'Charcoal', L: 0.28, C: 0.008, H: 'brand', description: 'Dark neutral' },
  { id: 'warm-dark', label: 'Warm', L: 0.28, C: 0.015, H: 50, description: 'Warm dark' },
  { id: 'ink', label: 'Ink', L: 0.28, C: 0, H: 0, description: 'Pure black' },
]

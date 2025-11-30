/**
 * sRGB color (0-1 range, normalized)
 * All color values are normalized to 0.0-1.0 range for consistency
 */
export type Srgb = {
  r: number  // 0.0-1.0
  g: number  // 0.0-1.0
  b: number  // 0.0-1.0
}

/**
 * Clamp a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

/**
 * Validate that all components are within [0, 1] range
 * Returns true if valid, throws error if invalid
 */
const validateRange = (r: number, g: number, b: number): boolean => {
  const components = [
    { name: 'r', value: r },
    { name: 'g', value: g },
    { name: 'b', value: b }
  ]

  const invalid = components.filter(c => c.value < 0 || c.value > 1)

  if (invalid.length > 0) {
    const details = invalid.map(c => `${c.name}=${c.value}`).join(', ')
    throw new Error(`Srgb values must be in range [0, 1]. Invalid: ${details}`)
  }

  return true
}

/**
 * Check if the color vector is within the unit cube
 * Using vector operations to ensure all components are ≤ 1
 */
const isWithinUnitCube = (r: number, g: number, b: number): boolean => {
  // Check each component is within [0, 1]
  // This is equivalent to checking if the point (r,g,b) is inside the unit cube
  return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1
}

export const $Srgb = {
  /**
   * Create Srgb from normalized RGB values (0-1)
   * Values are validated and clamped to ensure they stay within valid range
   */
  create: (r: number, g: number, b: number): Srgb => {
    // Check if values are already in valid range
    if (!isWithinUnitCube(r, g, b)) {
      console.warn(`Srgb.create: Values out of range (${r}, ${g}, ${b}), clamping to [0,1]`)
    }

    // Clamp values to valid range
    const result = {
      r: clamp(r, 0, 1),
      g: clamp(g, 0, 1),
      b: clamp(b, 0, 1)
    }

    // Validate the clamped result
    validateRange(result.r, result.g, result.b)

    return result
  },

  /**
   * Create Srgb from normalized RGB values with strict validation
   * Throws error if values are out of range
   */
  createStrict: (r: number, g: number, b: number): Srgb => {
    validateRange(r, g, b)
    return { r, g, b }
  },

  /**
   * Create Srgb from 0-255 RGB values
   */
  from255: (r: number, g: number, b: number): Srgb => {
    return $Srgb.create(r / 255, g / 255, b / 255)
  },

  /**
   * Convert Srgb to 0-255 RGB values
   */
  to255: (color: Srgb): { r: number, g: number, b: number } => {
    return {
      r: Math.round(color.r * 255),
      g: Math.round(color.g * 255),
      b: Math.round(color.b * 255)
    }
  },

  /**
   * Convert Srgb to CSS rgb() string
   */
  toCssRgb: (color: Srgb): string => {
    const { r, g, b } = $Srgb.to255(color)
    return `rgb(${r}, ${g}, ${b})`
  },

  /**
   * Convert Srgb to hex color string
   */
  toHex: (color: Srgb): string => {
    const { r, g, b } = $Srgb.to255(color)
    const toHexPart = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`
  },

  /**
   * Parse hex color string to Srgb
   */
  fromHex: (hex: string): Srgb | null => {
    const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    if (!match) return null

    return $Srgb.from255(
      parseInt(match[1]!, 16),
      parseInt(match[2]!, 16),
      parseInt(match[3]!, 16)
    )
  },

  /**
   * Check if two colors are equal (with tolerance for floating point)
   */
  equals: (a: Srgb, b: Srgb, tolerance = 0.001): boolean => {
    return Math.abs(a.r - b.r) < tolerance &&
           Math.abs(a.g - b.g) < tolerance &&
           Math.abs(a.b - b.b) < tolerance
  }
}

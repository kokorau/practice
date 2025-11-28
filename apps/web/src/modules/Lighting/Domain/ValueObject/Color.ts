/**
 * RGB Color (0-1 range)
 */
export interface Color {
  readonly r: number
  readonly g: number
  readonly b: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export const $Color = {
  /** Create a color from RGB values (0-1) */
  create: (r: number, g: number, b: number): Color => ({
    r: clamp01(r),
    g: clamp01(g),
    b: clamp01(b),
  }),

  /** Create a color from RGB values (0-255) */
  fromRgb255: (r: number, g: number, b: number): Color => ({
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255),
  }),

  /** Convert to RGB tuple (0-1) */
  toTuple: (c: Color): readonly [number, number, number] => [c.r, c.g, c.b],

  /** Convert to RGB tuple (0-255) */
  toTuple255: (c: Color): readonly [number, number, number] => [
    Math.round(c.r * 255),
    Math.round(c.g * 255),
    Math.round(c.b * 255),
  ],

  /** Add two colors */
  add: (a: Color, b: Color): Color => ({
    r: clamp01(a.r + b.r),
    g: clamp01(a.g + b.g),
    b: clamp01(a.b + b.b),
  }),

  /** Multiply two colors */
  multiply: (a: Color, b: Color): Color => ({
    r: a.r * b.r,
    g: a.g * b.g,
    b: a.b * b.b,
  }),

  /** Scale a color by a scalar */
  scale: (c: Color, s: number): Color => ({
    r: clamp01(c.r * s),
    g: clamp01(c.g * s),
    b: clamp01(c.b * s),
  }),
}

/**
 * HSV/RGB/Hex color conversion utilities for SiteBuilder
 *
 * These wrappers provide a percentage-based API (s: 0-100, v: 0-100)
 * suitable for UI components while using the shared color utilities internally.
 */

import {
  hsvToRgb as hsvToRgbCore,
  rgbToHsv as rgbToHsvCore,
  hexToRgb as hexToRgbCore,
  rgbToHex as rgbToHexCore,
} from '../../../modules/Filter/Domain/ValueObject/colors'

/**
 * Convert HSV values to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param v - Value (0-100)
 * @returns RGB tuple [r, g, b] with values 0-255
 */
export const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const result = hsvToRgbCore(h, s / 100, v / 100)
  return [result.r, result.g, result.b]
}

/**
 * Convert RGB values to hex string
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string (e.g., "#ff0000")
 */
export const rgbToHex = rgbToHexCore

/**
 * Convert hex string to RGB
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns RGB tuple [r, g, b] with values 0-255, or null if invalid
 */
export const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = hexToRgbCore(hex)
  if (!result) return null
  return [result.r, result.g, result.b]
}

/**
 * Convert RGB values to HSV
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSV tuple [h, s, v] with h: 0-360, s: 0-100, v: 0-100
 */
export const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  const result = rgbToHsvCore(r, g, b)
  return [Math.round(result.h), Math.round(result.s * 100), Math.round(result.v * 100)]
}

/**
 * Convert hex string to HSV
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000")
 * @returns HSV tuple [h, s, v], or null if invalid hex
 */
export const hexToHsv = (hex: string): [number, number, number] | null => {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return rgbToHsv(...rgb)
}

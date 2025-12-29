/**
 * Layout patterns for hero section content positioning.
 * Defines 3x3 grid positions and horizontal layouts.
 */
export const LAYOUT_PATTERNS = [
  // 3x3 grid
  { id: 'top-left', label: '左上', icon: '◰' },
  { id: 'top-center', label: '上中央', icon: '◱' },
  { id: 'top-right', label: '右上', icon: '◳' },
  { id: 'center-left', label: '左中央', icon: '◧' },
  { id: 'center', label: '中央', icon: '◉' },
  { id: 'center-right', label: '右中央', icon: '◨' },
  { id: 'bottom-left', label: '左下', icon: '◲' },
  { id: 'bottom-center', label: '下中央', icon: '◱' },
  { id: 'bottom-right', label: '右下', icon: '◳' },
  // Horizontal layouts - top
  { id: 'row-top-between', label: '横上両端', icon: '⟷' },
  { id: 'row-top-left', label: '横上左寄', icon: '⫷' },
  { id: 'row-top-right', label: '横上右寄', icon: '⫸' },
  // Horizontal layouts - center
  { id: 'row-between', label: '横両端', icon: '⟷' },
  { id: 'row-left', label: '横左寄', icon: '⫷' },
  { id: 'row-right', label: '横右寄', icon: '⫸' },
  // Horizontal layouts - bottom
  { id: 'row-bottom-between', label: '横下両端', icon: '⟷' },
  { id: 'row-bottom-left', label: '横下左寄', icon: '⫷' },
  { id: 'row-bottom-right', label: '横下右寄', icon: '⫸' },
] as const

export type LayoutPattern = typeof LAYOUT_PATTERNS[number]
export type LayoutId = LayoutPattern['id']

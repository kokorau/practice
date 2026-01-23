/**
 * BezierPath - Cubic Bezier curve path for custom easing
 *
 * X axis: monotonically increasing (0-1), time always progresses
 * Y axis: free range (negative, >1 OK for bounce/overshoot effects)
 */

export type HandleMode = 'smooth' | 'corner' | 'auto'

export type BezierHandle = {
  dx: number // relative x offset from anchor
  dy: number // relative y offset from anchor
}

export type BezierAnchor = {
  x: number // 0-1, monotonically increasing
  y: number // any value (negative, >1 OK)
  handleMode: HandleMode
  handleIn: BezierHandle // relative coordinates from anchor
  handleOut: BezierHandle // relative coordinates from anchor
}

export type BezierPath = {
  anchors: BezierAnchor[]
}

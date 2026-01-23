import { describe, it, expect } from 'vitest'
import {
  identity,
  easeInOut,
  addAnchor,
  removeAnchor,
  updateAnchor,
  updateHandle,
  setHandleMode,
  evaluate,
  isValid,
  getXConstraints,
  toSvgPath,
  toLut,
  toLutClamped,
  evaluateLut,
  type BezierPath,
} from './index'

describe('identity', () => {
  it('should create a linear path from (0,0) to (1,1)', () => {
    const path = identity()

    expect(path.anchors).toHaveLength(2)
    expect(path.anchors[0]!.x).toBe(0)
    expect(path.anchors[0]!.y).toBe(0)
    expect(path.anchors[1]!.x).toBe(1)
    expect(path.anchors[1]!.y).toBe(1)
  })

  it('should evaluate to identity (y = x)', () => {
    const path = identity()

    expect(evaluate(path, 0)).toBeCloseTo(0)
    expect(evaluate(path, 0.25)).toBeCloseTo(0.25, 1)
    expect(evaluate(path, 0.5)).toBeCloseTo(0.5, 1)
    expect(evaluate(path, 0.75)).toBeCloseTo(0.75, 1)
    expect(evaluate(path, 1)).toBeCloseTo(1)
  })
})

describe('easeInOut', () => {
  it('should create an S-curve', () => {
    const path = easeInOut()

    expect(path.anchors).toHaveLength(2)
    expect(path.anchors[0]!.handleOut.dx).toBeCloseTo(0.42)
    expect(path.anchors[0]!.handleOut.dy).toBe(0)
    expect(path.anchors[1]!.handleIn.dx).toBeCloseTo(-0.42)
    expect(path.anchors[1]!.handleIn.dy).toBe(0)
  })

  it('should be slow at start and end, fast in middle', () => {
    const path = easeInOut()

    const y25 = evaluate(path, 0.25)
    const y50 = evaluate(path, 0.5)
    const y75 = evaluate(path, 0.75)

    // S-curve should be below linear at start, above at end
    expect(y25).toBeLessThan(0.25)
    expect(y50).toBeCloseTo(0.5, 1)
    expect(y75).toBeGreaterThan(0.75)
  })
})

describe('isValid', () => {
  it('should return true for valid paths', () => {
    const path = identity()
    expect(isValid(path)).toBe(true)
  })

  it('should return false for non-monotonic X', () => {
    const path: BezierPath = {
      anchors: [
        { x: 0, y: 0, handleMode: 'auto', handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0.1, dy: 0 } },
        {
          x: 0.7,
          y: 0.5,
          handleMode: 'auto',
          handleIn: { dx: -0.1, dy: 0 },
          handleOut: { dx: 0.1, dy: 0 },
        },
        {
          x: 0.3,
          y: 0.8,
          handleMode: 'auto',
          handleIn: { dx: -0.1, dy: 0 },
          handleOut: { dx: 0.1, dy: 0 },
        }, // Invalid: x < previous
        { x: 1, y: 1, handleMode: 'auto', handleIn: { dx: -0.1, dy: 0 }, handleOut: { dx: 0, dy: 0 } },
      ],
    }
    expect(isValid(path)).toBe(false)
  })

  it('should return false if first anchor x is not 0', () => {
    const path: BezierPath = {
      anchors: [
        {
          x: 0.1,
          y: 0,
          handleMode: 'auto',
          handleIn: { dx: 0, dy: 0 },
          handleOut: { dx: 0.1, dy: 0 },
        },
        { x: 1, y: 1, handleMode: 'auto', handleIn: { dx: -0.1, dy: 0 }, handleOut: { dx: 0, dy: 0 } },
      ],
    }
    expect(isValid(path)).toBe(false)
  })

  it('should return false if last anchor x is not 1', () => {
    const path: BezierPath = {
      anchors: [
        { x: 0, y: 0, handleMode: 'auto', handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0.1, dy: 0 } },
        {
          x: 0.9,
          y: 1,
          handleMode: 'auto',
          handleIn: { dx: -0.1, dy: 0 },
          handleOut: { dx: 0, dy: 0 },
        },
      ],
    }
    expect(isValid(path)).toBe(false)
  })

  it('should return false for path with less than 2 anchors', () => {
    const path: BezierPath = {
      anchors: [
        { x: 0, y: 0, handleMode: 'auto', handleIn: { dx: 0, dy: 0 }, handleOut: { dx: 0, dy: 0 } },
      ],
    }
    expect(isValid(path)).toBe(false)
  })
})

describe('getXConstraints', () => {
  it('should fix first anchor at x=0', () => {
    const path = identity()
    const constraints = getXConstraints(path, 0)

    expect(constraints.min).toBe(0)
    expect(constraints.max).toBe(0)
  })

  it('should fix last anchor at x=1', () => {
    const path = identity()
    const constraints = getXConstraints(path, path.anchors.length - 1)

    expect(constraints.min).toBe(1)
    expect(constraints.max).toBe(1)
  })

  it('should constrain middle anchors between neighbors', () => {
    // Add an anchor to get a 3-point path
    const path = addAnchor(identity(), 0.5)
    const constraints = getXConstraints(path, 1)

    expect(constraints.min).toBeGreaterThan(0)
    expect(constraints.max).toBeLessThan(1)
  })
})

describe('addAnchor', () => {
  it('should add anchor on the curve', () => {
    const path = identity()
    const newPath = addAnchor(path, 0.5)

    expect(newPath.anchors).toHaveLength(3)
    expect(newPath.anchors[1]!.x).toBeCloseTo(0.5, 1)
  })

  it('should maintain curve shape after adding anchor', () => {
    const path = identity()
    const newPath = addAnchor(path, 0.5)

    // Original path and new path should evaluate similarly
    expect(evaluate(newPath, 0.25)).toBeCloseTo(evaluate(path, 0.25), 1)
    expect(evaluate(newPath, 0.5)).toBeCloseTo(evaluate(path, 0.5), 1)
    expect(evaluate(newPath, 0.75)).toBeCloseTo(evaluate(path, 0.75), 1)
  })

  it('should clamp x to valid range', () => {
    const path = identity()

    const pathAtMin = addAnchor(path, 0)
    expect(pathAtMin.anchors[1]!.x).toBeGreaterThan(0)

    const pathAtMax = addAnchor(path, 1)
    expect(pathAtMax.anchors[1]!.x).toBeLessThan(1)
  })
})

describe('removeAnchor', () => {
  it('should remove middle anchor', () => {
    const path = addAnchor(identity(), 0.5)
    expect(path.anchors).toHaveLength(3)

    const newPath = removeAnchor(path, 1)
    expect(newPath.anchors).toHaveLength(2)
  })

  it('should not remove if only 2 anchors left', () => {
    const path = identity()
    expect(path.anchors).toHaveLength(2)

    const newPath = removeAnchor(path, 0)
    expect(newPath.anchors).toHaveLength(2) // No change
  })

  it('should not remove first or last anchor', () => {
    const path = addAnchor(identity(), 0.5)

    const pathAfterFirst = removeAnchor(path, 0)
    expect(pathAfterFirst.anchors).toHaveLength(3) // No change

    const pathAfterLast = removeAnchor(path, 2)
    expect(pathAfterLast.anchors).toHaveLength(3) // No change
  })
})

describe('updateAnchor', () => {
  it('should update Y freely (including negative and >1)', () => {
    const path = addAnchor(identity(), 0.5)

    const pathWithNegative = updateAnchor(path, 1, { y: -0.5 })
    expect(pathWithNegative.anchors[1]!.y).toBe(-0.5)

    const pathWithOvershoot = updateAnchor(path, 1, { y: 1.5 })
    expect(pathWithOvershoot.anchors[1]!.y).toBe(1.5)
  })

  it('should constrain X to maintain monotonicity', () => {
    const path = addAnchor(identity(), 0.5)

    // Try to move past the next anchor
    const updated = updateAnchor(path, 1, { x: 1.5 })
    expect(updated.anchors[1]!.x).toBeLessThan(1)
  })

  it('should not allow moving first anchor X', () => {
    const path = identity()
    const updated = updateAnchor(path, 0, { x: 0.5 })
    expect(updated.anchors[0]!.x).toBe(0)
  })

  it('should not allow moving last anchor X', () => {
    const path = identity()
    const updated = updateAnchor(path, 1, { x: 0.5 })
    expect(updated.anchors[1]!.x).toBe(1)
  })
})

describe('updateHandle', () => {
  it('should update handle position', () => {
    const path = identity()
    const updated = updateHandle(path, 0, 'out', { dx: 0.3, dy: 0.1 })

    expect(updated.anchors[0]!.handleOut.dx).toBe(0.3)
    expect(updated.anchors[0]!.handleOut.dy).toBe(0.1)
  })

  it('should mirror opposite handle in smooth mode', () => {
    const path: BezierPath = {
      anchors: [
        {
          x: 0,
          y: 0,
          handleMode: 'smooth',
          handleIn: { dx: 0, dy: 0 },
          handleOut: { dx: 0.2, dy: 0.2 },
        },
        {
          x: 0.5,
          y: 0.5,
          handleMode: 'smooth',
          handleIn: { dx: -0.1, dy: -0.1 },
          handleOut: { dx: 0.1, dy: 0.1 },
        },
        {
          x: 1,
          y: 1,
          handleMode: 'smooth',
          handleIn: { dx: -0.2, dy: -0.2 },
          handleOut: { dx: 0, dy: 0 },
        },
      ],
    }

    const updated = updateHandle(path, 1, 'out', { dx: 0.2, dy: 0.3 })

    // handleIn should be mirrored
    expect(updated.anchors[1]!.handleIn.dx).toBe(-0.2)
    expect(updated.anchors[1]!.handleIn.dy).toBe(-0.3)
  })

  it('should not mirror in corner mode', () => {
    const path: BezierPath = {
      anchors: [
        {
          x: 0,
          y: 0,
          handleMode: 'corner',
          handleIn: { dx: 0, dy: 0 },
          handleOut: { dx: 0.2, dy: 0.2 },
        },
        {
          x: 0.5,
          y: 0.5,
          handleMode: 'corner',
          handleIn: { dx: -0.1, dy: -0.1 },
          handleOut: { dx: 0.1, dy: 0.1 },
        },
        {
          x: 1,
          y: 1,
          handleMode: 'corner',
          handleIn: { dx: -0.2, dy: -0.2 },
          handleOut: { dx: 0, dy: 0 },
        },
      ],
    }

    const updated = updateHandle(path, 1, 'out', { dx: 0.2, dy: 0.3 })

    // handleIn should NOT be mirrored
    expect(updated.anchors[1]!.handleIn.dx).toBe(-0.1)
    expect(updated.anchors[1]!.handleIn.dy).toBe(-0.1)
  })
})

describe('evaluate', () => {
  it('should return correct values at endpoints', () => {
    const path = identity()

    expect(evaluate(path, 0)).toBe(0)
    expect(evaluate(path, 1)).toBe(1)
  })

  it('should handle values outside 0-1 range', () => {
    const path = identity()

    expect(evaluate(path, -0.5)).toBe(0)
    expect(evaluate(path, 1.5)).toBe(1)
  })

  it('should return Y values outside 0-1 for overshoot curves', () => {
    // Create a path with overshoot
    const path: BezierPath = {
      anchors: [
        {
          x: 0,
          y: 0,
          handleMode: 'smooth',
          handleIn: { dx: 0, dy: 0 },
          handleOut: { dx: 0.3, dy: 0.8 },
        },
        {
          x: 1,
          y: 1,
          handleMode: 'smooth',
          handleIn: { dx: -0.3, dy: 0.8 },
          handleOut: { dx: 0, dy: 0 },
        },
      ],
    }

    // The curve should overshoot beyond 1
    const midY = evaluate(path, 0.5)
    expect(midY).toBeGreaterThan(1)
  })
})

describe('toSvgPath', () => {
  it('should generate valid SVG path string', () => {
    const path = identity()
    const svg = toSvgPath(path, 100, 100)

    expect(svg).toContain('M')
    expect(svg).toContain('C')
  })

  it('should scale to specified dimensions', () => {
    const path = identity()
    const svg = toSvgPath(path, 200, 100)

    // First point should be at (0, 100) since Y is inverted
    expect(svg).toMatch(/M 0 100/)
  })
})

describe('toLut', () => {
  it('should generate 256 samples', () => {
    const path = identity()
    const lut = toLut(path)

    expect(lut).toHaveLength(256)
  })

  it('should be approximately linear for identity path', () => {
    const path = identity()
    const lut = toLut(path)

    expect(lut[0]).toBeCloseTo(0, 1)
    expect(lut[127]).toBeCloseTo(127 / 255, 1)
    expect(lut[255]).toBeCloseTo(1, 1)
  })

  it('should contain values outside 0-1 for overshoot curves', () => {
    const path: BezierPath = {
      anchors: [
        {
          x: 0,
          y: 0,
          handleMode: 'smooth',
          handleIn: { dx: 0, dy: 0 },
          handleOut: { dx: 0.3, dy: 0.8 },
        },
        {
          x: 1,
          y: 1,
          handleMode: 'smooth',
          handleIn: { dx: -0.3, dy: 0.8 },
          handleOut: { dx: 0, dy: 0 },
        },
      ],
    }

    const lut = toLut(path)

    // Some values should be > 1
    const hasOvershoot = Array.from(lut).some((v) => v > 1)
    expect(hasOvershoot).toBe(true)
  })
})

describe('toLutClamped', () => {
  it('should clamp all values to 0-1 range', () => {
    const path: BezierPath = {
      anchors: [
        {
          x: 0,
          y: 0,
          handleMode: 'smooth',
          handleIn: { dx: 0, dy: 0 },
          handleOut: { dx: 0.3, dy: 0.8 },
        },
        {
          x: 1,
          y: 1,
          handleMode: 'smooth',
          handleIn: { dx: -0.3, dy: 0.8 },
          handleOut: { dx: 0, dy: 0 },
        },
      ],
    }

    const lut = toLutClamped(path)

    for (let i = 0; i < 256; i++) {
      expect(lut[i]).toBeGreaterThanOrEqual(0)
      expect(lut[i]).toBeLessThanOrEqual(1)
    }
  })
})

describe('evaluateLut', () => {
  it('should interpolate between LUT samples', () => {
    const path = identity()
    const lut = toLut(path)

    // Should match evaluate closely
    expect(evaluateLut(lut, 0)).toBeCloseTo(evaluate(path, 0), 2)
    expect(evaluateLut(lut, 0.5)).toBeCloseTo(evaluate(path, 0.5), 2)
    expect(evaluateLut(lut, 1)).toBeCloseTo(evaluate(path, 1), 2)
  })

  it('should clamp input to 0-1', () => {
    const path = identity()
    const lut = toLut(path)

    expect(evaluateLut(lut, -0.5)).toBeCloseTo(lut[0]!, 2)
    expect(evaluateLut(lut, 1.5)).toBeCloseTo(lut[255]!, 2)
  })
})

describe('setHandleMode', () => {
  it('should change handle mode', () => {
    const path = identity()
    const updated = setHandleMode(path, 0, 'corner')

    expect(updated.anchors[0]!.handleMode).toBe('corner')
  })

  it('should recalculate handles when switching to auto', () => {
    const path: BezierPath = {
      anchors: [
        {
          x: 0,
          y: 0,
          handleMode: 'corner',
          handleIn: { dx: 0, dy: 0 },
          handleOut: { dx: 0.1, dy: 0.5 },
        },
        {
          x: 0.5,
          y: 0.5,
          handleMode: 'corner',
          handleIn: { dx: -0.1, dy: 0.5 },
          handleOut: { dx: 0.1, dy: -0.5 },
        },
        {
          x: 1,
          y: 1,
          handleMode: 'corner',
          handleIn: { dx: -0.1, dy: -0.5 },
          handleOut: { dx: 0, dy: 0 },
        },
      ],
    }

    const updated = setHandleMode(path, 1, 'auto')

    // Handles should be recalculated
    expect(updated.anchors[1]!.handleMode).toBe('auto')
    // Auto handles should be symmetric (pointing along prev-next direction)
    expect(updated.anchors[1]!.handleOut.dx).toBeCloseTo(-updated.anchors[1]!.handleIn.dx)
    expect(updated.anchors[1]!.handleOut.dy).toBeCloseTo(-updated.anchors[1]!.handleIn.dy)
  })
})

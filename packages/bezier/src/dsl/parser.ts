/**
 * SVG path parser
 * Parses SVG path commands into BezierPath
 */

import type { BezierPath, BezierAnchor } from '../types'
import { tokenize, type Token } from './tokenizer'
import { isValid } from '../constraints'

export type ParseResult = { ok: true; path: BezierPath } | { ok: false; error: string }

class Parser {
  private tokens: Token[]
  private pos = 0
  private currentX = 0
  private currentY = 0
  private lastCp2X = 0
  private lastCp2Y = 0
  private anchors: BezierAnchor[] = []

  constructor(input: string) {
    this.tokens = tokenize(input)
  }

  private peek(): Token {
    return this.tokens[this.pos]!
  }

  private advance(): Token {
    return this.tokens[this.pos++]!
  }

  private expectNumber(): number {
    const token = this.advance()
    if (token.type !== 'NUMBER') {
      throw new Error(`Expected number at position ${token.pos}, got ${token.type}`)
    }
    return parseFloat(token.value)
  }

  private expectCommand(expected?: string): string {
    const token = this.advance()
    if (token.type !== 'COMMAND') {
      throw new Error(`Expected command at position ${token.pos}, got ${token.type}`)
    }
    if (expected && token.value.toUpperCase() !== expected.toUpperCase()) {
      throw new Error(`Expected "${expected}" command at position ${token.pos}, got "${token.value}"`)
    }
    return token.value
  }

  parse(): BezierPath {
    // Must start with M command
    const moveCmd = this.expectCommand('M')
    const isRelative = moveCmd === 'm'

    let x = this.expectNumber()
    let y = this.expectNumber()

    if (isRelative) {
      x += this.currentX
      y += this.currentY
    }

    this.currentX = x
    this.currentY = y

    // First anchor has no incoming handle
    this.anchors.push({
      x,
      y,
      handleMode: 'smooth',
      handleIn: { dx: 0, dy: 0 },
      handleOut: { dx: 0, dy: 0 }, // Will be set by first curve command
    })

    // Process subsequent commands
    while (this.peek().type !== 'EOF') {
      const cmdToken = this.peek()
      if (cmdToken.type !== 'COMMAND') {
        throw new Error(`Expected command at position ${cmdToken.pos}, got ${cmdToken.type}`)
      }

      const cmd = this.advance().value

      switch (cmd) {
        case 'C':
        case 'c':
          this.parseCubic(cmd === 'c')
          break
        case 'S':
        case 's':
          this.parseSmooth(cmd === 's')
          break
        case 'L':
        case 'l':
          this.parseLine(cmd === 'l')
          break
        default:
          throw new Error(`Unsupported command "${cmd}" at position ${cmdToken.pos}`)
      }
    }

    // Validate the path
    const path = { anchors: this.anchors }
    if (!isValid(path)) {
      throw new Error('Invalid bezier path: X values must be monotonically increasing from 0 to 1')
    }

    return path
  }

  private parseCubic(isRelative: boolean): void {
    // C cp1x cp1y cp2x cp2y x y
    let cp1x = this.expectNumber()
    let cp1y = this.expectNumber()
    let cp2x = this.expectNumber()
    let cp2y = this.expectNumber()
    let x = this.expectNumber()
    let y = this.expectNumber()

    if (isRelative) {
      cp1x += this.currentX
      cp1y += this.currentY
      cp2x += this.currentX
      cp2y += this.currentY
      x += this.currentX
      y += this.currentY
    }

    // Update previous anchor's handleOut
    const prevAnchor = this.anchors[this.anchors.length - 1]!
    prevAnchor.handleOut = {
      dx: cp1x - this.currentX,
      dy: cp1y - this.currentY,
    }

    // Store cp2 for potential S command
    this.lastCp2X = cp2x
    this.lastCp2Y = cp2y

    // Add new anchor
    this.anchors.push({
      x,
      y,
      handleMode: 'smooth',
      handleIn: { dx: cp2x - x, dy: cp2y - y },
      handleOut: { dx: 0, dy: 0 }, // Will be set by next command or left as 0
    })

    this.currentX = x
    this.currentY = y
  }

  private parseSmooth(isRelative: boolean): void {
    // S cp2x cp2y x y
    // cp1 is reflection of last cp2 around current point
    let cp2x = this.expectNumber()
    let cp2y = this.expectNumber()
    let x = this.expectNumber()
    let y = this.expectNumber()

    if (isRelative) {
      cp2x += this.currentX
      cp2y += this.currentY
      x += this.currentX
      y += this.currentY
    }

    // Calculate cp1 as reflection of lastCp2 around currentX, currentY
    const cp1x = 2 * this.currentX - this.lastCp2X
    const cp1y = 2 * this.currentY - this.lastCp2Y

    // Update previous anchor's handleOut
    const prevAnchor = this.anchors[this.anchors.length - 1]!
    prevAnchor.handleOut = {
      dx: cp1x - this.currentX,
      dy: cp1y - this.currentY,
    }

    // Store cp2 for potential next S command
    this.lastCp2X = cp2x
    this.lastCp2Y = cp2y

    // Add new anchor
    this.anchors.push({
      x,
      y,
      handleMode: 'smooth',
      handleIn: { dx: cp2x - x, dy: cp2y - y },
      handleOut: { dx: 0, dy: 0 },
    })

    this.currentX = x
    this.currentY = y
  }

  private parseLine(isRelative: boolean): void {
    // L x y (straight line, no handles)
    let x = this.expectNumber()
    let y = this.expectNumber()

    if (isRelative) {
      x += this.currentX
      y += this.currentY
    }

    // For a straight line, handleOut points toward the endpoint
    const prevAnchor = this.anchors[this.anchors.length - 1]!
    prevAnchor.handleOut = { dx: 0, dy: 0 }

    // Reset lastCp2 to current position (for S command fallback)
    this.lastCp2X = this.currentX
    this.lastCp2Y = this.currentY

    // Add new anchor with no handles (corner)
    this.anchors.push({
      x,
      y,
      handleMode: 'corner',
      handleIn: { dx: 0, dy: 0 },
      handleOut: { dx: 0, dy: 0 },
    })

    this.currentX = x
    this.currentY = y
  }
}

/**
 * Parse an SVG path string into a BezierPath
 * Throws an error if parsing fails
 */
export const parse = (input: string): BezierPath => {
  const parser = new Parser(input)
  return parser.parse()
}

/**
 * Parse an SVG path string into a BezierPath
 * Returns a result object with success/failure
 */
export const tryParse = (input: string): ParseResult => {
  try {
    const path = parse(input)
    return { ok: true, path }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

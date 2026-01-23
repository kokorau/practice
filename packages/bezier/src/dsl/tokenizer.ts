/**
 * SVG path tokenizer
 * Tokenizes SVG path commands for bezier curve parsing
 */

export type TokenType = 'COMMAND' | 'NUMBER' | 'EOF'

export type Token = {
  type: TokenType
  value: string
  pos: number
}

const COMMANDS = new Set(['M', 'm', 'C', 'c', 'S', 's', 'L', 'l'])

/**
 * Tokenize an SVG path string into tokens
 */
export const tokenize = (input: string): Token[] => {
  const tokens: Token[] = []
  let pos = 0

  while (pos < input.length) {
    // Skip whitespace and commas
    while (pos < input.length && /[\s,]/.test(input[pos]!)) {
      pos++
    }

    if (pos >= input.length) {
      break
    }

    const char = input[pos]!

    // Command
    if (COMMANDS.has(char)) {
      tokens.push({ type: 'COMMAND', value: char, pos })
      pos++
      continue
    }

    // Number (including negative and decimal)
    if (/[-.\d]/.test(char)) {
      const start = pos
      let hasDecimal = false

      // Handle negative sign
      if (input[pos] === '-') {
        pos++
      }

      // Read digits and decimal point
      while (pos < input.length) {
        const c = input[pos]!
        if (c === '.') {
          if (hasDecimal) break // Second decimal point starts a new number
          hasDecimal = true
          pos++
        } else if (/\d/.test(c)) {
          pos++
        } else {
          break
        }
      }

      const value = input.slice(start, pos)
      if (value === '-' || value === '.') {
        throw new Error(`Invalid number at position ${start}: "${value}"`)
      }

      tokens.push({ type: 'NUMBER', value, pos: start })
      continue
    }

    throw new Error(`Unexpected character "${char}" at position ${pos}`)
  }

  tokens.push({ type: 'EOF', value: '', pos })

  return tokens
}

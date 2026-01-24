/**
 * Tokenizer for DSL
 */

export type TokenType =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'MINUS'
  | 'PLUS'
  | 'STAR'
  | 'STARSTAR'
  | 'SLASH'
  | 'PERCENT'
  | 'EQUALS'
  | 'AT'
  | 'COLON'
  | 'EOF'

export interface Token {
  type: TokenType
  value: string
  pos: number
}

export class Tokenizer {
  private pos = 0
  private tokens: Token[] = []
  private input: string

  constructor(input: string) {
    this.input = input
  }

  tokenize(): Token[] {
    this.pos = 0
    this.tokens = []

    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const char = this.input[this.pos]!

      if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek(1)))) {
        this.readNumber()
      } else if (this.isAlpha(char) || char === '_') {
        this.readIdentifier()
      } else if (char === '(') {
        this.tokens.push({ type: 'LPAREN', value: '(', pos: this.pos })
        this.pos++
      } else if (char === ')') {
        this.tokens.push({ type: 'RPAREN', value: ')', pos: this.pos })
        this.pos++
      } else if (char === ',') {
        this.tokens.push({ type: 'COMMA', value: ',', pos: this.pos })
        this.pos++
      } else if (char === '-') {
        this.tokens.push({ type: 'MINUS', value: '-', pos: this.pos })
        this.pos++
      } else if (char === '+') {
        this.tokens.push({ type: 'PLUS', value: '+', pos: this.pos })
        this.pos++
      } else if (char === '*') {
        // Check for **
        if (this.peek(1) === '*') {
          this.tokens.push({ type: 'STARSTAR', value: '**', pos: this.pos })
          this.pos += 2
        } else {
          this.tokens.push({ type: 'STAR', value: '*', pos: this.pos })
          this.pos++
        }
      } else if (char === '/') {
        this.tokens.push({ type: 'SLASH', value: '/', pos: this.pos })
        this.pos++
      } else if (char === '%') {
        this.tokens.push({ type: 'PERCENT', value: '%', pos: this.pos })
        this.pos++
      } else if (char === '=') {
        this.tokens.push({ type: 'EQUALS', value: '=', pos: this.pos })
        this.pos++
      } else if (char === '@') {
        this.tokens.push({ type: 'AT', value: '@', pos: this.pos })
        this.pos++
      } else if (char === ':') {
        this.tokens.push({ type: 'COLON', value: ':', pos: this.pos })
        this.pos++
      } else {
        throw new Error(`Unexpected character '${char}' at position ${this.pos}`)
      }
    }

    this.tokens.push({ type: 'EOF', value: '', pos: this.pos })
    return this.tokens
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++
    }
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char)
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char)
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char)
  }

  private peek(offset: number): string {
    return this.input[this.pos + offset] ?? ''
  }

  private readNumber(): void {
    const startPos = this.pos
    let value = ''

    while (this.pos < this.input.length && this.isDigit(this.input[this.pos]!)) {
      value += this.input[this.pos]
      this.pos++
    }

    if (this.pos < this.input.length && this.input[this.pos] === '.') {
      value += '.'
      this.pos++

      while (this.pos < this.input.length && this.isDigit(this.input[this.pos]!)) {
        value += this.input[this.pos]
        this.pos++
      }
    }

    this.tokens.push({ type: 'NUMBER', value, pos: startPos })
  }

  private readIdentifier(): void {
    const startPos = this.pos
    let value = ''

    while (this.pos < this.input.length) {
      const char = this.input[this.pos]!
      if (this.isAlphaNumeric(char)) {
        value += char
        this.pos++
      } else if (char === '-' && this.pos + 1 < this.input.length && this.isAlphaNumeric(this.input[this.pos + 1]!)) {
        // Allow hyphen in identifier if followed by alphanumeric (e.g., track-stripe-angle)
        value += char
        this.pos++
      } else {
        break
      }
    }

    this.tokens.push({ type: 'IDENTIFIER', value, pos: startPos })
  }
}

export function tokenize(input: string): Token[] {
  return new Tokenizer(input).tokenize()
}

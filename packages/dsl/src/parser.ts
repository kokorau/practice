/**
 * Parser for DSL (Pratt Parser)
 *
 * Grammar:
 *   expression := equality
 *   additive := multiplicative (('+' | '-') multiplicative)*
 *   multiplicative := power (('*' | '/' | '%') power)*
 *   power := unary ('**' unary)* (right-associative)
 *   unary := '-' unary | postfix
 *   postfix := primary ('(' argList? ')')?
 *   primary := number | identifier | reference | '(' expression ')'
 *   reference := '@' identifier (':' identifier)?
 *   argList := expression (',' expression)*
 */

import type { AstNode, BinaryOperator } from './ast'
import { $Ast } from './ast'
import type { Token, TokenType } from './tokenizer'
import { tokenize } from './tokenizer'

export class Parser {
  private pos = 0
  private tokens: Token[] = []
  private input: string

  constructor(input: string) {
    this.input = input
  }

  parse(): AstNode {
    this.tokens = tokenize(this.input)
    this.pos = 0

    // Skip leading '=' marker if present
    if (this.current().type === 'EQUALS') {
      this.advance()
    }

    const result = this.parseExpression()

    if (this.current().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.current().value}' at position ${this.current().pos}`)
    }

    return result
  }

  private current(): Token {
    return this.tokens[this.pos]!
  }

  private advance(): Token {
    return this.tokens[this.pos++]!
  }

  private expect(type: TokenType): Token {
    const token = this.current()
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} at position ${token.pos}`)
    }
    return this.advance()
  }

  private parseExpression(): AstNode {
    return this.parseAdditive()
  }

  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative()

    while (this.current().type === 'PLUS' || this.current().type === 'MINUS') {
      const op = this.advance().value as BinaryOperator
      const right = this.parseMultiplicative()
      left = $Ast.binary(op, left, right)
    }

    return left
  }

  private parseMultiplicative(): AstNode {
    let left = this.parsePower()

    while (this.current().type === 'STAR' || this.current().type === 'SLASH' || this.current().type === 'PERCENT') {
      const op = this.advance().value as BinaryOperator
      const right = this.parsePower()
      left = $Ast.binary(op, left, right)
    }

    return left
  }

  private parsePower(): AstNode {
    const left = this.parseUnary()

    // Right-associative: 2 ** 3 ** 2 = 2 ** (3 ** 2)
    if (this.current().type === 'STARSTAR') {
      this.advance()
      const right = this.parsePower() // recursive for right-associativity
      return $Ast.binary('**', left, right)
    }

    return left
  }

  private parseUnary(): AstNode {
    if (this.current().type === 'MINUS') {
      this.advance()
      const operand = this.parseUnary()
      return $Ast.unary('-', operand)
    }

    return this.parsePostfix()
  }

  private parsePostfix(): AstNode {
    const primary = this.parsePrimary()

    // Check if it's a function call
    if (primary.type === 'identifier' && this.current().type === 'LPAREN') {
      return this.parseFunctionCall(primary.name)
    }

    return primary
  }

  private parsePrimary(): AstNode {
    const token = this.current()

    // Number
    if (token.type === 'NUMBER') {
      this.advance()
      return $Ast.number(parseFloat(token.value))
    }

    // Identifier (could be variable or function name)
    if (token.type === 'IDENTIFIER') {
      this.advance()
      return $Ast.identifier(token.value)
    }

    // Reference (@t or @namespace:path)
    if (token.type === 'AT') {
      return this.parseReference()
    }

    // Grouping: (expression)
    if (token.type === 'LPAREN') {
      this.advance()
      const expr = this.parseExpression()
      this.expect('RPAREN')
      return expr
    }

    throw new Error(`Unexpected token '${token.value}' at position ${token.pos}`)
  }

  private parseReference(): AstNode {
    this.expect('AT')
    const first = this.expect('IDENTIFIER')

    // Check for namespace:path format
    if (this.current().type === 'COLON') {
      this.advance()
      const path = this.expect('IDENTIFIER')
      return $Ast.reference(first.value, path.value)
    }

    // Short form: @t
    return $Ast.reference(null, first.value)
  }

  private parseFunctionCall(name: string): AstNode {
    this.expect('LPAREN')

    const args: AstNode[] = []

    // Handle empty argument list
    if (this.current().type !== 'RPAREN') {
      args.push(this.parseExpression())

      while (this.current().type === 'COMMA') {
        this.advance()
        args.push(this.parseExpression())
      }
    }

    this.expect('RPAREN')

    return $Ast.call(name, args)
  }
}

export function parse(input: string): AstNode {
  return new Parser(input).parse()
}

export type ParseResult = { ok: true; ast: AstNode } | { ok: false; error: string }

export function tryParse(expression: string): ParseResult {
  try {
    const ast = parse(expression)
    return { ok: true, ast }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Parser for DSL
 *
 * Grammar:
 *   expression := unary | primary
 *   unary := '-' expression
 *   primary := number | identifier | functionCall
 *   functionCall := identifier '(' argList? ')'
 *   argList := expression (',' expression)*
 */

import { AstNode, $Ast } from './ast'
import { Token, tokenize } from './tokenizer'

export class Parser {
  private pos = 0
  private tokens: Token[] = []

  constructor(private input: string) {}

  parse(): AstNode {
    this.tokens = tokenize(this.input)
    this.pos = 0
    const result = this.parseExpression()

    if (this.current().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.current().value}' at position ${this.current().pos}`)
    }

    return result
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    return this.tokens[this.pos++]
  }

  private expect(type: Token['type']): Token {
    const token = this.current()
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} at position ${token.pos}`)
    }
    return this.advance()
  }

  private parseExpression(): AstNode {
    // Handle unary minus
    if (this.current().type === 'MINUS') {
      this.advance()
      const expr = this.parseExpression()
      return $Ast.call('neg', [expr])
    }

    return this.parsePrimary()
  }

  private parsePrimary(): AstNode {
    const token = this.current()

    if (token.type === 'NUMBER') {
      this.advance()
      return $Ast.number(parseFloat(token.value))
    }

    if (token.type === 'IDENTIFIER') {
      this.advance()

      // Check if it's a function call
      if (this.current().type === 'LPAREN') {
        return this.parseFunctionCall(token.value)
      }

      // Otherwise it's a variable reference
      return $Ast.identifier(token.value)
    }

    throw new Error(`Unexpected token '${token.value}' at position ${token.pos}`)
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

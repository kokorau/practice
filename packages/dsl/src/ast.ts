/**
 * AST Node Types for DSL
 */

export interface NumberNode {
  type: 'number'
  value: number
}

export interface IdentifierNode {
  type: 'identifier'
  name: string
}

export interface CallNode {
  type: 'call'
  name: string
  args: AstNode[]
}

export type AstNode = NumberNode | IdentifierNode | CallNode

export const $Ast = {
  number(value: number): NumberNode {
    return { type: 'number', value }
  },
  identifier(name: string): IdentifierNode {
    return { type: 'identifier', name }
  },
  call(name: string, args: AstNode[]): CallNode {
    return { type: 'call', name, args }
  },
} as const

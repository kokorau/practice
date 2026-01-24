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

export interface ReferenceNode {
  type: 'reference'
  namespace: string | null // null = short form (@t), string = namespaced (@timeline:track-a)
  path: string
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '**'

export interface BinaryNode {
  type: 'binary'
  operator: BinaryOperator
  left: AstNode
  right: AstNode
}

export type UnaryOperator = '-'

export interface UnaryNode {
  type: 'unary'
  operator: UnaryOperator
  operand: AstNode
}

export type AstNode = NumberNode | IdentifierNode | CallNode | ReferenceNode | BinaryNode | UnaryNode

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
  reference(namespace: string | null, path: string): ReferenceNode {
    return { type: 'reference', namespace, path }
  },
  binary(operator: BinaryOperator, left: AstNode, right: AstNode): BinaryNode {
    return { type: 'binary', operator, left, right }
  },
  unary(operator: UnaryOperator, operand: AstNode): UnaryNode {
    return { type: 'unary', operator, operand }
  },
} as const

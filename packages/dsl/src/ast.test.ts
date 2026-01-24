import { describe, it, expect } from 'vitest'
import { $Ast } from './ast'

describe('AST', () => {
  describe('existing nodes', () => {
    it('creates number node', () => {
      expect($Ast.number(42)).toEqual({ type: 'number', value: 42 })
    })

    it('creates identifier node', () => {
      expect($Ast.identifier('t')).toEqual({ type: 'identifier', name: 't' })
    })

    it('creates call node', () => {
      expect($Ast.call('sin', [$Ast.number(1)])).toEqual({
        type: 'call',
        name: 'sin',
        args: [{ type: 'number', value: 1 }],
      })
    })
  })

  describe('new nodes', () => {
    describe('reference node', () => {
      it('creates short reference node (@t)', () => {
        expect($Ast.reference(null, 't')).toEqual({
          type: 'reference',
          namespace: null,
          path: 't',
        })
      })

      it('creates namespaced reference node (@timeline:track-a)', () => {
        expect($Ast.reference('timeline', 'track-a')).toEqual({
          type: 'reference',
          namespace: 'timeline',
          path: 'track-a',
        })
      })
    })

    describe('binary expression node', () => {
      it('creates add expression', () => {
        expect($Ast.binary('+', $Ast.number(1), $Ast.number(2))).toEqual({
          type: 'binary',
          operator: '+',
          left: { type: 'number', value: 1 },
          right: { type: 'number', value: 2 },
        })
      })

      it('creates multiply expression', () => {
        expect($Ast.binary('*', $Ast.number(3), $Ast.number(4))).toEqual({
          type: 'binary',
          operator: '*',
          left: { type: 'number', value: 3 },
          right: { type: 'number', value: 4 },
        })
      })

      it('creates nested binary expression', () => {
        // (1 + 2) * 3
        const inner = $Ast.binary('+', $Ast.number(1), $Ast.number(2))
        expect($Ast.binary('*', inner, $Ast.number(3))).toEqual({
          type: 'binary',
          operator: '*',
          left: {
            type: 'binary',
            operator: '+',
            left: { type: 'number', value: 1 },
            right: { type: 'number', value: 2 },
          },
          right: { type: 'number', value: 3 },
        })
      })

      it('creates power expression', () => {
        expect($Ast.binary('**', $Ast.number(2), $Ast.number(3))).toEqual({
          type: 'binary',
          operator: '**',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 3 },
        })
      })
    })

    describe('unary expression node', () => {
      it('creates negation expression', () => {
        expect($Ast.unary('-', $Ast.number(5))).toEqual({
          type: 'unary',
          operator: '-',
          operand: { type: 'number', value: 5 },
        })
      })
    })
  })
})

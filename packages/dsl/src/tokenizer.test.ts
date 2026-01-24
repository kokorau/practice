import { describe, it, expect } from 'vitest'
import { tokenize, type Token } from './tokenizer'

describe('Tokenizer', () => {
  // Helper to extract token types and values
  const getTokens = (input: string): Array<{ type: string; value: string }> => {
    return tokenize(input).map(({ type, value }) => ({ type, value }))
  }

  describe('existing tokens', () => {
    it('tokenizes numbers', () => {
      expect(getTokens('42')).toEqual([
        { type: 'NUMBER', value: '42' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes decimal numbers', () => {
      expect(getTokens('3.14')).toEqual([
        { type: 'NUMBER', value: '3.14' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes identifiers', () => {
      expect(getTokens('foo')).toEqual([
        { type: 'IDENTIFIER', value: 'foo' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes function calls', () => {
      expect(getTokens('add(t, 3)')).toEqual([
        { type: 'IDENTIFIER', value: 'add' },
        { type: 'LPAREN', value: '(' },
        { type: 'IDENTIFIER', value: 't' },
        { type: 'COMMA', value: ',' },
        { type: 'NUMBER', value: '3' },
        { type: 'RPAREN', value: ')' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes minus', () => {
      expect(getTokens('-5')).toEqual([
        { type: 'MINUS', value: '-' },
        { type: 'NUMBER', value: '5' },
        { type: 'EOF', value: '' },
      ])
    })
  })

  describe('new tokens: DSL marker', () => {
    it('tokenizes equals sign as DSL marker', () => {
      expect(getTokens('=42')).toEqual([
        { type: 'EQUALS', value: '=' },
        { type: 'NUMBER', value: '42' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes DSL expression with equals', () => {
      expect(getTokens('=osc(@t, 2000)')).toEqual([
        { type: 'EQUALS', value: '=' },
        { type: 'IDENTIFIER', value: 'osc' },
        { type: 'LPAREN', value: '(' },
        { type: 'AT', value: '@' },
        { type: 'IDENTIFIER', value: 't' },
        { type: 'COMMA', value: ',' },
        { type: 'NUMBER', value: '2000' },
        { type: 'RPAREN', value: ')' },
        { type: 'EOF', value: '' },
      ])
    })
  })

  describe('new tokens: reference (@)', () => {
    it('tokenizes @ symbol', () => {
      expect(getTokens('@t')).toEqual([
        { type: 'AT', value: '@' },
        { type: 'IDENTIFIER', value: 't' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes namespaced reference with colon', () => {
      expect(getTokens('@timeline:track-a')).toEqual([
        { type: 'AT', value: '@' },
        { type: 'IDENTIFIER', value: 'timeline' },
        { type: 'COLON', value: ':' },
        { type: 'IDENTIFIER', value: 'track-a' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes identifier with hyphens', () => {
      expect(getTokens('track-stripe-angle')).toEqual([
        { type: 'IDENTIFIER', value: 'track-stripe-angle' },
        { type: 'EOF', value: '' },
      ])
    })
  })

  describe('new tokens: arithmetic operators', () => {
    it('tokenizes plus', () => {
      expect(getTokens('1 + 2')).toEqual([
        { type: 'NUMBER', value: '1' },
        { type: 'PLUS', value: '+' },
        { type: 'NUMBER', value: '2' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes star (multiply)', () => {
      expect(getTokens('3 * 4')).toEqual([
        { type: 'NUMBER', value: '3' },
        { type: 'STAR', value: '*' },
        { type: 'NUMBER', value: '4' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes slash (divide)', () => {
      expect(getTokens('10 / 2')).toEqual([
        { type: 'NUMBER', value: '10' },
        { type: 'SLASH', value: '/' },
        { type: 'NUMBER', value: '2' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes percent (modulo)', () => {
      expect(getTokens('10 % 3')).toEqual([
        { type: 'NUMBER', value: '10' },
        { type: 'PERCENT', value: '%' },
        { type: 'NUMBER', value: '3' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes double star (power)', () => {
      expect(getTokens('2 ** 3')).toEqual([
        { type: 'NUMBER', value: '2' },
        { type: 'STARSTAR', value: '**' },
        { type: 'NUMBER', value: '3' },
        { type: 'EOF', value: '' },
      ])
    })

    it('distinguishes ** from two *', () => {
      expect(getTokens('2**3')).toEqual([
        { type: 'NUMBER', value: '2' },
        { type: 'STARSTAR', value: '**' },
        { type: 'NUMBER', value: '3' },
        { type: 'EOF', value: '' },
      ])
    })
  })

  describe('complex expressions', () => {
    it('tokenizes full DSL expression', () => {
      expect(getTokens('=osc(@t, 4000) * 0.7 + osc(@t, 500) * 0.3')).toEqual([
        { type: 'EQUALS', value: '=' },
        { type: 'IDENTIFIER', value: 'osc' },
        { type: 'LPAREN', value: '(' },
        { type: 'AT', value: '@' },
        { type: 'IDENTIFIER', value: 't' },
        { type: 'COMMA', value: ',' },
        { type: 'NUMBER', value: '4000' },
        { type: 'RPAREN', value: ')' },
        { type: 'STAR', value: '*' },
        { type: 'NUMBER', value: '0.7' },
        { type: 'PLUS', value: '+' },
        { type: 'IDENTIFIER', value: 'osc' },
        { type: 'LPAREN', value: '(' },
        { type: 'AT', value: '@' },
        { type: 'IDENTIFIER', value: 't' },
        { type: 'COMMA', value: ',' },
        { type: 'NUMBER', value: '500' },
        { type: 'RPAREN', value: ')' },
        { type: 'STAR', value: '*' },
        { type: 'NUMBER', value: '0.3' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes expression with namespaced reference', () => {
      expect(getTokens('=@timeline:track-stripe-angle * 0.5 + 0.25')).toEqual([
        { type: 'EQUALS', value: '=' },
        { type: 'AT', value: '@' },
        { type: 'IDENTIFIER', value: 'timeline' },
        { type: 'COLON', value: ':' },
        { type: 'IDENTIFIER', value: 'track-stripe-angle' },
        { type: 'STAR', value: '*' },
        { type: 'NUMBER', value: '0.5' },
        { type: 'PLUS', value: '+' },
        { type: 'NUMBER', value: '0.25' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes expression with power operator', () => {
      expect(getTokens('=@t ** 2 + 1')).toEqual([
        { type: 'EQUALS', value: '=' },
        { type: 'AT', value: '@' },
        { type: 'IDENTIFIER', value: 't' },
        { type: 'STARSTAR', value: '**' },
        { type: 'NUMBER', value: '2' },
        { type: 'PLUS', value: '+' },
        { type: 'NUMBER', value: '1' },
        { type: 'EOF', value: '' },
      ])
    })

    it('tokenizes grouped expression', () => {
      expect(getTokens('=(1 + 2) * 3')).toEqual([
        { type: 'EQUALS', value: '=' },
        { type: 'LPAREN', value: '(' },
        { type: 'NUMBER', value: '1' },
        { type: 'PLUS', value: '+' },
        { type: 'NUMBER', value: '2' },
        { type: 'RPAREN', value: ')' },
        { type: 'STAR', value: '*' },
        { type: 'NUMBER', value: '3' },
        { type: 'EOF', value: '' },
      ])
    })
  })
})

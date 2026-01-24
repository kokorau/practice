import { describe, it, expect } from 'vitest'
import { parse, tryParse } from './parser'
import { $Ast } from './ast'

describe('Parser', () => {
  describe('backward compatibility (old syntax)', () => {
    it('parses number literal', () => {
      expect(parse('42')).toEqual($Ast.number(42))
    })

    it('parses decimal number', () => {
      expect(parse('3.14')).toEqual($Ast.number(3.14))
    })

    it('parses negative number', () => {
      expect(parse('-5')).toEqual($Ast.unary('-', $Ast.number(5)))
    })

    it('parses identifier', () => {
      expect(parse('t')).toEqual($Ast.identifier('t'))
    })

    it('parses simple function call', () => {
      expect(parse('add(t, 3)')).toEqual(
        $Ast.call('add', [$Ast.identifier('t'), $Ast.number(3)])
      )
    })

    it('parses nested function calls', () => {
      expect(parse('mul(sin(t), 10)')).toEqual(
        $Ast.call('mul', [
          $Ast.call('sin', [$Ast.identifier('t')]),
          $Ast.number(10),
        ])
      )
    })

    it('parses constants', () => {
      expect(parse('PI')).toEqual($Ast.identifier('PI'))
    })
  })

  describe('new syntax: DSL marker (=)', () => {
    it('parses =42 as number', () => {
      expect(parse('=42')).toEqual($Ast.number(42))
    })

    it('parses =osc(@t, 2000)', () => {
      expect(parse('=osc(@t, 2000)')).toEqual(
        $Ast.call('osc', [$Ast.reference(null, 't'), $Ast.number(2000)])
      )
    })
  })

  describe('new syntax: reference (@)', () => {
    it('parses short reference @t', () => {
      expect(parse('@t')).toEqual($Ast.reference(null, 't'))
    })

    it('parses namespaced reference @timeline:track-a', () => {
      expect(parse('@timeline:track-a')).toEqual(
        $Ast.reference('timeline', 'track-a')
      )
    })

    it('parses reference with hyphenated path', () => {
      expect(parse('@timeline:track-stripe-angle')).toEqual(
        $Ast.reference('timeline', 'track-stripe-angle')
      )
    })

    it('parses reference in function call', () => {
      expect(parse('osc(@t, 4000)')).toEqual(
        $Ast.call('osc', [$Ast.reference(null, 't'), $Ast.number(4000)])
      )
    })
  })

  describe('new syntax: arithmetic operators', () => {
    describe('addition and subtraction', () => {
      it('parses 1 + 2', () => {
        expect(parse('1 + 2')).toEqual(
          $Ast.binary('+', $Ast.number(1), $Ast.number(2))
        )
      })

      it('parses 5 - 3', () => {
        expect(parse('5 - 3')).toEqual(
          $Ast.binary('-', $Ast.number(5), $Ast.number(3))
        )
      })

      it('parses left-associative: 1 + 2 + 3 = (1 + 2) + 3', () => {
        expect(parse('1 + 2 + 3')).toEqual(
          $Ast.binary('+', $Ast.binary('+', $Ast.number(1), $Ast.number(2)), $Ast.number(3))
        )
      })
    })

    describe('multiplication, division, modulo', () => {
      it('parses 3 * 4', () => {
        expect(parse('3 * 4')).toEqual(
          $Ast.binary('*', $Ast.number(3), $Ast.number(4))
        )
      })

      it('parses 10 / 2', () => {
        expect(parse('10 / 2')).toEqual(
          $Ast.binary('/', $Ast.number(10), $Ast.number(2))
        )
      })

      it('parses 10 % 3', () => {
        expect(parse('10 % 3')).toEqual(
          $Ast.binary('%', $Ast.number(10), $Ast.number(3))
        )
      })
    })

    describe('power operator', () => {
      it('parses 2 ** 3', () => {
        expect(parse('2 ** 3')).toEqual(
          $Ast.binary('**', $Ast.number(2), $Ast.number(3))
        )
      })

      it('parses right-associative: 2 ** 3 ** 2 = 2 ** (3 ** 2)', () => {
        expect(parse('2 ** 3 ** 2')).toEqual(
          $Ast.binary('**', $Ast.number(2), $Ast.binary('**', $Ast.number(3), $Ast.number(2)))
        )
      })
    })

    describe('operator precedence', () => {
      it('parses * before +: 1 + 2 * 3 = 1 + (2 * 3)', () => {
        expect(parse('1 + 2 * 3')).toEqual(
          $Ast.binary('+', $Ast.number(1), $Ast.binary('*', $Ast.number(2), $Ast.number(3)))
        )
      })

      it('parses * before -: 5 - 2 * 2 = 5 - (2 * 2)', () => {
        expect(parse('5 - 2 * 2')).toEqual(
          $Ast.binary('-', $Ast.number(5), $Ast.binary('*', $Ast.number(2), $Ast.number(2)))
        )
      })

      it('parses ** before *: 2 * 3 ** 2 = 2 * (3 ** 2)', () => {
        expect(parse('2 * 3 ** 2')).toEqual(
          $Ast.binary('*', $Ast.number(2), $Ast.binary('**', $Ast.number(3), $Ast.number(2)))
        )
      })

      it('parses complex: 1 + 2 * 3 ** 4', () => {
        // 1 + (2 * (3 ** 4))
        expect(parse('1 + 2 * 3 ** 4')).toEqual(
          $Ast.binary('+', $Ast.number(1),
            $Ast.binary('*', $Ast.number(2),
              $Ast.binary('**', $Ast.number(3), $Ast.number(4))))
        )
      })
    })

    describe('unary minus', () => {
      it('parses -5', () => {
        expect(parse('-5')).toEqual($Ast.unary('-', $Ast.number(5)))
      })

      it('parses --5 (double negation)', () => {
        expect(parse('--5')).toEqual($Ast.unary('-', $Ast.unary('-', $Ast.number(5))))
      })

      it('parses 3 * -2', () => {
        expect(parse('3 * -2')).toEqual(
          $Ast.binary('*', $Ast.number(3), $Ast.unary('-', $Ast.number(2)))
        )
      })

      it('parses -@t', () => {
        expect(parse('-@t')).toEqual($Ast.unary('-', $Ast.reference(null, 't')))
      })
    })

    describe('grouping with parentheses', () => {
      it('parses (1 + 2) * 3', () => {
        expect(parse('(1 + 2) * 3')).toEqual(
          $Ast.binary('*', $Ast.binary('+', $Ast.number(1), $Ast.number(2)), $Ast.number(3))
        )
      })

      it('parses 2 ** (1 + 2)', () => {
        expect(parse('2 ** (1 + 2)')).toEqual(
          $Ast.binary('**', $Ast.number(2), $Ast.binary('+', $Ast.number(1), $Ast.number(2)))
        )
      })

      it('parses nested: ((1 + 2) * 3) + 4', () => {
        expect(parse('((1 + 2) * 3) + 4')).toEqual(
          $Ast.binary('+',
            $Ast.binary('*', $Ast.binary('+', $Ast.number(1), $Ast.number(2)), $Ast.number(3)),
            $Ast.number(4))
        )
      })
    })
  })

  describe('complex expressions', () => {
    it('parses =osc(@t, 4000) * 0.7 + osc(@t, 500) * 0.3', () => {
      expect(parse('=osc(@t, 4000) * 0.7 + osc(@t, 500) * 0.3')).toEqual(
        $Ast.binary('+',
          $Ast.binary('*',
            $Ast.call('osc', [$Ast.reference(null, 't'), $Ast.number(4000)]),
            $Ast.number(0.7)),
          $Ast.binary('*',
            $Ast.call('osc', [$Ast.reference(null, 't'), $Ast.number(500)]),
            $Ast.number(0.3)))
      )
    })

    it('parses =@timeline:track-stripe-angle * 0.5 + 0.25', () => {
      expect(parse('=@timeline:track-stripe-angle * 0.5 + 0.25')).toEqual(
        $Ast.binary('+',
          $Ast.binary('*',
            $Ast.reference('timeline', 'track-stripe-angle'),
            $Ast.number(0.5)),
          $Ast.number(0.25))
      )
    })

    it('parses =sin(@t / 1000 * PI)', () => {
      expect(parse('=sin(@t / 1000 * PI)')).toEqual(
        $Ast.call('sin', [
          $Ast.binary('*',
            $Ast.binary('/',
              $Ast.reference(null, 't'),
              $Ast.number(1000)),
            $Ast.identifier('PI'))
        ])
      )
    })

    it('parses =floor(osc(@t, 2000) * 8) / 8', () => {
      expect(parse('=floor(osc(@t, 2000) * 8) / 8')).toEqual(
        $Ast.binary('/',
          $Ast.call('floor', [
            $Ast.binary('*',
              $Ast.call('osc', [$Ast.reference(null, 't'), $Ast.number(2000)]),
              $Ast.number(8))
          ]),
          $Ast.number(8))
      )
    })
  })

  describe('tryParse', () => {
    it('returns ok: true for valid expression', () => {
      const result = tryParse('=@t * 2 + 1')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.ast).toEqual(
          $Ast.binary('+',
            $Ast.binary('*', $Ast.reference(null, 't'), $Ast.number(2)),
            $Ast.number(1))
        )
      }
    })

    it('returns ok: false for invalid expression', () => {
      const result = tryParse('1 +')
      expect(result.ok).toBe(false)
    })

    it('returns ok: false for empty input', () => {
      const result = tryParse('')
      expect(result.ok).toBe(false)
    })
  })
})

import { describe, it, expect } from 'vitest'
import { evaluate, Evaluator } from './evaluator'
import { parse } from './parser'

describe('Evaluator', () => {
  describe('backward compatibility', () => {
    it('evaluates number literal', () => {
      expect(evaluate('42', {})).toBe(42)
    })

    it('evaluates identifier from context', () => {
      expect(evaluate('t', { t: 0.5 })).toBe(0.5)
    })

    it('evaluates function call: add(t, 3)', () => {
      expect(evaluate('add(t, 3)', { t: 2 })).toBe(5)
    })

    it('evaluates nested function: mul(sin(t), 10)', () => {
      expect(evaluate('mul(sin(t), 10)', { t: 0 })).toBeCloseTo(0)
    })

    it('evaluates constants PI and E', () => {
      expect(evaluate('PI', {})).toBeCloseTo(Math.PI)
      expect(evaluate('E', {})).toBeCloseTo(Math.E)
    })

    it('throws on unknown identifier', () => {
      expect(() => evaluate('unknown', {})).toThrow()
    })
  })

  describe('new syntax: reference (@)', () => {
    it('evaluates short reference @t', () => {
      expect(evaluate('@t', { t: 42 })).toBe(42)
    })

    it('evaluates namespaced reference @timeline:track-a', () => {
      expect(evaluate('@timeline:track-a', { 'timeline:track-a': 0.75 })).toBe(0.75)
    })

    it('evaluates reference in function call', () => {
      expect(evaluate('osc(@t, 4000)', { t: 0 })).toBeCloseTo(0.5)
    })

    it('throws on unknown reference', () => {
      expect(() => evaluate('@unknown', {})).toThrow()
    })
  })

  describe('new syntax: binary operators', () => {
    describe('addition and subtraction', () => {
      it('evaluates 1 + 2 = 3', () => {
        expect(evaluate('1 + 2', {})).toBe(3)
      })

      it('evaluates 5 - 3 = 2', () => {
        expect(evaluate('5 - 3', {})).toBe(2)
      })

      it('evaluates @t + 1', () => {
        expect(evaluate('@t + 1', { t: 5 })).toBe(6)
      })
    })

    describe('multiplication, division, modulo', () => {
      it('evaluates 3 * 4 = 12', () => {
        expect(evaluate('3 * 4', {})).toBe(12)
      })

      it('evaluates 10 / 2 = 5', () => {
        expect(evaluate('10 / 2', {})).toBe(5)
      })

      it('evaluates 10 % 3 = 1', () => {
        expect(evaluate('10 % 3', {})).toBe(1)
      })

      it('evaluates @t * 2', () => {
        expect(evaluate('@t * 2', { t: 3 })).toBe(6)
      })
    })

    describe('power operator', () => {
      it('evaluates 2 ** 3 = 8', () => {
        expect(evaluate('2 ** 3', {})).toBe(8)
      })

      it('evaluates 2 ** 3 ** 2 = 512 (right-associative)', () => {
        // 2 ** (3 ** 2) = 2 ** 9 = 512
        expect(evaluate('2 ** 3 ** 2', {})).toBe(512)
      })
    })

    describe('operator precedence', () => {
      it('evaluates 1 + 2 * 3 = 7', () => {
        expect(evaluate('1 + 2 * 3', {})).toBe(7)
      })

      it('evaluates 2 * 3 ** 2 = 18', () => {
        expect(evaluate('2 * 3 ** 2', {})).toBe(18)
      })

      it('evaluates (1 + 2) * 3 = 9', () => {
        expect(evaluate('(1 + 2) * 3', {})).toBe(9)
      })
    })

    describe('unary minus', () => {
      it('evaluates -5 = -5', () => {
        expect(evaluate('-5', {})).toBe(-5)
      })

      it('evaluates --5 = 5', () => {
        expect(evaluate('--5', {})).toBe(5)
      })

      it('evaluates 3 * -2 = -6', () => {
        expect(evaluate('3 * -2', {})).toBe(-6)
      })

      it('evaluates -@t', () => {
        expect(evaluate('-@t', { t: 7 })).toBe(-7)
      })
    })
  })

  describe('new syntax: DSL marker (=)', () => {
    it('evaluates =42 as 42', () => {
      expect(evaluate('=42', {})).toBe(42)
    })

    it('evaluates =@t * 2 + 1', () => {
      expect(evaluate('=@t * 2 + 1', { t: 5 })).toBe(11)
    })

    it('evaluates =osc(@t, 4000) * 0.7 + osc(@t, 500) * 0.3', () => {
      // At t=0, osc returns 0.5, so 0.5 * 0.7 + 0.5 * 0.3 = 0.5
      expect(evaluate('=osc(@t, 4000) * 0.7 + osc(@t, 500) * 0.3', { t: 0 })).toBeCloseTo(0.5)
    })
  })

  describe('complex expressions', () => {
    it('evaluates =sin(@t / 1000 * PI)', () => {
      // sin(0) = 0
      expect(evaluate('=sin(@t / 1000 * PI)', { t: 0 })).toBeCloseTo(0)
      // sin(500 / 1000 * PI) = sin(PI/2) = 1
      expect(evaluate('=sin(@t / 1000 * PI)', { t: 500 })).toBeCloseTo(1)
    })

    it('evaluates =floor(osc(@t, 2000) * 8) / 8', () => {
      // At t=0, osc=0.5, floor(0.5*8)=4, 4/8=0.5
      expect(evaluate('=floor(osc(@t, 2000) * 8) / 8', { t: 0 })).toBeCloseTo(0.5)
    })

    it('evaluates =@timeline:track-a * 0.5 + 0.25', () => {
      expect(evaluate('=@timeline:track-a * 0.5 + 0.25', { 'timeline:track-a': 1 })).toBeCloseTo(0.75)
      expect(evaluate('=@timeline:track-a * 0.5 + 0.25', { 'timeline:track-a': 0 })).toBeCloseTo(0.25)
    })

    it('evaluates =abs(@t - 0.5) * 2', () => {
      expect(evaluate('=abs(@t - 0.5) * 2', { t: 0 })).toBeCloseTo(1)
      expect(evaluate('=abs(@t - 0.5) * 2', { t: 0.5 })).toBeCloseTo(0)
      expect(evaluate('=abs(@t - 0.5) * 2', { t: 1 })).toBeCloseTo(1)
    })
  })

  describe('Evaluator class', () => {
    it('can be reused with different contexts', () => {
      const ast = parse('=@t * 2 + 1')

      const eval1 = new Evaluator({ t: 5 })
      expect(eval1.evaluate(ast)).toBe(11)

      const eval2 = new Evaluator({ t: 10 })
      expect(eval2.evaluate(ast)).toBe(21)
    })
  })
})

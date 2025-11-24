import { describe, it, expect } from 'vitest'
import { Shadow } from './Shadow'
import { Light } from './Light'
import { SceneObject } from './SceneObject'
import { Point } from './Point'

describe('Shadow', () => {
  it('光源が左にある場合、影は右に伸びる', () => {
    // 光源: 左側 (100, 300)
    const light = Light.create('l1', Point.create(100, 300, 100), { intensity: 1 })
    // オブジェクト: 中央 (400, 300)
    const obj = SceneObject.create('o1', Point.create(400, 300), { width: 96, height: 96, depth: 10 })

    const shadow = Shadow.calculate(light, obj)

    console.log('Light at (100, 300), Object at (400, 300)')
    console.log('Shadow offset:', shadow.offsetX, shadow.offsetY)

    // 光源が左にあるので、影は右（正のX方向）に伸びるべき
    expect(shadow.offsetX).toBeGreaterThan(0)
  })

  it('光源が上にある場合、影は下に伸びる', () => {
    // 光源: 上側 (400, 100)
    const light = Light.create('l1', Point.create(400, 100, 100), { intensity: 1 })
    // オブジェクト: 中央 (400, 300)
    const obj = SceneObject.create('o1', Point.create(400, 300), { width: 96, height: 96, depth: 10 })

    const shadow = Shadow.calculate(light, obj)

    console.log('Light at (400, 100), Object at (400, 300)')
    console.log('Shadow offset:', shadow.offsetX, shadow.offsetY)

    // 光源が上にあるので、影は下（正のY方向）に伸びるべき
    expect(shadow.offsetY).toBeGreaterThan(0)
  })
})

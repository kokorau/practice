// Re-export Vector2 from @practice/vector
export type { Vector2 } from '@practice/vector'
export { $Vector2 } from '@practice/vector'

export type {
  /** @deprecated Use Vector2 from @practice/vector */
  Vec2,
  P3Color,
  ColorPoint,
  MixParams,
  WarpParams,
  PostParams,
  GradientVO,
} from './GradientVO'

/** @deprecated Use $Vector2 from @practice/vector */
export { $GradientVO, $ColorPoint, $P3Color, $Vec2 } from './GradientVO'

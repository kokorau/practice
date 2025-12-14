/**
 * WebGPU Types
 *
 * Re-exports Domain types for backward compatibility.
 * New code should import directly from Domain/ValueObject.
 */

// Re-export from Domain for backward compatibility
export type {
  ScenePlane,
  SceneBox,
  SceneSphere,
  RenderableObject,
  Scene,
} from '../../Domain/ValueObject'

export {
  $RenderableObject,
  $Scene,
} from '../../Domain/ValueObject'

// Backward compatibility aliases
export type { RenderableObject as SceneObject } from '../../Domain/ValueObject'
export { $RenderableObject as $SceneObject } from '../../Domain/ValueObject'

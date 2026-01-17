# Compositor Node System Architecture

This document describes the architecture of the Compositor Node System, a refactoring of the rendering pipeline in `renderHeroConfig.ts`.

## Overview

The Compositor Node System separates the rendering pipeline into two distinct node types:

- **RenderNode**: Renders a single layer/element to a texture
- **CompositorNode**: Combines multiple textures into a single output texture

This separation enables:
- Testable, isolated rendering logic
- Flexible pipeline composition
- Clear data flow visualization
- Per-layer debugging and inspection

## Current Architecture (Before)

```
┌─────────────────────────────────────────────────────────────────┐
│                    renderHeroConfig() (~230 lines)              │
├─────────────────────────────────────────────────────────────────┤
│  for each layer:                                                │
│    1. Create surface spec                                       │
│    2. Create mask spec (if any)                                 │
│    3. Render to offscreen                                       │
│    4. Apply effects (ping-pong)                                 │
│    5. Composite to canvas                                       │
│                                                                 │
│  Problems:                                                      │
│  - Procedural, hard to test                                     │
│  - Deep branching in loops                                      │
│  - Manual offscreen index management (0/1)                      │
│  - Many console.log debug statements                            │
└─────────────────────────────────────────────────────────────────┘
```

## Target Architecture (After)

```
┌─────────────────────────────────────────────────────────────────┐
│                     RenderNode Layer                             │
│  ─────────────────────────────────────────────────────────────  │
│  Input: Spec (what to render)                                   │
│  Output: TextureHandle (rendered result)                        │
│  Responsibility: Single layer rendering                         │
├─────────────────────────────────────────────────────────────────┤
│  SurfaceRenderNode   →  TextureHandle (pattern/gradient)        │
│  MaskRenderNode      →  TextureHandle (greymap mask)            │
│  EffectRenderNode    →  TextureHandle (post-effect applied)     │
│  ImageRenderNode     →  TextureHandle (image layer)             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ TextureHandle
┌─────────────────────────────────────────────────────────────────┐
│                   CompositorNode Layer                           │
│  ─────────────────────────────────────────────────────────────  │
│  Input: TextureHandle[] (multiple textures)                     │
│  Output: TextureHandle (composited result)                      │
│  Responsibility: Texture composition only                       │
├─────────────────────────────────────────────────────────────────┤
│  MaskCompositorNode       →  surface × mask → masked texture    │
│  OverlayCompositorNode    →  layer1 + layer2 + ... → combined   │
│  EffectChainCompositorNode →  apply effects in sequence         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ TextureHandle
┌─────────────────────────────────────────────────────────────────┐
│                     OutputNode Layer                             │
│  ─────────────────────────────────────────────────────────────  │
│  Input: TextureHandle                                           │
│  Output: Canvas                                                 │
├─────────────────────────────────────────────────────────────────┤
│  CanvasOutputNode    →  Draw final texture to canvas            │
└─────────────────────────────────────────────────────────────────┘
```

## Type Definitions

### Core Types

```typescript
/**
 * Abstraction over GPU texture with lifecycle management
 */
interface TextureHandle {
  readonly id: string
  readonly _gpuTexture: GPUTexture  // Internal, not for direct access
  readonly width: number
  readonly height: number
}

/**
 * Context passed to all nodes during execution
 */
interface NodeContext {
  renderer: TextureRendererLike
  viewport: Viewport
  palette: PrimitivePalette
  scale: number
  texturePool: TexturePool
}

/**
 * Manages offscreen texture allocation
 */
interface TexturePool {
  acquire(): TextureHandle
  release(handle: TextureHandle): void
}
```

### Node Interfaces

```typescript
/**
 * Renders a single layer to texture
 */
interface RenderNode {
  readonly id: string
  readonly type: 'render'
  render(ctx: NodeContext): TextureHandle
}

/**
 * Composes multiple textures into one
 */
interface CompositorNode {
  readonly id: string
  readonly type: 'compositor'
  readonly inputs: (RenderNode | CompositorNode)[]
  composite(ctx: NodeContext): TextureHandle
}

/**
 * Outputs to final destination (canvas)
 */
interface OutputNode {
  readonly id: string
  readonly type: 'output'
  output(ctx: NodeContext): void
}

/**
 * Union type for any node
 */
type PipelineNode = RenderNode | CompositorNode | OutputNode
```

## Node Implementations

### RenderNode Implementations

| Node | Input | Output | Wraps |
|------|-------|--------|-------|
| `SurfaceRenderNode` | SurfaceConfig, ColorKeys | TextureHandle | `createBackgroundSpecFromSurface()` |
| `MaskRenderNode` | AnyMaskConfig | TextureHandle | `createGreymapMaskSpecFromShape()` |
| `EffectRenderNode` | TextureHandle, EffectConfig | TextureHandle | `EFFECT_REGISTRY[type].createShaderSpec()` |
| `ImageRenderNode` | ImageSource | TextureHandle | `renderer.renderImageToOffscreen()` |

### CompositorNode Implementations

| Node | Inputs | Output | Description |
|------|--------|--------|-------------|
| `MaskCompositorNode` | Surface, Mask | TextureHandle | Applies mask to surface using two-texture shader |
| `OverlayCompositorNode` | TextureHandle[] | TextureHandle | Overlays layers in order with alpha blending |
| `EffectChainCompositorNode` | TextureHandle, Effects[] | TextureHandle | Applies effects with ping-pong rendering |

## Pipeline Construction

### buildPipeline()

Converts `HeroViewConfig` to a node graph:

```typescript
function buildPipeline(
  config: HeroViewConfig,
  palette: PrimitivePalette
): OutputNode {
  const baseLayer = findBaseLayer(config.layers)
  const clipGroups = findAllClipGroups(config.layers)

  // Build layer nodes
  const layerNodes: (RenderNode | CompositorNode)[] = []

  // 1. Background layer
  if (baseLayer) {
    layerNodes.push(new SurfaceRenderNode('bg', baseLayer.surface, baseLayer.colors))
  }

  // 2. Clip-group layers
  for (const { group, surface, processor } of clipGroups) {
    let node: RenderNode | CompositorNode = new SurfaceRenderNode(...)

    if (processor?.mask?.enabled) {
      const maskNode = new MaskRenderNode(...)
      node = new MaskCompositorNode(node, maskNode)
    }

    const effects = getEffectsFromProcessor(processor)
    if (effects.length > 0) {
      node = new EffectChainCompositorNode(node, effects)
    }

    layerNodes.push(node)
  }

  // 3. Combine all layers
  const scene = new OverlayCompositorNode('scene', layerNodes)

  // 4. Output to canvas
  return new CanvasOutputNode('output', scene)
}
```

### executePipeline()

Executes the node graph:

```typescript
function executePipeline(
  root: OutputNode,
  context: NodeContext
): void {
  root.output(context)
}
```

## Data Flow Example

For a typical hero scene with background + masked overlay:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Pipeline Graph                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐                                        │
│  │ SurfaceRenderNode   │                                        │
│  │ "background"        │ ──→ TextureHandle                      │
│  │ (stripe pattern)    │            │                           │
│  └─────────────────────┘            │                           │
│                                     │                           │
│  ┌─────────────────────┐   ┌───────┴───────────────────┐       │
│  │ SurfaceRenderNode   │   │                           │       │
│  │ "layer1-surface"    │──→│  MaskCompositorNode       │       │
│  │ (gradient pattern)  │   │  "layer1-masked"          │       │
│  └─────────────────────┘   │                           │──→ Tex│
│  ┌─────────────────────┐   │                           │    │  │
│  │ MaskRenderNode      │──→│                           │    │  │
│  │ "layer1-mask"       │   └───────────────────────────┘    │  │
│  │ (circle greymap)    │                                    │  │
│  └─────────────────────┘                                    │  │
│                                      ↓                      │  │
│                         ┌────────────────────────────┐      │  │
│                         │ EffectChainCompositorNode  │←─────┘  │
│                         │ "layer1-effects"           │         │
│                         │ (vignette)                 │         │
│                         └────────────┬───────────────┘         │
│                                      │                          │
│         ┌────────────────────────────┴──────────────────────┐  │
│         │         OverlayCompositorNode "scene"             │  │
│         │  inputs: [background, layer1-effects]             │  │
│         └────────────────────────┬──────────────────────────┘  │
│                                  │                              │
│         ┌────────────────────────┴──────────────────────────┐  │
│         │         CanvasOutputNode "output"                 │  │
│         │         → Draws to canvas                         │  │
│         └───────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Migration Strategy

### Phase 1: Type Definitions (Non-breaking)

Create new types alongside existing code:
- `Domain/Compositor/types.ts`
- `Domain/Compositor/RenderNode.ts`
- `Domain/Compositor/CompositorNode.ts`

### Phase 2: RenderNode Implementation

Implement render nodes wrapping existing helper functions:
- `Infra/Compositor/nodes/SurfaceRenderNode.ts`
- `Infra/Compositor/nodes/MaskRenderNode.ts`
- etc.

### Phase 3: CompositorNode Implementation

Implement compositor nodes:
- `Infra/Compositor/nodes/MaskCompositorNode.ts`
- `Infra/Compositor/nodes/OverlayCompositorNode.ts`
- etc.

### Phase 4: Pipeline Builder

Create `buildPipeline()` and `executePipeline()`:
- `Infra/Compositor/buildPipeline.ts`
- `Infra/Compositor/executePipeline.ts`

### Phase 5: Migration

Replace `renderHeroConfig()` internals with pipeline execution:
```typescript
export async function renderHeroConfig(
  renderer: TextureRendererLike,
  config: HeroViewConfig,
  palette: PrimitivePalette,
  options?: RenderHeroConfigOptions
): Promise<void> {
  const pipeline = buildPipeline(config, palette)
  const context = createNodeContext(renderer, palette, options)
  executePipeline(pipeline, context)
}
```

## Testing Strategy

### Unit Tests

Each node type tested independently:

```typescript
describe('SurfaceRenderNode', () => {
  it('creates correct spec for stripe pattern', () => {
    const node = new SurfaceRenderNode('test', stripeSurface, colors)
    const result = node.render(mockContext)
    expect(mockRenderer.renderToOffscreen).toHaveBeenCalledWith(
      expect.objectContaining({ shader: expect.stringContaining('stripe') })
    )
  })
})
```

### Integration Tests

Full pipeline tests using mock renderer:

```typescript
describe('buildPipeline', () => {
  it('creates correct graph for config with masked layer', () => {
    const pipeline = buildPipeline(configWithMask, palette)
    pipeline.output(mockContext)

    expect(mockRenderer.renderToOffscreen).toHaveBeenCalledTimes(3)  // bg + surface + mask
    expect(mockRenderer.applyDualTextureEffectToOffscreen).toHaveBeenCalled()
    expect(mockRenderer.compositeToCanvas).toHaveBeenCalled()
  })
})
```

## File Organization

```
modules/HeroScene/
├── Domain/
│   ├── Compositor/
│   │   ├── index.ts           # Exports
│   │   ├── types.ts           # TextureHandle, NodeContext, TexturePool
│   │   ├── RenderNode.ts      # RenderNode interface
│   │   ├── CompositorNode.ts  # CompositorNode interface
│   │   └── OutputNode.ts      # OutputNode interface
│   └── ...existing files
├── Application/
│   └── ...existing files
└── Infra/
    ├── Compositor/
    │   ├── index.ts
    │   ├── nodes/
    │   │   ├── SurfaceRenderNode.ts
    │   │   ├── MaskRenderNode.ts
    │   │   ├── EffectRenderNode.ts
    │   │   ├── ImageRenderNode.ts
    │   │   ├── MaskCompositorNode.ts
    │   │   ├── OverlayCompositorNode.ts
    │   │   ├── EffectChainCompositorNode.ts
    │   │   └── CanvasOutputNode.ts
    │   ├── buildPipeline.ts
    │   ├── executePipeline.ts
    │   └── TexturePool.ts
    ├── renderHeroConfig.ts    # Uses new pipeline internally
    └── ...existing files
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Testability | Full pipeline only | Individual nodes |
| Extensibility | Modify loop branches | Add new node types |
| Debugging | console.log | Inspect any node output |
| Reusability | Copy-paste functions | Compose nodes |
| Texture Management | Manual index tracking | TexturePool abstraction |

## Future Enhancements

1. **Texture Caching**: Cache node outputs when inputs unchanged
2. **Parallel Execution**: Execute independent nodes concurrently
3. **Node Graph UI**: Visual editor for pipeline composition
4. **Blend Modes**: Add blend mode parameter to OverlayCompositorNode

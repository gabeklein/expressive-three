import { ref, Model } from '@expressive/mvc';
import * as THREE from 'three';

import { fit } from './camera';
import { Frame, loop } from './frame';
import { Object3D, objectOf, Scene, verify } from './object';
import { cast, Pointer, track } from './pointer';

declare namespace Viewport {
  /** A canvas, or a WebGL context a host made. */
  type Surface = HTMLCanvasElement | WebGLRenderingContext | WebGL2RenderingContext;

  interface Renderer {
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setPixelRatio(ratio: number): void;
    render(scene: THREE.Object3D, camera: THREE.Camera): void;
    dispose(): void;
  }
}

const DETACH = new WeakMap<object, () => void>();

/**
 * The host-facing root - draws `scene` through `camera` every frame once given a surface.
 * `R` types the renderer a `draw` override sees; `WebGLRenderer` unless `createRenderer` makes another.
 */
class Viewport<R extends Viewport.Renderer = THREE.WebGLRenderer> extends Model {
  /** Clock for everything under this viewport - nodes read it with `get(Frame)`. */
  frame = new Frame();

  /** The pointer over the attached canvas - nodes read it with `get(Pointer)`. */
  pointer = new Pointer();

  declare scene: Scene;
  declare camera: Object3D<THREE.Camera>;

  /** For a host's `<canvas ref>` - attached while the element is mounted. */
  canvas = ref<HTMLCanvasElement>((element) => this.attach(element));

  /** The renderer while attached - for a `draw` override. */
  protected _renderer?: R;

  /** Draw into `surface` until the returned function is called. */
  attach(surface: Viewport.Surface) {
    if (!this.scene || !this.camera)
      throw new Error(`${this} needs a scene and a camera to draw.`);

    DETACH.get(this)?.();

    const renderer = this.createRenderer(surface);
    let size: [number, number];

    const resize = (width: number, height: number) => {
      size = [width, height];
      renderer.setPixelRatio(globalThis.devicePixelRatio || 1);
      renderer.setSize(width, height, false);

      fit(this.camera, width, height);
    };

    const refit = this.set((key) => {
      if (key == 'camera') fit(this.camera, ...size);
    });

    let observer: ResizeObserver | undefined;

    if ('getContext' in surface) {
      resize(surface.clientWidth, surface.clientHeight);

      if (typeof ResizeObserver == 'function') {
        observer = new ResizeObserver(() => resize(surface.clientWidth, surface.clientHeight));
        observer.observe(surface);
      }
    } else resize(surface.drawingBufferWidth, surface.drawingBufferHeight);

    this._renderer = renderer;

    const aim = (delta?: number) =>
      cast(this.pointer, objectOf(this.scene), objectOf(this.camera) as THREE.Camera, delta);
    const untrack = 'getContext' in surface ? track(this.pointer, surface, aim) : undefined;

    const stop = loop(
      {
        tick: (delta) => {
          this.frame.tick(delta);
          this.draw();
          aim(delta);
        }
      },
      (step) => this.schedule(step)
    );

    const detach = () => {
      if (DETACH.get(this) !== detach) return;

      DETACH.delete(this);
      refit();
      stop();
      observer?.disconnect();
      untrack?.();
      renderer.dispose();
      this._renderer = undefined;
    };

    DETACH.set(this, detach);

    return detach;
  }

  /** One frame, after the clock ticks - override to wrap it, e.g. for post-processing. */
  protected draw() {
    verify();
    this._renderer!.render(objectOf(this.scene), objectOf(this.camera) as THREE.Camera);
  }

  protected createRenderer(surface: Viewport.Surface): R {
    return ('getContext' in surface
      ? new THREE.WebGLRenderer({ canvas: surface, antialias: true })
      : new THREE.WebGLRenderer({ canvas: surface.canvas as HTMLCanvasElement, context: surface })) as unknown as R;
  }

  protected schedule(step: (time: number) => void) {
    requestAnimationFrame(step);
  }
}

Viewport.on({
  setup(self) {
    return () => DETACH.get(self)?.();
  }
});

export { Viewport };

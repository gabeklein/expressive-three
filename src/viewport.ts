import { ref, Model } from '@expressive/mvc';
import * as THREE from 'three';

import { fit } from './camera';
import { Frame, loop } from './frame';
import { Object3D, objectOf, Scene, verify } from './object';

declare namespace Viewport {
  /** A canvas, or a WebGL context a host made. */
  type Surface = HTMLCanvasElement | WebGLRenderingContext | WebGL2RenderingContext;

  interface Renderer {
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setPixelRatio(ratio: number): void;
    render(scene: THREE.Object3D, camera: THREE.Camera): void;
    dispose(): void;
    shadowMap?: { enabled: boolean; type: THREE.ShadowMapType };
  }
}

const DETACH = new WeakMap<object, () => void>();
const SURFACE = new WeakMap<object, Viewport.Surface | undefined>();

/**
 * The host-facing root - draws `scene` through `camera` every frame once given a surface.
 * `R` types the renderer a `draw` override sees; `WebGLRenderer` unless `createRenderer` makes another.
 */
class Viewport<R extends Viewport.Renderer = THREE.WebGLRenderer> extends Model {
  /** Clock for everything under this viewport - nodes read it with `get(Frame)`. */
  frame = new Frame();

  declare scene: Scene;
  declare camera: Object3D<THREE.Camera>;

  /** Whether lights and objects marked `castShadow` throw soft shadows. */
  shadows = false;

  /** What is drawn into while attached. */
  declare readonly surface: Viewport.Surface | undefined;

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

    const shade = () => {
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = this.shadows;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    };

    const refit = this.set((key) => {
      if (key == 'camera') fit(this.camera, ...size);
      else if (key == 'shadows') shade();
    });

    shade();

    let observer: ResizeObserver | undefined;

    if ('getContext' in surface) {
      resize(surface.clientWidth, surface.clientHeight);

      if (typeof ResizeObserver == 'function') {
        observer = new ResizeObserver(() => resize(surface.clientWidth, surface.clientHeight));
        observer.observe(surface);
      }
    } else resize(surface.drawingBufferWidth, surface.drawingBufferHeight);

    this._renderer = renderer;

    const stop = loop(
      {
        tick: (delta) => {
          this.frame.tick(delta);
          this.draw();
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
      renderer.dispose();
      this._renderer = undefined;
      SURFACE.delete(this);
      this.set('surface');
    };

    DETACH.set(this, detach);
    SURFACE.set(this, surface);
    this.set('surface');

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
    (self as Model).set('surface', { get: () => SURFACE.get(self), set: false });

    return () => DETACH.get(self)?.();
  }
});

export { Viewport };

import { describe, expect, it, vi } from 'vitest';
import { Model } from '@expressive/mvc';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { PerspectiveCamera } from './camera';
import { objectOf, Scene } from './object';
import { orbit } from './orbit';
import { Viewport } from './viewport';
import { flushMicrotasks } from '../test.setup';

const settle = async () => {
  for (let i = 0; i < 3; i++) await flushMicrotasks();
};

class Test extends Viewport<Viewport.Renderer> {
  scene = new Scene();
  camera = new PerspectiveCamera({ position: new THREE.Vector3(0, 0, 5) });
  controls = orbit({ enableDamping: true, target: new THREE.Vector3(0, 1, 0) });

  _steps: ((time: number) => void)[] = [];
  _time = 0;

  protected createRenderer() {
    return { setSize() {}, setPixelRatio() {}, render() {}, dispose() {} };
  }

  protected schedule(step: (time: number) => void) {
    this._steps.push(step);
  }

  step() {
    this._steps.shift()!((this._time += 16));
  }
}

function canvas() {
  const document = new EventTarget();

  return Object.assign(new EventTarget(), {
    getContext() {},
    style: {},
    ownerDocument: document,
    getRootNode: () => document,
    clientWidth: 800,
    clientHeight: 400
  }) as unknown as HTMLCanvasElement;
}

describe('orbit', () => {
  it('will control the camera while attached, updating each frame', async () => {
    const game = Test.new();

    expect(game.controls).toBeUndefined();

    game.attach(canvas());

    expect(game.controls).toBeUndefined();
    await settle();

    const { controls } = game;

    expect(controls).toBeInstanceOf(OrbitControls);
    expect(controls!.object).toBe(objectOf(game.camera));
    expect(controls!.enableDamping).toBe(true);
    expect(controls!.target.y).toBe(1);

    const update = vi.spyOn(controls!, 'update');

    game.step();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('will follow a camera assigned while attached', async () => {
    const game = Test.new();

    game.attach(canvas());
    await settle();

    const before = game.controls!;
    const dispose = vi.spyOn(before, 'dispose');

    game.camera = new PerspectiveCamera();
    await settle();

    expect(dispose).toHaveBeenCalled();
    expect(game.controls).not.toBe(before);
    expect(game.controls!.object).toBe(objectOf(game.camera));
  });

  it('will dispose when detached, and not control a WebGL context', async () => {
    const game = Test.new();
    const detach = game.attach(canvas());

    await settle();

    const dispose = vi.spyOn(game.controls!, 'dispose');

    detach();
    await settle();

    expect(dispose).toHaveBeenCalled();
    expect(game.controls).toBeUndefined();

    game.attach({ canvas: {}, drawingBufferWidth: 640, drawingBufferHeight: 480 } as unknown as WebGLRenderingContext);
    await settle();

    expect(game.controls).toBeUndefined();
  });

  it('will dispose with the viewport', async () => {
    const game = Test.new();

    game.attach(canvas());
    await settle();

    const dispose = vi.spyOn(game.controls!, 'dispose');

    game.set(null);
    await settle();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('will throw on a model which is not a Viewport', () => {
    class Plain extends Model {
      controls = orbit();
    }

    expect(() => Plain.new()).toThrow(/orbit\(\) applies to a Viewport/);
  });
});

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { PerspectiveCamera } from './camera';
import { Group, Mesh, type Object3D, objectOf, Scene } from './object';
import { Pointer } from './pointer';
import { Viewport } from './viewport';
import { flushMicrotasks } from '../test.setup';

class Box extends Mesh {
  interactive = true;
  geometry = new THREE.BoxGeometry(2, 2, 2);
}

class Stage extends Scene {
  box = new Box();
}

class Test extends Viewport<Viewport.Renderer> {
  scene: Scene = new Stage();
  camera = new PerspectiveCamera({ position: new THREE.Vector3(0, 0, 5) });

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
  return Object.assign(new EventTarget(), {
    getContext() {},
    clientWidth: 800,
    clientHeight: 400,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 400 })
  }) as unknown as HTMLCanvasElement;
}

function attached<T extends Test>(game: T) {
  const element = canvas();
  const send = (type: string, x = 0.5, y = 0.5) =>
    element.dispatchEvent(Object.assign(new Event(type), { clientX: x * 800, clientY: y * 400 }));

  const detach = game.attach(element);

  game.step();

  return { send, detach };
}

describe('Pointer', () => {
  it('will find the interactive node under the pointer, and the point on it', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove');
    game.step();

    expect(game.pointer.hit).toBe(box);
    expect(game.pointer.point!.z).toBeCloseTo(1);
    await expect(game.pointer).toHaveUpdated('hit', 'point');

    game.step();
    await expect(game.pointer).not.toHaveUpdated();

    send('pointermove', 0.05);
    game.step();

    expect(game.pointer.hit).toBeUndefined();
    expect(game.pointer.point).toBeUndefined();
  });

  it('will find a node moving under a still pointer', () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove', 0.9);
    game.step();
    expect(game.pointer.hit).toBeUndefined();

    box.position.x = 3.5;
    game.step();
    expect(game.pointer.hit).toBe(box);
  });

  it('will pass through nodes which are not interactive, and skip hidden ones', () => {
    class Wall extends Mesh {
      geometry = new THREE.BoxGeometry(4, 4, 0.1);
      position = new THREE.Vector3(0, 0, 2);
    }

    class Walled extends Stage {
      wall = new Wall();
    }

    class Game extends Test {
      scene = new Walled();
    }

    const game = Game.new();
    const { send } = attached(game);

    send('pointermove');
    game.step();
    expect(game.pointer.hit).toBe(game.scene.box);

    game.scene.box.visible = false;
    game.step();
    expect(game.pointer.hit).toBeUndefined();
  });

  it('will resolve a hit to the nearest interactive node it draws under', () => {
    class Plain extends Mesh {
      geometry = new THREE.BoxGeometry(2, 2, 2);
    }

    class Crate extends Group {
      interactive = true;
      plain = new Plain();
      box = new Box({ position: new THREE.Vector3(4, 0, 0) });
    }

    class Yard extends Scene {
      crate = new Crate();
    }

    class Game extends Test {
      scene = new Yard();
    }

    const game = Game.new();
    const { send } = attached(game);

    send('pointermove');
    game.step();
    expect(game.pointer.hit).toBe(game.scene.crate);

    send('pointermove', 0.94);
    game.step();
    expect(game.pointer.hit).toBe(game.scene.crate.box);
  });

  it('will dispatch click on the node released over, then each node it draws under', async () => {
    const heard: string[] = [];

    class Holder extends Group {
      inner = new Box();
    }

    class Yard extends Scene {
      holder = new Holder();
    }

    class Game extends Test {
      scene = new Yard();
    }

    const game = Game.new();
    const { send } = attached(game);
    const { holder } = game.scene;
    const bone = new THREE.Object3D();

    objectOf(holder).add(bone);
    bone.add(objectOf(holder.inner));

    for (const node of [game.scene, holder, holder.inner] as Object3D[])
      node.set(Pointer.click, () => void heard.push(String(node.constructor.name)));

    send('pointermove');
    game.step();
    send('pointerdown');
    expect(game.pointer.pressed).toBe(true);

    send('pointerup');
    expect(game.pointer.pressed).toBe(false);
    await flushMicrotasks();

    expect(heard).toEqual(['Box', 'Holder', 'Yard']);
  });

  it('will not click when released over something else', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;
    let clicked = 0;

    box.set(Pointer.click, () => void clicked++);

    send('pointerdown', 0.05);
    send('pointermove');
    game.step();
    send('pointerup');

    send('pointerdown');
    send('pointermove', 0.05);
    game.step();
    send('pointerup');
    await flushMicrotasks();

    expect(clicked).toBe(0);
  });

  it('will clear when the pointer leaves or the canvas detaches', () => {
    const game = Test.new();
    const { send, detach } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove');
    game.step();
    send('pointerdown');
    send('pointerleave');

    expect(game.pointer.hit).toBeUndefined();
    expect(game.pointer.pressed).toBe(false);

    send('pointermove');
    game.step();
    expect(game.pointer.hit).toBe(box);

    detach();
    expect(game.pointer.hit).toBeUndefined();

    send('pointermove');
    expect(game.pointer.hit).toBeUndefined();
  });

  it('will not let its readings be assigned', () => {
    const { pointer } = Test.new();

    // @ts-expect-error
    expect(() => (pointer.pressed = true)).toThrow(/read-only/);
  });
});

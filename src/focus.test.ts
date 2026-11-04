import { describe, expect, it } from 'vitest';
import { Model } from '@expressive/mvc';
import * as THREE from 'three';

import { PerspectiveCamera } from './camera';
import { Group, Mesh, type Object3D, objectOf, Scene } from './object';
import { cast, Focus, pointer, track } from './focus';
import { Viewport } from './viewport';
import { flushMicrotasks } from '../test.setup';

class Box extends Mesh {
  focus = pointer();
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

describe('Focus', () => {
  it('will find the focusable node under the pointer, and the point on it', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove');
    game.step();

    expect(game.focus.hit).toBe(box);
    expect(game.focus.point!.z).toBeCloseTo(1);
    await expect(game.focus).toHaveUpdated('hit', 'point');

    game.step();
    await expect(game.focus).not.toHaveUpdated();

    send('pointermove', 0.05);
    game.step();

    expect(game.focus.hit).toBeUndefined();
    expect(game.focus.point).toBeUndefined();
  });

  it('will find a node moving under a still pointer', () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove', 0.9);
    game.step();
    expect(game.focus.hit).toBeUndefined();

    box.position.x = 3.5;
    game.step();
    expect(game.focus.hit).toBe(box);
  });

  it('will pass through nodes which are not pointer, and skip hidden ones', () => {
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
    expect(game.focus.hit).toBe(game.scene.box);

    game.scene.box.visible = false;
    game.step();
    expect(game.focus.hit).toBeUndefined();
  });

  it('will resolve a hit to the nearest focusable node it draws under', () => {
    class Plain extends Mesh {
      geometry = new THREE.BoxGeometry(2, 2, 2);
    }

    class Crate extends Group {
      focus = pointer();
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
    expect(game.focus.hit).toBe(game.scene.crate);

    send('pointermove', 0.94);
    game.step();
    expect(game.focus.hit).toBe(game.scene.crate.box);
  });

  it('will dispatch select on the node released over, then each node it draws under', async () => {
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
      node.set(Focus.select, () => void heard.push(String(node.constructor.name)));

    send('pointermove');
    game.step();
    send('pointerdown');
    expect(game.focus.pressed).toBe(true);

    send('pointerup');
    expect(game.focus.pressed).toBe(false);
    await flushMicrotasks();

    expect(heard).toEqual(['Box', 'Holder', 'Yard']);
  });

  it('will not select when released over something else', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;
    let selected = 0;

    box.set(Focus.select, () => void selected++);

    send('pointerdown', 0.05);
    send('pointerup');
    send('pointerdown');
    send('pointerup', 0.05);
    await flushMicrotasks();

    expect(selected).toBe(0);
  });

  it('will select on a tap without aiming first', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;
    let selected = 0;

    box.set(Focus.select, () => void selected++);

    send('pointerdown');
    send('pointerup');
    await flushMicrotasks();

    expect(selected).toBe(1);
  });

  it('will clear when the pointer leaves or the canvas detaches', () => {
    const game = Test.new();
    const { send, detach } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove');
    game.step();
    send('pointerdown');
    send('pointerleave');

    expect(game.focus.hit).toBeUndefined();
    expect(game.focus.pressed).toBe(false);

    send('pointermove');
    game.step();
    expect(game.focus.hit).toBe(box);

    detach();
    expect(game.focus.hit).toBeUndefined();

    send('pointermove');
    expect(game.focus.hit).toBeUndefined();
  });

  it('will not let its readings be assigned', () => {
    const { focus: source } = Test.new();

    // @ts-expect-error
    expect(() => (source.pressed = true)).toThrow(/read-only/);
  });
});

describe('pointer', () => {
  it('will read true while a source aims at the node, and dispatch when it flips', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    expect(box.focus).toBe(false);

    send('pointermove');
    game.step();

    expect(box.focus).toBe(true);
    await expect(box).toHaveUpdated('focus');

    game.step();
    await expect(box).not.toHaveUpdated();

    send('pointerleave');

    expect(box.focus).toBe(false);
    await expect(box).toHaveUpdated('focus');
  });

  it('will stay focused while another source aims at the node', () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;
    const other = Focus.new();
    const element = canvas();

    track(other, element, () => cast(other, objectOf(game.scene), objectOf(game.camera) as THREE.Camera));

    send('pointermove');
    game.step();
    element.dispatchEvent(Object.assign(new Event('pointerdown'), { clientX: 400, clientY: 200 }));
    send('pointerleave');

    expect(other.hit).toBe(box);
    expect(box.focus).toBe(true);

    element.dispatchEvent(new Event('pointerleave'));

    expect(box.focus).toBe(false);
  });

  it('will let go of a node destroyed while focused', () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove');
    game.step();
    box.set(null);
    game.step();

    expect(game.focus.hit).toBeUndefined();
  });

  it('will update every focus field on a node', async () => {
    class Twin extends Box {
      also = pointer();
    }

    class Pair extends Scene {
      twin = new Twin();
    }

    class Game extends Test {
      scene = new Pair();
    }

    const game = Game.new();
    const { send } = attached(game);

    send('pointermove');
    game.step();

    expect(game.scene.twin.also).toBe(true);
    await expect(game.scene.twin).toHaveUpdated('focus', 'also');
  });

  it('will throw on a model which is not a node', () => {
    class Plain extends Model {
      focus = pointer();
    }

    expect(() => Plain.new()).toThrow(/pointer\(\) applies to scene nodes/);
  });
});

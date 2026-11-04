import { describe, expect, it, vi } from 'vitest';
import { Model } from '@expressive/mvc';
import * as THREE from 'three';

import { PerspectiveCamera } from './camera';
import { Group, Mesh, objectOf, Scene } from './object';
import { cast, Pointer, pointer, track } from './pointer';
import { Viewport } from './viewport';

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

  step(ms = 16) {
    this._steps.shift()!((this._time += ms));
  }

  wait(seconds: number) {
    for (let left = seconds; left > 0; left -= 0.1) this.step(100);
  }
}

function canvas() {
  return Object.assign(new EventTarget(), {
    getContext() {},
    clientWidth: 800,
    clientHeight: 400,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 400 }),
    setPointerCapture() {}
  }) as unknown as HTMLCanvasElement;
}

function sender(element: HTMLCanvasElement) {
  return (type: string, x = 0.5, y = 0.5) =>
    element.dispatchEvent(Object.assign(new Event(type), { clientX: x * 800, clientY: y * 400, pointerId: 1 }));
}

function attached<T extends Test>(game: T) {
  const element = canvas();
  const detach = game.attach(element);

  game.step();

  return { send: sender(element), detach };
}

function handled(handlers: Pointer.Handlers) {
  class Handled extends Mesh {
    focus = pointer(handlers);
    geometry = new THREE.BoxGeometry(2, 2, 2);
  }

  class Yard extends Scene {
    box = new Handled();
  }

  class Game extends Test {
    scene = new Yard();
  }

  const game = Game.new();

  return { game, ...attached(game) };
}

describe('Pointer', () => {
  it('will find the target under the pointer, and the point on it', async () => {
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

  it('will pass through nodes which are not targets, and skip hidden ones', () => {
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

  it('will resolve a hit to the nearest target it draws under', () => {
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
    expect(game.pointer.hit).toBe(game.scene.crate);

    send('pointermove', 0.94);
    game.step();
    expect(game.pointer.hit).toBe(game.scene.crate.box);
  });

  it('will press while a button is down', async () => {
    const game = Test.new();
    const { send } = attached(game);

    send('pointerdown', 0.05);
    expect(game.pointer.pressed).toBe(true);
    await expect(game.pointer).toHaveUpdated('pressed');

    send('pointerup', 0.05);
    expect(game.pointer.pressed).toBe(false);
  });

  it('will clear when the pointer leaves, is cancelled or the canvas detaches', () => {
    const game = Test.new();
    const { send, detach } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove');
    game.step();
    send('pointerdown');
    send('pointerleave');

    expect(game.pointer.hit).toBeUndefined();
    expect(game.pointer.pressed).toBe(false);

    send('pointerdown');
    send('pointercancel');
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
    const { pointer: source } = Test.new();

    // @ts-expect-error
    expect(() => (source.pressed = true)).toThrow(/read-only/);
  });
});

describe('pointer', () => {
  it('will read what aims at a node, dispatching as it comes and goes', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    expect(box.focus).toBeUndefined();

    send('pointermove');
    game.step();

    expect(box.focus!.sources).toEqual([game.pointer]);
    expect(box.focus!.point.z).toBeCloseTo(1);
    await expect(box).toHaveUpdated('focus');

    const { point } = box.focus!;

    send('pointermove', 0.55);
    game.step();

    expect(box.focus!.point).toBe(point);
    expect(point.x).toBeGreaterThan(0);
    await expect(box).not.toHaveUpdated();

    send('pointerleave');

    expect(box.focus).toBeUndefined();
    await expect(box).toHaveUpdated('focus');
  });

  it('will list every source aiming at a node', () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;
    const other = Pointer.new();
    const element = canvas();

    track(other, element, () => cast(other, objectOf(game.scene), objectOf(game.camera) as THREE.Camera));

    send('pointermove');
    game.step();
    sender(element)('pointerdown');

    expect(box.focus!.sources).toEqual([game.pointer, other]);

    send('pointerleave');
    expect(box.focus!.sources).toEqual([other]);

    sender(element)('pointerleave');
    expect(box.focus).toBeUndefined();
  });

  it('will keep one object while aimed at, updating its sources', async () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;
    const other = Pointer.new();
    const element = canvas();

    track(other, element, () => cast(other, objectOf(game.scene), objectOf(game.camera) as THREE.Camera));

    send('pointermove');
    game.step();

    const focus = box.focus!;

    await expect(box).toHaveUpdated('focus');
    sender(element)('pointerdown');

    expect(box.focus).toBe(focus);
    expect(focus.sources).toEqual([game.pointer, other]);
    await expect(box).toHaveUpdated('focus');
  });

  it('will let go of a node destroyed while focused', () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;

    send('pointermove');
    game.step();
    box.set(null);
    game.step();

    expect(game.pointer.hit).toBeUndefined();
  });

  it("will update every pointer field on a node, and call each one's handlers", async () => {
    const calls: string[] = [];

    class Twin extends Box {
      also = pointer({
        hold: () => void calls.push('hold'),
        drag: () => void calls.push('drag')
      });
      more = pointer(() => void calls.push('select'));
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

    expect(game.scene.twin.also).toBe(game.scene.twin.focus);
    await expect(game.scene.twin).toHaveUpdated('focus', 'also', 'more');

    send('pointerdown');
    send('pointerup');
    send('pointerdown');
    game.wait(0.6);
    send('pointerup');
    send('pointerdown');
    send('pointermove', 0.6);
    game.step();
    send('pointerup', 0.6);

    expect(calls).toEqual(['select', 'hold', 'drag']);
  });

  it('will throw on a model which is not a node', () => {
    class Plain extends Model {
      focus = pointer();
    }

    expect(() => Plain.new()).toThrow(/pointer\(\) applies to scene nodes/);
  });
});

describe('gestures', () => {
  it('will select on press and release over the node', () => {
    const select = vi.fn();
    const { game, send } = handled({ select });

    send('pointermove');
    game.step();
    send('pointerdown');
    send('pointerup');

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('will select with a function alone, on a tap without aiming first', () => {
    const select = vi.fn();

    class Tapped extends Mesh {
      focus = pointer(select);
      geometry = new THREE.BoxGeometry(2, 2, 2);
    }

    class Yard extends Scene {
      box = new Tapped();
    }

    class Game extends Test {
      scene = new Yard();
    }

    const { send } = attached(Game.new());

    send('pointerdown');
    send('pointerup');

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('will not select when pressed or released elsewhere', () => {
    const select = vi.fn();
    const { send } = handled({ select });

    send('pointerdown', 0.05);
    send('pointerup');
    send('pointerdown');
    send('pointerup', 0.05);

    expect(select).not.toHaveBeenCalled();
  });

  it('will hold a still press, ending on release instead of selecting', () => {
    const end = vi.fn();
    const hold = vi.fn(() => end);
    const select = vi.fn();
    const { game, send } = handled({ select, hold });

    send('pointerdown');
    game.wait(0.3);
    expect(hold).not.toHaveBeenCalled();

    game.wait(0.3);
    game.step();
    expect(hold).toHaveBeenCalledTimes(1);
    expect(end).not.toHaveBeenCalled();

    send('pointerup');
    expect(end).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
  });

  it('will select after a long press on a node without hold', () => {
    const select = vi.fn();
    const { game, send } = handled({ select });

    send('pointerdown');
    game.wait(1);
    send('pointerup');

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('will not hold a press which moved, and still select it', () => {
    const hold = vi.fn();
    const select = vi.fn();
    const { game, send } = handled({ select, hold });

    send('pointerdown');
    send('pointermove', 0.52);
    game.wait(1);
    send('pointerup', 0.52);

    expect(hold).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('will drag a moving press on a plane through the grab point, ending on drop', () => {
    const end = vi.fn();
    const select = vi.fn();
    let move!: Pointer.Move;

    const { game, send } = handled({
      select,
      drag: (next) => {
        move = next;
        return end;
      }
    });

    send('pointerdown');
    send('pointermove', 0.55);
    game.step();

    expect(move.delta.x).toBeGreaterThan(0);
    expect(move.delta.z).toBeCloseTo(0);
    expect(move.point.z).toBeCloseTo(1);

    const { x } = move.delta;

    send('pointermove', 0.6);
    game.step();
    expect(move.delta.x).toBeGreaterThan(x);

    send('pointerup', 0.6);
    expect(end).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
  });

  it('will drag a flick which moved and released within one frame', () => {
    const end = vi.fn();
    const drag = vi.fn(() => end);
    const { send } = handled({ drag });

    send('pointerdown');
    send('pointerup', 0.6);

    expect(drag).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('will end a gesture when the pointer leaves, or a new press begins', () => {
    const end = vi.fn();
    const { game, send } = handled({ hold: () => end, drag: () => end });

    send('pointerdown');
    send('pointermove', 0.6);
    game.step();
    send('pointerleave');
    expect(end).toHaveBeenCalledTimes(1);

    send('pointerdown');
    game.wait(0.6);
    game.step();
    send('pointerdown');
    expect(end).toHaveBeenCalledTimes(2);
  });

  it('will take listeners added while aimed at, dropping them when aim leaves', () => {
    const game = Test.new();
    const { send } = attached(game);
    const { box } = game.scene as Stage;
    const select = vi.fn();
    const hold = vi.fn();
    const end = vi.fn();
    const drag = vi.fn(() => end);

    send('pointermove');
    game.step();

    const focus = box.focus!;
    const stop = focus.select(select);

    focus.hold(hold);
    focus.drag(drag);

    send('pointerdown');
    send('pointerup');
    expect(select).toHaveBeenCalledTimes(1);

    send('pointerdown');
    game.wait(0.6);
    send('pointerup');
    expect(hold).toHaveBeenCalledTimes(1);

    send('pointerdown');
    send('pointermove', 0.6);
    game.step();
    send('pointerup', 0.6);
    expect(drag).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);

    stop();
    send('pointermove');
    game.step();
    send('pointerdown');
    send('pointerup');
    expect(select).toHaveBeenCalledTimes(1);

    send('pointerleave');
    send('pointermove');
    game.step();
    send('pointerdown');
    game.wait(0.6);
    send('pointerup');

    expect(box.focus).not.toBe(focus);
    expect(hold).toHaveBeenCalledTimes(1);
  });
});

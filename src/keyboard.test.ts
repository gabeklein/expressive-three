import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Model } from '@expressive/mvc';

import { Frame } from './frame';
import { keyboard } from './keyboard';

let window: EventTarget;
const made: Model[] = [];

beforeEach(() => {
  window = new EventTarget();
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window));
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window));
});

afterEach(() => {
  for (const model of made.splice(0)) if (!model.get(null)) model.set(null);
  vi.unstubAllGlobals();
});

function send(type: 'keydown' | 'keyup', code: string, target: object | null = null) {
  const event = Object.assign(new Event(type), { code });

  Object.defineProperty(event, 'target', { value: target });
  window.dispatchEvent(event);
}

function press(code: string) {
  send('keydown', code);
  send('keyup', code);
}

function game<T extends Model>(Type: Model.Type<T>) {
  class Game extends Model {
    frame = new Frame();
    player = new Type();
  }

  return made[made.push(Game.new()) - 1] as Game;
}

describe('field', () => {
  class Ship extends Model {
    thrust = keyboard('W');
    turn = keyboard(['A', 'ArrowLeft']);
  }

  it('will read a press while held and undefined after', async () => {
    const { player } = game(Ship);

    expect(player.thrust).toBeUndefined();

    send('keydown', 'KeyW');
    await expect(player).toHaveUpdated('thrust');
    expect(player.thrust).toBeDefined();

    send('keyup', 'KeyW');
    await expect(player).toHaveUpdated('thrust');
    expect(player.thrust).toBeUndefined();
  });

  it('will not dispatch for another binding or a repeat', async () => {
    const { player } = game(Ship);

    send('keydown', 'KeyW');
    await expect(player).toHaveUpdated('thrust');

    const held = player.thrust;

    send('keydown', 'KeyW');
    send('keydown', 'KeyS');
    await expect(player).not.toHaveUpdated();
    expect(player.thrust).toBe(held);
  });

  it('will stay pressed while any alternate is held', async () => {
    const { player } = game(Ship);

    send('keydown', 'KeyA');
    send('keydown', 'ArrowLeft');
    send('keyup', 'KeyA');
    await expect(player).toHaveUpdated('turn');
    expect(player.turn).toBeDefined();

    send('keyup', 'ArrowLeft');
    await expect(player).toHaveUpdated('turn');
    expect(player.turn).toBeUndefined();
  });

  it('will map short names to codes', async () => {
    class Keys extends Model {
      digit = keyboard('1');
      shift = keyboard('Shift');
      right = keyboard('ShiftRight');
    }

    const { player } = game(Keys);

    send('keydown', 'Digit1');
    send('keydown', 'ShiftRight');
    await expect(player).toHaveUpdated('digit', 'shift', 'right');

    send('keyup', 'ShiftRight');
    send('keydown', 'ShiftLeft');
    await expect(player).toHaveUpdated('right');
    expect(player.shift).toBeDefined();
    expect(player.right).toBeUndefined();
  });

  it('will ignore keys typed into editable targets', async () => {
    const { player } = game(Ship);

    for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { isContentEditable: true }])
      send('keydown', 'KeyW', target);

    await expect(player).not.toHaveUpdated();

    send('keydown', 'KeyW', { tagName: 'DIV' });
    await expect(player).toHaveUpdated('thrust');
  });

  it('will release every key on blur', async () => {
    const { player } = game(Ship);

    send('keydown', 'KeyW');
    send('keydown', 'KeyA');
    await expect(player).toHaveUpdated('thrust', 'turn');

    window.dispatchEvent(new Event('blur'));
    await expect(player).toHaveUpdated('thrust', 'turn');
    expect(player.thrust).toBeUndefined();
  });

  it('will be read-only', () => {
    const { player } = game(Ship);

    expect(() => ((player as any).thrust = {})).toThrow();
  });

  it('will type its field and keys', () => {
    expectTypeOf(game(Ship).player.thrust).toEqualTypeOf<keyboard.Press | undefined>();

    // @ts-expect-error - letters are uppercase
    void (() => keyboard('w'));
  });
});

describe('gestures', () => {
  it('will tap on release', () => {
    const tap = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space', tap);
    }

    game(Jumper);
    press('Space');

    expect(tap).toHaveBeenCalledTimes(1);
  });

  it('will hold past half a second on the frame clock, then end on release', () => {
    const end = vi.fn();
    const hold = vi.fn(() => end);
    const tap = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space', { tap, hold });
    }

    const { frame } = game(Jumper);

    send('keydown', 'Space');
    frame.tick(0.3);
    expect(hold).not.toHaveBeenCalled();

    frame.tick(0.3);
    frame.tick(0.3);
    expect(hold).toHaveBeenCalledTimes(1);

    send('keyup', 'Space');
    expect(end).toHaveBeenCalledTimes(1);
    expect(tap).not.toHaveBeenCalled();
  });

  it('will tap a short press when it can hold', () => {
    const hold = vi.fn();
    const tap = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space', { tap, hold });
    }

    const { frame } = game(Jumper);

    send('keydown', 'Space');
    frame.tick(0.2);
    send('keyup', 'Space');

    expect(tap).toHaveBeenCalledTimes(1);
    expect(hold).not.toHaveBeenCalled();
  });

  it('will tap a long press with no hold handler', () => {
    const tap = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space', { tap });
    }

    const { frame } = game(Jumper);

    send('keydown', 'Space');
    frame.tick(1);
    send('keyup', 'Space');

    expect(tap).toHaveBeenCalledTimes(1);
  });

  it('will not tap when released by blur', () => {
    const tap = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space', tap);
    }

    game(Jumper);
    send('keydown', 'Space');
    window.dispatchEvent(new Event('blur'));

    expect(tap).not.toHaveBeenCalled();
  });

  it('will add listeners for one press', () => {
    const tap = vi.fn();
    const hold = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space');
    }

    const { frame, player } = game(Jumper);

    send('keydown', 'Space');
    player.jump!.tap(tap);
    const stop = player.jump!.hold(hold);
    send('keyup', 'Space');

    expect(tap).toHaveBeenCalledTimes(1);

    send('keydown', 'Space');
    frame.tick(1);
    send('keyup', 'Space');

    expect(tap).toHaveBeenCalledTimes(1);
    expect(hold).not.toHaveBeenCalled();
    stop();
  });

  it('will stop a listener', () => {
    const tap = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space');
    }

    const { player } = game(Jumper);

    send('keydown', 'Space');
    player.jump!.tap(tap)();
    send('keyup', 'Space');

    expect(tap).not.toHaveBeenCalled();
  });

  it('will not hold without a frame', () => {
    const hold = vi.fn();
    const tap = vi.fn();

    class Jumper extends Model {
      jump = keyboard('Space', { hold, tap });
    }

    made.push(Jumper.new());
    press('Space');

    expect(hold).not.toHaveBeenCalled();
    expect(tap).toHaveBeenCalledTimes(1);
  });
});

describe('lifecycle', () => {
  class Jumper extends Model {
    jump = keyboard('Space');
  }

  it('will end a hold when destroyed', () => {
    const end = vi.fn();

    class Charger extends Model {
      jump = keyboard('Space', { hold: () => end });
    }

    const world = game(Charger);

    send('keydown', 'Space');
    world.frame.tick(1);
    world.set(null);

    expect(end).toHaveBeenCalledTimes(1);
  });

  it('will stop listening once the last binding is gone', async () => {
    const add = vi.spyOn(globalThis as any, 'addEventListener');
    const remove = vi.spyOn(globalThis as any, 'removeEventListener');

    const a = game(Jumper);
    const b = game(Jumper);

    expect(add).toHaveBeenCalledTimes(3);

    a.set(null);
    expect(remove).not.toHaveBeenCalled();

    b.set(null);
    expect(remove).toHaveBeenCalledTimes(3);
  });

  it('will forget held keys once the last binding is gone', async () => {
    const a = game(Jumper);

    send('keydown', 'Space');
    a.set(null);

    const b = game(Jumper);

    send('keyup', 'KeyW');
    await expect(b.player).not.toHaveUpdated();
    expect(b.player.jump).toBeUndefined();
  });

  it('will not listen without a window', () => {
    vi.unstubAllGlobals();

    const world = game(Jumper);

    expect(world.player.jump).toBeUndefined();
    world.set(null);
  });
});

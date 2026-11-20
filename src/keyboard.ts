import { def, Model } from '@expressive/mvc';

import { Frame, nearest } from './frame';

type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type Modifier = 'Shift' | 'Control' | 'Alt' | 'Meta';

declare namespace keyboard {
  /**
   * A physical key, named for where it sits on a US layout: `'A'`-`'Z'`, `'0'`-`'9'` along the top row,
   * `'Shift'`, `'Control'`, `'Alt'` or `'Meta'` on either side, else a `KeyboardEvent.code`.
   */
  type Key =
    | Letter
    | Digit
    | Modifier
    | `${Modifier}${'Left' | 'Right'}`
    | `Arrow${'Up' | 'Down' | 'Left' | 'Right'}`
    | `F${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`
    | `Numpad${Digit | 'Add' | 'Subtract' | 'Multiply' | 'Divide' | 'Decimal' | 'Enter'}`
    | 'Space' | 'Enter' | 'Escape' | 'Tab' | 'Backspace' | 'Delete' | 'Insert' | 'CapsLock' | 'ContextMenu'
    | 'Home' | 'End' | 'PageUp' | 'PageDown'
    | 'Minus' | 'Equal' | 'BracketLeft' | 'BracketRight' | 'Backslash' | 'Semicolon' | 'Quote'
    | 'Backquote' | 'Comma' | 'Period' | 'Slash';

  /** Runs when a hold ends - every key of the binding released. */
  type End = (() => void) | void;

  interface Handlers {
    /** Pressed and released before a hold. */
    tap?(): void;

    /** Still pressed past the hold time. */
    hold?(): End;
  }

  /** One stretch of a binding held - from its first key down to its last key up. Listeners added here end with it. */
  interface Press {
    /** Handle tap during this press. Returns a function to stop. */
    tap(handler: () => void): () => void;

    /** Handle hold during this press. Returns a function to stop. */
    hold(handler: () => End): () => void;
  }
}

interface Binding {
  self: Model;
  key: string;
  codes: string[];
  handlers: keyboard.Handlers[];
  listeners: Set<keyboard.Handlers>;
  press?: keyboard.Press;
  held: number;
  end?: keyboard.End;
  stop?: () => void;
}

const HOLD = 0.5;
const HELD = new Set<string>();
const BINDINGS = new Set<Binding>();

const EVENTS = [
  ['keydown', down],
  ['keyup', up],
  ['blur', blur]
] as [string, EventListener][];

/**
 * Bind keys - the field reads a press while any of `keys` is held, else `undefined`. A function handles
 * tap; an object, tap and hold.
 */
function keyboard(keys: keyboard.Key | keyboard.Key[], handlers?: (() => void) | keyboard.Handlers) {
  return def<keyboard.Press | undefined>((key, self) => {
    const binding: Binding = {
      self,
      key,
      codes: ([] as string[]).concat(keys).flatMap(code),
      handlers: handlers ? [typeof handlers == 'function' ? { tap: handlers } : handlers] : [],
      listeners: new Set(),
      held: 0
    };

    if (!BINDINGS.size && typeof addEventListener == 'function')
      for (const [type, listener] of EVENTS) addEventListener(type, listener);

    BINDINGS.add(binding);

    return {
      get: () => binding.press,
      set: false,
      destroy() {
        BINDINGS.delete(binding);
        finish(binding, false);

        if (!BINDINGS.size) {
          HELD.clear();

          if (typeof removeEventListener == 'function')
            for (const [type, listener] of EVENTS) removeEventListener(type, listener);
        }
      }
    };
  });
}

function code(key: string) {
  if (/^[A-Z]$/.test(key)) return [`Key${key}`];
  if (/^[0-9]$/.test(key)) return [`Digit${key}`];
  if (/^(Shift|Control|Alt|Meta)$/.test(key)) return [`${key}Left`, `${key}Right`];

  return [key];
}

function down(event: Event) {
  const { code, target } = event as KeyboardEvent;

  if (editable(target)) return;

  for (const binding of BINDINGS) if (binding.codes.includes(code)) event.preventDefault();

  HELD.add(code);
  update(true);
}

function up(event: Event) {
  HELD.delete((event as KeyboardEvent).code);
  update(true);
}

function blur() {
  HELD.clear();
  update(false);
}

function editable(target: EventTarget | null) {
  const { tagName, isContentEditable } = (target || {}) as HTMLElement;

  return isContentEditable || tagName == 'INPUT' || tagName == 'TEXTAREA' || tagName == 'SELECT';
}

function update(tap: boolean) {
  for (const binding of BINDINGS) sync(binding, tap);
}

function sync(binding: Binding, tap: boolean) {
  const held = binding.codes.some((code) => HELD.has(code));

  if (held && !binding.press) begin(binding);
  else if (!held && binding.press) {
    finish(binding, tap);
    binding.self.set(binding.key);
  }
}

function begin(binding: Binding) {
  const { listeners } = binding;
  const listen = (gesture: keyof keyboard.Handlers) => (handler: never) => {
    const entry = { [gesture]: handler };

    listeners.add(entry);

    return () => void listeners.delete(entry);
  };

  binding.press = Object.freeze({ tap: listen('tap'), hold: listen('hold') });
  binding.held = 0;
  binding.stop = nearest(binding.self, Frame)?.each((delta) => advance(binding, delta));
  binding.self.set(binding.key);
}

function advance(binding: Binding, delta: number) {
  if (binding.end || !all(binding).some((each) => each.hold) || (binding.held += delta) < HOLD) return;

  const ends = all(binding).map((each) => each.hold?.());

  binding.end = () => ends.forEach((end) => end?.());
}

function finish(binding: Binding, tap: boolean) {
  const { press, end, stop } = binding;
  const handlers = all(binding);

  if (!press) return;

  stop?.();
  binding.stop = binding.end = binding.press = undefined;
  binding.listeners.clear();

  if (end) end();
  else if (tap) for (const each of handlers) each.tap?.();
}

function all(binding: Binding) {
  return [...binding.handlers, ...binding.listeners];
}

export { keyboard };

import { def, Model } from '@expressive/mvc';
import * as THREE from 'three';

import { nodeOf, Object3D } from './object';

declare namespace Pointer {
  /** Where a drag has reached, on a plane facing the camera through the grab point - updated in place each frame. */
  interface Move {
    readonly point: THREE.Vector3;
    readonly delta: THREE.Vector3;
  }

  /** Runs when the gesture ends - a hold released, a drag dropped. */
  type End = (() => void) | void;

  interface Handlers {
    /** Pressed and released on the node - before a hold, without a drag. */
    select?(): void;

    /** Pressed still on the node past the hold time. */
    hold?(): End;

    /** Pressed on the node and moved past the drag distance. */
    drag?(move: Move): End;
  }

  /**
   * A node's view of what aims at it - one object while aimed at, updated in place. `point` is live and
   * moves without dispatch. Gesture listeners added here are dropped when aim leaves.
   */
  interface Focus {
    readonly point: THREE.Vector3;
    readonly sources: readonly Pointer[];

    /** Handle select while aimed at. Returns a function to stop. */
    select(handler: () => void): () => void;

    /** Handle hold while aimed at. Returns a function to stop. */
    hold(handler: () => End): () => void;

    /** Handle drag while aimed at. Returns a function to stop. */
    drag(handler: (move: Move) => End): () => void;
  }
}

interface Target {
  keys: string[];
  handlers: Pointer.Handlers[];
  listeners: Set<Pointer.Handlers>;
  sources: Pointer[];
  point: THREE.Vector3;
  focus?: Pointer.Focus;
}

interface Press {
  node: Object3D;
  from: [number, number];
  moved: boolean;
  held: number;
  grab?: THREE.Vector3;
  gesture?: 'hold' | 'drag';
  move?: { point: THREE.Vector3; delta: THREE.Vector3 };
  plane?: THREE.Plane;
  end?: Pointer.End;
}

interface Aim {
  at?: THREE.Vector2;
  hit?: Object3D;
  point?: THREE.Vector3;
  pressed: boolean;
  press?: Press;
}

const HOLD = 0.5;
const DRAG = 4;

const AIM = new WeakMap<Pointer, Aim>();
const TARGET = new WeakMap<Object3D, Target>();
const RAY = new THREE.Raycaster();

/**
 * One source of aim - mouse, touch or pen over a viewport's canvas; read it with `get(Pointer)`.
 * `hit` is the nearest node with a `pointer()` field along its ray, checked every frame, so a node
 * moving under a still pointer is found.
 */
class Pointer extends Model {
  /** Nearest pointer target along the ray. */
  declare readonly hit: Object3D | undefined;

  /** Where the ray meets `hit`, in world space. */
  declare readonly point: THREE.Vector3 | undefined;

  /** Whether this source is pressing - a button held, a touch down. */
  declare readonly pressed: boolean;
}

Pointer.on({
  setup(self) {
    const aim: Aim = { pressed: false };

    AIM.set(self, aim);

    for (const key of ['hit', 'point', 'pressed'] as const)
      (self as Model).set(key, { get: () => aim[key], set: false });
  }
});

/**
 * Make a node a pointer target - its field reads `{ point, sources }` while any `Pointer` aims at it
 * or something drawn under it, else `undefined`. A function handles select; an object, any gesture.
 */
function pointer(handlers?: (() => void) | Pointer.Handlers) {
  return def<Pointer.Focus>((key, self) => {
    if (!(self instanceof Object3D)) throw new Error(`${self}.${key} - pointer() applies to scene nodes.`);

    let target = TARGET.get(self);

    if (!target)
      TARGET.set(self, (target = { keys: [], handlers: [], listeners: new Set(), sources: [], point: new THREE.Vector3() }));

    target.keys.push(key);

    if (handlers) target.handlers.push(typeof handlers == 'function' ? { select: handlers } : handlers);

    return {
      get: () => target.focus as Pointer.Focus,
      set: false,
      destroy: () => void (target.sources.length = 0)
    };
  }) as Pointer.Focus | undefined;
}

/** Follow pointer events on `canvas` - mouse, touch and pen alike. `cast` aims now. Returns a function to stop. */
function track(source: Pointer, canvas: HTMLCanvasElement, cast: () => void) {
  const aim = AIM.get(source)!;

  const move = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const { press } = aim;

    aim.at = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    if (press && Math.hypot(event.clientX - press.from[0], event.clientY - press.from[1]) > DRAG) press.moved = true;
  };

  const press = (pressed: boolean) => {
    if (aim.pressed != pressed) {
      aim.pressed = pressed;
      source.set('pressed');
    }
  };

  const down = (event: PointerEvent) => {
    canvas.setPointerCapture(event.pointerId);
    release(aim, false);
    move(event);
    cast();

    if (aim.hit)
      aim.press = { node: aim.hit, from: [event.clientX, event.clientY], moved: false, held: 0, grab: aim.point!.clone() };

    press(true);
  };

  const up = (event: PointerEvent) => {
    const { press: pressing } = aim;

    move(event);
    cast();
    release(aim, pressing && !pressing.gesture && pressing.node === aim.hit);
    press(false);
  };

  const leave = () => {
    aim.at = undefined;
    release(aim, false);
    press(false);
    hit(source, undefined, undefined);
  };

  const events = [
    ['pointermove', move],
    ['pointerdown', down],
    ['pointerup', up],
    ['pointercancel', leave],
    ['pointerleave', leave]
  ] as [string, EventListener][];

  for (const [type, listener] of events) canvas.addEventListener(type, listener);

  return () => {
    for (const [type, listener] of events) canvas.removeEventListener(type, listener);
    leave();
  };
}

/** Aim `source` into `scene` as drawn through `camera`, `delta` seconds since the last frame. */
function cast(source: Pointer, scene: THREE.Object3D, camera: THREE.Camera, delta = 0) {
  const aim = AIM.get(source)!;

  if (!aim.at) return;

  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  RAY.setFromCamera(aim.at, camera);

  const owner = new Map<THREE.Object3D, Object3D>();

  collect(scene, undefined, owner);

  const [first] = RAY.intersectObjects([...owner.keys()], false);

  hit(source, first && owner.get(first.object), first?.point);

  if (aim.press) gesture(aim.press, camera, delta);
}

function gesture(press: Press, camera: THREE.Camera, delta: number) {
  if (press.gesture == 'drag') {
    RAY.ray.intersectPlane(press.plane!, press.move!.point);
    press.move!.delta.subVectors(press.move!.point, press.grab!);
    return;
  }

  if (press.gesture) return;

  if (press.moved && can(press.node, 'drag')) {
    const move = { point: press.grab!.clone(), delta: new THREE.Vector3() };

    press.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), press.grab!);
    press.move = move;
    press.gesture = 'drag';
    press.end = start(press.node, (handlers) => handlers.drag?.(move));
    gesture(press, camera, 0);
  } else if (!press.moved && can(press.node, 'hold') && (press.held += delta) >= HOLD) {
    press.gesture = 'hold';
    press.end = start(press.node, (handlers) => handlers.hold?.());
  }
}

function handlers(node: Object3D) {
  const { handlers, listeners } = TARGET.get(node)!;

  return [...handlers, ...listeners];
}

function can(node: Object3D, gesture: keyof Pointer.Handlers) {
  return handlers(node).some((handlers) => handlers[gesture]);
}

function start(node: Object3D, call: (handlers: Pointer.Handlers) => Pointer.End): Pointer.End {
  const ends = handlers(node).map(call);

  return () => ends.forEach((end) => end?.());
}

function release(aim: Aim, select: boolean | undefined) {
  const { press } = aim;

  aim.press = undefined;

  if (!press) return;

  if (press.end) press.end();
  else if (select) for (const each of handlers(press.node)) each.select?.();
}

function collect(object: THREE.Object3D, inside: Object3D | undefined, owner: Map<THREE.Object3D, Object3D>) {
  if (!object.visible) return;

  const node = nodeOf(object);

  if (node && TARGET.has(node)) inside = node;
  if (inside) owner.set(object, inside);

  for (const child of object.children) collect(child, inside, owner);
}

function hit(source: Pointer, node: Object3D | undefined, point: THREE.Vector3 | undefined) {
  const aim = AIM.get(source)!;
  const last = aim.hit;

  if (node !== last) {
    aim.hit = node;
    source.set('hit');

    const left = last && TARGET.get(last)!;
    const at = left ? left.sources.indexOf(source) : -1;

    if (at >= 0) {
      left!.sources.splice(at, 1);
      focus(last!, left!);
    }

    if (node) {
      const target = TARGET.get(node)!;

      target.sources.push(source);
      focus(node, target);
    }
  }

  if (node) TARGET.get(node)!.point.copy(point!);

  if (point ? !aim.point?.equals(point) : aim.point) {
    aim.point = point && point.clone();
    source.set('point');
  }
}

function focus(node: Object3D, target: Target) {
  if (!target.sources.length) {
    target.focus = undefined;
    target.listeners.clear();
  } else if (!target.focus) {
    const { listeners } = target;
    const listen = (gesture: keyof Pointer.Handlers) => (handler: never) => {
      const entry = { [gesture]: handler };

      listeners.add(entry);

      return () => void listeners.delete(entry);
    };

    target.focus = Object.freeze({
      point: target.point,
      sources: target.sources,
      select: listen('select'),
      hold: listen('hold'),
      drag: listen('drag')
    });
  }

  for (const key of target.keys) node.set(key);
}

export { cast, Pointer, pointer, track };

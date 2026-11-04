import { def, Model } from '@expressive/mvc';
import * as THREE from 'three';

import { nodeOf, Object3D, objectOf } from './object';

interface Aim {
  at?: THREE.Vector2;
  down?: Object3D;
  hit?: Object3D;
  point?: THREE.Vector3;
  pressed: boolean;
}

const AIM = new WeakMap<Focus, Aim>();
const KEYS = new WeakMap<Object3D, string[]>();
const SOURCES = new WeakMap<Object3D, Set<Focus>>();
const RAY = new THREE.Raycaster();

/**
 * One source of aim over a viewport - read it with `get(Focus)`. `hit` is the nearest node with a
 * `focusable()` field along its ray, checked every frame, so a node moving under a still pointer is found.
 */
class Focus extends Model {
  /** Dispatched on a node pressed and released under focus, then on each node it draws under. */
  static readonly select: unique symbol = Symbol('select');

  /** Nearest focusable node along the ray. */
  declare readonly hit: Object3D | undefined;

  /** Where the ray meets `hit`, in world space. */
  declare readonly point: THREE.Vector3 | undefined;

  /** Whether this source is pressing - a button held, a touch down. */
  declare readonly pressed: boolean;
}

Focus.on({
  setup(self) {
    const aim: Aim = { pressed: false };

    AIM.set(self, aim);

    for (const key of ['hit', 'point', 'pressed'] as const)
      (self as Model).set(key, { get: () => aim[key], set: false });
  }
});

/** Make a node focusable - its `focus` field reads true while any `Focus` aims at it or something drawn under it. */
function focusable() {
  return def<boolean>((key, self) => {
    if (!(self instanceof Object3D)) throw new Error(`${self}.${key} - focusable() applies to scene nodes.`);

    const keys = KEYS.get(self);

    if (keys) keys.push(key);
    else KEYS.set(self, [key]);

    return {
      get: () => !!SOURCES.get(self)?.size,
      set: false,
      destroy: () => SOURCES.delete(self)
    };
  });
}

/** Follow pointer events on `canvas` - mouse, touch and pen alike. `cast` aims now. Returns a function to stop. */
function track(source: Focus, canvas: HTMLCanvasElement, cast: () => void) {
  const aim = AIM.get(source)!;

  const move = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();

    aim.at = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  };

  const press = (pressed: boolean) => {
    if (aim.pressed != pressed) {
      aim.pressed = pressed;
      source.set('pressed');
    }
  };

  const down = (event: PointerEvent) => {
    move(event);
    cast();
    aim.down = aim.hit;
    press(true);
  };

  const up = (event: PointerEvent) => {
    const target = aim.down;

    move(event);
    cast();
    aim.down = undefined;
    press(false);

    if (target && target === aim.hit)
      for (let at: THREE.Object3D | null = objectOf(target); at; at = at.parent) nodeOf(at)?.set(Focus.select);
  };

  const leave = () => {
    aim.at = aim.down = undefined;
    press(false);
    hit(source, undefined, undefined);
  };

  const events = [
    ['pointermove', move],
    ['pointerdown', down],
    ['pointerup', up],
    ['pointerleave', leave]
  ] as [string, EventListener][];

  for (const [type, listener] of events) canvas.addEventListener(type, listener);

  return () => {
    for (const [type, listener] of events) canvas.removeEventListener(type, listener);
    leave();
  };
}

/** Aim `source` into `scene` as drawn through `camera`. */
function cast(source: Focus, scene: THREE.Object3D, camera: THREE.Camera) {
  const { at } = AIM.get(source)!;

  if (!at) return;

  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  RAY.setFromCamera(at, camera);

  const owner = new Map<THREE.Object3D, Object3D>();

  collect(scene, undefined, owner);

  const [first] = RAY.intersectObjects([...owner.keys()], false);

  hit(source, first && owner.get(first.object), first?.point);
}

function collect(object: THREE.Object3D, inside: Object3D | undefined, owner: Map<THREE.Object3D, Object3D>) {
  if (!object.visible) return;

  const node = nodeOf(object);

  if (node && KEYS.has(node)) inside = node;
  if (inside) owner.set(object, inside);

  for (const child of object.children) collect(child, inside, owner);
}

function hit(source: Focus, node: Object3D | undefined, point: THREE.Vector3 | undefined) {
  const aim = AIM.get(source)!;
  const last = aim.hit;

  if (node !== last) {
    aim.hit = node;
    source.set('hit');

    const left = last && SOURCES.get(last);

    if (left && left.delete(source) && !left.size) focused(last!);

    if (node) {
      let sources = SOURCES.get(node);

      if (!sources) SOURCES.set(node, (sources = new Set()));

      sources.add(source);

      if (sources.size == 1) focused(node);
    }
  }

  if (point ? !aim.point?.equals(point) : aim.point) {
    aim.point = point && point.clone();
    source.set('point');
  }
}

function focused(node: Object3D) {
  for (const key of KEYS.get(node)!) node.set(key);
}

export { cast, Focus, focusable, track };

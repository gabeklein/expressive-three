import { Model } from '@expressive/mvc';
import * as THREE from 'three';

import { nodeOf, objectOf, type Object3D } from './object';

interface Aim {
  at?: THREE.Vector2;
  down?: Object3D;
  hit?: Object3D;
  point?: THREE.Vector3;
  pressed: boolean;
}

const AIM = new WeakMap<Pointer, Aim>();
const RAY = new THREE.Raycaster();

/**
 * The pointer over a viewport - read it with `get(Pointer)`. `hit` is the nearest `interactive` node
 * under it, checked every frame, so a node moving under a still pointer is found.
 */
class Pointer extends Model {
  /** Dispatched on a node pressed and released under the pointer, then on each node it draws under. */
  static readonly click: unique symbol = Symbol('click');

  /** Nearest interactive node under the pointer. */
  declare readonly hit: Object3D | undefined;

  /** Where the pointer meets `hit`, in world space. */
  declare readonly point: THREE.Vector3 | undefined;

  /** Whether a button is held over the surface. */
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

/** Follow pointer events on `canvas`. Returns a function to stop. */
function track(pointer: Pointer, canvas: HTMLCanvasElement) {
  const aim = AIM.get(pointer)!;

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
      pointer.set('pressed');
    }
  };

  const down = (event: PointerEvent) => {
    move(event);
    aim.down = aim.hit;
    press(true);
  };

  const up = () => {
    const target = aim.down;

    aim.down = undefined;
    press(false);

    if (target && target === aim.hit)
      for (let at: THREE.Object3D | null = objectOf(target); at; at = at.parent) nodeOf(at)?.set(Pointer.click);
  };

  const leave = () => {
    aim.at = aim.down = undefined;
    press(false);
    hit(pointer, undefined, undefined);
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

/** Find what the pointer is over in `scene` as drawn through `camera`. */
function cast(pointer: Pointer, scene: THREE.Object3D, camera: THREE.Camera) {
  const aim = AIM.get(pointer)!;

  if (!aim.at) return;

  const owner = new Map<THREE.Object3D, Object3D>();

  collect(scene, undefined, owner);
  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  RAY.setFromCamera(aim.at, camera);

  const [first] = RAY.intersectObjects([...owner.keys()], false);

  hit(pointer, first && owner.get(first.object), first?.point);
}

function collect(object: THREE.Object3D, inside: Object3D | undefined, owner: Map<THREE.Object3D, Object3D>) {
  if (!object.visible) return;

  const node = nodeOf(object);

  if (node?.interactive) inside = node;
  if (inside) owner.set(object, inside);

  for (const child of object.children) collect(child, inside, owner);
}

function hit(pointer: Pointer, node: Object3D | undefined, point: THREE.Vector3 | undefined) {
  const aim = AIM.get(pointer)!;

  if (node !== aim.hit) {
    aim.hit = node;
    pointer.set('hit');
  }

  if (point ? !aim.point?.equals(point) : aim.point) {
    aim.point = point && point.clone();
    pointer.set('point');
  }
}

export { cast, Pointer, track };

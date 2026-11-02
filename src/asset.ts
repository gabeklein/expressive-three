import { Model } from '@expressive/mvc';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { Frame } from './frame';
import { node, objectOf } from './object';

const CACHE = new Map<string, Promise<GLTF>>();
interface Loaded {
  url: string;
  content: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  action?: THREE.AnimationAction;
}

const LOADED = new WeakMap<Asset, Loaded>();

/**
 * A loaded glTF model - `url` names the file, and its scene is cloned under this node. Loading holds
 * `ready`, so an owner is ready once every asset under it has loaded.
 */
class Asset extends node(THREE.Group) {
  /** The glTF file to load - assigning another swaps the content; unset shows none. */
  declare url: string | undefined;

  /** Name of the animation clip to play; unset plays none. */
  declare clip: string | undefined;

  /** Whether content from `url` is in place. */
  declare readonly loaded: boolean;

  /** A named object in the loaded content, for per-frame values - undefined until loaded. */
  part<T extends THREE.Object3D = THREE.Object3D>(name: string): T | undefined {
    return LOADED.get(this.is)?.content.getObjectByName(name) as T | undefined;
  }

  /** Load a file - each URL once, shared by every instance. Override to load another way. */
  protected load(url: string): Promise<GLTF> {
    let loading = CACHE.get(url);

    if (!loading) {
      CACHE.set(url, (loading = new GLTFLoader().loadAsync(url)));
      loading.catch(() => CACHE.delete(url));
    }

    return loading;
  }
}

function member(self: Asset, key: 'url' | 'clip') {
  if (Object.getOwnPropertyDescriptor(self, key)) return;

  let value: unknown;

  (self as Model).set(key, {
    get: () => value,
    set(next: unknown) {
      if (next !== value) {
        value = next;
        self.set(key);
      }

      throw false;
    }
  });
}

function stale(self: Asset) {
  return self.url !== undefined && LOADED.get(self)?.url !== self.url;
}

async function sync(self: Asset, url: string | undefined) {
  if (url === undefined) return detach(self);
  if (!stale(self)) return;

  let gltf: GLTF;

  try {
    gltf = await (self as unknown as { load(url: string): Promise<GLTF> }).load(url);
  } catch (error) {
    if (self.url === url) throw error;
    return;
  }

  if (self.url !== url || self.get(null)) return;

  detach(self);

  const content = clone(gltf.scene);

  objectOf(self).add(content);
  LOADED.set(self, { url, content, mixer: new THREE.AnimationMixer(content), clips: gltf.animations });
  self.set('loaded');
  play(self);
}

function detach(self: Asset) {
  const loaded = LOADED.get(self);

  if (!loaded) return;

  loaded.mixer.stopAllAction();
  loaded.content.removeFromParent();
  LOADED.delete(self);
  self.set('loaded');
}

function play(self: Asset) {
  const loaded = LOADED.get(self)!;
  const clip = self.clip && THREE.AnimationClip.findByName(loaded.clips, self.clip);
  const next = clip ? loaded.mixer.clipAction(clip) : undefined;

  if (next === loaded.action) return;

  loaded.action?.fadeOut(0.2);
  next?.reset().fadeIn(0.2).play();
  loaded.action = next;
}

/** The closest `Type` held by an owner of `self`, as a `get(Type)` field finds it, else from context. */
function nearest<T extends Model>(self: Model, Type: Model.Extends<T>): T | undefined {
  for (let at = self.get(Model, false); at; at = at.get(Model, false)) {
    let found: T | undefined;

    at.get(Model, (child) => void (found ||= child instanceof Type ? (child as T) : undefined), true)();

    if (found) return found;
  }

  return self.get(Type as Model.Type<T>, false);
}

Asset.on({
  setup(self) {
    member(self, 'url');
    member(self, 'clip');

    (self as Model).set('loaded', { get: () => LOADED.has(self), set: false });

    return Promise.resolve().then(async () => {
      while (stale(self) && !self.get(null)) await sync(self, self.url);
    });
  },
  ready(self) {
    const frame = nearest(self, Frame);
    const stop = frame?.each((delta) => LOADED.get(self)?.mixer.update(delta));
    const reload = self.get(($) => sync(self, $.url));
    const watch = self.set((key) => {
      if (key == 'clip' && LOADED.has(self)) play(self);
    });

    return () => {
      stop?.();
      reload();
      watch();
      detach(self);
    };
  }
});

export { Asset };

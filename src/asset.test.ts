import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Context } from '@expressive/mvc';

import { Asset } from './asset';
import { Frame } from './frame';
import { objectOf, Scene } from './object';
import { flushMicrotasks } from '../test.setup';

const requested = vi.hoisted(() => [] as string[]);

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    loadAsync(url: string) {
      requested.push(url);

      return url.includes('flaky') && requested.filter((at) => at == url).length == 1
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(model(url));
    }
  }
}));

afterEach(() => {
  requested.length = 0;
});

function model(name: string): GLTF {
  const scene = new THREE.Group();
  const head = new THREE.Object3D();

  scene.name = name;
  head.name = 'Head';
  scene.add(head);

  const turn = (clip: string, to: number) =>
    new THREE.AnimationClip(clip, 1, [new THREE.NumberKeyframeTrack('Head.rotation[y]', [0, 1], [0, to])]);

  return { scene, scenes: [scene], animations: [turn('Spin', Math.PI), turn('Nod', 1)], cameras: [], asset: {}, parser: null!, userData: {} };
}

const files: Record<string, ReturnType<typeof deferred>> = {};

function deferred() {
  let resolve!: (gltf: GLTF) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<GLTF>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

const file = (url: string) => (files[url] ||= deferred());

class Held extends Asset {
  protected load(url: string) {
    return file(url).promise;
  }
}

class Robot extends Held {
  url = '/robot.glb';
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await flushMicrotasks();
};

describe('Asset', () => {
  afterEach(() => {
    for (const key in files) delete files[key];
  });

  it('will hold ready until its file loads, and its owner with it', async () => {
    const order: string[] = [];

    class Arena extends Scene {
      robot = new Robot();
    }

    Arena.on({ ready: () => void order.push('arena ready') });

    const arena = Arena.new();

    await settle();
    order.push('loading');
    file('/robot.glb').resolve(model('robot'));
    await settle();

    expect(order).toEqual(['loading', 'arena ready']);
    expect(arena.robot.loaded).toBe(true);
    expect(objectOf(arena.robot).children[0].name).toBe('robot');
  });

  it('will clone its content per instance and find a part', async () => {
    const a = Robot.new();
    const b = Robot.new();

    expect(a.part('Head')).toBeUndefined();

    file('/robot.glb').resolve(model('robot'));
    await settle();

    expect(a.part('Head')).toBeInstanceOf(THREE.Object3D);
    expect(a.part('Head')).not.toBe(b.part('Head'));
  });

  it('will read the url from constructor arguments', async () => {
    const rock = Held.new({ url: '/rock.glb' });

    file('/rock.glb').resolve(model('rock'));
    await settle();

    expect(objectOf(rock).children[0].name).toBe('rock');
  });

  it('will swap content when its url changes', async () => {
    const robot = Robot.new();

    file('/robot.glb').resolve(model('robot'));
    await settle();

    robot.url = '/drone.glb';
    await settle();
    expect(objectOf(robot).children[0].name).toBe('robot');

    file('/drone.glb').resolve(model('drone'));
    await settle();

    expect(objectOf(robot).children.map((child) => child.name)).toEqual(['drone']);
  });

  it('will load a url changed while its first file loads', async () => {
    const robot = Robot.new();

    await settle();
    robot.url = '/drone.glb';
    file('/drone.glb').resolve(model('drone'));
    await settle();

    expect(robot.loaded).toBe(false);

    file('/robot.glb').resolve(model('robot'));
    await settle();

    expect(objectOf(robot).children.map((child) => child.name)).toEqual(['drone']);
    expect(robot.loaded).toBe(true);
  });

  it('will skip a url replaced before it lands', async () => {
    const robot = Robot.new();

    file('/robot.glb').resolve(model('robot'));
    await settle();

    robot.url = '/drone.glb';
    await settle();
    robot.url = '/crate.glb';
    file('/drone.glb').reject(new Error('404'));
    file('/crate.glb').resolve(model('crate'));
    await settle();

    expect(objectOf(robot).children.map((child) => child.name)).toEqual(['crate']);
  });

  it('will report a swap that fails to load and keep its content', async () => {
    const caught: unknown[] = [];

    class Broken extends Robot {}

    Broken.on({ catch: (error, kind) => void caught.push([kind, error]) });

    const robot = Broken.new();

    file('/robot.glb').resolve(model('robot'));
    await settle();

    robot.url = '/missing.glb';
    file('/missing.glb').reject(new Error('404'));
    await settle();

    expect(caught).toEqual([['effect', new Error('404')]]);
    expect(robot.get(null)).toBe(false);
    expect(objectOf(robot).children.map((child) => child.name)).toEqual(['robot']);
  });

  it('will load nothing without a url, and unload when it is cleared', async () => {
    let ready = false;

    class Empty extends Held {}

    Empty.on({ ready: () => void (ready = true) });

    const empty = Empty.new();

    await settle();
    empty.clip = 'Spin';
    await settle();

    expect(ready).toBe(true);
    expect(empty.loaded).toBe(false);

    empty.url = '/robot.glb';
    file('/robot.glb').resolve(model('robot'));
    await settle();

    expect(empty.loaded).toBe(true);

    empty.url = undefined;
    await settle();

    expect(empty.loaded).toBe(false);
    expect(objectOf(empty).children).toEqual([]);
  });

  it('will not let loaded be assigned', () => {
    const robot = Robot.new();

    // @ts-expect-error
    expect(() => (robot.loaded = true)).toThrow(/read-only/);
  });

  it('will play a clip on the frame clock and crossfade to another', async () => {
    class Walker extends Robot {
      clip: string | undefined = 'Spin';
    }

    class Stage extends Scene {
      frame = new Frame();
      walker = new Walker();
    }

    const stage = Stage.new();

    file('/robot.glb').resolve(model('robot'));
    await settle();

    const head = stage.walker.part('Head')!;

    stage.frame.tick(0.5);
    expect(head.rotation.y).toBeCloseTo(Math.PI / 2);

    stage.walker.clip = 'Nod';
    stage.frame.tick(1);
    stage.walker.clip = 'Nod';
    stage.walker.clip = 'Missing';
    stage.frame.tick(1);
    stage.walker.clip = undefined;

    expect(stage.walker.clip).toBeUndefined();
  });

  it('will play a clip chosen before its file loads, and ignore an unchanged url', async () => {
    class Stage extends Scene {
      frame = new Frame();
      robot = new Held({ url: '/robot.glb' });
    }

    const stage = Stage.new();

    stage.robot.clip = 'Spin';
    stage.robot.url = '/robot.glb';
    await expect(stage.robot).toHaveUpdated('clip');
    expect(stage.robot.loaded).toBe(false);

    file('/robot.glb').resolve(model('robot'));
    await settle();
    stage.frame.tick(0.5);

    expect(stage.robot.part('Head')!.rotation.y).toBeCloseTo(Math.PI / 2);
  });

  it('will not load into a destroyed instance, and detach when destroyed', async () => {
    const early = Robot.new();
    const late = Robot.new();

    early.set(null);
    file('/robot.glb').resolve(model('robot'));
    await settle();

    expect(objectOf(early).children).toEqual([]);
    expect(objectOf(late).children).toHaveLength(1);

    late.set(null);

    expect(objectOf(late).children).toEqual([]);
  });

  it('will report a file that fails to load to catch, then be destroyed', async () => {
    const caught: unknown[] = [];

    class Broken extends Robot {}

    Broken.on({ catch: (error) => void caught.push(error) });

    const robot = Broken.new();

    file('/robot.glb').reject(new Error('404'));
    await settle();

    expect(caught).toEqual([new Error('404')]);
    expect(robot.get(null)).toBe(true);
  });

  it('will find a frame from context when no owner holds one', async () => {
    class Walker extends Robot {
      clip = 'Spin';
    }

    const frame = Frame.new();
    const walker = Walker.new(new Context(frame));

    file('/robot.glb').resolve(model('robot'));
    await settle();

    frame.tick(0.5);
    expect(walker.part('Head')!.rotation.y).toBeCloseTo(Math.PI / 2);
  });

  it('will load each url once with the default loader', async () => {
    class Crate extends Asset {
      url = '/crate.glb';
    }

    const a = Crate.new();
    const b = Crate.new({ clip: 'Spin' });

    await settle();

    expect(requested).toEqual(['/crate.glb']);
    expect(a.loaded && b.loaded).toBe(true);
  });

  it('will retry a url whose load failed', async () => {
    class Flaky extends Asset {
      url = '/flaky.glb';
    }

    Flaky.on({ catch: () => {} });

    const first = Flaky.new();

    await settle();

    const second = Flaky.new();

    await settle();

    expect(requested).toEqual(['/flaky.glb', '/flaky.glb']);
    expect(first.get(null)).toBe(true);
    expect(second.loaded).toBe(true);
  });
});

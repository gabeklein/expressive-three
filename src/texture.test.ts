import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

import { texture } from './texture';

const requested = vi.hoisted(() => [] as string[]);

vi.mock('three', async (actual) => {
  const three = await actual<typeof import('three')>();

  class TextureLoader {
    load(url: string) {
      requested.push(url);
      return new three.Texture();
    }
  }

  return { ...three, TextureLoader };
});

vi.mock('three/examples/jsm/loaders/HDRLoader.js', async () => {
  const three = await import('three');

  return {
    HDRLoader: class {
      load(url: string) {
        requested.push(`hdr:${url}`);
        return new three.DataTexture();
      }
    }
  };
});

afterEach(() => {
  requested.length = 0;
});

describe('texture', () => {
  it('will load a url once and share it', () => {
    const wood = texture('/wood.jpg');

    expect(texture('/wood.jpg')).toBe(wood);
    expect(requested).toEqual(['/wood.jpg']);
    expect(wood).toBeInstanceOf(THREE.Texture);
  });

  it('will apply settings to the shared texture', () => {
    const tiles = texture('/tiles.png', { colorSpace: THREE.SRGBColorSpace, wrapS: THREE.RepeatWrapping });

    expect(tiles.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tiles.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture('/tiles.png')).toBe(tiles);
  });

  it('will load an hdr mapped equirectangular', () => {
    const sky = texture('/sky.HDR');

    expect(requested).toEqual(['hdr:/sky.HDR']);
    expect(sky).toBeInstanceOf(THREE.DataTexture);
    expect(sky.mapping).toBe(THREE.EquirectangularReflectionMapping);
    expect(sky.image).toEqual({ data: null, width: 0, height: 0 });
  });
});

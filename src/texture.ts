import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const CACHE = new Map<string, THREE.Texture>();

/**
 * A texture from `url` - loaded once and shared by every caller, so `settings` are shared too; three
 * fills it in when the file lands. A `.hdr` maps equirectangular, for a Scene's `environment` and
 * `background`. A color map needs `colorSpace: THREE.SRGBColorSpace`.
 */
function texture(url: string, settings?: Partial<THREE.Texture>): THREE.Texture {
  let loaded = CACHE.get(url);

  if (!loaded) {
    loaded = /\.hdr$/i.test(url)
      ? Object.assign(new RGBELoader().load(url), { mapping: THREE.EquirectangularReflectionMapping })
      : new THREE.TextureLoader().load(url);

    CACHE.set(url, loaded);
  }

  return settings ? Object.assign(loaded, settings) : loaded;
}

export { texture };

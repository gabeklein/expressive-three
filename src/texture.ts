import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

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
      ? Object.assign(new HDRLoader().load(url), {
          mapping: THREE.EquirectangularReflectionMapping,
          // three bakes an environment on first use and keeps it - an empty image defers that until the file lands
          image: { data: null, width: 0, height: 0 }
        })
      : new THREE.TextureLoader().load(url);

    CACHE.set(url, loaded);
  }

  return settings ? Object.assign(loaded, settings) : loaded;
}

export { texture };

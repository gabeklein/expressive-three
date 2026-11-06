import { def } from '@expressive/mvc';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { objectOf } from './object';
import { Viewport } from './viewport';

declare namespace orbit {
  type Settings = Partial<
    Pick<
      OrbitControls,
      | 'target'
      | 'enableDamping'
      | 'dampingFactor'
      | 'enableRotate'
      | 'enableZoom'
      | 'enablePan'
      | 'autoRotate'
      | 'autoRotateSpeed'
      | 'minDistance'
      | 'maxDistance'
      | 'minPolarAngle'
      | 'maxPolarAngle'
    >
  >;
}

/**
 * Orbit `camera` around a target with the pointer while attached to a canvas - the field reads the
 * controls, or `undefined` while detached. They move the camera in place, like a frame handler.
 */
function orbit(settings?: orbit.Settings) {
  return def<OrbitControls>((key, self) => {
    if (!(self instanceof Viewport)) throw new Error(`${self}.${key} - orbit() applies to a Viewport.`);

    let controls: OrbitControls | undefined;

    const stop = self.get(($) => {
      const { surface, camera } = $;

      if (!surface || !('getContext' in surface)) return;

      controls = Object.assign(new OrbitControls(objectOf(camera.is) as THREE.Camera, surface), settings);
      self.set(key);

      const each = self.frame.each(() => controls!.update());

      return () => {
        each();
        controls!.dispose();
        controls = undefined;
        self.set(key);
      };
    });

    return {
      get: () => controls as OrbitControls,
      set: false,
      destroy: () => void stop()
    };
  }) as OrbitControls | undefined;
}

export { orbit };

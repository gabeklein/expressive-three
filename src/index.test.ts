import { describe, expect, it } from 'vitest';

import * as api from './index';

describe('public surface', () => {
  it('will export scene entries alongside re-exported mvc', () => {
    expect(Object.keys(api).sort()).toEqual([
      'AmbientLight',
      'Asset',
      'Context',
      'DirectionalLight',
      'Focus',
      'Frame',
      'Group',
      'HemisphereLight',
      'Light',
      'Mesh',
      'Model',
      'Object3D',
      'OrthographicCamera',
      'PerspectiveCamera',
      'PointLight',
      'Scene',
      'SpotLight',
      'Viewport',
      'def',
      'default',
      'focus',
      'get',
      'has',
      'loop',
      'map',
      'ref',
      'set'
    ]);
  });
});

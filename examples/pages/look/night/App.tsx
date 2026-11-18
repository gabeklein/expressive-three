import { Component } from '@expressive/mvc';
import { orbit, PerspectiveCamera, Viewport } from '@expressive/three';
import { Vector3 } from 'three';

import { Yard } from './Yard';

export default () => (
  <div className="container">
    <h1>Night</h1>
    <p>
      A lit yard. <code>shadows</code> on the viewport turns on soft shadow maps; a mesh marks itself{' '}
      <code>castShadow</code> or <code>receiveShadow</code>, and the moon sizes its live{' '}
      <code>shadow</code> in place. <code>texture()</code> loads a file once and shares it - the grass
      repeats, the bricks are a color map, and the sky is an <code>.hdr</code> assigned to{' '}
      <code>environment</code>, which is what the metal orb reflects.
    </p>
    <p>
      <code>controls = orbit(…)</code> puts three's orbit controls on the camera while the canvas is
      attached - drag to look around, wheel to zoom. They move the camera in place, like a frame
      handler, so nothing dispatches while you orbit. The ghosts are point lights circling in{' '}
      <code>frame.each</code>.
    </p>
    <Scenery />
  </div>
);

class Eye extends PerspectiveCamera {
  position = new Vector3(8, 4, 10);
  fov = 45;
}

class Game extends Viewport {
  scene = new Yard();
  camera = new Eye();
  shadows = true;

  controls = orbit({
    enableDamping: true,
    target: new Vector3(0, 1, 0),
    maxPolarAngle: Math.PI / 2 - 0.05,
    minDistance: 4,
    maxDistance: 25
  });
}

class Scenery extends Component {
  game = new Game();

  render() {
    const { game } = this;

    return (
      <>
        <canvas className="stage" ref={game.canvas} />
        <div className="controls">
          <button onClick={() => (game.shadows = !game.shadows)}>
            {game.shadows ? 'Switch shadows off' : 'Switch shadows on'}
          </button>
          <span className="shadows">{game.shadows ? 'shadows on' : 'shadows off'}</span>
        </div>
      </>
    );
  }
}

import { Component } from '@expressive/mvc';
import {
  Frame,
  get,
  Group,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  Viewport
} from '@expressive/three';
import { BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';

const CRATE = new BoxGeometry(1.6, 1.6, 1.6);

export default () => (
  <div className="container">
    <h1>Cameras</h1>
    <p>
      Cameras are nodes too - each one here is a field on the <code>Viewport</code>, and <code>camera</code>{' '}
      picks the one it draws through. <code>fov</code> and <code>zoom</code> are members: assigning one
      updates the projection on the next frame. Three crates sit at different depths. Through the{' '}
      <code>PerspectiveCamera</code> the far one shrinks with distance; the <code>OrthographicCamera</code>{' '}
      draws every crate at its size. It keeps its vertical extent - <code>top</code> and <code>bottom</code>{' '}
      - and fits its width to the canvas, so nothing stretches. The follow camera is placed under a turning{' '}
      <code>Group</code> with <code>parent</code>: it rides the orbit around the far crate while the
      Viewport still owns it.
    </p>
    <Projection />
    <small>
      Assigning <code>camera</code> switches the drawing on the next frame, and the Viewport fits the
      incoming camera to the canvas. Each camera lives in its own field, so switching back keeps its settings.
    </small>
  </div>
);

class Crate extends Mesh {
  geometry = CRATE;
}

class Orbit extends Group {
  frame = get(Frame);

  protected new() {
    return this.frame.each((delta) => {
      this.rotation.y += 0.6 * delta;
    });
  }
}

class Shelf extends Scene {
  near = new Crate({
    position: new Vector3(-3, 0, 4),
    material: new MeshBasicMaterial({ color: 'gold' })
  });

  middle = new Crate({
    position: new Vector3(3, 0, 0),
    material: new MeshBasicMaterial({ color: 'teal' })
  });

  far = new Crate({
    position: new Vector3(0, 0, -12),
    material: new MeshBasicMaterial({ color: 'tomato' })
  });

  orbit = new Orbit({ position: new Vector3(0, 0, -12) });
}

class Front extends PerspectiveCamera {
  position = new Vector3(0, 0, 10);
}

class Flat extends OrthographicCamera {
  top = 4;
  bottom = -4;
  position = new Vector3(0, 0, 10);
}

class Rider extends PerspectiveCamera {
  position = new Vector3(0, 0, 6);
}

class Bench extends Viewport {
  scene = new Shelf();

  front = new Front();
  flat = new Flat();
  rider = new Rider({ parent: this.scene.orbit });

  camera: Front | Flat | Rider = this.front;
}

class Projection extends Component {
  bench = new Bench();

  render() {
    const { camera, front, flat, rider } = this.bench;
    const choices = [
      ['Perspective', front],
      ['Orthographic', flat],
      ['Follow', rider]
    ] as const;

    return (
      <>
        <canvas className="stage" ref={this.bench.canvas} />
        <div className="controls">
          {choices.map(([label, option]) => (
            <button
              key={label}
              aria-pressed={camera.is === option.is}
              onClick={() => (this.bench.camera = option)}>
              {label}
            </button>
          ))}
        </div>
        {camera instanceof OrthographicCamera ? (
          <label className="controls">
            zoom
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.25}
              value={camera.zoom}
              onInput={(event) => (camera.zoom = Number(event.currentTarget.value))}
            />
            <span className="zoom">{camera.zoom}x</span>
          </label>
        ) : (
          <label className="controls">
            fov
            <input
              type="range"
              min={15}
              max={90}
              value={camera.fov}
              onInput={(event) => (camera.fov = Number(event.currentTarget.value))}
            />
            <span className="fov">{camera.fov}°</span>
          </label>
        )}
      </>
    );
  }
}

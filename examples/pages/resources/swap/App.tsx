import { Component } from '@expressive/mvc';
import { has, Mesh, OrthographicCamera, Scene, Viewport } from '@expressive/three';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type WebGLRenderer
} from 'three';

const SHAPES = {
  box: new BoxGeometry(1.6, 1.6, 1.6),
  sphere: new SphereGeometry(0.8, 48, 24),
  torus: new TorusGeometry(0.55, 0.25, 24, 64)
};

const SLOTS = [0, 1, 2, 3];
const SPACING = 2.2;

const paint = new MeshBasicMaterial({ color: new Color('tomato') });

export default () => (
  <div className="container">
    <h1>Swap</h1>
    <p>
      Geometry and materials are reference-counted across the meshes holding them - nothing is marked
      shared, nothing is disposed by hand. Assigning <code>geometry</code> holds it; replacing it or
      destroying the mesh releases it; the last release disposes it. The three boxes share one geometry
      and one material, so the GPU holds one geometry. Swap one and the box stays alive for the others -
      swap the last and it is freed.
    </p>
    <Shelving />
    <small>
      A disposed geometry used again simply re-uploads - add a box after freeing it. The readout is the
      renderer's own <code>info.memory</code>, read after each draw.
    </small>
  </div>
);

class Shape extends Mesh {
  slot = 0;

  geometry: BufferGeometry = SHAPES.box;
  material = paint;

  swap() {
    this.geometry = SHAPES[next(this.geometry)];
  }

  protected new() {
    this.position = new Vector3((this.slot - (SLOTS.length - 1) / 2) * SPACING, 0, 0);
  }
}

class Shelf extends Scene {
  shapes = has(Shape, 'slot');

  at(slot: number) {
    return this.shapes.get((shape) => shape.slot === slot);
  }

  protected new() {
    for (const slot of SLOTS.slice(0, 3)) this.shapes.add(slot);
  }
}

class Eye extends OrthographicCamera {
  top = 2;
  bottom = -2;
  position = new Vector3(0, 0, 10);
}

class Workshop extends Viewport {
  scene = new Shelf();
  camera = new Eye();

  geometries = 0;

  protected draw() {
    super.draw();
    this.geometries = (this._renderer as WebGLRenderer).info.memory.geometries;
  }
}

class Shelving extends Component {
  game = new Workshop();

  render() {
    const { scene, geometries } = this.game;
    const { shapes } = scene;

    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <div className="controls">
          {SLOTS.map((slot) => {
            const shape = scene.at(slot);

            return (
              <span key={slot} className="slot" style={{ display: 'flex', gap: 'var(--s1)' }}>
                {shape ? (
                  <>
                    <code>{name(shape.geometry)}</code>
                    <button onClick={() => shape.swap()}>Swap</button>
                    <button onClick={() => shapes.delete(shape)}>Remove</button>
                  </>
                ) : (
                  <button onClick={() => shapes.add(slot)}>Add box</button>
                )}
              </span>
            );
          })}
        </div>
        <div className="controls">
          GPU holds <strong className="geometries">{geometries}</strong> geometries
        </div>
      </>
    );
  }
}

function name(geometry: BufferGeometry) {
  return (Object.keys(SHAPES) as (keyof typeof SHAPES)[]).find((key) => SHAPES[key] === geometry)!;
}

function next(geometry: BufferGeometry) {
  const keys = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
  return keys[(keys.indexOf(name(geometry)) + 1) % keys.length];
}

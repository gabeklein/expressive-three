import { Component } from '@expressive/mvc';
import { Frame, get, Mesh, PerspectiveCamera, Pointer, Scene, Viewport } from '@expressive/three';
import { BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';

import { Inspector } from './Inspector';

export default () => (
  <div className="container">
    <h1>Pointer</h1>
    <p>
      A <code>Viewport</code> owns a <code>Pointer</code>, and every frame it finds the nearest{' '}
      <code>interactive</code> node under it. <code>hit</code> is ordinary state: each crate's effect
      compares it to itself to light up, and the inspector below the canvas reads it through context to
      show the hovered crate's own fields. Clicking dispatches <code>Pointer.click</code> on the crate,
      which toggles <code>spinning</code>.
    </p>
    <Picking />
  </div>
);

export class Crate extends Mesh {
  frame = get(Frame);
  pointer = get(Pointer);

  interactive = true;
  label = '';
  color = 'white';
  spinning = false;

  geometry = new BoxGeometry(1.6, 1.6, 1.6);
  material = new MeshBasicMaterial();

  protected new() {
    this.get(($) => void this.material.color.set($.pointer.hit?.is === this.is ? 'white' : $.color));
    this.set(Pointer.click, () => void (this.spinning = !this.spinning));

    return this.frame.each((delta) => {
      if (this.spinning) this.rotation.y += delta * 2;
    });
  }
}

class Yard extends Scene {
  red = new Crate({ label: 'red', color: 'red', position: new Vector3(-3, 0, 0) });
  green = new Crate({ label: 'green', color: 'lime' });
  blue = new Crate({ label: 'blue', color: 'blue', position: new Vector3(3, 0, 0) });
}

class Eye extends PerspectiveCamera {
  position = new Vector3(0, 0, 8);
}

class Game extends Viewport {
  scene = new Yard();
  camera = new Eye();
}

class Picking extends Component {
  game = new Game();

  render() {
    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <Inspector />
      </>
    );
  }
}

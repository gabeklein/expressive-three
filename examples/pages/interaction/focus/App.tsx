import { Component } from '@expressive/mvc';
import { Focus, Frame, get, Mesh, PerspectiveCamera, pointer, Scene, Viewport } from '@expressive/three';
import { BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';

import { Inspector } from './Inspector';

export default () => (
  <div className="container">
    <h1>Focus</h1>
    <p>
      A <code>focus = pointer()</code> field makes a crate focusable and reads true while the pointer -
      mouse, touch or pen - aims at it; the crate's effect lights it up from that. The viewport's{' '}
      <code>Focus</code> holds what it aims at as <code>hit</code>, and the inspector below the canvas
      reads it through context to show that crate's own fields. Pressing and releasing over a crate
      dispatches <code>Focus.select</code> on it, which toggles <code>spinning</code>.
    </p>
    <Picking />
  </div>
);

export class Crate extends Mesh {
  frame = get(Frame);
  focus = pointer();

  label = '';
  color = 'white';
  spinning = false;

  geometry = new BoxGeometry(1.6, 1.6, 1.6);
  material = new MeshBasicMaterial();

  protected new() {
    this.get(($) => void this.material.color.set($.focus ? 'white' : $.color));
    this.set(Focus.select, () => void (this.spinning = !this.spinning));

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

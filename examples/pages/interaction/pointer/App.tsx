import { Component } from '@expressive/mvc';
import { Frame, get, Mesh, PerspectiveCamera, pointer, Scene, Viewport } from '@expressive/three';
import { BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';

import { Inspector } from './Inspector';

export default () => (
  <div className="container">
    <h1>Pointer</h1>
    <p>
      A <code>focus = pointer(…)</code> field makes a crate a target for the pointer - mouse, touch or
      pen. It reads what aims at the crate, or <code>undefined</code>, and the crate's effect lights up
      from it. The handlers take the gestures: <code>select</code> toggles spinning, <code>hold</code>{' '}
      charges the crate until its returned function runs on release, and <code>drag</code> follows the
      live <code>move</code> in a frame handler until the drop.
    </p>
    <p>
      The viewport's <code>Pointer</code> holds what it aims at as <code>hit</code>. The inspector below
      the canvas reads it through context and shows that crate's own fields.
    </p>
    <Picking />
  </div>
);

export class Crate extends Mesh {
  frame = get(Frame);

  label = '';
  color = 'white';
  spinning = false;
  charging = false;

  focus = pointer({
    select: () => void (this.spinning = !this.spinning),
    hold: () => {
      this.charging = true;
      return () => void (this.charging = false);
    },
    drag: (move) => {
      const origin = this.position.clone();
      const stop = this.frame.each(() => void this.position.copy(origin).add(move.delta));

      return () => {
        stop();
        this.set('position');
      };
    }
  });

  geometry = new BoxGeometry(1.6, 1.6, 1.6);
  material = new MeshBasicMaterial();

  protected new() {
    this.get(($) => void this.material.color.set($.charging ? 'gold' : $.focus ? 'white' : $.color));

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

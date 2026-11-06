import { Component } from '@expressive/mvc';
import { Frame, get, Mesh, PerspectiveCamera, Pointer, pointer, Scene, Viewport } from '@expressive/three';
import { BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';

import { Inspector } from './Inspector';

export default () => (
  <div className="container">
    <h1>Pointer</h1>
    <p>
      A <code>focus = pointer(…)</code> field makes a crate a target for the pointer - mouse, touch or
      pen. It reads what aims at the crate, or <code>undefined</code>, and the crate's effect lights up
      from it. Its handlers are the crate's own gestures: <code>select</code> toggles spinning, and{' '}
      <code>hold</code> charges the crate until its returned function runs on release.
    </p>
    <p>
      Dragging depends on a mode the game holds. Each crate reads it with <code>get(Game)</code>, and
      while it is aimed at in move mode its effect adds a <code>drag</code> listener through{' '}
      <code>focus.drag</code> - returned from the effect, so it goes when either changes. Without it, a
      dragged press still selects.
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
  game = get(Game);

  label = '';
  color = 'white';
  spinning = false;
  charging = false;

  focus = pointer({
    select: () => void (this.spinning = !this.spinning),
    hold: () => {
      this.charging = true;
      return () => void (this.charging = false);
    }
  });

  geometry = new BoxGeometry(1.6, 1.6, 1.6);
  material = new MeshBasicMaterial();

  follow(move: Pointer.Move) {
    const origin = this.position.clone();
    const stop = this.frame.each(() => void this.position.copy(origin).add(move.delta));

    return () => {
      stop();
      this.set('position');
    };
  }

  protected new() {
    this.get(($) => {
      const { charging, focus, color } = $;

      this.material.color.set(charging ? 'gold' : focus ? 'white' : color);
    });

    this.get(($) => {
      const { focus, game: { moving } } = $;

      if (focus && moving) return focus.drag(this.follow);
    });

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
  moving = false;
}

class Picking extends Component {
  game = new Game();

  render() {
    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <div className="controls">
          <button onClick={() => (this.game.moving = !this.game.moving)}>
            {this.game.moving ? 'Stop moving' : 'Move'}
          </button>
        </div>
        <Inspector />
      </>
    );
  }
}

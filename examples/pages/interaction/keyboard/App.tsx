import { Component } from '@expressive/mvc';
import { Frame, get, keyboard, Mesh, PerspectiveCamera, Scene, Viewport } from '@expressive/three';
import { BoxGeometry, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';

const GROUND = 0.5;
const GRAVITY = 30;

export default () => (
  <div className="container">
    <h1>Keyboard</h1>
    <p>
      Each <code>keyboard(…)</code> field binds keys to one action and reads a press while any of them
      is held, else <code>undefined</code>. The crate drives with W A S D or the arrows - an array binds
      alternates - and sprints while either Shift is down. It reads its bindings each frame, the way it
      would read any field.
    </p>
    <p>
      Space hops. Its handlers tell a tap from a hold: <code>tap</code> is a small hop, and{' '}
      <code>hold</code> charges the crate gold until its returned function runs on release, for a big one.
    </p>
    <p>
      Each binding dispatches only when its press starts and ends, so the readout below wakes for the
      keys it shows. The crate moves in place and assigns its position when a key changes, so the
      readout catches where it came to rest.
    </p>
    <Driving />
  </div>
);

export class Crate extends Mesh {
  frame = get(Frame);

  forward = keyboard(['W', 'ArrowUp']);
  back = keyboard(['S', 'ArrowDown']);
  left = keyboard(['A', 'ArrowLeft']);
  right = keyboard(['D', 'ArrowRight']);
  sprint = keyboard('Shift');
  jump = keyboard('Space', {
    tap: () => this.hop(6),
    hold: () => {
      this.charging = true;

      return () => {
        this.charging = false;
        this.hop(12);
      };
    }
  });

  charging = false;
  velocity = new Vector3();

  position = new Vector3(0, GROUND, 0);
  geometry = new BoxGeometry(1, 1, 1);
  material = new MeshBasicMaterial({ color: 'white' });

  hop(speed: number) {
    if (this.position.y <= GROUND) this.velocity.y = speed;
  }

  protected new() {
    this.get(($) => void this.material.color.set($.charging ? 'gold' : 'white'));

    this.get(($) => {
      const { forward, back, left, right } = $;

      if (forward || back || left || right) return () => this.set('position');
    });

    return this.frame.each((delta) => {
      const { forward, back, left, right, sprint, position, velocity } = this;
      const speed = (sprint ? 8 : 3) * delta;

      position.x += ((right ? 1 : 0) - (left ? 1 : 0)) * speed;
      position.z += ((back ? 1 : 0) - (forward ? 1 : 0)) * speed;

      velocity.y -= GRAVITY * delta;
      position.y = Math.max(GROUND, position.y + velocity.y * delta);
    });
  }
}

class Post extends Mesh {
  geometry = new BoxGeometry(0.6, 2, 0.6);
  material = new MeshBasicMaterial({ color: 'red' });
}

class Ground extends Mesh {
  geometry = new PlaneGeometry(40, 40);
  material = new MeshBasicMaterial({ color: '#2a2a2a' });

  protected new() {
    this.rotation.x = -Math.PI / 2;
  }
}

class Yard extends Scene {
  ground = new Ground();
  crate = new Crate();
  north = new Post({ position: new Vector3(0, 1, -8) });
  east = new Post({ position: new Vector3(6, 1, -4) });
  west = new Post({ position: new Vector3(-6, 1, -4) });
}

class Chase extends PerspectiveCamera {
  position = new Vector3(0, 4, 7);
}

class Game extends Viewport {
  scene = new Yard();
  camera = new Chase();

  protected new() {
    const { crate } = this.scene;

    return this.frame.each(() => {
      const { x, z } = crate.position;

      this.camera.position.set(x, 4, z + 7);
      this.camera.lookAt(x, GROUND, z);
    });
  }
}

class Readout extends Component {
  crate = get(Crate);

  render() {
    const { forward, back, left, right, sprint, jump, charging, position } = this.crate;
    const held = Object.entries({ forward, back, left, right, sprint, jump }).filter(([, press]) => press);

    return (
      <dl className="inspector">
        <dt>held</dt>
        <dd className="held">{held.map(([name]) => name).join(', ') || 'nothing'}</dd>
        <dt>charging</dt>
        <dd className="charging">{charging ? 'yes' : 'no'}</dd>
        <dt>rested at</dt>
        <dd className="rested">{[position.x, position.z].map((n) => n.toFixed(1)).join(', ')}</dd>
      </dl>
    );
  }
}

class Driving extends Component {
  game = new Game();

  render() {
    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <Readout />
      </>
    );
  }
}

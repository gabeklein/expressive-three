import { Component } from '@expressive/mvc';
import { Frame, get, Mesh, PerspectiveCamera, Scene, Viewport } from '@expressive/three';
import { BoxGeometry, Color, MeshBasicMaterial, Vector3 } from 'three';

export default () => (
  <div className="container">
    <h1>Spin</h1>
    <p>
      A <code>Mesh</code> subclass turns itself every frame by mutating its live <code>rotation</code>{' '}
      inside <code>frame.each</code> - no update is dispatched, so nothing re-renders. <code>speed</code>{' '}
      is ordinary state: the button changes it, and the next frame uses it.
    </p>
    <Spinning />
  </div>
);

class Spinner extends Mesh {
  frame = get(Frame);
  speed = 1;

  geometry = new BoxGeometry(2, 2, 2);
  material = new MeshBasicMaterial({ color: new Color('tomato') });

  protected new() {
    return this.frame.each((delta) => {
      this.rotation.y += this.speed * delta;
    });
  }
}

class Stage extends Scene {
  spinner = new Spinner();
}

class Eye extends PerspectiveCamera {
  position = new Vector3(0, 0, 6);
}

class Game extends Viewport {
  scene = new Stage();
  camera = new Eye();
}

class Spinning extends Component {
  game = new Game();

  render() {
    const { spinner } = this.game.scene;

    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <div className="controls">
          <button onClick={() => (spinner.speed *= 2)}>Faster</button>
          <span className="speed">{spinner.speed}x</span>
        </div>
      </>
    );
  }
}

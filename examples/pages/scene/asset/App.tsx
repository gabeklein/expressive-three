import { Component } from '@expressive/mvc';
import { Asset, OrthographicCamera, Scene, Viewport } from '@expressive/three';
import { Vector3 } from 'three';

export default () => (
  <div className="container">
    <h1>Asset</h1>
    <p>
      <code>Robot</code> extends <code>Asset</code> and names a glTF file in <code>url</code>. Loading holds the
      node's <code>ready</code>, and an owner is ready once every asset under it has loaded - the scene knows when it
      is complete without any loading state of its own. Each URL loads once; every instance gets its own copy.
    </p>
    <p>
      <code>clip</code> plays a named animation on the viewport's clock - assign it, or unset it to fade back to the
      rest pose.{' '}
      <code>part(name)</code> reaches a named object in the loaded file for per-frame values: Grow scales the head in
      place, silently, and the next frame draws it.
    </p>
    <Showcase />
    <small>
      Assigning another <code>url</code> loads that file and swaps the content in when it arrives.
    </small>
  </div>
);

class Robot extends Asset {
  url = '/models/robot.gltf';
  clip: string | undefined = undefined;
}

class Stage extends Scene {
  robot = new Robot();
}

class Eye extends OrthographicCamera {
  position = new Vector3(0, 0.5, 5);
  top = 3;
  bottom = -3;
}

class Game extends Viewport {
  scene = new Stage();
  camera = new Eye();
}

class Showcase extends Component {
  game = new Game();

  render() {
    const { robot } = this.game.scene;

    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <div className="controls">
          <button onClick={() => (robot.clip = 'Slide')}>Slide</button>
          <button onClick={() => (robot.clip = undefined)}>Stop</button>
          <button onClick={() => robot.part('Head')?.scale.multiplyScalar(1.5)}>Grow</button>
          <span className="status">{robot.loaded ? `loaded, ${robot.clip ?? 'still'}` : 'loading…'}</span>
        </div>
      </>
    );
  }
}

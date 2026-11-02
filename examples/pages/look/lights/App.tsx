import { Component } from '@expressive/mvc';
import { AmbientLight, Frame, get, Mesh, PerspectiveCamera, PointLight, Scene, Viewport } from '@expressive/three';
import { Color, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';

const UP = new Vector3(0, 1, 0);
const FRONT = new Vector3(0, 1, 4);
const COLORS = ['white', 'red', 'blue'];

export default () => (
  <div className="container">
    <h1>Lights</h1>
    <p>
      Lights are nodes, and their settings are members. Assigning <code>intensity</code> or{' '}
      <code>visible</code> dispatches, so the readouts follow. <code>color</code> is live like a vector:
      assigning a <code>Color</code> copies it in and dispatches, while <code>color.set()</code> changes the
      light in place without a dispatch - the light turns green, the readout does not.
    </p>
    <p>
      The lamp orbits by rotating its live <code>position</code> inside <code>frame.each</code>, so motion
      never dispatches. Holding it assigns a position instead - placed, and announced.
    </p>
    <Lighting />
    <small>
      <code>PointLight</code> decays with distance, so its <code>intensity</code> is in candela - about 10 lights
      the ball from three units away.
    </small>
  </div>
);

class Ball extends Mesh {
  geometry = new SphereGeometry(1.5, 64, 32);
  material = new MeshStandardMaterial({ color: new Color('white'), roughness: 0.5 });
}

class Lamp extends PointLight {
  frame = get(Frame);
  orbiting = true;

  intensity = 10;
  position = FRONT;

  hold() {
    this.orbiting = false;
    this.position = FRONT;
  }

  protected new() {
    return this.frame.each((delta) => {
      if (this.orbiting) this.position.applyAxisAngle(UP, delta);
    });
  }
}

class Room extends Scene {
  ball = new Ball();
  fill = new AmbientLight({ intensity: 0.05 });
  lamp = new Lamp();
}

class Eye extends PerspectiveCamera {
  position = new Vector3(0, 0, 6);
}

class Game extends Viewport {
  scene = new Room();
  camera = new Eye();
}

class Lighting extends Component {
  game = new Game();

  render() {
    const { lamp } = this.game.scene;

    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <div className="controls">
          <button onClick={() => (lamp.orbiting ? lamp.hold() : (lamp.orbiting = true))}>
            {lamp.orbiting ? 'Hold in front' : 'Orbit'}
          </button>
          <button onClick={() => (lamp.visible = !lamp.visible)}>{lamp.visible ? 'Switch off' : 'Switch on'}</button>
          <span className="visible">{lamp.visible ? 'on' : 'off'}</span>
        </div>
        <div className="controls">
          <label>
            Intensity{' '}
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={lamp.intensity}
              onInput={(event) => (lamp.intensity = event.currentTarget.valueAsNumber)}
            />
          </label>
          <span className="intensity">{lamp.intensity}</span>
        </div>
        <div className="controls">
          {COLORS.map((name) => (
            <button key={name} onClick={() => (lamp.color = new Color(name))}>
              {name}
            </button>
          ))}
          <button onClick={() => lamp.color.set('lime')}>green, in place</button>
          <span className="color">#{lamp.color.getHexString()}</span>
        </div>
      </>
    );
  }
}

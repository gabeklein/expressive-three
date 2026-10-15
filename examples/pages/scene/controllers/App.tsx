import { Component } from '@expressive/mvc';
import { Frame, get, has, Mesh, PerspectiveCamera, Scene, Model, Viewport } from '@expressive/three';
import { Color, CylinderGeometry, Euler, MeshBasicMaterial, PlaneGeometry, SphereGeometry, Vector3 } from 'three';

const WIDE = 7;
const DEEP = 3.5;
const SPEED = 1.2;
const CALM = new Color('tomato');
const PINGED = new Color('lime');
const BODY = new SphereGeometry(0.35, 24, 16);

export default () => (
  <div className="container">
    <h1>Controllers</h1>
    <p>
      Behaviour does not have to be a 3D object. <code>Spawner</code> and <code>Radar</code> are plain{' '}
      <code>Model</code> classes sitting beside the scene on the <code>Viewport</code>. The spawner reaches
      the clock and the arena with <code>get()</code>, counts frame time in <code>frame.each</code>, and adds
      mobs to the arena's <code>has()</code> pool until it is full. <code>rate</code> and{' '}
      <code>paused</code> are ordinary state - the controls write them, the next frame reads them.
    </p>
    <p>
      The radar's <code>count</code> is a computed getter over the pool's size, so the readout follows
      spawns. Finding the mob nearest the beacon is a method instead: mobs wander by mutating their live{' '}
      <code>position</code>, and transforms do not dispatch - a getter over positions would cache a stale
      answer. Spatial values belong in methods or frame handlers, read on demand. <b>Ping</b> reads every
      position now and tints the nearest mob.
    </p>
    <Controlled />
    <small>
      The clock, the scene and both controllers are one tree reached with <code>get()</code> - no store
      library, no refs.
    </small>
  </div>
);

class Mob extends Mesh {
  frame = get(Frame);

  geometry = BODY;
  material = new MeshBasicMaterial({ color: CALM.clone() });

  protected new() {
    const angle = Math.random() * Math.PI * 2;
    const velocity = new Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(SPEED);

    return this.frame.each((delta) => {
      const { position } = this;

      position.addScaledVector(velocity, delta);

      if (Math.abs(position.x) > WIDE) {
        position.x = Math.sign(position.x) * WIDE;
        velocity.x *= -1;
      }

      if (Math.abs(position.z) > DEEP) {
        position.z = Math.sign(position.z) * DEEP;
        velocity.z *= -1;
      }
    });
  }
}

class Beacon extends Mesh {
  geometry = new CylinderGeometry(0.15, 0.15, 1.2);
  material = new MeshBasicMaterial({ color: new Color('white') });
  position = new Vector3(0, 0.6, 0);
}

class Floor extends Mesh {
  geometry = new PlaneGeometry(WIDE * 2 + 1, DEEP * 2 + 1);
  material = new MeshBasicMaterial({ color: new Color('#262a33') });
  rotation = new Euler(-Math.PI / 2, 0, 0);
}

class Arena extends Scene {
  floor = new Floor();
  beacon = new Beacon();
  mobs = has(Mob);
}

class Spawner extends Model {
  arena = get(Arena);
  frame = get(Frame);

  rate = 2;
  cap = 16;
  paused = false;

  protected new() {
    let waited = 0;

    return this.frame.each((delta) => {
      const { mobs } = this.arena;

      if (this.paused || mobs.size >= this.cap) return;

      waited += delta;

      if (waited >= 1 / this.rate) {
        waited = 0;
        mobs.add({ position: new Vector3(spread(WIDE), 0.35, spread(DEEP)) });
      }
    });
  }
}

class Radar extends Model {
  arena = get(Arena);

  range: number | undefined = undefined;

  get count() {
    return this.arena.mobs.size;
  }

  nearest(point: Vector3) {
    let closest: Mob | undefined;
    let range = Infinity;

    for (const mob of this.arena.mobs) {
      const distance = mob.position.distanceTo(point);

      if (distance < range) {
        closest = mob;
        range = distance;
      }
    }

    return closest;
  }

  ping() {
    const { beacon, mobs } = this.arena;
    const closest = this.nearest(beacon.position);

    for (const mob of mobs) mob.material.color.copy(mob === closest ? PINGED : CALM);

    this.range = closest?.position.distanceTo(beacon.position);
  }
}

class Eye extends PerspectiveCamera {
  position = new Vector3(0, 11, 3);

  protected new() {
    this.lookAt(0, 0, 0);
  }
}

class Game extends Viewport {
  scene = new Arena();
  camera = new Eye();

  spawner = new Spawner();
  radar = new Radar();
}

class Controlled extends Component {
  game = new Game();

  render() {
    const { spawner, radar } = this.game;

    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <div className="controls">
          <button onClick={() => (spawner.paused = !spawner.paused)}>
            {spawner.paused ? 'Resume' : 'Pause'}
          </button>
          <label>
            Rate{' '}
            <input
              type="range"
              min={1}
              max={8}
              value={spawner.rate}
              onInput={(event) => (spawner.rate = Number(event.currentTarget.value))}
            />{' '}
            {spawner.rate}/s
          </label>
          <span className="count">
            {radar.count} / {spawner.cap}
          </span>
          <button onClick={() => radar.ping()}>Ping</button>
          {radar.range !== undefined && <span className="range">nearest {radar.range.toFixed(1)} away</span>}
        </div>
      </>
    );
  }
}

function spread(half: number) {
  return (Math.random() * 2 - 1) * half;
}

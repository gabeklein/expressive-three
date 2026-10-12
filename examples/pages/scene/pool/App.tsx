import { Component } from '@expressive/mvc';
import { Frame, get, has, Mesh, OrthographicCamera, Scene, State, Viewport } from '@expressive/three';
import { BoxGeometry, Color, MeshBasicMaterial, Vector3 } from 'three';

const SLOTS = 6;

export default () => (
  <div className="container">
    <h1>Pool</h1>
    <p>
      <code>Mobs</code> is a plain <code>State</code>, not a node. It owns a <code>has()</code> pool of{' '}
      <code>Mob</code> meshes - ownership is lifetime, and a mob lives as long as the pool holds it.{' '}
      <code>parent</code> is where it draws: Spawn takes an idle mob (or adds one), assigns its{' '}
      <code>position</code> and places it with <code>mob.parent = this.arena</code>. Despawn sets{' '}
      <code>mob.parent = null</code> and puts it back on <code>idle</code>. Nothing is destroyed, so its
      geometry and material stay on the GPU for the next spawn - created only grows when no mob is idle.
    </p>
    <Spawning />
    <small>
      <code>Mobs</code> sits beside the scene, not inside it, so an unplaced mob has no owning node to fall
      back to and draws nowhere. Drawn is <code>arena.children.length</code>, which updates as mobs are
      placed and unplaced.
    </small>
  </div>
);

class Mob extends Mesh {
  frame = get(Frame);

  geometry = new BoxGeometry(1.2, 1.2, 1.2);
  material = new MeshBasicMaterial({ color: new Color('tomato') });

  protected new() {
    return this.frame.each((_, elapsed) => {
      this.position.y = Math.sin(elapsed * 3 + this.position.x) * 0.15;
    });
  }
}

class Arena extends Scene {}

class Eye extends OrthographicCamera {
  top = 3;
  bottom = -3;
  position = new Vector3(0, 0, 10);
}

class Mobs extends State {
  arena = get(Arena);
  pool = has(Mob);
  idle = has<Mob>();

  spawn() {
    const mob = this.idle.pop() || this.pool.add();

    mob.position = slot(this.arena.children.length);
    mob.parent = this.arena;
  }

  despawn() {
    const mob = this.arena.children.at(-1) as Mob;

    mob.parent = null;
    this.idle.push(mob);
  }
}

class Game extends Viewport {
  scene = new Arena();
  camera = new Eye();
  mobs = new Mobs();
}

class Spawning extends Component {
  game = new Game();

  render() {
    const { children } = this.game.scene;
    const { mobs } = this.game;
    const { pool, idle } = mobs;

    return (
      <>
        <canvas className="stage" ref={this.game.canvas} />
        <div className="controls">
          <button disabled={children.length >= SLOTS} onClick={() => mobs.spawn()}>
            Spawn
          </button>
          <button disabled={!children.length} onClick={() => mobs.despawn()}>
            Despawn
          </button>
          <span className="drawn">{children.length} drawn</span>
          <span className="idle">{idle.size} idle</span>
          <span className="created">{pool.size} created</span>
        </div>
      </>
    );
  }
}

function slot(index: number) {
  return new Vector3((index - (SLOTS - 1) / 2) * 2, 0, 0);
}

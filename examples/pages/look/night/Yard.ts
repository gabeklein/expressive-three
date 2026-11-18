import {
  AmbientLight,
  DirectionalLight,
  Frame,
  get,
  Group,
  has,
  Mesh,
  PointLight,
  Scene,
  texture
} from '@expressive/three';
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  Euler,
  Fog,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3
} from 'three';

const NIGHT = '#141826';

const GRASS = texture('/textures/grass.png', {
  colorSpace: SRGBColorSpace,
  wrapS: RepeatWrapping,
  wrapT: RepeatWrapping,
  repeat: new Vector2(8, 8)
});

const BRICKS = texture('/textures/bricks.png', { colorSpace: SRGBColorSpace });
const SKY = texture('/sky.hdr');

const STONE = new BoxGeometry(0.6, 0.8, 0.2);
const SLATE = new MeshStandardMaterial({ color: new Color('#8a8a8a'), roughness: 0.9 });

let seed = 3;
const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

class Ground extends Mesh {
  geometry = new PlaneGeometry(40, 40);
  material = new MeshStandardMaterial({ map: GRASS, roughness: 1 });
  rotation = new Euler(-Math.PI / 2, 0, 0);
  receiveShadow = true;
}

class Walls extends Mesh {
  geometry = new BoxGeometry(4, 2.5, 4);
  material = new MeshStandardMaterial({ map: BRICKS });
  position = new Vector3(0, 1.25, 0);
  castShadow = true;
  receiveShadow = true;
}

class Roof extends Mesh {
  geometry = new ConeGeometry(3.5, 1.5, 4);
  material = new MeshStandardMaterial({ color: new Color('#5a3a2a') });
  position = new Vector3(0, 3.25, 0);
  rotation = new Euler(0, Math.PI / 4, 0);
  castShadow = true;
}

class Porch extends PointLight {
  color = new Color('#ffb070');
  intensity = 6;
  position = new Vector3(0, 2.2, 2.4);
}

class House extends Group {
  walls = new Walls();
  roof = new Roof();
  porch = new Porch();
}

class Grave extends Mesh {
  geometry = STONE;
  material = SLATE;
  castShadow = true;
}

class Orb extends Mesh {
  geometry = new SphereGeometry(0.6, 32, 16);
  material = new MeshStandardMaterial({ color: new Color('white'), metalness: 1, roughness: 0.05 });
  position = new Vector3(3.5, 0.6, 2.5);
  castShadow = true;
}

class Moon extends DirectionalLight {
  color = new Color('#b8c8ff');
  intensity = 2;
  position = new Vector3(5, 7, -4);
  castShadow = true;

  protected new() {
    const { camera } = this.shadow;

    this.shadow.mapSize.set(1024, 1024);
    camera.left = camera.bottom = -15;
    camera.right = camera.top = 15;
    camera.updateProjectionMatrix();
  }
}

class Ghost extends PointLight {
  frame = get(Frame);

  radius = 5;
  speed = 0.5;
  offset = 0;
  intensity = 4;
  distance = 7;

  protected new() {
    return this.frame.each((_, elapsed) => {
      const angle = elapsed * this.speed + this.offset;

      this.position.set(
        Math.cos(angle) * this.radius,
        1 + Math.sin(elapsed * 3 + this.offset) * 0.5,
        Math.sin(angle) * this.radius
      );
    });
  }
}

export class Yard extends Scene {
  background = new Color(NIGHT);
  fog = new Fog(NIGHT, 6, 30);
  environment = SKY;

  ground = new Ground();
  house = new House();
  orb = new Orb();
  moon = new Moon();
  fill = new AmbientLight({ color: new Color('#404860'), intensity: 0.15 });

  graves = has(Grave);

  blue = new Ghost({ color: new Color('#80f0ff'), radius: 5, speed: 0.5 });
  pink = new Ghost({ color: new Color('#ff80c0'), radius: 7, speed: -0.35, offset: 2 });

  protected new() {
    for (let i = 0; i < 24; i++) {
      const angle = random() * Math.PI * 2;
      const reach = 4 + random() * 7;

      this.graves.add({
        position: new Vector3(Math.cos(angle) * reach, 0.35, Math.sin(angle) * reach),
        rotation: new Euler(0, random() * Math.PI, 0)
      });
    }
  }
}

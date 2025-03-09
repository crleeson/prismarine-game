import * as THREE from "three";

const CHUNK_WIDTH = 100;
const CHUNK_DEPTH = 100;
const WATER_HEIGHT = 100; // Increased to 100

export default class Water {
  constructor() {
    this.effect = this.createWaterEffect();
  }

  createWaterEffect() {
    const geometry = new THREE.BoxGeometry(
      CHUNK_WIDTH * 2,
      WATER_HEIGHT * 2,
      CHUNK_DEPTH * 2
    );
    const material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        topColor: { value: new THREE.Color(0x4682b4) },
        bottomColor: { value: new THREE.Color(0x1c2526) },
        fogDensity: { value: 0.05 },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float fogDensity;
        varying vec3 vPosition;
        void main() {
          float t = (vPosition.y + ${WATER_HEIGHT.toFixed(1)}) / ${(
        WATER_HEIGHT * 2
      ).toFixed(1)};
          vec3 color = mix(bottomColor, topColor, t);
          float fog = exp(-fogDensity * (vPosition.y + ${WATER_HEIGHT.toFixed(
            1
          )}));
          color = mix(vec3(0.0, 0.0, 0.1), color, fog);
          gl_FragColor = vec4(color, 0.3);
        }
      `,
    });

    const effect = new THREE.Mesh(geometry, material);
    effect.position.set(0, 0, 0);
    return effect;
  }

  update(delta) {}

  addToScene(scene) {
    scene.add(this.effect);
  }

  removeFromScene(scene) {
    scene.remove(this.effect);
  }

  getHeight() {
    return WATER_HEIGHT;
  }
}

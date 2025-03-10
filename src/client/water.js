import * as THREE from "three";
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_HEIGHT } from "../shared/constants.js";

export default class Water {
  constructor() {
    this.effect = this.createWaterEffect();
    this.surface = this.createWaterSurface(); // New surface
  }

  createWaterEffect() {
    const geometry = new THREE.BoxGeometry(
      CHUNK_WIDTH * 2,
      CHUNK_HEIGHT * 2,
      CHUNK_DEPTH * 2
    );
    const material = new THREE.MeshPhongMaterial({
      color: 0x4682b4,
      transparent: true,
      opacity: 0.1, // Very faint to avoid obscuring
      shininess: 20,
      specular: 0xaaaaaa,
    });
    const effect = new THREE.Mesh(geometry, material);
    effect.position.set(0, 0, 0);
    return effect;
  }

  createWaterSurface() {
    const geometry = new THREE.PlaneGeometry(CHUNK_WIDTH * 2, CHUNK_DEPTH * 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0x4682b4,
      transparent: true,
      opacity: 0.7,
      shininess: 100, // Reflectiveness
      specular: 0xffffff, // White highlights from the sun
      side: THREE.DoubleSide,
    });
    const surface = new THREE.Mesh(geometry, material);
    surface.rotation.x = -Math.PI / 2; // Horizontal plane
    surface.position.set(0, CHUNK_HEIGHT, 0); // At top of chunk
    return surface;
  }

  getHeight() {
    return CHUNK_HEIGHT;
  }

  update(delta) {
    this.surface.position.y = CHUNK_HEIGHT + Math.sin(Date.now() * 0.001) * 0.5;
  }

  addToScene(scene) {
    scene.add(this.effect);
    scene.add(this.surface);
  }

  removeFromScene(scene) {
    scene.remove(this.effect);
    scene.remove(this.surface);
  }
}

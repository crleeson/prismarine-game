import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

const noise2D = createNoise2D();
const CHUNK_WIDTH = 100;
const CHUNK_DEPTH = 100;

export default class Seabed {
  constructor() {
    this.geometry = new THREE.PlaneGeometry(CHUNK_WIDTH, CHUNK_DEPTH, 128, 128);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 1,
      metalness: 0,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = -5; // Base height

    // Generate terrain height using noise
    const position = this.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const height = noise2D(x * 0.05, z * 0.05) * 2; // Adjust height scale
      position.setY(i, height);
    }
    position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  getHeightAt(x, z) {
    // Clamp x, z to chunk boundaries
    x = Math.max(-CHUNK_WIDTH / 2, Math.min(CHUNK_WIDTH / 2, x));
    z = Math.max(-CHUNK_DEPTH / 2, Math.min(CHUNK_DEPTH / 2, z));
    // Use noise to compute height at (x, z)
    const baseHeight = this.mesh.position.y; // -5
    const heightVariation = noise2D(x * 0.05, z * 0.05) * 2;
    return baseHeight + heightVariation;
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
  }
}

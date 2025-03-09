import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

const noise2D = createNoise2D();

const CHUNK_WIDTH = 100;
const CHUNK_DEPTH = 100;
const SEGMENTS = 32;

export default class Seabed {
  constructor() {
    this.mesh = this.createSeabed();
  }

  createSeabed() {
    const geometry = new THREE.PlaneGeometry(
      CHUNK_WIDTH,
      CHUNK_DEPTH,
      SEGMENTS,
      SEGMENTS
    );

    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const height = noise2D(x * 0.02, y * 0.02) * 5;
      vertices[i + 2] = height;

      const colorNoise = noise2D(x * 0.03, y * 0.03) * 0.1;
      const baseColor = new THREE.Color(0xe8cda2);
      const r = Math.min(1, Math.max(0, baseColor.r + colorNoise));
      const g = Math.min(1, Math.max(0, baseColor.g + colorNoise));
      const b = Math.min(1, Math.max(0, baseColor.b + colorNoise));
      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      color: 0xe8cda2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, -5, 0);

    return mesh;
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  getHeightAt(x, z) {
    // Add method for collision
    x = Math.max(-CHUNK_WIDTH / 2, Math.min(CHUNK_WIDTH / 2, x));
    z = Math.max(-CHUNK_DEPTH / 2, Math.min(CHUNK_DEPTH / 2, z));
    const baseHeight = this.mesh.position.y; // -5
    const heightVariation = noise2D(x * 0.02, z * 0.02) * 5;
    return baseHeight + heightVariation;
  }
}

import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  SEABED_SEGMENTS,
  SEABED_BASE_HEIGHT,
  CHUNK_MAX_Y,
} from "../shared/constants.js";

const noise2D = createNoise2D();

export default class Seabed {
  constructor() {
    this.mesh = this.createSeabed();
  }

  createSeabed() {
    const geometry = new THREE.PlaneGeometry(
      CHUNK_WIDTH,
      CHUNK_DEPTH,
      SEABED_SEGMENTS,
      SEABED_SEGMENTS
    );

    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const height = noise2D(x * 0.02, y * 0.02) * 5;
      vertices[i + 2] = height; // Range now 0 to 5 (base at 0)

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

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      color: 0xe8cda2,
      shininess: 30,
      specular: 0x555555,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, SEABED_BASE_HEIGHT, 0);
    mesh.receiveShadow = true;
    return mesh;
  }

  getHeightAt(x, z) {
    x = Math.max(-CHUNK_WIDTH / 2, Math.min(CHUNK_WIDTH / 2, x));
    z = Math.max(-CHUNK_DEPTH / 2, Math.min(CHUNK_DEPTH / 2, z));
    const baseHeight = SEABED_BASE_HEIGHT; // Now 0
    const heightVariation = noise2D(x * 0.02, z * 0.02) * 5;
    return baseHeight + heightVariation; // Range 0 to 5
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  getExactHeightAt(x, z, scene) {
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3(x, CHUNK_MAX_Y + 10, z);
    const direction = new THREE.Vector3(0, -1, 0);
    raycaster.set(origin, direction);
    const intersects = raycaster.intersectObject(this.mesh, false);
    if (intersects.length > 0) {
      console.log(`Raycast hit at ${intersects[0].point.y} for x:${x}, z:${z}`);
      return intersects[0].point.y;
    }
    const fallbackHeight = this.getHeightAt(x, z);
    console.warn(`Raycast failed, fallback height: ${fallbackHeight}`);
    return fallbackHeight;
  }
}

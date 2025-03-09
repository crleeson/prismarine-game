import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

const noise2D = createNoise2D();
const CHUNK_WIDTH = 100;
const CHUNK_DEPTH = 100;

export default class Decorations {
  constructor() {
    this.rocks = [];
    this.bunches = [];
    this.initRocks();
    this.initBunches();
  }

  initRocks() {
    const largeRockCount = 8;
    const largeRockPositions = [];
    for (let i = 0; i < largeRockCount; i++) {
      const size = Math.random() * 3 + 2;
      const geometry = new THREE.DodecahedronGeometry(size, 0);
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 });
      const rock = new THREE.Mesh(geometry, material);
      const x = (Math.random() - 0.5) * CHUNK_WIDTH * 0.8;
      const z = (Math.random() - 0.5) * CHUNK_DEPTH * 0.8;
      rock.position.set(x, -5 - size / 2, z);
      this.rocks.push(rock);
      largeRockPositions.push({ x, z });
    }

    const smallRockCount = 60;
    for (let i = 0; i < smallRockCount; i++) {
      const size = Math.random() * 0.5 + 0.2;
      const geometry = new THREE.DodecahedronGeometry(size, 0);
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 });
      const rock = new THREE.Mesh(geometry, material);
      const nearRock =
        largeRockPositions[
          Math.floor(Math.random() * largeRockPositions.length)
        ];
      const offsetX = (Math.random() - 0.5) * 5;
      const offsetZ = (Math.random() - 0.5) * 5;
      rock.position.set(
        nearRock.x + offsetX,
        -5 - size / 2,
        nearRock.z + offsetZ
      );
      this.rocks.push(rock);
    }
  }

  initBunches() {
    const bunchCount = 4;
    const colors = [0xff4040, 0xff69b4, 0x1e90ff, 0xffd700, 0xda70d6];
    for (let i = 0; i < bunchCount; i++) {
      const group = new THREE.Group();
      const coralCount = Math.floor(Math.random() * 16) + 15;
      for (let j = 0; j < coralCount; j++) {
        const type = Math.floor(Math.random() * 3);
        let coral;
        const coralColor = colors[Math.floor(Math.random() * colors.length)];
        if (type === 0) {
          // Tube
          const height = Math.random() * 3 + 2;
          const geometry = new THREE.BoxGeometry(0.5, height, 0.5);
          const material = new THREE.MeshStandardMaterial({
            color: coralColor,
            emissive: coralColor,
            emissiveIntensity: 0.5, // Subtle glow
          });
          coral = new THREE.Mesh(geometry, material);
          coral.position.set(
            (Math.random() - 0.5) * 5,
            height / 2 - 5,
            (Math.random() - 0.5) * 5
          );
        } else if (type === 1) {
          // Branch
          const length = Math.random() * 2 + 1;
          const geometry = new THREE.BoxGeometry(0.3, length, 0.3);
          const material = new THREE.MeshStandardMaterial({
            color: coralColor,
            emissive: coralColor,
            emissiveIntensity: 0.5,
          });
          coral = new THREE.Mesh(geometry, material);
          coral.position.set(
            (Math.random() - 0.5) * 5,
            length / 2 - 5,
            (Math.random() - 0.5) * 5
          );
          coral.rotation.y = Math.random() * Math.PI;
          coral.rotation.z = (Math.random() - 0.5) * 0.5;
        } else {
          // Fan
          const width = Math.random() * 2 + 1;
          const height = Math.random() * 1 + 0.5;
          const geometry = new THREE.BoxGeometry(width, height, 0.2);
          const material = new THREE.MeshStandardMaterial({
            color: coralColor,
            emissive: coralColor,
            emissiveIntensity: 0.5,
          });
          coral = new THREE.Mesh(geometry, material);
          coral.position.set(
            (Math.random() - 0.5) * 5,
            height / 2 - 5,
            (Math.random() - 0.5) * 5
          );
          coral.rotation.y = Math.random() * Math.PI;
        }
        coral.userData.color = coral.material.color;
        group.add(coral);
      }
      group.position.set(
        (Math.random() - 0.5) * CHUNK_WIDTH * 0.7,
        0,
        (Math.random() - 0.5) * CHUNK_DEPTH * 0.7
      );
      this.bunches.push(group);
    }
  }

  update(delta) {
    this.bunches.forEach((group) => {
      group.children.forEach((coral) => {
        coral.rotation.z =
          Math.sin(Date.now() * 0.001 + coral.position.x) * 0.1; // Subtle swaying
      });
    });
  }

  addToScene(scene) {
    this.rocks.forEach((rock) => scene.add(rock));
    this.bunches.forEach((bunch) => scene.add(bunch));
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft ambient light
    scene.add(ambientLight);
  }

  removeFromScene(scene) {
    this.rocks.forEach((rock) => scene.remove(rock));
    this.bunches.forEach((bunch) => scene.remove(bunch));
  }
}

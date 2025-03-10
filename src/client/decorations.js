// src/client/decorations.js
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_MIN_X,
  CHUNK_MAX_X,
  CHUNK_MIN_Y,
  CHUNK_MAX_Y,
  CHUNK_MIN_Z,
  CHUNK_MAX_Z,
  LARGE_ROCK_COUNT,
  SMALL_ROCK_COUNT,
  BUNCH_COUNT,
  CORAL_COUNT_MIN,
  CORAL_COUNT_RANGE,
  DECORATION_BASE_HEIGHT,
} from "../shared/constants.js";

const noise2D = createNoise2D();

export default class Decorations {
  constructor() {
    this.rocks = [];
    this.bunches = [];
    this.initRocks();
    this.initBunches();
  }

  initRocks() {
    const largeRockCount = LARGE_ROCK_COUNT; // Replaced 8
    const largeRockPositions = [];
    for (let i = 0; i < largeRockCount; i++) {
      const size = Math.random() * 3 + 2;
      const geometry = new THREE.DodecahedronGeometry(size, 0);
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 });
      const rock = new THREE.Mesh(geometry, material);
      let x = (Math.random() - 0.5) * CHUNK_WIDTH * 0.8;
      let z = (Math.random() - 0.5) * CHUNK_DEPTH * 0.8;
      x = Math.max(CHUNK_MIN_X, Math.min(CHUNK_MAX_X, x));
      z = Math.max(CHUNK_MIN_Z, Math.min(CHUNK_MAX_Z, z));
      rock.position.set(x, DECORATION_BASE_HEIGHT - size / 2, z);
      this.rocks.push(rock);
      largeRockPositions.push({ x, z });
    }

    const smallRockCount = SMALL_ROCK_COUNT; // Replaced 60
    for (let i = 0; i < smallRockCount; i++) {
      const size = Math.random() * 0.5 + 0.2;
      const geometry = new THREE.DodecahedronGeometry(size, 0);
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 });
      const rock = new THREE.Mesh(geometry, material);
      const nearRock =
        largeRockPositions[
          Math.floor(Math.random() * largeRockPositions.length)
        ];
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetZ = (Math.random() - 0.5) * 10;
      let x = nearRock.x + offsetX;
      let z = nearRock.z + offsetZ;
      x = Math.max(CHUNK_MIN_X, Math.min(CHUNK_MAX_X, x));
      z = Math.max(CHUNK_MIN_Z, Math.min(CHUNK_MAX_Z, z));
      rock.position.set(x, DECORATION_BASE_HEIGHT - size / 2, z);
      this.rocks.push(rock);
    }
  }

  initBunches() {
    const bunchCount = BUNCH_COUNT; // 4
    const colors = [0xff4040, 0xff69b4, 0x1e90ff, 0xffd700, 0xda70d6];
    for (let i = 0; i < bunchCount; i++) {
      const group = new THREE.Group();
      const coralCount =
        Math.floor(Math.random() * CORAL_COUNT_RANGE) + CORAL_COUNT_MIN; // 15 to 30
      for (let j = 0; j < coralCount; j++) {
        const type = Math.floor(Math.random() * 3);
        let coral;
        const coralColor = colors[Math.floor(Math.random() * colors.length)];

        if (type === 0) {
          // Tall coral (cylinder)
          const height = Math.random() * 3 + 2;
          const geometry = new THREE.CylinderGeometry(0.2, 0.2, height, 8);
          const material = new THREE.MeshBasicMaterial({ color: coralColor });
          coral = new THREE.Mesh(geometry, material);
          coral.position.set(
            (Math.random() - 0.5) * 5,
            height / 2 + DECORATION_BASE_HEIGHT,
            (Math.random() - 0.5) * 5
          );
        } else if (type === 1) {
          // Long tube coral (horizontal cylinder)
          const length = Math.random() * 2 + 1;
          const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
          const material = new THREE.MeshBasicMaterial({ color: coralColor });
          coral = new THREE.Mesh(geometry, material);
          coral.rotation.z = Math.PI / 2; // Horizontal
          coral.position.set(
            (Math.random() - 0.5) * 5,
            length / 2 + DECORATION_BASE_HEIGHT,
            (Math.random() - 0.5) * 5
          );
        } else {
          // Fan coral (plane)
          const width = Math.random() * 2 + 1;
          const height = Math.random() * 1 + 0.5;
          const geometry = new THREE.PlaneGeometry(width, height);
          const material = new THREE.MeshBasicMaterial({
            color: coralColor,
            side: THREE.DoubleSide,
          });
          coral = new THREE.Mesh(geometry, material);
          coral.rotation.x = Math.PI / 2; // Flat on seabed
          coral.position.set(
            (Math.random() - 0.5) * 5,
            height / 2 + DECORATION_BASE_HEIGHT,
            (Math.random() - 0.5) * 5
          );
        }

        group.add(coral); // Add coral to the group
      }
      let x = (Math.random() - 0.5) * CHUNK_WIDTH * 0.7;
      let z = (Math.random() - 0.5) * CHUNK_DEPTH * 0.7;
      x = Math.max(CHUNK_MIN_X, Math.min(CHUNK_MAX_X, x));
      z = Math.max(CHUNK_MIN_Z, Math.min(CHUNK_MAX_Z, z));
      group.position.set(x, 0, z);
      this.bunches.push(group);
    }
  }

  update(delta) {
    this.bunches.forEach((group) => {
      group.position.x = Math.max(
        CHUNK_MIN_X,
        Math.min(CHUNK_MAX_X, group.position.x)
      );
      group.position.y = Math.max(
        CHUNK_MIN_Y,
        Math.min(CHUNK_MAX_Y, group.position.y)
      );
      group.position.z = Math.max(
        CHUNK_MIN_Z,
        Math.min(CHUNK_MAX_Z, group.position.z)
      );

      group.children.forEach((coral) => {
        coral.rotation.z =
          Math.sin(Date.now() * 0.001 + coral.position.x) * 0.1; // Subtle swaying
        const worldPos = coral.getWorldPosition(new THREE.Vector3());
        const groupPos = group.position.clone();
        if (
          worldPos.x < -50 ||
          worldPos.x > 50 ||
          worldPos.z < -50 ||
          worldPos.z > 50 ||
          worldPos.y < 0 ||
          worldPos.y > 100
        ) {
          coral.position.x = Math.max(-5, Math.min(5, coral.position.x));
          coral.position.z = Math.max(-5, Math.min(5, coral.position.z));
          coral.position.y = Math.max(-5, Math.min(5, coral.position.y));
        }
      });
    });

    this.rocks.forEach((rock) => {
      rock.position.x = Math.max(
        CHUNK_MIN_X,
        Math.min(CHUNK_MAX_X, rock.position.x)
      );
      rock.position.y = Math.max(
        DECORATION_BASE_HEIGHT,
        Math.min(CHUNK_MAX_Y, rock.position.y)
      );
      rock.position.z = Math.max(
        CHUNK_MIN_Z,
        Math.min(CHUNK_MAX_Z, rock.position.z)
      );
    });
  }

  addToScene(scene) {
    this.rocks.forEach((rock) => scene.add(rock));
    this.bunches.forEach((bunch) => scene.add(bunch));
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
  }

  removeFromScene(scene) {
    this.rocks.forEach((rock) => scene.remove(rock));
    this.bunches.forEach((bunch) => scene.remove(bunch));
  }
}

// src/client/decorations.js
import * as THREE from "three";
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

export default class Decorations {
  constructor(seabed, scene) {
    this.seabed = seabed;
    this.scene = scene;
    this.rocks = [];
    this.bunches = [];
    this.initRocks();
    this.initBunches();
  }

  initRocks() {
    this.rocks = []; // Clear existing rocks
    const formationCount = 5; // Number of rock clusters (adjustable)
    const rockTypes = [
      THREE.DodecahedronGeometry,
      THREE.IcosahedronGeometry,
      THREE.OctahedronGeometry,
    ];
    const colors = [0x999999, 0x777777, 0x555555, 0x888888];

    for (let i = 0; i < formationCount; i++) {
      const centerX = (Math.random() - 0.5) * CHUNK_WIDTH * 0.8;
      const centerZ = (Math.random() - 0.5) * CHUNK_DEPTH * 0.8;
      const seabedHeight = this.seabed.getExactHeightAt(
        centerX,
        centerZ,
        this.scene
      );

      // 1-2 Big Rocks
      const bigRockCount = Math.random() < 0.5 ? 1 : 2;
      for (let j = 0; j < bigRockCount; j++) {
        const size = Math.random() * 2 + 3; // 3-5 units
        const GeometryType =
          rockTypes[Math.floor(Math.random() * rockTypes.length)];
        const geometry = new GeometryType(size, 0);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.MeshPhongMaterial({
          color: color,
          shininess: 10,
          specular: 0x333333,
        });
        const rock = new THREE.Mesh(geometry, material);
        const offsetX = (Math.random() - 0.5) * 5; // Tight cluster
        const offsetZ = (Math.random() - 0.5) * 5;
        rock.position.set(
          Math.max(CHUNK_MIN_X, Math.min(CHUNK_MAX_X, centerX + offsetX)),
          seabedHeight + size,
          Math.max(CHUNK_MIN_Z, Math.min(CHUNK_MAX_Z, centerZ + offsetZ))
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        this.rocks.push(rock);
      }

      // 2-3 Medium Rocks
      const mediumRockCount = Math.random() < 0.5 ? 2 : 3;
      for (let j = 0; j < mediumRockCount; j++) {
        const size = Math.random() * 1 + 1.5; // 1.5-2.5 units
        const GeometryType =
          rockTypes[Math.floor(Math.random() * rockTypes.length)];
        const geometry = new GeometryType(size, 0);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.MeshPhongMaterial({
          color: color,
          shininess: 10,
          specular: 0x333333,
        });
        const rock = new THREE.Mesh(geometry, material);
        const offsetX = (Math.random() - 0.5) * 8; // Slightly wider spread
        const offsetZ = (Math.random() - 0.5) * 8;
        rock.position.set(
          Math.max(CHUNK_MIN_X, Math.min(CHUNK_MAX_X, centerX + offsetX)),
          seabedHeight + size,
          Math.max(CHUNK_MIN_Z, Math.min(CHUNK_MAX_Z, centerZ + offsetZ))
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        this.rocks.push(rock);
      }

      // 5-6 Small Rocks
      const smallRockCount = Math.random() < 0.5 ? 5 : 6;
      for (let j = 0; j < smallRockCount; j++) {
        const size = Math.random() * 0.5 + 0.3; // 0.3-0.8 units
        const GeometryType =
          rockTypes[Math.floor(Math.random() * rockTypes.length)];
        const geometry = new GeometryType(size, 0);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.MeshPhongMaterial({
          color: color,
          shininess: 10,
          specular: 0x333333,
        });
        const rock = new THREE.Mesh(geometry, material);
        const offsetX = (Math.random() - 0.5) * 10; // Wider spread
        const offsetZ = (Math.random() - 0.5) * 10;
        rock.position.set(
          Math.max(CHUNK_MIN_X, Math.min(CHUNK_MAX_X, centerX + offsetX)),
          seabedHeight + size,
          Math.max(CHUNK_MIN_Z, Math.min(CHUNK_MAX_Z, centerZ + offsetZ))
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        this.rocks.push(rock);
      }
    }
  }

  initBunches() {
    const bunchCount = BUNCH_COUNT;
    const colors = [0xff4040, 0xff69b4, 0x1e90ff, 0xffd700, 0xda70d6];
    for (let i = 0; i < bunchCount; i++) {
      const group = new THREE.Group();
      const coralCount =
        Math.floor(Math.random() * CORAL_COUNT_RANGE) + CORAL_COUNT_MIN;
      for (let j = 0; j < coralCount; j++) {
        const width = Math.random() * 0.3 + 0.2;
        const depth = Math.random() * 0.3 + 0.2;
        const height = Math.random() * 3 + 2;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const coralColor = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.MeshPhongMaterial({
          color: coralColor,
          shininess: 50,
          specular: 0xffffff,
          emissive: coralColor,
          emissiveIntensity: 0.5, // Increased from 0.2 for stronger glow
        });
        const coral = new THREE.Mesh(geometry, material);
        coral.position.set(
          (Math.random() - 0.5) * 5,
          height / 2 + DECORATION_BASE_HEIGHT,
          (Math.random() - 0.5) * 5
        );
        coral.rotation.y = Math.random() * Math.PI;
        coral.castShadow = true;
        coral.receiveShadow = true;
        group.add(coral);

        // Optional: Add point light for extra glow
        const glowLight = new THREE.PointLight(coralColor, 0.5, 5); // Intensity 0.5, distance 5
        glowLight.position.copy(coral.position);
        group.add(glowLight);
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
    this.scene = scene; // Store scene reference
    this.rocks = []; // Clear rocks to re-init
    this.initRocks(); // Call here after seabed is in scene
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

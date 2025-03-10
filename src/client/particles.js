import * as THREE from "three";
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_HEIGHT,
  CHUNK_MIN_X,
  CHUNK_MAX_X,
  CHUNK_MIN_Y,
  CHUNK_MAX_Y,
  CHUNK_MIN_Z,
  CHUNK_MAX_Z,
  PARTICLE_DENSITY,
  PARTICLE_SIZE,
  BASE_PARTICLE_SPEED,
} from "../shared/constants.js";

export default class Particles {
  constructor() {
    this.particles = [];
    this.geometry = new THREE.PlaneGeometry(PARTICLE_SIZE, PARTICLE_SIZE);
    this.material = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.initParticles();
  }

  initParticles() {
    const volume = CHUNK_WIDTH * CHUNK_DEPTH * CHUNK_HEIGHT;
    const count = Math.floor(volume * PARTICLE_DENSITY);
    for (let i = 0; i < count; i++) {
      const particle = new THREE.Mesh(this.geometry, this.material.clone());
      this.resetParticle(particle);
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      )
        .normalize()
        .multiplyScalar(BASE_PARTICLE_SPEED * 0.5); // Increased from 0.1 to 0.5
      particle.userData.fadeRate = 0.001;
      this.particles.push(particle);
    }
  }

  resetParticle(particle) {
    particle.position.set(
      CHUNK_MIN_X + Math.random() * CHUNK_WIDTH,
      CHUNK_MIN_Y + Math.random() * CHUNK_HEIGHT,
      CHUNK_MIN_Z + Math.random() * CHUNK_DEPTH
    );
    particle.material.opacity = 0.8;
  }

  update(delta, camera) {
    this.particles.forEach((particle) => {
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(delta)
      );
      particle.material.opacity = 0.8 + Math.sin(Date.now() * 0.001) * 0.2; // Shimmer effect

      // Confine to chunk
      particle.position.x = Math.max(
        CHUNK_MIN_X,
        Math.min(CHUNK_MAX_X, particle.position.x)
      );
      particle.position.y = Math.max(
        CHUNK_MIN_Y,
        Math.min(CHUNK_MAX_Y, particle.position.y)
      );
      particle.position.z = Math.max(
        CHUNK_MIN_Z,
        Math.min(CHUNK_MAX_Z, particle.position.z)
      );

      particle.lookAt(camera.position); // Face camera for 2D effect
    });
  }

  addToScene(scene) {
    this.particles.forEach((particle) => scene.add(particle));
  }
}

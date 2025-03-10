import * as THREE from "three";
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_HEIGHT,
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
        (Math.random() - 0.3) * 0.5,
        (Math.random() - 0.5) * 0.5
      )
        .normalize()
        .multiplyScalar(BASE_PARTICLE_SPEED * Math.random());
    }
  }

  resetParticle(particle) {
    particle.position.set(
      (Math.random() - 0.5) * CHUNK_WIDTH,
      Math.random() * CHUNK_HEIGHT - CHUNK_HEIGHT / 2, // Adjusted for centering
      (Math.random() - 0.5) * CHUNK_DEPTH
    );
    particle.material.opacity = 0.8;
  }

  update(delta, camera) {
    this.particles.forEach((particle) => {
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(delta * 60)
      ); // Fixed delta scaling
      particle.material.opacity -= particle.userData.fadeRate * delta;
      particle.material.opacity = Math.max(0, particle.material.opacity);

      particle.lookAt(camera.position);

      if (particle.material.opacity <= 0) {
        this.resetParticle(particle);
      }
    });
  }

  addToScene(scene) {
    this.particles.forEach((particle) => scene.add(particle));
  }
}

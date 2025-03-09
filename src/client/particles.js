import * as THREE from "three";

const CHUNK_WIDTH = 100;
const CHUNK_DEPTH = 100;
const CHUNK_HEIGHT = 100; // Increased to 100
const PARTICLE_DENSITY = 0.00046875; // 10% of 0.0046875
const PARTICLE_SIZE = 0.2;
const BASE_SPEED = 0.0075;

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
        .multiplyScalar(BASE_SPEED * Math.random());
      particle.userData.fadeRate = 0.8 / (10000 + Math.random() * 5000);
      this.particles.push(particle);
    }
  }

  resetParticle(particle) {
    particle.position.set(
      (Math.random() - 0.5) * CHUNK_WIDTH,
      Math.random() * CHUNK_HEIGHT - 50, // Adjusted for new height
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

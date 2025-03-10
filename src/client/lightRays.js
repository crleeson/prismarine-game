// src/client/lightRays.js
import * as THREE from "three";

export default class LightRays {
  constructor(scene, waterHeight) {
    this.scene = scene;
    this.waterHeight = waterHeight || 5; // Default water height
    this.rayGroup = new THREE.Group();
    this.time = 0;
    this.init();
  }

  init() {
    const rayCount = 10;
    const rayGeometry = new THREE.CylinderGeometry(0.05, 0.1, 10, 8); // Thin, tapering rays
    const rayMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < rayCount; i++) {
      const ray = new THREE.Mesh(rayGeometry, rayMaterial);
      const x = (Math.random() - 0.5) * 50; // Spread across chunk
      const z = (Math.random() - 0.5) * 50;
      ray.position.set(x, this.waterHeight - 5, z); // Start at water surface, extend down
      ray.rotation.z = Math.random() * 0.1 - 0.05; // Slight tilt
      this.rayGroup.add(ray);
    }

    this.scene.add(this.rayGroup);
  }

  update(delta) {
    this.time += delta;
    this.rayGroup.children.forEach((ray, index) => {
      // Subtle swaying motion
      const sway = Math.sin(this.time + index) * 0.02;
      ray.position.x += sway;
      ray.rotation.z = sway * 0.5;
    });
  }

  dispose() {
    this.rayGroup.children.forEach((ray) => {
      ray.geometry.dispose();
      ray.material.dispose();
    });
    this.scene.remove(this.rayGroup);
  }
}

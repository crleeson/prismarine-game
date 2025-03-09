import * as THREE from "three";

export default class Effects {
  constructor(controls, player) {
    this.controls = controls;
    this.player = player;
    this.maxSpeed = this.controls.maxSpeed;
    this.particles = [];
    this.init();
  }

  init() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
  }

  addSpeedParticle() {
    const speedFactor = this.controls.speed / this.maxSpeed;
    const spawnX = Math.random() * window.innerWidth;
    const spawnY = Math.random() * window.innerHeight;

    // Calculate direction based on player's velocity
    const velocity = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this.player.object.quaternion
    );
    velocity.multiplyScalar(this.controls.speed);
    const angle = Math.atan2(velocity.z, velocity.x); // Direction of movement in screen space

    this.particles.push({
      x: spawnX,
      y: spawnY,
      size: 2 + speedFactor * 2,
      speed: 5 + speedFactor * 15,
      opacity: 0.5 + speedFactor * 0.3,
      angle: angle + Math.PI, // Opposite direction (front to rear)
    });
  }

  addDashBurst() {
    const speedFactor = this.controls.speed / this.maxSpeed;
    for (let i = 0; i < 10; i++) {
      // Reduced from 20 to 10 (0.5x)
      const spawnX = Math.random() * window.innerWidth;
      const spawnY = Math.random() * window.innerHeight;
      const velocity = new THREE.Vector3(0, 0, 1).applyQuaternion(
        this.player.object.quaternion
      );
      velocity.multiplyScalar(this.controls.speed);
      const angle = Math.atan2(velocity.z, velocity.x);
      this.particles.push({
        x: spawnX,
        y: spawnY,
        size: 3 + speedFactor * 3,
        speed: 10 + speedFactor * 10,
        opacity: 0.8,
        angle: angle + Math.PI,
      });
    }
  }

  update(delta) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const speedFactor = this.controls.speed / this.maxSpeed;
    if (this.controls.speed > this.maxSpeed * 0.1) {
      if (Math.random() < 0.05 * speedFactor) this.addSpeedParticle(); // Reduced from 0.1 to 0.05 (0.5x)
    }

    if (this.controls.isDashing) {
      if (Math.random() < 0.1 * speedFactor) this.addSpeedParticle(); // Reduced from 0.2 to 0.1 (0.5x)
    }

    this.particles = this.particles.filter((p) => p.opacity > 0);
    this.particles.forEach((p) => {
      p.x += Math.cos(p.angle) * p.speed * delta * 60;
      p.y += Math.sin(p.angle) * p.speed * delta * 60;
      p.opacity -= 0.02 * delta * 60;

      this.ctx.fillStyle = `rgba(135, 206, 235, ${p.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  onDash() {
    this.addDashBurst();
  }
}

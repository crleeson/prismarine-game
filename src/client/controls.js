import * as THREE from "three";

export default class Controls {
  constructor(player, scene) {
    this.player = player;
    this.scene = scene;
    this.speed = 0;
    this.maxSpeed = 10;
    this.strafeSpeed = 5;
    this.keys = {
      w: false,
      s: false,
      a: false,
      d: false,
      space: false,
    };
    this.mouseDelta = new THREE.Vector2();
    this.isDashing = false;
    this.dashCooldown = 0;
    this.dashDuration = 0; // Tracks dash duration
    this.dashSpeed = this.maxSpeed * 2; // Burst speed
    this.yaw = 0;
    this.pitch = 0;
    this.isAttacking = false; // For attack state
    this.init();
  }

  init() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "w" || e.key === "ArrowUp") this.keys.w = true;
      if (e.key === "s" || e.key === "ArrowDown") this.keys.s = true;
      if (e.key === "a" || e.key === "ArrowLeft") this.keys.a = true;
      if (e.key === "d" || e.key === "ArrowRight") this.keys.d = true;
      if (e.key === " ") this.keys.space = true;
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "w" || e.key === "ArrowUp") this.keys.w = false;
      if (e.key === "s" || e.key === "ArrowDown") this.keys.s = false;
      if (e.key === "a" || e.key === "ArrowLeft") this.keys.a = false;
      if (e.key === "d" || e.key === "ArrowRight") this.keys.d = false;
      if (e.key === " ") this.keys.space = false;
    });

    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement) {
        this.mouseDelta.x =
          e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        this.mouseDelta.y =
          e.movementY || e.mozMovementY || e.webkitMovementY || 0;
      }
    });

    document.addEventListener("mousedown", (e) => {
      if (e.button === 0 && document.pointerLockElement) {
        // Left click
        this.isAttacking = true;
      }
    });

    document.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.isAttacking = false;
      }
    });

    document.addEventListener("click", () => {
      if (document.pointerLockElement && this.dashCooldown <= 0) {
        this.keys.space = true; // Trigger dash on click
      }
    });
  }

  update(delta) {
    if (!this.player.object) return;

    // Speed control (W/S, no reverse)
    if (this.keys.w) {
      this.speed = Math.min(this.speed + delta * 5, this.maxSpeed);
    }
    if (this.keys.s) {
      this.speed = Math.max(this.speed - delta * 10, 0);
    }
    if (!this.keys.w && !this.keys.s && !this.isDashing) {
      this.speed = Math.max(this.speed - delta * 5, 0);
    }

    // Dash logic
    if (this.keys.space && !this.isDashing && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashDuration = 0.5; // Dash lasts 0.5s
      this.dashCooldown = 2; // 2s cooldown
      this.speed = this.dashSpeed; // Set to dash speed
    }

    if (this.isDashing) {
      this.dashDuration -= delta;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
        this.speed = Math.min(this.speed, this.maxSpeed); // Decay to maxSpeed after dash
      }
    }

    this.dashCooldown = Math.max(0, this.dashCooldown - delta);

    // Steering with mouse (rotation via quaternion)
    const sensitivity = 0.001;
    this.yaw -= this.mouseDelta.x * sensitivity;
    this.pitch += this.mouseDelta.y * sensitivity;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    this.yaw = this.yaw % (2 * Math.PI);
    if (this.yaw < 0) this.yaw += 2 * Math.PI;

    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    this.player.object.quaternion.copy(quaternion);

    // Move player based on facing direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.player.object.quaternion
    );
    this.player.object.position.add(forward.multiplyScalar(this.speed * delta));

    // Disable A/D movement by ignoring strafe
    this.mouseDelta.set(0, 0);

    // Pass isAttacking to player via update (avoid direct property access)
    this.player.update(delta, { isAttacking: this.isAttacking });
  }

  getDebugInfo() {
    return {
      speed: this.speed.toFixed(2),
      dashCooldown: this.dashCooldown.toFixed(2),
      isAttacking: this.isAttacking,
      isDashing: this.isDashing,
    };
  }
}

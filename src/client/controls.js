import * as THREE from "three";
import {
  DEFAULT_MAX_SPEED,
  STRAFE_SPEED,
  DASH_DURATION,
  DASH_COOLDOWN,
  POST_DASH_DECAY,
  SPEED_ACCELERATION,
  SPEED_DECELERATION,
  SPEED_IDLE_DECELERATION,
  MOUSE_SENSITIVITY,
  DASH_XP_THRESHOLD,
} from "../shared/constants.js";

export default class Controls {
  constructor(player, scene, room) {
    this.player = player;
    this.scene = scene;
    this.room = room; // Store room reference
    this.speed = 0;
    this.maxSpeed = DEFAULT_MAX_SPEED;
    this.strafeSpeed = STRAFE_SPEED;
    this.keys = { w: false, s: false, a: false, d: false, space: false };
    this.mouseDelta = new THREE.Vector2();
    this.isDashing = false;
    this.dashCooldown = 0;
    this.dashDuration = 0;
    this.dashSpeed = 0;
    this.postDashDecay = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.isAttacking = false;
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
        this.keys.space = true;
      }
    });
  }

  update(delta) {
    const sensitivity = MOUSE_SENSITIVITY;
    const yawDelta = -this.mouseDelta.x * sensitivity;
    const pitchDelta = this.mouseDelta.y * sensitivity;

    if (!this.player.object) return;

    const tierData = this.player.fishData?.fishTiers.find(
      (tier) => tier.tier === this.player.tier
    );
    if (tierData) {
      this.maxSpeed = tierData.defaultFish.stats.speed;
      this.dashSpeed = tierData.defaultFish.stats.dashSpeed;
    }

    if (this.keys.w) {
      this.speed = Math.min(
        this.speed + delta * SPEED_ACCELERATION,
        this.maxSpeed
      );
    }
    if (this.keys.s) {
      this.speed = Math.max(this.speed - delta * SPEED_DECELERATION, 0);
    }

    const xpThreshold = tierData?.defaultFish.stats.xpThreshold || 0;
    const minXpToDash = xpThreshold * DASH_XP_THRESHOLD;
    const canDash = (this.player.stats?.xp || 0) >= minXpToDash;

    if (this.keys.space && canDash) {
      if (!this.isDashing) {
        this.isDashing = true;
        this.room.send("startDash");
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
          this.player.object.quaternion
        );
        this.player.velocityY = forward.y * this.dashSpeed; // Add vertical component
      }
      this.speed = this.dashSpeed;
    } else {
      if (this.isDashing) {
        this.isDashing = false;
        this.room.send("endDash");
      }
      this.speed = Math.min(this.speed, this.maxSpeed);
    }

    if (!this.keys.w && !this.keys.s && !this.isDashing) {
      this.speed = Math.max(this.speed - delta * SPEED_IDLE_DECELERATION, 0);
    }

    // Smooth rotation with damping
    this.yaw += yawDelta * 0.1; // Reduced impact for smoother turns
    this.pitch += pitchDelta * 0.1;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    this.yaw = this.yaw % (2 * Math.PI);
    if (this.yaw < 0) this.yaw += 2 * Math.PI;

    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
    this.player.object.quaternion.slerp(quaternion, 0.1);

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this.player.object.quaternion
    );
    this.player.object.position.add(forward.multiplyScalar(this.speed * delta));

    this.mouseDelta.set(0, 0);
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

import * as THREE from "three";

export default class Plankton {
  constructor(scene, player, seabed) {
    this.scene = scene;
    this.player = player;
    this.seabed = seabed;
    this.plankton = [];
    this.fishData = null;
    this.density = 0.00005;
    this.sizeRange = [0.1, 0.3];
    this.xpRange = [5, 15];
    this.loadFishData().then(() => this.init());
  }

  async loadFishData() {
    try {
      const response = await fetch("/fishData.json");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.fishData = await response.json();
      this.density = this.fishData.plankton.base.density;
      this.sizeRange = this.fishData.plankton.base.sizeRange;
      this.xpRange = this.fishData.plankton.base.xpRange;
      console.log("Loaded fishData for plankton:", this.fishData);
    } catch (error) {
      console.error("Error loading fishData.json:", error);
    }
  }

  init() {
    if (!this.fishData) {
      console.warn("fishData not loaded for plankton, cannot init");
      return;
    }

    const numPlankton = Math.floor(
      window.innerWidth * window.innerHeight * this.density
    );
    for (let i = 0; i < numPlankton; i++) {
      const geometry = new THREE.DodecahedronGeometry(1, 0);
      const xp =
        Math.random() * (this.xpRange[1] - this.xpRange[0]) + this.xpRange[0];
      const scale =
        Math.random() * (this.sizeRange[1] - this.sizeRange[0]) +
        this.sizeRange[0];
      const color = new THREE.Color(
        `hsl(${Math.random() * 90 + 150}, 100%, 50%)`
      );
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: 0x00ff00,
        shininess: 100,
        specular: 0xffffff,
      });
      const plankton = new THREE.Mesh(geometry, material);
      plankton.scale.set(scale, scale, scale);
      plankton.position.set(
        Math.random() * 100 - 50,
        Math.random() * 90 + 10,
        Math.random() * 100 - 50
      );
      plankton.userData = { hp: 1, xp: xp, size: scale };
      plankton.rotationSpeed = Math.random() * 0.1;
      plankton.moveTimer = Math.random() * 5;
      plankton.isMoving = false;
      this.scene.add(plankton);
      this.plankton.push(plankton);
    }
  }

  update(delta) {
    if (!this.player.biteHitbox) {
      console.warn(
        "Player bite hitbox not available, skipping plankton collision"
      );
      return;
    }

    this.plankton.forEach((plankton) => {
      plankton.rotation.y += plankton.rotationSpeed * delta * 10;

      plankton.moveTimer -= delta;
      if (plankton.moveTimer <= 0 && !plankton.isMoving) {
        plankton.isMoving = true;
        plankton.moveTimer = 1;
        const direction = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        plankton.userData.velocity = direction.multiplyScalar(0.5);
      }
      if (plankton.isMoving) {
        const newPosition = plankton.position
          .clone()
          .addScaledVector(plankton.userData.velocity, delta * 60);

        // Seabed collision
        const seabedHeight = this.seabed
          ? this.seabed.getHeightAt(newPosition.x, newPosition.z)
          : -5;
        const planktonBottom = newPosition.y - plankton.userData.size / 2;
        if (planktonBottom < seabedHeight) {
          newPosition.y = seabedHeight + plankton.userData.size / 2;
        }

        // Chunk boundaries (100x100x100, centered at origin: -50 to 50 for x/z, 0 to 100 for y)
        newPosition.x = Math.max(-50, Math.min(50, newPosition.x));
        newPosition.y = Math.max(0, Math.min(100, newPosition.y));
        newPosition.z = Math.max(-50, Math.min(50, newPosition.z));

        plankton.position.copy(newPosition);

        plankton.moveTimer -= delta;
        if (plankton.moveTimer <= 0) {
          plankton.isMoving = false;
          plankton.moveTimer = Math.random() * 5 + 2;
          delete plankton.userData.velocity;
        }
      }

      const biteBox = new THREE.Box3().setFromObject(this.player.biteHitbox);
      const planktonBox = new THREE.Box3().setFromObject(plankton);
      if (biteBox.intersectsBox(planktonBox)) {
        const damage =
          this.fishData.fishTiers[this.player.tier].defaultFish.stats.damage;
        plankton.userData.hp -= damage;
        if (plankton.userData.hp <= 0) {
          this.scene.remove(plankton);
          this.plankton = this.plankton.filter((p) => p !== plankton);
          this.player.stats.xp =
            (this.player.stats.xp || 0) + plankton.userData.xp;
          console.log(
            `Plankton removed, XP gained: ${plankton.userData.xp}, Total XP: ${this.player.stats.xp}`
          );
        }
      }
    });
  }
}

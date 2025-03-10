import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  CHUNK_MIN_X,
  CHUNK_MAX_X,
  CHUNK_MIN_Y,
  CHUNK_MAX_Y,
  CHUNK_MIN_Z,
  CHUNK_MAX_Z,
  MAX_WAIT_TIME,
} from "../shared/constants.js";

export default class Player {
  constructor(room, sessionId, scene) {
    this.room = room;
    this.sessionId = sessionId;
    this.scene = scene;
    this.stats = {};
    this.tier = 1;
    this.attachedTo = null;
    this.object = null;
    this.currentModel = null;
    this.animations = {};
    this.mixer = null;
    this.defaultAction = null;
    this.swimAction = null;
    this.hitboxSize = 0.5;
    this.biteHitbox = null;
    this.bodyHitbox = null;
    this.seabed = null;
    this.decorations = null;
    this.fishData = null;
    this.controls = null;
    this.plankton = null;
    this.stateReady = false;
    this.isLoaded = false;
    this.cumulativeXp = 0; // Track total XP earned
    this.modelCache = {}; // Cache for preloaded models
    console.log("Player constructor called, starting fishData load");
    this.loadFishData();
  }

  async loadFishData() {
    try {
      const response = await fetch("/fishData.json");
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.fishData = await response.json();
      console.log(
        "Successfully loaded fishData:",
        this.fishData.fishTiers[1].defaultFish
      );
    } catch (error) {
      console.error("Failed to load fishData.json:", error);
      this.fishData = null;
    }
  }

  async init(seabed, decorations, controls, plankton) {
    this.seabed = seabed;
    this.decorations = decorations;
    this.controls = controls;
    this.plankton = plankton;
    console.log("Player.init called");

    const maxWait = MAX_WAIT_TIME; // Replaced 5000
    let waited = 0;
    while (!this.fishData && waited < maxWait) {
      console.log("Waiting for fishData to load...");
      await new Promise((resolve) => setTimeout(resolve, 100));
      waited += 100;
    }

    if (!this.fishData) {
      console.error("fishData failed to load after timeout, cannot proceed");
      return;
    }

    await this.loadModel();

    this.room.onStateChange.once((state) => {
      const newTier = state.players[this.sessionId]?.tier || 1;
      if (newTier !== this.tier) {
        this.tier = newTier;
        console.log(`Server state received, tier updated to ${this.tier}`);
        this.loadModel();
      } else {
        console.log(`Server state received, tier already ${this.tier}`);
      }
      this.stateReady = true;
    });
  }

  async loadModel() {
    if (!this.fishData) {
      console.error("fishData not loaded, cannot load model");
      return;
    }

    const tierData = this.fishData.fishTiers.find(
      (tier) => tier.tier === this.tier
    );
    if (!tierData) {
      console.error("No tier data found for tier:", this.tier);
      return;
    }

    const fish = tierData.defaultFish;
    this.hitboxSize = fish.stats.hitboxSize;
    this.baseScale = fish.stats.baseScale;
    this.maxScale = fish.stats.maxScale;
    const modelPath = `/models/${fish.model}`;
    console.log(`Attempting to load model for tier ${this.tier}: ${modelPath}`);

    const loader = new GLTFLoader();
    try {
      const previousPosition = this.object
        ? this.object.position.clone()
        : new THREE.Vector3(0, 0, 0);
      if (this.object) {
        this.scene.remove(this.object);
        if (this.bodyHitbox) this.object.remove(this.bodyHitbox);
        if (this.biteHitbox) this.object.remove(this.biteHitbox);
      }

      let gltf;
      if (this.modelCache[this.tier]) {
        gltf = this.modelCache[this.tier]; // Use cached model
        console.log(`Using cached model for tier ${this.tier}`);
      } else {
        gltf = await new Promise((resolve, reject) => {
          loader.load(modelPath, resolve, undefined, reject);
        });
        this.modelCache[this.tier] = gltf; // Cache it
        console.log(`Model loaded and cached for ${fish.name}`);
      }

      this.currentModel = gltf.scene;
      this.object = this.currentModel;
      this.object.scale.set(this.baseScale, this.baseScale, this.baseScale);
      this.object.position.copy(previousPosition);
      this.object.rotation.set(0, Math.PI, 0);

      this.mixer = new THREE.AnimationMixer(this.object);
      this.animations = {}; // Clear previous animations
      gltf.animations.forEach((clip) => {
        this.animations[clip.name] = this.mixer.clipAction(clip);
      });

      console.log("Available animations:", Object.keys(this.animations));
      const defaultAnimName = fish.animations.default;
      const swimAnimName = fish.animations.swim;

      if (this.animations[defaultAnimName]) {
        this.defaultAction = this.animations[defaultAnimName];
        this.defaultAction.setLoop(THREE.LoopRepeat);
      }
      if (this.animations[swimAnimName]) {
        this.swimAction = this.animations[swimAnimName];
        this.swimAction.setLoop(THREE.LoopRepeat);
        this.swimAction.play();
        console.log(`Playing swim animation: ${swimAnimName}`);
      } else if (this.defaultAction) {
        console.warn(
          `Swim animation ${swimAnimName} not found, falling back to default`
        );
        this.defaultAction.play();
      }

      this.object.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = child.material;
          child.material = new THREE.MeshBasicMaterial({
            map: originalMaterial.map || null,
            color: originalMaterial.color || 0xffffff,
          });
        }
      });

      this.bodyHitbox = new THREE.Mesh(
        new THREE.BoxGeometry(
          this.hitboxSize,
          this.hitboxSize,
          this.hitboxSize
        ),
        new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
      );
      this.object.add(this.bodyHitbox);

      this.biteHitbox = new THREE.Mesh(
        new THREE.BoxGeometry(
          this.hitboxSize,
          this.hitboxSize,
          this.hitboxSize * 0.2
        ),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
      );
      this.biteHitbox.position.set(0, 0, this.hitboxSize / 2);
      this.object.add(this.biteHitbox);

      this.scene.add(this.object);
      this.isLoaded = true;

      console.log("Player model fully loaded and added to scene");

      // Preload next tier if available
      if (this.tier < this.fishData.fishTiers.length - 1) {
        this.preloadNextTier();
      }
    } catch (error) {
      console.error(`Failed to load model ${modelPath}:`, error);
      if (!this.object) {
        this.object = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        this.scene.add(this.object);
        this.isLoaded = true;
        console.log("Fallback cube added due to model load failure");
      }
    }
  }

  async preloadNextTier() {
    const nextTier = this.tier + 1;
    if (
      nextTier >= this.fishData.fishTiers.length ||
      this.modelCache[nextTier]
    ) {
      return; // No next tier or already cached
    }

    const nextTierData = this.fishData.fishTiers.find(
      (tier) => tier.tier === nextTier
    );
    const nextFish = nextTierData.defaultFish;
    const nextModelPath = `/models/${nextFish.model}`;
    console.log(`Preloading model for tier ${nextTier}: ${nextModelPath}`);

    const loader = new GLTFLoader();
    loader.load(
      nextModelPath,
      (gltf) => {
        this.modelCache[nextTier] = gltf;
        console.log(`Preloaded model for tier ${nextTier}`);
      },
      undefined,
      (error) => console.error(`Failed to preload ${nextModelPath}:`, error)
    );
  }

  update(delta, options = {}) {
    if (!this.isLoaded) return;
    if (this.stats.hp <= 0) {
      this.die();
      return;
    }

    const { isAttacking = false } = options;
    if (this.mixer) {
      this.mixer.update(delta);
    }

    const tierData = this.fishData.fishTiers.find(
      (tier) => tier.tier === this.tier
    );
    const fish = tierData.defaultFish;
    const xpThreshold = fish.stats.xpThreshold;
    let currentScale = this.baseScale;
    if (xpThreshold && this.stats.xp !== undefined) {
      const xpProgress = Math.min(this.stats.xp / xpThreshold, 1);
      currentScale =
        this.baseScale + (this.maxScale - this.baseScale) * xpProgress;
      this.object.scale.set(currentScale, currentScale, currentScale);

      if (
        this.stats.xp >= xpThreshold &&
        this.tier < this.fishData.fishTiers.length - 1
      ) {
        const evolutionPosition = this.object.position.clone();
        this.cumulativeXp += this.stats.xp;
        this.stats.xp = 0;
        this.tier += 1;
        this.room.send("evolve", { tier: this.tier });
        console.log(
          `Evolving to tier ${this.tier}, Cumulative XP: ${this.cumulativeXp}`
        );
        this.loadModel().then(() => {
          this.object.position.copy(evolutionPosition);
          console.log("Post-evolution position:", this.object.position);
        });
      }
    }

    const scaledHitboxSize = this.hitboxSize * (currentScale / this.baseScale);
    this.bodyHitbox.scale.set(1, 1, 1);
    this.bodyHitbox.geometry = new THREE.BoxGeometry(
      scaledHitboxSize,
      scaledHitboxSize,
      scaledHitboxSize
    );
    this.biteHitbox.scale.set(1, 1, 1);
    this.biteHitbox.geometry = new THREE.BoxGeometry(
      scaledHitboxSize,
      scaledHitboxSize,
      scaledHitboxSize * 0.2
    );
    this.biteHitbox.position.set(0, 0, scaledHitboxSize / 2);

    if (!this.attachedTo) {
      const seabedHeight = this.seabed
        ? this.seabed.getHeightAt(
            this.object.position.x,
            this.object.position.z
          )
        : -5;
      const playerBottom = this.object.position.y - scaledHitboxSize / 2;
      if (playerBottom < seabedHeight) {
        this.object.position.y = seabedHeight + scaledHitboxSize / 2;
      }

      if (this.decorations) {
        this.decorations.rocks.forEach((rock) => {
          const decorationBox = new THREE.Box3().setFromObject(rock);
          const playerBox = new THREE.Box3().setFromObject(this.bodyHitbox);
          if (playerBox.intersectsBox(decorationBox)) {
            const pushBack = new THREE.Vector3()
              .subVectors(this.object.position, rock.position)
              .normalize()
              .multiplyScalar(scaledHitboxSize * 0.1);
            this.object.position.add(pushBack);
          }
        });

        this.decorations.bunches.forEach((bunch) => {
          bunch.children.forEach((coral) => {
            const decorationBox = new THREE.Box3().setFromObject(coral);
            const playerBox = new THREE.Box3().setFromObject(this.bodyHitbox);
            if (playerBox.intersectsBox(decorationBox)) {
              const pushBack = new THREE.Vector3()
                .subVectors(
                  this.object.position,
                  coral.getWorldPosition(new THREE.Vector3())
                )
                .normalize()
                .multiplyScalar(scaledHitboxSize * 0.1);
              this.object.position.add(pushBack);
            }
          });
        });
      }

      if (this.mixer && isAttacking) {
        this.playAnimation("eat");
      }

      const biteBox = new THREE.Box3().setFromObject(this.biteHitbox);
      if (this.stateReady) {
        this.checkCollision(biteBox, delta);
      }

      this.object.position.x = Math.max(
        CHUNK_MIN_X,
        Math.min(CHUNK_MAX_X, this.object.position.x)
      ); // Replaced -50, 50
      this.object.position.y = Math.max(
        CHUNK_MIN_Y,
        Math.min(CHUNK_MAX_Y, this.object.position.y)
      ); // Replaced 0, 100
      this.object.position.z = Math.max(
        CHUNK_MIN_Z,
        Math.min(CHUNK_MAX_Z, this.object.position.z)
      ); // Replaced -50, 50
    }

    this.room.send("move", {
      x: this.object.position.x,
      y: this.object.position.y,
      z: this.object.position.z,
      rotation: {
        x: this.object.rotation.x,
        y: this.object.rotation.y,
        z: this.object.rotation.z,
      },
    });
  }

  die() {
    if (!this.fishData || !this.object) return;

    const deathChunksData = this.fishData.plankton.deathChunks;
    const numChunks = Math.ceil(
      this.cumulativeXp / deathChunksData.xpMaxPerChunk
    );
    const sizeRange = deathChunksData.sizeRange || [0.1, 0.5];
    const spawnRadius = 1 / deathChunksData.density;

    let remainingXp = this.cumulativeXp;
    for (let i = 0; i < numChunks && remainingXp > 0; i++) {
      const xp = Math.min(
        deathChunksData.xpMaxPerChunk,
        remainingXp * (Math.random() * 0.5 + 0.5)
      );
      remainingXp -= xp;

      const sizeFactor = xp / deathChunksData.xpMaxPerChunk;
      const chunkSize =
        sizeRange[0] + (sizeRange[1] - sizeRange[0]) * sizeFactor;

      const geometry = new THREE.DodecahedronGeometry(chunkSize, 0);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(`hsl(${Math.random() * 30}, 100%, 50%)`),
        emissive: 0xff4500,
        shininess: 100,
        specular: 0xffffff,
      });
      const chunk = new THREE.Mesh(geometry, material);
      chunk.position
        .copy(this.object.position)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * spawnRadius,
            (Math.random() - 0.5) * spawnRadius,
            (Math.random() - 0.5) * spawnRadius
          )
        );
      chunk.userData = { hp: 1, xp: xp, size: chunkSize };
      this.scene.add(chunk);

      if (this.plankton) {
        this.plankton.plankton.push(chunk);
      }
    }

    this.scene.remove(this.object);
    this.object = null;
    this.isLoaded = false;
    console.log(
      `Player died, spawned ${numChunks} XP chunks with total ${this.cumulativeXp} XP`
    );
  }

  checkCollision(biteBox, delta) {
    if (!this.biteHitbox) {
      console.warn("Bite hitbox not available, skipping collision check");
      return;
    }

    if (this.plankton && this.plankton.plankton) {
      this.plankton.plankton.forEach((plankton) => {
        const planktonBox = new THREE.Box3().setFromObject(plankton);
        if (biteBox.intersectsBox(planktonBox)) {
          console.log("Collision with plankton detected");
          const damage =
            this.fishData.fishTiers[this.tier].defaultFish.stats.damage;
          plankton.userData.hp -= damage;
          if (plankton.userData.hp <= 0) {
            this.plankton.scene.remove(plankton);
            this.plankton.plankton = this.plankton.plankton.filter(
              (p) => p !== plankton
            );
            this.stats.xp = (this.stats.xp || 0) + plankton.userData.xp;
            this.playAnimation("eat");
            console.log(
              `Plankton killed, XP gained: ${plankton.userData.xp}, Total XP: ${this.stats.xp}`
            );
          }
        }
      });
    } else {
      console.warn(
        "Plankton instance or plankton.plankton array is null/undefined"
      );
    }

    if (this.room.state && this.room.state.players) {
      Object.values(this.state.players).forEach((otherPlayer) => {
        if (
          otherPlayer.sessionId !== this.sessionId &&
          otherPlayer.biteHitbox
        ) {
          const otherBiteBox = new THREE.Box3().setFromObject(
            otherPlayer.biteHitbox
          );
          if (biteBox.intersectsBox(otherBiteBox)) {
            this.playAnimation("eat");
            console.log("Collision with other fish detected");
          }
        }
      });
    } else {
      console.warn("room.state or room.state.players is null/undefined");
    }
  }

  playAnimation(animationName) {
    if (this.mixer && this.animations[animationName]) {
      this.swimAction?.stop();
      this.defaultAction?.stop();
      const action = this.animations[animationName];
      action.reset().play();
      console.log(`Playing animation: ${animationName}`);
    } else {
      console.warn(`Animation ${animationName} not available`);
    }
  }
}

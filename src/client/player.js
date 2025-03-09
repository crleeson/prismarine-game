import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class Player {
  constructor(room, sessionId) {
    this.room = room;
    this.sessionId = sessionId;
    this.stats = {};
    this.tier = 0; // Will update to 1 for Clownfish later
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
    this.loadFishData().then(() => this.init());
  }

  async loadFishData() {
    try {
      const response = await fetch("/public/fishData.json"); // Updated path
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.fishData = await response.json();
      console.log("Successfully loaded fishData:", this.fishData);
    } catch (error) {
      console.error("Failed to load fishData.json:", error);
      this.fishData = null;
    }
  }

  init(seabed, decorations, controls, plankton) {
    this.seabed = seabed;
    this.decorations = decorations;
    this.controls = controls; // Set controls here
    this.plankton = plankton;
    this.loadModel();
  }

  loadModel() {
    if (!this.fishData) {
      console.error(
        "fishData failed to load, cannot load model. Check if /public/fishData.json is accessible."
      );
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
    const modelPath = `/models/${fish.model}`;
    console.log("Attempting to load model from:", modelPath);

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        if (this.object) {
          this.object.remove(this.bodyHitbox);
          this.object.remove(this.biteHitbox);
        }

        this.currentModel = gltf.scene;
        this.object = this.currentModel;
        this.object.scale.set(
          fish.stats.baseScale,
          fish.stats.baseScale,
          fish.stats.baseScale
        );
        this.object.position.set(0, 0, 0);
        this.object.rotation.set(0, Math.PI, 0);

        this.mixer = new THREE.AnimationMixer(this.object);
        gltf.animations.forEach((clip) => {
          const clipName = clip.name;
          this.animations[clipName] = this.mixer.clipAction(clip);
          console.log(`Loaded animation: ${clipName}`);
        });

        const swimAnimNameBase = `${fish.name}_Swim`;
        let swimAnimName = null;
        const defaultAnimName = `${fish.name}_Default`;

        // Find the swim animation (strip the frame part)
        for (const animName of Object.keys(this.animations)) {
          if (animName.startsWith(swimAnimNameBase)) {
            swimAnimName = animName;
            break;
          }
        }

        // Set default animation as fallback
        if (this.animations[defaultAnimName]) {
          this.defaultAction = this.animations[defaultAnimName];
          this.defaultAction.setLoop(THREE.LoopRepeat);
          console.log(`Loaded default animation: ${defaultAnimName}`);
        } else {
          console.warn(
            `Default animation ${defaultAnimName} not found. Available animations:`,
            Object.keys(this.animations)
          );
        }

        // Set swim animation to loop
        if (swimAnimName && this.animations[swimAnimName]) {
          this.swimAction = this.animations[swimAnimName];
          this.swimAction.setLoop(THREE.LoopRepeat);
          this.swimAction.play();
          console.log(`Started looping swim animation: ${swimAnimName}`);
        } else {
          console.warn(
            `Swim animation ${swimAnimNameBase} not found. Falling back to default.`
          );
          if (this.defaultAction) {
            this.defaultAction.play();
            console.log(
              `Started looping default animation: ${defaultAnimName}`
            );
          }
        }

        this.object.traverse((child) => {
          if (child.isMesh) {
            const originalMaterial = child.material;
            const map = originalMaterial.map || null;
            child.material = new THREE.MeshBasicMaterial({
              map: map,
              color: originalMaterial.color || 0xffffff,
              vertexColors: originalMaterial.vertexColors || false,
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
        this.bodyHitbox.position.set(0, 0, 0);
        this.object.add(this.bodyHitbox);

        // Extend bite hitbox to match body hitbox height and width
        const biteWidth = this.hitboxSize;
        const biteHeight = this.hitboxSize; // Same height as body hitbox
        const biteDepth = this.hitboxSize * 0.2; // Small depth (layer in front)
        this.biteHitbox = new THREE.Mesh(
          new THREE.BoxGeometry(biteWidth, biteHeight, biteDepth),
          new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
        );
        this.biteHitbox.position.set(0, 0, this.hitboxSize / 2 + biteDepth / 2); // Position at the front
        this.object.add(this.biteHitbox);

        console.log(
          `Successfully loaded ${fish.name} model for tier ${this.tier}`
        );
      },
      (progress) => {
        console.log(
          "Loading model:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error(`Error loading model ${modelPath}:`, error);
      }
    );
  }

  playAnimation(name) {
    if (!this.mixer) {
      console.warn("Mixer not initialized, skipping animation");
      return;
    }

    const currentFish = this.fishData.fishTiers.find(
      (tier) => tier.tier === this.tier
    ).defaultFish;
    const defaultAnimName = `${currentFish.name}_Default`;
    const eatAnimName = `${currentFish.name}_Eat`;

    // Stop the swim or default animation if playing
    if (this.swimAction && this.swimAction.isRunning()) {
      this.swimAction.stop();
    } else if (this.defaultAction && this.defaultAction.isRunning()) {
      this.defaultAction.stop();
    }

    // Play the requested animation if it exists
    if (name === "eat" && this.animations[eatAnimName]) {
      this.animations[eatAnimName].setLoop(THREE.LoopOnce, 1);
      this.animations[eatAnimName].play();
      console.log(
        `Playing animation: ${eatAnimName}, will resume swim/default after`
      );

      this.animations[eatAnimName].clampWhenFinished = true;
      this.animations[eatAnimName].addEventListener("finished", () => {
        if (this.swimAction) {
          this.swimAction.play();
          console.log(`Resumed looping swim animation`);
        } else if (this.defaultAction) {
          this.defaultAction.play();
          console.log(`Resumed looping default animation: ${defaultAnimName}`);
        }
      });
    } else if (this.animations[name]) {
      this.animations[name].play();
      console.log(`Playing animation: ${name}`);
    } else {
      console.warn(
        `Animation ${name} not found. Resuming swim/default. Available animations:`,
        Object.keys(this.animations)
      );
      if (this.swimAction) {
        this.swimAction.play();
        console.log(`Resumed looping swim animation`);
      } else if (this.defaultAction) {
        this.defaultAction.play();
        console.log(`Resumed looping default animation: ${defaultAnimName}`);
      }
    }
  }

  update(delta, options = {}) {
    const { isAttacking = false } = options; // Default to false if not provided

    if (!this.object) {
      console.warn("Player object not loaded, skipping update");
      return;
    }

    if (this.mixer) {
      this.mixer.update(delta);
      console.log("Mixer updated with delta:", delta);
    }

    if (!this.attachedTo) {
      const seabedHeight = this.seabed
        ? this.seabed.getHeightAt(
            this.object.position.x,
            this.object.position.z
          )
        : -5;
      const playerBottom = this.object.position.y - this.hitboxSize / 2;
      if (playerBottom < seabedHeight) {
        this.object.position.y = seabedHeight + this.hitboxSize / 2;
      }

      if (this.decorations) {
        this.decorations.objects.forEach((decoration) => {
          const decorationBox = new THREE.Box3().setFromObject(decoration);
          const playerBox = new THREE.Box3().setFromObject(this.bodyHitbox);
          if (playerBox.intersectsBox(decorationBox)) {
            const pushBack = new THREE.Vector3()
              .subVectors(this.object.position, decoration.position)
              .normalize()
              .multiplyScalar(this.hitboxSize * 0.1);
            this.object.position.add(pushBack);
          }
        });
      }

      if (this.mixer) {
        if (isAttacking) {
          // Use the passed isAttacking
          this.playAnimation("eat");
        }
        // Swim animation already loops, no need to call unless interrupted
      }

      const biteBox = new THREE.Box3().setFromObject(this.biteHitbox);
      if (this.stateReady) {
        this.checkCollision(biteBox, delta);
      }

      this.object.position.x = Math.max(
        -50,
        Math.min(50, this.object.position.x)
      );
      this.object.position.y = Math.max(
        0,
        Math.min(100, this.object.position.y)
      );
      this.object.position.z = Math.max(
        -50,
        Math.min(50, this.object.position.z)
      );
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

  checkCollision(biteBox, delta) {
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
      Object.values(this.room.state.players).forEach((otherPlayer) => {
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

  addToScene(scene) {
    scene.add(this.object);
  }
}

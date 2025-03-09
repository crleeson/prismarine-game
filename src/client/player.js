import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class Player {
  constructor(room, sessionId) {
    this.room = room;
    this.sessionId = sessionId;
    this.stats = {};
    this.tier = 0;
    this.attachedTo = null;
    this.object = null;
    this.currentModel = null;
    this.animations = {};
    this.mixer = null;
    this.hitboxSize = 0.5;
    this.biteHitbox = null;
    this.bodyHitbox = null;
    this.seabed = null;
    this.decorations = null;
    this.fishData = null;
    this.loadFishData().then(() => this.init());
  }

  async loadFishData() {
    try {
      const response = await fetch("/fishData.json");
      this.fishData = await response.json();
      console.log("Loaded fishData for player:", this.fishData);
    } catch (error) {
      console.error("Error loading fishData.json:", error);
    }
  }

  init(seabed, decorations) {
    this.seabed = seabed;
    this.decorations = decorations;
    this.loadModel();
  }

  loadModel() {
    if (!this.fishData) {
      console.warn("fishData not loaded yet, delaying model load");
      setTimeout(() => this.loadModel(), 100);
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
          this.animations[clip.name] = this.mixer.clipAction(clip);
        });
        this.playAnimation("default");

        this.object.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              emissive: 0x000000,
              metalness: 0.1,
              roughness: 0.5,
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

        const biteWidth = this.hitboxSize;
        const biteHeight = this.hitboxSize / 5;
        const biteDepth = this.hitboxSize * 0.2;
        this.biteHitbox = new THREE.Mesh(
          new THREE.BoxGeometry(biteWidth, biteHeight, biteDepth),
          new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
        );
        this.biteHitbox.position.set(
          0,
          -this.hitboxSize / 2 + biteHeight / 2,
          this.hitboxSize / 2 + biteDepth / 2
        );
        this.object.add(this.biteHitbox);

        console.log(`Loaded ${fish.name} model for tier ${this.tier}`);
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
    if (this.mixer && this.animations[name]) {
      Object.values(this.animations).forEach((anim) => anim.stop());
      this.animations[name].play();
    }
  }

  update(delta) {
    if (!this.object) return;

    if (this.mixer) this.mixer.update(delta);

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

    if (this.controls && this.controls.speed > 0) {
      this.playAnimation("swim");
    } else {
      this.playAnimation("default");
    }
  }
}

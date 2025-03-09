import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import fishData from "../../public/fishData.json"; // Adjust path based on your project structure

export default class Player {
  constructor(room, sessionId) {
    this.room = room;
    this.sessionId = sessionId;
    this.stats = {};
    this.tier = 0; // Default to tier 0
    this.attachedTo = null;
    this.object = null;
    this.currentModel = null;
    this.animations = {};
    this.mixer = null;
    this.init();
  }

  init() {
    this.loadModel();
  }

  loadModel() {
    const tierData = fishData.fishTiers.find((tier) => tier.tier === this.tier);
    if (!tierData) {
      console.error("No tier data found for tier:", this.tier);
      return;
    }

    const fish = tierData.defaultFish; // Start with default fish
    const modelPath = `/models/${fish.model}`;

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        this.currentModel = gltf.scene;
        this.object = this.currentModel;
        this.object.scale.set(
          fish.stats.baseScale,
          fish.stats.baseScale,
          fish.stats.baseScale
        );
        this.object.position.set(0, 0, 0);
        this.object.rotation.set(0, Math.PI, 0); // Face forward

        // Set up animation mixer
        this.mixer = new THREE.AnimationMixer(this.object);
        gltf.animations.forEach((clip) => {
          this.animations[clip.name] = this.mixer.clipAction(clip);
        });
        this.playAnimation("default"); // Start with default animation

        // Apply material (optional, adjust based on model)
        this.object.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffffff, // Use model’s default color
              emissive: 0x000000,
              metalness: 0.1,
              roughness: 0.5,
            });
          }
        });

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

    // Update animation based on movement
    if (this.controls && this.controls.speed > 0) {
      this.playAnimation("swim");
    } else {
      this.playAnimation("default");
    }
  }
}

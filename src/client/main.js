import * as THREE from "three";
import { Client } from "colyseus.js";
import Player from "./player.js";
import Controls from "./controls.js";
import Seabed from "./seabed.js";
import Particles from "./particles.js";
import Decorations from "./decorations.js";
import Water from "./water.js";
import PauseUI from "./ui/pause.js";
import DebugUI from "./ui/debug.js";
import HUD from "./ui/hud.js";
import Effects from "./ui/effects.js";
import Plankton from "./plankton.js";

const client = new Client("ws://localhost:2567");
let player,
  controls,
  seabed,
  particles,
  decorations,
  water,
  camera,
  pauseUI,
  debugUI,
  hud,
  effects,
  plankton;
let isClientPaused = false;
let lastTime = performance.now();

console.log("Starting Prismarine...");

const style = document.createElement("style");
style.innerHTML = `
  body {
    margin: 0;
    overflow: hidden;
  }
  #crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    background-color: white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    display: none; // Hidden by default
  }
`;
document.head.appendChild(style);

const crosshair = document.createElement("div");
crosshair.id = "crosshair";
document.body.appendChild(crosshair);

// Add debug mode flag
let debugMode = false;

client
  .joinOrCreate("gameRoom")
  .then((room) => {
    console.log("Joined room:", room.sessionId);

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer();
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000033, 1);
    document.body.appendChild(renderer.domElement);
    console.log("Renderer added");

    scene.fog = new THREE.FogExp2(0x000033, 0.03);
    scene.add(ambientLight);

    seabed = new Seabed();
    seabed.addToScene(scene);
    console.log("Seabed added to scene");

    particles = new Particles();
    particles.addToScene(scene);
    console.log("Particles added to scene");

    decorations = new Decorations();
    decorations.addToScene(scene);
    console.log("Decorations added to scene");

    water = new Water();
    water.addToScene(scene);
    console.log("Water added to scene");

    player = new Player(room, room.sessionId);
    controls = new Controls(player, scene); // Create controls first
    plankton = new Plankton(scene, player, seabed);
    player.init(seabed, decorations, controls, plankton); // Pass controls to init
    player.controls = controls; // Ensure controls is set

    const BASE_CAMERA_DISTANCE = 5;
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const updateCameraPosition = () => {
      if (player.object) {
        const scale = player.stats?.scale || 1.0;
        const distance = (BASE_CAMERA_DISTANCE / scale) * player.hitboxSize;
        const targetOffset = new THREE.Vector3(0, 0.5 * scale, -distance);
        const currentOffset = camera.position
          .clone()
          .sub(player.object.position)
          .applyQuaternion(
            player.object.getWorldQuaternion(new THREE.Quaternion())
          );

        const smoothedOffset = currentOffset.clone().lerp(targetOffset, 0.1);
        camera.position.copy(player.object.position).add(smoothedOffset);

        // Look slightly ahead of the fish
        const lookAheadDistance = distance * 0.5; // Look 50% of the camera distance ahead
        const lookAtTarget = player.object.position
          .clone()
          .add(
            new THREE.Vector3(0, 0, -lookAheadDistance).applyQuaternion(
              player.object.quaternion
            )
          ); // Negative Z for forward

        camera.rotation.order = "YXZ";
        camera.rotation.y = player.object.rotation.y;
        camera.rotation.x = -0.35;
        camera.rotation.z = 0;

        camera.lookAt(lookAtTarget); // Look slightly ahead

        const waterHeight = water.getHeight();
        const isUnderwater = camera.position.y < waterHeight;
        if (isUnderwater) {
          renderer.setClearColor(0x000066, 1);
        } else {
          renderer.setClearColor(0x000033, 1);
        }

        const seabedHeight = -5;
        const t =
          (camera.position.y - seabedHeight) / (waterHeight - seabedHeight);
        const fogColor = new THREE.Color(0x000033).lerp(
          new THREE.Color(0x000010),
          1 - Math.max(0, Math.min(1, 1 - t))
        );
        scene.fog.color = fogColor;
      }
    };

    pauseUI = new PauseUI(() => {
      isClientPaused = false;
      pauseUI.hide();
      document.body.requestPointerLock();
    });
    debugUI = new DebugUI(controls);
    hud = new HUD(player, controls);
    effects = new Effects(controls, player);

    document.body.addEventListener("click", () => {
      if (!isClientPaused && controls.dashCooldown <= 0) {
        effects.onDash();
      }
      if (!isClientPaused) {
        document.body.requestPointerLock();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.exitPointerLock();
        isClientPaused = true;
        pauseUI.show();
      }
      if (e.key === " ") {
        e.preventDefault();
        if (!isClientPaused && controls.dashCooldown <= 0) {
          effects.onDash();
        }
      }
      if (e.ctrlKey && e.key === "f") {
        debugMode = !debugMode;
        console.log(`Debug mode ${debugMode ? "enabled" : "disabled"}`);
        crosshair.style.display = debugMode ? "block" : "none";
      }
      // Disable A and D keys (no functionality for now)
      if (e.key === "a" || e.key === "d") {
        e.preventDefault();
        console.log("A/D keys disabled");
      }
    });

    document.addEventListener("pointerlockchange", () => {
      if (!document.pointerLockElement && !isClientPaused) {
        isClientPaused = true;
        pauseUI.show();
      }
    });

    room.onStateChange((state) => {
      if (!state.players[room.sessionId]) return;
      player.stats = { ...state.players[room.sessionId].stats };
      const newTier = state.players[room.sessionId].tier;
      if (player.tier !== newTier) {
        player.tier = newTier;
        player.loadModel();
      }
      player.hitboxSize = state.players[room.sessionId].stats.hitboxSize || 0.5;
      if (player.attachedTo !== state.players[room.sessionId].attachedTo) {
        player.attachedTo = state.players[room.sessionId].attachedTo;
        if (player.attachedTo) {
          const parent = state.players[player.attachedTo];
          player.object.position.set(parent.x, parent.y, parent.z + 1);
        }
      }
      player.stateReady = true; // Set flag when state is ready
      updateCameraPosition();
    });

    function animate() {
      requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (player.object && !scene.children.includes(player.object)) {
        scene.add(player.object);
        console.log("Player object added to scene");
      }

      player.update(delta);
      particles.update(delta, camera);
      decorations.update(delta);
      water.update(delta);
      effects.update(delta);
      plankton.update(delta);

      if (!isClientPaused) {
        controls.update(delta);
        updateCameraPosition();
        renderer.render(scene, camera);
      }

      debugUI.update();
      hud.update();
    }
    animate();
  })
  .catch((err) => console.error("Failed to join room:", err));

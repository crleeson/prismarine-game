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
import { BASE_CAMERA_DISTANCE } from "../shared/constants.js";

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
    display: none;
  }
`;
document.head.appendChild(style);

const crosshair = document.createElement("div");
crosshair.id = "crosshair";
document.body.appendChild(crosshair);

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

    player = new Player(room, room.sessionId, scene);
    controls = new Controls(player, scene);
    plankton = new Plankton(scene, player, seabed);
    player.init(seabed, decorations, controls, plankton);
    player.controls = controls;

    const BASE_CAMERA_DISTANCE = 2.5;
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const clock = new THREE.Clock();

    const updateCameraPosition = (delta) => {
      if (player.object) {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
          player.object.quaternion
        );
        const scale = player.stats?.scale || 1.0;
        const distance = (BASE_CAMERA_DISTANCE / scale) * player.hitboxSize; // Replaced 2.5

        const targetOffset = new THREE.Vector3(0, 0.5 * scale, -distance);
        const idealPosition = player.object.position
          .clone()
          .add(targetOffset.applyQuaternion(player.object.quaternion));
        camera.position.lerp(idealPosition, 5 * delta);

        const speedFactor = Math.min(controls.speed / controls.maxSpeed, 1);
        const lookAheadDistance = distance + speedFactor * 2; // Reduced from 5 to 2
        const lookAtPoint = player.object.position
          .clone()
          .add(forward.multiplyScalar(lookAheadDistance));
        camera.lookAt(lookAtPoint);
      }

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
      console.log("Server state position:", state.players[room.sessionId]);
      player.stats = { ...state.players[room.sessionId].stats };
      const newTier = state.players[room.sessionId].tier;
      if (player.tier !== newTier) {
        const currentPosition = player.object
          ? player.object.position.clone()
          : new THREE.Vector3(0, 0, 0);
        player.tier = newTier;
        player.loadModel().then(() => {
          player.object.position.copy(currentPosition);
        });
      }
      player.hitboxSize = state.players[room.sessionId].stats.hitboxSize || 0.5;
      if (player.attachedTo !== state.players[room.sessionId].attachedTo) {
        player.attachedTo = state.players[room.sessionId].attachedTo;
        if (player.attachedTo) {
          const parent = state.players[player.attachedTo];
          player.object.position.set(parent.x, parent.y, parent.z + 1);
        }
      }
      player.stateReady = true;
      updateCameraPosition(0);
    });

    // Single animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1); // Consistent delta

      if (player.object && !scene.children.includes(player.object)) {
        scene.add(player.object);
        console.log("Player object added to scene");
      }

      if (!isClientPaused) {
        controls.update(delta);
        player.update(delta);
        particles.update(delta, camera);
        decorations.update(delta);
        water.update(delta);
        effects.update(delta);
        plankton.update(delta);
        updateCameraPosition(delta);
      }

      debugUI.update();
      hud.update();

      renderer.render(scene, camera);
    };

    animate(); // Start the loop
  })
  .catch((err) => console.error("Failed to join room:", err));

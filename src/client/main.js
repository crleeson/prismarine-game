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
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000033, 1);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft edges
    document.body.appendChild(renderer.domElement);
    console.log("Renderer added");

    scene.fog = new THREE.FogExp2(0x000033, 0.03);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
    sunLight.position.set(50, 100, 50);
    sunLight.target.position.set(0, 0, 0);
    sunLight.castShadow = true; // Cast shadows
    sunLight.shadow.mapSize.width = 1024; // Shadow resolution
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const ambientLight = new THREE.AmbientLight(0x606060, 0.6); // Was 0x606060, 0.5
    scene.add(ambientLight);

    water = new Water();
    water.addToScene(scene);
    console.log("Water added to scene");

    seabed = new Seabed();
    seabed.addToScene(scene);
    console.log("Seabed added to scene");

    particles = new Particles();
    particles.addToScene(scene);
    console.log("Particles added to scene");

    decorations = new Decorations(seabed, scene);
    decorations.addToScene(scene);
    console.log("Decorations added to scene");

    player = new Player(room, room.sessionId, scene);
    controls = new Controls(player, scene, room);
    plankton = new Plankton(scene, player, seabed);
    player.init(seabed, decorations, controls, plankton);
    player.controls = controls;

    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const clock = new THREE.Clock();

    const lookAheadCrosshair = document.createElement("div");
    lookAheadCrosshair.id = "look-ahead-crosshair";
    lookAheadCrosshair.style.position = "absolute";
    lookAheadCrosshair.style.width = "20px"; // Increased for visibility
    lookAheadCrosshair.style.height = "20px";
    lookAheadCrosshair.style.color = "white";
    lookAheadCrosshair.style.fontSize = "20px"; // Adjust size as needed
    lookAheadCrosshair.style.textAlign = "center";
    lookAheadCrosshair.style.lineHeight = "20px"; // Center vertically
    lookAheadCrosshair.innerHTML = "◦"; // Unicode white circle
    lookAheadCrosshair.style.transform = "translate(-50%, -50%)";
    lookAheadCrosshair.style.pointerEvents = "none";
    document.body.appendChild(lookAheadCrosshair);

    const updateCameraPosition = (delta) => {
      if (player.object) {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
          player.object.quaternion
        );
        const scale = player.stats?.scale || 1.0;
        const distance = (BASE_CAMERA_DISTANCE / scale) * player.hitboxSize;

        const targetOffset = new THREE.Vector3(0, 0.1 * scale, -distance);
        const idealPosition = player.object.position
          .clone()
          .add(targetOffset.applyQuaternion(player.object.quaternion));
        camera.position.lerp(idealPosition, 5 * delta);

        const speedFactor = Math.min(controls.speed / controls.maxSpeed, 1);
        const lookAheadDistance = distance + speedFactor * 2;
        const lookAtPoint = player.object.position
          .clone()
          .add(forward.multiplyScalar(lookAheadDistance));

        // Calculate halfway point
        const halfWayPoint = player.object.position
          .clone()
          .lerp(lookAtPoint, 0.5);

        // Project to screen coordinates
        const vector = halfWayPoint.clone().project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        lookAheadCrosshair.style.left = `${x}px`;
        lookAheadCrosshair.style.top = `${y}px`;

        camera.lookAt(lookAtPoint);
      }

      const waterHeight = water.getHeight();
      const isUnderwater = camera.position.y < waterHeight;
      if (isUnderwater) {
        renderer.setClearColor(0x000066, 1);
      } else {
        renderer.setClearColor(0x000033, 1);
      }

      const seabedHeight = 0; // Updated from -5 to match new base height
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
      // pauseUI.hide();
      document.body.requestPointerLock();
    });
    debugUI = new DebugUI(controls);
    hud = new HUD(player, controls);
    // effects = new Effects(controls, player);

    document.body.addEventListener("click", () => {
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
      if (!document.pointerLockElement) {
        isClientPaused = true;
        pauseUI.show();
      } else {
        isClientPaused = false;
        pauseUI.hide();
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

    room.onMessage("tierDowngrade", (data) => {
      if (data.id === room.sessionId) {
        player.tier = data.tier;
        player.stats.xp = data.xp;
        player.loadModel();
      }
    });

    // Single animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      water.update(delta);

      if (player.object && !scene.children.includes(player.object)) {
        scene.add(player.object);
        console.log("Player object added to scene");
      }

      controls.update(delta);
      player.update(delta);
      particles.update(delta, camera);
      decorations.update(delta);
      water.update(delta);
      plankton.update(delta);
      updateCameraPosition(delta);

      debugUI.update();
      hud.update();

      renderer.render(scene, camera);
    };

    animate(); // Start the loop
  })
  .catch((err) => console.error("Failed to join room:", err));

window.addEventListener("beforeunload", () => {});

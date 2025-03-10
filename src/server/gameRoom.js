import { Room } from "colyseus";
import { readFileSync } from "fs";
import { join } from "path";
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_HEIGHT,
  MAX_CLIENTS,
} from "../shared/constants.js";

const fishData = JSON.parse(
  readFileSync(join(process.cwd(), "public", "fishData.json"), "utf8")
);

class GameRoom extends Room {
  onCreate(options) {
    this.maxClients = MAX_CLIENTS;
    this.setState({
      players: {},
      plankton: {},
    });

    this.onMessage("move", (client, data) => {
      const player = this.state.players[client.sessionId];
      if (player && !player.attachedTo) {
        player.x += data.dx;
        player.y += data.dy;
        player.z += data.dz;
      }
    });

    this.onMessage("dash", (client) => {
      const player = this.state.players[client.sessionId];
      if (player && player.tier !== 0) {
        Object.values(this.state.players).forEach((p) => {
          if (p.attachedTo === client.sessionId) {
            p.attachedTo = null;
            this.clients.find((c) => c.sessionId === p.id).send("detach");
          }
        });
      }
    });

    this.onMessage("attach", (client, { targetId }) => {
      const player = this.state.players[client.sessionId];
      if (player.tier === 0 && targetId in this.state.players) {
        player.attachedTo = targetId;
      }
    });

    this.onMessage("detach", (client) => {
      const player = this.state.players[client.sessionId];
      if (player.tier === 0) player.attachedTo = null;
    });

    this.onMessage("evolve", (client, { tier }) => {
      const player = this.state.players[client.sessionId];
      if (player.tier !== 0) {
        const currentPosition = { x: player.x, y: player.y, z: player.z };
        player.tier = tier;
        player.stats = {
          ...fishData.fishTiers.find((t) => t.tier === tier).defaultFish.stats,
        };
        player.x = currentPosition.x;
        player.y = currentPosition.y;
        player.z = currentPosition.z;
      }
    });

    this.setSimulationInterval((delta) => this.update(delta / 1000));

    this.onMessage("startDash", (client) => {
      const player = this.state.players[client.sessionId];
      if (player) {
        player.isDashing = true;
      }
    });

    this.onMessage("endDash", (client) => {
      const player = this.state.players[client.sessionId];
      if (player) {
        player.isDashing = false;
      }
    });
  }

  onJoin(client) {
    const tier = 1;
    const fish = fishData.fishTiers.find((t) => t.tier === tier).defaultFish;
    this.state.players[client.sessionId] = {
      id: client.sessionId,
      tier,
      x: (Math.random() - 0.5) * CHUNK_WIDTH, // Replaced Math.random() * 100 - 50
      y: Math.random() * CHUNK_HEIGHT, // Replaced Math.random() * 100 - 50 (adjusted)
      z: (Math.random() - 0.5) * CHUNK_DEPTH, // Replaced Math.random() * 100 - 50
      stats: { ...fish.stats },
      attachedTo: null,
    };
  }

  onLeave(client) {
    delete this.state.players[client.sessionId];
  }

  update(delta) {
    Object.entries(this.state.players).forEach(([id, player]) => {
      player.stats.energy = Math.max(
        0,
        Math.min(
          player.stats.energy - player.stats.decayRate * delta,
          player.stats.energy
        )
      );

      const decayRate = player.isDashing
        ? player.stats.xpDecayRate * 2
        : player.stats.xpDecayRate;
      player.stats.xp = Math.max(0, player.stats.xp - decayRate * delta);
      if (player.stats.xp <= 0 && player.tier > 1) {
        const previousTier = player.tier - 1;
        const previousFish = fishData.fishTiers.find(
          (t) => t.tier === previousTier
        ).defaultFish;
        player.tier = previousTier;
        player.stats.xp = previousFish.stats.xpThreshold * 0.8;
        player.stats = { ...previousFish.stats, xp: player.stats.xp };
        this.broadcast("tierDowngrade", {
          id: player.id,
          tier: player.tier,
          xp: player.stats.xp,
        });
      }
    });
  }
}

export { GameRoom };

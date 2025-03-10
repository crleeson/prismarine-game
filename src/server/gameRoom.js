import { Room } from "colyseus";
import { readFileSync } from "fs";
import { join } from "path";

const fishData = JSON.parse(
  readFileSync(join(process.cwd(), "public", "fishData.json"), "utf8")
);

class GameRoom extends Room {
  onCreate(options) {
    this.maxClients = 100;
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
  }

  onJoin(client) {
    const tier = 1;
    const fish = fishData.fishTiers.find((t) => t.tier === tier).defaultFish;
    this.state.players[client.sessionId] = {
      id: client.sessionId,
      tier,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      z: Math.random() * 100 - 50,
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
      if (player.stats.energy < 20 && player.tier !== 0) {
        player.stats.xp -=
          player.stats.decayRate * (20 - player.stats.energy) * delta;
      }
      if (player.tier === 0 && player.attachedTo) {
        const parent = this.state.players[player.attachedTo];
        if (parent) {
          const sappedXp = parent.stats.xp * player.stats.xpSapRate * delta;
          player.stats.xp += sappedXp;
          parent.stats.xp -= sappedXp;
        }
      }
    });
  }
}

export { GameRoom };

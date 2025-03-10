// src/server/server.js
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./gameRoom.js";

console.log("Server script started");

const port = process.env.PORT || 2567;
const server = new Server({
  transport: new WebSocketTransport(),
});

server.define("gameRoom", GameRoom);
server
  .listen(port)
  .then(() => {
    console.log(`Server running on port ${port}`);
  })
  .catch((err) => {
    console.error("Server failed to start:", err);
  });

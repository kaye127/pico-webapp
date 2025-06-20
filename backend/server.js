// import express from "express";
// import http from "http";
// import cors from "cors";
// import { WebSocketServer } from "ws";

// const PORT = process.env.PORT || 3000;
// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });

// app.use(cors());
// app.use(express.json());

// let deviceClients = {};   // { topic: Set<WebSocket> }
// let latestData = {};      // { topic: latestPayload }
// let boardToClientMap = {}; // { topic: { board: Set, clients: Set } }

// function ensureTopic(topic) {
//   if (!boardToClientMap[topic]) {
//     boardToClientMap[topic] = {
//       board: new Set(),
//       clients: new Set(),
//     };
//   }
// }

// // WebSocket logic
// wss.on("connection", (ws) => {
//   let assignedTopic = null;
//   let isBoard = false;

//   ws.on("message", (msg) => {
//     try {
//       const [topic, jsonStr] = msg.toString().split(":", 2);
//       const data = JSON.parse(jsonStr);

//       if (!topic) return;
//       ensureTopic(topic);
//       assignedTopic = topic;

//       // Determine role
//       if ("temp" in data) {
//         isBoard = true;
//         boardToClientMap[topic].board.add(ws);
//         latestData[topic] = data;
//       } else {
//         isBoard = false;
//         boardToClientMap[topic].clients.add(ws);
//       }

//       // Broadcast to all clients (except sender)
//       const receivers = isBoard
//         ? boardToClientMap[topic].clients
//         : boardToClientMap[topic].board;

//       receivers.forEach(client => {
//         if (client !== ws && client.readyState === ws.OPEN) {
//           client.send(`${topic}:${JSON.stringify(data)}`);
//         }
//       });

//     } catch (err) {
//       console.error("Invalid WebSocket message:", err.message);
//     }
//   });

//   ws.on("close", () => {
//     if (assignedTopic) {
//       boardToClientMap[assignedTopic].board.delete(ws);
//       boardToClientMap[assignedTopic].clients.delete(ws);

//       if (
//         boardToClientMap[assignedTopic].board.size === 0 &&
//         boardToClientMap[assignedTopic].clients.size === 0
//       ) {
//         delete boardToClientMap[assignedTopic];
//         delete latestData[assignedTopic];
//       }
//     }
//   });
// });

// // Routes

// app.get("/", (req, res) => {
//   res.send("✅ IoT WebSocket backend running.");
// });

// app.get("/admin", (req, res) => {
//   const topics = Object.keys(boardToClientMap).map((topic) => ({
//     topic,
//     clients: boardToClientMap[topic].clients.size,
//     boards: boardToClientMap[topic].board.size,
//     latest: latestData[topic] || null,
//   }));
//   res.json({ topics });
// });

// server.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });



import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebSocketManager } from './managers/websocket.js';
import { SSEManager } from './managers/sse.js';

const app = express();
const server = createServer(app);

// Enable CORS for all routes
app.use(cors({
    origin: "*",
    credentials: true
}));

app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize managers
const webSocketManager = new WebSocketManager(io);
const sseManager = new SSEManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Server-Sent Events endpoint for real-time monitoring
app.get('/api/stream', (req, res) => {
  sseManager.addClient(req, res);
});

// Get device stats
app.get('/api/stats', (req, res) => {
  const stats = webSocketManager.getStats();
  res.json(stats);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 IoT Server running on port ${PORT}`);
  console.log(`📊 SSE Stream: http://localhost:${PORT}/api/stream`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
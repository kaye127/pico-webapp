import express from 'express';
import bodyParser from "body-parser";
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
  transports: ['websocket', 'polling'],
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize managers
const webSocketManager = new WebSocketManager(io);
const sseManager = new SSEManager();

// Connect WebSocket manager to SSE for broadcasting
webSocketManager.setSSECallback((event, data) => {
  sseManager.broadcast(event, data);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// app.post("/data", (req, res) => {
//   const { deviceName, temperature } = req.body;

//   let device = webSocketManager.getDevice(deviceName);

//   if (!device) {
//     device = webSocketManager.handleDeviceRegistration(deviceName);
//   }
//   console.log("conection ", device)

//   const deviceSocket = webSocketManager.deviceSockets.get(device.socketId);
//   if (!deviceSocket) {
//     return res.status(404).send("Device socket not found");
//   }

//   deviceSocket.emit("temperature_data", { temperature });

//   res.send("Temperature data sent to device");
// });

// app.post("/data", (req, res) => {
//   const socket = io
//   const { deviceName, temperature } = req.body;

//   if (!deviceName || temperature === undefined) {
//     return res.status(400).send("Missing deviceName or temperature");
//   }

//   let device = webSocketManager.getDevice(deviceName);
//   console.log("bef", device)

//   if (!device) {
//     console.log(`📦 Registering device on first data: ${deviceName}`);
//     // Simulate registration
//     const register = webSocketManager.handleDeviceRegistration(socket, deviceName);
//     console.log("re", register)
//     device = webSocketManager.getDevice(deviceName);
//     console.log("in", device)
//   }
//   console.log("out", device)

//   const deviceSocket = webSocketManager.deviceSockets.get(device.socketId);
//   if (!deviceSocket) {
//     return res.status(404).send("Device socket not connected via WebSocket");
//   }

//   deviceSocket.emit("temperature_data", { temperature });
//   console.log(`📨 Forwarded temperature data for ${deviceName}: ${temperature}`);
//   res.send("Temperature data sent to device");
// });


app.post("/data", (req, res) => {
  const { deviceName, temperature } = req.body;

  if (!deviceName || temperature === undefined) {
    return res.status(400).json({ error: "Missing deviceName or temperature" });
  }

  // Log the incoming data
  console.log(`📡 Received data from ${deviceName}: ${temperature}°C`);

  // Optional: Try forwarding to WebSocket clients
  let device = webSocketManager.getDevice(deviceName);
  if (device) {
    const deviceSocket = webSocketManager.deviceSockets.get(device.socketId);
    if (deviceSocket) {
      deviceSocket.emit("temperature_data", { temperature });
      console.log(`📨 Sent to WebSocket client for ${deviceName}`);
    }
  }

  // ✅ Forward to SSE clients subscribed to this device
  sseManager.sendToDevice(deviceName, "temperature_data", { temperature });
  console.log(`📤 Broadcasted to SSE clients for ${deviceName}`);

  return res.status(200).json({ message: "Data forwarded", device: deviceName });
});



// Server-Sent Events endpoint for real-time monitoring
app.get('/api/stream', (req, res) => {
  sseManager.addClient(req, res);
});

// Get device stats for admin dashboard
app.get('/api/stats', (req, res) => {
  const stats = webSocketManager.getStats();
  res.json(stats);
});

// Get all devices for admin dashboard
app.get('/api/devices', (req, res) => {
  const devices = webSocketManager.getAllDevices();
  res.json({ devices });
});

// Get specific device data
app.get('/api/device/:deviceName', (req, res) => {
  const { deviceName } = req.params;
  const device = webSocketManager.getDevice(deviceName);
  
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  res.json(device);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 IoT Server running on port ${PORT}`);
  console.log(`📊 SSE Stream: http://localhost:${PORT}/api/stream`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Admin API: http://localhost:${PORT}/api/stats`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { WebSocketManager } from './managers/websocket.js';
import { SSEManager } from './managers/sse.js';

const app = express();
const server = createServer(app);

// Enable CORS for all routes (🔒 TODO: restrict in production)
app.use(cors({
    origin: "*", // <-- Replace "*" with specific frontend domain in production
    credentials: true
}));

// Body parsing middleware
app.use(express.json());

// Setup Socket.IO with CORS
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  cors: {
    origin: "*", // <-- Replace with allowed origin(s)
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize managers
const webSocketManager = new WebSocketManager(io);
const sseManager = new SSEManager();

// Allow WebSocket to forward to SSE clients
webSocketManager.setSSECallback((event, data) => {
  sseManager.broadcast(event, data);
});

// ========== API ROUTES ==========

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Receive temperature data from device
app.post("/data", (req, res) => {
  const { deviceName, temperature } = req.body;

  if (!deviceName || temperature === undefined) {
    return res.status(400).json({ error: "Missing deviceName or temperature" });
  }

  console.log(`📡 Received data from ${deviceName}: ${temperature}°C`);

  const device = webSocketManager.getDevice(deviceName);
  if (device) {
    const deviceSocket = webSocketManager.deviceSockets.get(device.socketId);
    if (deviceSocket) {
      deviceSocket.emit("temperature_data", { temperature });
      console.log(`📨 Sent to WebSocket client for ${deviceName}`);
    }
  }

  sseManager.sendToDevice(deviceName, "temperature_data", { temperature });
  console.log(`📤 Broadcasted to SSE clients for ${deviceName}`);

  res.status(200).json({ message: "Data forwarded", device: deviceName });
});

// SSE stream endpoint
app.get('/api/stream', (req, res) => {
  sseManager.addClient(req, res);
});

// Admin: Get stats
app.get('/api/stats', (req, res) => {
  const stats = webSocketManager.getStats();
  res.json(stats);
});

// Admin: Get all devices
app.get('/api/devices', (req, res) => {
  const devices = webSocketManager.getAllDevices();
  res.json({ devices });
});

// Admin: Get specific device
app.get('/api/device/:deviceName', (req, res) => {
  const { deviceName } = req.params;
  const device = webSocketManager.getDevice(deviceName);

  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  res.json(device);
});

// ========== START SERVER ==========

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 IoT Server running on port ${PORT}`);
  console.log(`📊 SSE Stream: http://localhost:${PORT}/api/stream`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Admin API: http://localhost:${PORT}/api/stats`);
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

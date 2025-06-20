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
    origin: ["http://localhost:5173", "http://localhost:3000"],
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